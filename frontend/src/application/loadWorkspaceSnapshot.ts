import type { KnowledgeRepository } from "@/domain/knowledge/repositories";
import type { WorkspaceSnapshot } from "@/domain/knowledge/types";

export async function loadWorkspaceSnapshot(
  repository: KnowledgeRepository,
): Promise<WorkspaceSnapshot> {
  const [nodes, edges, branches, summaries] = await Promise.all([
    repository.listNodes(),
    repository.listEdges(),
    repository.listBranches(),
    repository.listSummaries(),
  ]);

  return {
    nodes,
    edges,
    branches,
    summaries,
  };
}
