import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useWorkspaceController } from "@/application/useWorkspaceController";
import type { WorkspaceController } from "@/application/useWorkspaceController";
import { NodeTreePanel } from "@/presentation/components/NodeTreePanel";

interface WorkspaceScaffoldProps {
  children: (workspace: WorkspaceController) => ReactNode;
}

export function WorkspaceScaffold({ children }: WorkspaceScaffoldProps) {
  const workspace = useWorkspaceController();
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

  if (workspace.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground dark:bg-[#06090d] dark:text-[#8e9a95]">
        正在加载知识工作台...
      </main>
    );
  }

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
      <section className="min-w-0 flex-1">{children(workspace)}</section>
    </main>
  );
}
