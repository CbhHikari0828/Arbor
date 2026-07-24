import { useState } from "react";
import { Clock3, RotateCcw, Trash2 } from "lucide-react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

interface DeletedNode {
  id: string;
  title: string;
  parentTitle: string;
  description: string;
  deletedAt: string;
  expiresIn: string;
  tags: string[];
}

const initialDeletedNodes: DeletedNode[] = [
  {
    id: "deleted-competitive-notes",
    title: "竞品功能对比（早期草稿）",
    parentTitle: "Arbor 最小可行产品",
    description: "第一轮竞品记录，已被新的市场分析节点替代。",
    deletedAt: "今天 09:48",
    expiresIn: "29 天后清除",
    tags: ["产品", "归档"],
  },
  {
    id: "deleted-old-context",
    title: "旧版上下文规则",
    parentTitle: "上下文引擎",
    description: "已合并进当前的上下文引擎方案，保留到回收站以便核对。",
    deletedAt: "昨天 17:26",
    expiresIn: "28 天后清除",
    tags: ["AI", "规则"],
  },
  {
    id: "deleted-user-insight",
    title: "访谈洞察：个人研究者",
    parentTitle: "用户研究",
    description: "样本范围较小，后续由完整访谈纪要替代。",
    deletedAt: "7 月 20 日",
    expiresIn: "24 天后清除",
    tags: ["研究"],
  },
];

export function TrashPage() {
  const [deletedNodes, setDeletedNodes] = useState(initialDeletedNodes);
  const [notice, setNotice] = useState("");

  const restoreNode = (node: DeletedNode) => {
    setDeletedNodes((nodes) => nodes.filter((candidate) => candidate.id !== node.id));
    setNotice(`已恢复“${node.title}”`);
  };

  const permanentlyDeleteNode = (node: DeletedNode) => {
    setDeletedNodes((nodes) => nodes.filter((candidate) => candidate.id !== node.id));
    setNotice(`已永久删除“${node.title}”`);
  };

  return (
    <WorkspaceScaffold>
      {() => (
        <section className="flex h-full min-w-0 flex-col bg-[#f7f7f7] dark:bg-[#0b1016]">
          <header className="flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-white/95 px-7 py-5 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]/95">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eeeeee] text-[#111111] dark:bg-[#38211f] dark:text-[#e79b89]">
                <Trash2 size={20} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[21px] font-semibold text-[#222222] dark:text-[#f4f7f5]">回收站</h1>
                <p className="mt-1 text-sm text-[#666666] dark:text-[#9aa6a1]">
                  已删除节点会保留 30 天，期间可以恢复到原来的知识树
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#eeeeee] px-3 py-1.5 text-sm font-medium text-[#555555] dark:bg-[#18212a] dark:text-[#c9d4cd]">
              {deletedNodes.length} 个已删除节点
            </span>
          </header>

          <div className="min-h-0 flex-1 overflow-auto px-7 py-6">
            <div className="mb-5 flex items-center gap-3 border border-[#d8d8d8] bg-[#ffffff] px-4 py-3 text-sm text-[#555555] dark:border-[#4a3b26] dark:bg-[#211a11] dark:text-[#d2bb8f]">
              <Clock3 size={17} className="shrink-0" strokeWidth={1.8} />
              <p>回收站内的内容不会参与 AI 检索或知识图谱关联。</p>
            </div>

            {notice ? (
              <p aria-live="polite" className="mb-4 text-sm font-medium text-[#222222] dark:text-[#91d4a8]">
                {notice}
              </p>
            ) : null}

            {deletedNodes.length > 0 ? (
              <section className="min-w-[760px] overflow-hidden rounded-lg border border-[#d8d8d8] bg-white dark:border-[#27313a] dark:bg-[#10161d]">
                <div className="grid grid-cols-[minmax(300px,1.65fr)_minmax(130px,0.8fr)_116px_120px_170px] items-center gap-4 border-b border-[#e2e2e2] bg-[#f3f3f3] px-5 py-3 text-xs font-medium text-[#777777] dark:border-[#27313a] dark:bg-[#141b23] dark:text-[#97a39c]">
                  <span>节点</span>
                  <span>原位置</span>
                  <span>删除时间</span>
                  <span>保留期限</span>
                  <span className="text-right">操作</span>
                </div>
                <div className="divide-y divide-[#e2e2e2] dark:divide-[#27313a]">
                  {deletedNodes.map((node) => (
                    <article
                      key={node.id}
                      className="grid grid-cols-[minmax(300px,1.65fr)_minmax(130px,0.8fr)_116px_120px_170px] items-center gap-4 px-5 py-4 transition hover:bg-[#f3f3f3] dark:hover:bg-[#131b22]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#eeeeee] text-[#333333] dark:bg-[#38211f] dark:text-[#e69b89]">
                            <Trash2 size={17} strokeWidth={1.7} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#222222] dark:text-[#edf3ef]">{node.title}</p>
                            <p className="mt-1 truncate text-xs text-[#888888] dark:text-[#8c9991]">{node.description}</p>
                          </div>
                        </div>
                        <div className="ml-12 mt-2 flex gap-1.5">
                          {node.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-[#eeeeee] px-1.5 py-0.5 text-[11px] text-[#777777] dark:bg-[#1d2730] dark:text-[#a9b5ad]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="truncate text-sm text-[#666666] dark:text-[#c3ccc6]">{node.parentTitle}</span>
                      <span className="text-sm text-[#777777] dark:text-[#a4afa9]">{node.deletedAt}</span>
                      <span className="text-sm text-[#777777] dark:text-[#dfa08f]">{node.expiresIn}</span>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-[#222222] transition hover:bg-[#eeeeee] dark:text-[#8fcea5] dark:hover:bg-[#173827]"
                          onClick={() => restoreNode(node)}
                          type="button"
                        >
                          <RotateCcw size={15} strokeWidth={1.9} />
                          恢复
                        </button>
                        <button
                          aria-label={`永久删除：${node.title}`}
                          className="grid size-8 place-items-center rounded-md text-[#333333] transition hover:bg-[#eeeeee] dark:text-[#e49a89] dark:hover:bg-[#38211f]"
                          onClick={() => permanentlyDeleteNode(node)}
                          title="永久删除"
                          type="button"
                        >
                          <Trash2 size={16} strokeWidth={1.8} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <div className="grid min-h-[360px] place-items-center border border-dashed border-[#d8d8d8] bg-white/70 px-6 text-center dark:border-[#303a44] dark:bg-[#10161d]/50">
                <div>
                  <Trash2 className="mx-auto mb-4 text-[#afb5ad] dark:text-[#77837b]" size={31} strokeWidth={1.4} />
                  <p className="text-base font-medium text-[#333333] dark:text-[#e1e9e4]">回收站已清空</p>
                  <p className="mt-2 text-sm text-[#777777] dark:text-[#929e96]">删除的节点会在这里保留 30 天</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </WorkspaceScaffold>
  );
}
