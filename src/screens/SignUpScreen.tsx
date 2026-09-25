import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';

interface SignUpScreenProps {
  onBack?: () => void;
  onNavigateToSignIn?: () => void;
}

export function SignUpScreen({ onBack, onNavigateToSignIn }: SignUpScreenProps) {
  const {
    signUpEmail,
    signInWithGoogle,
    signInDemoCaregiver,
    openAuthScreen,
    closeAuthScreen,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoToSignIn = () => {
    if (onNavigateToSignIn) {
      onNavigateToSignIn();
    } else {
      openAuthScreen('signin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Please accept the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);
    try {
      await signUpEmail(email.trim(), password, fullName.trim(), phone.trim());
    } catch (err: any) {
      console.error('Sign-up error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please Sign In.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMsg('Password is too weak. Please use at least 6 characters.');
      } else if (err?.code === 'auth/invalid-email') {
        setErrorMsg('The email address is invalid.');
      } else {
        setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Google sign-up could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignUp = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signInDemoCaregiver();
    } catch (err: any) {
      setErrorMsg(err?.message?.replace('Firebase: ', '') || 'Demo sign-up could not be completed.');
    } finally {
      setIsLoading(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', letterSpacing: '-0.01em' }}>
            Aura Companion
          </span>
        </div>

        <button
          onClick={handleGoToSignIn}
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            padding: '7px 12px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Sign In</span>
          <span>→</span>
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
        <div style={{ marginBottom: 20, textAlign: 'left' }}>
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
            <ShieldCheck size={26} />
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
            Sign Up
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            Create your caregiver account to monitor, protect, and care for your loved ones.
          </p>
        </div>

        {/* Top Mode Switcher: Sign In vs Sign Up */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 14,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={handleGoToSignIn}
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
            Sign In
          </button>
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
            Sign Up
          </button>
        </div>

        {/* Error Banner */}
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
              marginBottom: 14,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 5,
              }}
            >
              Full Name
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
                <User size={18} />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Kumar"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 5,
              }}
            >
              Email Address
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caregiver@family.org"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Phone Number Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 5,
              }}
            >
              Phone Number <span style={{ color: '#94a3b8', fontWeight: 500 }}>(for SOS alerts)</span>
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
                <Phone size={18} />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
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
                marginBottom: 5,
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
                placeholder="At least 6 characters"
                required
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 42px',
                  borderRadius: 14,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13.5,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
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

          {/* Terms Agreement Checkbox */}
          <div style={{ marginTop: 2 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                cursor: 'pointer',
                color: '#475569',
                fontSize: 12,
                userSelect: 'none',
                lineHeight: 1.4,
              }}
            >
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{
                  accentColor: '#059669',
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <span>
                I agree to the <span style={{ color: '#059669', fontWeight: 700 }}>Terms of Service</span> and{' '}
                <span style={{ color: '#059669', fontWeight: 700 }}>Privacy Policy</span>.
              </span>
            </label>
          </div>

          {/* Sign Up Primary Button */}
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
              <span>Creating Account...</span>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0 14px',
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
            Or sign up with
          </span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {/* Social Options */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
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
            onClick={handleDemoSignUp}
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
          onClick={handleDemoSignUp}
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
          <span>⚡ One-Click Caregiver Demo Sign-Up</span>
        </button>

        {/* Footer Call to Action: Switch to Sign In */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            textAlign: 'center',
            fontSize: 13,
            color: '#64748b',
          }}
        >
          <span>Already have an account? </span>
          <button
            type="button"
            onClick={handleGoToSignIn}
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
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
