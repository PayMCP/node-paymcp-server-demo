import 'dotenv/config';
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import cors from 'cors';
// @ts-ignore - runWithSession exists but TypeScript module resolution is having issues
import { runWithSession, VERSION, BUILD_HASH } from 'paymcp';

import { getMCPServer } from "./mcpserver.js";




const app = express();

// CRITICAL FIX: Disable Express buffering and enable immediate response flushing
// This ensures responses are sent immediately, fixing hanging issues with Python MCP client
app.use(express.json({ limit: '50mb' }));

// Disable Express ETag and other caching that might delay responses
app.set('etag', false);
app.set('x-powered-by', false);

app.use(cors({
    origin: '*', // Configure appropriately for production, for example:
    // origin: ['https://your-remote-domain.com', 'https://your-other-remote-domain.com'],
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],  // Pascal-Case to match MCP SDK
}));

// CRITICAL: Following SDK example pattern - create NEW server instance per session
// The MCP SDK's McpServer has internal state that doesn't properly handle
// multiple concurrent transports. Using a shared instance causes multi-user tests to hang.
// Pattern from: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/examples/server/simpleStreamableHttp.ts
const transports = new Map<string, StreamableHTTPServerTransport>();

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    console.log("POST request - sessionId:", sessionId, "method:", req.body?.method);

    try {
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports.has(sessionId)) {
            // Reuse existing transport for this session
            transport = transports.get(sessionId)!;
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request - create NEW transport AND server for this session
            const newSessionId = randomUUID();
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => newSessionId,
                onsessioninitialized: (sid) => {
                    console.log(`[DEBUG] Session initialized: ${sid}`);
                    transports.set(sid, transport);
                },
                onsessionclosed: (sid) => {
                    console.log(`[DEBUG] Session closed: ${sid}`);
                    transports.delete(sid);
                }
            });

            // CRITICAL: Create NEW server instance per session (SDK pattern)
            // This prevents state interference between concurrent sessions
            const server = getMCPServer();
            await server.connect(transport);

            // CRITICAL: Wrap in runWithSession for LIST_CHANGE flow per-session tool visibility
            // WHY: AsyncLocalStorage.run() makes session ID available to getCurrentSession()
            // inside PayMCP's tool filtering logic. Without this, multi-user LIST_CHANGE breaks.
            await runWithSession(newSessionId, async () => {
                await transport.handleRequest(req, res, req.body);
            });
            return;
        } else {
            // Invalid request - no session ID and not an initialize request
            res.status(400).json({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                id: null
            });
            return;
        }

        // Handle request with existing transport
        // CRITICAL: Must wrap ALL request handling, not just initialize, for session context
        await runWithSession(sessionId!, async () => {
            await transport.handleRequest(req, res, req.body);
        });
    } catch (err) {
        console.error(`[ERROR] Request handling failed:`, err);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: String(err) },
                id: req.body?.id || null
            });
        }
    }
});

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    console.log("GET request - sessionId:", sessionId);

    // GET requests MUST have a session ID (SDK requirement)
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }

    try {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
    } catch (err) {
        console.error(`[ERROR] GET request failed:`, err);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    console.log("DELETE request - sessionId:", sessionId);

    try {
        if (sessionId) {
            const transport = transports.get(sessionId);
            if (transport) {
                await transport.handleRequest(req, res);
                // Transport will be removed from map by onsessionclosed callback
                return;
            }
        }

        // No session ID or transport not found
        res.writeHead(404).end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Session not found' },
            id: null
        }));
    } catch (err) {
        console.error(`[ERROR] DELETE request failed:`, err);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
});

// CRITICAL: Always use streamable-http transport to prevent API key exposure via STDIO
// STDIO transport is PROHIBITED for payment servers due to credential exposure risk
const transportMode = (process.env.TRANSPORT || 'streamable-http').toLowerCase();

if (transportMode === 'stdio') {
    // STDIO transport is BLOCKED for security reasons
    console.error('❌ STDIO transport is prohibited for PayMCP servers');
    console.error('❌ Reason: STDIO transport exposes API keys and credentials');
    console.error('✅ Solution: Use streamable-http transport (default)');
    process.exit(1);
} else if (transportMode === 'http' || transportMode === 'streamable-http') {
    // HTTP transport mode (ENFORCED)
    const port = Number(process.env.PORT) || 5004;

    // Log PayMCP version info on startup
    console.log(`📦 PayMCP version: ${VERSION}`);
    console.log(`🔨 PayMCP build hash: ${BUILD_HASH}`);

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 MCP server running at http://0.0.0.0:${port}/mcp (streamable-http transport)`);
    });

    server.on("error", (err) => {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    });
} else {
    console.error(`❌ Unknown transport: ${transportMode}. Only 'http' and 'streamable-http' are supported`);
    process.exit(1);
}








