import type {
  CreateChildKnowledgeNodeInput,
  CreateChildKnowledgeNodeResult,
  KnowledgeRepository,
} from "@/domain/knowledge/repositories";

export async function createChildKnowledgeNode(
  repository: KnowledgeRepository,
  input: CreateChildKnowledgeNodeInput,
): Promise<CreateChildKnowledgeNodeResult> {
  const parentId = input.parentId.trim();

  if (!parentId) {
    throw new Error("请选择父节点");
  }

  return repository.createChildNode({
    parentId,
    title: input.title?.trim() || "新节点",
  });
}

