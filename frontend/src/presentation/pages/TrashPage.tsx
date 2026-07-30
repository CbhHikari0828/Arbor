import { RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

interface DeletedNode { id: string; title: string; parentTitle: string | null; description: string; tags: string[]; deletedAt: string }
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

export function TrashPage() { return <WorkspaceScaffold>{() => <TrashContent />}</WorkspaceScaffold>; }

function TrashContent() {
  const [nodes, setNodes] = useState<DeletedNode[]>([]);
  const [error, setError] = useState("");
  const load = () => fetch(`${apiBaseUrl}/api/trash/nodes`).then((response) => response.ok ? response.json() : Promise.reject()).then((items) => setNodes(items as DeletedNode[])).catch(() => setError("回收站暂时无法加载"));
  useEffect(() => { void load(); }, []);
  const run = async (id: string, action: "restore" | "delete") => { const response = await fetch(`${apiBaseUrl}/api/trash/nodes/${id}${action === "restore" ? "/restore" : ""}`, { method: action === "restore" ? "PATCH" : "DELETE" }); if (response.ok) setNodes((current) => current.filter((node) => node.id !== id)); else setError("操作失败，请重试"); };
  return <section className="flex h-full min-w-0 flex-col bg-[#f7f7f7] dark:bg-[#0b1016]"><header className="flex min-h-[96px] items-center justify-between border-b border-[#d8d8d8] bg-white px-7 py-5 dark:border-[#27313a] dark:bg-[#0b1016]"><div className="flex items-center gap-3"><Trash2 size={21} /><div><h1 className="text-xl font-semibold">回收站</h1><p className="mt-1 text-sm text-[#777777] dark:text-[#9aa6a1]">已删除节点可恢复，或永久删除。</p></div></div><span className="text-sm text-[#777777]">{nodes.length} 个节点</span></header><div className="min-h-0 flex-1 overflow-auto px-7 py-6">{error ? <p className="mb-4 text-sm text-[#b42318]">{error}</p> : null}{nodes.length === 0 ? <div className="grid min-h-[360px] place-items-center border border-dashed border-[#d8d8d8] bg-white/70 text-sm text-[#777777] dark:border-[#303a44] dark:bg-[#10161d]/50 dark:text-[#94a09a]">回收站为空</div> : <div className="space-y-3">{nodes.map((node) => <article className="flex items-center justify-between gap-5 rounded-lg border border-[#d8d8d8] bg-white px-5 py-4 dark:border-[#303a44] dark:bg-[#10161d]" key={node.id}><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{node.title}</h2><p className="mt-1 truncate text-xs text-[#777777]">{node.description}</p><p className="mt-2 text-xs text-[#999999]">{node.parentTitle ?? "根节点"} · {new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(node.deletedAt))}</p></div><div className="flex shrink-0 gap-2"><button className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm hover:bg-[#eeeeee] dark:hover:bg-[#1d2922]" onClick={() => void run(node.id, "restore")} type="button"><RotateCcw size={15} />恢复</button><button aria-label="永久删除" className="grid size-8 place-items-center rounded-md text-[#b42318] hover:bg-[#fff0ed] dark:hover:bg-[#38211f]" onClick={() => void run(node.id, "delete")} type="button"><Trash2 size={16} /></button></div></article>)}</div>}</div></section>;
}
