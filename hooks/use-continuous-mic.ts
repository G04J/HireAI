'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type ContinuousMicState = 'idle' | 'requesting' | 'active' | 'error';
export type ListeningPhase = 'idle' | 'waiting' | 'listening' | 'capturing';

type SegmentCallback = (blob: Blob) => void;

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION_MS = 3000;
const MIN_SPEECH_DURATION_MS = 2000;
const MAX_ANSWER_DURATION_MS = 180_000;

export function useContinuousMic() {
  const [state, setState] = useState<ContinuousMicState>('idle');
  const [listeningPhase, setListeningPhase] = useState<ListeningPhase>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speechDuration, setSpeechDuration] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onSegmentRef = useRef<SegmentCallback | null>(null);

  const phaseRef = useRef<ListeningPhase>('idle');
  const mutedRef = useRef(false);
  const speechStartedRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);
  const silenceStartRef = useRef(0);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturingRef = useRef(false);

  useEffect(() => { phaseRef.current = listeningPhase; }, [listeningPhase]);
  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

  const doCapture = useCallback(() => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    setListeningPhase('capturing');
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (speechTimerRef.current) { clearInterval(speechTimerRef.current); speechTimerRef.current = null; }
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const tick = useCallback(() => {
    const a = analyserRef.current;
    if (!a) return;

    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    setAudioLevel(rms);

    const phase = phaseRef.current;
    if ((phase === 'waiting' || phase === 'listening') && !mutedRef.current) {
      const speaking = rms > SILENCE_THRESHOLD;
      const now = Date.now();

      if (speaking) {
        if (!speechStartedRef.current) {
          speechStartedRef.current = true;
          speechStartTimeRef.current = now;
          setListeningPhase('listening');
        }
        lastSpeechTimeRef.current = now;
        silenceStartRef.current = 0;
      } else if (speechStartedRef.current) {
        if (!silenceStartRef.current) silenceStartRef.current = now;
        const spoke = lastSpeechTimeRef.current - speechStartTimeRef.current;
        const silent = now - silenceStartRef.current;
        if (spoke >= MIN_SPEECH_DURATION_MS && silent >= SILENCE_DURATION_MS) {
          doCapture();
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [doCapture]);

  const init = useCallback(async () => {
    try {
      setState('requesting');
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      src.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;

      setState('active');
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access failed');
      setState('error');
    }
  }, [tick]);

  const destroy = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.ondataavailable = null;
      rec.onstop = null;
      try { rec.stop(); } catch {}
    }
    ctxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setState('idle');
    setListeningPhase('idle');
  }, []);

  const mute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
    setIsMuted(true);
  }, []);

  const unmute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = true; });
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (mutedRef.current) unmute(); else mute();
  }, [mute, unmute]);

  const beginListening = useCallback((onSegment: SegmentCallback) => {
    onSegmentRef.current = onSegment;
    capturingRef.current = false;
    speechStartedRef.current = false;
    speechStartTimeRef.current = 0;
    lastSpeechTimeRef.current = 0;
    silenceStartRef.current = 0;
    setSpeechDuration(0);
    chunksRef.current = [];

    const stream = streamRef.current;
    if (!stream) return;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    const rec = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      onSegmentRef.current?.(blob);
    };

    rec.start(250);
    setListeningPhase('waiting');

    maxTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'waiting' || phaseRef.current === 'listening') doCapture();
    }, MAX_ANSWER_DURATION_MS);

    speechTimerRef.current = setInterval(() => {
      if (speechStartedRef.current) {
        setSpeechDuration(Math.floor((Date.now() - speechStartTimeRef.current) / 1000));
      }
    }, 500);
  }, [doCapture]);

  const cancelListening = useCallback(() => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.ondataavailable = null;
      rec.onstop = null;
      try { rec.stop(); } catch {}
    }
    capturingRef.current = false;
    setListeningPhase('idle');
    setSpeechDuration(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    state, listeningPhase, isMuted, audioLevel, error, speechDuration,
    init, destroy, mute, unmute, toggleMute, beginListening, cancelListening,
  };
}
