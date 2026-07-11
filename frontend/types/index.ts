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

export interface CareerProfile {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface ResumeContent {
  personal_info?: PersonalInfo;
  summary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: SkillsMap;
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  achievements?: AchievementEntry[];
  [key: string]: unknown;
}

export interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
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
