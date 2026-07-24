import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
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
  favoriteNodeIds: new Set(["node-context", "node-summary"]),
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

  const graphNodes = useMemo<Node[]>(
    () =>
      visibleNodes.map((node) => ({
        id: node.id,
        position: node.position,
        type: "knowledgeNode",
        width: 252,
        height: 170,
        data: {
          nodeId: node.id,
          label: node.title,
          description: node.description,
          status: node.status,
          childCount: childCountByNodeId.get(node.id) ?? 0,
          isRoot: node.parentId === null,
          isActive: node.id === selectedNode?.id,
          isFavorite: favoriteNodeIds.has(node.id),
          onCreateChildNode: createChildNode,
          onDeleteNode: deleteNode,
          onToggleFavorite: toggleFavoriteNode,
        },
      })),
    [
      childCountByNodeId,
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
            type: "smoothstep",
            animated: edge.target === selectedNode?.id,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 8,
              height: 8,
              color,
            },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 8,
            labelBgStyle: {
              fill: "var(--edge-label-bg)",
              fillOpacity: 1,
            },
            labelStyle: {
              fill: "var(--edge-label-text)",
              fontSize: 12,
              fontWeight: 500,
            },
            style: {
              stroke: color,
              strokeDasharray: isSummaryEdge ? "4 4" : undefined,
              strokeWidth: edge.target === selectedNode?.id ? 2 : 1.6,
            },
          };
        }) ?? [],
    [selectedNode?.id, snapshot?.edges, visibleNodeIds],
  );

  return {
    snapshot,
    isLoading: workspaceQuery.isLoading,
    selectedNode,
    selectedBranch,
    canvasId: canvasRootNode?.id ?? "empty-canvas",
    graphNodes,
    graphEdges,
    favoriteNodeIds,
    toggleFavoriteNode,
    graphFocusRequest,
    focusGraphNodes,
    selectNode: setSelectedNodeId,
    createRootNode,
    isCreatingRootNode: createRootNodeMutation.isPending,
    createChildNode,
    isCreatingChildNode: createChildNodeMutation.isPending,
    deleteNode,
    isDeletingNode: deleteNodeMutation.isPending,
  };
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
