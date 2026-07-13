/**
 * Shared TypeScript types for CareerOS AI.
 * All types mirror the backend Pydantic schemas.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
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
  sourceType: "resume" | "profile" | "inference";
  sourceReference?: string;
  verified: boolean;
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

