import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react';

interface SignInScreenProps {
  onBack?: () => void;
  onNavigateToSignUp?: () => void;
}

export function SignInScreen({ onBack, onNavigateToSignUp }: SignInScreenProps) {
  const {
    signInEmail,
    signInWithGoogle,
    signInDemoCaregiver,
    sendPasswordReset,
    openAuthScreen,
    closeAuthScreen,
  } = useAuth();

  const [identifier, setIdentifier] = useState(() => localStorage.getItem('aura_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('aura_remember_me') !== 'false');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password sub-view / sheet
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (identifier) {
      setForgotEmail(identifier);
    }
  }, [identifier]);

  const handleDismiss = () => {
    sessionStorage.setItem('aura_authenticated_session', 'guest');
    if (onBack) {
      onBack();
    } else {
      closeAuthScreen();
    }
  };

  const handleGoToSignUp = () => {
    if (onNavigateToSignUp) {
      onNavigateToSignUp();
    } else {
      openAuthScreen('signup');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedInput = identifier.trim();
    if (!trimmedInput) {
      setErrorMsg('Please enter your email address or phone number.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    // If identifier is not standard email format, guide the user or format
    const emailToUse = trimmedInput.includes('@')
      ? trimmedInput
      : `${trimmedInput.replace(/[^0-9]/g, '')}@aura.care`;

    setIsLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem('aura_remember_email', trimmedInput);
        localStorage.setItem('aura_remember_me', 'true');
      } else {
        localStorage.removeItem('aura_remember_email');
        localStorage.setItem('aura_remember_me', 'false');
      }

      await signInEmail(emailToUse, password);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setErrorMsg('Invalid email/phone or password. Please try again.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMsg('Too many unsuccessful attempts. Please reset password or try again later.');
      } else {
        setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Sign-in failed. Please check credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signInDemoCaregiver();
    } catch (err: any) {
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Demo sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }
    setResetLoading(true);
    setErrorMsg('');
    try {
      await sendPasswordReset(forgotEmail.trim());
      setResetSent(true);
      setSuccessMsg(`Password reset instructions sent to ${forgotEmail.trim()}`);
    } catch (err: any) {
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Could not send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Nunito', sans-serif",
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Top Header / Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 8px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#334155',
            transition: 'background 0.15s',
          }}
          title="Back to Dashboard"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 8,
          }}
        >
          Skip
        </button>
      </div>

      {/* Main Content Container */}
      <div
        style={{
          padding: '12px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* App Hero / Title Badge */}
        <div style={{ marginBottom: 24, textAlign: 'left' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 18px rgba(16,185,129,0.3)',
              marginBottom: 16,
            }}
          >
            <Sparkles size={26} />
          </div>

          <h1
            style={{
              margin: '0 0 6px',
              fontSize: 26,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
            }}
          >
            Sign In
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            Welcome back! Please enter your details to access elder care & wellness logs.
          </p>
        </div>

        {/* Top Mode Switcher: Sign In vs Sign Up */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 11,
              border: 'none',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'default',
              boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={handleGoToSignUp}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 11,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#16a34a',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <Check size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email / Phone Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Email or Phone Number
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Mail size={18} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="caregiver@family.org"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              marginTop: -2,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                color: '#475569',
                userSelect: 'none',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#059669',
                  width: 15,
                  height: 15,
                  cursor: 'pointer',
                }}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#059669',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Primary Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '13px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: 14.5,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.1s, opacity 0.15s',
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '22px 0 16px',
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Or sign in with
          </span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {/* Social / Alternative Sign-in Options */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }}>
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
            <span>Google</span>
          </button>

          {/* Apple Button */}
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="#0f172a">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.76 1.04-1.82.93-2.87-.9.04-2 .6-2.65 1.36-.58.68-1.09 1.77-.95 2.81.99.08 2.04-.54 2.67-1.3" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        {/* Demo Caregiver 1-Click login banner */}
        <button
          type="button"
          onClick={handleDemoSignIn}
          disabled={isLoading}
          style={{
            marginTop: 10,
            padding: '10px 14px',
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
          <span>⚡ One-Click Caregiver Demo Sign-In</span>
        </button>

        {/* Footer Call to Action: Sign Up link */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            textAlign: 'center',
            fontSize: 13,
            color: '#64748b',
          }}
        >
          <span>Don't have an account? </span>
          <button
            type="button"
            onClick={handleGoToSignUp}
            style={{
              background: 'none',
              border: 'none',
              color: '#059669',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Forgot Password Drawer/Modal */}
      {showForgotPassword && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: '24px 20px 32px',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                Reset Password
              </h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
              Enter your registered email address and we'll send you a password reset link.
            </p>

            <form onSubmit={handleSendResetEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 13,
                    color: '#94a3b8',
                  }}
                >
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="caregiver@family.org"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
