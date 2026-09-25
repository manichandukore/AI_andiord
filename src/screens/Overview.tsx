import React, { useState, useEffect } from 'react';
import { AuraOrbVisual } from '../components/AuraOrbVisual';
import { useAuth } from '../context/AuthContext';
import { useWakeWord } from '../context/WakeWordContext';
import {
  INITIAL_BODY_OBSERVATIONS,
  detectPainInText,
  BodyPartKey,
  BodyPartObservation,
} from '../utils/painDetection';

interface OverviewProps {
  onNavigateTab?: (tab: string) => void;
  onVoiceCall?: () => void;
  onEmergencySOS?: () => void;
  externalOrbActive?: boolean;
}

export function Overview({ onNavigateTab, onVoiceCall, onEmergencySOS, externalOrbActive }: OverviewProps) {
  const { user, openAuthScreen, setIsAuthModalOpen } = useAuth();
  const { aiName, wakeWordEnabled, isListening, triggerWakeWord } = useWakeWord();
  const [selectedPart, setSelectedPart] = useState<BodyPartKey>('knee');
  const [bodyObservations, setBodyObservations] = useState<Record<BodyPartKey, BodyPartObservation>>(() => {
    try {
      const saved = localStorage.getItem('aura_body_observations');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_BODY_OBSERVATIONS;
  });
  const [painAlertToast, setPainAlertToast] = useState<string>('');
  const [activeLang, setActiveLang] = useState('English');
  const [showMedAlert, setShowMedAlert] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInText, setCheckInText] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const [medToast, setMedToast] = useState('');

  // Listen for pain reported from any voice or text source (Siri, Voice companion, Orb, Check-in)
  useEffect(() => {
    const handlePainEvent = (e: any) => {
      const detail = e.detail;
      if (!detail?.bodyPart) return;

      const partKey = detail.bodyPart as BodyPartKey;
      setSelectedPart(partKey);

      setBodyObservations((prev) => {
        const existing = prev[partKey] || INITIAL_BODY_OBSERVATIONS[partKey];
        const updated = {
          ...prev,
          [partKey]: {
            ...existing,
            label: detail.label || `${partKey.toUpperCase()} (Pain Reported)`,
            note: detail.symptom || 'Pain reported just now via voice',
            color: '#ef4444',
            rec: detail.rec || existing.rec,
            reportedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            isPainActive: true,
          },
        };
        try {
          localStorage.setItem('aura_body_observations', JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });

      setPainAlertToast(
        `⚡ Body Map Updated: ${detail.label || partKey} marked with pain! (${detail.source || 'Voice'})`
      );
      setTimeout(() => setPainAlertToast(''), 7000);
    };

    window.addEventListener('aura_pain_reported', handlePainEvent);
    return () => window.removeEventListener('aura_pain_reported', handlePainEvent);
  }, []);

  const handleClearPain = (partKey: BodyPartKey) => {
    setBodyObservations((prev) => {
      const original = INITIAL_BODY_OBSERVATIONS[partKey];
      const updated = {
        ...prev,
        [partKey]: {
          ...original,
          isPainActive: false,
        },
      };
      try {
        localStorage.setItem('aura_body_observations', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    setPainAlertToast(`✓ ${partKey} cleared and restored to stable status.`);
    setTimeout(() => setPainAlertToast(''), 3000);
  };

  const handleQuickReportPain = (partKey: BodyPartKey, complaintText: string) => {
    const painCheck = detectPainInText(complaintText);
    if (painCheck) {
      window.dispatchEvent(
        new CustomEvent('aura_pain_reported', {
          detail: {
            bodyPart: painCheck.bodyPart,
            label: painCheck.bodyPartLabel,
            symptom: painCheck.symptomSummary,
            rec: painCheck.rec,
            source: 'Quick Body Map Tap',
            timestamp: Date.now(),
          },
        })
      );
    }
  };

  // Dynamic real-time greeting & current date
  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const currentDateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const currentObs = bodyObservations[selectedPart] || INITIAL_BODY_OBSERVATIONS[selectedPart] || INITIAL_BODY_OBSERVATIONS.knee;
  const pendingMed = {
    id: 'amlodipine',
    name: 'Amlodipine (Blood Pressure)',
    dose: '5 mg',
    time: '4:00 PM',
    freq: 'DAILY',
    note: 'Blood pressure pill · Take with warm water',
    active: true,
    addedBy: 'Dr. K.S. Sharma',
    addedAt: 'Aug 10',
    takenToday: false,
  };

  const handleRunCheckIn = async () => {
    if (!checkInText.trim() || checkInLoading) return;
    setCheckInLoading(true);

    // Auto-check if user wrote about pain in daily check-in
    const painCheck = detectPainInText(checkInText);
    if (painCheck) {
      window.dispatchEvent(
        new CustomEvent('aura_pain_reported', {
          detail: {
            bodyPart: painCheck.bodyPart,
            label: painCheck.bodyPartLabel,
            symptom: painCheck.symptomSummary,
            rec: painCheck.rec,
            source: 'Daily Check-In',
            timestamp: Date.now(),
          },
        })
      );
    }

    try {
      const res = await fetch('/api/checkin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: checkInText,
          language: activeLang === 'Telugu' ? 'te-IN' : activeLang === 'Hindi' ? 'hi-IN' : 'en-US',
        }),
      });
      const data = await res.json();
      setCheckInResult(data);
    } catch {
      setCheckInResult({
        aiReply: 'I have logged your note, Rajamma. Please rest and keep warm.',
        mood: 'Calm',
        overallWellness: 'Stable',
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f0f2f5' }}>
      {medToast && (
        <div
          style={{
            margin: '8px 12px 0',
            padding: '10px 14px',
            borderRadius: 14,
            background: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            color: '#065f46',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
          }}
        >
          <span>{medToast}</span>
          <button
            onClick={() => setMedToast('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Welcome Card */}
      <div
        style={{
          margin: '10px 12px 10px',
          borderRadius: 22,
          padding: '16px',
          background: 'linear-gradient(140deg, #ede9fe 0%, #e0f7f0 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#7c3aed',
                margin: '0 0 2px',
                letterSpacing: '0.04em',
              }}
            >
              {aiName.toUpperCase()} · AI VOICE COMPANION
            </p>
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: '#111827',
                margin: '0 0 4px',
                lineHeight: 1.2,
              }}
            >
              {greeting},
              <br />
              Rajamma 👋
            </h1>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px' }}>
              {currentDateStr} · {wakeWordEnabled ? (
                <span
                  onClick={() => triggerWakeWord('Siri')}
                  style={{
                    color: '#7c3aed',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Click to test saying Siri"
                >
                  <span>Say &ldquo;Hey Siri&rdquo; 🎙️</span>
                  <span
                    style={{
                      fontSize: 9,
                      background: '#ede9fe',
                      padding: '1px 5px',
                      borderRadius: 6,
                      color: '#6d28d9',
                    }}
                  >
                    Tap to test
                  </span>
                </span>
              ) : (
                'Monitoring Active'
              )}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <button
                onClick={onEmergencySOS}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 20,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
                }}
              >
                🚨 Emergency
              </button>

              <button
                id="btn-overview-auth"
                onClick={() => {
                  if (user) {
                    setIsAuthModalOpen(true);
                  } else {
                    openAuthScreen('signin');
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 20,
                  background: user ? '#ffffff' : '#059669',
                  color: user ? '#059669' : '#ffffff',
                  border: user ? '1.5px solid #10b981' : 'none',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {user ? (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981' }} />
                    <span>{user.displayName ? user.displayName.split(' ')[0] : 'Synced'}</span>
                  </>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              border: '3.5px solid #10b981',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: '#059669',
                lineHeight: 1,
              }}
            >
              87
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.08em',
              }}
            >
              SCORE
            </span>
          </div>
        </div>
      </div>

      {/* Aura AI Celestial Companion Orb Visual with Direct Gemini 3.8 Live API */}
      <AuraOrbVisual
        userName="Rajamma"
        onNavigateToSettings={() => onNavigateTab?.('settings')}
        externalActiveTrigger={externalOrbActive}
      />

      {/* Interactive Body Health Map Card */}
      <div style={{ margin: '0 12px 10px', borderRadius: 22, padding: '16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                margin: 0,
              }}
            >
              Interactive Body Health Map
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569', fontWeight: 600 }}>
              Say &ldquo;Siri I have knee pain&rdquo; or tap below to update
            </p>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#7c3aed',
              background: '#ede9fe',
              padding: '3px 8px',
              borderRadius: 8,
            }}
          >
            LIVE TELEMETRY & PAIN SYNC
          </span>
        </div>

        {/* Live Pain Alert Notification */}
        {painAlertToast && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 12px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🚨</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>{painAlertToast}</span>
            </div>
            <button
              onClick={() => setPainAlertToast('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#b91c1c',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Voice & Tap Pain Buttons */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>Tell Pain:</span>
            {[
              { part: 'knee' as BodyPartKey, label: '🦵 Knee Pain', text: 'I have severe knee pain' },
              { part: 'back' as BodyPartKey, label: '🧘 Back Pain', text: 'My lower back is hurting' },
              { part: 'head' as BodyPartKey, label: '🤕 Headache', text: 'I have a headache' },
              { part: 'heart' as BodyPartKey, label: '❤️ Chest Pain', text: 'I have chest discomfort' },
              { part: 'shoulder' as BodyPartKey, label: '💪 Shoulder', text: 'My shoulder hurts' },
              { part: 'stomach' as BodyPartKey, label: '🍽️ Stomach', text: 'I have stomach ache' },
              { part: 'feet' as BodyPartKey, label: '🦶 Foot Pain', text: 'My feet are hurting' },
            ].map((chip) => {
              const isActive = bodyObservations[chip.part]?.isPainActive;
              return (
                <button
                  key={chip.part}
                  type="button"
                  onClick={() => handleQuickReportPain(chip.part, chip.text)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 10,
                    background: isActive ? '#fee2e2' : '#f8fafc',
                    color: isActive ? '#dc2626' : '#334155',
                    border: `1px solid ${isActive ? '#fca5a5' : '#e2e8f0'}`,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {chip.label}
                  {isActive && <span style={{ width: 5, height: 5, borderRadius: 3, background: '#dc2626' }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {/* Anatomical SVG Silhouette - Enlarged & Enhanced with all 7 pain hotspots */}
          <div
            style={{
              width: 130,
              minHeight: 220,
              flexShrink: 0,
              background: 'linear-gradient(165deg, #e0f2fe 0%, #ebf8ff 50%, #f0fdf4 100%)',
              borderRadius: 18,
              border: '1px solid rgba(191,219,254,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px',
              position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8)',
            }}
          >
            <svg viewBox="0 0 60 120" style={{ width: 100, height: 180 }}>
              {/* Head */}
              <circle cx="30" cy="11.5" r="9.5" fill="#bfdbfe" />
              {/* Neck */}
              <rect x="27.5" y="21" width="5" height="3" rx="1.5" fill="#bfdbfe" />
              {/* Torso */}
              <rect x="18" y="23" width="24" height="34" rx="7" fill="#bfdbfe" />
              {/* Left Arm */}
              <rect x="6.5" y="24" width="9.5" height="29" rx="4.5" fill="#bfdbfe" />
              {/* Right Arm */}
              <rect x="44" y="24" width="9.5" height="29" rx="4.5" fill="#bfdbfe" />
              {/* Left Leg */}
              <rect x="18" y="58" width="10.5" height="44" rx="5" fill="#bfdbfe" />
              {/* Right Leg */}
              <rect x="31.5" y="58" width="10.5" height="44" rx="5" fill="#bfdbfe" />

              {/* 1. Head Hotspot */}
              {bodyObservations.head?.isPainActive && (
                <>
                  <circle cx="30" cy="11.5" r="6.5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.8" />
                  <circle cx="30" cy="11.5" r="9" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.4" />
                </>
              )}
              {selectedPart === 'head' && (
                <circle cx="30" cy="11.5" r="5.8" fill="none" stroke="#10b981" strokeWidth="1.2" opacity="0.75" />
              )}
              <circle
                cx="30"
                cy="11.5"
                r="3.6"
                fill={bodyObservations.head?.isPainActive ? '#ef4444' : selectedPart === 'head' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('head')}
              />
              <circle cx="30" cy="11.5" r="9" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSelectedPart('head')} />

              {/* 2. Shoulder Hotspots */}
              {bodyObservations.shoulder?.isPainActive && (
                <>
                  <circle cx="11.5" cy="27" r="5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.8" />
                  <circle cx="48.5" cy="27" r="5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.8" />
                </>
              )}
              <circle
                cx="11.5"
                cy="27"
                r="3.2"
                fill={bodyObservations.shoulder?.isPainActive ? '#ef4444' : selectedPart === 'shoulder' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('shoulder')}
              />
              <circle
                cx="48.5"
                cy="27"
                r="3.2"
                fill={bodyObservations.shoulder?.isPainActive ? '#ef4444' : selectedPart === 'shoulder' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('shoulder')}
              />

              {/* 3. Heart Hotspot */}
              {bodyObservations.heart?.isPainActive && (
                <circle cx="26" cy="33" r="6" fill="none" stroke="#ef4444" strokeWidth="1.4" opacity="0.85" />
              )}
              {selectedPart === 'heart' && (
                <circle cx="26" cy="33" r="5.5" fill="none" stroke="#10b981" strokeWidth="1.2" opacity="0.75" />
              )}
              <circle
                cx="26"
                cy="33"
                r="3.4"
                fill={bodyObservations.heart?.isPainActive ? '#ef4444' : selectedPart === 'heart' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('heart')}
              />
              <circle cx="26" cy="33" r="9" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSelectedPart('heart')} />

              {/* 4. Back / Spine Hotspot */}
              {bodyObservations.back?.isPainActive && (
                <circle cx="34" cy="38" r="5.5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
              )}
              <circle
                cx="34"
                cy="38"
                r="3.2"
                fill={bodyObservations.back?.isPainActive ? '#ef4444' : selectedPart === 'back' ? '#10b981' : '#64748b'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('back')}
              />
              <circle cx="34" cy="38" r="8" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSelectedPart('back')} />

              {/* 5. Stomach Hotspot */}
              {bodyObservations.stomach?.isPainActive && (
                <circle cx="30" cy="48" r="6" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
              )}
              {selectedPart === 'stomach' && (
                <circle cx="30" cy="48" r="5.5" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.75" />
              )}
              <circle
                cx="30"
                cy="48"
                r="3.4"
                fill={bodyObservations.stomach?.isPainActive ? '#ef4444' : selectedPart === 'stomach' ? '#f59e0b' : '#fbbf24'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('stomach')}
              />
              <circle cx="30" cy="48" r="9" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSelectedPart('stomach')} />

              {/* 6. Knee Hotspots */}
              {bodyObservations.knee?.isPainActive && (
                <>
                  <circle cx="23.5" cy="82" r="5.5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
                  <circle cx="36.5" cy="82" r="5.5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
                </>
              )}
              <circle
                cx="23.5"
                cy="82"
                r="3.4"
                fill={bodyObservations.knee?.isPainActive ? '#ef4444' : selectedPart === 'knee' ? '#f59e0b' : '#fbbf24'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('knee')}
              />
              <circle
                cx="36.5"
                cy="82"
                r="3.4"
                fill={bodyObservations.knee?.isPainActive ? '#ef4444' : selectedPart === 'knee' ? '#f59e0b' : '#fbbf24'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('knee')}
              />

              {/* 7. Feet Hotspots */}
              {bodyObservations.feet?.isPainActive && (
                <>
                  <circle cx="23.5" cy="98" r="4.8" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
                  <circle cx="36.5" cy="98" r="4.8" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
                </>
              )}
              <circle
                cx="23.5"
                cy="98"
                r="3"
                fill={bodyObservations.feet?.isPainActive ? '#ef4444' : selectedPart === 'feet' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('feet')}
              />
              <circle
                cx="36.5"
                cy="98"
                r="3"
                fill={bodyObservations.feet?.isPainActive ? '#ef4444' : selectedPart === 'feet' ? '#10b981' : '#34d399'}
                stroke="white"
                strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPart('feet')}
              />
            </svg>
          </div>

          {/* Observations Selector - Compact Scrollable list of all areas */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 240,
              overflowY: 'auto',
              paddingRight: 2,
            }}
          >
            {(Object.entries(bodyObservations) as [BodyPartKey, BodyPartObservation][]).map(([key, info]) => {
              const isSelected = selectedPart === key;
              const hasPain = info.isPainActive;
              return (
                <div
                  key={key}
                  style={{
                    borderRadius: 10,
                    padding: '6px 8px',
                    background: hasPain ? '#fef2f2' : isSelected ? `${info.color}14` : '#f9fafb',
                    border: `1.5px solid ${hasPain ? '#ef4444' : isSelected ? info.color : '#e5e7eb'}`,
                    transition: 'all 0.18s',
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <div
                    onClick={() => setSelectedPart(key)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 3.5,
                          background: hasPain ? '#ef4444' : info.color,
                          flexShrink: 0,
                          boxShadow: hasPain ? '0 0 6px #ef4444' : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: hasPain ? '#b91c1c' : '#111827',
                          lineHeight: 1.2,
                        }}
                      >
                        {info.label}
                      </span>
                    </div>

                    {hasPain && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearPain(key);
                        }}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                        title="Resolve pain and restore to stable"
                      >
                        Resolve ✓
                      </button>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: 8.5,
                      color: hasPain ? '#991b1b' : '#6b7280',
                      margin: '2px 0 0',
                      paddingLeft: 12,
                      lineHeight: 1.25,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedPart(key)}
                  >
                    {info.note}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendation Box - Dynamically changes based on pain status */}
        <div
          style={{
            marginTop: 12,
            borderRadius: 13,
            padding: '10px 12px',
            background: currentObs.isPainActive ? '#fff1f2' : '#fffbeb',
            border: `1.5px solid ${currentObs.isPainActive ? '#fecdd3' : '#fde68a'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: currentObs.isPainActive ? '#e11d48' : '#d97706',
                margin: 0,
              }}
            >
              {currentObs.isPainActive
                ? `🚨 AI Pain Guidance: ${currentObs.label.split(' (')[0]}`
                : `🤖 AI Wellness Guidance: ${currentObs.label.split(' (')[0]}`}
            </p>
            {currentObs.isPainActive && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#be123c',
                  background: '#ffe4e6',
                  padding: '1px 6px',
                  borderRadius: 6,
                }}
              >
                ACTION REQUIRED
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 11,
              color: currentObs.isPainActive ? '#9f1239' : '#92400e',
              margin: 0,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {currentObs.rec}
          </p>
        </div>
      </div>

      {/* Next Activity Banner */}
      <div
        style={{
          margin: '0 12px 10px',
          borderRadius: 22,
          padding: '16px',
          background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                margin: '0 0 2px',
              }}
            >
              NEXT ACTIVITY ⏰
            </p>
            {pendingMed.addedBy?.includes('Suresh') && (
              <span
                style={{
                  fontSize: 8.5,
                  padding: '1.5px 6px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.25)',
                  color: 'white',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                Added by Suresh (Son)
              </span>
            )}
          </div>
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 24,
              color: 'white',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {pendingMed.time}
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'white', margin: '3px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pendingMed.name}
          </p>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pendingMed.dose} · {pendingMed.note}
          </p>
        </div>
        <button
          onClick={() => setShowMedAlert(true)}
          style={{
            padding: '10px 14px',
            borderRadius: 14,
            background: '#f59e0b',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
            boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            flexShrink: 0,
          }}
        >
          Take Dose
        </button>
      </div>

      {/* Recent Voice Check-In Logs */}
      <div style={{ margin: '0 12px 16px', borderRadius: 22, padding: '16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              margin: 0,
            }}
          >
            Recent Voice Check-In Logs
          </p>
          <button
            onClick={() => setShowCheckInModal(true)}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#10b981',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + New Check-In
          </button>
        </div>

        {[
          {
            time: '7:15 AM',
            label: 'Morning Check-In',
            note: 'Sleep: Excellent. Stiffness reported.',
            color: '#10b981',
          },
          {
            time: 'Yesterday',
            label: 'Evening Check-In',
            note: 'Stable. Mild physical fatigue on joints.',
            color: '#7c3aed',
          },
        ].map((log) => (
          <div
            key={log.label}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}
          >
            <span
              style={{
                fontSize: 10,
                color: '#9ca3af',
                whiteSpace: 'nowrap',
                paddingTop: 3,
                width: 58,
                flexShrink: 0,
              }}
            >
              {log.time}
            </span>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: log.color,
                flexShrink: 0,
                marginTop: 4,
              }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                {log.label}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{log.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Medication Alert Modal */}
      {showMedAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 340,
              maxWidth: '90%',
              background: 'white',
              borderRadius: 24,
              padding: 20,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                margin: '0 auto 12px',
              }}
            >
              💊
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#111827', fontWeight: 800 }}>
              Medication Reminder
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6b7280' }}>
              Scheduled for {pendingMed.time} today
            </p>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 16,
                padding: 14,
                textAlign: 'left',
                marginBottom: 16,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {pendingMed.name}
                </p>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#059669', fontWeight: 600 }}>
                Dosage: {pendingMed.dose}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                Instructions: {pendingMed.note}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowMedAlert(false);
                }}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 14,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Snooze 10m
              </button>
              <button
                onClick={() => {
                  setShowMedAlert(false);
                  setMedToast(`✅ ${pendingMed.name} marked as taken!`);
                  setTimeout(() => setMedToast(''), 3500);
                }}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 14,
                  background: '#10b981',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ✓ Mark Taken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Check-In Modal */}
      {showCheckInModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 350,
              maxWidth: '92%',
              background: 'white',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📝</span>
                <h3 style={{ margin: 0, fontSize: 16, color: '#111827', fontWeight: 800 }}>
                  Daily Check-In
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setCheckInResult(null);
                  setCheckInText('');
                }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
              How is Rajamma feeling right now? Enter any physical sensations, sleep, or mood:
            </p>

            <textarea
              rows={3}
              value={checkInText}
              onChange={(e) => setCheckInText(e.target.value)}
              placeholder="e.g., Slept soundly, but noticed a slight stiffness in the right knee after breakfast."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#1e293b',
                outline: 'none',
                fontFamily: "'Nunito', sans-serif",
                resize: 'none',
                marginBottom: 12,
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  if (onVoiceCall) onVoiceCall();
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#ede9fe',
                  color: '#7c3aed',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🎙️ Speak Instead
              </button>
              <button
                onClick={handleRunCheckIn}
                disabled={checkInLoading || !checkInText.trim()}
                style={{
                  flex: 1.4,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: checkInText.trim() ? '#10b981' : '#cbd5e1',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: checkInText.trim() ? 'pointer' : 'default',
                }}
              >
                {checkInLoading ? '⏳ AI Analyzing...' : 'Submit to AI'}
              </button>
            </div>

            {checkInResult && (
              <div
                style={{
                  background: '#f0fdf4',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>
                    🤖 Aura AI Response:
                  </span>
                  <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                    Mood: {checkInResult.mood || 'Calm'}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 11.5, color: '#166534', lineHeight: 1.4 }}>
                  {checkInResult.aiReply}
                </p>
                {checkInResult.symptomFlag && (
                  <p style={{ margin: 0, fontSize: 10, color: '#b45309', fontWeight: 600 }}>
                    ⚠️ Note: {checkInResult.symptomFlag}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
