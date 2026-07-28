import { Link2, NotebookPen } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

interface DiscussionNote {
  id: string;
  branchId: string;
  messageId: string | null;
  title?: string;
  content: string;
  createdAt: string;
}

export function NotesPage() {
  return <WorkspaceScaffold>{({ snapshot }) => <NotesLibrary branchNodeIds={new Map(snapshot?.branches.map((branch) => [branch.id, branch.nodeId]))} branchTitles={new Map(snapshot?.branches.map((branch) => [branch.id, branch.title]))} fallbackBranchId={snapshot?.branches[0]?.id} />}</WorkspaceScaffold>;
}

function NotesLibrary({ branchTitles, branchNodeIds, fallbackBranchId }: { branchTitles: Map<string, string>; branchNodeIds: Map<string, string>; fallbackBranchId: string | undefined }) {
  const [notes, setNotes] = useState<DiscussionNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<DiscussionNote | null>(null);

  useEffect(() => {
    try { setNotes(JSON.parse(window.localStorage.getItem("arbor-discussion-notes") ?? "[]") as DiscussionNote[]); } catch { setNotes([]); }
  }, []);

  const displayedNotes = notes.length > 0 || !fallbackBranchId ? notes : [
    { id: "mock-library-note-1", branchId: fallbackBranchId, messageId: null, title: "验证产品假设", content: "先把核心问题拆成可验证的假设，再决定下一步需要补充的上下文。", createdAt: "2026-07-28T09:20:00.000Z" },
    { id: "mock-library-note-2", branchId: fallbackBranchId, messageId: null, title: "下一步待办", content: "待办：补充目标用户的使用路径，并确认首个可交付版本的边界。", createdAt: "2026-07-28T09:05:00.000Z" },
  ];

  if (selectedNote) return <div className="h-full overflow-y-auto bg-[#f7f7f7] px-8 py-9 dark:bg-[#0b1016]"><div className="mx-auto w-full max-w-3xl"><button className="mb-6 text-sm text-[#666666] transition hover:text-[#111111] dark:text-[#aab7af] dark:hover:text-[#aee2bc]" onClick={() => setSelectedNote(null)} type="button">返回笔记列表</button><article className="rounded-lg border border-[#dfdfdf] bg-white px-6 py-5 shadow-[0_10px_26px_rgba(0,0,0,0.05)] dark:border-[#303a44] dark:bg-[#10161d]"><h1 className="text-xl font-semibold text-[#202020] dark:text-[#edf3ef]">{selectedNote.title ?? "未命名笔记"}</h1><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#303030] dark:text-[#dce5df]">{selectedNote.content}</p><Link className="mt-7 inline-flex items-center gap-1.5 rounded-md bg-[#eeeeee] px-3 py-2 text-xs font-medium text-[#333333] transition hover:bg-[#dfdfdf] dark:bg-[#1d2922] dark:text-[#cfe0d5] dark:hover:bg-[#27382e]" to={`/workspace?branch=${selectedNote.branchId}&node=${branchNodeIds.get(selectedNote.branchId) ?? ""}`}><Link2 size={14} />查看关联对话</Link></article></div></div>;

  return <div className="h-full overflow-y-auto bg-[#f7f7f7] px-8 py-9 dark:bg-[#0b1016]"><div className="mx-auto w-full max-w-3xl">
    <header className="border-b border-[#d8d8d8] pb-6 dark:border-[#27313a]"><div className="flex items-center gap-2 text-[#222222] dark:text-[#dce5df]"><NotebookPen size={19} /><h1 className="text-2xl font-semibold">笔记</h1></div><p className="mt-2 text-sm text-[#666666] dark:text-[#9ca8a2]">来自各个节点对话的个人记录与结论。</p></header>
    <section className="mt-7 space-y-3">{displayedNotes.length === 0 ? <div className="rounded-lg border border-dashed border-[#d8d8d8] px-5 py-12 text-center text-sm text-[#777777] dark:border-[#303a44] dark:text-[#94a09a]">还没有笔记。你可以在 AI 助手侧栏的“笔记”分栏中创建。</div> : displayedNotes.map((note) => <button className="block w-full rounded-lg border border-[#dfdfdf] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] dark:border-[#303a44] dark:bg-[#10161d]" key={note.id} onClick={() => setSelectedNote(note)} type="button"><p className="truncate text-sm font-semibold text-[#262626] dark:text-[#e0e8e3]">{note.title ?? "未命名笔记"}</p><div className="mt-3 flex items-center justify-between gap-3"><p className="truncate text-xs text-[#777777] dark:text-[#94a09a]">{branchTitles.get(note.branchId) ?? "已删除或未加载的对话"}</p><time className="shrink-0 text-[11px] text-[#999999] dark:text-[#758279]">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(note.createdAt))}</time></div></button>)}</section>
  </div></div>;
}
