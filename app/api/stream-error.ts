export function friendlyStreamError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) {
    return "Limit darmowego API Gemini został wyczerpany na dziś. Spróbuj ponownie później lub włącz billing w Google AI Studio.";
  }
  if (/503|UNAVAILABLE|overloaded|high demand/i.test(message)) {
    return "Model Gemini jest chwilowo przeciążony. Spróbuj ponownie za chwilę.";
  }
  return "Agent napotkał błąd i nie mógł dokończyć odpowiedzi. Spróbuj ponownie.";
}
