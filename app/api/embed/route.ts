import { ApiError, GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Brak tekstu do zaembedowania." }, { status: 400 });
  }

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 768 },
    });

    const values = response.embeddings?.[0]?.values;

    if (!values) {
      return Response.json(
        { error: "Model nie zwrócił wektora." },
        { status: 500 },
      );
    }

    return Response.json({ embedding: values });
  } catch (error) {
    console.error("embed error:", error);

    if (error instanceof ApiError && error.status === 429) {
      return Response.json(
        { error: "Limit darmowego API dla embeddingów został wyczerpany. Spróbuj ponownie później." },
        { status: 429 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Nieznany błąd embeddowania.";
    return Response.json({ error: message }, { status: 500 });
  }
}
