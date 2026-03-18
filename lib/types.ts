export type LeadStatus = "new" | "qualified" | "email_ready" | "sent" | "rejected";
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

export interface DashboardMetrics {
  leadsToday: number;
  qualified: number;
  emailReady: number;
  sent: number;
}
