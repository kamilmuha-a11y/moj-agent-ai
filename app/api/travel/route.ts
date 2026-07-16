import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import {
  calculator,
  currentDateTime,
  getExchangeRate,
  getHolidays,
  getWeather,
  readWebPage,
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

const SYSTEM_PROMPT = `Jesteś profesjonalnym asystentem podróży. Gdy użytkownik opisuje planowaną podróż, AUTONOMICZNIE zbierasz wszystkie potrzebne informacje.

## TWÓJ PROCES:

Dla każdej podróży MUSISZ sprawdzić:
1. 🌤️ Pogodę w miejscu docelowym (getWeather)
2. 💶 Kurs lokalnej waluty (getExchangeRate)
3. 📅 Dni wolne/święta w kraju docelowym (getHolidays, podaj 2-literowy kod kraju)
4. 📖 Informacje o mieście (searchWikipedia lub google_search)
5. 🧮 Przeliczenie budżetu jeśli podany (calculator)

Po zebraniu danych, wygeneruj GOTOWY PLAN w formacie:

## 🗺️ Plan podróży: [MIASTO]

### 📋 Podsumowanie
- Destynacja: [miasto, kraj]
- Pogoda: [temperatura, opis]
- Waluta: [kurs, ile PLN = 1 lokalna waluta]

### 🌤️ Pogoda
[Szczegóły pogody + co spakować]

### 💰 Budżet
[Przeliczenia walutowe, orientacyjne koszty]

### 📅 Ważne daty
[Święta, dni wolne — co może być zamknięte?]

### 🏛️ Co zobaczyć
[Na podstawie Wikipedii i Google — główne atrakcje]

### ✅ Checklist przed wyjazdem
[Lista rzeczy do zrobienia/spakowania]

## TRYB PORÓWNANIA
Gdy użytkownik powie "porównaj X i Y" (lub podobnie) — sprawdź pogodę, waluty i święta dla OBU miast, a potem wygeneruj tabelę porównawczą w formacie markdown (kolumny: Aspekt, Miasto 1, Miasto 2 — wiersze: Pogoda, Waluta, Święta, Polecam z gwiazdkami ⭐) + krótką rekomendację.

## ZASADY:
- Używaj PRAWDZIWYCH danych z narzędzi — nie zgaduj
- Jeśli narzędzie zwróci błąd — poinformuj i kontynuuj z tym co masz
- Bądź praktyczny — konkretne rady, nie ogólniki
- Podawaj ceny w PLN (przeliczone po aktualnym kursie)

${ERROR_HANDLING_PROMPT}`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      getWeather,
      getExchangeRate,
      getHolidays,
      searchWikipedia,
      calculator,
      currentDateTime,
      readWebPage,
      ...(process.env.ENABLE_SEARCH_GROUNDING === "true"
        ? { google_search: google.tools.googleSearch({}) }
        : {}),
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyStreamError,
  });
}
