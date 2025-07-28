import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: "dall-e-2",
    prompt
  });

  const first = res.data?.[0];
  let b64 = first?.b64_json ?? null;

  // Fallback: if only URL is returned, fetch and convert to base64
  if (!b64 && first?.url) {
    const resp = await fetch(first.url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch image: ${resp.status} ${resp.statusText}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    b64 = buf.toString("base64");
  }

  if (!b64) throw new Error("No image returned");
  return b64;
}