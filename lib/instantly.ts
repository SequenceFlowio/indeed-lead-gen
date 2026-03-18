const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v1";

export interface InstantlyLead {
  email: string;
  first_name?: string;
  company_name?: string;
  personalization?: string;
}

export async function addLeadToInstantly(
  campaignId: string,
  lead: InstantlyLead
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY not configured" };
  }

  const res = await fetch(`${INSTANTLY_API_BASE}/lead/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      campaign_id: campaignId,
      skip_if_in_workspace: true,
      leads: [lead],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: text };
  }

  return { success: true };
}

export async function getCampaigns(): Promise<{ id: string; name: string }[]> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(
    `${INSTANTLY_API_BASE}/campaign/list?api_key=${apiKey}&limit=20&skip=0`,
    { method: "GET" }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data ?? [];
}
