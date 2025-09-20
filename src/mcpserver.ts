import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { installPayMCP, PaymentFlow } from 'paymcp-ts';
import { generateImage } from "./services/openai.js";
import * as fs from 'fs';


export const getMCPServer = () => {
    // Create server instance
    const server = new McpServer({
        name: "Image generator",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });

    // Load providers from JSON file or fall back to environment variables
    let providers = {};
    const configPath = process.env.PROVIDERS_CONFIG_PATH || "providers.json";

    try {
        if (fs.existsSync(configPath)) {
            let configContent = fs.readFileSync(configPath, 'utf8');

            // Replace environment variable references ${VAR} or ${VAR:-default}
            configContent = configContent.replace(/\$\{([^}]+)\}/g, (match: string, varExpr: string) => {
                if (varExpr.includes(':-')) {
                    const [varName, defaultVal] = varExpr.split(':-', 2);
                    return process.env[varName] || defaultVal;
                }
                return process.env[varExpr] || match;
            });

            const config = JSON.parse(configContent);
            providers = config.providers || {};

            console.log(`Loaded providers from ${configPath}: ${Object.keys(providers).join(', ')}`);
        }
    } catch (e) {
        console.warn(`Failed to load ${configPath}, using defaults`);
    }

    // Fall back to environment variables if no config file
    if (Object.keys(providers).length === 0) {
        providers = {
            "stripe": { apiKey: process.env.STRIPE_SECRET_KEY ?? "" }
        };
    }

    // Get payment flow from environment
    const paymentFlowStr = (process.env.PAYMENT_FLOW || "ELICITATION").toUpperCase();
    const paymentFlowMap: { [key: string]: PaymentFlow } = {
        "TWO_STEP": PaymentFlow.TWO_STEP,
        "ELICITATION": PaymentFlow.ELICITATION,
        "PROGRESS": PaymentFlow.PROGRESS
    };
    const paymentFlow = paymentFlowMap[paymentFlowStr] || PaymentFlow.ELICITATION;

    installPayMCP(server, {
        providers,
        paymentFlow,
    });

    // Mock tool for testing - doesn't hit OpenAI API
    server.registerTool(
        "generate_mock",
        {
            title: "Mock Image Generator",
            description: "Generates mock responses without hitting OpenAI API. Use for testing payment flows.",
            // @ts-ignore - PayMCP adds price field
            inputSchema: { prompt: z.string() },
            price: { amount: 0.50, currency: "USD" }
        },
        async ({ prompt }: { prompt: string }) => {
            const mockResponses = [
                "🎨 Mock: Generated beautiful artwork for '" + prompt + "'",
                "🖼️ Mock: Created stunning image based on your prompt",
                "✨ Mock: AI-generated masterpiece ready!",
                "🎭 Mock: Your creative vision has been realized",
                "🌟 Mock: Image generation complete (simulated)"
            ];

            return {
                content: [
                    {
                        type: "text",
                        text: mockResponses[Math.floor(Math.random() * mockResponses.length)]
                    }
                ]
            };
        },
    );

    server.registerTool(
        "generate",
        {
            title: "Image Generator",
            description: "Generates high-quality image and returns it as MCP resource",
            // @ts-ignore - PayMCP adds price field
            inputSchema: { prompt: z.string() } ,
            price: {amount: 2, currency: "USD"}
        },
        async ({ prompt }: { prompt: string }, _extra: any) => { //important to have 'extra' even if you don't use it in your logic
            const base64 = await generateImage(prompt);
            return {
                content: [
                    {
                        "type": "image",
                        "data": base64,
                        "mimeType": "image/png",
                        "annotations": {
                            "audience": ["user"],
                            "priority": 0.9
                        }
                    }
                ],
            };
        },
    );

    return server
}