import type { KnowledgeRepository } from "@/domain/knowledge/repositories";
import { MockKnowledgeRepository } from "@/infrastructure/repositories/mockKnowledgeRepository";
import { HttpKnowledgeRepository } from "@/infrastructure/repositories/httpKnowledgeRepository";

export function createKnowledgeRepository(): KnowledgeRepository {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl) {
    return new HttpKnowledgeRepository(apiBaseUrl.replace(/\/$/, ""));
  }

  return new MockKnowledgeRepository();
}
