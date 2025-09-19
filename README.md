

# Image Generator MCP Server (paymcp demo)

A minimal **Model Context Protocol (MCP)** server that exposes a single tool, `generate`, which creates an image from a text prompt and returns it as a base64-encoded PNG **MCP resource**. The server demonstrates how to make a **paid** MCP tool using [`paymcp`](https://www.npmjs.com/package/paymcp) with Stripe or Walleot.

---

## What this repo shows

- How to wire `paymcp` into an MCP server and set a price for a tool.
- A minimal shape for a paid, single-purpose MCP tool you can extend.
- How to serve an MCP server over **Streamable HTTP** with Express (POST/GET/DELETE to `/mcp`).

---

## Requirements

- **Node.js 18+**
- **OpenAI API key**: set `OPENAI_API_KEY`
- **Stripe secret key (optional)**: set `STRIPE_SECRET_KEY` if you want to enable Stripe payments (test keys are fine for development)
- **Walleot API key (optional)**: set `WALLEOT_API_KEY` and uncomment the provider in code if you want to try Walleot instead of Stripe

---

## Installation

```bash
# clone the repo
pnpm install
```

> This project is TypeScript. Use your preferred runner (e.g., `tsx`, `ts-node`) when bootstrapping the server process if you create a custom entry point.

---

## Configuration

Set environment variables (for example via a `.env` that your runner loads, or via your shell):

```bash
export OPENAI_API_KEY="sk-..."
# Optional, if using Stripe
export STRIPE_SECRET_KEY="sk_test_..."
# Optional, if using Walleot (then uncomment provider in the server code)
export WALLEOT_API_KEY="..."
```

Payment providers are configured in `installPayMCP` within the server code:

```ts
installPayMCP(server, {
  providers: {
    // "walleot": { apiKey: process.env.WALLEOT_API_KEY ?? "" }, // Uncomment to enable Walleot
    "stripe": { apiKey: process.env.STRIPE_SECRET_KEY ?? "" },
  },
  paymentFlow: PaymentFlow.ELICITATION,
});
```

> **Payment notes:** Stripe has a minimum charge per transaction. If your tool price is below **$2.00**, prefer **Walleot**; small Stripe payments may fail or be uneconomical.
 
 

## How it works

- The server registers a single tool `generate`:
  - **Input**: `{ prompt: string }`
  - **Price**: `$2.00` per call (configured in the code; change as you like)
  - **Output**: MCP resource of type `image` with base64-encoded PNG data 
- Internally it calls `generateImage(prompt)` from `src/services/openai.ts`, which uses the official OpenAI SDK, requests an image, and returns a **base64** string.

The tool returns a response like:

```jsonc
{
  "content": [
    {
      "type": "image",
      "data": "<base64>",
      "mimeType": "image/png",
      "annotations": {
        "audience": ["user"],
        "priority": 0.9
      }
    }
  ]
}
```

---

## Running the server (HTTP / Streamable HTTP)

This server is already wired to run over HTTP using Express and the **StreamableHTTPServerTransport**.

### Using package scripts

```bash
# dev with tsx watch
pnpm dev

# build TypeScript -> build/
pnpm build

# start compiled server from build/
pnpm start
```

By default it listens on `PORT` (defaults to **5004**):

```
http://localhost:5004/mcp
```

---

- **MCP Inspector**:
  1. Start this server (`pnpm dev`) so it listens on `http://localhost:5004/mcp`.
  2. In a new terminal, run:
     ```bash
     npx @modelcontextprotocol/inspector@latest
     ```
  3. Open the URL printed by Inspector (e.g., `http://localhost:5173`).
  4. Click **Add server** → select **Streamable HTTP** → set URL to `http://localhost:5004/mcp` → **Connect**.
  5. In the tools list, choose **generate**, provide a `prompt`, and run it to receive a base64 PNG.

- **Demo client**: Try the companion chat client here: https://github.com/Walleot/walleot-demo-chat


---

## Customization

- **Change price**: in `server.registerTool` update `price: { amount: 2, currency: "USD" }`. If you use **Stripe**, set the price above Stripe’s minimum; for prices **below $2.00**, prefer **Walleot**.
- **Change output**: adjust `src/services/openai.ts` if you want URLs instead of base64, larger sizes, different formats, etc. The current function is intentionally minimal and always returns a base64 PNG string.
- **Swap payment provider**: switch from Stripe to Walleot by toggling the provider block and keys.

---

## License

MIT


**Notes on package manager**: this repo declares `packageManager: pnpm`. Examples above use **pnpm**. If you prefer others, use: `npm run dev|build|start` or `yarn dev|build|start`.
