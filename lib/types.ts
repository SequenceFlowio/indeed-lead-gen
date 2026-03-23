export type LeadStatus =
  | "new"
  | "qualified"
  | "email_ready"
  | "sent"
  | "rejected"
  | "bounced_hard"
  | "bounced_soft";

export type LeadTier = "hot" | "warm" | "cold";

export interface Lead {
  id: string;
  job_id: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  url: string | null;
  pub_date: string | null;
  search_label: string | null;
  sequenceflow_flow: string | null;
  sequenceflow_pitch: string | null;
  sequenceflow_angle: string | null;
  // AI qualification
  ai_score: number | null;
  ai_tier: LeadTier | null;
  ai_reasoning: string | null;
  ai_key_selling_point: string | null;
  ai_monthly_cost_est: string | null;
  ai_company_size: string | null;
  ai_best_flow: string | null;
  ai_best_pitch: string | null;
  qualified_at: string | null;
  // Email
  status: LeadStatus;
  draft_subject: string | null;
  draft_email: string | null;
  contact_email: string | null;
  email_confidence: string | null;
  email_sent_at: string | null;
  followup_sent_at: string | null;
  sent_from_email: string | null;
  bounce_type: "hard" | "soft" | null;
  bounced_at: string | null;
  // Metadata
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  id: string;
  query: string;
  location: string;
  label: string | null;
  flow: string | null;
  pitch: string | null;
  angle: string | null;
  active: boolean;
  created_at: string;
}

export interface EmailAccount {
  id: string;
  name: string;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  active: boolean;
  sent_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface Bounce {
  id: string;
  lead_id: string | null;
  email: string;
  bounce_type: "hard" | "soft";
  reason: string | null;
  bounced_at: string;
  // joined
  company?: string | null;
}

export interface DashboardMetrics {
  leadsToday: number;
  qualified: number;
  emailReady: number;
  sent: number;
  bounceRate: number;
}

export interface ScrapeResult {
  scraped: number;
  inserted: number;
  skipped: number;
}

export type KVKStatus =
  | "new"
  | "qualified"
  | "email_ready"
  | "sent"
  | "rejected";

export interface KVKCompany {
  id: string;
  user_id: string | null;
  kvk_number: string | null;
  name: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  street: string | null;
  legal_form: string | null;
  registration_date: string | null;
  sbi_codes: string[] | null;
  website: string | null;
  status: KVKStatus;
  // AI qualification
  ai_score: number | null;
  ai_tier: LeadTier | null;
  ai_reasoning: string | null;
  ai_key_selling_point: string | null;
  ai_best_pitch: string | null;
  ai_best_flow: string | null;
  ai_monthly_cost_est: string | null;
  ai_company_size: string | null;
  // Email
  contact_email: string | null;
  email_confidence: string | null;
  draft_subject: string | null;
  draft_email: string | null;
  email_sent_at: string | null;
  sent_from_email: string | null;
  rejected_at: string | null;
  qualified_at: string | null;
  // Timestamps
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface KVKSearchQuery {
  id: string;
  user_id: string | null;
  label: string;
  sector: string;
  sbi_codes: string[];
  company_size_min: number;
  company_size_max: number;
  legal_form: string;
  province: string;
  max_age_years: number;
  results_per_page: number;
  active: boolean;
  created_at: string;
}
