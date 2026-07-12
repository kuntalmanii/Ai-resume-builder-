import type {
  User,
  CareerProfile,
  ClientAISuggestion,
  AnalysisResult,
  ClientKeywordMatch,
  SkillGap,
  ExperienceGap,
} from "@/types";

// ─── 1. Mock User ────────────────────────────────────────────────────────────
export const mockUser: User = {
  id: "user-12345",
  email: "manish@example.com",
  full_name: "Manish Kuntal",
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── 2. Mock Resumes List ─────────────────────────────────────────────────────
export interface MockResumeListItem {
  id: string;
  title: string;
  updatedAt: string;
  score: number;
  templateId: string;
}

export const mockResumesList: MockResumeListItem[] = [
  {
    id: "resume-1",
    title: "Product Manager 2024",
    updatedAt: "2 hours ago",
    score: 78,
    templateId: "modern",
  },
  {
    id: "resume-2",
    title: "Software Engineer Lead",
    updatedAt: "1 day ago",
    score: 92,
    templateId: "classic",
  },
];

// ─── 3. Mock Career Profile ──────────────────────────────────────────────────
export const mockCareerProfile: CareerProfile = {
  id: "profile-123",
  user_id: "user-12345",
  education: [
    {
      institution: "Indian Institute of Technology",
      degree: "B.Tech in Computer Science",
      field_of_study: "Computer Engineering",
      start_date: "2018-07",
      end_date: "2022-05",
      gpa: "8.8/10",
      description: "Focused on Software Systems and Machine Learning",
      is_current: false,
    },
  ],
  experience: [
    {
      company: "Innovate Tech Ltd",
      title: "Senior Software Engineer",
      location: "Bangalore, India",
      start_date: "2022-06",
      end_date: "Present",
      is_current: true,
      description: "Leading frontend team to build modern SaaS platforms",
      bullet_points: [
        "Architected responsive Next.js web application reducing bundle sizes by 32%",
        "Designed real-time tracking interface using WebSockets, optimizing render speeds by 15%",
        "Mentored 4 junior engineers in building clean, type-safe components",
      ],
    },
  ],
  projects: [
    {
      name: "Portfolio Builder SaaS",
      description: "A drag and drop visual page editor built with React and Tailwind CSS",
      technologies: ["React", "TypeScript", "Tailwind CSS", "Zustand"],
      url: "https://portfoliobuilder.dev",
      github_url: "https://github.com/manish/portfolio-builder",
      start_date: "2023-01",
      end_date: "2023-06",
    },
  ],
  skills: {
    technical: ["React", "Next.js", "TypeScript", "JavaScript", "HTML/CSS", "GraphQL"],
    soft: ["Team Leadership", "Cross-Functional Collaboration", "Problem Solving"],
    tools: ["Git", "Figma", "Docker", "VS Code", "Webpack"],
    languages_prog: ["Python", "Rust", "TypeScript", "Go"],
  },
  certifications: [
    {
      name: "AWS Certified Developer - Associate",
      issuer: "Amazon Web Services",
      issue_date: "2023-08",
      expiry_date: "2026-08",
      credential_id: "AWS-12345",
      url: "https://aws.amazon.com",
    },
  ],
  achievements: [
    {
      title: "Best Developer Award Q4",
      description: "Awarded for exceptional leadership in delivery of visual editor suite",
      date: "2023-12",
      issuer: "Innovate Tech Ltd",
    },
  ],
  positions_of_responsibility: [
    {
      role: "Club Lead",
      organization: "Tech Innovators Student Chapter",
      start_date: "2020-08",
      end_date: "2021-08",
      description: "Organized national-level hackathons with over 500+ student attendees",
    },
  ],
  languages: [
    { language: "English", proficiency: "Professional" },
    { language: "Hindi", proficiency: "Native" },
  ],
  interests: ["Generative AI", "Hiking", "UI/UX Design"],
  updated_at: new Date().toISOString(),
};

// ─── 4. Mock ATS Analysis Results ─────────────────────────────────────────────
export const mockAnalysisResult: AnalysisResult = {
  overallScore: 78,
  categories: [
    {
      id: "ats",
      title: "ATS Compatibility",
      score: 16,
      maxScore: 20,
      passedChecks: 4,
      warnings: 1,
      failedChecks: 1,
      pointDeductions: [
        { reason: "Multi-column layout found", points: 4 },
      ],
      recommendations: [
        {
          id: "rec-ats-1",
          category: "ATS Compatibility",
          title: "Avoid Multi-Column Layouts",
          description: "Many older ATS parsers read columns left-to-right across the page, jumbling your content.",
          impact: "high",
          actionableText: "Reformat your resume into a single-column layout.",
        },
      ],
    },
    {
      id: "content",
      title: "Content Strength",
      score: 15,
      maxScore: 20,
      passedChecks: 8,
      warnings: 2,
      failedChecks: 0,
      pointDeductions: [
        { reason: "Weak action verbs in summary", points: 3 },
        { reason: "Missing measurable outcomes in Q4", points: 2 },
      ],
      recommendations: [
        {
          id: "rec-content-1",
          category: "Content Strength",
          title: "Use Strong Action Verbs",
          description: "Avoid verbs like 'assisted' or 'worked on'. Use active verbs.",
          impact: "medium",
          actionableText: "Replace 'Worked on frontend development' with 'Designed and deployed responsive frontend components'.",
        },
      ],
    },
    {
      id: "jd",
      title: "Job Description Match",
      score: 18,
      maxScore: 25,
      passedChecks: 12,
      warnings: 3,
      failedChecks: 2,
      pointDeductions: [
        { reason: "Missing 5 core keywords", points: 5 },
        { reason: "Experience gap of 2 years", points: 2 },
      ],
      recommendations: [
        {
          id: "rec-jd-1",
          category: "Job Description Match",
          title: "Include Missing Target Keywords",
          description: "Important skills from the JD are completely missing from your resume.",
          impact: "high",
          actionableText: "Add 'Next.js', 'Redux', and 'REST APIs' into your skills list.",
        },
      ],
    },
    {
      id: "completeness",
      title: "Completeness",
      score: 10,
      maxScore: 10,
      passedChecks: 5,
      warnings: 0,
      failedChecks: 0,
      pointDeductions: [],
      recommendations: [],
    },
    {
      id: "readability",
      title: "Readability",
      score: 8,
      maxScore: 10,
      passedChecks: 6,
      warnings: 1,
      failedChecks: 0,
      pointDeductions: [
        { reason: "Large text block without bullets", points: 2 },
      ],
      recommendations: [
        {
          id: "rec-read-1",
          category: "Readability",
          title: "Break up Large Text Blocks",
          description: "Dense text blocks are difficult for recruiters to scan quickly.",
          impact: "low",
          actionableText: "Reformat your professional summary into 3 bullet points.",
        },
      ],
    },
    {
      id: "grammar",
      title: "Grammar & Spelling",
      score: 5,
      maxScore: 5,
      passedChecks: 10,
      warnings: 0,
      failedChecks: 0,
      pointDeductions: [],
      recommendations: [],
    },
    {
      id: "credibility",
      title: "Evidence & Credibility",
      score: 6,
      maxScore: 10,
      passedChecks: 3,
      warnings: 1,
      failedChecks: 1,
      pointDeductions: [
        { reason: "Unverified performance metrics", points: 4 },
      ],
      recommendations: [
        {
          id: "rec-cred-1",
          category: "Evidence Mode",
          title: "Provide Evidence for Performance Claims",
          description: "You claimed to 'increase performance by 40%', but this statistic is not corroborated in your verified Career Profile.",
          impact: "high",
          actionableText: "Add the 40% performance milestone to your profile or verify the claim details.",
        },
      ],
    },
  ],
};

// ─── 5. Mock Job Description Matches ──────────────────────────────────────────
export const mockKeywordMatches: ClientKeywordMatch[] = [
  {
    keyword: "React",
    matchType: "exact_match",
    foundInResume: true,
    alternativeTerms: ["React.js", "ReactJS"],
    contextSentence: "Architected responsive Next.js web application using React.",
  },
  {
    keyword: "REST APIs",
    matchType: "semantic_match",
    foundInResume: true,
    alternativeTerms: ["API integration", "RESTful services"],
    contextSentence: "Integrated REST APIs for dynamic data rendering.",
  },
  {
    keyword: "Next.js",
    matchType: "missing",
    foundInResume: false,
    alternativeTerms: ["NextJS", "Next server actions"],
  },
  {
    keyword: "Docker",
    matchType: "optional",
    foundInResume: false,
    alternativeTerms: ["Docker containers", "Docker Compose"],
  },
];

export const mockSkillGaps: SkillGap[] = [
  {
    skill: "Redux / Zustand",
    importance: "required",
    recommendation: "Add experience using frontend state managers inside your Projects or Skills list.",
  },
  {
    skill: "CI/CD Pipelines",
    importance: "preferred",
    recommendation: "Mention deployment processes (GitHub Actions, Jenkins) inside your work history.",
  },
];

export const mockExperienceGaps: ExperienceGap[] = [
  {
    requirement: "Lead or Senior role experience (5+ years)",
    details: "Your resume shows 2 years of Senior developer work, leading to a gap in senior experience.",
    gapYears: 3,
  },
];

// ─── 6. Mock AI Suggestion List (Evidence Mode) ──────────────────────────────
export const mockAISuggestions: ClientAISuggestion[] = [
  {
    id: "sug-1",
    originalContent: "Worked on frontend development.",
    suggestedContent: "Developed responsive React interfaces and integrated REST APIs for dynamic data rendering.",
    confidence: 94,
    verificationStatus: "verified",
    unverifiedClaims: [],
    status: "pending",
    evidenceSources: [
      {
        id: "ev-1",
        label: "React experience",
        sourceType: "resume",
        sourceReference: "Innovate Tech Ltd — Bullet 1",
        verified: true,
      },
      {
        id: "ev-2",
        label: "REST APIs experience",
        sourceType: "profile",
        sourceReference: "Smart Profile — Tech Skills list",
        verified: true,
      },
    ],
  },
  {
    id: "sug-2",
    originalContent: "Led software developer tasks.",
    suggestedContent: "Spearheaded frontend visual editor modules, reducing render cycles by 40% and boosting conversions.",
    confidence: 68,
    verificationStatus: "unverified",
    unverifiedClaims: ["reducing render cycles by 40%", "boosting conversions"],
    status: "pending",
    evidenceSources: [
      {
        id: "ev-3",
        label: "Visual editor task",
        sourceType: "resume",
        sourceReference: "Innovate Tech Ltd — Bullet 1",
        verified: true,
      },
      {
        id: "ev-4",
        label: "40% performance / conversion gains",
        sourceType: "inference",
        verified: false,
      },
    ],
  },
];

// ─── 7. Mock Templates ────────────────────────────────────────────────────────
export interface MockTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  category: "classic" | "modern" | "minimal";
}

export const mockTemplates: MockTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional times-new-roman format preferred by corporate recruiters.",
    category: "classic",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sleek sans-serif typography with clean dividers for startups and tech roles.",
    category: "modern",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "A compact layout focusing entirely on typography and white-space density.",
    category: "minimal",
  },
];
