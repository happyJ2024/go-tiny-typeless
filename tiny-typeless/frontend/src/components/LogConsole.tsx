import { useEffect, useRef } from 'react';
import type { LogEntry } from '../hooks/useAppLogs';

interface LogConsoleProps {
    logs: LogEntry[];
    onClear: () => void;
}

export const LogConsole = ({ logs, onClear }: LogConsoleProps) => {
    const bodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <section className="console-section">
            <div className="console-header">
                <div>
                    <h2>Console</h2>
                    <p className="console-subtitle">Frontend and backend logs, warnings, and exceptions</p>
                </div>
                <div className="console-actions">
                    <span className="console-count">{logs.length} entries</span>
                    <button className="btn btn-sm" onClick={onClear}>Clear</button>
                </div>
            </div>
            <div className="console-body" ref={bodyRef}>
                {logs.length === 0 ? (
                    <div className="console-empty">No logs yet.</div>
                ) : (
                    logs.map((entry, index) => (
                        <div className={`console-entry console-entry-${entry.level}`} key={`${entry.timestamp}-${index}`}>
                            <span className="console-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            <span className="console-source">{entry.source}</span>
                            <span className="console-level">{entry.level}</span>
                            <pre className="console-message">{entry.message}</pre>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};
