import { getSmoothStepPath, Panel, Position, useStore, useViewport } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { useMemo } from "react";

const OVERVIEW_WIDTH = 180;
const OVERVIEW_HEIGHT = 104;
const OVERVIEW_PADDING = 8;
const DEFAULT_NODE_WIDTH = 252;
const DEFAULT_NODE_HEIGHT = 170;

interface GraphOverviewProps {
  nodes: Node[];
  edges: Edge[];
  isDarkMode: boolean;
}

interface OverviewNode {
  id: string;
  node: Node;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverviewLayout {
  nodes: OverviewNode[];
  nodeById: Map<string, OverviewNode>;
  scale: number;
  translateX: number;
  translateY: number;
}

interface OverviewNodeData {
  isActive?: boolean;
  status?: string;
}

export function GraphOverview({ nodes, edges, isDarkMode }: GraphOverviewProps) {
  const viewport = useViewport();
  const flowWidth = useStore((state) => state.width);
  const flowHeight = useStore((state) => state.height);
  const layout = useMemo(() => buildOverviewLayout(nodes), [nodes]);

  if (!layout) {
    return null;
  }

  const zoom = viewport.zoom || 1;
  const viewportX = -viewport.x / zoom;
  const viewportY = -viewport.y / zoom;

  return (
    <Panel
      className="arbor-minimap pointer-events-none"
      position="bottom-right"
      style={{ width: OVERVIEW_WIDTH, height: OVERVIEW_HEIGHT }}
    >
      <svg
        aria-label="知识图谱缩略图"
        className="arbor-minimap-svg"
        height={OVERVIEW_HEIGHT}
        role="img"
        viewBox={`0 0 ${OVERVIEW_WIDTH} ${OVERVIEW_HEIGHT}`}
        width={OVERVIEW_WIDTH}
      >
        <g transform={`translate(${layout.translateX} ${layout.translateY}) scale(${layout.scale})`}>
          {edges.map((edge) => {
            const sourceNode = layout.nodeById.get(edge.source);
            const targetNode = layout.nodeById.get(edge.target);

            if (!sourceNode || !targetNode) {
              return null;
            }

            const [path] = getSmoothStepPath({
              sourcePosition: Position.Right,
              sourceX: sourceNode.x + sourceNode.width,
              sourceY: sourceNode.y + sourceNode.height / 2,
              targetPosition: Position.Left,
              targetX: targetNode.x,
              targetY: targetNode.y + targetNode.height / 2,
            });
            const isSummaryEdge = Boolean(edge.style?.strokeDasharray);

            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke={isSummaryEdge ? (isDarkMode ? "#f0b84f" : "#8a8a8a") : isDarkMode ? "#61b979" : "#303030"}
                strokeDasharray={isSummaryEdge ? "4 3" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {layout.nodes.map((overviewNode) => {
            const presentation = getNodePresentation(overviewNode, isDarkMode);

            return (
              <rect
                key={overviewNode.id}
                fill={presentation.fill}
                height={overviewNode.height}
                rx={16}
                ry={16}
                stroke={presentation.stroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                width={overviewNode.width}
                x={overviewNode.x}
                y={overviewNode.y}
              />
            );
          })}
        </g>

        {flowWidth > 0 && flowHeight > 0 ? (
          <rect
            fill={isDarkMode ? "rgba(221, 236, 226, 0.035)" : "rgba(255, 255, 255, 0.08)"}
            height={(flowHeight / zoom) * layout.scale}
            pointerEvents="none"
            rx={2}
            ry={2}
            stroke={isDarkMode ? "#8ea59a" : "#111111"}
            strokeWidth={1}
            width={(flowWidth / zoom) * layout.scale}
            x={layout.translateX + viewportX * layout.scale}
            y={layout.translateY + viewportY * layout.scale}
          />
        ) : null}
      </svg>
    </Panel>
  );
}

function buildOverviewLayout(nodes: Node[]): OverviewLayout | undefined {
  if (nodes.length === 0) {
    return undefined;
  }

  const overviewNodes = nodes.map<OverviewNode>((node) => {
    const width = node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT;

    return {
      id: node.id,
      node,
      x: node.position.x,
      y: node.position.y,
      width,
      height,
    };
  });
  const minX = Math.min(...overviewNodes.map((node) => node.x));
  const minY = Math.min(...overviewNodes.map((node) => node.y));
  const maxX = Math.max(...overviewNodes.map((node) => node.x + node.width));
  const maxY = Math.max(...overviewNodes.map((node) => node.y + node.height));
  const boundsWidth = Math.max(maxX - minX, 1);
  const boundsHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (OVERVIEW_WIDTH - OVERVIEW_PADDING * 2) / boundsWidth,
    (OVERVIEW_HEIGHT - OVERVIEW_PADDING * 2) / boundsHeight,
  );

  return {
    nodes: overviewNodes,
    nodeById: new Map(overviewNodes.map((node) => [node.id, node])),
    scale,
    translateX: (OVERVIEW_WIDTH - boundsWidth * scale) / 2 - minX * scale,
    translateY: (OVERVIEW_HEIGHT - boundsHeight * scale) / 2 - minY * scale,
  };
}

function getNodePresentation(node: OverviewNode, isDarkMode: boolean) {
  const data = node.node.data as OverviewNodeData;

  if (data.isActive) {
    return {
      fill: isDarkMode ? "#4f9564" : "#202020",
      stroke: isDarkMode ? "#b9dfc0" : "#111111",
    };
  }

  if (data.status === "summarized") {
    return {
      fill: isDarkMode ? "#a56d24" : "#9a9a9a",
      stroke: isDarkMode ? "#f0b84f" : "#5f5f5f",
    };
  }

  return {
    fill: isDarkMode ? "#33404a" : "#d7d7d7",
    stroke: isDarkMode ? "#73838d" : "#777777",
  };
}
