export type KnowledgeNodeStatus = "seed" | "exploring" | "summarized";

export interface KnowledgeNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  tags: string[];
  status: KnowledgeNodeStatus;
  position: {
    x: number;
    y: number;
  };
  updatedAt: string;
}

export interface DiscussionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface DiscussionBranch {
  id: string;
  nodeId: string;
  title: string;
  isActive: boolean;
  createdFromMessageId: string | null;
  messages: DiscussionMessage[];
}

export interface KnowledgeSummary {
  id: string;
  nodeId: string;
  thesis: string;
  bullets: string[];
  openQuestions: string[];
  updatedAt: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface WorkspaceSnapshot {
  nodes: KnowledgeNode[];
  edges: KnowledgeGraphEdge[];
  branches: DiscussionBranch[];
  summaries: KnowledgeSummary[];
}
