import React, { useState, useEffect } from 'react';
import { Overview } from './screens/Overview';
import { WellnessTrends } from './screens/WellnessTrends';
import { CareCircle } from './screens/CareCircle';
import { PatientRecords } from './screens/PatientRecords';
import { Settings } from './screens/Settings';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WakeWordProvider, useWakeWord } from './context/WakeWordContext';
import { AuthModal } from './components/AuthModal';

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? '#059669' : '#9ca3af'} className="w-5 h-5">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? '#059669' : '#9ca3af'} className="w-5 h-5">
        <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
      </svg>
    ),
  },
  {
    id: 'care',
    label: 'Care',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? '#059669' : '#9ca3af'} className="w-5 h-5">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
  {
    id: 'records',
    label: 'Records',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? '#059669' : '#9ca3af'} className="w-5 h-5">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? '#059669' : '#9ca3af'} className="w-5 h-5">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    ),
  },
];

function MainContent() {
  const { user, authScreen, openAuthScreen, closeAuthScreen, setIsAuthModalOpen } = useAuth();
  const { aiName, isTriggered, triggeredBy, lastReply, wakeWordEnabled, isListening } = useWakeWord();
  const [activeTab, setActiveTab] = useState('overview');
  const [voiceActive, setVoiceActive] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [sosToast, setSosToast] = useState(false);

  // Listen to wake word event anywhere across the application
  useEffect(() => {
    const handleWake = () => {
      setActiveTab('overview');
      setVoiceActive(true);
    };
    window.addEventListener('aura_wakeword_detected', handleWake);
    return () => window.removeEventListener('aura_wakeword_detected', handleWake);
  }, []);

  // Live real-time clock for status bar
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      .replace(/\s*[AP]M/i, '')
      .trim();
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now
          .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          .replace(/\s*[AP]M/i, '')
          .trim()
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleVoice = () => {
    if (activeTab !== 'overview') {
      setActiveTab('overview');
    }
    setVoiceActive((prev) => !prev);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#dde3ea',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Mobile Device Frame (iPhone 390x844) */}
      <div
        style={{
          width: 390,
          height: 844,
          maxWidth: '100vw',
          maxHeight: '100vh',
          background: '#f2f4f7',
          borderRadius: 44,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.08), 0 8px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {/* iOS Status Bar */}
        <div
          style={{
            flexShrink: 0,
            height: 44,
            background: '#f2f4f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 20,
            paddingRight: 16,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.2px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentTime}
          </span>

          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 10,
              transform: 'translateX(-50%)',
              minWidth: 120,
              height: 34,
              padding: '0 10px',
              background: '#111827',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: isTriggered ? '0 0 16px rgba(168,85,247,0.6)' : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            {isTriggered ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: triggeredBy === 'Siri' ? '#c084fc' : '#10b981',
                    boxShadow: triggeredBy === 'Siri' ? '0 0 8px #c084fc' : '0 0 8px #10b981',
                  }}
                />
                <span
                  style={{
                    fontSize: 9.5,
                    color: triggeredBy === 'Siri' ? '#e9d5ff' : '#6ee7b7',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}
                >
                  {triggeredBy === 'Siri' ? 'Hey Siri!' : `Hey ${aiName}!`}
                </span>
              </div>
            ) : voiceActive ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#a855f7' }} />
                <span style={{ fontSize: 10, color: '#e9d5ff', fontWeight: 600 }}>{aiName} Active</span>
              </div>
            ) : wakeWordEnabled && isListening ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: '#10b981' }} />
                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Say &ldquo;Siri&rdquo;</span>
              </div>
            ) : null}
          </div>

          {/* Signal / Battery & Auth trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              id="btn-statusbar-auth"
              onClick={() => {
                if (user) {
                  setIsAuthModalOpen(true);
                } else {
                  openAuthScreen('signin');
                }
              }}
              style={{
                border: 'none',
                background: user ? '#ecfdf5' : '#e2e8f0',
                color: user ? '#059669' : '#334155',
                fontSize: 10,
                fontWeight: 800,
                borderRadius: 12,
                padding: '2px 7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title={user ? `Signed in as ${user.email}` : 'Sign in / Sign up'}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: user ? '#10b981' : '#94a3b8' }} />
              {user ? (user.displayName?.split(' ')[0] || 'User') : 'Login'}
            </button>
            <svg viewBox="0 0 24 24" fill="#111827" style={{ width: 14, height: 14 }}>
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="#111827" style={{ width: 14, height: 14 }}>
              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
            </svg>
          </div>
        </div>

        {/* Floating Siri Automatic Voice Response Banner */}
        {isTriggered && lastReply && (
          <div
            style={{
              position: 'absolute',
              top: 50,
              left: 14,
              right: 14,
              zIndex: 50,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,27,75,0.96))',
              backdropFilter: 'blur(16px)',
              borderRadius: 18,
              padding: '12px 14px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 0 1px rgba(192,132,252,0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              animation: 'bounce 0.3s ease',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(168,85,247,0.5)',
              }}
            >
              🎙️
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#c084fc', letterSpacing: '0.02em' }}>
                  {triggeredBy === 'Siri' ? 'Siri Responded Out Loud' : `${aiName} Responded Out Loud`}
                </span>
                <span style={{ fontSize: 9.5, color: '#a7f3d0', fontWeight: 700 }}>Speaking 🔊</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#f8fafc', lineHeight: 1.4, fontWeight: 600 }}>
                &ldquo;{lastReply}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Tab Screens Viewport */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {authScreen === 'signin' && (
            <SignInScreen
              onBack={closeAuthScreen}
              onNavigateToSignUp={() => openAuthScreen('signup')}
            />
          )}
          {authScreen === 'signup' && (
            <SignUpScreen
              onBack={() => openAuthScreen('signin')}
              onNavigateToSignIn={() => openAuthScreen('signin')}
            />
          )}
          {!authScreen && activeTab === 'overview' && (
            <Overview
              onNavigateTab={(tab) => setActiveTab(tab)}
              onVoiceCall={toggleVoice}
              externalOrbActive={voiceActive}
              onEmergencySOS={() => setIsSOSOpen(true)}
            />
          )}
          {!authScreen && activeTab === 'trends' && <WellnessTrends />}
          {!authScreen && activeTab === 'care' && <CareCircle />}
          {!authScreen && activeTab === 'records' && <PatientRecords />}
          {!authScreen && activeTab === 'settings' && <Settings />}
        </div>

        {/* Floating Voice Companion Trigger */}
        {!authScreen && (
          <button
            onClick={toggleVoice}
            style={{
              position: 'absolute',
              right: 16,
              bottom: 76,
              width: 52,
              height: 52,
              borderRadius: 26,
              background: voiceActive
                ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                : 'linear-gradient(135deg,#047857,#10b981)',
              boxShadow: voiceActive
                ? '0 0 0 6px rgba(124,58,237,0.18), 0 6px 20px rgba(124,58,237,0.45)'
                : '0 6px 20px rgba(16,185,129,0.45)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              transition: 'all 0.25s ease',
            }}
            aria-label="Voice companion"
          >
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 22, height: 22 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>

            {voiceActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: 34,
                  border: '2px solid rgba(168,85,247,0.5)',
                  animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                }}
              />
            )}
          </button>
        )}

        {/* Bottom Navigation Bar */}
        {!authScreen && (
          <div
            style={{
              flexShrink: 0,
              height: 68,
              background: 'white',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              paddingBottom: 4,
              boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
              zIndex: 10,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: '6px 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: isCurrent ? '#059669' : '#9ca3af',
                    transition: 'color 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 26,
                      borderRadius: 13,
                      background: isCurrent ? 'rgba(5,150,105,0.1)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                  >
                    {item.icon(isCurrent)}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isCurrent ? 700 : 500,
                      fontFamily: "'Nunito', sans-serif",
                      color: isCurrent ? '#059669' : '#9ca3af',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Emergency SOS Modal */}
        {isSOSOpen && (
          <EmergencySOSModal
            isOpen={isSOSOpen}
            onClose={() => setIsSOSOpen(false)}
            onConfirm={() => {
              setIsSOSOpen(false);
              setSosToast(true);
              setTimeout(() => setSosToast(false), 4500);
            }}
          />
        )}

        {/* SOS Alert Dispatched In-App Toast */}
        {sosToast && (
          <div
            style={{
              position: 'absolute',
              top: 50,
              left: 14,
              right: 14,
              zIndex: 9999,
              background: '#ef4444',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(239,68,68,0.45)',
              fontWeight: 700,
              fontSize: 12.5,
              animation: 'bounce 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <span>Emergency Alert dispatched to all Care Circle members!</span>
            </div>
            <button
              onClick={() => setSosToast(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Firebase Authentication Modal (Sign In / Sign Up / Google) */}
        <AuthModal />
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WakeWordProvider>
        <MainContent />
      </WakeWordProvider>
    </AuthProvider>
  );
}
