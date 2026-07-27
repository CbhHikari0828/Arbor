import type { KnowledgeRepository } from "@/domain/knowledge/repositories";
import type {
  DiscussionBranch,
  KnowledgeGraphEdge,
  KnowledgeNode,
  KnowledgeSummary,
} from "@/domain/knowledge/types";

const nodes: KnowledgeNode[] = [
  {
    id: "node-root",
    parentId: null,
    title: "Arbor 最小可行产品",
    description: "产品核心目标与最小可行动能集合",
    tags: ["产品", "最小可行产品"],
    status: "summarized",
    position: { x: 0, y: 150 },
    updatedAt: "2026-07-23T10:30:00.000Z",
  },
  {
    id: "node-context",
    parentId: "node-root",
    title: "上下文引擎",
    description: "负责构建当前节点所需的上下文，为 AI 提供精准信息",
    tags: ["AI", "上下文"],
    status: "exploring",
    position: { x: 390, y: 0 },
    updatedAt: "2026-07-23T10:36:00.000Z",
  },
  {
    id: "node-branching",
    parentId: "node-root",
    title: "讨论分支",
    description: "支持从任意历史回答创建新的分支，实现不同思路的并行探索",
    tags: ["讨论", "分支"],
    status: "exploring",
    position: { x: 390, y: 210 },
    updatedAt: "2026-07-23T10:40:00.000Z",
  },
  {
    id: "node-summary",
    parentId: "node-branching",
    title: "动态总结",
    description: "AI 自动总结讨论内容，形成结构化知识沉淀",
    tags: ["总结"],
    status: "seed",
    position: { x: 760, y: 210 },
    updatedAt: "2026-07-23T10:44:00.000Z",
  },
];

const edges: KnowledgeGraphEdge[] = [
  { id: "edge-root-context", source: "node-root", target: "node-context", label: "关联" },
  { id: "edge-root-branching", source: "node-root", target: "node-branching", label: "组织" },
  { id: "edge-branching-summary", source: "node-branching", target: "node-summary", label: "更新" },
];

const summaries: KnowledgeSummary[] = [
  {
    id: "summary-root",
    nodeId: "node-root",
    thesis: "Arbor 应先保存知识结构，再让 AI 持续维护和扩展这些知识。",
    bullets: [
      "知识节点是产品里真正长期保存的对象。",
      "讨论只是探索知识的一种方式，不是最终要沉淀的资产。",
      "分支通过上下文隔离，避免无关讨论互相污染。",
    ],
    openQuestions: [
      "如何创建新的讨论分支？",
      "动态总结是如何工作的？",
      "上下文引擎的主要作用是什么？",
    ],
    updatedAt: "2026-07-23T10:46:00.000Z",
  },
  {
    id: "summary-branching",
    nodeId: "node-branching",
    thesis: "分支机制把线性的聊天过程变成可导航、可回溯的知识探索路径。",
    bullets: [
      "每一次回答都可以成为新的探索起点。",
      "每个分支的上下文在设计上保持隔离。",
      "活跃分支是某个知识节点当前的工作会话。",
    ],
    openQuestions: ["最小可行产品阶段是否只支持手动合并分支？"],
    updatedAt: "2026-07-23T10:48:00.000Z",
  },
];

const branches: DiscussionBranch[] = [
  {
    id: "branch-root",
    nodeId: "node-root",
    title: "产品基础",
    isActive: true,
    createdFromMessageId: null,
    messages: [
      {
        id: "msg-root-1",
        role: "user",
        content: "它和普通人工智能聊天应用的区别是什么？",
        createdAt: "2026-07-23T10:23:00.000Z",
      },
      {
        id: "msg-root-2",
        role: "assistant",
        content:
          "### 核心区别\n\nArbor 保存的是 **知识节点** 和 **节点总结**，聊天只是探索知识的一种方式。\n\n- 普通聊天应用更关注连续对话本身。\n- Arbor 更关注知识的组织、关联、沉淀与演化。\n- 每次讨论都可以反哺当前节点，让内容逐步变成可复用的知识资产。\n\n> 简单说：聊天是过程，知识树才是结果。",
        createdAt: "2026-07-23T10:23:00.000Z",
      },
    ],
  },
  {
    id: "branch-branching",
    nodeId: "node-branching",
    title: "分支模型",
    isActive: true,
    createdFromMessageId: "msg-root-2",
    messages: [
      {
        id: "msg-branch-1",
        role: "user",
        content: "讨论分支应该如何工作？",
        createdAt: "2026-07-23T10:39:00.000Z",
      },
      {
        id: "msg-branch-2",
        role: "assistant",
        content:
          "### 分支工作方式\n\n每个分支都应该保持 **上下文隔离**，并绑定到一个知识节点。\n\n1. 从某条历史回答重新开始。\n2. 只携带相关上下文，避免污染主线。\n3. 分支成熟后，再沉淀回节点总结。\n\n```ts\nbranch.context = collectRelevantMessages(nodeId)\n```\n\n这样可以同时探索多个方向，而不把主讨论搅乱。",
        createdAt: "2026-07-23T10:40:00.000Z",
      },
    ],
  },
];

export class MockKnowledgeRepository implements KnowledgeRepository {
  async listNodes() {
    return structuredClone(nodes);
  }

  async listEdges() {
    return structuredClone(edges);
  }

  async listBranches() {
    return structuredClone(branches);
  }

  async listSummaries() {
    return structuredClone(summaries);
  }

  async createRootNode({ title }: { title: string }) {
    const now = new Date().toISOString();
    const nodeId = createLocalId("node");
    const branchId = createLocalId("branch");

    const node: KnowledgeNode = {
      id: nodeId,
      parentId: null,
      title,
      description: "新建根节点，准备开始一次新的知识探索。",
      tags: ["根节点"],
      status: "seed",
      position: {
        x: 0,
        y: 150,
      },
      updatedAt: now,
    };

    const branch: DiscussionBranch = {
      id: branchId,
      nodeId,
      title: "新建节点对话",
      isActive: true,
      createdFromMessageId: null,
      messages: [],
    };

    nodes.push(node);
    branches.push(branch);

    return {
      node: structuredClone(node),
      branch: structuredClone(branch),
    };
  }

  async createChildNode({ parentId, title = "新节点" }: { parentId: string; title?: string }) {
    const parentNode = nodes.find((node) => node.id === parentId);

    if (!parentNode) {
      throw new Error("父节点不存在");
    }

    const now = new Date().toISOString();
    const nodeId = createLocalId("node");
    const branchId = createLocalId("branch");
    const edgeId = createLocalId("edge");

    const siblingCount = nodes.filter((node) => node.parentId === parentId).length;
    const node: KnowledgeNode = {
      id: nodeId,
      parentId,
      title,
      description: "从父节点延展出的新探索方向。",
      tags: ["子节点"],
      status: "seed",
      position: {
        x: parentNode.position.x + 390,
        y: parentNode.position.y + siblingCount * 170,
      },
      updatedAt: now,
    };

    const edge: KnowledgeGraphEdge = {
      id: edgeId,
      source: parentId,
      target: nodeId,
      label: "延展",
    };

    const branch: DiscussionBranch = {
      id: branchId,
      nodeId,
      title: "新建节点对话",
      isActive: true,
      createdFromMessageId: null,
      messages: [],
    };

    nodes.push(node);
    edges.push(edge);
    branches.push(branch);
    layoutSubtree(findRootNodeId(parentId));

    return {
      node: structuredClone(node),
      branch: structuredClone(branch),
      edge: structuredClone(edge),
    };
  }

  async deleteNode({ nodeId }: { nodeId: string }) {
    const deletedNodeIds = collectNodeAndDescendantIds(nodeId);
    const deletedNodeIdSet = new Set(deletedNodeIds);

    removeWhere(nodes, (node) => deletedNodeIdSet.has(node.id));
    removeWhere(
      edges,
      (edge) => deletedNodeIdSet.has(edge.source) || deletedNodeIdSet.has(edge.target),
    );
    removeWhere(branches, (branch) => deletedNodeIdSet.has(branch.nodeId));
    removeWhere(summaries, (summary) => deletedNodeIdSet.has(summary.nodeId));

    const remainingRootId = nodes.find((node) => node.parentId === null)?.id;

    if (remainingRootId) {
      layoutSubtree(remainingRootId);
    }

    return {
      deletedNodeIds,
    };
  }
}

function createLocalId(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function collectNodeAndDescendantIds(nodeId: string) {
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

function removeWhere<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      items.splice(index, 1);
    }
  }
}

function findRootNodeId(nodeId: string) {
  let currentNode = nodes.find((node) => node.id === nodeId);

  while (currentNode?.parentId) {
    currentNode = nodes.find((node) => node.id === currentNode?.parentId);
  }

  return currentNode?.id ?? nodeId;
}

function layoutSubtree(rootNodeId: string) {
  const subtreeIds = collectNodeAndDescendantIds(rootNodeId);
  const levels = new Map<number, KnowledgeNode[]>();
  const queue: Array<{ node: KnowledgeNode; depth: number }> = [];
  const rootNode = nodes.find((node) => node.id === rootNodeId);

  if (!rootNode) {
    return;
  }

  queue.push({ node: rootNode, depth: 0 });

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const levelNodes = levels.get(current.depth) ?? [];
    levelNodes.push(current.node);
    levels.set(current.depth, levelNodes);

    nodes
      .filter((node) => node.parentId === current.node.id && subtreeIds.includes(node.id))
      .forEach((node) => queue.push({ node, depth: current.depth + 1 }));
  }

  levels.forEach((levelNodes, depth) => {
    const verticalGap = 210;
    const startY = depth === 0 ? 150 : -((levelNodes.length - 1) * verticalGap) / 2;

    levelNodes.forEach((node, index) => {
      node.position = {
        x: depth * 390,
        y: startY + index * verticalGap,
      };
    });
  });
}
