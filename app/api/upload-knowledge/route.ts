import { ApiError, GoogleGenAI } from "@google/genai";
import { splitIntoChunks } from "../../../lib/chunking";
import { supabase } from "../../../lib/supabase";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Streams newline-delimited JSON progress events so the client can render
// a real "fragment X z Y" bar instead of a single opaque request/response.
export async function POST(req: Request) {
  const { title, content } = await req.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Brak tytułu dokumentu." }, { status: 400 });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "Brak treści dokumentu." }, { status: 400 });
  }

  const chunks = splitIntoChunks(content);

  if (chunks.length === 0) {
    return Response.json(
      { error: "Nie udało się podzielić tekstu na fragmenty." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          const embedResponse = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: chunk,
            config: { outputDimensionality: 768 },
          });
          const values = embedResponse.embeddings?.[0]?.values;

          if (!values) {
            send({ type: "error", error: `Model nie zwrócił wektora dla fragmentu ${i + 1}.` });
            return;
          }

          const { error: insertError } = await supabase.from("documents").insert({
            title,
            content: chunk,
            embedding: values,
            metadata: { source: title, chunk_index: i, total_chunks: chunks.length },
          });

          if (insertError) {
            console.error("upload-knowledge insert error:", insertError);
            send({ type: "error", error: `Błąd zapisu fragmentu ${i + 1} w bazie danych.` });
            return;
          }

          send({ type: "progress", current: i + 1, total: chunks.length });
        }

        send({ type: "done", chunks_saved: chunks.length });
      } catch (error) {
        console.error("upload-knowledge error:", error);

        const message =
          error instanceof ApiError && error.status === 429
            ? "Limit darmowego API dla embeddingów został wyczerpany. Spróbuj ponownie później."
            : error instanceof Error
              ? error.message
              : "Nieznany błąd przetwarzania dokumentu.";

        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
