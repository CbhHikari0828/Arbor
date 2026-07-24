import type {
  DiscussionBranch,
  KnowledgeGraphEdge,
  KnowledgeNode,
  KnowledgeSummary,
} from "@/domain/knowledge/types";

export interface CreateRootKnowledgeNodeInput {
  title: string;
}

export interface CreateRootKnowledgeNodeResult {
  node: KnowledgeNode;
  branch: DiscussionBranch;
}

export interface CreateChildKnowledgeNodeInput {
  parentId: string;
  title?: string;
}

export interface CreateChildKnowledgeNodeResult {
  node: KnowledgeNode;
  branch: DiscussionBranch;
  edge: KnowledgeGraphEdge;
}

export interface DeleteKnowledgeNodeInput {
  nodeId: string;
}

export interface DeleteKnowledgeNodeResult {
  deletedNodeIds: string[];
}

export interface KnowledgeRepository {
  listNodes(): Promise<KnowledgeNode[]>;
  listEdges(): Promise<KnowledgeGraphEdge[]>;
  listBranches(): Promise<DiscussionBranch[]>;
  listSummaries(): Promise<KnowledgeSummary[]>;
  createRootNode(input: CreateRootKnowledgeNodeInput): Promise<CreateRootKnowledgeNodeResult>;
  createChildNode(input: CreateChildKnowledgeNodeInput): Promise<CreateChildKnowledgeNodeResult>;
  deleteNode(input: DeleteKnowledgeNodeInput): Promise<DeleteKnowledgeNodeResult>;
}
