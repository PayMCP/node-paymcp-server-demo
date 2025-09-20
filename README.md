

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
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Dependencies

#### Using Local SDK (Development)
The project uses local paymcp-ts SDK by default (`file:../paymcp-ts`):
```json
// package.json
"paymcp-ts": "file:../paymcp-ts"  // Local development
```

#### Using Published Package
To use the published npm package instead:
```json
// package.json
"paymcp-ts": "^0.1.0"  // From npm

// Then reinstall
npm install
```

#### Switching Between Local and Published
```bash
# Use local SDK (macOS/Linux)
sed -i '' 's/"paymcp-ts": ".*"/"paymcp-ts": "file:..\/paymcp-ts"/' package.json
npm install

# Use npm package (macOS/Linux)
sed -i '' 's/"paymcp-ts": ".*"/"paymcp-ts": "^0.1.0"/' package.json
npm install

# Or use the test suite helper script
cd ../paymcp-test-suite
./scripts/configure-sdk.sh local node    # Use local SDK
./scripts/configure-sdk.sh remote node   # Use npm package
```

For Docker deployment, the path is automatically updated to `/app/paymcp-ts`.

---

## Configuration

### Environment Variables
Set environment variables (via `.env` file or shell):

```bash
export OPENAI_API_KEY="sk-..."

# Payment providers (set at least one):
export WALLEOT_API_KEY="wlt_sk_test_..."     # Walleot (recommended for testing)
export STRIPE_SECRET_KEY="sk_test_..."       # Stripe
export PAYPAL_CLIENT_ID="..."                # PayPal
export PAYPAL_CLIENT_SECRET="..."            # PayPal secret
export SQUARE_ACCESS_TOKEN="..."             # Square
export SQUARE_LOCATION_ID="..."              # Square location

# Provider selection
export PAYMENT_PROVIDER="walleot"  # Options: walleot, stripe, paypal, square
export PAYMENT_FLOW="TWO_STEP"     # Options: TWO_STEP, ONE_STEP

# Server configuration
export PORT="5004"                  # Server port (default: 5004)
export MCP_TRANSPORT="http"         # Transport mode
```

### Provider Configuration (providers.json)
The server uses `providers.json` to configure payment providers. Example:

```json
{
  "default": "walleot",
  "providers": {
    "walleot": {
      "type": "walleot",
      "config": {
        "api_key": "${WALLEOT_API_KEY}"
      }
    },
    "stripe": {
      "type": "stripe",
      "config": {
        "secret_key": "${STRIPE_SECRET_KEY}"
      }
    },
    "paypal": {
      "type": "paypal",
      "config": {
        "client_id": "${PAYPAL_CLIENT_ID}",
        "client_secret": "${PAYPAL_CLIENT_SECRET}",
        "mode": "sandbox"
      }
    },
    "square": {
      "type": "square",
      "config": {
        "access_token": "${SQUARE_ACCESS_TOKEN}",
        "location_id": "${SQUARE_LOCATION_ID}",
        "environment": "sandbox"
      }
    }
  }
}
```

Payment providers are also configured in `installPayMCP` within the server code:

```ts
installPayMCP(server, {
  providers: {
    // "walleot": { apiKey: process.env.WALLEOT_API_KEY ?? "" }, // Uncomment to enable Walleot
    "stripe": { apiKey: process.env.STRIPE_SECRET_KEY ?? "" },
  },
  paymentFlow: PaymentFlow.ELICITATION,
});
```

### Provider Notes
- **Walleot**: Best for testing, supports small amounts, unified API
- **Stripe**: Has minimum charge requirements (~$2.00), great for production
- **PayPal**: Supports PayPal and Venmo payments
- **Square**: Good for in-person and online payments

### Getting API Keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Walleot**: https://walleot.com (Sign up for test API key)
- **Stripe**: https://dashboard.stripe.com/test/apikeys
- **PayPal**: https://developer.paypal.com/dashboard
- **Square**: https://developer.squareup.com/apps

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

## Running the server

### Local Development
```bash
# Build and run (default port 5004)
npm run build
npm start

# Or with custom port
PORT=3000 npm start

# Run in HTTP mode (for MCP Inspector)
MCP_TRANSPORT=http npm start
```

### Using Docker
The server is included in the PayMCP test suite Docker setup. See https://github.com/PayMCP/paymcp-test-suite for details.

### MCP Inspector
```bash
# Run the server in HTTP mode
MCP_TRANSPORT=http npm start

# In another terminal, launch Inspector
npx @modelcontextprotocol/inspector

# Connect to http://localhost:5004/mcp
```

This server uses Express with **StreamableHTTPServerTransport** for HTTP communication.

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

- **Demo client**: Try the companion chat client here: https://github.com/blustAI/walleot-demo-chat


---

## Customization

- **Change price**: in `server.registerTool` update `price: { amount: 2, currency: "USD" }`. If you use **Stripe**, set the price above Stripe’s minimum; for prices **below $2.00**, prefer **Walleot**.
- **Change output**: adjust `src/services/openai.ts` if you want URLs instead of base64, larger sizes, different formats, etc. The current function is intentionally minimal and always returns a base64 PNG string.
- **Swap payment provider**: switch from Stripe to Walleot by toggling the provider block and keys.

---

## License

MIT


**Notes on package manager**: this repo declares `packageManager: pnpm`. Examples above use **pnpm**. If you prefer others, use: `npm run dev|build|start` or `yarn dev|build|start`.