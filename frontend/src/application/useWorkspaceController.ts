import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { createChildKnowledgeNode } from "@/application/createChildKnowledgeNode";
import { createRootKnowledgeNode } from "@/application/createRootKnowledgeNode";
import { deleteKnowledgeNode } from "@/application/deleteKnowledgeNode";
import { loadWorkspaceSnapshot } from "@/application/loadWorkspaceSnapshot";
import type { DiscussionBranch, KnowledgeNode, WorkspaceSnapshot } from "@/domain/knowledge/types";
import { createKnowledgeRepository } from "@/infrastructure/repositories/repositoryFactory";

interface WorkspaceState {
  selectedNodeId: string;
  favoriteNodeIds: Set<string>;
  setSelectedNodeId: (nodeId: string) => void;
  toggleFavoriteNode: (nodeId: string) => void;
  removeFavoriteNodes: (nodeIds: Iterable<string>) => void;
}

const useWorkspaceState = create<WorkspaceState>((set) => ({
  selectedNodeId: "node-root",
  favoriteNodeIds: new Set(),
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  toggleFavoriteNode: (nodeId) =>
    set((state) => {
      const favoriteNodeIds = new Set(state.favoriteNodeIds);

      if (favoriteNodeIds.has(nodeId)) {
        favoriteNodeIds.delete(nodeId);
      } else {
        favoriteNodeIds.add(nodeId);
      }

      return { favoriteNodeIds };
    }),
  removeFavoriteNodes: (nodeIds) =>
    set((state) => {
      const favoriteNodeIds = new Set(state.favoriteNodeIds);

      for (const nodeId of nodeIds) {
        favoriteNodeIds.delete(nodeId);
      }

      return { favoriteNodeIds };
    }),
}));

const repository = createKnowledgeRepository();

export interface WorkspaceController {
  snapshot: WorkspaceSnapshot | undefined;
  isLoading: boolean;
  selectedNode: KnowledgeNode | undefined;
  selectedBranch: DiscussionBranch | undefined;
  canvasId: string;
  graphNodes: Node[];
  graphEdges: Edge[];
  favoriteNodeIds: ReadonlySet<string>;
  toggleFavoriteNode: (nodeId: string) => void;
  graphFocusRequest: { nodeIds: string[]; targetId: string; requestId: number } | undefined;
  focusGraphNodes: (nodeIds: string[], targetId?: string) => void;
  selectNode: (nodeId: string) => void;
  createRootNode: (title: string) => Promise<void>;
  isCreatingRootNode: boolean;
  createChildNode: (parentId: string) => Promise<void>;
  isCreatingChildNode: boolean;
  deleteNode: (nodeId: string) => Promise<void>;
  setNodeDescription: (nodeId: string, description: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  isDeletingNode: boolean;
}

export function useWorkspaceController(): WorkspaceController {
  const {
    selectedNodeId,
    favoriteNodeIds,
    setSelectedNodeId,
    toggleFavoriteNode,
    removeFavoriteNodes,
  } = useWorkspaceState();
  const queryClient = useQueryClient();
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
    fetch(`${apiBaseUrl}/api/nodes/favorites`).then((response) => response.ok ? response.json() : []).then((ids) => useWorkspaceState.setState({ favoriteNodeIds: new Set(ids as string[]) })).catch(() => undefined);
  }, []);
  const [graphFocusRequest, setGraphFocusRequest] = useState<{
    nodeIds: string[];
    targetId: string;
    requestId: number;
  }>();
  const graphFocusRequestId = useRef(0);
  const workspaceQuery = useQuery({
    queryKey: ["workspace-snapshot"],
    queryFn: () => loadWorkspaceSnapshot(repository),
  });
  const createRootNodeMutation = useMutation({
    mutationFn: (title: string) => createRootKnowledgeNode(repository, { title }),
  });
  const createChildNodeMutation = useMutation({
    mutationFn: (parentId: string) => createChildKnowledgeNode(repository, { parentId }),
  });
  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => deleteKnowledgeNode(repository, { nodeId }),
  });

  const snapshot = workspaceQuery.data;
  const focusGraphNodes = useCallback((nodeIds: string[], targetId = nodeIds[nodeIds.length - 1]) => {
    if (nodeIds.length === 0) {
      return;
    }

    graphFocusRequestId.current += 1;
    setGraphFocusRequest({ nodeIds, targetId, requestId: graphFocusRequestId.current });
  }, []);

  const selectedNode = useMemo(
    () => snapshot?.nodes.find((node) => node.id === selectedNodeId) ?? snapshot?.nodes[0],
    [selectedNodeId, snapshot?.nodes],
  );

  const selectedBranch = useMemo(
    () => snapshot?.branches.find((branch) => branch.nodeId === selectedNode?.id && branch.isActive),
    [selectedNode?.id, snapshot?.branches],
  );

  const canvasRootNode = useMemo(() => {
    if (!snapshot || !selectedNode) {
      return undefined;
    }

    return findRootNode(selectedNode, snapshot.nodes);
  }, [selectedNode, snapshot]);

  const visibleNodeIds = useMemo(() => {
    if (!snapshot || !canvasRootNode) {
      return new Set<string>();
    }

    return new Set(collectNodeAndDescendantIds(canvasRootNode.id, snapshot.nodes));
  }, [canvasRootNode, snapshot]);

  const visibleNodes = useMemo(
    () => snapshot?.nodes.filter((node) => visibleNodeIds.has(node.id)) ?? [],
    [snapshot?.nodes, visibleNodeIds],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      if (!snapshot) {
        return;
      }

      const deletedNodeIds = collectNodeAndDescendantIds(nodeId, snapshot.nodes);
      const deletedNodeIdSet = new Set(deletedNodeIds);
      const shouldMoveSelection = selectedNode ? deletedNodeIdSet.has(selectedNode.id) : true;
      const nextSelectedNode =
        shouldMoveSelection
          ? snapshot.nodes.find((node) => node.parentId === null && !deletedNodeIdSet.has(node.id)) ??
            snapshot.nodes.find((node) => !deletedNodeIdSet.has(node.id))
          : selectedNode;

      await deleteNodeMutation.mutateAsync(nodeId);
      await queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] });
      removeFavoriteNodes(deletedNodeIds);
      setSelectedNodeId(nextSelectedNode?.id ?? "");
    },
    [deleteNodeMutation, queryClient, removeFavoriteNodes, selectedNode, setSelectedNodeId, snapshot],
  );

  const createChildNode = useCallback(
    async (parentId: string) => {
      const result = await createChildNodeMutation.mutateAsync(parentId);
      await queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] });
      setSelectedNodeId(result.node.id);
      focusGraphNodes([parentId, result.node.id], result.node.id);
    },
    [createChildNodeMutation, focusGraphNodes, queryClient, setSelectedNodeId],
  );

  const createRootNode = useCallback(
    async (title: string) => {
      const result = await createRootNodeMutation.mutateAsync(title);
      await queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] });
      setSelectedNodeId(result.node.id);
      focusGraphNodes([result.node.id]);
    },
    [createRootNodeMutation, focusGraphNodes, queryClient, setSelectedNodeId],
  );

  const setNodeDescription = useCallback(async (nodeId: string, description: string) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
    const response = await fetch(`${apiBaseUrl}/api/nodes/${nodeId}/description`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) });
    if (!response.ok) throw new Error("Failed to update node description");
    await queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] });
  }, [queryClient]);
  const refreshWorkspace = useCallback(() => queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] }), [queryClient]);

  const childCountByNodeId = useMemo(() => {
    const counts = new Map<string, number>();

    visibleNodes.forEach((node) => {
      if (!node.parentId) {
        return;
      }

      counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    });

    return counts;
  }, [visibleNodes]);

  const conversationPreviewByNodeId = useMemo(() => {
    const previews = new Map<string, { question: string; answer: string }>();

    snapshot?.branches.forEach((branch) => {
      if (!branch.isActive || previews.has(branch.nodeId)) {
        return;
      }

      const question = branch.messages.find((message) => message.role === "user")?.content.trim() ?? "";
      const answer = branch.messages.find((message) => message.role === "assistant")?.content.trim() ?? "";
      previews.set(branch.nodeId, { question, answer: toNodePreview(answer) });
    });

    return previews;
  }, [snapshot?.branches]);

  const graphNodes = useMemo<Node[]>(
    () =>
      visibleNodes.map((node) => {
        const conversation = conversationPreviewByNodeId.get(node.id);

        return {
        id: node.id,
        position: node.position,
        type: "knowledgeNode",
        width: 252,
        height: 170,
        data: {
          nodeId: node.id,
          label: conversation?.question || node.title,
          description: conversation?.answer || node.description,
          status: node.status,
          childCount: childCountByNodeId.get(node.id) ?? 0,
          isRoot: node.parentId === null,
          isActive: node.id === selectedNode?.id,
          isFavorite: favoriteNodeIds.has(node.id),
          onCreateChildNode: createChildNode,
          onDeleteNode: deleteNode,
          onToggleFavorite: toggleFavoriteNode,
        },
        };
      }),
    [
      childCountByNodeId,
      conversationPreviewByNodeId,
      createChildNode,
      deleteNode,
      favoriteNodeIds,
      selectedNode?.id,
      toggleFavoriteNode,
      visibleNodes,
    ],
  );

  const graphEdges = useMemo<Edge[]>(
    () =>
      snapshot?.edges
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .map((edge) => {
          const isSummaryEdge = edge.source === "node-branching";
          const color = isSummaryEdge ? "var(--edge-accent)" : "var(--edge-primary)";

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: "default",
            animated: edge.target === selectedNode?.id,
            interactionWidth: 24,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 8,
              height: 8,
              color,
            },
            labelBgPadding: [9, 5],
            labelBgBorderRadius: 10,
            labelBgStyle: {
              fill: "var(--edge-label-bg)",
              fillOpacity: 0.94,
            },
            labelStyle: {
              fill: "var(--edge-label-text)",
              fontSize: 11,
              fontWeight: 600,
            },
            style: {
              stroke: color,
              strokeDasharray: isSummaryEdge ? "4 4" : undefined,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: edge.target === selectedNode?.id ? 2.2 : 1.7,
            },
          };
        }) ?? [],
    [selectedNode?.id, snapshot?.edges, visibleNodeIds],
  );

  const persistFavorite = (nodeId: string) => {
    const isFavorite = !favoriteNodeIds.has(nodeId);
    toggleFavoriteNode(nodeId);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
    void fetch(`${apiBaseUrl}/api/nodes/${nodeId}/favorite`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavorite }) });
  };
  return {
    snapshot,
    isLoading: workspaceQuery.isLoading,
    selectedNode,
    selectedBranch,
    canvasId: canvasRootNode?.id ?? "empty-canvas",
    graphNodes,
    graphEdges,
    favoriteNodeIds,
    toggleFavoriteNode: persistFavorite,
    graphFocusRequest,
    focusGraphNodes,
    selectNode: setSelectedNodeId,
    createRootNode,
    isCreatingRootNode: createRootNodeMutation.isPending,
    createChildNode,
    isCreatingChildNode: createChildNodeMutation.isPending,
    deleteNode,
    isDeletingNode: deleteNodeMutation.isPending,
    setNodeDescription,
    refreshWorkspace,
  };
}

function toNodePreview(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, "代码片段")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findRootNode(node: KnowledgeNode, nodes: KnowledgeNode[]) {
  let currentNode = node;

  while (currentNode.parentId) {
    const parentNode = nodes.find((candidate) => candidate.id === currentNode.parentId);

    if (!parentNode) {
      break;
    }

    currentNode = parentNode;
  }

  return currentNode;
}

function collectNodeAndDescendantIds(nodeId: string, nodes: KnowledgeNode[]) {
  const ids = new Set<string>();
  const visit = (currentNodeId: string) => {
    ids.add(currentNodeId);
    nodes
      .filter((node) => node.parentId === currentNodeId)
      .forEach((node) => visit(node.id));
  };

  visit(nodeId);

  return Array.from(ids);
}
