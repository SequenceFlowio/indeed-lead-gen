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

  const systemPrompt = `Je schrijft een korte, persoonlijke koude e-mail namens SequenceFlow. Geen marketing, geen pitch. Klinkt als een echte persoon die iets opmerkt, niet als een bedrijf dat verkoopt.

REGELS (strikt):
- Puur plain text — geen HTML, geen opmaak, geen opsommingstekens
- Maximaal 60-90 woorden, 3-5 zinnen totaal
- Schrijf in het Nederlands met "je/jij/jouw" (NOOIT "u/uw")
- Geen bedrijfsintroductie ("wij zijn...", "SequenceFlow is een...")
- Geen generieke zinnen ("oplossingen op maat", "processen optimaliseren", "efficiëntie verbeteren")
- Geen "Met vriendelijke groet" of andere afsluiting — alleen de naam onderaan
- Begin direct met een observatie over de specifieke vacature (functietitel + bedrijfsnaam)
- Noem ÉÉN concreet pijnpunt dat duidelijk uit de vacature blijkt
- Noem een concreet resultaat, bijv. "scheelt ~15-20 uur per maand"
- Sluit af met een zachte, lage-drempel vraag (bijv. "Zou het de moeite waard zijn om daar even naar te kijken?")
- Klinkt als een snelle, persoonlijke observatie — niet als een mass mail of template

Geef ALLEEN een JSON-object terug:
{
  "subject": <korte persoonlijke onderwerpregel, max 8 woorden, geen "Betreft:">,
  "body": <volledige e-mailtekst, alinea's gescheiden door \\n\\n, eindigend met alleen de naam "${senderName}">
}`;

  const userPrompt = `Vacaturetitel: ${lead.title}
Bedrijf: ${lead.company}
Locatie: ${lead.location}
Concreet pijnpunt: ${lead.ai_key_selling_point ?? "niet bekend"}
Beschrijving (fragment): ${lead.description?.slice(0, 800) ?? "geen beschrijving"}`;

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
  const prompt = `You need to find a real contact email address for a Dutch company. Search thoroughly — try multiple approaches.

Company: ${company}
Location: ${location ?? "Nederland"}
Hiring for: ${title ?? "unknown"}

Search steps (try all of these):
1. Search Google: "${company} ${location ?? ""} email contact"
2. Search Google: "${company} site:linkedin.com"
3. Visit their company website — look at /contact, /over-ons, /contact-us pages for any email
4. Search Google: "${company} ${location ?? ""} @" to find email mentions
5. Check KVK (kvk.nl) for company contact details

Accept any email: info@, contact@, hallo@, a direct person's email — whatever you can find.
Do NOT guess or make up email addresses.

Return ONLY valid JSON, nothing else:
{"email": "found@email.com or null if not found", "confidence": "high or medium or low or none", "source": "where you found it"}`;

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview_2025_03_11" as "web_search_preview_2025_03_11" }],
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

// ---- KVK AI functions ----

export interface KVKCompanyInput {
  name: string | null;
  city: string | null;
  legal_form: string | null;
  registration_date: string | null;
  sbi_codes: string[] | null;
  province: string | null;
}

export interface KVKEnrichmentResult {
  website: string | null;
  services_description: string | null;
  contact_email: string | null;
  email_confidence: "high" | "medium" | "low" | "none";
}

export async function enrichKVKCompany(name: string, city: string | null): Promise<KVKEnrichmentResult> {
  const prompt = `Research this Dutch company and return everything you can find in one search session.

Company: ${name}
City: ${city ?? "Nederland"}

Steps:
1. Search Google: "${name} ${city ?? ""}"
2. Find and visit their website — read the homepage and /diensten, /over-ons, or /contact page
3. Also look for their email address (info@, contact@, or direct person email)

Return ONLY valid JSON:
{
  "website": "https://... or null",
  "services_description": "2-4 sentence summary in Dutch of what this company does, their sector, and scale. Mention specifics like: do they sell online, handle logistics, do warehousing, run a webshop, etc.",
  "contact_email": "found@email.com or null",
  "email_confidence": "high or medium or low or none"
}`;

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview_2025_03_11" as "web_search_preview_2025_03_11" }],
      input: prompt,
    });

    const text = response.output_text ?? "";
    const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { website: null, services_description: null, contact_email: null, email_confidence: "none" };

    const parsed = JSON.parse(jsonMatch[0]) as KVKEnrichmentResult;
    if (parsed.contact_email === "null" || parsed.contact_email === "") parsed.contact_email = null;
    return parsed;
  } catch (err) {
    console.error("[enrichKVKCompany] error:", err);
    return { website: null, services_description: null, contact_email: null, email_confidence: "none" };
  }
}

export async function qualifyKVKCompany(company: KVKCompanyInput, servicesDescription?: string | null): Promise<QualificationResult> {
  const systemPrompt = `Je bent een B2B sales qualifier voor SequenceFlow, een Nederlands automatiseringsbedrijf dat MKB-bedrijven helpt met procesautomatisering.

Beoordeel het volgende bedrijf en geef een kwalificatiescore:

Scoring criteria (1-10):
- Score 7-10 (Hot): MKB-bedrijf (BV/BV*), logistiek/ecommerce/transport/fulfillment, geen overheid/non-profit, recent opgericht (< 5 jaar)
- Score 4-6 (Warm): Mogelijk interessant maar minder duidelijke automatiseringsmogelijkheden
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

  const userPrompt = `Bedrijfsnaam: ${company.name ?? "onbekend"}
Stad: ${company.city ?? "onbekend"}
Provincie: ${company.province ?? "onbekend"}
Rechtsvorm: ${company.legal_form ?? "onbekend"}
Oprichtingsdatum: ${company.registration_date ?? "onbekend"}
${servicesDescription ? `Wat het bedrijf doet (website): ${servicesDescription}` : ""}`;

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

export async function generateKVKEmail(company: KVKCompanyInput & { ai_key_selling_point?: string | null; ai_best_flow?: string | null; ai_best_pitch?: string | null }, fromName?: string, fromEmail?: string): Promise<EmailResult> {
  const senderName = fromName ?? "Noah";

  const systemPrompt = `Je schrijft een korte, persoonlijke koude e-mail namens SequenceFlow. Geen marketing, geen pitch. Klinkt als een echte persoon die iets opmerkt, niet als een bedrijf dat verkoopt.

REGELS (strikt):
- Puur plain text — geen HTML, geen opmaak, geen opsommingstekens
- Maximaal 60-90 woorden, 3-5 zinnen totaal
- Schrijf in het Nederlands met "je/jij/jouw" (NOOIT "u/uw")
- Geen bedrijfsintroductie ("wij zijn...", "SequenceFlow is een...")
- Geen generieke zinnen ("oplossingen op maat", "processen optimaliseren", "efficiëntie verbeteren")
- Geen "Met vriendelijke groet" of andere afsluiting — alleen de naam onderaan
- Begin direct met een observatie over het bedrijf (bedrijfsnaam + branche/type)
- Noem ÉÉN concreet pijnpunt dat bij dit type bedrijf past
- Noem een concreet resultaat, bijv. "scheelt ~15-20 uur per maand"
- Sluit af met een zachte, lage-drempel vraag (bijv. "Zou het de moeite waard zijn om daar even naar te kijken?")
- Klinkt als een snelle, persoonlijke observatie — niet als een mass mail of template

Geef ALLEEN een JSON-object terug:
{
  "subject": <korte persoonlijke onderwerpregel, max 8 woorden, geen "Betreft:">,
  "body": <volledige e-mailtekst, alinea's gescheiden door \\n\\n, eindigend met alleen de naam "${senderName}">
}`;

  const userPrompt = `Bedrijfsnaam: ${company.name ?? "onbekend"}
Stad: ${company.city ?? "onbekend"}
Rechtsvorm: ${company.legal_form ?? "onbekend"}
SBI-codes: ${company.sbi_codes?.join(", ") ?? "onbekend"}
Concreet pijnpunt: ${company.ai_key_selling_point ?? "niet bekend"}`;

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
