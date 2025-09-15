// API Configuration for AI Services

export interface APIConfig {
  openai?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  anthropic?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  custom?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'custom' | 'mock';
  config: APIConfig;
  fallbackToMock?: boolean;
}

// Default configuration
export const defaultAPIConfig: AIServiceConfig = {
  provider: 'mock', // Default to mock for development
  config: {
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini'
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-sonnet-20240229'
    },
    custom: {
      baseUrl: 'http://localhost:3000/api',
      model: 'custom-model'
    }
  },
  fallbackToMock: true
};

// Environment-based configuration
export const getAPIConfig = (): AIServiceConfig => {
  const config = { ...defaultAPIConfig };

  // Check for environment variables - only OpenAI supported for now
  if (process.env.REACT_APP_OPENAI_API_KEY) {
    config.provider = 'openai';
    config.config.openai!.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  }

  // Commented out other services for now
  /*
  if (process.env.REACT_APP_ANTHROPIC_API_KEY) {
    console.log('🔑 Found Anthropic API key in environment variables');
    config.provider = 'anthropic';
    config.config.anthropic!.apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  }

  if (process.env.REACT_APP_CUSTOM_API_KEY) {
    console.log('🔑 Found Custom API key in environment variables');
    config.provider = 'custom';
    config.config.custom!.apiKey = process.env.REACT_APP_CUSTOM_API_KEY;
    if (process.env.REACT_APP_CUSTOM_API_URL) {
      config.config.custom!.baseUrl = process.env.REACT_APP_CUSTOM_API_URL;
    }
  }
  */

  // Check localStorage for user-configured keys (only if no env vars are set)
  const hasEnvVars = process.env.REACT_APP_OPENAI_API_KEY;
                    // process.env.REACT_APP_ANTHROPIC_API_KEY || 
                    // process.env.REACT_APP_CUSTOM_API_KEY;
                    
  if (!hasEnvVars) {
    try {
      const storedConfig = localStorage.getItem('ai-api-config');
      if (storedConfig) {
        const userConfig = JSON.parse(storedConfig);
        if (userConfig.provider && userConfig.config) {
          config.provider = userConfig.provider;
          config.config = { ...config.config, ...userConfig.config };
        }
      }
    } catch (error) {
      console.warn('Failed to load stored API configuration:', error);
    }
  }


  return config;
};

// Save configuration to localStorage
export const saveAPIConfig = (config: AIServiceConfig): void => {
  try {
    localStorage.setItem('ai-api-config', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save API configuration:', error);
  }
};

// Validate API key format - only OpenAI supported for now
export const validateAPIKey = (apiKey: string, provider: string): boolean => {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  // Only OpenAI validation for now
  if (provider === 'openai') {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }
  
  // Commented out other providers
  /*
  case 'anthropic':
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  case 'custom':
    return apiKey.length > 10; // Basic validation for custom keys
  */
  
  // Default to false for unsupported providers
  return false;
};

// Get current API status
export const getAPIStatus = (config: AIServiceConfig): {
  hasValidKey: boolean;
  provider: string;
  isConfigured: boolean;
} => {
  const currentConfig = config || getAPIConfig();
  
  let hasValidKey = false;
  
  switch (currentConfig.provider) {
    case 'openai':
      hasValidKey = currentConfig.config.openai?.apiKey ? 
        validateAPIKey(currentConfig.config.openai.apiKey, 'openai') : false;
      break;
    // Commented out other providers for now
    /*
    case 'anthropic':
      hasValidKey = currentConfig.config.anthropic?.apiKey ? 
        validateAPIKey(currentConfig.config.anthropic.apiKey, 'anthropic') : false;
      break;
    case 'custom':
      hasValidKey = currentConfig.config.custom?.apiKey ? 
        validateAPIKey(currentConfig.config.custom.apiKey, 'custom') : false;
      break;
    */
    case 'mock':
      hasValidKey = true; // Mock always works
      break;
    default:
      hasValidKey = false; // Unsupported providers
      break;
  }

  return {
    hasValidKey,
    provider: currentConfig.provider,
    isConfigured: hasValidKey || (currentConfig.fallbackToMock ?? true)
  };
};
