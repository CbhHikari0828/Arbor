import {
  Expand,
  Home,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspaceController } from "@/application/useWorkspaceController";
import { DiscussionPanel } from "@/presentation/components/DiscussionPanel";
import { KnowledgeGraph } from "@/presentation/components/KnowledgeGraph";
import { NodeTreePanel } from "@/presentation/components/NodeTreePanel";

export function WorkspacePage() {
  const workspace = useWorkspaceController();
  const [searchParams] = useSearchParams();
  const requestedBranchId = searchParams.get("branch");
  const requestedNodeId = searchParams.get("node");
  const [isDiscussionMaximized, setIsDiscussionMaximized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("arbor-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    window.localStorage.setItem("arbor-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const targetBranch = workspace.snapshot?.branches.find((branch) => branch.id === requestedBranchId);
    const targetNodeId = requestedNodeId ?? targetBranch?.nodeId;
    if (targetNodeId && workspace.snapshot?.nodes.some((node) => node.id === targetNodeId)) {
      workspace.selectNode(targetNodeId);
      workspace.focusGraphNodes([targetNodeId]);
    }
  }, [requestedBranchId, requestedNodeId, workspace.focusGraphNodes, workspace.selectNode, workspace.snapshot]);

  if (workspace.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground dark:bg-[#06090d] dark:text-[#8e9a95]">
        正在加载知识工作台...
      </main>
    );
  }

  const nodeCount = workspace.snapshot?.nodes.length ?? 0;
  const rootNode = workspace.snapshot?.nodes.find((node) => node.parentId === null);
  const focusRootNode = () => {
    if (!rootNode) {
      return;
    }

    workspace.selectNode(rootNode.id);
    workspace.focusGraphNodes([rootNode.id]);
  };

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300 dark:bg-[#06090d] dark:text-[#eef3ef]">
      <NodeTreePanel
        nodes={workspace.snapshot?.nodes ?? []}
        selectedNodeId={workspace.selectedNode?.id}
        onSelectNode={workspace.selectNode}
        onCreateRootNode={workspace.createRootNode}
        isCreatingRootNode={workspace.isCreatingRootNode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((value) => !value)}
      />

      <section className="min-h-0 min-w-0 flex-1">
        <div className="relative grid h-full min-w-0 grid-cols-[minmax(0,1fr)_346px] overflow-hidden border border-border/80 bg-card transition-colors duration-300 dark:border-[#27313a] dark:bg-[#0b1016]">
          <section className="flex min-h-0 min-w-0 flex-col">
            <header className="absolute left-5 top-5 z-10">
              <div className="hidden">
                <div className="min-w-0">
                  <h1 className="truncate text-[21px] font-semibold tracking-[-0.01em] text-foreground dark:text-[#f4f7f5]">
                    {workspace.selectedNode?.title ?? "Arbor 最小可行产品"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-muted-foreground dark:text-[#a8b2ad]">
                    {workspace.selectedNode?.description ?? "产品核心目标与最小可行动能集合"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 [&>button:not(:first-child)]:hidden">
                <HeaderIconButton label="搜索" icon={<Search size={21} strokeWidth={1.8} />} />
                <HeaderIconButton
                  label="筛选"
                  icon={<SlidersHorizontal size={20} strokeWidth={1.8} />}
                />
                <HeaderIconButton
                  label="更多"
                  icon={<MoreHorizontal size={22} strokeWidth={1.8} />}
                />
              </div>
            </header>

            <KnowledgeGraph
              canvasId={workspace.canvasId}
              nodes={workspace.graphNodes}
              edges={workspace.graphEdges}
              focusNodeRequest={workspace.graphFocusRequest}
              isDarkMode={isDarkMode}
              onSelectNode={workspace.selectNode}
            />

            <footer className="flex h-[74px] shrink-0 items-center justify-between border-t border-border/70 bg-white px-6 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]">
              <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-[#9aa6a1]">
                <button
                  aria-label="定位根节点"
                  className="grid size-8 place-items-center rounded-full transition hover:bg-muted dark:hover:bg-[#151c24]"
                  onClick={focusRootNode}
                  title="定位根节点"
                  type="button"
                >
                  <Home size={17} />
                </button>
                <span>/</span>
                <span className="rounded-full bg-muted px-3 py-2 text-foreground dark:bg-[#151c24] dark:text-[#dce4df]">
                  {workspace.selectedNode?.title ?? "Arbor 最小可行产品"}
                </span>
              </div>
              <div className="flex items-center gap-7 text-sm text-foreground dark:text-[#dce4df]">
                <span>共 {nodeCount} 个节点</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 dark:bg-[#151c24]">
                  <Search size={15} />
                  100%
                </span>
                <button
                  aria-label="全屏"
                  className="grid size-8 place-items-center rounded-full transition hover:bg-muted dark:hover:bg-[#151c24]"
                  type="button"
                >
                  <Expand size={18} />
                </button>
              </div>
            </footer>
          </section>

          <DiscussionPanel
            branch={workspace.selectedBranch}
            isMaximized={isDiscussionMaximized}
            onToggleMaximize={() => setIsDiscussionMaximized((value) => !value)}
          />
        </div>
      </section>
    </main>
  );
}

function HeaderIconButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-full transition hover:bg-muted dark:text-[#edf3ef] dark:hover:bg-[#151c24]"
      type="button"
    >
      {icon}
    </button>
  );
}
