# Node.js PayMCP Server Demo

A TypeScript MCP server demonstrating PayMCP integration with Express and Streamable HTTP transport.

## Features

- ✅ Multiple payment flows (Elicitation, Two-step, Progress, List-change)
- ✅ Multiple providers (Mock, Walleot, PayPal, Stripe, Square)
- ✅ Static configuration via `providers.json` (restart server to change)
- ✅ Express-based HTTP transport with CORS support
- ✅ Full TypeScript support with strict type checking
- ✅ Mock provider for testing without real API keys

## Prerequisites

- Node.js 18+ (recommend Node.js 20 LTS)
- pnpm (recommended) or npm
- Optional: Payment provider API keys (Stripe, PayPal, etc.)

## Quick Start

### 1. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Environment Setup

#### Option A: Mock Provider (No API Keys Needed - Fastest Start)

The server is pre-configured with a mock provider for immediate testing:

```bash
# providers.json is already configured with:
# "activeProvider": "mock"
# "activeFlow": "elicitation"

# Start the server immediately
pnpm dev

# Server will run on http://localhost:5004
```

#### Option B: Real Payment Provider

Create `.env` file (or use environment variables):

```bash
# Copy example template
cp .env.example .env

# Edit .env with your API keys
# Required: At least one payment provider
STRIPE_SECRET_KEY=sk_test_your_stripe_key
# OR
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
# OR other providers (see Configuration section)
```

Edit `providers.json` to activate your provider:

```json
{
  "activeProvider": "stripe",
  "activeFlow": "elicitation"
}
```

### 3. Start Development Server

```bash
# Development mode with hot reload
pnpm dev

# Custom port
PORT=8000 pnpm dev

# Server runs on http://localhost:5004 (default)
```

### 4. Test the Server

```bash
# Test MCP protocol with initialize request
curl -X POST http://localhost:5004/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}'

# Should return initialization response with server capabilities
```

### 5. Connect with MCP Client

```bash
# Install MCP Inspector (official testing tool)
npx @modelcontextprotocol/inspector@latest http://localhost:5004/mcp

# Or configure in Claude Desktop (see Integration section below)
```

## Configuration

### Payment Providers

Edit `providers.json` to configure providers and select active settings:

```json
{
  "activeProvider": "mock",
  "activeFlow": "elicitation",
  "availableFlows": ["elicitation", "two_step", "progress", "list_change"],
  "availableProviders": {
    "mock": {
      "apiKey": "mock",
      "defaultStatus": "paid"
    },
    "stripe": {
      "apiKey": "${STRIPE_SECRET_KEY}"
    },
    "paypal": {
      "clientId": "${PAYPAL_CLIENT_ID}",
      "clientSecret": "${PAYPAL_CLIENT_SECRET}",
      "sandbox": true
    },
    "walleot": {
      "apiKey": "${WALLEOT_API_KEY}"
    },
    "square": {
      "accessToken": "${SQUARE_ACCESS_TOKEN}",
      "locationId": "${SQUARE_LOCATION_ID}",
      "sandbox": true
    }
  }
}
```

**Environment variable substitution**: `${VAR_NAME}` in `providers.json` will be replaced with environment variable values at runtime.

### Environment Variables

Create `.env` file or export environment variables:

```bash
# Payment Providers (configure at least one)
STRIPE_SECRET_KEY=sk_test_...
WALLEOT_API_KEY=wlt_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...

# Server Configuration (optional)
PORT=5004
HOST=localhost
NODE_ENV=development
```

**Security Note**: Never commit `.env` file to version control. Use `.env.example` as a template.

## Available Tools

The demo server provides these MCP tools:

### Paid Tools
- **`generate_mock(topic: string)`** - Generate a mock response ($0.01)
  - Demonstrates payment flow integration
  - Works with any configured provider
  - Instant response with mock provider

### Configuration Tools
- **`view_config()`** - View current payment configuration
  - Shows active provider and flow
  - Lists available providers
  - Read-only, no payment required

- **`check_paymcp_version()`** - Check PayMCP library version
  - Shows installation type (local vs npm)
  - Displays file modification timestamps
  - Useful for development debugging

## Payment Flows Explained

### 1. Elicitation (Recommended)
- **Best for**: Production use, external payment UIs
- **How it works**: Tool requests payment, waits for external confirmation
- **User experience**: Non-blocking, handles async payment approval
- **Set in `providers.json`**: `"activeFlow": "elicitation"`

### 2. Two-Step
- **Best for**: Explicit confirmation workflows
- **How it works**: Creates `confirm_{tool}_payment` dynamic tool after payment initiation
- **User experience**: Call tool → get payment link → call confirmation tool with payment_id
- **Set in `providers.json`**: `"activeFlow": "two_step"`

### 3. Progress
- **Best for**: Long-running operations with status updates
- **How it works**: Streams progress while polling payment status in background
- **User experience**: Real-time progress notifications until payment confirmed
- **Set in `providers.json`**: `"activeFlow": "progress"`

### 4. List-Change
- **Best for**: Dynamic tool visibility control
- **How it works**: Hides original tool, shows confirmation tool after payment initiation
- **User experience**: Tool list updates dynamically per session
- **Set in `providers.json`**: `"activeFlow": "list_change"`

**To switch flows**: Edit `activeFlow` in `providers.json` and restart the server.

## Testing

### Method 1: MCP Inspector (Official Tool)

```bash
# Start development server
pnpm dev

# In another terminal, launch inspector
npx @modelcontextprotocol/inspector@latest http://localhost:5004/mcp

# Inspector provides a web UI to test tools interactively
```

### Method 2: Manual Testing with curl

```bash
# List available tools
curl -X POST http://localhost:5004/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Call generate_mock tool (will trigger payment flow)
curl -X POST http://localhost:5004/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "generate_mock",
      "arguments": {"topic": "testing"}
    }
  }'
```

### Method 3: Claude Desktop Integration

**Note**: Node.js MCP servers require manual configuration (no `mcp install` equivalent).

#### Manual Configuration

1. Build the server first:
```bash
pnpm build
```

2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "paymcp-demo": {
      "command": "node",
      "args": ["/absolute/path/to/node-paymcp-server-demo/build/index.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

**Important**: Use absolute path to `build/index.js`, not `src/index.ts`.

3. Restart Claude Desktop and the server will appear in MCP tools.

## Development

### Development Workflow

```bash
# Development mode with hot reload (recommended)
pnpm dev

# Build TypeScript to JavaScript
pnpm build

# Production mode (requires build first)
pnpm start

# Type checking only (no build)
npx tsc --noEmit

# Clean build artifacts
rm -rf build/
```

### Project Structure

```
node-paymcp-server-demo/
├── src/
│   ├── index.ts           # Express server and HTTP transport
│   ├── mcpserver.ts       # MCP server configuration
│   ├── config.ts          # Configuration management
│   └── types.d.ts         # TypeScript type definitions
├── build/                 # Compiled JavaScript (gitignored)
├── providers.json         # Payment provider configuration
├── .env                   # Environment variables (gitignored)
├── .env.example           # Environment template
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### Updating PayMCP Library

This demo uses a **local development version** of PayMCP, not the npm published package.

#### Check Current Setup

```bash
# View package.json dependency
grep "paymcp" package.json
# Should show: "paymcp": "file:../paymcp-ts"

# Verify paymcp is linked
ls -la node_modules/paymcp
```

#### When to Update PayMCP

**After modifying paymcp-ts source code**:

```bash
# 1. Rebuild paymcp-ts
cd ../paymcp-ts
pnpm build

# 2. Reinstall in demo server
cd ../node-paymcp-server-demo
pnpm install

# 3. Restart development server (tsx watch auto-reloads)
# If already running with `pnpm dev`, changes are picked up automatically
# Otherwise restart:
pnpm dev
```

**If you need to rebuild the demo**:
```bash
pnpm build
pnpm start
```

#### Verify PayMCP Version

Use the built-in version checking tool:

```bash
# Start server
pnpm dev

# Connect with MCP Inspector and call:
# check_paymcp_version()
#
# Returns:
# - Installation type: local_development vs npm package
# - Package version from package.json
# - File modification timestamps
# - Latest changed file
```

#### Switch Between Local and Published

**Local development (current setup)**:
```json
{
  "dependencies": {
    "paymcp": "file:../paymcp-ts"
  }
}
```

**Published version** (for production):
```json
{
  "dependencies": {
    "paymcp": "^0.1.0"
  }
}
```

After changing `package.json`:
```bash
rm -rf node_modules/paymcp pnpm-lock.yaml
pnpm install
pnpm build
```

## Troubleshooting

### Common Issues

#### "Cannot find module" or import errors
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild TypeScript
pnpm build
```

#### Port already in use
```bash
# Check what's using port 5004
lsof -i :5004

# Kill existing server instances
pkill -f "node.*index.js"
pkill -f "tsx.*index.ts"

# Or use a different port
PORT=8000 pnpm dev
```

#### Provider configuration not working
```bash
# Verify environment variables are loaded
env | grep STRIPE
env | grep PAYPAL

# Test JSON syntax
node -e "console.log(require('./providers.json'))"

# Check configuration via MCP tool
# Call view_config() tool to see active configuration
```

#### TypeScript compilation errors
```bash
# Check TypeScript version
npx tsc --version

# Run type checker
npx tsc --noEmit

# Rebuild from scratch
rm -rf build/
pnpm build
```

#### Payment flow not triggering
- Verify `activeFlow` is set correctly in `providers.json`
- Check server logs for errors
- Ensure provider credentials are valid
- Try mock provider first to isolate issues

#### Server starts but MCP client can't connect
```bash
# Test MCP protocol manually
curl -X POST http://localhost:5004/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Should return initialization response, not 400/500 error

# Check CORS configuration if using web client
# Ensure Content-Type header is set to application/json

# Verify port is correct
lsof -i :5004
```

### Debug Mode

Enable verbose logging:

```bash
# Set log level
DEBUG=* pnpm dev

# Or
LOG_LEVEL=DEBUG pnpm dev
```

### Getting Help

- Check main project documentation for architecture details
- Review paymcp-ts library documentation
- Check server logs in console output
- Test with mock provider to isolate configuration issues

## License

MIT
