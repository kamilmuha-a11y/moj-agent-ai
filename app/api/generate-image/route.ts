import { ApiError, GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Brak opisu obrazu." }, { status: 400 });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        httpOptions: { timeout: 30_000 },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);
    const textPart = parts.find((p) => p.text);

    if (!imagePart?.inlineData?.data) {
      return Response.json(
        { error: "Model nie zwrócił obrazu. Spróbuj innego opisu." },
        { status: 500 },
      );
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";

    return Response.json({
      image: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      text: textPart?.text ?? "",
    });
  } catch (error) {
    console.error("generate-image error:", error);

    if (error instanceof ApiError && error.status === 429) {
      return Response.json(
        {
          error:
            "Limit darmowego API dla generowania obrazów został wyczerpany. Spróbuj ponownie później.",
        },
        { status: 429 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Nieznany błąd generowania.";
    return Response.json({ error: message }, { status: 500 });
  }
}
