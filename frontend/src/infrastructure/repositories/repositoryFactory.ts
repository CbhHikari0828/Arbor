import type { KnowledgeRepository } from "@/domain/knowledge/repositories";
import { MockKnowledgeRepository } from "@/infrastructure/repositories/mockKnowledgeRepository";

export function createKnowledgeRepository(): KnowledgeRepository {
  return new MockKnowledgeRepository();
}
