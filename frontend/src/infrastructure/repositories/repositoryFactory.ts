import type { KnowledgeRepository } from "@/domain/knowledge/repositories";
import { HttpKnowledgeRepository } from "@/infrastructure/repositories/httpKnowledgeRepository";

export function createKnowledgeRepository(): KnowledgeRepository {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081").trim();
  return new HttpKnowledgeRepository(apiBaseUrl.replace(/\/$/, ""));
}
