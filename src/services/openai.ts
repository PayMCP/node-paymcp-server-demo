import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEFAULT_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAACe0lEQVR42u3bW07jQBSE4d7BbGBWNRuZ/bGY4TKEQLiESxgkv5h6QYhobNydMsd0/5bqqB9iEuoTVpwO6fml60lcEiUAAAAJBNhpkLik3T8tSFgAAKBxgCcNEhcAwgGetSBhASAa4FGDxAUAAFoH2GlBwpIeNEhcAAAAAIqIBLh/6npnfvw6+pCfv/vR7D9+6ee7+wIAAAAAiATYajjz3Qv+7Hx3X2n7qIUx1QOY+wIAgMYB7jScqR3A3RcA4QAPWhhTPYC5LwCiAW41nJn6C/7vcBU8dhwK5O4LgFYBpiKUXmKmlL8MgHstjKkewNxXutFwJrfAzxCWdgly9wVA6wBDhZUCTDkAAOAd4Hrb9c6U/okPFZVT0BCkE9jdFwAA5N+clQAO/WwAWgfYaDhz6Nu8XISx8veff+rN2djrd/eVNndaGFM9gLmvxQHkIuS+zcxFAKB2gCsNZ77yw7TSD/NygPfPdfcFQDjArRbGOLcMxxAO3dApPd/dFwDRAJcazrg3zaceJZvuJZcwd18AAHBUdKOVc6Pm3BDyA9xoYUz1AOa+0lrDmbm+GDV1i9EFPHS+uy8AAIgHyNkQAqA2gIvrrndmDoCcTfa5N4TcfQEAQP7bxBwE94YQALUBrDSc+S4fxuV+tfHt8e6+0mqjhTHVA5j7WizAnBsyhzw/ALUBnGs4M/cl4Cu+3j72Otx9LRJgyef7Aa60MKZ6AHNfAEQD/NVwpvZ/1Hb3BQAArQNcamFM9QDmvtKZBokLAAAAQBGRAKfrridxAQAAACgiEuBEg8QlnVxoQcICAACNAxxrkLgAEA6w0oKEBYBogD8aJC4AANA6wLkWJCyv241OjRS80yYAAAAASUVORK5CYII=";

export async function generateImage(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return DEFAULT_IMAGE_BASE64;
  }

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
