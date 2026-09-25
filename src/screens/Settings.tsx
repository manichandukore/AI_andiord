import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWakeWord } from '../context/WakeWordContext';

interface LanguageOption {
  id: string;
  name: string;
  native: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'Telugu', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'Hindi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { id: 'English', name: 'English', native: 'English', flag: '🌐' },
  { id: 'Auto', name: 'Auto-Detect', native: 'స్వయంచాలక', flag: '✨' },
];

export function Settings() {
  const [seniorName, setSeniorName] = useState(() => localStorage.getItem('aura_senior_name') || 'Rajamma');
  const [seniorAge, setSeniorAge] = useState(() => localStorage.getItem('aura_senior_age') || '72');
  const [seniorGender, setSeniorGender] = useState(() => localStorage.getItem('aura_senior_gender') || 'Female');
  const [seniorBloodGroup, setSeniorBloodGroup] = useState(() => localStorage.getItem('aura_senior_blood_group') || 'B+');
  const [seniorPhone, setSeniorPhone] = useState(() => localStorage.getItem('aura_senior_phone') || '+91 98480 23456');
  const [seniorAddress, setSeniorAddress] = useState(() => localStorage.getItem('aura_senior_address') || 'Flat 302, Green Acres, Hyderabad');
  const [caregiverName, setCaregiverName] = useState(() => localStorage.getItem('aura_caregiver_name') || 'Kavitha (Daughter)');
  const [caregiverPhone, setCaregiverPhone] = useState(() => localStorage.getItem('aura_caregiver_phone') || '+91 98765 43210');
  const [medicalConditions, setMedicalConditions] = useState(() => localStorage.getItem('aura_medical_conditions') || 'Hypertension, Type 2 Diabetes');
  const [allergies, setAllergies] = useState(() => localStorage.getItem('aura_allergies') || 'Penicillin allergy · Low sodium diet');
  const [primaryDoctor, setPrimaryDoctor] = useState(() => localStorage.getItem('aura_primary_doctor') || 'Dr. S. K. Rao (Apollo Hospitals)');
  const [emergencyContact, setEmergencyContact] = useState(() => localStorage.getItem('aura_emergency_contact') || 'Ramesh (Son) · +91 98480 12345');
  const [dashLang, setDashLang] = useState(() => localStorage.getItem('aura_dash_lang') || 'English');
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem('aura_voice_lang') || 'Telugu');
  const [liveLang, setLiveLang] = useState(() => localStorage.getItem('aura_live_lang') || 'te-IN');
  const [liveVoice, setLiveVoice] = useState(() => localStorage.getItem('aura_live_voice') || 'Aoede');
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => localStorage.getItem('aura_speech_rate') || 'Normal');
  const [checkInTime, setCheckInTime] = useState(() => localStorage.getItem('aura_checkin_time') || '8:00 AM');
  const [autoCall, setAutoCall] = useState(() => localStorage.getItem('aura_auto_call') !== 'false');
  const [notifyFamily, setNotifyFamily] = useState(() => localStorage.getItem('aura_notify_family') !== 'false');
  const [fallDetection, setFallDetection] = useState(() => localStorage.getItem('aura_fall_detect') !== 'false');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('aura_high_contrast') === 'true');
  const [showInterfaceLangOptions, setShowInterfaceLangOptions] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [emergencyAlertSent, setEmergencyAlertSent] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [logoutToast, setLogoutToast] = useState(false);

  const { user, signOut, openAuthScreen } = useAuth();

  const handleLogOut = async () => {
    try {
      await signOut();
    } catch {
      // Ignored
    }
    setLogoutToast(true);
    setTimeout(() => setLogoutToast(false), 2500);
    openAuthScreen('signin');
  };

  const {
    aiName,
    setAiName,
    wakeWordEnabled,
    setWakeWordEnabled,
    isListening,
    triggerWakeWord,
  } = useWakeWord();

  const [aiNameInput, setAiNameInput] = useState(aiName);
  const [testTriggered, setTestTriggered] = useState(false);

  useEffect(() => {
    setAiNameInput(aiName);
  }, [aiName]);

  // Auto-save changes to localStorage
  const savePreferences = () => {
    localStorage.setItem('aura_senior_name', seniorName);
    localStorage.setItem('aura_senior_age', seniorAge);
    localStorage.setItem('aura_senior_gender', seniorGender);
    localStorage.setItem('aura_senior_blood_group', seniorBloodGroup);
    localStorage.setItem('aura_senior_phone', seniorPhone);
    localStorage.setItem('aura_senior_address', seniorAddress);
    localStorage.setItem('aura_caregiver_name', caregiverName);
    localStorage.setItem('aura_caregiver_phone', caregiverPhone);
    localStorage.setItem('aura_medical_conditions', medicalConditions);
    localStorage.setItem('aura_allergies', allergies);
    localStorage.setItem('aura_primary_doctor', primaryDoctor);
    localStorage.setItem('aura_emergency_contact', emergencyContact);
    localStorage.setItem('aura_ai_name', aiNameInput.trim() || 'Aura');
    localStorage.setItem('aura_wake_word_enabled', String(wakeWordEnabled));
    localStorage.setItem('aura_dash_lang', dashLang);
    localStorage.setItem('aura_voice_lang', voiceLang);
    localStorage.setItem('aura_live_lang', liveLang);
    localStorage.setItem('aura_live_voice', liveVoice);
    localStorage.setItem('aura_speech_rate', speechRate);
    localStorage.setItem('aura_checkin_time', checkInTime);
    localStorage.setItem('aura_auto_call', String(autoCall));
    localStorage.setItem('aura_notify_family', String(notifyFamily));
    localStorage.setItem('aura_fall_detect', String(fallDetection));
    localStorage.setItem('aura_high_contrast', String(highContrast));

    if (aiNameInput.trim() && aiNameInput.trim() !== aiName) {
      setAiName(aiNameInput.trim());
    }

    window.dispatchEvent(new Event('aura_settings_updated'));
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  useEffect(() => {
    // Save on state updates
    localStorage.setItem('aura_dash_lang', dashLang);
    localStorage.setItem('aura_voice_lang', voiceLang);
    localStorage.setItem('aura_live_lang', liveLang);
    localStorage.setItem('aura_live_voice', liveVoice);
    localStorage.setItem('aura_speech_rate', speechRate);
    localStorage.setItem('aura_checkin_time', checkInTime);
    localStorage.setItem('aura_auto_call', String(autoCall));
    localStorage.setItem('aura_notify_family', String(notifyFamily));
    localStorage.setItem('aura_fall_detect', String(fallDetection));
    localStorage.setItem('aura_high_contrast', String(highContrast));
    window.dispatchEvent(new Event('aura_settings_updated'));
  }, [dashLang, voiceLang, liveLang, liveVoice, speechRate, checkInTime, autoCall, notifyFamily, fallDetection, highContrast]);

  const handleEmergencyAssist = async () => {
    setEmergencyAlertSent(true);
    try {
      await fetch('/api/whatsapp/send-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomText: 'Emergency Assist triggered via Settings',
          userName: seniorName,
          location: 'Home (Flat 302, Hyderabad)',
        }),
      });
    } catch {
      // Handled silently
    }
    setTimeout(() => {
      setEmergencyAlertSent(false);
    }, 4000);
  };

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#f8fafc',
        paddingBottom: 40,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Top App Bar */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          borderBottom: '1px solid #f1f5f9',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          Settings & Preferences
        </h1>

        {/* Temporary Saved notification only when changes saved */}
        {isSavedToast && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              background: '#dcfce7',
              color: '#15803d',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: '#16a34a',
              }}
            />
            Saved
          </div>
        )}

        {/* Temporary Logged Out notification */}
        {logoutToast && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              background: '#fee2e2',
              color: '#b91c1c',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: '#dc2626',
              }}
            />
            Logged Out
          </div>
        )}
      </div>

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Profile Card */}
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(16,185,129,0.25)',
                flexShrink: 0,
              }}
            >
              {seniorName.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {seniorName}
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  Active Care
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                  }}
                >
                  🩸 {seniorBloodGroup}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                {seniorAge} yrs · {seniorGender} · {seniorAddress ? seniorAddress.split(',').pop()?.trim() || 'Hyderabad' : 'Hyderabad'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: isEditingProfile ? '#0f172a' : '#f1f5f9',
                  color: isEditingProfile ? 'white' : '#334155',
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isEditingProfile ? 'Done' : 'Edit'}
              </button>

              {user ? (
                <button
                  onClick={handleLogOut}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid #fecaca',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Log Out"
                >
                  <span>🚪</span>
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  onClick={() => openAuthScreen('signin')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    background: '#ecfdf5',
                    color: '#059669',
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid #a7f3d0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Sign In / Sign Up"
                >
                  <span>🔐</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick info tags when collapsed */}
          {!isEditingProfile && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid #f8fafc',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                }}
              >
                📍 {seniorAddress}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                }}
              >
                📞 {seniorPhone}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                }}
              >
                👩‍👧 {caregiverName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                }}
              >
                🩺 {primaryDoctor}
              </span>
            </div>
          )}

          {/* Collapsible Edit Details */}
          {isEditingProfile && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Row 1: Full Name & Age */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Senior Full Name
                  </label>
                  <input
                    type="text"
                    value={seniorName}
                    onChange={(e) => setSeniorName(e.target.value)}
                    placeholder="e.g. Rajamma"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={seniorAge}
                    onChange={(e) => setSeniorAge(e.target.value)}
                    placeholder="72"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Gender & Blood Group */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Gender
                  </label>
                  <select
                    value={seniorGender}
                    onChange={(e) => setSeniorGender(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    <option value="Female">Female (స్త్రీ)</option>
                    <option value="Male">Male (పురుషుడు)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    🩸 Blood Group
                  </label>
                  <select
                    value={seniorBloodGroup}
                    onChange={(e) => setSeniorBloodGroup(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Primary Phone & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    📞 Senior Phone
                  </label>
                  <input
                    type="tel"
                    value={seniorPhone}
                    onChange={(e) => setSeniorPhone(e.target.value)}
                    placeholder="+91 98480 23456"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    📍 Home Address / City
                  </label>
                  <input
                    type="text"
                    value={seniorAddress}
                    onChange={(e) => setSeniorAddress(e.target.value)}
                    placeholder="Flat 302, Green Acres, Hyderabad"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Divider: Emergency & Care Circle */}
              <div style={{ margin: '4px 0', borderTop: '1px dashed #e2e8f0', paddingTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  👨‍👩‍👧 Family Caregiver & Emergency Contacts
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Primary Caregiver & Relationship
                  </label>
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Kavitha (Daughter)"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Caregiver Phone
                  </label>
                  <input
                    type="tel"
                    value={caregiverPhone}
                    onChange={(e) => setCaregiverPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  🚨 24/7 Emergency SOS Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Ramesh (Son) · +91 98480 12345"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Divider: Medical & Clinical Details */}
              <div style={{ margin: '4px 0', borderTop: '1px dashed #e2e8f0', paddingTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  🩺 Medical & Health Information
                </span>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Key Chronic Conditions
                </label>
                <input
                  type="text"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  ⚠️ Known Allergies & Dietary Restrictions
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin allergy · Low sodium diet"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  🏥 Primary Physician & Hospital
                </label>
                <input
                  type="text"
                  value={primaryDoctor}
                  onChange={(e) => setPrimaryDoctor(e.target.value)}
                  placeholder="Dr. S. K. Rao · Apollo Hospitals"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => {
                    savePreferences();
                    setIsEditingProfile(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    background: '#10b981',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span>✓</span>
                  <span>Save Profile Details</span>
                </button>

                <button
                  onClick={() => setIsEditingProfile(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    color: '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section: AI Companion Name */}
        <div id="ai-name-wakeword-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 6px' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              AI Companion Name
            </p>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* AI Name Input Field */}
            <div>
              <label
                htmlFor="input-ai-name"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                <span>✨ AI Companion Name</span>
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="input-ai-name"
                  type="text"
                  value={aiNameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAiNameInput(val);
                    if (val.trim()) {
                      setAiName(val.trim());
                    }
                  }}
                  onBlur={() => {
                    if (aiNameInput.trim()) {
                      setAiName(aiNameInput.trim());
                      localStorage.setItem('aura_ai_name', aiNameInput.trim());
                      window.dispatchEvent(new Event('aura_settings_updated'));
                    }
                  }}
                  placeholder="Enter name (e.g. Siri, Aura, Maya)"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (aiNameInput.trim()) {
                      setAiName(aiNameInput.trim());
                      localStorage.setItem('aura_ai_name', aiNameInput.trim());
                      window.dispatchEvent(new Event('aura_settings_updated'));
                      setIsSavedToast(true);
                      setTimeout(() => setIsSavedToast(false), 2000);
                    }
                  }}
                  style={{
                    padding: '0 16px',
                    borderRadius: 10,
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>

              {/* Quick Preset Names */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Presets:</span>
                {['Siri', 'Aura', 'Maya'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAiNameInput(preset);
                      setAiName(preset);
                      localStorage.setItem('aura_ai_name', preset);
                      window.dispatchEvent(new Event('aura_settings_updated'));
                      setIsSavedToast(true);
                      setTimeout(() => setIsSavedToast(false), 1500);
                    }}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: aiName === preset ? '#ede9fe' : '#f1f5f9',
                      color: aiName === preset ? '#7c3aed' : '#475569',
                      border: `1px solid ${aiName === preset ? '#c4b5fd' : '#e2e8f0'}`,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {preset === 'Siri' ? '✨ Siri (Active)' : preset}
                  </button>
                ))}
              </div>

              {/* Automatic Siri Response Feature Card */}
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#6b21a8' }}>
                    🎙️ Automatic Siri Voice Response
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#7e22ce' }}>
                    Say &ldquo;Siri&rdquo; or &ldquo;Hey Siri&rdquo; anywhere to get an immediate spoken answer
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => triggerWakeWord('Siri')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#7c3aed',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
                  }}
                >
                  Test Siri
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 6px' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Gemini 3.8 Live Voice Settings
            </p>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#059669',
                background: '#ecfdf5',
                padding: '2px 7px',
                borderRadius: 8,
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 3, background: '#10b981' }} />
              Live API
            </span>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Master Option Row: Click to reveal inside options */}
            <div
              onClick={() => setShowVoiceOptions(!showVoiceOptions)}
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderBottom: showVoiceOptions ? '1px solid #f1f5f9' : 'none',
                background: showVoiceOptions ? '#faf5ff' : 'white',
                transition: 'background 0.15s ease',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 20 }}>🎙️</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      Live Conversation & Voice
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 7px',
                        borderRadius: 6,
                        background: '#ede9fe',
                        color: '#6d28d9',
                        fontWeight: 800,
                      }}
                    >
                      {liveLang === 'te-IN' ? 'తెలుగు (Telugu)' : liveLang === 'hi-IN' ? 'हिंदी (Hindi)' : 'English'}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Voice: <strong style={{ color: '#0f172a' }}>{liveVoice}</strong> · Pace:{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {speechRate === 'Slow' ? 'Gentle (0.85x)' : speechRate === 'Fast' ? 'Brisk (1.15x)' : 'Natural (1.0x)'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVoiceOptions(!showVoiceOptions);
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 10,
                  background: showVoiceOptions ? '#f1f5f9' : '#7c3aed',
                  color: showVoiceOptions ? '#334155' : 'white',
                  border: showVoiceOptions ? '1px solid #cbd5e1' : 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: showVoiceOptions ? 'none' : '0 2px 6px rgba(124,58,237,0.25)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{showVoiceOptions ? 'Hide' : 'Voice Options'}</span>
                <span style={{ fontSize: 10 }}>{showVoiceOptions ? '▲' : '▾'}</span>
              </button>
            </div>

            {/* Inside Options: revealed when clicked */}
            {showVoiceOptions && (
              <>
                {/* Live API Language Selection (from Image 1) */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🗣️</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      Live Conversation Language
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Language spoken by Aura when you tap the celestial orb
                  </p>
                </div>
              </div>

              {/* Language Pills matching Image 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                {[
                  { id: 'te-IN', name: 'Telugu', native: 'తెలుగు', sub: 'Native for Rajamma' },
                  { id: 'hi-IN', name: 'Hindi', native: 'हिंदी', sub: 'North Indian' },
                  { id: 'en-US', name: 'English', native: 'English', sub: 'International' },
                ].map((lang) => {
                  const isSel = liveLang === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLiveLang(lang.id);
                        savePreferences();
                      }}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 12,
                        background: isSel ? '#7c3aed' : '#f8fafc',
                        color: isSel ? 'white' : '#334155',
                        border: `1.5px solid ${isSel ? '#7c3aed' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        boxShadow: isSel ? '0 3px 10px rgba(124,58,237,0.25)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{lang.native}</span>
                      <span style={{ fontSize: 10, opacity: isSel ? 0.95 : 0.7 }}>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Voice Character Persona Selection (from Image 1) */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🎙️</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      Gemini Live Voice Persona
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Aura's prebuilt natural vocal character
                  </p>
                </div>
              </div>

              {/* Voice Personas Grid matching Image 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {[
                  { id: 'Aoede', name: 'Aoede', tag: 'Gentle & Warm', desc: 'Ideal for soothing eldercare' },
                  { id: 'Zephyr', name: 'Zephyr', tag: 'Calm & Steady', desc: 'Soft and patient tone' },
                  { id: 'Kore', name: 'Kore', tag: 'Bright & Cheerful', desc: 'Crisp, positive articulation' },
                  { id: 'Puck', name: 'Puck', tag: 'Expressive', desc: 'Engaging & friendly cadence' },
                ].map((voice) => {
                  const isSel = liveVoice === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => {
                        setLiveVoice(voice.id);
                        savePreferences();
                      }}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 12,
                        background: isSel ? '#ecfdf5' : '#f8fafc',
                        color: isSel ? '#059669' : '#334155',
                        border: `1.5px solid ${isSel ? '#10b981' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2,
                        boxShadow: isSel ? '0 3px 10px rgba(16,185,129,0.18)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{voice.name}</span>
                        {isSel && (
                          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: '#10b981', color: 'white', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isSel ? '#047857' : '#64748b' }}>
                        {voice.tag}
                      </span>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>{voice.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Test Voice Sample Button */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>
                  Current: <strong style={{ color: '#0f172a' }}>{liveVoice}</strong> ({liveLang === 'te-IN' ? 'తెలుగు' : liveLang === 'hi-IN' ? 'हिंदी' : 'English'})
                </span>
                <button
                  onClick={() => {
                    setIsPlayingSample(true);
                    const utterance = new SpeechSynthesisUtterance(
                      liveLang === 'te-IN'
                        ? 'నమస్కారం రాజమ్మ గారు! నేను మీ జెమిని లైవ్ కంపానియన్.'
                        : liveLang === 'hi-IN'
                        ? 'नमस्ते राजम्मा जी! मैं औरा हूँ।'
                        : `Hello Rajamma! This is Aura using ${liveVoice} voice.`
                    );
                    utterance.lang = liveLang;
                    utterance.rate = 0.95;
                    utterance.onend = () => setIsPlayingSample(false);
                    utterance.onerror = () => setIsPlayingSample(false);
                    window.speechSynthesis.speak(utterance);
                  }}
                  disabled={isPlayingSample}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#0f172a',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>{isPlayingSample ? '🔊' : '▶️'}</span>
                  {isPlayingSample ? 'Testing...' : 'Test Voice'}
                </button>
              </div>
            </div>

            {/* Speaking Pace */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>⏱️</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Speech Pace</span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Calibrated for elderly listening comfort
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
                {[
                  { label: 'Gentle (0.85x)', value: 'Slow' },
                  { label: 'Natural (1.0x)', value: 'Normal' },
                  { label: 'Brisk (1.15x)', value: 'Fast' },
                ].map((item) => {
                  const isSel = speechRate === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setSpeechRate(item.value);
                        savePreferences();
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 8,
                        background: isSel ? 'white' : 'transparent',
                        color: isSel ? '#0f172a' : '#64748b',
                        fontWeight: isSel ? 800 : 600,
                        fontSize: 11,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Health Monitoring & Alerts */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 6px 4px',
            }}
          >
            Safety & Care Circle Alerts
          </p>
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Notify Family Toggle */}
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    WhatsApp Family Notification
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                  Auto-alert Suresh Dev if pain or fatigue persists 2+ days
                </p>
              </div>

              <button
                onClick={() => {
                  setNotifyFamily(!notifyFamily);
                  savePreferences();
                }}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: notifyFamily ? '#10b981' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: 'white',
                    top: 2,
                    left: notifyFamily ? 22 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: App Display & Accessibility */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 6px 4px',
            }}
          >
            Display & Accessibility
          </p>
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Dashboard Display Language */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setShowInterfaceLangOptions(!showInterfaceLangOptions)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🌐</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      App Interface Language
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Language for labels, charts, and navigation
                  </p>
                </div>

                {/* Show only current language initially as a clickable pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInterfaceLangOptions(!showInterfaceLangOptions);
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 10,
                    background: showInterfaceLangOptions ? '#f1f5f9' : '#0f172a',
                    color: showInterfaceLangOptions ? '#334155' : 'white',
                    border: showInterfaceLangOptions ? '1px solid #cbd5e1' : 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: showInterfaceLangOptions ? 'none' : '0 2px 6px rgba(15,23,42,0.15)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  title="Click to change language"
                >
                  <span>
                    {dashLang === 'Telugu'
                      ? 'తెలుగు (Telugu)'
                      : dashLang === 'Hindi'
                      ? 'हिंदी (Hindi)'
                      : 'English'}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>
                    {showInterfaceLangOptions ? '▲' : 'Change ▾'}
                  </span>
                </button>
              </div>

              {/* Show change languages options when clicked */}
              {showInterfaceLangOptions && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                    Select Interface Language:
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { id: 'English', label: 'English' },
                      { id: 'Telugu', label: 'తెలుగు (Telugu)' },
                      { id: 'Hindi', label: 'हिंदी (Hindi)' },
                    ].map((item) => {
                      const isSel = dashLang === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setDashLang(item.id);
                            savePreferences();
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: 8,
                            background: isSel ? '#0f172a' : '#f8fafc',
                            color: isSel ? 'white' : '#475569',
                            fontWeight: 700,
                            fontSize: 11,
                            border: `1.5px solid ${isSel ? '#0f172a' : '#cbd5e1'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item.label} {isSel ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* High Contrast / Senior Mode */}
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>👁️</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    High-Contrast Senior View
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                  Bolder text and deeper contrast for effortless readability
                </p>
              </div>

              <button
                onClick={() => {
                  setHighContrast(!highContrast);
                  savePreferences();
                }}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: highContrast ? '#10b981' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: 'white',
                    top: 2,
                    left: highContrast ? 22 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Emergency SOS & Care Contact */}
        <div
          style={{
            background: emergencyAlertSent ? '#f0fdf4' : '#fef2f2',
            borderRadius: 16,
            padding: 16,
            border: `1.5px solid ${emergencyAlertSent ? '#86efac' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🚨</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: emergencyAlertSent ? '#15803d' : '#b91c1c',
                }}
              >
                {emergencyAlertSent ? 'SOS Dispatched!' : 'Direct Emergency Assist'}
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 11,
                color: emergencyAlertSent ? '#166534' : '#7f1d1d',
              }}
            >
              {emergencyAlertSent
                ? 'Alerts & location transmitted to Dr. Rao & Suresh'
                : '1-tap priority dispatch to all family & clinic responders'}
            </p>
          </div>

          <button
            onClick={handleEmergencyAssist}
            disabled={emergencyAlertSent}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: emergencyAlertSent ? '#16a34a' : '#dc2626',
              color: 'white',
              fontSize: 12,
              fontWeight: 800,
              border: 'none',
              cursor: emergencyAlertSent ? 'default' : 'pointer',
              flexShrink: 0,
              boxShadow: emergencyAlertSent ? 'none' : '0 2px 8px rgba(220,38,38,0.3)',
            }}
          >
            {emergencyAlertSent ? 'Sent ✓' : 'Test SOS'}
          </button>
        </div>

        {/* Section: Account & Log Out */}
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                {user ? (user.displayName || user.email || 'Caregiver Account') : 'Senior Care Session'}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b' }}>
                {user?.email || 'Logged in profile'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              id="btn-settings-logout"
              onClick={handleLogOut}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: '#fef2f2',
                color: '#dc2626',
                border: '1.5px solid #fecaca',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🚪</span>
              <span>Log Out</span>
            </button>
          ) : (
            <button
              id="btn-settings-signin"
              onClick={() => openAuthScreen('signin')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: '#ecfdf5',
                color: '#059669',
                border: '1.5px solid #a7f3d0',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔐</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
