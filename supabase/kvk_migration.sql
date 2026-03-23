-- KVK Migration: run this in your Supabase SQL editor

-- KVK companies table
CREATE TABLE IF NOT EXISTS kvk_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  kvk_number text UNIQUE,
  name text,
  city text,
  province text,
  postal_code text,
  street text,
  legal_form text,
  registration_date date,
  sbi_codes text[],
  website text,
  status text DEFAULT 'new',
  -- AI fields
  ai_score int,
  ai_tier text,
  ai_reasoning text,
  ai_key_selling_point text,
  ai_best_pitch text,
  ai_best_flow text,
  ai_monthly_cost_est text,
  ai_company_size text,
  -- Email fields
  contact_email text,
  email_confidence text,
  draft_subject text,
  draft_email text,
  email_sent_at timestamptz,
  sent_from_email text,
  rejected_at timestamptz,
  qualified_at timestamptz,
  -- Timestamps
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kvk_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_kvk_companies" ON kvk_companies
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- KVK search queries table
CREATE TABLE IF NOT EXISTS kvk_search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  label text NOT NULL,
  sector text DEFAULT 'all',
  sbi_codes text[] DEFAULT ARRAY['47910','47919','49410','52101','52109','52291','52299','82920'],
  company_size_min int DEFAULT 10,
  company_size_max int DEFAULT 250,
  legal_form text DEFAULT 'BV',
  province text DEFAULT 'all',
  max_age_years int DEFAULT 10,
  results_per_page int DEFAULT 10,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kvk_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_kvk_search_queries" ON kvk_search_queries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
