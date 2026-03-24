import { useEffect, useRef } from 'react';

interface WaveformProps {
    audioLevel: {
        current: number;
        peak: number;
    };
    isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ audioLevel, isRecording }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationIdRef = useRef<number | null>(null);
    const historyRef = useRef<number[]>([]);
    const hueRef = useRef<number>(200); // blue hue

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;

            // Clear canvas with fade effect for motion trail
            ctx.fillStyle = 'rgba(27, 38, 54, 0.8)';
            ctx.fillRect(0, 0, width, height);

            // Add new data point to history
            historyRef.current.push(audioLevel.current);
            if (historyRef.current.length > width) {
                historyRef.current.shift();
            }

            // Update hue slowly for color variation
            hueRef.current = (hueRef.current + 0.5) % 360;

            // Draw waveform
            if (isRecording) {
                ctx.strokeStyle = `hsl(${hueRef.current}, 80%, 50%)`;
                ctx.lineWidth = 2;
                ctx.beginPath();

                historyRef.current.forEach((level, index) => {
                    const x = index;
                    const amplitude = level * centerY * 0.8;
                    const y = centerY - amplitude;

                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();

                // Draw filled area
                ctx.strokeStyle = `hsla(${hueRef.current}, 80%, 50%, 0.3)`;
                ctx.fillStyle = `hsla(${hueRef.current}, 80%, 50%, 0.1)`;
                ctx.lineTo(width, centerY);
                ctx.lineTo(0, centerY);
                ctx.closePath();
                ctx.fill();
            } else {
                // Draw baseline when not recording
                ctx.strokeStyle = 'rgba(100, 120, 140, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                ctx.lineTo(width, centerY);
                ctx.stroke();

                // Draw idle animation
                const time = Date.now() / 1000;
                for (let i = 0; i < width; i += 20) {
                    const y = centerY + Math.sin(time + i / 30) * 10;
                    ctx.fillStyle = `rgba(100, 120, 140, ${0.2 + Math.sin(time + i / 30) * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(i, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw peak indicator
            if (audioLevel.peak > 0) {
                ctx.strokeStyle = `hsla(${hueRef.current}, 100%, 60%, 0.8)`;
                ctx.lineWidth = 2;
                const peakY = centerY - audioLevel.peak * centerY * 0.8;
                ctx.beginPath();
                ctx.moveTo(0, peakY);
                ctx.lineTo(width, peakY);
                ctx.stroke();
            }

            animationIdRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [audioLevel, isRecording]);

    return (
        <canvas
            ref={canvasRef}
            className="waveform-canvas"
            style={{
                width: '100%',
                height: '200px',
                display: 'block',
                borderRadius: '8px',
                background: 'rgba(27, 38, 54, 0.5)',
                border: '1px solid rgba(100, 120, 140, 0.3)'
            }}
        />
    );
};
