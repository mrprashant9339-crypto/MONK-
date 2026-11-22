/** Frontend domain contracts. Components depend on these interfaces, not database tables. */
export type ServiceResult<T> = { data: T; error: null } | { data: null; error: ServiceError };
export type ServiceError = { code: string; message: string; retryable: boolean };
export type PageRequest = { cursor?: string; limit?: number; query?: string };
export type PageResult<T> = { items: T[]; nextCursor: string | null };
export type WorkspaceSummary = { id: string; name: string; vertical: "business" | "education" };
export type ProjectSummary = { id: string; name: string; code: string; status: "draft" | "active" | "at_risk" | "completed" };
export type TaskSummary = { id: string; title: string; status: "todo" | "in_progress" | "blocked" | "review" | "done"; priority: "low" | "medium" | "high" | "urgent" };
export type SupportDraft = { subject: string; category: string; email: string; message: string };

export interface AuthService {
  getCurrentUser(): Promise<ServiceResult<{ id: string; email: string } | null>>;
  signIn(email: string, password: string): Promise<ServiceResult<void>>;
  signOut(): Promise<ServiceResult<void>>;
}
export interface WorkspaceService {
  listWorkspaces(): Promise<ServiceResult<WorkspaceSummary[]>>;
  listProjects(workspaceId: string, page?: PageRequest): Promise<ServiceResult<PageResult<ProjectSummary>>>;
  listTasks(workspaceId: string, projectId: string, page?: PageRequest): Promise<ServiceResult<PageResult<TaskSummary>>>;
}
export interface SupportService {
  createTicketDraft(input: SupportDraft): Promise<ServiceResult<{ localId: string; savedLocally: true }>>;
}
export type ServiceMode = "local-preview" | "remote";
