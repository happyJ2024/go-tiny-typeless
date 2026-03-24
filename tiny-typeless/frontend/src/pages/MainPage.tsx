import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Waveform } from '../components/Waveform';
import { LogConsole } from '../components/LogConsole';
import type { LogEntry } from '../hooks/useAppLogs';
import { TranscribeAudio } from '../../wailsjs/go/main/App';
import { getStatistics } from '../lib/backend';

interface MainPageProps {
    logs: LogEntry[];
    onClearLogs: () => void;
}

const MainPage = ({ logs, onClearLogs }: MainPageProps) => {
    const { isRecording, audioLevel, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
    const [transcriptionText, setTranscriptionText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState('');
    const [lastUsedTokens, setLastUsedTokens] = useState<number | null>(null);

    const refreshStatistics = useCallback(async () => {
        try {
            const stats = await getStatistics();
            setLastUsedTokens(stats.last_transcription_tokens);
        } catch (statsError) {
            console.warn('Failed to load usage statistics', statsError);
        }
    }, []);

    useEffect(() => {
        refreshStatistics();
    }, [refreshStatistics]);

    const handleStartRecording = useCallback(async () => {
        setError('');
        try {
            await startRecording();
            console.info('Recording started');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start recording';
            console.error('Failed to start recording', err);
            setError(message);
        }
    }, [startRecording]);

    const handleStopRecording = useCallback(async () => {
        setError('');
        try {
            const audioBlob = await stopRecording();
            
            if (audioBlob) {
                setIsTranscribing(true);
                console.info('Recording stopped, starting transcription');
                
                // Convert blob to base64
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const result = e.target?.result as string;
                        const base64Audio = result.split(',')[1];
                        const mimeType = audioBlob.type || 'audio/webm';
                        const transcription = await TranscribeAudio(base64Audio, mimeType);
                        setTranscriptionText(transcription);
                        await refreshStatistics();
                        console.info('Transcription completed');
                    } catch (err) {
                        const message = err instanceof Error ? err.message : 'Transcription failed';
                        console.error('Transcription failed', err);
                        setError(message);
                    } finally {
                        setIsTranscribing(false);
                    }
                };
                reader.readAsDataURL(audioBlob);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to stop recording';
            console.error('Failed to stop recording', err);
            setError(message);
            setIsTranscribing(false);
        }
    }, [stopRecording]);

    const handleCancelRecording = useCallback(() => {
        cancelRecording();
        console.info('Recording cancelled');
        setError('');
    }, [cancelRecording]);

    const handleCopyText = useCallback(() => {
        if (transcriptionText) {
            navigator.clipboard.writeText(transcriptionText);
            console.info('Transcription copied to clipboard');
        }
    }, [transcriptionText]);

    const handleClearText = useCallback(() => {
        setTranscriptionText('');
        console.info('Transcription text cleared');
    }, []);

    return (
        <div className="main-page">
            <div className="recording-section">
                <h1>Audio Recording</h1>
                
                <Waveform audioLevel={audioLevel} isRecording={isRecording} />
                
                <div className="control-panel">
                    {!isRecording ? (
                        <button 
                            className="btn btn-primary btn-lg"
                            onClick={handleStartRecording}
                            disabled={isTranscribing}
                        >
                            🎤 Start Recording
                        </button>
                    ) : (
                        <div className="recording-controls">
                            <button 
                                className="btn btn-danger btn-lg"
                                onClick={handleStopRecording}
                            >
                                ⏹ Stop Recording
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleCancelRecording}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    )}
                </div>

                {isTranscribing && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Transcribing audio...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}
            </div>

            <div className="transcription-section">
                <div className="transcription-header">
                    <h2>Transcription</h2>
                    <div className="transcription-meta">
                        {lastUsedTokens !== null && (
                            <span className="token-chip">
                                Last: {lastUsedTokens.toLocaleString()} tokens
                            </span>
                        )}
                    {transcriptionText && (
                        <div className="transcription-buttons">
                            <button className="btn btn-sm" onClick={handleCopyText}>
                                📋 Copy
                            </button>
                            <button className="btn btn-sm" onClick={handleClearText}>
                                🗑️ Clear
                            </button>
                        </div>
                    )}
                    </div>
                </div>
                <textarea 
                    className="transcription-textarea"
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    placeholder="Transcribed text will appear here..."
                    readOnly={isTranscribing}
                />
            </div>

            <LogConsole logs={logs} onClear={onClearLogs} />
        </div>
    );
};

export default MainPage;
