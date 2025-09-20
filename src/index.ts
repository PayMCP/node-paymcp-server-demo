#!/usr/bin/env node
import 'dotenv/config';
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import cors from 'cors';
import { getMCPServer } from "./mcpserver.js";

// Check transport type from environment or arguments
const useHttp = process.env.MCP_TRANSPORT === 'http' || process.argv.includes('--http');

if (useHttp) {
    // HTTP Transport for MCP Inspector
    const app = express();
    app.use(express.json());

    app.use(cors({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'node-paymcp-server' });
    });

    // Map to store transports by session ID
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

    // Handle POST requests for client-to-server communication
    app.post('/mcp', async (req, res) => {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            console.log("POST - new transport")
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID
                    transports[sessionId] = transport;
                },
            });

            // Clean up transport when closed
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete transports[transport.sessionId];
                }
            };
            const server = getMCPServer();
            // Connect to the MCP server
            await server.connect(transport);
        } else {
            console.error("POST - no session id found")
            // Invalid request
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided',
                },
                id: null,
            });
            return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        console.log("Session request", sessionId)
        if (!sessionId || !transports[sessionId]) {
            console.log("HSR - no session id found")
            res.status(400).send('Invalid or missing session ID');
            return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    };

    // Handle GET requests for server-to-client notifications via SSE
    app.get('/mcp', handleSessionRequest);

    // Handle DELETE requests for session termination
    app.delete('/mcp', handleSessionRequest);

    const port = Number(process.env.PORT) || 5004;
    const server = app.listen(port, () => {
        console.log(`🚀 MCP dev server running at http://localhost:${port}/mcp`);
    });

    server.on("error", (err) => {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    });
} else {
    // Stdio Transport for Claude Desktop
    async function startStdioServer() {
        console.error("Starting MCP server with stdio transport...");

        const mcpServer = getMCPServer();
        const transport = new StdioServerTransport();

        await mcpServer.connect(transport);
        console.error("✅ MCP stdio server connected");
    }

    startStdioServer().catch((error) => {
        console.error("❌ Failed to start stdio server:", error);
        process.exit(1);
    });
}