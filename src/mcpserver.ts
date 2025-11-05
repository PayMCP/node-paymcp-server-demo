
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { installPayMCP, Mode } from 'paymcp';
import { generateImage } from "./services/openai.js";


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

    installPayMCP(server, {
        providers: { 
            //"walleot": { apiKey: process.env.WALLEOT_API_KEY ?? "" } //Uncomment to use walleot
            "stripe": { apiKey: process.env.STRIPE_SECRET_KEY ?? "" } 
        },
        mode: Mode.ELICITATION,
    });

    server.registerTool(
        "generate",
        {
            title: "Image Generator",
            description: "Generates high-quality image and returns it as MCP resource",
            // @ts-ignore
            inputSchema: { prompt: z.string() } ,
            price: {amount: 2, currency: "USD"}
        },
        async ({ prompt }, extra) => { //important to have 'extra' even if you don't use it in your logic
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