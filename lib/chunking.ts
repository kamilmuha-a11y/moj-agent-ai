export function splitIntoChunks(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > chunkSize && current) {
      chunks.push(current.trim());
      const overlapText = current.slice(-overlap);
      current = `${overlapText} ${sentence}`;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
