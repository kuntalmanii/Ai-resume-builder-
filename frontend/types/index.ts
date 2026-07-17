/**
 * Shared TypeScript types for CareerOS AI.
 * All types mirror the backend Pydantic schemas.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

// ─── Career Profile ───────────────────────────────────────────────────────────

export interface EducationEntry {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  gpa: string;
  description: string;
  is_current: boolean;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  bullet_points: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies: string[];
  url: string;
  github_url: string;
  start_date: string;
  end_date: string;
}

export interface SkillsMap {
  technical: string[];
  soft: string[];
  tools: string[];
  languages_prog: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_id: string;
  url: string;
}

export interface AchievementEntry {
  title: string;
  description: string;
  date: string;
  issuer: string;
}

export interface PositionEntry {
  role: string;
  organization: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: string;
}

export interface CareerEntry {
  id: string;
  user_id: string;
  entry_type:
    | "education"
    | "work_experience"
    | "internship"
    | "project"
    | "technical_skill"
    | "soft_skill"
    | "certification"
    | "achievement"
    | "position_of_responsibility"
    | "language"
    | "interest";
  title: string;
  organization: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  data: Record<string, any>;
  verification_status: "unverified" | "user_confirmed" | "source_verified";
  source_type: "manual" | "resume_import" | "previous_resume" | "github" | "external_source";
  created_at: string;
  updated_at: string;
}

export interface CareerProfile {
  id: string;
  user_id: string;
  phone?: string | null;
  location?: string | null;
  professional_title?: string | null;
  professional_summary?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillsMap;
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  positions_of_responsibility: PositionEntry[];
  languages: LanguageEntry[];
  interests: string[];
  updated_at: string;
}

// ─── Resume ───────────────────────────────────────────────────────────────────

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  content: ResumeContent;
  raw_text: string | null;
  file_path: string | null;
  original_filename: string | null;
  version: number;
  is_base: boolean;
  is_primary: boolean;
  latest_score?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SkillGroup {
  id?: string;
  category: string;
  skills: string[];
  order?: number;
}

export interface ResumeContent {
  personal_information?: PersonalInfo;
  professional_summary?: string;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: SkillGroup[];
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  achievements?: AchievementEntry[];
  positions_of_responsibility?: PositionEntry[];
  languages?: LanguageEntry[];
  interests?: string[];
  section_order?: string[];
}

export interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  professional_title?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export type EvidenceSource = 'resume' | 'profile' | 'jd' | 'ai_inference';
export type UserDecision = 'pending' | 'accepted' | 'edited' | 'rejected';

export interface AISuggestion {
  id: string;
  suggestion: string;
  evidence_source: EvidenceSource;
  confidence: number;
  reasoning: string;
  is_fabricated: boolean;
  user_decision: UserDecision;
  original_text?: string;
  category: string;
}

export interface ScoreBreakdown {
  ats_compatibility: number;
  content_strength: number;
  jd_match: number;
  completeness: number;
  readability: number;
  grammar: number;
  evidence_credibility: number;
}

export interface ATSCheck {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  points_affected: number;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  related_terms: string[];
  importance: 'required' | 'preferred' | 'optional';
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  user_id: string;
  job_description: string | null;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  ats_report: {
    checks: ATSCheck[];
    summary: string;
  };
  jd_match_report: {
    match_percentage: number;
    matched_keywords: KeywordMatch[];
    missing_keywords: KeywordMatch[];
    skill_gaps: string[];
    experience_gaps: string[];
  };
  ai_suggestions: AISuggestion[];
  created_at: string;
}

// ─── API Errors ───────────────────────────────────────────────────────────────

export interface APIError {
  detail: string | { msg: string; type: string }[];
}

// ─── Client Evidence & Suggestions ───────────────────────────────────────────

export type VerificationStatus = "verified" | "partially_verified" | "unverified";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "edited";

export interface ClientEvidenceSource {
  id: string;
  label: string;
  sourceType: "resume" | "profile" | "inference" | "career_profile" | "resume_content" | "career_profile_user_confirmed" | "clarifying_question";
  sourceReference?: string;
  verified: boolean;
  support_kind?: string;
  evidence_strength?: string;
  verification_status?: string;
  
  // Backend direct fields
  source_type?: string;
  source_id?: string;
  source_section?: string;
  source_entry_id?: string;
  source_field?: string;
  excerpt?: string;
  created_at?: string;
}

export interface ResumeClaim {
  id: string;
  resume_id: string;
  claim_text: string;
  claim_fingerprint: string;
  source_section: string;
  source_entry_id?: string;
  claim_type: string;
  normalized_value: string;
  field_name?: string;
  bullet_index?: number;
  original_text?: string;
  verification_status: "unverified" | "user_confirmed" | "source_verified" | "inferred" | "contradictory";
  contradiction_details?: string;
  evidence_sources: ClientEvidenceSource[];
  created_at: string;
  updated_at: string;
}

export interface EvidenceAudit {
  id: string;
  resume_id: string;
  resume_version: number;
  overall_score: number;
  integrity_score: number;
  timeline_consistency_score: number;
  experience_continuity_score: number;
  metrics_believability_score: number;
  profile_grounding_score: number;
  contradiction_count: number;
  unsupported_count: number;
  status: string;
  ai_fallback_active: boolean;
  summary?: string;
  created_at: string;
}

export interface EvidenceMethodology {
  dimensions: Record<string, { name: string; description: string; weight: number }>;
  trust_multipliers: Record<string, number>;
  severity_levels: Record<string, { deduction: number; description: string }>;
}

export interface EvidenceMapResponse {
  claims: ResumeClaim[];
  evidence_credibility_score: number;
}

export interface ClientAISuggestion {
  id: string;
  originalContent: string;
  suggestedContent: string;
  evidenceSources: ClientEvidenceSource[];
  confidence: number;
  verificationStatus: VerificationStatus;
  unverifiedClaims: string[];
  status: SuggestionStatus;
}

// ─── Scoring Details ─────────────────────────────────────────────────────────

export type CheckStatus = "passed" | "warning" | "failed";

export interface ScoreDeduction {
  reason: string;
  points: number;
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionableText: string;
}

export interface AnalysisCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  points_affected: number;
}

export interface AnalysisCategory {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  passedChecks: number;
  warnings: number;
  failedChecks: number;
  pointDeductions: ScoreDeduction[];
  recommendations: Recommendation[];
}

export interface AnalysisResult {
  overallScore: number;
  categories: AnalysisCategory[];
}

// ─── Real API Analysis Types (Phase 9) ───────────────────────────────────────

/** A single scored check from the backend scoring engine. */
export interface ResumeAnalysisCheckResponse {
  id: string;
  analysis_id: string;
  category: string;       // ats | content | completeness | readability | grammar | evidence
  check_code: string;     // e.g. ATS_CONTACT_INFO
  title: string;
  description: string;
  status: CheckStatus;    // passed | warning | failed
  points_possible: number;
  points_awarded: number;
  points_lost: number;    // convenience: points_possible - points_awarded
  recommendation: string | null;
  evidence_data: Record<string, unknown> | null;
}

/** Prioritized actionable recommendation from a failed/warning check. */
export interface TopRecommendation {
  check_code: string;
  category: string;
  title: string;
  recommendation: string;
  points_possible: number;
  points_lost: number;
  status: "failed" | "warning";
}

/** Per-category score breakdown (0–100 normalized). */
export interface CategoryBreakdown {
  category: string;
  normalized: number;
  raw_score: number;
  max_score: number;
  check_count: number;
  passed_count: number;
  failed_count: number;
  warning_count: number;
}

/** Full analysis result from POST /resumes/{id}/analyses or GET /resumes/{id}/analyses/latest */
export interface ResumeAnalysisResponse {
  id: string;
  resume_id: string;
  user_id: string;
  job_description_id: string | null;

  // Normalized 0–100 scores
  overall_score: number;
  ats_score: number;
  content_score: number;
  jd_match_score: number | null;
  completeness_score: number;
  readability_score: number;
  grammar_score: number;
  evidence_credibility_score: number;

  // Raw scoring metadata
  resume_version: number;
  raw_score: number;
  raw_max_score: number;

  // Stale = resume has been edited since this analysis
  is_stale: boolean;

  // Metadata
  status: string;
  analysis_version: string;
  created_at: string;

  // Expanded details
  checks: ResumeAnalysisCheckResponse[];
  top_recommendations: TopRecommendation[];
  categories: CategoryBreakdown[];
  potential_score_gain: number;
}

/** Lightweight summary for history listing. */
export interface AnalysisSummaryResponse {
  id: string;
  resume_id: string;
  overall_score: number;
  ats_score: number;
  content_score: number;
  analysis_version: string;
  status: string;
  created_at: string;
  is_stale: boolean;
}

/** Paginated analysis history. */
export interface AnalysisHistoryResponse {
  items: AnalysisSummaryResponse[];
  total: number;
  page: number;
  page_size: number;
}

/** Response from POST /resumes/{id}/analyses */
export interface RunAnalysisResponse {
  analysis: ResumeAnalysisResponse;
  from_cache: boolean;
  message: string;
}

/** Public scoring methodology information. */
export interface ScoringMethodologyResponse {
  analysis_version: string;
  raw_max_score: number;
  normalized_max_score: number;
  note_jd_match: string;
  categories: {
    category: string;
    max_points: number;
    max_normalized: number;
    description: string;
    check_count: number;
  }[];
  scoring_description: string;
}

// ─── Keywords Matching ───────────────────────────────────────────────────────

export type KeywordMatchType = "exact_match" | "semantic_match" | "missing" | "optional";

export interface ClientKeywordMatch {
  keyword: string;
  matchType: KeywordMatchType;
  foundInResume: boolean;
  alternativeTerms: string[];
  contextSentence?: string;
}

export interface SkillGap {
  skill: string;
  importance: "required" | "preferred";
  recommendation: string;
}

export interface ExperienceGap {
  requirement: string;
  details: string;
  gapYears: number;
}

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string;
  raw_text: string;
  source_filename?: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface JobMatchResultResponse {
  id: string;
  resume_id: string;
  job_description_id: string;
  resume_version: number;
  matching_version: string;
  overall_match_percentage: number;
  exact_match_score: number;
  semantic_match_score: number;
  skills_score: number;
  required_skills_score: number;
  preferred_skills_score: number;
  experience_score: number;
  keyword_score: number;
  education_certification_score: number;
  exact_keyword_matches: any[];
  semantic_matches: any[];
  missing_keywords: any[];
  skill_gaps: any[];
  experience_gaps: any[];
  hidden_experiences: any[];
  matched_requirements: any[];
  missing_requirements: any[];
  hidden_profile_matches: any[];
  recommendations: string[];
  is_stale: boolean;
  ai_fallback_active: boolean;
  created_at: string;
}

export interface JobMatchMethodologyResponse {
  matching_version: string;
  categories: {
    category: string;
    max_points: number;
    description: string;
  }[];
  scoring_description: string;
}

export interface ExportSettings {
  accent_color: string;
  paper_size: string;
  margin_top: string;
  margin_bottom: string;
  margin_left: string;
  margin_right: string;
  font_scale: number;
  show_page_numbers: boolean;
  ats_mode: boolean;
  section_visibility: Record<string, boolean>;
  section_ordering?: string[];
}

export interface ResumeExport {
  id: string;
  resume_id: string;
  resume_version: number;
  template_id: string;
  settings: Record<string, any>;
  page_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

