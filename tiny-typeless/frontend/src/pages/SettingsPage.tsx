import { useState, useEffect, useCallback } from 'react';
import { GetSettings, ResetStatistics, SaveSettings, TestProxyConnection } from '../../wailsjs/go/main/App';
import { getStatistics } from '../lib/backend';

interface Settings {
    provider: string;
    api_key: string;
    model: string;
    proxy: string;
}

interface UsageStatistics {
    last_transcription_tokens: number;
    total_transcription_tokens: number;
}

interface ModelPricing {
    [model: string]: number;
}

type SettingsTab = 'ai-provider' | 'network' | 'about' | 'statistic';

const MODEL_OPTIONS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

const DEFAULT_PRICING: ModelPricing = {
    'gemini-2.0-flash': 0.35,
    'gemini-1.5-flash': 0.35,
    'gemini-1.5-pro': 3.5
};

const PRICING_STORAGE_KEY = 'tiny-typeless-model-pricing-v1';

const SettingsPage = () => {
    const [settings, setSettings] = useState<Settings>({
        provider: 'gemini',
        api_key: '',
        model: 'gemini-2.0-flash',
        proxy: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingProxy, setIsTestingProxy] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai-provider');
    const [stats, setStats] = useState<UsageStatistics>({
        last_transcription_tokens: 0,
        total_transcription_tokens: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isResettingStats, setIsResettingStats] = useState(false);
    const [modelPricing, setModelPricing] = useState<ModelPricing>(DEFAULT_PRICING);

    useEffect(() => {
        // Load settings on component mount
        LoadSettings();
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PRICING_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as ModelPricing;
            setModelPricing({
                ...DEFAULT_PRICING,
                ...parsed
            });
        } catch (error) {
            console.warn('Failed to load model pricing from localStorage', error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(modelPricing));
    }, [modelPricing]);

    const loadStatistics = useCallback(async () => {
        try {
            setIsLoadingStats(true);
            const usage = await getStatistics();
            setStats(usage);
        } catch (error) {
            console.error('Failed to load usage statistics:', error);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'statistic') {
            loadStatistics();
        }
    }, [activeTab, loadStatistics]);

    const LoadSettings = async () => {
        try {
            const loaded = await GetSettings();
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setIsSaving(true);
            setMessage('');
            setMessageType('');

            const proxy = settings.proxy.trim();
            if (proxy) {
                const testResult = await TestProxyConnection(proxy);
                console.info('Proxy pre-check passed', testResult);
            }

            await SaveSettings(settings);
            console.info('Settings saved', {
                provider: settings.provider,
                model: settings.model,
                proxyEnabled: Boolean(settings.proxy)
            });
            setMessage('Settings saved successfully!');
            setMessageType('success');

            // Clear message after 3 seconds
            setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 3000);
        } catch (error: any) {
            console.error('Failed to save settings', error);
            setMessage(error.message || 'Failed to save settings');
            setMessageType('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestProxyConnection = async () => {
        const proxy = settings.proxy.trim();
        if (!proxy) {
            setMessage('Please enter a proxy URL first');
            setMessageType('error');
            return;
        }

        try {
            setIsTestingProxy(true);
            setMessage('');
            setMessageType('');

            const result = await TestProxyConnection(proxy);
            console.info('Proxy connection test successful', result);
            setMessage(result);
            setMessageType('success');
        } catch (error: any) {
            console.error('Proxy connection test failed', error);
            setMessage(error.message || 'Proxy connection test failed');
            setMessageType('error');
        } finally {
            setIsTestingProxy(false);
        }
    };

    const handleResetStatistics = async () => {
        const confirmed = window.confirm('Reset token statistics and estimated cost totals to zero?');
        if (!confirmed) {
            return;
        }

        try {
            setIsResettingStats(true);
            setMessage('');
            setMessageType('');

            await ResetStatistics();
            await loadStatistics();

            setMessage('Statistics reset successfully.');
            setMessageType('success');
        } catch (error: any) {
            console.error('Failed to reset statistics', error);
            setMessage(error.message || 'Failed to reset statistics');
            setMessageType('error');
        } finally {
            setIsResettingStats(false);
        }
    };

    const updateModelPrice = (model: string, value: string) => {
        const numeric = Number(value);
        setModelPricing((prev) => ({
            ...prev,
            [model]: Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
        }));
    };

    const getEstimatedCost = (tokens: number): number => {
        const pricePerMillion = modelPricing[settings.model] ?? 0;
        return (tokens / 1_000_000) * pricePerMillion;
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h1>Settings</h1>

                <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
                    <button
                        type="button"
                        role="tab"
                        className={`settings-tab ${activeTab === 'ai-provider' ? 'active' : ''}`}
                        aria-selected={activeTab === 'ai-provider'}
                        onClick={() => setActiveTab('ai-provider')}
                    >
                        AI Provider
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`settings-tab ${activeTab === 'network' ? 'active' : ''}`}
                        aria-selected={activeTab === 'network'}
                        onClick={() => setActiveTab('network')}
                    >
                        Network
                    </button>                  
                    <button
                        type="button"
                        role="tab"
                        className={`settings-tab ${activeTab === 'statistic' ? 'active' : ''}`}
                        aria-selected={activeTab === 'statistic'}
                        onClick={() => setActiveTab('statistic')}
                    >
                        Statistic
                    </button>
                      <button
                        type="button"
                        role="tab"
                        className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
                        aria-selected={activeTab === 'about'}
                        onClick={() => setActiveTab('about')}
                    >
                        About
                    </button>
                </div>

                <form className="settings-form">
                    {activeTab === 'ai-provider' && (
                        <div className="settings-tab-panel" role="tabpanel">
                            <div className="form-group">
                                <label htmlFor="provider">AI Provider</label>
                                <select
                                    id="provider"
                                    value={settings.provider}
                                    onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                                    disabled
                                    className="input-field"
                                >
                                    <option value="gemini">Google Gemini</option>
                                </select>
                                <small>Currently only Google Gemini is supported</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="model">Model</label>
                                <select
                                    id="model"
                                    value={settings.model}
                                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="apikey">Google API Key</label>
                                <input
                                    id="apikey"
                                    type="password"
                                    placeholder="Enter your Google API key"
                                    value={settings.api_key}
                                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                                    className="input-field"
                                />
                                <small>
                                    Get your API key from{' '}
                                    <a href="https://ai.google.dev/tutorials/setup" target="_blank" rel="noopener noreferrer">
                                        Google AI Studio
                                    </a>
                                </small>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save AI Provider Settings'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'network' && (
                        <div className="settings-tab-panel" role="tabpanel">
                            <div className="form-group">
                                <label htmlFor="proxy">Network Proxy</label>
                                <input
                                    id="proxy"
                                    type="text"
                                    placeholder="http://127.0.0.1:7890"
                                    value={settings.proxy}
                                    onChange={(e) => setSettings({ ...settings, proxy: e.target.value })}
                                    className="input-field"
                                />
                                <small>
                                    Optional. If configured, backend network requests such as Gemini API calls will use this proxy.
                                </small>
                                <div className="proxy-test-action">
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={handleTestProxyConnection}
                                        disabled={isTestingProxy}
                                    >
                                        {isTestingProxy ? 'Testing...' : 'Test Proxy Connection'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Network Settings'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="settings-tab-panel settings-info" role="tabpanel">
                            <h3>About Tiny Typeless</h3>
                            <p>
                                Tiny Typeless is a minimal audio transcription tool that uses Google's Gemini AI to convert
                                your spoken words into text.
                            </p>
                            <p>
                                The application records audio locally and then sends the captured data to your configured
                                model for transcription.
                            </p>
                            <p>
                                Configure your provider settings and optional proxy, then start recording from the main page.
                            </p>
                        </div>
                    )}

                    {activeTab === 'statistic' && (
                        <div className="settings-tab-panel" role="tabpanel">
                            <h3>Usage Statistics</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Last transcription tokens</div>
                                    <div className="stat-value">{stats.last_transcription_tokens.toLocaleString()}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Total transcription tokens</div>
                                    <div className="stat-value">{stats.total_transcription_tokens.toLocaleString()}</div>
                                </div>
                                <div className="stat-card stat-card-accent">
                                    <div className="stat-label">Estimated cost (last)</div>
                                    <div className="stat-value">${getEstimatedCost(stats.last_transcription_tokens).toFixed(6)}</div>
                                    <div className="stat-footnote">Based on {settings.model} price.</div>
                                </div>
                                <div className="stat-card stat-card-accent">
                                    <div className="stat-label">Estimated cost (total)</div>
                                    <div className="stat-value">${getEstimatedCost(stats.total_transcription_tokens).toFixed(6)}</div>
                                    <div className="stat-footnote">Approximation using current model price.</div>
                                </div>
                            </div>

                            <div className="pricing-panel">
                                <h4>Model Pricing (USD per 1M tokens)</h4>
                                <div className="pricing-grid">
                                    {MODEL_OPTIONS.map((model) => (
                                        <label key={model} className="pricing-item">
                                            <span>{model}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.0001"
                                                value={modelPricing[model] ?? 0}
                                                onChange={(e) => updateModelPrice(model, e.target.value)}
                                                className="input-field"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={loadStatistics}
                                    disabled={isLoadingStats || isResettingStats}
                                >
                                    {isLoadingStats ? 'Refreshing...' : 'Refresh Statistics'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleResetStatistics}
                                    disabled={isResettingStats || isLoadingStats}
                                >
                                    {isResettingStats ? 'Resetting...' : 'Reset Statistics'}
                                </button>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`message message-${messageType}`}>
                            {messageType === 'success' ? '✓' : '⚠️'} {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
