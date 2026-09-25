import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWakeWord } from '../context/WakeWordContext';
import { detectPainInText } from '../utils/painDetection';

interface AuraOrbVisualProps {
  userName?: string;
  onNavigateToSettings?: () => void;
  externalActiveTrigger?: boolean;
}

type LiveVoiceName = 'Aoede' | 'Zephyr' | 'Kore' | 'Puck';

export function AuraOrbVisual({
  userName = 'Rajamma',
  onNavigateToSettings,
  externalActiveTrigger,
}: AuraOrbVisualProps) {
  const { aiName, wakeWordEnabled, isListening, triggerWakeWord } = useWakeWord();

  // Read configured voice and language from Settings / localStorage
  const [liveLang, setLiveLang] = useState(() => localStorage.getItem('aura_live_lang') || 'te-IN');
  const [liveVoice, setLiveVoice] = useState<LiveVoiceName>(
    () => (localStorage.getItem('aura_live_voice') as LiveVoiceName) || 'Aoede'
  );

  // Live session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isMicStreaming, setIsMicStreaming] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [statusText, setStatusText] = useState(`GEMINI 3.8 LIVE • TAP OR SAY "HEY ${aiName.toUpperCase()}"`);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [lastModelMessage, setLastModelMessage] = useState<string>('');
  const [wakeBanner, setWakeBanner] = useState<string>('');
  const wakeWordPromptRef = useRef(false);

  // Audio & WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const recognitionRef = useRef<any>(null);

  // Listen for storage changes from Settings tab
  useEffect(() => {
    const handleStorageChange = () => {
      const storedLang = localStorage.getItem('aura_live_lang');
      const storedVoice = localStorage.getItem('aura_live_voice') as LiveVoiceName;
      if (storedLang) setLiveLang(storedLang);
      if (storedVoice) setLiveVoice(storedVoice);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('aura_settings_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('aura_settings_updated', handleStorageChange);
    };
  }, []);

  // React to external trigger (e.g. from floating nav mic)
  useEffect(() => {
    if (externalActiveTrigger !== undefined && externalActiveTrigger !== isSessionActive) {
      if (externalActiveTrigger) {
        startLiveSession();
      } else {
        stopLiveSession();
      }
    }
  }, [externalActiveTrigger]);

  // Convert Float32 array to 16-bit signed PCM Base64
  const floatTo16BitPCMBase64 = (input: Float32Array): string => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Play 24kHz PCM chunk from Gemini Live
  const play24kHzPcmChunk = useCallback((base64Data: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      const ctx = outputAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      setIsModelSpeaking(true);
      activeSourcesRef.current.push(source);

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx !== -1) {
          activeSourcesRef.current.splice(idx, 1);
        }
        if (activeSourcesRef.current.length === 0) {
          setIsModelSpeaking(false);
        }
      };
    } catch (err) {
      console.warn('Error playing live audio chunk:', err);
    }
  }, []);

  // Interrupt model playback instantly
  const interruptPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsModelSpeaking(false);
  }, []);

  // Start microphone capture & streaming
  const startMicrophone = async () => {
    try {
      interruptPlayback();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;

      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setMicVolume(Math.min(1, rms * 7));

        const base64Pcm = floatTo16BitPCMBase64(inputData);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              audio: base64Pcm,
              mimeType: 'audio/pcm;rate=16000',
            })
          );
        }
      };

      setIsMicStreaming(true);
      setStatusText('🎙️ LISTENING TO YOU LIVE • SPEAK FREELY');
    } catch (err) {
      console.warn('Microphone stream error, fallback speech recognition:', err);
      fallbackSpeechRecognition();
    }
  };

  const stopMicrophone = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {
        // Ignore
      }
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsMicStreaming(false);
    setMicVolume(0);
  };

  // Fallback speech recognition for restricted iframes
  const fallbackSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText('AURA READY • TAP QUICK QUESTION BELOW');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = liveLang;

      recognition.onstart = () => {
        setIsMicStreaming(true);
        setStatusText('🎙️ LISTENING TO YOUR VOICE...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          sendTextMessage(transcript);
        }
      };

      recognition.onerror = () => setIsMicStreaming(false);
      recognition.onend = () => setIsMicStreaming(false);
      recognition.start();
    } catch {
      setIsMicStreaming(false);
    }
  };

  // Start live session directly from Image 2 orb card
  const startLiveSession = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore
      }
    }

    setIsSessionActive(true);
    setConnectionStatus('connecting');
    setStatusText('CONNECTING TO GEMINI 3.8 LIVE API...');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live?voice=${liveVoice}&lang=${liveLang}&userName=${encodeURIComponent(userName)}&aiName=${encodeURIComponent(aiName)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setStatusText(`⚡ ${aiName.toUpperCase()} LIVE ACTIVE • VOICE: ${liveVoice}`);
        startMicrophone();

        if (wakeWordPromptRef.current) {
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'text',
                  text: `Hey ${aiName}, I'm here!`,
                })
              );
            }
          }, 300);
          wakeWordPromptRef.current = false;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ready' || data.type === 'connected') {
            setConnectionStatus('connected');
            setStatusText(`⚡ ${aiName.toUpperCase()} LIVE ACTIVE • ${liveVoice} (${liveLang === 'te-IN' ? 'తెలుగు' : liveLang === 'hi-IN' ? 'हिंदी' : 'English'})`);
          } else if (data.type === 'audio' && data.audio) {
            play24kHzPcmChunk(data.audio);
            setStatusText(`🔊 ${aiName.toUpperCase()} IS SPEAKING VIA GEMINI LIVE (${liveVoice})`);
          } else if (data.type === 'text' && data.text) {
            setLastModelMessage((prev) => `${prev} ${data.text}`.trim());
          } else if (data.type === 'interrupted') {
            interruptPlayback();
            setStatusText('🎙️ LISTENING TO YOU LIVE...');
          } else if (data.type === 'turnComplete') {
            setStatusText(`🎙️ LISTENING • SPEAK ANYTIME OR SAY "HEY ${aiName.toUpperCase()}"`);
          } else if (data.type === 'error') {
            setStatusText(`Notice: ${data.message || 'Live connection note'}`);
          }
        } catch (err) {
          console.warn('Error parsing message from Live WS:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error on live orb:', err);
        setConnectionStatus('error');
        setStatusText('LIVE API CONNECTING... TAP ORB TO RETRY');
      };

      ws.onclose = () => {
        setConnectionStatus('idle');
      };
    } catch (err) {
      console.error('Failed to create WebSocket on live orb:', err);
      setConnectionStatus('error');
      setStatusText('GEMINI 3.8 LIVE • TAP FOR VOICE CALL');
    }
  };

  // Stop live session
  const stopLiveSession = () => {
    stopMicrophone();
    interruptPlayback();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore
      }
      wsRef.current = null;
    }
    setIsSessionActive(false);
    setConnectionStatus('idle');
    setStatusText('GEMINI 3.8 LIVE • TAP FOR VOICE CALL');
  };

  // Send a quick text prompt to Gemini Live API
  const sendTextMessage = (text: string) => {
    if (!text.trim()) return;
    setLastUserMessage(text);
    setLastModelMessage('');
    interruptPlayback();

    // Check if user communicated pain to update the Body Map
    const painCheck = detectPainInText(text);
    if (painCheck && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aura_pain_reported', {
          detail: {
            bodyPart: painCheck.bodyPart,
            label: painCheck.bodyPartLabel,
            symptom: painCheck.symptomSummary,
            rec: painCheck.rec,
            source: 'Aura Voice Orb',
            timestamp: Date.now(),
          },
        })
      );
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        })
      );
      setStatusText('⚡ SENT TO GEMINI 3.8 LIVE... AWAITING VOICE');
    } else {
      // If not connected, start session first and send
      startLiveSession();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'text',
              text: text.trim(),
            })
          );
        }
      }, 800);
    }
  };

  // Toggle orb click directly
  const handleOrbClick = () => {
    if (isSessionActive) {
      stopLiveSession();
    } else {
      startLiveSession();
    }
  };

  // React to wake word detection ("Siri", "Hey Siri", "Hey [aiName]")
  useEffect(() => {
    const handleWakeWord = (e: any) => {
      const detectedName = e.detail?.aiName || aiName;
      const reply = e.detail?.reply || "Yes, I'm here!";
      setWakeBanner(`✨ Heard "${detectedName}"! ${detectedName}: "${reply}"`);
      setTimeout(() => setWakeBanner(''), 6500);

      wakeWordPromptRef.current = true;
      if (!isSessionActive) {
        startLiveSession();
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendTextMessage(e.detail?.query || `Hey ${detectedName}, I'm here!`);
        wakeWordPromptRef.current = false;
      }
    };

    window.addEventListener('aura_wakeword_detected', handleWakeWord);
    return () => {
      window.removeEventListener('aura_wakeword_detected', handleWakeWord);
    };
  }, [isSessionActive, aiName]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      interruptPlayback();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  return (
    <div
      id="gemini-live-orb-card"
      style={{
        margin: '0 12px 10px',
        borderRadius: 22,
        padding: '16px 14px 14px',
        background: 'white',
        boxShadow: isSessionActive
          ? '0 6px 24px rgba(124, 58, 237, 0.16), 0 1px 4px rgba(0,0,0,0.05)'
          : '0 2px 12px rgba(0, 0, 0, 0.04)',
        border: isSessionActive ? '1.5px solid #c4b5fd' : '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes auraBreath {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(192, 132, 252, 0.45));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 0 18px rgba(168, 85, 247, 0.65));
          }
        }
        @keyframes slowOrbitRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverseSlowRotate {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes activeAuraPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(16, 185, 129, 0.5)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 24px rgba(16, 185, 129, 0.85)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(16, 185, 129, 0.5)); }
        }
        @keyframes listeningAuraPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(236, 72, 153, 0.5)); }
          50% { transform: scale(1.09); filter: drop-shadow(0 0 24px rgba(236, 72, 153, 0.85)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(236, 72, 153, 0.5)); }
        }
      `}</style>

      {/* Wake Word Detected Alert Banner */}
      {wakeBanner && (
        <div
          style={{
            width: '100%',
            padding: '7px 12px',
            marginBottom: 8,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1.5px solid #10b981',
            color: '#065f46',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 2px 10px rgba(16,185,129,0.18)',
          }}
        >
          <span style={{ fontSize: 13 }}>✨</span>
          <span>{wakeBanner}</span>
        </div>
      )}

      {/* Top micro bar: Voice persona badge + Settings link */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 7px',
              borderRadius: 8,
              background: isSessionActive ? '#ecfdf5' : '#ede9fe',
              color: isSessionActive ? '#059669' : '#7c3aed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isSessionActive ? '#10b981' : '#a855f7',
                boxShadow: isSessionActive ? '0 0 6px #10b981' : 'none',
              }}
            />
            {isSessionActive ? `${aiName} Speaking` : `${aiName} Live`}
          </span>

          {wakeWordEnabled && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 8,
                background: isListening ? '#f0fdf4' : '#f8fafc',
                color: isListening ? '#15803d' : '#64748b',
                border: isListening ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerWakeWord();
              }}
              title={`Say "Hey ${aiName}" to speak, or tap to test`}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isListening ? '#22c55e' : '#94a3b8',
                }}
              />
              Hey {aiName}
            </span>
          )}

          <span
            style={{
              fontSize: 9,
              color: '#64748b',
              fontWeight: 700,
            }}
          >
            {liveVoice} · {liveLang === 'te-IN' ? 'తెలుగు' : liveLang === 'hi-IN' ? 'हिंदी' : 'English'}
          </span>
        </div>

        {/* Change in Settings Link */}
        {onNavigateToSettings && (
          <button
            id="btn-voice-settings-link"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToSettings();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 4px',
            }}
          >
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* Main Celestial Orb Vector (The Exact Artwork from Image 2) */}
      <div
        id="btn-tap-celestial-orb"
        onClick={handleOrbClick}
        style={{
          width: '100%',
          maxWidth: 290,
          height: 220,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Dynamic Audio Ripple Ring when Listening or Speaking */}
        {(isSessionActive || isModelSpeaking) && (
          <div
            style={{
              position: 'absolute',
              width: 140 + micVolume * 45,
              height: 140 + micVolume * 45,
              borderRadius: '50%',
              border: `2px solid ${isModelSpeaking ? 'rgba(16,185,129,0.5)' : 'rgba(236,72,153,0.45)'}`,
              animation: 'activeAuraPulse 1.8s infinite ease-in-out',
              pointerEvents: 'none',
              transition: 'all 0.15s ease',
            }}
          />
        )}

        <svg
          viewBox="0 0 300 240"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Radial Gradient for Central Aura Sphere */}
            <radialGradient id="auraCoreGradLive" cx="38%" cy="36%" r="62%">
              {isModelSpeaking ? (
                <>
                  <stop offset="0%" stopColor="#ecfdf5" />
                  <stop offset="30%" stopColor="#a7f3d0" />
                  <stop offset="70%" stopColor="#34d399" />
                  <stop offset="92%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </>
              ) : isMicStreaming ? (
                <>
                  <stop offset="0%" stopColor="#fdf2f8" />
                  <stop offset="30%" stopColor="#fbcfe8" />
                  <stop offset="68%" stopColor="#f472b6" />
                  <stop offset="92%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#db2777" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#faf5ff" />
                  <stop offset="28%" stopColor="#ede9fe" />
                  <stop offset="65%" stopColor="#d8b4fe" />
                  <stop offset="92%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#a855f7" />
                </>
              )}
            </radialGradient>

            {/* Inner Glow Filter */}
            <filter id="auraGlowFilterLive" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Group 1: Outer Faint Guide Ring */}
          <ellipse
            cx="150"
            cy="120"
            rx="98"
            ry="92"
            stroke="#e5e7eb"
            strokeWidth="0.9"
            strokeDasharray="1 0"
            opacity="0.75"
          />

          {/* Group 2: Animated Orbit Layers */}
          <g
            style={{
              transformOrigin: '150px 120px',
              animation: isSessionActive ? 'slowOrbitRotate 18s linear infinite' : 'slowOrbitRotate 45s linear infinite',
            }}
          >
            {/* Tilted Ellipse Orbit */}
            <ellipse
              cx="150"
              cy="120"
              rx="88"
              ry="78"
              transform="rotate(-18 150 120)"
              stroke={isSessionActive ? '#a78bfa' : '#cbd5e1'}
              strokeWidth="1.1"
              opacity="0.85"
            />

            {/* Orbit satellite dots */}
            <circle cx="218" cy="54" r="3.2" fill={isModelSpeaking ? '#10b981' : '#9381a8'} />
            <circle cx="180" cy="50" r="2.4" fill="#b49cb8" />
            <circle cx="72" cy="112" r="3.5" fill="#8b5cf6" opacity="0.8" />
            <circle cx="78" cy="124" r="2.8" fill="#a893b8" />
            <circle cx="120" cy="186" r="3.6" fill={isModelSpeaking ? '#34d399' : '#9381a8'} />
            <circle cx="128" cy="198" r="2.6" fill="#c4b5fd" />
          </g>

          {/* Group 3: Counter-rotating Wavy Organic Orbit Path (Characteristic wavy loop from image) */}
          <g
            style={{
              transformOrigin: '150px 120px',
              animation: isSessionActive ? 'reverseSlowRotate 24s linear infinite' : 'reverseSlowRotate 60s linear infinite',
            }}
          >
            <path
              d="M 150 36 
                 C 202 36, 238 68, 238 108 
                 C 238 122, 248 135, 242 152 
                 C 234 172, 218 198, 172 204 
                 C 120 210, 68 184, 62 138 
                 C 58 102, 92 46, 150 36 Z"
              stroke={isSessionActive ? '#818cf8' : '#9381a8'}
              strokeWidth="1.15"
              strokeLinecap="round"
              opacity="0.75"
            />

            {/* Characteristic dots on the wavy orbit */}
            <circle cx="236" cy="148" r="3.4" fill="#9381a8" />
            <circle cx="162" cy="74" r="3.2" fill={isSessionActive ? '#10b981' : '#7c3aed'} opacity="0.8" />
            <circle cx="92" cy="136" r="4.2" fill="#b49cb8" />
            <circle cx="142" cy="162" r="3" fill="#a893b8" />
            <circle cx="220" cy="185" r="2.5" fill="#c4b5fd" />
          </g>

          {/* Group 4: Inner delicate orbit */}
          <ellipse
            cx="150"
            cy="120"
            rx="66"
            ry="60"
            transform="rotate(22 150 120)"
            stroke={isSessionActive ? '#c084fc' : '#d8b4fe'}
            strokeWidth="0.95"
            opacity="0.7"
          />

          {/* Scatter dots in the immediate field */}
          <circle cx="104" cy="154" r="2.8" fill="#c084fc" />
          <circle cx="192" cy="132" r="2.5" fill="#a855f7" opacity="0.75" />
          <circle cx="196" cy="142" r="2.2" fill="#b49cb8" />
          <circle cx="212" cy="78" r="1.8" fill="#cbd5e1" />
          <circle cx="132" cy="52" r="2" fill="#b49cb8" />
          <circle cx="82" cy="192" r="3.1" fill="#d8b4fe" />

          {/* Group 5: The Central Glowing Purple Sphere */}
          <g
            style={{
              transformOrigin: '150px 120px',
              animation: isModelSpeaking
                ? 'activeAuraPulse 1.2s ease-in-out infinite'
                : isMicStreaming
                ? 'listeningAuraPulse 1.4s ease-in-out infinite'
                : 'auraBreath 4.5s ease-in-out infinite',
              transform: `scale(${1 + micVolume * 0.18})`,
              transition: 'transform 0.1s ease',
            }}
          >
            {/* Soft Ambient Aura Halo */}
            <circle
              cx="150"
              cy="120"
              r={38 + micVolume * 8}
              fill={isModelSpeaking ? '#34d399' : isMicStreaming ? '#f472b6' : '#c084fc'}
              opacity={isSessionActive ? 0.3 : 0.12}
              filter="url(#auraGlowFilterLive)"
            />
            {/* Inner Core Sphere */}
            <circle cx="150" cy="120" r="29" fill="url(#auraCoreGradLive)" />
            {/* Subtle light reflection sheen */}
            <ellipse
              cx="144"
              cy="113"
              rx="10"
              ry="6"
              transform="rotate(-25 144 113)"
              fill="#ffffff"
              opacity="0.32"
            />
          </g>
        </svg>
      </div>

      {/* Subtle Caption Footer from Image 2 */}
      <div
        id="btn-toggle-live-status-footer"
        onClick={handleOrbClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 12,
          background: isSessionActive ? 'rgba(124,58,237,0.06)' : 'transparent',
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isModelSpeaking ? '#10b981' : isSessionActive ? '#ec4899' : '#10b981',
            boxShadow: isSessionActive
              ? isModelSpeaking
                ? '0 0 8px #10b981'
                : '0 0 8px #ec4899'
              : '0 0 6px #10b981',
          }}
        />
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: isModelSpeaking ? '#059669' : isSessionActive ? '#7c3aed' : '#7c3aed',
            letterSpacing: '0.04em',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          {statusText}
        </p>
      </div>

      {/* Active In-Place Conversation & Transcript Card (Responding directly right here!) */}
      {isSessionActive && (
        <div
          style={{
            width: '100%',
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Recent Speech Bubbles */}
          {(lastUserMessage || lastModelMessage) && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: '8px 10px',
                fontSize: 11.5,
                lineHeight: 1.4,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                border: '1px solid #e2e8f0',
              }}
            >
              {lastUserMessage && (
                <div style={{ color: '#0f172a' }}>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: 10 }}>You: </span>
                  {lastUserMessage}
                </div>
              )}
              {lastModelMessage && (
                <div style={{ color: '#334155' }}>
                  <span style={{ fontWeight: 800, color: '#7c3aed', fontSize: 10 }}>{aiName} ({liveVoice}): </span>
                  {lastModelMessage}
                </div>
              )}
            </div>
          )}

          {/* Quick Spoken Questions Chips */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { label: 'నమస్కారం బాగున్నారా?', text: 'నమస్కారం! నేను రాజమ్మను, నా ఆరోగ్యం ఎలా ఉంది?' },
              { label: 'Medicine check', text: 'Did I take my afternoon tablet?' },
              { label: 'Knee joint pain', text: 'My right knee has mild stiffness today.' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  sendTextMessage(chip.text);
                }}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '4px 8px',
                  borderRadius: 10,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                💬 {chip.label}
              </button>
            ))}
          </div>

          {/* Live Action Buttons: Stop / Mute / End */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button
              id="btn-orb-toggle-mic"
              onClick={(e) => {
                e.stopPropagation();
                if (isMicStreaming) {
                  stopMicrophone();
                } else {
                  startMicrophone();
                }
              }}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 10,
                background: isMicStreaming ? '#ec4899' : '#059669',
                color: 'white',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span>{isMicStreaming ? '⏹️ Mute Mic' : '🎙️ Unmute Mic'}</span>
            </button>

            <button
              id="btn-orb-end-call"
              onClick={(e) => {
                e.stopPropagation();
                stopLiveSession();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
