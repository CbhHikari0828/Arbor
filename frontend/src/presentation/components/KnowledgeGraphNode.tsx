import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { FileText, GitBranch, Minus, MoreHorizontal, Plus, Sprout, Star } from "lucide-react";
import type { KnowledgeNodeStatus } from "@/domain/knowledge/types";

export interface KnowledgeGraphNodeData extends Record<string, unknown> {
  nodeId: string;
  label: string;
  description: string;
  status: KnowledgeNodeStatus;
  childCount: number;
  isRoot: boolean;
  isActive: boolean;
  isFavorite: boolean;
  onCreateChildNode: (nodeId: string) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onToggleFavorite: (nodeId: string) => void;
}

type KnowledgeGraphNodeModel = Node<KnowledgeGraphNodeData, "knowledgeNode">;

export function KnowledgeGraphNode({ data }: NodeProps<KnowledgeGraphNodeModel>) {
  const status = getStatusPresentation(data.status);
  const Icon = data.isRoot ? Sprout : data.status === "summarized" ? FileText : GitBranch;
  const displayCount = getDisplayCount(data.label, data.childCount, data.isRoot);

  return (
    <div
      className={[
        "relative w-[252px] rounded-[18px] bg-white px-5 py-4 text-sm text-[#333333] transition-colors duration-300",
        "dark:bg-[#111820]/95 dark:text-[#e7eee9]",
        data.isActive
          ? "border-2 border-[#111111] shadow-[0_22px_55px_rgba(0,0,0,0.16)] dark:border-[#65bd7d] dark:shadow-[0_22px_60px_rgba(0,0,0,0.4)]"
          : "border border-[#d8d8d8] shadow-[0_14px_36px_rgba(0,0,0,0.09)] dark:border-[#303a44] dark:shadow-[0_18px_46px_rgba(0,0,0,0.34)]",
      ].join(" ")}
    >
      <Handle className="opacity-0" position={Position.Left} type="target" />

      <button
        aria-label={data.isFavorite ? "取消收藏节点" : "收藏节点"}
        aria-pressed={data.isFavorite}
        className={[
          "nodrag nopan absolute right-3 top-3 grid size-8 place-items-center rounded-full transition",
          data.isFavorite
            ? "bg-[#111111] text-white hover:bg-[#2a2a2a] dark:bg-[#3a2d17] dark:text-[#f1bd54] dark:hover:bg-[#4c3a1b]"
            : "text-[#777777] hover:bg-[#eeeeee] hover:text-[#111111] dark:text-[#96a39c] dark:hover:bg-[#1d2630] dark:hover:text-[#e7b85d]",
        ].join(" ")}
        onClick={(event) => {
          event.stopPropagation();
          data.onToggleFavorite(data.nodeId);
        }}
        title={data.isFavorite ? "取消收藏" : "收藏"}
        type="button"
      >
        <Star fill={data.isFavorite ? "currentColor" : "none"} size={18} strokeWidth={1.9} />
      </button>

      <div className="mb-3 flex items-start">
        <div className="flex min-w-0 items-center gap-3 pr-8">
          <span className={["grid size-8 shrink-0 place-items-center rounded-xl", status.iconClass].join(" ")}>
            <Icon size={18} />
          </span>
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-[#151b18] dark:text-[#f4f7f5]">
            {data.label}
          </h3>
        </div>
      </div>

      <p className="min-h-[48px] text-[14px] leading-6 text-[#666666] dark:text-[#aab5af]">
        {data.description}
      </p>

      <div className="mt-5 flex items-center justify-between text-[13px] font-medium text-[#606060] dark:text-[#b9c4be]">
        <span className="inline-flex items-center gap-2">
          {data.isRoot ? <FileText size={15} /> : <GitBranch size={15} className="text-[#555555]" />}
          {data.isRoot ? displayCount : "子节点"} {data.isRoot ? "" : displayCount}
        </span>
        {data.isRoot ? <MoreHorizontal size={18} className="text-[#1e2723] dark:text-[#eef3ef]" /> : null}
      </div>

      {data.isActive ? (
        <div className="absolute -bottom-3 -right-3 flex items-center gap-2">
          <button
            aria-label="删除节点"
            className="nodrag nopan grid size-10 place-items-center rounded-full border-2 border-white bg-[#f2f2f2] text-[#111111] shadow-[0_12px_24px_rgba(0,0,0,0.16)] transition hover:bg-[#e6e6e6] dark:border-[#111820] dark:bg-[#3a2020] dark:text-[#ff9984] dark:shadow-[0_14px_28px_rgba(0,0,0,0.36)] dark:hover:bg-[#4b2929]"
            onClick={(event) => {
              event.stopPropagation();
              void data.onDeleteNode(data.nodeId);
            }}
            title="删除节点"
            type="button"
          >
            <Minus size={20} strokeWidth={2.4} />
          </button>
          <button
            aria-label="添加子节点"
            className="nodrag nopan grid size-10 place-items-center rounded-full border-2 border-white bg-[#111111] text-white shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition hover:bg-[#2a2a2a] dark:border-[#111820] dark:bg-[#3f8457] dark:shadow-[0_14px_28px_rgba(0,0,0,0.36)] dark:hover:bg-[#4c9965]"
            onClick={(event) => {
              event.stopPropagation();
              void data.onCreateChildNode(data.nodeId);
            }}
            title="添加子节点"
            type="button"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>
        </div>
      ) : null}

      <Handle className="opacity-0" position={Position.Right} type="source" />
    </div>
  );
}

function getDisplayCount(label: string, childCount: number, isRoot: boolean) {
  const screenshotCounts: Record<string, number> = {
    "Arbor 最小可行产品": 3,
    上下文引擎: 4,
    讨论分支: 6,
    动态总结: 2,
  };

  return screenshotCounts[label] ?? (isRoot ? childCount + 1 : childCount);
}

function getStatusPresentation(status: KnowledgeNodeStatus) {
  if (status === "summarized") {
    return {
      iconClass: "bg-[#eeeeee] text-[#222222] dark:bg-[#1d3326] dark:text-[#8bd39c]",
    };
  }

  if (status === "exploring") {
    return {
      iconClass: "bg-[#f0f0f0] text-[#333333] dark:bg-[#1d3326] dark:text-[#9bd1a4]",
    };
  }

  return {
    iconClass: "bg-[#eeeeee] text-[#555555] dark:bg-[#342816] dark:text-[#f0b84f]",
  };
}
