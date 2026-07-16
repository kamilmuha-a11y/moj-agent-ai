import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { friendlyStreamError } from "../stream-error";

const SYSTEM_PROMPT = `Jesteś asystentem który formatuje odpowiedzi według instrukcji użytkownika.

Rozpoznajesz komendy formatu na początku wiadomości:

/tabela [temat] — odpowiedz w formie tabeli markdown
  Kolumny dobierz do tematu. Minimum 3 kolumny, 5 wierszy.
  Przykład: /tabela porównanie frameworków JavaScript

/lista [temat] — odpowiedz jako lista numerowana z opisami
  Każdy punkt: numer + nagłówek (bold) + 1 zdanie opisu
  Przykład: /lista 10 zasad dobrego kodu

/porownanie [A] vs [B] — tabela porównawcza dwóch rzeczy
  Kolumny: Aspekt | [A] | [B] | Werdykt
  Minimum 6 aspektów + wiersz podsumowania
  Przykład: /porownanie React vs Vue

/faq [temat] — lista pytań i odpowiedzi
  Format: **Q:** pytanie (bold) → **A:** odpowiedź
  Minimum 5 par Q&A
  Przykład: /faq praca zdalna

/email [opis] — napisz profesjonalny email
  Format: Temat | Od/Do | Treść | Podpis
  Przykład: /email prośba o urlop na 2 tygodnie

Jeśli wiadomość NIE zaczyna się od komendy — odpowiadaj normalnie,
ale w czystym, czytelnym markdown.

ZAWSZE formatuj w markdown (nagłówki, pogrubienia, tabele, listy).`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ onError: friendlyStreamError });
}
