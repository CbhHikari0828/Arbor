import { BookOpen, FileText, Upload } from "lucide-react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

export function KnowledgeLibraryPage() {
  return <WorkspaceScaffold>{() => <KnowledgeLibraryContent />}</WorkspaceScaffold>;
}

function KnowledgeLibraryContent() {
  return <section className="flex h-full min-w-0 flex-col bg-[#f7f7f7] dark:bg-[#0b1016]"><header className="flex min-h-[96px] items-center justify-between border-b border-[#d8d8d8] bg-white px-7 py-5 dark:border-[#27313a] dark:bg-[#0b1016]"><div className="flex items-center gap-4"><div className="grid size-10 place-items-center rounded-lg bg-[#eeeeee] dark:bg-[#173626]"><BookOpen size={21} /></div><div><h1 className="text-xl font-semibold">我的知识库</h1><p className="mt-1 text-sm text-[#777777] dark:text-[#9aa6a1]">上传的文档会被解析并在对话中作为知识来源引用。</p></div></div><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111111] px-4 text-sm font-medium text-white opacity-55 dark:bg-[#4b9b65]" disabled title="文档上传后端尚未接入" type="button"><Upload size={17} />上传文档</button></header><div className="grid min-h-0 flex-1 place-items-center px-7 py-6"><div className="max-w-sm text-center"><FileText className="mx-auto mb-4 text-[#a2aaa3] dark:text-[#728077]" size={34} strokeWidth={1.4} /><h2 className="text-base font-semibold">知识库为空</h2><p className="mt-2 text-sm leading-6 text-[#777777] dark:text-[#94a09a]">文档存储、解析与检索链路接入后，这里会显示你真实上传的资料。</p></div></div></section>;
}
