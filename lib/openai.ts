import OpenAI from "openai";
import { Lead } from "@/lib/types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface QualificationResult {
  score: number;
  tier: "hot" | "warm" | "cold";
  best_flow: string;
  best_pitch: string;
  reasoning: string;
  key_selling_point: string;
  estimated_monthly_cost: string;
  company_size_estimate: string;
}

export async function qualifyLead(lead: Lead): Promise<QualificationResult> {
  const systemPrompt = `Je bent een B2B sales qualifier voor SequenceFlow, een Nederlands automatiseringsbedrijf dat MKB-bedrijven helpt met procesautomatisering.

Beoordeel de volgende vacature en geef een kwalificatiescore:

Scoring criteria (1-10):
- Score 7-10 (Hot): MKB-bedrijf, logistiek/ecommerce sector, vacature suggereert repetitieve processen, geen overheid/non-profit
- Score 4-6 (Warm): Mogelijk interessant maar minder duidelijke automatiseningsmogelijkheden
- Score 1-3 (Cold): Overheid, non-profit, groot corporate, of geen automatiserings-fit

SequenceFlow producten:
- Operations Flow: Logistiek, warehouse, voorraadbeheer automatisering
- Lead Flow: B2B lead generation en CRM automatisering
- Support Flow: Klantenservice en ticketing automatisering

Geef ALLEEN een JSON-object terug met deze velden:
{
  "score": <1-10 integer>,
  "tier": <"hot" | "warm" | "cold">,
  "best_flow": <"Operations Flow" | "Lead Flow" | "Support Flow">,
  "best_pitch": <korte pitch in het Nederlands, max 1 zin>,
  "reasoning": <uitleg waarom deze score, max 2 zinnen in het Nederlands>,
  "key_selling_point": <het belangrijkste verkoopargument voor dit bedrijf, max 1 zin>,
  "estimated_monthly_cost": <geschatte maandelijkse besparing in uren, bijv. "40-60 uur/maand">,
  "company_size_estimate": <schatting bedrijfsgrootte, bijv. "10-50 medewerkers">
}`;

  const userPrompt = `Vacaturetitel: ${lead.title}
Bedrijf: ${lead.company}
Locatie: ${lead.location}
Salaris: ${lead.salary ?? "niet vermeld"}
Beschrijving: ${lead.description?.slice(0, 2000) ?? "geen beschrijving"}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  return JSON.parse(content) as QualificationResult;
}

export interface EmailResult {
  subject: string;
  body: string;
}

export async function generateEmail(lead: Lead, fromName?: string, fromEmail?: string): Promise<EmailResult> {
  const senderName = fromName ?? "Noah";
  const senderEmail = fromEmail ?? "noah@getsequenceflow.nl";

  const systemPrompt = `Je bent een senior business advisor bij SequenceFlow die een persoonlijke koude e-mail schrijft naar een bedrijf dat een vacature heeft geplaatst.

REGELS (strikt volgen):
- Schrijf in formeel Nederlands (u/uw, NOOIT jij/je/jouw)
- Geen opsommingstekens of lijsten
- Geen AI-klingende woorden ("Graag", "Zeker", "Absoluut", "Ik hoop dat")
- Maximum 150 woorden voor de body
- 2 alinea's + 1 CTA-zin
- Klink als een adviseur, niet als een verkoper
- Geen specifieke euro-bedragen
- Geen beloftes die je niet kunt waarmaken

STRUCTUUR:
Alinea 1: Observatie van de vacature + concrete berekening van tijdsbesparing (X uur per maand)
Alinea 2: Hoe SequenceFlow dit specifiek kan oplossen + een concreet voorbeeld

CTA: "Zou u open staan voor een kort gesprek om te kijken of dit relevant is voor [bedrijfsnaam]?"

AFZENDER: ${senderEmail} (${senderName})

Geef ALLEEN een JSON-object terug:
{
  "subject": <onderwerpregel in het Nederlands>,
  "body": <e-mailbody, alinea's gescheiden door \\n\\n>
}`;

  const userPrompt = `Vacaturetitel: ${lead.title}
Bedrijf: ${lead.company}
Locatie: ${lead.location}
AI Selling Point: ${lead.ai_key_selling_point ?? "niet bekend"}
Best Flow: ${lead.ai_best_flow ?? "Operations Flow"}
Best Pitch: ${lead.ai_best_pitch ?? "procesautomatisering"}
Beschrijving (fragment): ${lead.description?.slice(0, 1000) ?? "geen beschrijving"}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  return JSON.parse(content) as EmailResult;
}

export interface ContactEmailResult {
  email: string | null;
  confidence: "high" | "medium" | "low" | "none";
  source: string;
}

export async function findContactEmail(
  company: string,
  location: string | null,
  title?: string | null
): Promise<ContactEmailResult> {
  const prompt = `Find the contact email address for this Dutch company. Search their website, LinkedIn, KVK, and Google.

Company name: ${company}
Location: ${location ?? "Nederland"}
Job title they are hiring for: ${title ?? "onbekend"}

Steps:
1. Search Google for "${company} ${location ?? ""} contact email"
2. Visit their website and look for contact/over-ons pages
3. Look for any email address (info@, contact@, direct person email)

Return ONLY a JSON object, no other text:
{"email": "found@email.com or null if not found", "confidence": "high or medium or low or none", "source": "brief description of where you found it"}`;

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" as "web_search" }],
      input: prompt,
    });

    const text = response.output_text ?? "";
    console.log("[findContactEmail] response:", text.slice(0, 300));

    const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("[findContactEmail] no JSON found");
      return { email: null, confidence: "none", source: "Geen JSON in antwoord" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ContactEmailResult;
    if (parsed.email === "null" || parsed.email === "") parsed.email = null;
    return parsed;
  } catch (err) {
    console.error("[findContactEmail] error:", err);
    return { email: null, confidence: "none", source: "Zoekopdracht mislukt" };
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export { isValidEmail };
