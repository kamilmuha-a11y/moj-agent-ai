import { GoogleGenAI } from "@google/genai";
import { tool } from "ai";
import { z } from "zod";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function describeFetchError(err: unknown, context: string): string {
  if (err instanceof Error && err.name === "AbortError") {
    return `Timeout — ${context} nie odpowiedział w 5 sekund. Spróbuj ponownie.`;
  }
  return `Błąd połączenia (${context}): ${err instanceof Error ? err.message : "nieznany błąd"}.`;
}

export const readWebPage = tool({
  description:
    "Pobiera i czyta zawartość strony internetowej. Używaj gdy użytkownik poda URL lub gdy chcesz przeczytać artykuł/stronę znalezioną w wyszukiwarce.",
  inputSchema: z.object({
    url: z.string().describe("Pełny adres URL strony do przeczytania"),
  }),
  execute: async ({ url }) => {
    if (!url.trim()) return "Podaj adres URL strony do przeczytania.";
    try {
      const res = await fetchWithTimeout(url);

      if (!res.ok) {
        return `API zwróciło błąd ${res.status}. Sprawdź adres URL.`;
      }

      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return text.slice(0, 3000) || "Strona nie zawiera tekstu do odczytania.";
    } catch (err) {
      return describeFetchError(err, "serwer strony");
    }
  },
});

export const calculator = tool({
  description:
    "Wykonuje obliczenia matematyczne. Podaj gotowe wyrażenie arytmetyczne (liczby, + - * / ( ), bez znaku %) — np. dla '23% VAT z 8500' podaj '8500 * 0.23'.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe("Wyrażenie arytmetyczne do obliczenia, np. '8500 * 0.23'"),
  }),
  execute: async ({ expression }) => {
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return "Wyrażenie zawiera niedozwolone znaki — dozwolone są tylko cyfry i operatory + - * / ( ).";
    }
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      if (typeof result !== "number" || !Number.isFinite(result)) {
        return `Nie mogę obliczyć: ${expression}`;
      }
      return `${expression} = ${result}`;
    } catch {
      return `Nie mogę obliczyć: ${expression}`;
    }
  },
});

export const currentDateTime = tool({
  description: "Zwraca aktualną datę i godzinę w Polsce.",
  inputSchema: z.object({}),
  execute: async () =>
    new Date().toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
      dateStyle: "full",
      timeStyle: "short",
    }),
});

export const generateImage = tool({
  description:
    "Generuje obraz na podstawie opisu. Używaj gdy użytkownik prosi o logo, grafikę, ilustrację lub post wizualny.",
  inputSchema: z.object({
    prompt: z.string().describe("Opis obrazu do wygenerowania"),
  }),
  execute: async ({ prompt }) => {
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          httpOptions: { timeout: 30_000 },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p) => p.inlineData);

      if (!imagePart?.inlineData?.data) {
        return { success: false, message: "Nie udało się wygenerować obrazu." };
      }

      const mimeType = imagePart.inlineData.mimeType || "image/png";
      return {
        success: true,
        image: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Błąd generowania obrazu.",
      };
    }
  },
});

const WEATHER_CODES: Record<number, string> = {
  0: "bezchmurnie",
  1: "przeważnie bezchmurnie",
  2: "częściowe zachmurzenie",
  3: "pochmurno",
  45: "mgła",
  48: "mgła z osadzającą się szadzią",
  51: "lekka mżawka",
  53: "umiarkowana mżawka",
  55: "gęsta mżawka",
  61: "lekki deszcz",
  63: "umiarkowany deszcz",
  65: "silny deszcz",
  71: "lekki śnieg",
  73: "umiarkowany śnieg",
  75: "silny śnieg",
  80: "przelotne opady deszczu",
  81: "umiarkowane przelotne opady deszczu",
  82: "silne przelotne opady deszczu",
  95: "burza",
  96: "burza z gradem",
  99: "silna burza z gradem",
};

export const getWeather = tool({
  description:
    "Zwraca aktualną pogodę (temperatura, warunki, wiatr) dla podanego miasta.",
  inputSchema: z.object({
    city: z.string().describe("Nazwa miasta, np. 'Warszawa'"),
  }),
  execute: async ({ city }) => {
    if (!city.trim()) return "Podaj nazwę miasta.";
    try {
      const geoRes = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl`,
      );
      if (!geoRes.ok) return `API zwróciło błąd ${geoRes.status}. Sprawdź parametry.`;
      const geo = await geoRes.json();
      const place = geo.results?.[0];
      if (!place) return `Nie znalazłem miasta "${city}". Sprawdź pisownię.`;

      const weatherRes = await fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m`,
      );
      if (!weatherRes.ok) return `API zwróciło błąd ${weatherRes.status}. Sprawdź parametry.`;
      const weather = await weatherRes.json();
      const c = weather.current;
      const desc = WEATHER_CODES[c.weather_code] ?? "nieznane warunki";
      return `Pogoda w ${place.name} (${place.country}): ${c.temperature_2m}°C, ${desc}, wiatr ${c.wind_speed_10m} km/h.`;
    } catch (err) {
      return describeFetchError(err, "serwer pogodowy");
    }
  },
});

export const getExchangeRate = tool({
  description:
    "Zwraca aktualny kurs wymiany podanej waluty względem PLN (np. EUR, USD, CHF, GBP).",
  inputSchema: z.object({
    currency: z.string().describe("Kod waluty ISO, np. 'EUR', 'USD', 'CHF'"),
  }),
  execute: async ({ currency }) => {
    const code = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      return "Podaj 3-literowy kod waluty (np. EUR, USD).";
    }
    try {
      const res = await fetchWithTimeout(
        `https://api.frankfurter.dev/v1/latest?base=${code}&symbols=PLN`,
      );
      if (!res.ok) {
        return `Waluta "${code}" nie jest obsługiwana. Popularne: EUR, USD, GBP, CHF.`;
      }
      const data = await res.json();
      const rate = data.rates?.PLN;
      if (!rate) return `Waluta "${code}" nie jest obsługiwana. Popularne: EUR, USD, GBP, CHF.`;
      return `1 ${code} = ${rate} PLN (kurs z ${data.date}).`;
    } catch (err) {
      return describeFetchError(err, "serwer kursów walut");
    }
  },
});

export const getHolidays = tool({
  description:
    "Zwraca listę świąt publicznych dla podanego kraju (2-literowy kod ISO, np. PL, DE, US) i roku (domyślnie bieżący, domyślny kraj: PL).",
  inputSchema: z.object({
    country: z
      .string()
      .optional()
      .describe("2-literowy kod kraju ISO, np. 'PL', 'DE', 'US'. Domyślnie 'PL'."),
    year: z.number().optional().describe("Rok, np. 2026. Domyślnie bieżący rok."),
  }),
  execute: async ({ country, year }) => {
    const code = (country ?? "PL").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return "Podaj 2-literowy kod kraju (np. PL, DE, US).";
    }
    const y = year ?? new Date().getFullYear();
    try {
      const res = await fetchWithTimeout(
        `https://date.nager.at/api/v3/PublicHolidays/${y}/${code}`,
      );
      if (!res.ok) {
        return `Nie znalazłem świąt dla kraju "${code}". Popularne: PL, DE, US, GB, FR.`;
      }
      const holidays: { date: string; localName: string }[] = await res.json();
      if (holidays.length === 0) return `Brak zarejestrowanych świąt dla kraju "${code}" w ${y} roku.`;
      return holidays.map((h) => `${h.date} — ${h.localName}`).join("\n");
    } catch (err) {
      return describeFetchError(err, "serwer świąt");
    }
  },
});

export const searchWikipedia = tool({
  description: "Wyszukuje hasło w polskiej Wikipedii i zwraca krótkie streszczenie.",
  inputSchema: z.object({
    query: z.string().describe("Fraza do wyszukania w Wikipedii"),
  }),
  execute: async ({ query }) => {
    if (!query.trim()) return "Podaj hasło do wyszukania w Wikipedii.";
    try {
      const searchRes = await fetchWithTimeout(
        `https://pl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`,
      );
      if (!searchRes.ok) return `API zwróciło błąd ${searchRes.status}. Sprawdź parametry.`;
      const searchData = await searchRes.json();
      const title = searchData.query?.search?.[0]?.title;
      if (!title) return `Nie znalazłem artykułu Wikipedii dla "${query}".`;

      const summaryRes = await fetchWithTimeout(
        `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      );
      if (!summaryRes.ok) return `API zwróciło błąd ${summaryRes.status}. Sprawdź parametry.`;
      const summary = await summaryRes.json();
      return `${summary.title}: ${summary.extract ?? "brak streszczenia"} (https://pl.wikipedia.org/wiki/${encodeURIComponent(title)})`;
    } catch (err) {
      return describeFetchError(err, "serwer Wikipedii");
    }
  },
});

type Note = { id: string; text: string; createdAt: string };
// In-memory only — resets on server restart, shared across all sessions (no DB in this project).
const notesStore: Note[] = [];

export const saveNote = tool({
  description:
    "Zapisuje notatkę tekstową (np. wynik obliczeń, ważną informację) do zapamiętania.",
  inputSchema: z.object({
    text: z.string().describe("Treść notatki do zapisania"),
  }),
  execute: async ({ text }) => {
    notesStore.push({
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    });
    return `Zapisano notatkę: "${text}".`;
  },
});

export const getNotes = tool({
  description: "Zwraca wszystkie dotąd zapisane notatki.",
  inputSchema: z.object({}),
  execute: async () => {
    if (notesStore.length === 0) return "Brak zapisanych notatek.";
    return notesStore.map((n, i) => `${i + 1}. ${n.text} (${n.createdAt})`).join("\n");
  },
});
