import {
  Copy,
  Maximize2,
  Minimize2,
  PlusCircle,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import type { DiscussionBranch } from "@/domain/knowledge/types";

interface DiscussionPanelProps {
  branch: DiscussionBranch | undefined;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export function DiscussionPanel({ branch, isMaximized, onToggleMaximize }: DiscussionPanelProps) {
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor: currentEditor }) => {
      setIsEditorEmpty(currentEditor.isEmpty);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[70px] px-4 py-3 text-sm leading-6 text-[#2d322f] outline-none dark:text-[#e7eee9]",
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

  return (
    <aside
      className={[
        "flex h-full min-w-0 flex-col bg-[#fffdf9] transition-colors duration-300 dark:bg-[#0b1016]",
        isMaximized
          ? "absolute inset-0 z-20 w-full"
          : "w-[346px] shrink-0 border-l border-[#e8e1d8] dark:border-[#27313a]",
      ].join(" ")}
    >
      <div className="flex h-[72px] shrink-0 items-end justify-between border-b border-[#e8e1d8] bg-white/85 px-6 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]/95">
        <div className="flex h-full items-end">
          <button
            className="h-full border-b-2 border-[#c9792f] px-5 text-sm font-semibold text-[#c9792f] dark:border-[#61b979] dark:text-[#61b979]"
            type="button"
          >
            AI 助手
          </button>
          <button className="h-full px-5 text-sm font-medium text-[#525953] dark:text-[#d7dfda]" type="button">
            笔记
          </button>
        </div>
        <button
          aria-label={isMaximized ? "收缩到侧栏" : "最大化对话"}
          className="mb-3 grid size-8 shrink-0 place-items-center rounded-md text-[#55615a] transition hover:bg-[#f2eee7] hover:text-[#1d5f48] dark:text-[#b7c2bc] dark:hover:bg-[#18212a] dark:hover:text-[#9bd4aa]"
          onClick={onToggleMaximize}
          title={isMaximized ? "收缩到侧栏" : "最大化对话"}
          type="button"
        >
          {isMaximized ? <Minimize2 size={18} strokeWidth={1.8} /> : <Maximize2 size={18} strokeWidth={1.8} />}
        </button>
      </div>

      <div className={["min-h-0 flex-1 overflow-y-auto", isMaximized ? "px-8 py-8" : "px-5 py-6"].join(" ")}>
        <div className={isMaximized ? "mx-auto w-full max-w-[920px]" : undefined}>
        {userMessage ? (
          <article className="mb-7 rounded-xl border border-transparent bg-gradient-to-br from-[#f3f1ef] to-[#e9e6e2] px-5 py-4 text-sm leading-6 text-[#1f2421] shadow-sm dark:border-[#303a44] dark:from-[#0d141b] dark:to-[#0b1016] dark:text-[#e7eee9]">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-[#2d6d49] dark:text-[#61b979]">用户</p>
              <p className="text-xs text-[#a19f9a] dark:text-[#9aa6a1]">{formatTime(userMessage.createdAt)}</p>
            </div>
            <p>{userMessage.content}</p>
          </article>
        ) : null}

        {assistantMessage ? (
          <article className="mb-8 rounded-xl border border-[#e8e1d8] bg-white px-5 py-5 text-sm leading-7 text-[#202421] shadow-[0_18px_42px_rgba(47,39,29,0.08)] transition-colors duration-300 dark:border-[#303a44] dark:bg-[#10161d] dark:text-[#eef3ef] dark:shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 font-semibold">
                <Sparkles size={18} className="text-[#e0a45a] dark:text-[#f0b84f]" fill="currentColor" />
                AI 助手
              </div>
              <span className="text-xs font-normal text-[#9b9d99] dark:text-[#9aa6a1]">
                {formatTime(assistantMessage.createdAt)}
              </span>
            </div>
            <p>{assistantMessage.content}</p>
            <div className="mt-5 flex justify-end text-[#343936] dark:text-[#e3ebe6]">
              <div className="flex items-center gap-4">
                <Copy size={16} />
                <ThumbsUp size={16} />
                <ThumbsDown size={16} />
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded-xl border border-dashed border-[#e0d8ce] px-5 py-6 text-sm leading-7 text-[#697067] dark:border-[#303a44] dark:text-[#a8b2ad]">
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
        <div className="rounded-xl border border-[#e7e1d8] bg-white shadow-[0_12px_34px_rgba(47,39,29,0.05)] transition-colors duration-300 dark:border-[#303a44] dark:bg-[#10161d] dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <div className="relative">
            <EditorContent editor={editor} />
            {isEditorEmpty ? (
              <span className="pointer-events-none absolute left-4 top-3 text-sm text-[#a9aaa6] dark:text-[#7f8a86]">
                继续提问...（Shift + Enter 换行）
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <button
              aria-label="添加附件"
              className="grid size-8 place-items-center rounded-full border border-[#d8d2ca] text-[#343a36] transition hover:bg-[#f6f2ec] dark:border-[#52606b] dark:text-[#e1e9e4] dark:hover:bg-[#18212a]"
              type="button"
            >
              <PlusCircle size={18} />
            </button>
            <button
              aria-label="发送"
              className="grid size-10 place-items-center rounded-full bg-[#c9792f] text-white shadow-[0_10px_24px_rgba(201,121,47,0.25)] transition hover:bg-[#b96d28] dark:bg-[#4b8a5c] dark:shadow-[0_14px_30px_rgba(33,91,53,0.36)] dark:hover:bg-[#5ba66e]"
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
