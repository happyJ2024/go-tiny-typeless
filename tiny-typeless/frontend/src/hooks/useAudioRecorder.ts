import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioLevel {
    current: number;
    peak: number;
}

interface UseAudioRecorderReturn {
    isRecording: boolean;
    audioLevel: AudioLevel;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    cancelRecording: () => void;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState<AudioLevel>({ current: 0, peak: 0 });
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const mimeTypeRef = useRef<string>('audio/webm');

    const pickSupportedMimeType = (): string | undefined => {
        const preferred = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/ogg'
        ];

        for (const type of preferred) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return undefined;
    };

    // Update audio level visualization
    const updateAudioLevel = useCallback(() => {
        if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
            
            const sum = Array.from(dataArrayRef.current).reduce((a, b) => a + b, 0);
            const average = sum / dataArrayRef.current.length;
            const current = Math.min(average / 255, 1);
            
            setAudioLevel(prev => ({
                current,
                peak: Math.max(prev.peak, current)
            }));
        }
        
        animationIdRef.current = requestAnimationFrame(updateAudioLevel);
    }, []);

    useEffect(() => {
        if (isRecording) {
            updateAudioLevel();
        }
        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [isRecording, updateAudioLevel]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });
            
            streamRef.current = stream;
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
            
            const chosenMimeType = pickSupportedMimeType();
            const mediaRecorder = chosenMimeType
                ? new MediaRecorder(stream, { mimeType: chosenMimeType })
                : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mimeTypeRef.current = mediaRecorder.mimeType || chosenMimeType || 'audio/webm';
            chunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                chunksRef.current.push(event.data);
            };
            
            setAudioLevel({ current: 0, peak: 0 });
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
                chunksRef.current = [];
                
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
                
                setIsRecording(false);
                resolve(audioBlob);
            };
            
            mediaRecorder.stop();
        });
    }, []);

    const cancelRecording = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        
        chunksRef.current = [];
        setIsRecording(false);
        setAudioLevel({ current: 0, peak: 0 });
    }, []);

    return {
        isRecording,
        audioLevel,
        startRecording,
        stopRecording,
        cancelRecording
    };
};

