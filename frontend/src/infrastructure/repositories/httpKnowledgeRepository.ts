import type {
  CreateChildKnowledgeNodeInput,
  CreateChildKnowledgeNodeResult,
  CreateRootKnowledgeNodeInput,
  CreateRootKnowledgeNodeResult,
  DeleteKnowledgeNodeInput,
  DeleteKnowledgeNodeResult,
  KnowledgeRepository,
} from "@/domain/knowledge/repositories";
import type { WorkspaceSnapshot } from "@/domain/knowledge/types";

export class HttpKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly apiBaseUrl: string) {}

  async listNodes() {
    return (await this.snapshot()).nodes;
  }

  async listEdges() {
    return (await this.snapshot()).edges;
  }

  async listBranches() {
    return (await this.snapshot()).branches;
  }

  async listSummaries() {
    return (await this.snapshot()).summaries;
  }

  async createRootNode(input: CreateRootKnowledgeNodeInput): Promise<CreateRootKnowledgeNodeResult> {
    return this.request("/api/nodes/root", { method: "POST", body: JSON.stringify(input) });
  }

  async createChildNode(input: CreateChildKnowledgeNodeInput): Promise<CreateChildKnowledgeNodeResult> {
    return this.request(`/api/nodes/${input.parentId}/children`, { method: "POST", body: JSON.stringify(input) });
  }

  async deleteNode(input: DeleteKnowledgeNodeInput): Promise<DeleteKnowledgeNodeResult> {
    return this.request(`/api/nodes/${input.nodeId}`, { method: "DELETE" });
  }

  private snapshot(): Promise<WorkspaceSnapshot> {
    return this.request("/api/workspace/snapshot");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }
}
