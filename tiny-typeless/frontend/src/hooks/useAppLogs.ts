import { useCallback, useEffect, useRef, useState } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { GetLogs } from '../../wailsjs/go/main/App';

export interface LogEntry {
    timestamp: string;
    level: string;
    source: string;
    message: string;
}

const MAX_LOGS = 300;

function formatLogValue(value: unknown): string {
    if (value instanceof Error) {
        return value.stack || value.message;
    }

    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function normalizeLogEntry(entry: Partial<LogEntry>): LogEntry {
    return {
        timestamp: entry.timestamp || new Date().toISOString(),
        level: entry.level || 'info',
        source: entry.source || 'frontend',
        message: entry.message || ''
    };
}

export function useAppLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const originalsRef = useRef<Partial<Record<'log' | 'info' | 'warn' | 'error' | 'debug', (...args: unknown[]) => void>>>({});

    const appendLog = useCallback((entry: Partial<LogEntry>) => {
        const normalized = normalizeLogEntry(entry);
        setLogs((previous) => [...previous, normalized].slice(-MAX_LOGS));
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    useEffect(() => {
        GetLogs()
            .then((entries) => {
                setLogs(entries.map((entry) => normalizeLogEntry(entry)).slice(-MAX_LOGS));
            })
            .catch((error) => {
                console.error('Failed to load logs', error);
            });

        const unsubscribe = EventsOn('app:log', (entry: LogEntry) => {
            appendLog(entry);
        });

        return () => {
            unsubscribe();
        };
    }, [appendLog]);

    useEffect(() => {
        const consoleLevels: Array<{ method: 'log' | 'info' | 'warn' | 'error' | 'debug'; level: string }> = [
            { method: 'log', level: 'info' },
            { method: 'info', level: 'info' },
            { method: 'warn', level: 'warning' },
            { method: 'error', level: 'error' },
            { method: 'debug', level: 'debug' }
        ];

        for (const item of consoleLevels) {
            const original = console[item.method].bind(console);
            originalsRef.current[item.method] = original;

            console[item.method] = (...args: unknown[]) => {
                original(...args);
                appendLog({
                    timestamp: new Date().toISOString(),
                    level: item.level,
                    source: 'frontend',
                    message: args.map((arg) => formatLogValue(arg)).join(' ')
                });
            };
        }

        const handleError = (event: ErrorEvent) => {
            appendLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                source: 'frontend',
                message: event.error?.stack || event.message
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            appendLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                source: 'frontend',
                message: `Unhandled rejection: ${formatLogValue(event.reason)}`
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);

            for (const item of consoleLevels) {
                const original = originalsRef.current[item.method];
                if (original) {
                    console[item.method] = original as typeof console[typeof item.method];
                }
            }
        };
    }, [appendLog]);

    return {
        logs,
        clearLogs
    };
}
