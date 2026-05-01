/**
 * OpenAI embedding wrapper. Uses text-embedding-3-large at 1536 dimensions
 * — the dimensions parameter trims the model's native 3072-dim output to
 * 1536, which (a) stays within pgvector's hnsw index size limit, and
 * (b) preserves quality far better than dropping to text-embedding-3-small.
 */

const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1536;
const BATCH_SIZE = 100; // OpenAI accepts up to 2048; batch for speed + safety

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local before ingestion."
    );
  }

  const out: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: batch,
        dimensions: DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI embedding error ${res.status}: ${errorText}`);
    }

    const json = (await res.json()) as EmbeddingResponse;
    for (const row of json.data) {
      out[i + row.index] = row.embedding;
    }
  }

  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

export const EMBEDDING_DIMS = DIMENSIONS;
export const EMBEDDING_MODEL = MODEL;
