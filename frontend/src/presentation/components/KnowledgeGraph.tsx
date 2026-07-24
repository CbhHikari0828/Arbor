import { Background, BackgroundVariant, Controls, ReactFlow, useReactFlow, useStore } from "@xyflow/react";
import type { Edge, Node, NodeTypes } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { KnowledgeGraphNode } from "@/presentation/components/KnowledgeGraphNode";
import { GraphOverview } from "@/presentation/components/GraphOverview";

const nodeTypes: NodeTypes = {
  knowledgeNode: KnowledgeGraphNode,
};

type FlowInternalNode = NonNullable<ReturnType<ReturnType<typeof useReactFlow>["getInternalNode"]>>;
type MeasuredFlowNode = FlowInternalNode & {
  measured: { height: number; width: number };
};

interface KnowledgeGraphProps {
  canvasId: string;
  nodes: Node[];
  edges: Edge[];
  focusNodeRequest: { nodeIds: string[]; targetId: string; requestId: number } | undefined;
  isDarkMode: boolean;
  onSelectNode: (nodeId: string) => void;
}

export function KnowledgeGraph({
  canvasId,
  nodes,
  edges,
  focusNodeRequest,
  isDarkMode,
  onSelectNode,
}: KnowledgeGraphProps) {
  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[#fffdf9] transition-colors duration-300 dark:bg-[#0b1117]">
      <ReactFlow
        key={canvasId}
        className="arbor-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.35}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelectNode(node.id)}
      >
        <Background
          color={isDarkMode ? "#27313a" : "#e6e0d7"}
          gap={20}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
        <Controls className="arbor-controls" position="bottom-left" showFitView showInteractive />
        <FocusRequestedNodes focusNodeRequest={focusNodeRequest} nodes={nodes} />
        <GraphOverview edges={edges} isDarkMode={isDarkMode} nodes={nodes} />
      </ReactFlow>
    </section>
  );
}

function FocusRequestedNodes({
  focusNodeRequest,
  nodes,
}: {
  focusNodeRequest: { nodeIds: string[]; targetId: string; requestId: number } | undefined;
  nodes: Node[];
}) {
  const { getInternalNode, setCenter, viewportInitialized } = useReactFlow();
  const flowWidth = useStore((state) => state.width);
  const flowHeight = useStore((state) => state.height);
  const requestedNodesMeasured = useStore((state) =>
    (focusNodeRequest?.nodeIds ?? []).every((nodeId) => {
      const node = state.nodeLookup.get(nodeId);
      return Boolean(node?.measured.width && node.measured.height);
    }),
  );
  const handledRequestId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const nodeIds = focusNodeRequest?.nodeIds ?? [];
    const targetId = focusNodeRequest?.targetId;

    if (
      !focusNodeRequest ||
      !targetId ||
      !requestedNodesMeasured ||
      !viewportInitialized ||
      flowWidth === 0 ||
      flowHeight === 0 ||
      handledRequestId.current === focusNodeRequest.requestId
    ) {
      return;
    }

    if (!nodeIds.every((nodeId) => nodes.some((node) => node.id === nodeId))) {
      return;
    }

    const targetNode = getInternalNode(targetId);
    const relatedNodes = nodeIds.map((nodeId) => getInternalNode(nodeId)).filter(hasMeasuredDimensions);

    if (!hasMeasuredDimensions(targetNode) || relatedNodes.length !== nodeIds.length) {
      return;
    }

    const requestId = focusNodeRequest.requestId;
    const animationFrame = window.requestAnimationFrame(() => {
      const focusedNode = getInternalNode(targetId);
      const measuredNodes = nodeIds.map((nodeId) => getInternalNode(nodeId)).filter(hasMeasuredDimensions);

      if (!hasMeasuredDimensions(focusedNode) || measuredNodes.length !== nodeIds.length) {
        return;
      }

      handledRequestId.current = requestId;
      void setCenter(
        focusedNode.internals.positionAbsolute.x + focusedNode.measured.width / 2,
        focusedNode.internals.positionAbsolute.y + focusedNode.measured.height / 2,
        {
          duration: 260,
          zoom: getFocusZoom(focusedNode, measuredNodes, flowWidth, flowHeight),
        },
      );
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [flowHeight, flowWidth, focusNodeRequest, getInternalNode, nodes, requestedNodesMeasured, setCenter, viewportInitialized]);

  return null;
}

function getFocusZoom(
  targetNode: MeasuredFlowNode,
  relatedNodes: MeasuredFlowNode[],
  flowWidth: number,
  flowHeight: number,
) {
  const targetCenterX = targetNode.internals.positionAbsolute.x + targetNode.measured.width / 2;
  const targetCenterY = targetNode.internals.positionAbsolute.y + targetNode.measured.height / 2;
  const horizontalDistance = Math.max(
    ...relatedNodes.flatMap((node) => [
      Math.abs(node.internals.positionAbsolute.x - targetCenterX),
      Math.abs(node.internals.positionAbsolute.x + node.measured.width - targetCenterX),
    ]),
  );
  const verticalDistance = Math.max(
    ...relatedNodes.flatMap((node) => [
      Math.abs(node.internals.positionAbsolute.y - targetCenterY),
      Math.abs(node.internals.positionAbsolute.y + node.measured.height - targetCenterY),
    ]),
  );
  const availableHalfWidth = Math.max(flowWidth / 2 - 48, 1);
  const availableHalfHeight = Math.max(flowHeight / 2 - 48, 1);
  const zoom = Math.min(0.9, availableHalfWidth / horizontalDistance, availableHalfHeight / verticalDistance);

  return Math.min(Math.max(zoom, 0.35), 0.9);
}

function hasMeasuredDimensions(node: FlowInternalNode | undefined): node is MeasuredFlowNode {
  return Boolean(node?.measured.width && node.measured.height);
}
