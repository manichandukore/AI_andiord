import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  analyzeHealthSymptoms,
  detectContactRequest,
  executeEmergencyWorkflow,
} from '../utils/emergencyDetection';
import { detectPainProgressInText, syncHealthProgress } from '../utils/painDetection';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  companionLang?: 'auto' | 'te-IN' | 'hi-IN' | 'en-US';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'live-audio' | 'live-text' | 'fallback';
}

type LiveVoiceName = 'Aoede' | 'Zephyr' | 'Kore' | 'Puck';

export function VoiceCallModal({
  isOpen,
  onClose,
  userName = 'Rajamma',
  companionLang = 'te-IN',
}: VoiceCallModalProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [selectedLang, setSelectedLang] = useState(companionLang);
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Aoede');
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('Connecting to Gemini 3.8 Live API...');
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        companionLang === 'te-IN'
          ? `నమస్కారం ${userName} గారు! నేను మీ జెమిని లైవ్ కంపానియన్ ఔరాను. మీ ఆరోగ్యం ఎలా ఉంది? నాతో మాట్లాడండి!`
          : companionLang === 'hi-IN'
          ? `नमस्ते ${userName} जी! मैं औरा हूँ, आपकी जेमिनी 3.8 लाइव साथी। आज आप कैसी महसूस कर रही हैं?`
          : `Hello ${userName}! I am Aura, your Gemini 3.8 Live companion. How are you feeling today? Talk with me freely!`,
      source: 'live-audio',
    },
  ]);

  // Audio Context and Stream References
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Helper: Convert Float32 array from microphone to 16-bit signed PCM Base64
  const floatTo16BitPCMBase64 = (input: Float32Array): string => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Helper: Play 24kHz PCM chunk received from Gemini Live API
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

  // Helper: Interrupt model playback instantly
  const interruptPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {
        // Ignore stop error
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsModelSpeaking(false);
  }, []);

  // Call timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Format call duration MM:SS
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll transcript to bottom
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [conversation, statusMessage]);

  // Connect to Gemini 3.8 Live API WebSocket
  const connectLiveWebSocket = useCallback(() => {
    if (!isOpen) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore
      }
      wsRef.current = null;
    }

    setLiveStatus('connecting');
    setStatusMessage('Connecting to Gemini 3.8 Live API session...');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live?voice=${selectedVoice}&lang=${selectedLang}&userName=${encodeURIComponent(userName)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveStatus('connected');
        setStatusMessage('⚡ Connected to Gemini 3.8 Live API. Tap mic to stream audio!');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            setLiveStatus('connected');
            setStatusMessage(`⚡ Gemini 3.8 Live Active • Voice: ${data.voice || selectedVoice}`);
          } else if (data.type === 'audio' && data.audio) {
            play24kHzPcmChunk(data.audio);
          } else if (data.type === 'text' && data.text) {
            setConversation((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.source === 'live-audio') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: `${last.content} ${data.text}`.trim() },
                ];
              }
              return [...prev, { role: 'assistant', content: data.text, source: 'live-audio' }];
            });
          } else if (data.type === 'interrupted') {
            interruptPlayback();
            setStatusMessage('⚡ Live conversation: listening to you...');
          } else if (data.type === 'turnComplete') {
            // Model finished turn
          } else if (data.type === 'error') {
            setStatusMessage(`Notice: ${data.message}`);
          }
        } catch (err) {
          console.warn('Error parsing Live WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setLiveStatus('error');
        setStatusMessage('Live WebSocket error. Reconnecting or using voice fallback...');
      };

      ws.onclose = () => {
        setLiveStatus('disconnected');
        setStatusMessage('Live API session closed.');
      };
    } catch (err: any) {
      console.error('Failed to instantiate WebSocket:', err);
      setLiveStatus('error');
      setStatusMessage('Unable to establish WebSocket connection.');
    }
  }, [isOpen, selectedVoice, selectedLang, userName, play24kHzPcmChunk, interruptPlayback]);

  // Connect on modal open or voice/language change
  useEffect(() => {
    if (isOpen) {
      connectLiveWebSocket();
    }
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore
        }
        wsRef.current = null;
      }
      stopMicrophoneStream();
      interruptPlayback();
    };
  }, [isOpen, selectedVoice, selectedLang]);

  // Start real-time microphone capture & stream to Gemini Live
  const startMicrophoneStream = async () => {
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

        // Calculate RMS volume for audio visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setMicVolume(Math.min(1, rms * 6));

        // Stream 16kHz PCM Base64 to Gemini Live WebSocket
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

      setIsLiveStreaming(true);
      setStatusMessage('🎙️ Streaming audio live to Gemini 3.8 Live API...');
    } catch (err: any) {
      console.warn('Microphone stream error, trying fallback speech recognition:', err);
      fallbackSpeechRecognition();
    }
  };

  // Stop microphone stream
  const stopMicrophoneStream = () => {
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
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsLiveStreaming(false);
    setMicVolume(0);
    setStatusMessage('Live streaming paused. Tap mic to speak again.');
  };

  const toggleStreaming = () => {
    if (isLiveStreaming) {
      stopMicrophoneStream();
    } else {
      startMicrophoneStream();
    }
  };

  // Fallback speech recognition if getUserMedia raw stream isn't supported in browser environment
  const fallbackSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Microphone access blocked. You can type message directly to Gemini 3.8 Live.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLang === 'te-IN' ? 'te-IN' : selectedLang === 'hi-IN' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsLiveStreaming(true);
        setStatusMessage('🎙️ Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendLiveText(transcript);
        }
      };

      recognition.onerror = () => {
        setIsLiveStreaming(false);
      };

      recognition.onend = () => {
        setIsLiveStreaming(false);
      };

      recognition.start();
    } catch {
      setIsLiveStreaming(false);
    }
  };

  // Send text to Gemini 3.8 Live API
  const handleSendLiveText = async (text: string) => {
    if (!text.trim()) return;

    interruptPlayback();
    const newConv: Message[] = [...conversation, { role: 'user', content: text.trim(), source: 'live-text' }];
    setConversation(newConv);
    setInputText('');

    // 1. Check for explicit contact request: "Call my son", "Phone my son", etc.
    const contactReq = detectContactRequest(text);
    if (contactReq) {
      const member = contactReq.resolvedMember;
      const cleanPhone = member.phone.replace(/[^0-9+]/g, '');

      if (contactReq.type === 'CALL') {
        const reply =
          selectedLang === 'te-IN'
            ? `మీరు కోరినట్లుగా మీ ${member.role} ${member.name} గారికి ఫోన్ కనెక్ట్ చేస్తున్నాను.`
            : selectedLang === 'hi-IN'
            ? `आपके कहे अनुसार आपके ${member.role} ${member.name} जी को कॉल लगाया जा रहा है।`
            : `Calling ${member.name} (${member.role}) right away.`;

        setConversation([...newConv, { role: 'assistant', content: reply, source: 'fallback' }]);
        setStatusMessage(`📞 Connecting call to ${member.name}...`);

        try {
          window.location.href = `tel:${cleanPhone}`;
        } catch {}

        window.dispatchEvent(
          new CustomEvent('aura_emergency_alert_triggered', {
            detail: {
              symptomAnalysis: {
                hasSymptom: true,
                primaryBodyPart: 'heart',
                secondaryBodyParts: [],
                severity: 'SERIOUS',
                isEmergency: true,
                symptomsDetected: [`Direct Call to ${member.name} (${member.role}) Requested`],
                clinicalSummary: `${userName} explicitly requested to call ${member.name} (${member.role}).`,
                patientName: userName,
                recommendedAction: 'Stay on the line for caregiver connection.',
                userQuote: text,
                spokenGuidance: { english: reply, telugu: reply, hindi: reply },
              },
              contact: member,
              callUrl: `tel:${cleanPhone}`,
              whatsappUrl: `https://wa.me/${cleanPhone.replace(/^\+/, '')}?text=${encodeURIComponent(`Urgent Call Request from ${userName}: Please contact immediately.`)}`,
              smsUrl: `sms:${cleanPhone}?body=${encodeURIComponent(`Urgent Call Request from ${userName}`)}`,
              partsUpdated: ['heart'],
              actionReport: `Initiated direct call to ${member.name} (${member.role}) at ${member.phone}.`,
            },
          })
        );
        return;
      }
    }

    // 2. Health Symptom & Severity Analysis
    const symptomAnalysis = analyzeHealthSymptoms(text, userName);
    if (symptomAnalysis.hasSymptom) {
      // Automatic Body Map Dot Updates without requiring manual dot addition
      syncHealthProgress(symptomAnalysis.primaryBodyPart, 'active', text);
      for (const sec of symptomAnalysis.secondaryBodyParts) {
        syncHealthProgress(sec, 'active', text);
      }

      if (symptomAnalysis.isEmergency) {
        await executeEmergencyWorkflow(symptomAnalysis);
        const spoken =
          selectedLang === 'te-IN'
            ? symptomAnalysis.spokenGuidance.telugu
            : selectedLang === 'hi-IN'
            ? symptomAnalysis.spokenGuidance.hindi
            : symptomAnalysis.spokenGuidance.english;

        setConversation([...newConv, { role: 'assistant', content: spoken, source: 'fallback' }]);
        setStatusMessage(`🚨 Emergency Alert: ${symptomAnalysis.symptomsDetected.join(' + ')}`);
        return;
      }
    }

    // 3. Progress check (recovery / resolved)
    const progressCheck = detectPainProgressInText(text);
    if (progressCheck) {
      syncHealthProgress(progressCheck.bodyPart, progressCheck.status, text);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        })
      );
      setStatusMessage('✨ Sent to Gemini 3.8 Live. Awaiting voice response...');
    } else {
      // If WebSocket is disconnected, fallback to HTTP endpoint
      sendHttpFallback(text.trim(), newConv);
    }
  };

  // HTTP Fallback if WebSocket connection dropped
  const sendHttpFallback = async (userText: string, currentHistory: Message[]) => {
    setStatusMessage('Sending via fallback channel...');
    try {
      const res = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userText,
          history: currentHistory,
          voiceName: selectedVoice,
          userName,
          language: selectedLang,
        }),
      });

      const data = await res.json();
      const reply = data.replyText || `Hello ${userName}, I am right here with you!`;
      setConversation([...currentHistory, { role: 'assistant', content: reply, source: 'fallback' }]);
      setStatusMessage('Gemini voice response received.');
    } catch {
      const fallbackReply = `నమస్కారం ${userName} గారు! నేను మీతోనే ఉన్నాను. దయచేసి విశ్రాంతి తీసుకోండి.`;
      setConversation([...currentHistory, { role: 'assistant', content: fallbackReply, source: 'fallback' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-live-voice-modal"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #0b0f19 0%, #1e1b4b 48%, #090d16 100%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          padding: '16px 18px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: '#34d399',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: liveStatus === 'connected' ? '#10b981' : '#f59e0b',
                  boxShadow: liveStatus === 'connected' ? '0 0 8px #10b981' : 'none',
                }}
              />
              Gemini 3.8 Live API
            </span>
            <span
              style={{
                fontSize: 8.5,
                padding: '1px 6px',
                borderRadius: 8,
                background: 'rgba(99,102,241,0.25)',
                color: '#c7d2fe',
                fontWeight: 700,
              }}
            >
              Real-Time Voice
            </span>
          </div>
          <h3
            style={{
              margin: '3px 0 1px',
              fontSize: 18,
              fontWeight: 800,
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: '-0.3px',
            }}
          >
            Aura Live Voice AI
          </h3>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            Companion with {userName} · {formatTime(callDuration)}
          </p>
        </div>

        {/* Close Button */}
        <button
          id="btn-close-live-modal"
          onClick={() => {
            stopMicrophoneStream();
            interruptPlayback();
            onClose();
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* Language and Voice Selection Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px 6px',
          gap: 8,
        }}
      >
        {/* Language selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'te-IN', label: 'తెలుగు' },
            { id: 'hi-IN', label: 'हिंदी' },
            { id: 'en-US', label: 'English' },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id as any)}
              style={{
                padding: '3px 8px',
                borderRadius: 12,
                background: selectedLang === lang.id ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                color: selectedLang === lang.id ? 'white' : '#cbd5e1',
                fontSize: 10.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Voice Character Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>Voice:</span>
          {(['Aoede', 'Zephyr', 'Kore'] as LiveVoiceName[]).map((vName) => (
            <button
              key={vName}
              onClick={() => setSelectedVoice(vName)}
              style={{
                padding: '2px 7px',
                borderRadius: 10,
                background: selectedVoice === vName ? '#059669' : 'rgba(255,255,255,0.08)',
                color: selectedVoice === vName ? 'white' : '#9ca3af',
                fontSize: 9.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {vName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Celestial Animated Voice Orb Visual */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 0 8px',
          position: 'relative',
        }}
      >
        {/* Outer Ripple Rings when Streaming or Model Speaking */}
        {(isLiveStreaming || isModelSpeaking) && (
          <div
            style={{
              position: 'absolute',
              width: 130 + micVolume * 40,
              height: 130 + micVolume * 40,
              borderRadius: '50%',
              border: `2px solid ${isModelSpeaking ? 'rgba(16,185,129,0.5)' : 'rgba(236,72,153,0.5)'}`,
              animation: 'pulseRing 1.8s infinite cubic-bezier(0.2, 0.8, 0.2, 1)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Interactive Center Orb */}
        <div
          id="btn-toggle-live-orb"
          onClick={toggleStreaming}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            background: isModelSpeaking
              ? 'radial-gradient(circle at 35% 35%, #10b981 0%, #059669 50%, #047857 100%)'
              : isLiveStreaming
              ? 'radial-gradient(circle at 35% 35%, #ec4899 0%, #8b5cf6 60%, #3b82f6 100%)'
              : 'radial-gradient(circle at 35% 35%, #a855f7 0%, #6366f1 60%, #4338ca 100%)',
            boxShadow: isModelSpeaking
              ? '0 0 35px rgba(16,185,129,0.7), 0 0 70px rgba(5,150,105,0.4)'
              : isLiveStreaming
              ? `0 0 ${30 + micVolume * 30}px rgba(236,72,153,0.8), 0 0 70px rgba(139,92,246,0.5)`
              : '0 0 25px rgba(139,92,246,0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isLiveStreaming ? `scale(${1 + micVolume * 0.15})` : 'scale(1)',
          }}
        >
          {isModelSpeaking ? (
            <span style={{ fontSize: 36, animation: 'bounce 0.8s infinite' }}>🔊</span>
          ) : isLiveStreaming ? (
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 38, height: 38 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 38, height: 38 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </div>

        {/* Live Status Subtitle */}
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 700,
            color: isModelSpeaking ? '#34d399' : isLiveStreaming ? '#f472b6' : '#cbd5e1',
            textAlign: 'center',
            padding: '0 16px',
            margin: '8px 0 0',
          }}
        >
          {isModelSpeaking
            ? `🔊 Aura is speaking via Gemini 3.8 Live (${selectedVoice})...`
            : isLiveStreaming
            ? '🎙️ Listening to you live... (Speak naturally)'
            : 'Tap orb to start Live Voice Conversation'}
        </p>

        {/* Real-time Status Micro-chip */}
        <span
          style={{
            fontSize: 9.5,
            color: '#94a3b8',
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {statusMessage}
        </span>
      </div>

      {/* Suggested Quick Conversation Prompts */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {[
          { label: 'నమస్కారం బాగున్నారా?', prompt: 'నమస్కారం! నేను రాజమ్మను, నా మోకాళ్ళు కొంచెం నొప్పిగా ఉన్నాయి.' },
          { label: 'Medicine check', prompt: 'Did I take my afternoon blood pressure tablet?' },
          { label: 'Tell calm story', prompt: 'Tell me a short peaceful story to cheer me up.' },
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendLiveText(chip.prompt)}
            style={{
              whiteSpace: 'nowrap',
              padding: '4px 10px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            💬 {chip.label}
          </button>
        ))}
      </div>

      {/* Real-Time Conversation Transcript */}
      <div
        ref={transcriptContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {conversation.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '9px 13px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? '#059669' : 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                fontSize: 12.5,
                lineHeight: 1.45,
                color: 'white',
                border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: isUser ? '#d1fae5' : '#c084fc',
                  }}
                >
                  {isUser ? userName : `Aura (${selectedVoice})`}
                </span>
                {!isUser && (
                  <span
                    style={{
                      fontSize: 8.5,
                      color: '#a78bfa',
                      background: 'rgba(167,139,250,0.15)',
                      padding: '1px 5px',
                      borderRadius: 6,
                    }}
                  >
                    gemini-3.8-live
                  </span>
                )}
              </div>
              {msg.content}
            </div>
          );
        })}
      </div>

      {/* Bottom Controls & Text Input */}
      <div
        style={{
          padding: '10px 14px 14px',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Text Input Row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            id="input-live-chat"
            type="text"
            placeholder={`Talk or type to Aura in ${selectedLang}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendLiveText(inputText);
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'white',
              fontSize: 12,
              outline: 'none',
              fontFamily: "'Nunito', sans-serif",
            }}
          />
          <button
            id="btn-send-live-text"
            onClick={() => handleSendLiveText(inputText)}
            disabled={!inputText.trim()}
            style={{
              padding: '0 14px',
              borderRadius: 18,
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: !inputText.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>

        {/* Action Buttons: Live Mic Stream vs End Call */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            id="btn-toggle-mic-live"
            onClick={toggleStreaming}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 14,
              background: isLiveStreaming ? '#ec4899' : '#059669',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: isLiveStreaming
                ? '0 4px 14px rgba(236,72,153,0.4)'
                : '0 4px 14px rgba(5,150,105,0.4)',
            }}
          >
            <span>{isLiveStreaming ? '⏹️' : '🎙️'}</span>
            {isLiveStreaming ? 'Stop Audio Stream' : 'Start Live Voice'}
          </button>

          <button
            id="btn-end-live-call"
            onClick={() => {
              stopMicrophoneStream();
              interruptPlayback();
              onClose();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 14,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            End Call
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
