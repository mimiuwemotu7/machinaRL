import React, { useState, useEffect } from 'react';
import { 
  getAPIConfig, 
  saveAPIConfig, 
  validateAPIKey, 
  getAPIStatus,
  type AIServiceConfig,
  type APIConfig 
} from '../ai/config/apiConfig';
import { Eye, EyeOff } from 'lucide-react';

interface AIConfigPanelProps {
  onConfigChange?: (config: AIServiceConfig) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({
  onConfigChange,
  isOpen = false,
  onClose
}) => {
  const [config, setConfig] = useState<AIServiceConfig>(getAPIConfig());
  const [tempConfig, setTempConfig] = useState<APIConfig>(config.config);
  const [selectedProvider, setSelectedProvider] = useState<string>(config.provider);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfig(getAPIConfig());
    setTempConfig(getAPIConfig().config);
    setSelectedProvider(getAPIConfig().provider);
  }, [isOpen]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setValidationErrors({});
  };

  const handleApiKeyChange = (provider: string, apiKey: string) => {
    setTempConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof APIConfig],
        apiKey
      }
    }));

    // Validate API key
    if (apiKey && !validateAPIKey(apiKey, provider)) {
      setValidationErrors(prev => ({
        ...prev,
        [`${provider}-key`]: `Invalid ${provider} API key format`
      }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${provider}-key`];
        return newErrors;
      });
    }
  };

  const handleBaseUrlChange = (provider: string, baseUrl: string) => {
    setTempConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof APIConfig],
        baseUrl
      }
    }));
  };

  const handleModelChange = (provider: string, model: string) => {
    setTempConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof APIConfig],
        model
      }
    }));
  };

  const handleSave = () => {
    const newConfig: AIServiceConfig = {
      provider: selectedProvider as any,
      config: tempConfig,
      fallbackToMock: true
    };

    saveAPIConfig(newConfig);
    setConfig(newConfig);
    onConfigChange?.(newConfig);
    onClose?.();
  };

  const handleReset = () => {
    const defaultConfig = getAPIConfig();
    setConfig(defaultConfig);
    setTempConfig(defaultConfig.config);
    setSelectedProvider(defaultConfig.provider);
    setValidationErrors({});
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const getCurrentApiKey = (provider: string): string => {
    return tempConfig[provider as keyof APIConfig]?.apiKey || '';
  };

  const getCurrentBaseUrl = (provider: string): string => {
    return tempConfig[provider as keyof APIConfig]?.baseUrl || '';
  };

  const getCurrentModel = (provider: string): string => {
    return tempConfig[provider as keyof APIConfig]?.model || '';
  };

  const apiStatus = getAPIStatus(config);

  if (!isOpen) return null;

  return (
    <div className="ai-config-overlay">
      <div className="ai-config-panel">
        <div className="ai-config-header">
          <h2>AI Configuration</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ai-config-content">
          {/* Current Status */}
          <div className="config-status">
            <h3>Current Status</h3>
            <div className="status-info">
              <span className={`status-indicator ${apiStatus.hasValidKey ? 'active' : 'inactive'}`}></span>
              <span>Provider: {apiStatus.provider}</span>
              <span className={apiStatus.hasValidKey ? 'status-valid' : 'status-invalid'}>
                {apiStatus.hasValidKey ? 'Configured' : 'Not Configured'}
              </span>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="config-section">
            <h3>AI Provider</h3>
            <div className="provider-options">
              {[
                { value: 'mock', label: 'Mock (Development)', description: 'Simulated responses for testing' },
                { value: 'openai', label: 'OpenAI', description: 'GPT models via OpenAI API' }
                // Commented out other providers for now
                // { value: 'anthropic', label: 'Anthropic', description: 'Claude models via Anthropic API' },
                // { value: 'custom', label: 'Custom', description: 'Your own AI service endpoint' }
              ].map(provider => (
                <label key={provider.value} className="provider-option">
                  <input
                    type="radio"
                    name="provider"
                    value={provider.value}
                    checked={selectedProvider === provider.value}
                    onChange={(e) => handleProviderChange(e.target.value)}
                  />
                  <div className="provider-info">
                    <div className="provider-name">{provider.label}</div>
                    <div className="provider-description">{provider.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API Configuration */}
          {selectedProvider !== 'mock' && (
            <div className="config-section">
              <h3>API Configuration</h3>
              
              {/* OpenAI Configuration */}
              {selectedProvider === 'openai' && (
                <div className="api-config">
                  <div className="config-field">
                    <label>API Key</label>
                    <div className="input-group">
                      <input
                        type={showApiKey.openai ? 'text' : 'password'}
                        value={getCurrentApiKey('openai')}
                        onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                        placeholder="sk-..."
                        className={validationErrors['openai-key'] ? 'error' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility('openai')}
                        className="toggle-visibility"
                      >
                        {showApiKey.openai ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                    {validationErrors['openai-key'] && (
                      <div className="error-message">{validationErrors['openai-key']}</div>
                    )}
                  </div>
                  
                  <div className="config-field">
                    <label>Base URL</label>
                    <input
                      type="text"
                      value={getCurrentBaseUrl('openai')}
                      onChange={(e) => handleBaseUrlChange('openai', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  
                  <div className="config-field">
                    <label>Model</label>
                    <select
                      value={getCurrentModel('openai')}
                      onChange={(e) => handleModelChange('openai', e.target.value)}
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Commented out other providers for now - only OpenAI and Mock supported */}
            </div>
          )}

          {/* Instructions */}
          <div className="config-instructions">
            <h3>Setup Instructions</h3>
            <div className="instructions-content">
              {selectedProvider === 'openai' && (
                <div>
                  <p>1. Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></p>
                  <p>2. Paste your API key above (starts with "sk-")</p>
                  <p>3. Choose your preferred model (GPT-4o Mini recommended)</p>
                </div>
              )}
              {selectedProvider === 'mock' && (
                <div>
                  <p>Mock mode provides simulated AI responses for development and testing.</p>
                  <p>No API key required - responses are generated locally.</p>
                </div>
              )}
              {/* Commented out other providers for now */}
              {/*
              {selectedProvider === 'anthropic' && (
                <div>
                  <p>1. Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></p>
                  <p>2. Paste your API key above (starts with "sk-ant-")</p>
                  <p>3. Choose your preferred Claude model</p>
                </div>
              )}
              {selectedProvider === 'custom' && (
                <div>
                  <p>1. Set up your own AI service endpoint</p>
                  <p>2. Configure the API key and base URL</p>
                  <p>3. Ensure your service follows the expected API format</p>
                </div>
              )}
              */}
            </div>
          </div>
        </div>

        <div className="ai-config-footer">
          <button className="btn-secondary" onClick={handleReset}>Reset</button>
          <button className="btn-primary" onClick={handleSave}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
};

export default AIConfigPanel;
