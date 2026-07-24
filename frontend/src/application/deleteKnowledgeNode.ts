import type {
  DeleteKnowledgeNodeInput,
  DeleteKnowledgeNodeResult,
  KnowledgeRepository,
} from "@/domain/knowledge/repositories";

export async function deleteKnowledgeNode(
  repository: KnowledgeRepository,
  input: DeleteKnowledgeNodeInput,
): Promise<DeleteKnowledgeNodeResult> {
  const nodeId = input.nodeId.trim();

  if (!nodeId) {
    throw new Error("请选择要删除的节点");
  }

  return repository.deleteNode({ nodeId });
}

