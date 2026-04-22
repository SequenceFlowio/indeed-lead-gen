import { KVKSearchQuery } from "@/lib/types";

const KVK_API_BASE = "https://api.kvk.nl/api/v1";

export interface KVKCompanyRaw {
  kvkNummer: string;
  handelsnaam: string;
  type: string;
  actief: boolean;
  adres?: {
    binnenlandsAdres?: {
      straatnaam?: string;
      huisnummer?: string;
      postcode?: string;
      plaats?: string;
    };
  };
  rechtsvorm?: string;
  startdatum?: string; // YYYY-MM-DD
}

// Dutch postal code prefix → province mapping
const POSTAL_PROVINCE: Record<string, string> = {
  "1": "Noord-Holland",
  "2": "Zuid-Holland",
  "3": "Utrecht",
  "4": "Zeeland",
  "5": "Noord-Brabant",
  "6": "Limburg",
  "7": "Overijssel",
  "8": "Flevoland",
  "9": "Groningen",
};

function postalToProvince(postal: string | undefined): string | null {
  if (!postal) return null;
  const digit = postal.charAt(0);
  if (digit === "1") {
    // Distinguish Noord-Holland vs Flevoland
    const num = parseInt(postal.slice(0, 4));
    if (num >= 1300 && num <= 1399) return "Flevoland";
    return "Noord-Holland";
  }
  if (digit === "3") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 3800 && num <= 3899) return "Gelderland";
    if (num >= 3900 && num <= 3999) return "Utrecht";
    return "Utrecht";
  }
  if (digit === "4") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 4000 && num <= 4499) return "Gelderland";
    return "Zeeland";
  }
  if (digit === "6") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 6500 && num <= 6599) return "Gelderland";
    return "Limburg";
  }
  if (digit === "7") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 7300 && num <= 7499) return "Gelderland";
    return "Overijssel";
  }
  if (digit === "8") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 8200 && num <= 8299) return "Flevoland";
    return "Overijssel";
  }
  if (digit === "9") {
    const num = parseInt(postal.slice(0, 4));
    if (num >= 9400 && num <= 9499) return "Drenthe";
    if (num >= 9700 && num <= 9799) return "Groningen";
    return "Groningen";
  }
  return POSTAL_PROVINCE[digit] ?? null;
}

export interface KVKCompanyMapped {
  kvk_number: string;
  name: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  street: string | null;
  legal_form: string | null;
  registration_date: string | null;
  sbi_codes: string[];
}

export async function searchKVK(query: KVKSearchQuery, sbiCode: string): Promise<KVKCompanyMapped[]> {
  const apiKey = process.env.KVK_API_KEY;
  if (!apiKey) {
    throw new Error("KVK_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    type: "hoofdvestiging",
    actief: "true",
    resultatenPerPagina: String(query.results_per_page ?? 10),
  });

  if (sbiCode) params.set("sbi", sbiCode);
  if (query.legal_form && query.legal_form !== "all") params.set("rechtsvorm", query.legal_form);

  const url = `${KVK_API_BASE}/zoeken?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "apikey": apiKey,
      "API-key": apiKey,
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`KVK API error: HTTP ${res.status}`);
  }

  const json = await res.json();
  const items: KVKCompanyRaw[] = json.resultaten ?? [];

  const today = new Date();
  const cutoffDate = new Date(today.getFullYear() - (query.max_age_years ?? 10), today.getMonth(), today.getDate());

  return items
    .filter((item) => {
      // Filter by registration date (company age)
      if (item.startdatum) {
        const regDate = new Date(item.startdatum);
        if (regDate < cutoffDate) return false;
      }
      return true;
    })
    .map((item): KVKCompanyMapped => {
      const addr = item.adres?.binnenlandsAdres;
      const postal = addr?.postcode;
      const province = postalToProvince(postal);

      return {
        kvk_number: item.kvkNummer,
        name: item.handelsnaam,
        city: addr?.plaats ?? null,
        province: query.province !== "all" ? (province === query.province ? province : null) : province,
        postal_code: postal ?? null,
        street: addr?.straatnaam ? `${addr.straatnaam} ${addr.huisnummer ?? ""}`.trim() : null,
        legal_form: item.rechtsvorm ?? null,
        registration_date: item.startdatum ?? null,
        sbi_codes: [sbiCode],
      };
    })
    .filter((item) => {
      // Filter by province if specified
      if (query.province && query.province !== "all" && item.province !== query.province) return false;
      return true;
    });
}
