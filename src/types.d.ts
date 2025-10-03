declare module 'paymcp' {
    export enum PaymentFlow {
        ELICITATION = "ELICITATION",
        TWO_STEP = "TWO_STEP",
        PROGRESS = "PROGRESS",
        OOB = "OOB"
    }

    export interface PayMCPOptions {
        providers: Record<string, any>;
        paymentFlow?: PaymentFlow;
        retrofitExisting?: boolean;
    }

    export interface McpServerLike {
        registerTool(name: string, config: any, handler: (...args: any[]) => Promise<any> | any): any;
        tools?: Map<string, {
            config: any;
            handler: (...args: any[]) => any;
        }>;
    }

    export class PayMCP {
        constructor(server: McpServerLike, opts: PayMCPOptions);
        getServer(): McpServerLike;
        uninstall(): void;
    }

    export function installPayMCP(server: McpServerLike, opts: PayMCPOptions): PayMCP;
}