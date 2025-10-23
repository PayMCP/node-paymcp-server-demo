
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { installPayMCP } from 'paymcp';
import { loadProvidersConfig, convertKeysToCamelCase } from "./config.js";

// Build identifier for version tracking
const BUILD_TIMESTAMP = Date.now();

// Define PaymentFlow enum locally since paymcp types aren't resolving properly
enum PaymentFlow {
    ELICITATION = "ELICITATION",
    TWO_STEP = "TWO_STEP",
    PROGRESS = "PROGRESS",
    OOB = "OOB",
    DYNAMIC_TOOLS = "DYNAMIC_TOOLS"
}

export const getMCPServer = () => {
    // Create server instance
    const server = new McpServer({
        name: "Node Server Demo with PayMCP",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {
                listChanged: true  // Enable tools.listChanged for LIST_CHANGE flow
            },
            experimental: {
                elicitation: { enabled: true }  // Enable elicitation capability for ELICITATION flow
            }
        },
    });

    // Patch: Ensure experimental capabilities are properly registered
    // The MCP SDK's McpServer might not forward experimental capabilities correctly
    // so we need to explicitly register them after server creation
    try {
        server.server.registerCapabilities({
            experimental: {
                elicitation: { enabled: true }
            }
        });
        console.log("✅ Registered elicitation capability in experimental");
    } catch (error) {
        console.log("⚠️ Could not register experimental capabilities:", error);
    }

    // Load everything from providers.json
    const config = loadProvidersConfig();
    const allProviders = convertKeysToCamelCase(config.availableProviders);
    const activeProvider = config.activeProvider || 'stripe';
    const activeFlow = config.activeFlow || 'two_step';

    // Filter to only the active provider
    const providers: any = {};
    if (allProviders[activeProvider]) {
        providers[activeProvider] = allProviders[activeProvider];
        console.log(`✅ Active provider: ${activeProvider}`);
        console.log(`✅ Active flow: ${activeFlow}`);
    } else if (Object.keys(allProviders).length > 0) {
        // Fallback to first available provider
        const firstProvider = Object.keys(allProviders)[0];
        providers[firstProvider] = allProviders[firstProvider];
        console.log(`⚠️ Provider '${activeProvider}' not found, using '${firstProvider}'`);
        console.log(`✅ Active flow: ${activeFlow}`);
    } else {
        console.error('❌ No payment providers configured');
    }

    // Map flow string to enum
    const flowMap: { [key: string]: PaymentFlow } = {
        'elicitation': PaymentFlow.ELICITATION,
        'two_step': PaymentFlow.TWO_STEP,
        'progress': PaymentFlow.PROGRESS,
        'dynamic_tools': PaymentFlow.DYNAMIC_TOOLS
    };

    const flow = flowMap[activeFlow] || PaymentFlow.TWO_STEP;

    installPayMCP(server, {
        providers: providers,
        paymentFlow: flow as any,  // Cast to workaround type resolution issue
    });

    server.registerTool(
        "generate_mock",
        {
            title: "Mock Generator",
            description: "Generates a static joke about the given topic - for testing payment flows",
            inputSchema: { topic: z.string() },
            price: {amount: 0.01, currency: "USD"}
        } as any,
        async ({ topic }, extra) => {
            // Return static joke for predictable testing
            const joke = `Why did the ${topic} cross the road? To get to the other side!`;
            console.log(`[generate_mock] Called with topic=${topic}, returning joke: ${joke}`);

            return {
                content: [
                    {
                        "type": "text",
                        "text": JSON.stringify({
                            joke: joke,
                            topic: topic,
                            disclaimer: "This is a mock response for testing PayMCP payments"
                        }, null, 2)
                    }
                ],
            };
        },
    );

    // Add configuration view tool
    server.registerTool(
        "view_config",
        {
            title: "View Payment Configuration",
            description: "View current payment provider and flow configuration",
            inputSchema: {}
        },
        async () => {
            const currentConfig = loadProvidersConfig();

            return {
                content: [
                    {
                        type: "text",
                        text: `📋 **Current Payment Configuration**\n\n` +
                             `🔧 **Active Provider**: ${currentConfig.activeProvider || 'none'}\n` +
                             `🔄 **Active Flow**: ${currentConfig.activeFlow || 'none'}\n\n` +
                             `📦 **Available Providers**: ${Object.keys(currentConfig.availableProviders).join(', ') || 'none'}\n` +
                             `⚡ **Available Flows**: ${currentConfig.availableFlows?.join(', ') || 'none'}\n\n` +
                             `💡 To change provider/flow, edit providers.json and restart the server.`
                    }
                ]
            };
        }
    );

    // Add PayMCP version check tool
    server.registerTool(
        "check_paymcp_version",
        {
            title: "Check PayMCP Version",
            description: "Get paymcp-ts build hash and version information to verify which code is running",
            inputSchema: {}
        },
        async () => {
            return {
                content: [
                    {
                        type: "text",
                        text: `🔖 **Node.js Server Build Information**\n\n` +
                             `🔨 **Build Timestamp**: ${BUILD_TIMESTAMP}\n` +
                             `⏰ **Build Date**: ${new Date(BUILD_TIMESTAMP).toISOString()}\n\n` +
                             `💡 This timestamp changes every time the server is built.\n` +
                             `Use this to verify you're running the latest code.`
                    }
                ]
            };
        }
    );

    return server
}
