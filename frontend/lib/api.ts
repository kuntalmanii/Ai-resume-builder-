/**
 * Typed API client for CareerOS AI backend.
 * All requests go through this module — never fetch directly in components.
 */
import type {
  CareerProfile,
  Resume,
  ResumeContent,
  ResumeAnalysis,
  TokenResponse,
  User,
  RunAnalysisResponse,
  ResumeAnalysisResponse,
  AnalysisHistoryResponse,
  ScoringMethodologyResponse,
  JobMatchResultResponse,
  JobMatchMethodologyResponse,
  JobDescription,
  EvidenceMapResponse,
  EvidenceAudit,
  EvidenceMethodology,
  ResumeClaim,
  ResumeExport,
  ExportSettings,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Token Storage ─────────────────────────────────────────────────────────────
// Stored in memory + localStorage (access token only — short-lived)
// Refresh token is stored in httpOnly cookie set by the server in future sprints.

let _accessToken: string | null = null;

export function setAccessToken(token: string): void {
  _accessToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("careeros_at", token);
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("careeros_at");
  }
  return _accessToken;
}

export function clearTokens(): void {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("careeros_at");
    localStorage.removeItem("careeros_rt");
  }
}

export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("careeros_rt", token);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("careeros_rt");
  }
  return null;
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

import { apiClient, APIError } from "./api/client";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
  formData?: FormData;
}

export { APIError };

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, ...rest } = options;
  return apiClient<T>(path, {
    bodyData: body,
    ...rest,
  });
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: {
    full_name: string;
    email: string;
    password: string;
  }): Promise<User> =>
    request<User>("/auth/register", {
      method: "POST",
      body: data,
      authenticated: false,
    }),

  login: (data: {
    email: string;
    password: string;
  }): Promise<TokenResponse & { refresh_token?: string }> =>
    request<TokenResponse & { refresh_token?: string }>("/auth/login", {
      method: "POST",
      body: data,
      authenticated: false,
    }),

  refresh: (refresh_token: string): Promise<TokenResponse> =>
    request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      authenticated: false,
    }),

  logout: (): Promise<{ message: string }> =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  getMe: (): Promise<User> =>
    request<User>("/auth/me"),

  deleteAccount: (): Promise<{ message: string }> =>
    request<{ message: string }>("/auth/account", { method: "DELETE" }),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersAPI = {
  getMe: (): Promise<User> => request<User>("/users/me"),

  updateMe: (data: { full_name?: string }): Promise<User> =>
    request<User>("/users/me", { method: "PATCH", body: data }),
};

// ─── Profile API ──────────────────────────────────────────────────────────────

export const profileAPI = {
  get: (): Promise<CareerProfile> => request<CareerProfile>("/career-profile"),

  update: (data: Partial<CareerProfile>): Promise<CareerProfile> =>
    request<CareerProfile>("/career-profile", { method: "PATCH", body: data }),
};

// ─── Career Entries API ──────────────────────────────────────────────────────

export interface CareerEntry {
  id: string;
  user_id: string;
  entry_type: string;
  title: string;
  organization: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  data: Record<string, any>;
  verification_status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export const careerEntriesAPI = {
  list: (entryType?: string): Promise<CareerEntry[]> => {
    const query = entryType ? `?entry_type=${encodeURIComponent(entryType)}` : "";
    return request<CareerEntry[]>(`/career-profile/entries${query}`);
  },

  get: (id: string): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}`),

  create: (data: {
    entry_type: string;
    title: string;
    organization: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    data?: Record<string, any>;
    source_type?: string;
  }): Promise<CareerEntry> =>
    request<CareerEntry>("/career-profile/entries", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: {
    title?: string;
    organization?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    data?: Record<string, any>;
  }): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/career-profile/entries/${id}`, {
      method: "DELETE",
    }),

  confirm: (id: string): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}/confirm`, {
      method: "POST",
    }),
};

// ─── Resumes API ──────────────────────────────────────────────────────────────

export interface ResumeVersionResponse {
  id: string;
  resume_id: string;
  version_number: number;
  content_snapshot: ResumeContent;
  change_reason?: string | null;
  created_at: string;
}

export const resumesAPI = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Resume[]> => {
    if (!params) return request<Resume[]>("/resumes");
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    return request<Resume[]>(`/resumes?${searchParams.toString()}`);
  },

  get: (id: string): Promise<Resume> => request<Resume>(`/resumes/${id}`),

  create: (data: {
    title: string;
    template_id?: string;
    content?: ResumeContent;
    raw_text?: string;
    status?: string;
    is_primary?: boolean;
    source_type?: string;
  }): Promise<Resume> =>
    request<Resume>("/resumes", { method: "POST", body: data }),

  patchMetadata: (
    id: string,
    data: {
      title?: string;
      template_id?: string;
      is_primary?: boolean;
      status?: string;
    }
  ): Promise<Resume> =>
    request<Resume>(`/resumes/${id}`, {
      method: "PATCH",
      body: data,
    }),

  updateContent: (
    id: string,
    content: ResumeContent,
    expectedVersion?: number,
    changeReason?: string
  ): Promise<Resume> => {
    const params = new URLSearchParams();
    if (expectedVersion !== undefined) params.append("expected_version", String(expectedVersion));
    if (changeReason) params.append("change_reason", changeReason);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Resume>(`/resumes/${id}/content${query}`, {
      method: "PUT",
      body: content,
    });
  },

  delete: (id: string): Promise<void> =>
    request<void>(`/resumes/${id}`, { method: "DELETE" }),

  duplicate: (id: string): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/duplicate`, { method: "POST" }),

  setPrimary: (id: string): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/primary`, { method: "POST" }),

  listVersions: (id: string): Promise<ResumeVersionResponse[]> =>
    request<ResumeVersionResponse[]>(`/resumes/${id}/versions`),

  restoreVersion: (id: string, versionNumber: number): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/versions/${versionNumber}/restore`, {
      method: "POST",
    }),

  auditClaims: (id: string): Promise<EvidenceMapResponse> =>
    request<EvidenceMapResponse>(`/resumes/${id}/audit`, {
      method: "POST",
    }),

  getClaims: (id: string): Promise<EvidenceMapResponse> =>
    request<EvidenceMapResponse>(`/resumes/${id}/claims`),
};

// ─── Resume Imports API ────────────────────────────────────────────────────────

export interface ResumeImportSessionResponse {
  id: string;
  user_id: string;
  original_filename: string;
  document_type: string;
  status: string;
  extraction_metadata: Record<string, any>;
  parsed_document: ResumeContent;
  parsing_warnings: string[];
  detected_sections: string[];
  missing_sections: string[];
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export const resumeImportsAPI = {
  upload: (file: File): Promise<ResumeImportSessionResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<ResumeImportSessionResponse>("/resume-imports", {
      method: "POST",
      formData,
    });
  },

  get: (id: string): Promise<ResumeImportSessionResponse> =>
    request<ResumeImportSessionResponse>(`/resume-imports/${id}`),

  updateDocument: (id: string, parsedDocument: ResumeContent): Promise<ResumeImportSessionResponse> =>
    request<ResumeImportSessionResponse>(`/resume-imports/${id}/document`, {
      method: "PATCH",
      body: { parsed_document: parsedDocument },
    }),

  finalize: (
    id: string,
    data: {
      title?: string;
      template_id: string;
      import_to_career_profile: boolean;
      selected_entries?: string[];
    }
  ): Promise<Resume> =>
    request<Resume>(`/resume-imports/${id}/finalize`, {
      method: "POST",
      body: data,
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/resume-imports/${id}`, {
      method: "DELETE",
    }),
};

// ─── Job Descriptions API ─────────────────────────────────────────────────────

export const jobDescriptionsAPI = {
  list: (): Promise<JobDescription[]> => request<JobDescription[]>("/job-descriptions"),

  get: (id: string): Promise<JobDescription> => request<JobDescription>(`/job-descriptions/${id}`),

  create: (data: {
    title: string;
    company: string;
    raw_text: string;
    source_filename?: string;
    source_type?: string;
  }): Promise<JobDescription> =>
    request<JobDescription>("/job-descriptions", { method: "POST", body: data }),

  update: (id: string, data: Partial<JobDescription>): Promise<JobDescription> =>
    request<JobDescription>(`/job-descriptions/${id}`, { method: "PUT", body: data }),

  delete: (id: string): Promise<void> =>
    request<void>(`/job-descriptions/${id}`, { method: "DELETE" }),
};

// ─── Job Matches API ─────────────────────────────────────────────────────────

export const jobMatchesAPI = {
  run: (resumeId: string, jobDescriptionId: string, force = false): Promise<JobMatchResultResponse> =>
    request<JobMatchResultResponse>(`/resumes/${resumeId}/matches?force=${force}`, {
      method: "POST",
      body: { job_description_id: jobDescriptionId }
    }),

  getLatest: (resumeId: string, jobDescriptionId?: string): Promise<JobMatchResultResponse> => {
    const query = jobDescriptionId ? `?job_description_id=${jobDescriptionId}` : "";
    return request<JobMatchResultResponse>(`/resumes/${resumeId}/matches/latest${query}`);
  },

  getHistory: (resumeId: string, page = 1, pageSize = 10): Promise<JobMatchResultResponse[]> =>
    request<JobMatchResultResponse[]>(`/resumes/${resumeId}/matches?page=${page}&page_size=${pageSize}`),

  getById: (resumeId: string, matchId: string): Promise<JobMatchResultResponse> =>
    request<JobMatchResultResponse>(`/resumes/${resumeId}/matches/${matchId}`),

  getMethodology: (): Promise<JobMatchMethodologyResponse> =>
    request<JobMatchMethodologyResponse>("/matching/methodology"),
};

// ─── Analyses API ──────────────────────────────────────────────────────────────

export const analysesAPI = {
  /**
   * Run an analysis on a resume.
   * Returns cached result if same resume version + analysis version exists (unless force=true).
   */
  run: (resumeId: string, force = false): Promise<RunAnalysisResponse> =>
    request<RunAnalysisResponse>(`/resumes/${resumeId}/analyses?force=${force}`, {
      method: "POST",
    }),

  /**
   * Get the latest analysis for a resume.
   * Includes `is_stale=true` if the resume has been edited since the analysis.
   * Returns 404 if no analysis exists yet.
   */
  getLatest: (resumeId: string): Promise<ResumeAnalysisResponse> =>
    request<ResumeAnalysisResponse>(`/resumes/${resumeId}/analyses/latest`),

  /**
   * Get paginated analysis history for a resume.
   */
  getHistory: (
    resumeId: string,
    page = 1,
    pageSize = 10
  ): Promise<AnalysisHistoryResponse> =>
    request<AnalysisHistoryResponse>(
      `/resumes/${resumeId}/analyses?page=${page}&page_size=${pageSize}`
    ),

  /**
   * Get a specific analysis by ID (with all checks).
   */
  getById: (resumeId: string, analysisId: string): Promise<ResumeAnalysisResponse> =>
    request<ResumeAnalysisResponse>(`/resumes/${resumeId}/analyses/${analysisId}`),

  /**
   * Get the public scoring methodology (no auth required, cached in browser).
   */
  getMethodology: (): Promise<ScoringMethodologyResponse> =>
    request<ScoringMethodologyResponse>("/scoring/methodology"),
};

// ─── AI Suggestions API ────────────────────────────────────────────────────────

export interface ClaimValidationResult {
  claim_text: string;
  claim_type: string;
  support_status: string;
  supporting_sources: string[];
  risk_level: string;
}

export interface EvidenceSourceResponse {
  id: string;
  label: string;
  source_type: string;
  source_id?: string | null;
  source_section?: string | null;
  source_entry_id?: string | null;
  source_field?: string | null;
  excerpt?: string | null;
  evidence_strength: string;
  support_kind: string;
  verification_status?: string | null;
  created_at: string;
}

export interface SuggestionResponse {
  id: string;
  resume_id: string;
  job_description_id?: string | null;
  analysis_id?: string | null;
  match_result_id?: string | null;
  source_resume_version: number;
  suggestion_type: string;
  target_section: string;
  target_entry_id?: string | null;
  target_field: string;
  target_index?: number | null;
  original_text: string;
  suggested_text: string;
  edited_text?: string | null;
  rationale?: string | null;
  risk_level: string;
  claim_validation: ClaimValidationResult[];
  expected_score_gain?: number | null;
  provider_name?: string | null;
  model_name?: string | null;
  status: string;
  applied_at?: string | null;
  evidence_sources: EvidenceSourceResponse[];
  created_at: string;
  updated_at: string;
}

export interface AIStatusResponse {
  status: string;
  provider_name?: string | null;
  model_name?: string | null;
}

export const suggestionsAPI = {
  getHealth: (): Promise<AIStatusResponse> =>
    request<AIStatusResponse>("/resumes/suggestions/health"),

  list: (resumeId: string, status?: string): Promise<SuggestionResponse[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<SuggestionResponse[]>(`/resumes/${resumeId}/suggestions${query}`);
  },

  generate: (
    resumeId: string,
    data: {
      suggestion_type: string;
      target_section: string;
      target_entry_id?: string | null;
      target_field?: string;
      target_index?: number | null;
      job_description_id?: string | null;
      analysis_id?: string | null;
      match_result_id?: string | null;
      instruction?: string | null;
    }
  ): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions`, {
      method: "POST",
      body: data,
    }),

  batchGenerate: (
    resumeId: string,
    data: {
      mode: string;
      job_description_id?: string | null;
      analysis_id?: string | null;
      match_result_id?: string | null;
      max_suggestions?: number;
    }
  ): Promise<SuggestionResponse[]> =>
    request<SuggestionResponse[]>(`/resumes/${resumeId}/suggestions/batch`, {
      method: "POST",
      body: data,
    }),

  get: (resumeId: string, suggestionId: string): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions/${suggestionId}`),

  accept: (resumeId: string, suggestionId: string): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions/${suggestionId}/accept`, {
      method: "POST",
    }),

  reject: (resumeId: string, suggestionId: string): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions/${suggestionId}/reject`, {
      method: "POST",
    }),

  edit: (
    resumeId: string,
    suggestionId: string,
    suggestedText: string
  ): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions/${suggestionId}`, {
      method: "PUT",
      body: { suggested_text: suggestedText },
    }),

  answerQuestion: (
    resumeId: string,
    suggestionId: string,
    answer: string
  ): Promise<SuggestionResponse> =>
    request<SuggestionResponse>(`/resumes/${resumeId}/suggestions/${suggestionId}/answer`, {
      method: "POST",
      body: { answer },
    }),

  apply: (resumeId: string, suggestionId: string): Promise<Resume> =>
    request<Resume>(`/resumes/${resumeId}/suggestions/${suggestionId}/apply`, {
      method: "POST",
    }),
};

export const evidenceAPI = {
  runAudit: (resumeId: string, force = false): Promise<EvidenceAudit> =>
    request<EvidenceAudit>(`/resumes/${resumeId}/evidence-audits?force=${force}`, {
      method: "POST",
    }),

  getLatestAudit: (resumeId: string): Promise<EvidenceAudit> =>
    request<EvidenceAudit>(`/resumes/${resumeId}/evidence-audits/latest`),

  listAudits: (resumeId: string): Promise<EvidenceAudit[]> =>
    request<EvidenceAudit[]>(`/resumes/${resumeId}/evidence-audits`),

  getAudit: (resumeId: string, auditId: string): Promise<EvidenceAudit> =>
    request<EvidenceAudit>(`/resumes/${resumeId}/evidence-audits/${auditId}`),

  listClaims: (
    resumeId: string,
    filters?: {
      audit_id?: string;
      section?: string;
      claim_type?: string;
      support_status?: string;
      risk_level?: string;
    }
  ): Promise<ResumeClaim[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.audit_id) params.append("audit_id", filters.audit_id);
      if (filters.section) params.append("section", filters.section);
      if (filters.claim_type) params.append("claim_type", filters.claim_type);
      if (filters.support_status) params.append("support_status", filters.support_status);
      if (filters.risk_level) params.append("risk_level", filters.risk_level);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<ResumeClaim[]>(`/resumes/${resumeId}/claims${query}`);
  },

  getClaim: (resumeId: string, claimId: string): Promise<ResumeClaim> =>
    request<ResumeClaim>(`/resumes/${resumeId}/claims/${claimId}`),

  confirmClaim: (resumeId: string, claimId: string): Promise<ResumeClaim> =>
    request<ResumeClaim>(`/resumes/${resumeId}/claims/${claimId}/confirm`, {
      method: "POST",
    }),

  linkCareerEntry: (
    resumeId: string,
    claimId: string,
    careerEntryId: string
  ): Promise<ResumeClaim> =>
    request<ResumeClaim>(`/resumes/${resumeId}/claims/${claimId}/link-career-entry`, {
      method: "POST",
      body: { career_entry_id: careerEntryId },
    }),

  getMethodology: (): Promise<EvidenceMethodology> =>
    request<EvidenceMethodology>("/evidence/methodology"),
};

export const exportsAPI = {
  create: (resumeId: string, templateId: string, settings?: Partial<ExportSettings>, force?: boolean): Promise<ResumeExport> =>
    request<ResumeExport>(`/resumes/${resumeId}/exports`, {
      method: "POST",
      body: {
        template_id: templateId,
        settings,
        force,
      },
    }),

  preview: (resumeId: string, templateId: string, settings?: Partial<ExportSettings>): Promise<any> =>
    request<any>(`/resumes/${resumeId}/exports/preview`, {
      method: "POST",
      body: {
        template_id: templateId,
        settings,
      },
    }),

  list: (resumeId: string): Promise<ResumeExport[]> =>
    request<ResumeExport[]>(`/resumes/${resumeId}/exports`),

  get: (exportId: string): Promise<ResumeExport> =>
    request<ResumeExport>(`/exports/${exportId}`),

  delete: (exportId: string): Promise<{ detail: string }> =>
    request<{ detail: string }>(`/exports/${exportId}`, {
      method: "DELETE",
    }),

  regenerate: (exportId: string): Promise<ResumeExport> =>
    request<ResumeExport>(`/exports/${exportId}/regenerate`, {
      method: "POST",
    }),

  getDownloadUrl: (exportId: string): string => {
    return `${BASE_URL}/exports/${exportId}/download`;
  },
};

// ─── Phase 15 Additions ────────────────────────────────────────────────────────

export const applicationsAPI = {
  list: (status?: string, search?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<any[]>(`/applications${query}`);
  },
  get: (id: string): Promise<any> => request<any>(`/applications/${id}`),
  create: (data: {
    company: string;
    role: string;
    location?: string;
    status: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    recruiter_name?: string;
    recruiter_email?: string;
    notes?: string;
  }): Promise<any> => request<any>("/applications", { method: "POST", body: data }),
  updateStatus: (id: string, status: string): Promise<any> =>
    request<any>(`/applications/${id}/status`, { method: "PATCH", body: { status } }),
  delete: (id: string): Promise<void> => request<void>(`/applications/${id}`, { method: "DELETE" }),
  scheduleInterview: (
    appId: string,
    data: {
      round_type: string;
      scheduled_at: string;
      duration_minutes?: number;
      location?: string;
      format?: string;
      notes?: string;
    }
  ): Promise<any> => request<any>(`/applications/${appId}/interviews`, { method: "POST", body: data }),
  listInterviews: (appId: string): Promise<any[]> => request<any[]>(`/applications/${appId}/interviews`),
  deleteInterview: (appId: string, interviewId: string): Promise<void> =>
    request<void>(`/applications/${appId}/interviews/${interviewId}`, { method: "DELETE" }),
};

export const coverLettersAPI = {
  generate: (data: {
    resume_id: string;
    job_description_text?: string;
    job_description_id?: string;
    style_preference?: string;
  }): Promise<{ content: string; metadata: any }> =>
    request<{ content: string; metadata: any }>("/cover-letters/generate", { method: "POST", body: data }),
  create: (data: {
    resume_id: string;
    title: string;
    content: string;
    job_description_id?: string;
  }): Promise<any> => request<any>("/cover-letters", { method: "POST", body: data }),
  list: (): Promise<any[]> => request<any[]>("/cover-letters"),
  get: (id: string): Promise<any> => request<any>(`/cover-letters/${id}`),
  update: (id: string, content: string, title?: string): Promise<any> =>
    request<any>(`/cover-letters/${id}`, { method: "PUT", body: { content, title } }),
  incrementVersion: (id: string, content: string, title?: string): Promise<any> =>
    request<any>(`/cover-letters/${id}/versions`, { method: "POST", body: { content, title } }),
  listVersions: (id: string): Promise<any[]> => request<any[]>(`/cover-letters/${id}/versions`),
  delete: (id: string): Promise<void> => request<void>(`/cover-letters/${id}`, { method: "DELETE" }),
  exportPdf: (id: string): Promise<{ export_path: string }> =>
    request<{ export_path: string }>(`/cover-letters/${id}/export`, { method: "POST" }),
};

export const linkedinAPI = {
  optimize: (data: {
    resume_id: string;
    target_role?: string;
    linkedin_url?: string;
    raw_profile_text?: string;
  }): Promise<any> => request<any>("/linkedin/optimize", { method: "POST", body: data }),
  list: (): Promise<any[]> => request<any[]>("/linkedin"),
};

export const portfolioAPI = {
  getOrCreate: (): Promise<any> => request<any>("/portfolio"),
  update: (data: {
    theme?: string;
    custom_domain?: string;
    is_published?: boolean;
    sections?: any;
    social_links?: any;
  }): Promise<any> => request<any>("/portfolio", { method: "PUT", body: data }),
};

export const interviewsAPI = {
  generate: (data: {
    resume_id: string;
    job_description_id?: string;
  }): Promise<any> => request<any>("/interview-sessions/generate", { method: "POST", body: data }),
  get: (id: string): Promise<any> => request<any>(`/interview-sessions/${id}`),
  list: (): Promise<any[]> => request<any[]>("/interview-sessions"),
  submitAnswer: (
    sessionId: string,
    data: {
      question_id: string;
      user_answer: string;
    }
  ): Promise<any> => request<any>(`/interview-sessions/${sessionId}/practice`, { method: "POST", body: data }),
};

export const roadmapsAPI = {
  generate: (data: {
    target_role: string;
    target_company?: string;
  }): Promise<any> => request<any>("/roadmaps/generate", { method: "POST", body: data }),
  list: (): Promise<any[]> => request<any[]>("/roadmaps"),
  get: (id: string): Promise<any> => request<any>(`/roadmaps/${id}`),
  updateProgress: (id: string, stepIndex: number, isCompleted: boolean): Promise<any> =>
    request<any>(`/roadmaps/${id}/progress`, {
      method: "PATCH",
      body: { step_index: stepIndex, is_completed: isCompleted },
    }),
};

export const analyticsAPI = {
  getSummary: (): Promise<any> => request<any>("/analytics"),
};

export const notificationsAPI = {
  list: (skip = 0, limit = 50): Promise<any[]> => request<any[]>(`/notifications?skip=${skip}&limit=${limit}`),
  unreadCount: (): Promise<number> => request<number>("/notifications/unread-count"),
  markRead: (id: string): Promise<any> => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: (): Promise<number> => request<number>("/notifications/read-all", { method: "PATCH" }),
  delete: (id: string): Promise<void> => request<void>(`/notifications/${id}`, { method: "DELETE" }),
};

export const recruiterAPI = {
  listCandidates: (search?: string, minScore?: number): Promise<any[]> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (minScore !== undefined) params.append("min_score", String(minScore));
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<any[]>(`/recruiter/candidates${query}`);
  },
  getCandidateProfile: (userId: string): Promise<any> => request<any>(`/recruiter/candidates/${userId}`),
  getCandidateAudits: (resumeId: string): Promise<any[]> => request<any[]>(`/recruiter/resumes/${resumeId}/audits`),
};

