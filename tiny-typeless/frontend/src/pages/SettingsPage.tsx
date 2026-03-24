import { useState, useEffect } from 'react';
import { GetSettings, SaveSettings, TestProxyConnection } from '../../wailsjs/go/main/App';

interface Settings {
    provider: string;
    api_key: string;
    model: string;
    proxy: string;
}

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

    useEffect(() => {
        // Load settings on component mount
        LoadSettings();
    }, []);

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

            if (!settings.api_key.trim()) {
                setMessage('API Key cannot be empty');
                setMessageType('error');
                setIsSaving(false);
                return;
            }

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

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h1>Settings</h1>

                <form className="settings-form">
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
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>

                    {message && (
                        <div className={`message message-${messageType}`}>
                            {messageType === 'success' ? '✓' : '⚠️'} {message}
                        </div>
                    )}
                </form>

                <div className="settings-info">
                    <h3>About Tiny Typeless</h3>
                    <p>
                        Tiny Typeless is a minimal audio transcription tool that uses Google's Gemini AI to convert
                        your spoken words into text.
                    </p>
                    <p>
                        The application processes your audio locally and sends it to Google's API for transcription.
                        Make sure you have a valid API key configured.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
