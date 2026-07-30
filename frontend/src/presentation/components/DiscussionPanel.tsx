import {
  ChevronDown,
  Link2,
  Maximize2,
  Minimize2,
  PlusCircle,
  StickyNote,
  SendHorizontal,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { DiscussionBranch } from "@/domain/knowledge/types";
import { MarkdownMessage } from "@/presentation/components/MarkdownMessage";

interface DiscussionPanelProps {
  branch: DiscussionBranch | undefined;
  nodeId: string | undefined;
  onFirstPrompt: (nodeId: string, content: string) => Promise<void>;
  onConversationUpdated: () => Promise<void>;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

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

interface DiscussionNote {
  id: string;
  branchId: string;
  messageId: string | null;
  title?: string;
  content: string;
  createdAt: string;
}

export function DiscussionPanel({ branch, nodeId, onFirstPrompt, onConversationUpdated, isMaximized, onToggleMaximize }: DiscussionPanelProps) {
  const [activeTab, setActiveTab] = useState<"assistant" | "notes">("assistant");
  const [notes, setNotes] = useState<DiscussionNote[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [modelConfigs, setModelConfigs] = useState<AiModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [localUserContent, setLocalUserContent] = useState<string | null>(null);
  const [liveAssistantContent, setLiveAssistantContent] = useState("");
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [modelConfigError, setModelConfigError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!branch) { setNotes([]); return; }
    fetch(`${apiBaseUrl}/api/notes?branchId=${branch.id}`).then((response) => response.ok ? response.json() : []).then((items) => setNotes(items as DiscussionNote[])).catch(() => setNotes([]));
  }, [branch?.id]);

  const isAssistantStreaming = isSendingPrompt;
  const selectableModels = modelConfigs
    .filter((config) => config.isEnabled)
    .map((config) => ({
      id: config.id,
      label: config.displayName || config.modelName,
    }));
  const branchNotes = notes.filter((note) => note.branchId === branch?.id);
  const saveNote = async () => {
    const content = noteDraft.trim();
    const title = noteTitle.trim();
    if (!content || !title || !branch) return;
    const lastMessage = branch.messages.at(-1);
    const response = await fetch(`${apiBaseUrl}/api/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId: branch.id, messageId: lastMessage?.id ?? null, title, content }) });
    if (!response.ok) return;
    const savedNote = (await response.json()) as DiscussionNote;
    setNotes((currentNotes) => [savedNote, ...currentNotes]);
    setNoteTitle(""); setNoteDraft("");
  };
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
      setModelConfigError("请先在设置中添加并选择一个可用模型");
      return;
    }

    editor.commands.clearContent();
    setIsEditorEmpty(true);
    setLocalUserContent(prompt);
    setLiveAssistantContent("");
    setIsSendingPrompt(true);
    setModelConfigError(null);

    if (nodeId && !branch.messages.some((message) => message.role === "user")) {
      try { await onFirstPrompt(nodeId, prompt); } catch { /* Chat can still continue if the graph summary update fails. */ }
    }

    try {
      await streamBranchChat({
        branchId: branch.id,
        modelConfigId: selectedModelConfig.id,
        content: prompt,
        onToken: (delta) => {
          setLiveAssistantContent((currentContent) => currentContent + delta);
        },
      });
      await onConversationUpdated();
      setLocalUserContent(null);
      setLiveAssistantContent("");
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
  return (
    <aside
      className={[
        "flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#f7f7f7] transition-colors duration-300 dark:bg-[#0b1016]",
        isMaximized
          ? "absolute inset-0 z-20 w-full"
          : "w-[346px] shrink-0 border-l border-[#d8d8d8] dark:border-[#27313a]",
      ].join(" ")}
    >
      <div className="relative flex h-[72px] shrink-0 items-end justify-between bg-white/90 px-6 transition-colors duration-300 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-5 after:bg-gradient-to-b after:from-transparent after:to-[#f7f7f7]/80 dark:bg-[#0b1016]/95 dark:after:to-[#0b1016]/80">
        <div className="flex h-full items-end">
          <button
            className={`h-full border-b-2 px-5 text-sm transition ${activeTab === "assistant" ? "border-[#111111] font-semibold text-[#111111] dark:border-[#61b979] dark:text-[#61b979]" : "border-transparent font-medium text-[#555555] dark:text-[#d7dfda]"}`}
            onClick={() => setActiveTab("assistant")}
            type="button"
          >
            AI 助手
          </button>
          <button className={`h-full border-b-2 px-5 text-sm transition ${activeTab === "notes" ? "border-[#111111] font-semibold text-[#111111] dark:border-[#61b979] dark:text-[#61b979]" : "border-transparent font-medium text-[#555555] dark:text-[#d7dfda]"}`} onClick={() => setActiveTab("notes")} type="button">
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
          activeTab === "notes" ? "hidden" : "min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain",
          isMaximized ? "px-8 py-8" : "px-5 py-6",
        ].join(" ")}
      >
        <div className={[isMaximized ? "mx-auto w-full max-w-[920px]" : "w-full", "space-y-6 text-left"].join(" ")}>
        {branch?.messages.length ? branch.messages.map((message) => message.role === "user" ? (
          <article className="group flex w-full items-start justify-end text-sm text-[#1f1f1f] dark:text-[#e7eee9]" key={message.id}>
            <div className="min-w-0 max-w-[78%] rounded-2xl rounded-tr-md bg-[#eeeeee] px-4 py-3.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.045)] dark:bg-[#121a22] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)]"><p className="leading-6 text-[#222222] dark:text-[#e7eee9]">{message.content}</p></div>
          </article>
        ) : (
          <article className="group flex w-full items-start justify-start text-left text-sm text-[#202020] dark:text-[#eef3ef]" key={message.id}><div className="min-w-0 flex-1 pt-1 pr-1"><MarkdownMessage content={message.content} /></div></article>
        )) : (
          <div className="rounded-xl border border-dashed border-[#d8d8d8] px-5 py-6 text-sm leading-7 text-[#666666] dark:border-[#303a44] dark:text-[#a8b2ad]">
            新节点已创建。输入第一个问题，开始围绕这个节点沉淀知识。
          </div>
        )}
        {localUserContent ? <article className="flex w-full justify-end text-sm"><div className="max-w-[78%] rounded-2xl rounded-tr-md bg-[#eeeeee] px-4 py-3.5 dark:bg-[#121a22]">{localUserContent}</div></article> : null}
        {liveAssistantContent || isAssistantStreaming ? <article className="flex w-full justify-start text-sm"><div className="min-w-0 flex-1 pt-1 pr-1"><MarkdownMessage content={liveAssistantContent} />{isAssistantStreaming ? <span aria-label="AI 正在输出" className="mt-2 inline-block h-4 w-1.5 animate-pulse rounded-full bg-[#111111] align-middle dark:bg-[#61b979]" /> : null}</div></article> : null}

        </div>
      </div>

      {activeTab === "notes" ? (
        <NotesPanel
          branch={branch}
          notes={branchNotes}
          noteDraft={noteDraft}
          noteTitle={noteTitle}
          onChangeTitle={setNoteTitle}
          onChangeDraft={setNoteDraft}
          onOpenConversation={() => setActiveTab("assistant")}
          onSave={saveNote}
        />
      ) : null}

      <div
        className={[
          activeTab === "notes" ? "hidden" : "shrink-0",
          isMaximized ? "mx-auto w-full max-w-[920px] px-8 pb-6" : "px-5 pb-4",
        ].join(" ")}
      >
        <div className="rounded-xl border border-[#d8d8d8] bg-white shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition-colors duration-300 dark:border-[#303a44] dark:bg-[#10161d] dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          {modelConfigError ? (
            <p className="border-b border-[#e4e4e4] px-4 py-2 text-xs text-[#b42318] dark:border-[#25313a] dark:text-[#ffae91]">
              {modelConfigError}
            </p>
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
              <ModelPicker models={selectableModels} onChange={setSelectedModelId} value={selectedModelId} />
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

function NotesPanel({ branch, notes, noteTitle, noteDraft, onChangeTitle, onChangeDraft, onSave, onOpenConversation }: { branch: DiscussionBranch | undefined; notes: DiscussionNote[]; noteTitle: string; noteDraft: string; onChangeTitle: (value: string) => void; onChangeDraft: (value: string) => void; onSave: () => void; onOpenConversation: () => void }) {
  const [selectedNote, setSelectedNote] = useState<DiscussionNote | null>(null);
  if (selectedNote) return <section className="min-h-0 flex-1 overflow-y-auto px-5 py-6"><div className="mx-auto w-full"><button className="mb-5 text-xs font-medium text-[#666666] transition hover:text-[#111111] dark:text-[#aab7af] dark:hover:text-[#aee2bc]" onClick={() => setSelectedNote(null)} type="button">返回笔记列表</button><article className="rounded-xl border border-[#d8d8d8] bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)] dark:border-[#303a44] dark:bg-[#10161d]"><h2 className="text-base font-semibold text-[#202020] dark:text-[#edf3ef]">{selectedNote.title ?? "未命名笔记"}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#303030] dark:text-[#dce5df]">{selectedNote.content}</p><div className="mt-6 flex items-center justify-between"><time className="text-[11px] text-[#8a8a8a] dark:text-[#7f8d85]">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(selectedNote.createdAt))}</time><button className="inline-flex items-center gap-1 text-xs font-medium text-[#555555] dark:text-[#aebbb3]" onClick={onOpenConversation} type="button"><Link2 size={13} />查看对话</button></div></article></div></section>;
  return <section className="min-h-0 flex-1 overflow-y-auto px-5 py-6"><div className="mx-auto w-full space-y-5"><div className="rounded-xl border border-[#d8d8d8] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:border-[#303a44] dark:bg-[#10161d]"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#202020] dark:text-[#edf3ef]"><StickyNote size={16} />新建笔记</div><input aria-label="笔记标题" className="mb-2 h-10 w-full rounded-lg border border-[#d8d8d8] bg-[#fafafa] px-3 text-sm text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#35414b] dark:bg-[#0c1218] dark:text-[#edf3ef] dark:focus:border-[#61b979]" onChange={(event) => onChangeTitle(event.target.value)} placeholder="笔记标题" value={noteTitle} /><textarea aria-label="笔记内容" className="min-h-[112px] w-full resize-none rounded-lg border border-[#d8d8d8] bg-[#fafafa] p-3 text-sm leading-6 text-[#222222] outline-none transition focus:border-[#111111] dark:border-[#35414b] dark:bg-[#0c1218] dark:text-[#edf3ef] dark:focus:border-[#61b979]" onChange={(event) => onChangeDraft(event.target.value)} placeholder="记录你的想法、结论或待办..." value={noteDraft} /><div className="mt-3 flex items-center justify-between gap-3"><span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#777777] dark:text-[#94a09a]"><Link2 size={13} />关联当前对话</span><button className="h-8 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white transition hover:bg-[#303030] disabled:opacity-50 dark:bg-[#4b8a5c] dark:hover:bg-[#5ba66e]" disabled={!branch || !noteTitle.trim() || !noteDraft.trim()} onClick={onSave} type="button">保存笔记</button></div></div><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#202020] dark:text-[#edf3ef]">当前对话笔记</h2><span className="text-xs text-[#777777] dark:text-[#94a09a]">{notes.length}</span></div>{notes.map((note) => <button className="block w-full rounded-xl border border-[#e1e1e1] bg-white px-4 py-3.5 text-left shadow-[0_5px_16px_rgba(0,0,0,0.025)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.06)] dark:border-[#303a44] dark:bg-[#10161d]" key={note.id} onClick={() => setSelectedNote(note)} type="button"><p className="truncate text-sm font-semibold text-[#303030] dark:text-[#dce5df]">{note.title ?? "未命名笔记"}</p><time className="mt-2 block text-[11px] text-[#8a8a8a] dark:text-[#7f8d85]">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(note.createdAt))}</time></button>)}</div></section>;
}

function ModelPicker({ models, value, onChange }: { models: SelectableModel[]; value: string; onChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = models.find((model) => model.id === value)?.label ?? "选择模型";

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return <div className="relative" ref={pickerRef}>
    <button aria-expanded={isOpen} aria-haspopup="listbox" className="flex h-8 max-w-[172px] items-center gap-1.5 rounded-full border border-[#d1d1d1] bg-[#fafafa] py-1 pl-3 pr-1 text-xs text-[#333333] shadow-[0_2px_5px_rgba(0,0,0,0.04)] transition hover:border-[#999999] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#52606b] dark:bg-[#111820] dark:text-[#dce5df] dark:hover:border-[#728079] dark:hover:bg-[#18212a]" disabled={models.length === 0} onClick={() => setIsOpen((open) => !open)} type="button"><span className="shrink-0 text-[#777777] dark:text-[#94a09a]">模型</span><span className="min-w-0 truncate font-semibold text-[#111111] dark:text-[#edf3ef]">{models.length === 0 ? "未配置" : selectedLabel}</span><span className={`grid size-6 shrink-0 place-items-center rounded-full bg-[#e9e9e9] text-[#555555] transition duration-200 dark:bg-[#26312b] dark:text-[#cbd7d0] ${isOpen ? "rotate-180" : ""}`}><ChevronDown size={14} /></span></button>
    {isOpen ? <div className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-56 overflow-hidden rounded-xl border border-[#cacaca] bg-white p-1.5 shadow-[0_18px_38px_rgba(0,0,0,0.18)] dark:border-[#3b4a42] dark:bg-[#131c19]" role="listbox">{models.map((model) => <button aria-selected={model.id === value} className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm transition ${model.id === value ? "bg-[#181818] text-white dark:bg-[#5b9d6c]" : "text-[#303030] hover:bg-[#efefef] dark:text-[#dce7df] dark:hover:bg-[#223028]"}`} key={model.id} onClick={() => { onChange(model.id); setIsOpen(false); }} role="option" type="button">{model.label}</button>)}</div> : null}
  </div>;
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
