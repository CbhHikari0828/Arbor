import { useMemo } from "react";
import { ArrowUpRight, Network, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WorkspaceController } from "@/application/useWorkspaceController";
import type { KnowledgeNode } from "@/domain/knowledge/types";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

const statusPresentation = {
  seed: {
    label: "待整理",
    className: "bg-[#eeeeee] text-[#555555] dark:bg-[#3b2b18] dark:text-[#e6b45f]",
  },
  exploring: {
    label: "探索中",
    className: "bg-[#eeeeee] text-[#444444] dark:bg-[#172d3f] dark:text-[#9bc3e0]",
  },
  summarized: {
    label: "已总结",
    className: "bg-[#eeeeee] text-[#222222] dark:bg-[#173827] dark:text-[#91d6aa]",
  },
} as const;

export function FavoritesPage() {
  return (
    <WorkspaceScaffold>
      {(workspace) => <FavoritesContent workspace={workspace} />}
    </WorkspaceScaffold>
  );
}

function FavoritesContent({ workspace }: { workspace: WorkspaceController }) {
  const navigate = useNavigate();
  const nodes = workspace.snapshot?.nodes ?? [];
  const favoriteNodes = useMemo(
    () => nodes.filter((node) => workspace.favoriteNodeIds.has(node.id)),
    [nodes, workspace.favoriteNodeIds],
  );
  const childCountByNodeId = useMemo(() => {
    const counts = new Map<string, number>();

    nodes.forEach((node) => {
      if (node.parentId) {
        counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
      }
    });

    return counts;
  }, [nodes]);

  const openNode = (nodeId: string) => {
    workspace.selectNode(nodeId);
    navigate("/workspace");
  };

  return (
    <section className="flex h-full min-w-0 flex-col bg-[#f7f7f7] dark:bg-[#0b1016]">
      <header className="flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-white/95 px-7 py-5 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]/95">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eeeeee] text-[#111111] dark:bg-[#3b2b16] dark:text-[#f0c563]">
            <Star size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[21px] font-semibold text-[#222222] dark:text-[#f4f7f5]">收藏夹</h1>
            <p className="mt-1 text-sm text-[#666666] dark:text-[#9aa6a1]">
              快速回到你希望持续跟进的知识节点
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#eeeeee] px-3 py-1.5 text-sm font-medium text-[#555555] dark:bg-[#18212a] dark:text-[#c9d4cd]">
          {favoriteNodes.length} 个收藏
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-7 py-6">
        {favoriteNodes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteNodes.map((node) => (
              <FavoriteNodeCard
                key={node.id}
                childCount={childCountByNodeId.get(node.id) ?? 0}
                node={node}
                onOpen={() => openNode(node.id)}
                onToggleFavorite={() => workspace.toggleFavoriteNode(node.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center border border-dashed border-[#d8d8d8] bg-white/70 px-6 text-center dark:border-[#303a44] dark:bg-[#10161d]/50">
            <div>
              <Star className="mx-auto mb-4 text-[#afb5ad] dark:text-[#77837b]" size={32} strokeWidth={1.4} />
              <p className="text-base font-medium text-[#333333] dark:text-[#e1e9e4]">还没有收藏节点</p>
              <p className="mt-2 text-sm text-[#777777] dark:text-[#929e96]">在节点右上角点亮星标，常用内容会出现在这里</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FavoriteNodeCard({
  node,
  childCount,
  onOpen,
  onToggleFavorite,
}: {
  node: KnowledgeNode;
  childCount: number;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const status = statusPresentation[node.status];

  return (
    <article className="relative min-h-[204px] rounded-lg border border-[#d8d8d8] bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.045)] transition hover:-translate-y-0.5 hover:border-[#aaaaaa] hover:shadow-[0_14px_30px_rgba(0,0,0,0.09)] dark:border-[#2a3540] dark:bg-[#10161d] dark:hover:border-[#3f7152]">
      <button
        aria-label={`取消收藏：${node.title}`}
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-md text-[#111111] transition hover:bg-[#eeeeee] dark:text-[#f0c563] dark:hover:bg-[#3a2b16]"
        onClick={onToggleFavorite}
        title="取消收藏"
        type="button"
      >
        <Star fill="currentColor" size={18} strokeWidth={1.7} />
      </button>

      <button className="block w-full pr-9 text-left" onClick={onOpen} type="button">
        <div className="mb-4 flex items-center gap-2">
          <Network size={17} className="shrink-0 text-[#333333] dark:text-[#8dcaa1]" strokeWidth={1.8} />
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
        </div>
        <h2 className="truncate text-base font-semibold text-[#222222] dark:text-[#edf3ef]">{node.title}</h2>
        <p className="mt-2 h-10 overflow-hidden text-sm leading-5 text-[#777777] dark:text-[#9daaa2]">{node.description}</p>
      </button>

      <div className="absolute inset-x-5 bottom-4 flex items-center justify-between border-t border-[#e2e2e2] pt-3 text-xs text-[#777777] dark:border-[#27313a] dark:text-[#95a198]">
        <span>{childCount} 个下级节点</span>
        <button
          className="inline-flex items-center gap-1 font-medium text-[#222222] transition hover:text-[#000000] dark:text-[#8dcaa1] dark:hover:text-[#b6e2c2]"
          onClick={onOpen}
          type="button"
        >
          打开
          <ArrowUpRight size={14} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}
