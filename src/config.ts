import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProviderConfig {
    [key: string]: any;
}

export interface ProvidersConfig {
    activeProvider?: string;
    activeFlow?: 'elicitation' | 'two_step' | 'progress' | 'dynamic_tools' | 'resubmit';
    availableFlows?: string[];
    availableProviders: {
        [name: string]: ProviderConfig;
    };
}

/**
 * Load providers configuration from providers.json
 * Substitutes environment variables marked as ${VAR_NAME}
 */
export function loadProvidersConfig(): ProvidersConfig {
    const configPath = path.join(__dirname, '..', 'providers.json');

    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent) as ProvidersConfig;

        // Process providers to substitute environment variables
        const processedProviders: { [name: string]: ProviderConfig } = {};

        for (const [providerName, providerConfig] of Object.entries(config.availableProviders || {})) {
            const processedConfig: ProviderConfig = {};

            for (const [key, value] of Object.entries(providerConfig)) {
                if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
                    // Extract environment variable name
                    const envVarName = value.slice(2, -1);
                    const envValue = process.env[envVarName];

                    if (!envValue) {
                        console.warn(`⚠️ Environment variable ${envVarName} not found for provider ${providerName}`);
                        continue; // Skip this provider if env var is missing
                    }

                    processedConfig[key] = envValue;
                } else {
                    processedConfig[key] = value;
                }
            }

            // Only add provider if it has valid configuration
            if (Object.keys(processedConfig).length > 0) {
                processedProviders[providerName] = processedConfig;
            }
        }

        return {
            activeProvider: config.activeProvider,
            activeFlow: config.activeFlow,
            availableFlows: config.availableFlows,
            availableProviders: processedProviders
        };
    } catch (error) {
        console.error('Error loading providers.json:', error);
        // Return empty config if file doesn't exist or is invalid
        return { availableProviders: {} };
    }
}

/**
 * Convert snake_case keys to camelCase for TypeScript compatibility
 */
export function convertKeysToCamelCase(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = convertKeysToCamelCase(value);
    }
    return result;
}

