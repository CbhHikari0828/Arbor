import {
  Maximize2,
  Minimize2,
  PlusCircle,
  SendHorizontal,
  Settings2,
  X,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type { DiscussionBranch } from "@/domain/knowledge/types";
import { MarkdownMessage } from "@/presentation/components/MarkdownMessage";

interface DiscussionPanelProps {
  branch: DiscussionBranch | undefined;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const configuredModels = [
  { id: "deepseek-v5", label: "DeepSeek V5" },
  { id: "grok-1", label: "Grok 1" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "claude-3.7", label: "Claude 3.7" },
] satisfies SelectableModel[];

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

interface SelectableModel {
  id: string;
  label: string;
}

interface AiModelConfig {
  id: string;
  provider: string;
  baseUrl: string;
  modelName: string;
  displayName: string;
  hasApiKey: boolean;
  isEnabled: boolean;
  isDefault: boolean;
}

interface ModelConfigFormState {
  provider: string;
  baseUrl: string;
  modelName: string;
  displayName: string;
  apiKey: string;
}

export function DiscussionPanel({ branch, isMaximized, onToggleMaximize }: DiscussionPanelProps) {
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [modelConfigs, setModelConfigs] = useState<AiModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(configuredModels[0].id);
  const [localUserContent, setLocalUserContent] = useState<string | null>(null);
  const [liveAssistantContent, setLiveAssistantContent] = useState("");
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [isModelConfigOpen, setIsModelConfigOpen] = useState(false);
  const [modelConfigError, setModelConfigError] = useState<string | null>(null);
  const [isSavingModelConfig, setIsSavingModelConfig] = useState(false);
  const [modelConfigForm, setModelConfigForm] = useState<ModelConfigFormState>({
    provider: "openai-compatible",
    baseUrl: "",
    modelName: "",
    displayName: "",
    apiKey: "",
  });
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor: currentEditor }) => {
      setIsEditorEmpty(currentEditor.isEmpty);
    },
    editorProps: {
      attributes: {
        class:
          "max-h-[132px] min-h-[70px] overflow-y-auto px-4 py-3 text-sm leading-6 text-[#222222] outline-none dark:text-[#e7eee9]",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.clearContent();
    setIsEditorEmpty(true);
    setLocalUserContent(null);
    setLiveAssistantContent("");
    setIsSendingPrompt(false);
  }, [branch?.id, editor]);

  useEffect(() => {
    let isMounted = true;

    fetchModelConfigs()
      .then((configs) => {
        if (!isMounted) {
          return;
        }

        setModelConfigs(configs);

        const defaultConfig = configs.find((config) => config.isDefault && config.isEnabled) ?? configs[0];
        if (defaultConfig) {
          setSelectedModelId(defaultConfig.id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setModelConfigError("模型配置暂时无法加载");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const userMessage = branch?.messages.find((message) => message.role === "user");
  const assistantMessage = branch?.messages.find((message) => message.role === "assistant");
  const streamedAssistantContent = useStreamingText(
    assistantMessage?.content ?? "",
    assistantMessage?.id ?? branch?.id ?? "empty-message",
  );
  const isAssistantStreaming = Boolean(
    isSendingPrompt || (assistantMessage && streamedAssistantContent.length < assistantMessage.content.length),
  );
  const selectableModels =
    modelConfigs.length > 0
      ? modelConfigs
          .filter((config) => config.isEnabled)
          .map((config) => ({
            id: config.id,
            label: config.displayName || config.modelName,
          }))
      : configuredModels;
  const displayedUserContent = localUserContent ?? userMessage?.content;
  const displayedAssistantContent = liveAssistantContent || streamedAssistantContent;
  const handleSendPrompt = async () => {
    const prompt = editor?.getText().trim();
    const selectedModelConfig = modelConfigs.find((config) => config.id === selectedModelId && config.isEnabled);

    if (!editor || !prompt || isSendingPrompt) {
      return;
    }

    if (!branch) {
      setModelConfigError("请先选择一个节点对话");
      return;
    }

    if (!selectedModelConfig) {
      setModelConfigError("请先配置并选择一个可用模型");
      setIsModelConfigOpen(true);
      return;
    }

    editor.commands.clearContent();
    setIsEditorEmpty(true);
    setLocalUserContent(prompt);
    setLiveAssistantContent("");
    setIsSendingPrompt(true);
    setModelConfigError(null);

    try {
      await streamBranchChat({
        branchId: branch.id,
        modelConfigId: selectedModelConfig.id,
        content: prompt,
        onToken: (delta) => {
          setLiveAssistantContent((currentContent) => currentContent + delta);
        },
      });
    } catch (error) {
      setLiveAssistantContent(error instanceof Error ? error.message : "AI 回复失败");
    } finally {
      setIsSendingPrompt(false);
    }
  };
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (event.ctrlKey) {
      editor?.chain().focus().setHardBreak().run();
      return;
    }

    handleSendPrompt();
  };
  const handleModelConfigChange = (field: keyof ModelConfigFormState, value: string) => {
    setModelConfigForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };
  const handleSaveModelConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModelConfigError(null);

    if (!modelConfigForm.baseUrl.trim() || !modelConfigForm.modelName.trim() || !modelConfigForm.apiKey.trim()) {
      setModelConfigError("请填写供应商 URL、模型名和 API Key");
      return;
    }

    setIsSavingModelConfig(true);

    try {
      const createdConfig = await createModelConfig(modelConfigForm);
      const configs = await fetchModelConfigs();
      setModelConfigs(configs);
      setSelectedModelId(createdConfig.id);
      setModelConfigForm({
        provider: modelConfigForm.provider,
        baseUrl: "",
        modelName: "",
        displayName: "",
        apiKey: "",
      });
      setIsModelConfigOpen(false);
    } catch {
      setModelConfigError("保存模型配置失败，请检查后端服务和参数");
    } finally {
      setIsSavingModelConfig(false);
    }
  };

  return (
    <aside
      className={[
        "flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#f7f7f7] transition-colors duration-300 dark:bg-[#0b1016]",
        isMaximized
          ? "absolute inset-0 z-20 w-full"
          : "w-[346px] shrink-0 border-l border-[#d8d8d8] dark:border-[#27313a]",
      ].join(" ")}
    >
      <div className="flex h-[72px] shrink-0 items-end justify-between border-b border-[#d8d8d8] bg-white/90 px-6 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]/95">
        <div className="flex h-full items-end">
          <button
            className="h-full border-b-2 border-[#111111] px-5 text-sm font-semibold text-[#111111] dark:border-[#61b979] dark:text-[#61b979]"
            type="button"
          >
            AI 助手
          </button>
          <button className="h-full px-5 text-sm font-medium text-[#555555] dark:text-[#d7dfda]" type="button">
            笔记
          </button>
        </div>
        <button
          aria-label={isMaximized ? "收缩到侧栏" : "最大化对话"}
          className="mb-3 grid size-8 shrink-0 place-items-center rounded-md text-[#555555] transition hover:bg-[#eeeeee] hover:text-[#111111] dark:text-[#b7c2bc] dark:hover:bg-[#18212a] dark:hover:text-[#9bd4aa]"
          onClick={onToggleMaximize}
          title={isMaximized ? "收缩到侧栏" : "最大化对话"}
          type="button"
        >
          {isMaximized ? <Minimize2 size={18} strokeWidth={1.8} /> : <Maximize2 size={18} strokeWidth={1.8} />}
        </button>
      </div>

      {isMaximized ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-1.5 md:flex"
        >
          <span className="h-px w-4 rounded-full bg-[#b8b8b8] dark:bg-[#53606a]" />
          <span className="h-px w-3 rounded-full bg-[#9f9f9f] dark:bg-[#68757f]" />
          <span className="h-px w-5 rounded-full bg-[#1f1f1f] dark:bg-[#e8eee9]" />
          <span className="h-px w-3 rounded-full bg-[#9f9f9f] dark:bg-[#68757f]" />
          <span className="h-px w-4 rounded-full bg-[#b8b8b8] dark:bg-[#53606a]" />
        </div>
      ) : null}

      <div
        className={[
          "min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain",
          isMaximized ? "px-8 py-8" : "px-5 py-6",
        ].join(" ")}
      >
        <div className={[isMaximized ? "mx-auto w-full max-w-[920px]" : "w-full", "space-y-6 text-left"].join(" ")}>
        {displayedUserContent ? (
          <article className="group flex w-full items-start justify-end text-sm text-[#1f1f1f] dark:text-[#e7eee9]">
            <div className="min-w-0 max-w-[78%] rounded-2xl rounded-tr-md bg-[#eeeeee] px-4 py-3.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.045)] dark:bg-[#121a22] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
              <p className="leading-6 text-[#222222] dark:text-[#e7eee9]">{displayedUserContent}</p>
            </div>
          </article>
        ) : null}

        {displayedAssistantContent ? (
          <article className="group flex w-full items-start justify-start text-left text-sm text-[#202020] dark:text-[#eef3ef]">
            <div className="min-w-0 flex-1">
              <div className="pt-1 pr-1">
                <MarkdownMessage content={displayedAssistantContent} />
                {isAssistantStreaming ? (
                  <span
                    aria-label="AI 正在输出"
                    className="mt-2 inline-block h-4 w-1.5 animate-pulse rounded-full bg-[#111111] align-middle dark:bg-[#61b979]"
                  />
                ) : null}
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d8d8d8] px-5 py-6 text-sm leading-7 text-[#666666] dark:border-[#303a44] dark:text-[#a8b2ad]">
            新节点已创建。输入第一个问题，开始围绕这个节点沉淀知识。
          </div>
        )}

        </div>
      </div>

      <div
        className={[
          "shrink-0",
          isMaximized ? "mx-auto w-full max-w-[920px] px-8 pb-6" : "px-5 pb-4",
        ].join(" ")}
      >
        <div className="rounded-xl border border-[#d8d8d8] bg-white shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition-colors duration-300 dark:border-[#303a44] dark:bg-[#10161d] dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          {isModelConfigOpen ? (
            <form
              className="border-b border-[#e4e4e4] px-4 py-3 dark:border-[#25313a]"
              onSubmit={handleSaveModelConfig}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#eef3ef]">模型供应商配置</p>
                  <p className="mt-0.5 text-[11px] text-[#777777] dark:text-[#94a09a]">
                    API Key 只保存到后端加密字段，不会在前端回显。
                  </p>
                </div>
                <button
                  aria-label="关闭模型配置"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-[#666666] transition hover:bg-[#eeeeee] hover:text-[#111111] dark:text-[#aab5af] dark:hover:bg-[#18212a] dark:hover:text-[#e7eee9]"
                  onClick={() => setIsModelConfigOpen(false)}
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className="h-9 rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] px-3 text-xs text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#303a44] dark:bg-[#0d131a] dark:text-[#e7eee9] dark:focus:border-[#61b979]"
                  onChange={(event) => handleModelConfigChange("provider", event.target.value)}
                  placeholder="供应商，例如 openai-compatible"
                  value={modelConfigForm.provider}
                />
                <input
                  className="h-9 rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] px-3 text-xs text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#303a44] dark:bg-[#0d131a] dark:text-[#e7eee9] dark:focus:border-[#61b979]"
                  onChange={(event) => handleModelConfigChange("baseUrl", event.target.value)}
                  placeholder="供应商 URL，例如 https://api.example.com/v1"
                  value={modelConfigForm.baseUrl}
                />
                <input
                  className="h-9 rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] px-3 text-xs text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#303a44] dark:bg-[#0d131a] dark:text-[#e7eee9] dark:focus:border-[#61b979]"
                  onChange={(event) => handleModelConfigChange("modelName", event.target.value)}
                  placeholder="模型名，例如 deepseek-chat"
                  value={modelConfigForm.modelName}
                />
                <input
                  className="h-9 rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] px-3 text-xs text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#303a44] dark:bg-[#0d131a] dark:text-[#e7eee9] dark:focus:border-[#61b979]"
                  onChange={(event) => handleModelConfigChange("displayName", event.target.value)}
                  placeholder="显示名，可选"
                  value={modelConfigForm.displayName}
                />
                <input
                  className="h-9 rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] px-3 text-xs text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#303a44] dark:bg-[#0d131a] dark:text-[#e7eee9] dark:focus:border-[#61b979] sm:col-span-2"
                  onChange={(event) => handleModelConfigChange("apiKey", event.target.value)}
                  placeholder="API Key"
                  type="password"
                  value={modelConfigForm.apiKey}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-h-4 text-[11px] text-[#c2410c] dark:text-[#f6ad55]">{modelConfigError}</p>
                <button
                  className="rounded-full bg-[#111111] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#4b8a5c] dark:hover:bg-[#5ba66e]"
                  disabled={isSavingModelConfig}
                  type="submit"
                >
                  {isSavingModelConfig ? "保存中..." : "保存模型"}
                </button>
              </div>
            </form>
          ) : null}
          <div className="relative" onKeyDown={handleEditorKeyDown}>
            <EditorContent editor={editor} />
            {isEditorEmpty ? (
              <span className="pointer-events-none absolute left-4 top-3 text-sm text-[#999999] dark:text-[#7f8a86]">
                继续提问...（Enter 发送，Ctrl + Enter 换行）
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                aria-label="添加附件"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-[#d8d8d8] text-[#333333] transition hover:bg-[#eeeeee] dark:border-[#52606b] dark:text-[#e1e9e4] dark:hover:bg-[#18212a]"
                type="button"
              >
                <PlusCircle size={18} />
              </button>
              <label className="relative inline-flex min-w-0 items-center rounded-full border border-[#d8d8d8] bg-[#f7f7f7] px-3 py-1.5 text-xs font-medium text-[#333333] transition hover:bg-[#eeeeee] dark:border-[#52606b] dark:bg-[#111820] dark:text-[#dce5df] dark:hover:bg-[#18212a]">
                <span className="mr-1 shrink-0 text-[#777777] dark:text-[#94a09a]">模型</span>
                <select
                  aria-label="选择对话模型"
                  className="min-w-0 cursor-pointer appearance-none bg-transparent pr-4 text-xs font-semibold text-[#111111] outline-none dark:text-[#edf3ef]"
                  onChange={(event) => setSelectedModelId(event.target.value)}
                  value={selectedModelId}
                >
                  {selectableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#777777] dark:text-[#94a09a]">
                  ▼
                </span>
              </label>
              <button
                aria-label="配置模型"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-[#d8d8d8] text-[#333333] transition hover:bg-[#eeeeee] dark:border-[#52606b] dark:text-[#e1e9e4] dark:hover:bg-[#18212a]"
                onClick={() => {
                  setModelConfigError(null);
                  setIsModelConfigOpen((isOpen) => !isOpen);
                }}
                title="配置模型"
                type="button"
              >
                <Settings2 size={16} />
              </button>
            </div>
            <button
              aria-label="发送"
              className="grid size-10 place-items-center rounded-full bg-[#111111] text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#4b8a5c] dark:shadow-[0_14px_30px_rgba(33,91,53,0.36)] dark:hover:bg-[#5ba66e]"
              disabled={isSendingPrompt}
              onClick={handleSendPrompt}
              type="button"
            >
              <SendHorizontal size={18} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function useStreamingText(content: string, streamKey: string) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");
  }, [streamKey]);

  useEffect(() => {
    if (!content) {
      setVisibleText("");
      return;
    }

    const intervalId = window.setInterval(() => {
      setVisibleText((currentText) => {
        if (currentText === content) {
          window.clearInterval(intervalId);
          return currentText;
        }

        if (!content.startsWith(currentText)) {
          return content.slice(0, Math.min(content.length, 8));
        }

        return content.slice(0, Math.min(content.length, currentText.length + 8));
      });
    }, 24);

    return () => window.clearInterval(intervalId);
  }, [content, streamKey]);

  return visibleText;
}

async function fetchModelConfigs() {
  const response = await fetch(`${apiBaseUrl}/api/model-configs`);

  if (!response.ok) {
    throw new Error("Failed to load model configs");
  }

  return (await response.json()) as AiModelConfig[];
}

async function createModelConfig(form: ModelConfigFormState) {
  const response = await fetch(`${apiBaseUrl}/api/model-configs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: form.provider,
      baseUrl: form.baseUrl,
      modelName: form.modelName,
      displayName: form.displayName || undefined,
      apiKey: form.apiKey,
      isDefault: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create model config");
  }

  return (await response.json()) as AiModelConfig;
}

interface StreamBranchChatInput {
  branchId: string;
  modelConfigId: string;
  content: string;
  onToken: (delta: string) => void;
}

async function streamBranchChat({ branchId, modelConfigId, content, onToken }: StreamBranchChatInput) {
  const response = await fetch(`${apiBaseUrl}/api/branches/${branchId}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      modelConfigId,
      content,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("AI 流式接口不可用");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let currentData = "";

  const dispatchEvent = () => {
    if (!currentData) {
      currentEvent = "message";
      return;
    }

    const data = JSON.parse(currentData);

    if (currentEvent === "token") {
      onToken(data.delta ?? "");
    }

    if (currentEvent === "error") {
      throw new Error(data.message ?? "AI 回复失败");
    }

    currentEvent = "message";
    currentData = "";
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n")) {
      const newlineIndex = buffer.indexOf("\n");
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);

      if (line === "") {
        dispatchEvent();
        continue;
      }

      if (line.startsWith("event:")) {
        currentEvent = line.slice("event:".length).trim();
        continue;
      }

      if (line.startsWith("data:")) {
        currentData += line.slice("data:".length).trim();
      }
    }
  }

  dispatchEvent();
}
