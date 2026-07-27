import {
  Maximize2,
  Minimize2,
  PlusCircle,
  SendHorizontal,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
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
] as const;

type ConfiguredModelId = (typeof configuredModels)[number]["id"];

export function DiscussionPanel({ branch, isMaximized, onToggleMaximize }: DiscussionPanelProps) {
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<ConfiguredModelId>(configuredModels[0].id);
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
  }, [branch?.id, editor]);

  const userMessage = branch?.messages.find((message) => message.role === "user");
  const assistantMessage = branch?.messages.find((message) => message.role === "assistant");
  const streamedAssistantContent = useStreamingText(
    assistantMessage?.content ?? "",
    assistantMessage?.id ?? branch?.id ?? "empty-message",
  );
  const isAssistantStreaming = Boolean(
    assistantMessage && streamedAssistantContent.length < assistantMessage.content.length,
  );
  const handleSendPrompt = () => {
    const prompt = editor?.getText().trim();

    if (!editor || !prompt) {
      return;
    }

    editor.commands.clearContent();
    setIsEditorEmpty(true);
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
        {userMessage ? (
          <article className="group flex w-full items-start justify-end text-sm text-[#1f1f1f] dark:text-[#e7eee9]">
            <div className="min-w-0 max-w-[78%] rounded-2xl rounded-tr-md bg-[#eeeeee] px-4 py-3.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.045)] dark:bg-[#121a22] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
              <p className="leading-6 text-[#222222] dark:text-[#e7eee9]">{userMessage.content}</p>
            </div>
          </article>
        ) : null}

        {assistantMessage ? (
          <article className="group flex w-full items-start justify-start text-left text-sm text-[#202020] dark:text-[#eef3ef]">
            <div className="min-w-0 flex-1">
              <div className="pt-1 pr-1">
                <MarkdownMessage content={streamedAssistantContent} />
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
                  onChange={(event) => setSelectedModelId(event.target.value as ConfiguredModelId)}
                  value={selectedModelId}
                >
                  {configuredModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#777777] dark:text-[#94a09a]">
                  ▼
                </span>
              </label>
            </div>
            <button
              aria-label="发送"
              className="grid size-10 place-items-center rounded-full bg-[#111111] text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition hover:bg-[#2a2a2a] dark:bg-[#4b8a5c] dark:shadow-[0_14px_30px_rgba(33,91,53,0.36)] dark:hover:bg-[#5ba66e]"
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
