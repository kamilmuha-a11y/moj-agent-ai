import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import {
  calculator,
  currentDateTime,
  generateImage,
  getExchangeRate,
  getHolidays,
  getNotes,
  getWeather,
  readWebPage,
  saveNote,
  searchWikipedia,
} from "../tools";
import { friendlyStreamError } from "../stream-error";
import { ERROR_HANDLING_PROMPT } from "../error-handling-prompt";

if (process.env.ENABLE_SEARCH_GROUNDING === "true") {
  console.warn(
    "⚠️ UWAGA: Search Grounding jest WŁĄCZONY. " +
      "To jest najdroższa funkcja API ($14/1000 zapytań). " +
      "Używaj TYLKO do testów. Wyłącz po testach usuwając ENABLE_SEARCH_GROUNDING z .env.local, " +
      "bo inni uczestnicy kursu mają wtedy ograniczony dostęp do modeli.",
  );
}

const SYSTEM_PROMPT = `Jesteś autonomicznym agentem. Gdy dostajesz ZADANIE (nie pytanie), MUSISZ je zrealizować krok po kroku.

## TWÓJ PROCES:

Dla KAŻDEGO kroku wypisz:

### 🧠 Myślę...
Co muszę teraz zrobić? Jakie informacje mi brakuje?
Które narzędzie użyć?

Potem UŻYJ narzędzia.

Po otrzymaniu wyniku:

### 👁️ Obserwuję...
Co dostałem? Czy to wystarczy do odpowiedzi?
Jeśli nie — jaki następny krok?

Powtarzaj aż będziesz mieć WSZYSTKO co potrzebne.

Na koniec:

### ✅ Wynik końcowy
Podaj pełną, konkretną odpowiedź opartą na zebranych danych.
Cytuj źródła (API, Wikipedia, Google).

## ZASADY:
- ZAWSZE pokazuj tok myślenia — użytkownik widzi cały proces
- NIE zgaduj — jeśli potrzebujesz danych, UŻYJ narzędzia
- Maksymalnie 5 głównych kroków
- Jeśli narzędzie zwróci błąd — spróbuj inaczej lub poinformuj
- ŁĄCZ dane z wielu narzędzi w spójną odpowiedź

${ERROR_HANDLING_PROMPT}`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      calculator,
      currentDateTime,
      getWeather,
      getExchangeRate,
      getHolidays,
      searchWikipedia,
      readWebPage,
      saveNote,
      getNotes,
      generateImage,
      ...(process.env.ENABLE_SEARCH_GROUNDING === "true"
        ? { google_search: google.tools.googleSearch({}) }
        : {}),
    },
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyStreamError,
  });
}
