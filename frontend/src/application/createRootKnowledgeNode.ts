import type {
  CreateRootKnowledgeNodeInput,
  CreateRootKnowledgeNodeResult,
  KnowledgeRepository,
} from "@/domain/knowledge/repositories";

export async function createRootKnowledgeNode(
  repository: KnowledgeRepository,
  input: CreateRootKnowledgeNodeInput,
): Promise<CreateRootKnowledgeNodeResult> {
  const title = input.title.trim();

  if (!title) {
    throw new Error("根节点名称不能为空");
  }

  return repository.createRootNode({ title });
}

