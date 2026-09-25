import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthModal() {
  const {
    user,
    signInWithGoogle,
    signInEmail,
    signUpEmail,
    signInDemoCaregiver,
    signOut,
    isAuthModalOpen,
    setIsAuthModalOpen,
    openAuthScreen,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoadingAction(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in popup was closed. Click above to try again or use email sign-in.');
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please enable popups for this site or use email sign-in.');
        return;
      }
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Google sign-in could not be completed.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDemoAuth = async () => {
    setErrorMsg('');
    setLoadingAction(true);
    try {
      await signInDemoCaregiver();
    } catch (err: any) {
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Demo sign-in could not be completed.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg('');
    setLoadingAction(true);
    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please verify and try again.');
      } else if (err?.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Switch to Sign In above.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      onClick={() => setIsAuthModalOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        id="auth-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'white',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          ✕
        </button>

        {/* If user is ALREADY signed in */}
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                overflow: 'hidden',
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user.displayName?.[0] || user.email?.[0] || 'R').toUpperCase()
              )}
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {user.displayName || 'Elder Care User'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{user.email}</p>
            </div>

            {/* Cloud Sync Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 12,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
              Connected to Cloud Firestore
            </div>

            <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
              Your health observations, spoken check-ins, and companion voice settings are securely synchronized to your account.
            </p>

            <button
              id="btn-sign-out"
              onClick={async () => {
                await signOut();
                setIsAuthModalOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 14,
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              Sign Out of Account
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 22,
                  margin: '0 auto 10px',
                }}
              >
                🔐
              </div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                {mode === 'signin' ? 'Welcome to Aura' : 'Create Account'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                Sign in to persist your health logs and voice preferences
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              id="btn-google-signin"
              onClick={handleGoogleAuth}
              disabled={loadingAction}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 14,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: '#1e293b',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Mode Toggle Pills: Sign In vs Sign Up */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: mode === 'signin' ? 'white' : 'transparent',
                  color: mode === 'signin' ? '#0f172a' : '#64748b',
                  fontWeight: mode === 'signin' ? 800 : 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: mode === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: mode === 'signup' ? 'white' : 'transparent',
                  color: mode === 'signup' ? '#0f172a' : '#64748b',
                  fontWeight: mode === 'signup' ? 800 : 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: mode === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Sign Up
              </button>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="caregiver@family.org"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {errorMsg && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: 11.5,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingAction}
                style={{
                  marginTop: 4,
                  padding: '11px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {loadingAction ? 'Processing...' : mode === 'signin' ? 'Sign In to Account' : 'Register New Account'}
              </button>
            </form>

            {/* One-Click Quick Demo Sign-in & Continue as Guest */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                id="btn-demo-signin"
                onClick={handleDemoAuth}
                disabled={loadingAction}
                style={{
                  padding: '9px',
                  borderRadius: 12,
                  background: '#f0fdf4',
                  border: '1.5px dashed #86efac',
                  color: '#15803d',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>⚡ Instant Caregiver Demo Login</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  openAuthScreen(mode === 'signin' ? 'signin' : 'signup');
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#059669',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>📱</span>
                <span>Open Full Mobile {mode === 'signin' ? 'Sign In' : 'Sign Up'} View</span>
              </button>

              <button
                onClick={() => setIsAuthModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0',
                  textDecoration: 'underline',
                }}
              >
                Continue as Guest (Local Mode)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
