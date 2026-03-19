import { NextResponse } from "next/server";

const WEBSHARE_API = "https://proxy.webshare.io/api/v2";

export async function GET() {
  const apiKey = process.env.WEBSHARE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WEBSHARE_API_KEY not configured" }, { status: 503 });
  }

  const headers = { Authorization: `Token ${apiKey}` };

  try {
    // 1. Get subscription (period dates + plan id)
    const subRes = await fetch(`${WEBSHARE_API}/subscription/`, { headers });
    if (!subRes.ok) {
      return NextResponse.json({ error: `Webshare API error: ${subRes.status}` }, { status: 502 });
    }
    const sub = await subRes.json();
    const startDate: string = sub.start_date;
    const endDate: string = sub.end_date;
    const planId: string | number = sub.plan;

    // 2. Get bandwidth limit from plan
    const planRes = await fetch(`${WEBSHARE_API}/subscription/plan/${planId}/`, { headers });
    const plan = planRes.ok ? await planRes.json() : null;
    // bandwidth_limit is in GB (0 = unlimited)
    const limitGb: number = plan?.bandwidth_limit ?? 0;
    const limitMb = limitGb > 0 ? Math.round(limitGb * 1024) : null;

    // 3. Get bandwidth used in current period
    const now = new Date().toISOString();
    const statsRes = await fetch(
      `${WEBSHARE_API}/stats/aggregate/?timestamp__gte=${startDate}&timestamp__lte=${now}`,
      { headers }
    );
    const stats = statsRes.ok ? await statsRes.json() : null;
    // bandwidth_total is in bytes
    const usedBytes: number = stats?.bandwidth_total ?? 0;
    const usedMb = Math.round(usedBytes / (1024 * 1024));

    const remainingMb = limitMb != null ? Math.max(0, limitMb - usedMb) : null;
    const usagePercent = limitMb != null && limitMb > 0 ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : null;

    return NextResponse.json({
      used_mb: usedMb,
      limit_mb: limitMb,
      remaining_mb: remainingMb,
      usage_percent: usagePercent,
      reset_date: endDate,
      start_date: startDate,
      unlimited: limitGb === 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
