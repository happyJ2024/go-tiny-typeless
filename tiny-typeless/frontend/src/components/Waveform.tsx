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

    const getAmplifiedLevel = (rawLevel: number) => {
        // Lift lower levels and apply stronger gain so speech movement is visible.
        const normalized = Math.min(Math.max(rawLevel, 0), 1);
        const lifted = Math.pow(normalized, 0.55);
        return Math.min(1, lifted * 1.75);
    };

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
                    const amplified = getAmplifiedLevel(level);
                    const amplitude = amplified * centerY * 0.95;
                    const y = centerY - amplitude;

                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();

                // Draw mirrored filled area around baseline for a more obvious waveform.
                ctx.fillStyle = `hsla(${hueRef.current}, 80%, 50%, 0.1)`;
                ctx.beginPath();

                historyRef.current.forEach((level, index) => {
                    const amplitude = getAmplifiedLevel(level) * centerY * 0.95;
                    const yTop = centerY - amplitude;

                    if (index === 0) {
                        ctx.moveTo(index, yTop);
                    } else {
                        ctx.lineTo(index, yTop);
                    }
                });

                for (let i = historyRef.current.length - 1; i >= 0; i -= 1) {
                    const amplitude = getAmplifiedLevel(historyRef.current[i]) * centerY * 0.95;
                    const yBottom = centerY + amplitude;
                    ctx.lineTo(i, yBottom);
                }

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
                const peakAmplitude = getAmplifiedLevel(audioLevel.peak) * centerY * 0.95;
                const peakYTop = centerY - peakAmplitude;
                const peakYBottom = centerY + peakAmplitude;
                ctx.beginPath();
                ctx.moveTo(0, peakYTop);
                ctx.lineTo(width, peakYTop);
                ctx.moveTo(0, peakYBottom);
                ctx.lineTo(width, peakYBottom);
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
        />
    );
};
