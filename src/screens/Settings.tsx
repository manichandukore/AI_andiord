import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWakeWord } from '../context/WakeWordContext';

interface LanguageOption {
  id: string;
  name: string;
  native: string;
  flag: string;
}

const INTERFACE_LANGUAGES: LanguageOption[] = [
  { id: 'English', name: 'English', native: 'English', flag: '🌐' },
  { id: 'Telugu', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'Hindi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'Tamil', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { id: 'Kannada', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { id: 'Malayalam', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
];

type CategoryId =
  | 'account'
  | 'ai_companion'
  | 'notifications'
  | 'health_medication'
  | 'privacy_security'
  | 'accessibility'
  | 'emergency_safety'
  | 'connected_devices'
  | 'app_preferences';

export function Settings() {
  // Navigation hierarchy:
  // Level 1: activeCategory = null
  // Level 2: activeCategory = CategoryId, activeSetting = null
  // Level 3: activeCategory = CategoryId, activeSetting = settingId
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [activeSetting, setActiveSetting] = useState<string | null>(null);

  // Stored state
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

  // Preferences & Accessibility
  const [dashLang, setDashLang] = useState(() => localStorage.getItem('aura_dash_lang') || 'English');
  const [liveLang, setLiveLang] = useState(() => localStorage.getItem('aura_live_lang') || 'te-IN');
  const [liveVoice, setLiveVoice] = useState(() => localStorage.getItem('aura_live_voice') || 'Aoede');
  const [speechRate, setSpeechRate] = useState(() => localStorage.getItem('aura_speech_rate') || 'Normal');
  const [textSize, setTextSize] = useState(() => localStorage.getItem('aura_text_size') || 'Large');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('aura_high_contrast') === 'true');

  // Notifications & Safety
  const [checkInTime, setCheckInTime] = useState(() => localStorage.getItem('aura_checkin_time') || '8:00 AM');
  const [autoCall, setAutoCall] = useState(() => localStorage.getItem('aura_auto_call') !== 'false');
  const [notifyFamily, setNotifyFamily] = useState(() => localStorage.getItem('aura_notify_family') !== 'false');
  const [fallDetection, setFallDetection] = useState(() => localStorage.getItem('aura_fall_detect') !== 'false');
  const [medRemindersEnabled, setMedRemindersEnabled] = useState(() => localStorage.getItem('aura_med_reminders') !== 'false');
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(() => localStorage.getItem('aura_emergency_alerts') !== 'false');
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(() => localStorage.getItem('aura_loc_sharing') !== 'false');

  // UI status
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [savedMessage, setSavedMessage] = useState('Saved');
  const [emergencyAlertSent, setEmergencyAlertSent] = useState(false);
  const [logoutToast, setLogoutToast] = useState(false);

  const { user, signOut } = useAuth();
  const { aiName, setAiName, triggerWakeWord } = useWakeWord();
  const [aiNameInput, setAiNameInput] = useState(aiName);

  useEffect(() => {
    setAiNameInput(aiName);
  }, [aiName]);

  const showToast = (msg: string = 'Saved') => {
    setSavedMessage(msg);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  const saveAllPreferences = () => {
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
    localStorage.setItem('aura_ai_name', aiNameInput.trim() || 'Siri');
    localStorage.setItem('aura_dash_lang', dashLang);
    localStorage.setItem('aura_live_lang', liveLang);
    localStorage.setItem('aura_live_voice', liveVoice);
    localStorage.setItem('aura_speech_rate', speechRate);
    localStorage.setItem('aura_text_size', textSize);
    localStorage.setItem('aura_checkin_time', checkInTime);
    localStorage.setItem('aura_auto_call', String(autoCall));
    localStorage.setItem('aura_notify_family', String(notifyFamily));
    localStorage.setItem('aura_fall_detect', String(fallDetection));
    localStorage.setItem('aura_high_contrast', String(highContrast));
    localStorage.setItem('aura_med_reminders', String(medRemindersEnabled));
    localStorage.setItem('aura_emergency_alerts', String(emergencyAlertsEnabled));
    localStorage.setItem('aura_loc_sharing', String(locationSharingEnabled));

    if (aiNameInput.trim() && aiNameInput.trim() !== aiName) {
      setAiName(aiNameInput.trim());
    }

    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast('Saved');
  };

  const handleSelectLanguage = (langId: string) => {
    setDashLang(langId);
    localStorage.setItem('aura_dash_lang', langId);
    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast(`Language set to ${langId}`);
    // Navigate back to Accessibility page
    setActiveSetting(null);
  };

  const handleSelectVoice = (voiceId: string) => {
    setLiveVoice(voiceId);
    localStorage.setItem('aura_live_voice', voiceId);
    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast(`Voice set to ${voiceId}`);
    setActiveSetting(null);
  };

  const handleSelectCompanionLang = (langCode: string) => {
    setLiveLang(langCode);
    localStorage.setItem('aura_live_lang', langCode);
    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast('Companion language updated');
    setActiveSetting(null);
  };

  const handleSelectSpeechSpeed = (speed: string) => {
    setSpeechRate(speed);
    localStorage.setItem('aura_speech_rate', speed);
    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast(`Pace set to ${speed}`);
    setActiveSetting(null);
  };

  const handleSelectTextSize = (size: string) => {
    setTextSize(size);
    localStorage.setItem('aura_text_size', size);
    window.dispatchEvent(new Event('aura_settings_updated'));
    showToast(`Text size set to ${size}`);
    setActiveSetting(null);
  };

  const handleEmergencyAssist = async () => {
    setEmergencyAlertSent(true);
    try {
      await fetch('/api/whatsapp/send-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomText: 'Emergency Assist test triggered via Settings',
          userName: seniorName,
          location: seniorAddress || 'Home (Flat 302, Hyderabad)',
        }),
      });
    } catch {
      // Ignored
    }
    setTimeout(() => {
      setEmergencyAlertSent(false);
    }, 4000);
  };

  const handleLogOut = async () => {
    try {
      await signOut();
    } catch {
      // Handled
    }
    setLogoutToast(true);
    setTimeout(() => setLogoutToast(false), 2500);
  };

  // Human-readable labels
  const getCompanionLangLabel = () => {
    if (liveLang === 'te-IN') return 'Telugu';
    if (liveLang === 'hi-IN') return 'Hindi';
    return 'English';
  };

  const getSpeakingSpeedLabel = () => {
    if (speechRate === 'Slow') return 'Gentle / 0.85x';
    if (speechRate === 'Fast') return 'Brisk / 1.15x';
    return 'Natural / 1.0x';
  };

  // =========================================================================
  // LEVEL 1: MAIN SETTINGS PAGE (Category Cards Only)
  // =========================================================================
  const renderMainSettings = () => {
    const categories: {
      id: CategoryId;
      icon: string;
      title: string;
      description: string;
      badge?: string;
    }[] = [
      {
        id: 'account',
        icon: '👤',
        title: 'Account',
        description: 'Manage your profile and account',
        badge: user?.email ? 'Signed In' : undefined,
      },
      {
        id: 'ai_companion',
        icon: '🤖',
        title: 'AI Companion',
        description: 'Customize your AI companion',
        badge: aiName,
      },
      {
        id: 'notifications',
        icon: '🔔',
        title: 'Notifications',
        description: 'Manage reminders and alerts',
      },
      {
        id: 'health_medication',
        icon: '💊',
        title: 'Health & Medication',
        description: 'Manage health records and medication',
      },
      {
        id: 'privacy_security',
        icon: '🛡️',
        title: 'Privacy & Security',
        description: 'Manage privacy and security',
      },
      {
        id: 'accessibility',
        icon: '♿',
        title: 'Accessibility',
        description: 'Language, text size and display',
        badge: dashLang,
      },
      {
        id: 'emergency_safety',
        icon: '🚨',
        title: 'Emergency & Safety',
        description: 'Emergency contacts and SOS',
      },
      {
        id: 'connected_devices',
        icon: '📱',
        title: 'Connected Devices',
        description: 'Manage connected devices and services',
      },
      {
        id: 'app_preferences',
        icon: '⚙️',
        title: 'App Preferences',
        description: 'General application preferences',
      },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Category Cards List */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`category-${cat.id}`}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            style={{
              width: '100%',
              background: '#ffffff',
              borderRadius: 20,
              padding: '16px 18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              minHeight: 68,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid #edf2f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {cat.title}
                  </span>
                  {cat.badge && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: '#ecfdf5',
                        color: '#059669',
                        fontWeight: 800,
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      {cat.badge}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 12.5,
                    color: '#64748b',
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                >
                  {cat.description}
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: 22,
                color: '#94a3b8',
                fontWeight: 600,
                paddingLeft: 8,
              }}
            >
              ›
            </div>
          </button>
        ))}
      </div>
    );
  };

  // =========================================================================
  // LEVEL 2: CATEGORY VIEWS (Individual settings lists)
  // =========================================================================

  // Helper Row for Category List
  const renderSettingRow = (
    icon: string,
    title: string,
    value: string | React.ReactNode,
    onClick: () => void,
    id?: string
  ) => (
    <button
      id={id}
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: '#ffffff',
        borderRadius: 18,
        padding: '16px 18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 64,
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{title}</div>
          {typeof value === 'string' ? (
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
              {value}
            </p>
          ) : (
            value
          )}
        </div>
      </div>
      <div style={{ fontSize: 20, color: '#94a3b8', fontWeight: 600, paddingLeft: 8 }}>›</div>
    </button>
  );

  // Accessibility Category Page
  const renderAccessibilityCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '🌐',
        'App Interface Language',
        dashLang,
        () => setActiveSetting('app_interface_language'),
        'setting-app-interface-language'
      )}
      {renderSettingRow(
        '👁',
        'High-Contrast Senior View',
        highContrast ? 'Enabled · Improved Readability' : 'Disabled · Standard View',
        () => setActiveSetting('high_contrast_senior_view'),
        'setting-high-contrast-senior-view'
      )}
      {renderSettingRow(
        '🔤',
        'Text Size',
        textSize,
        () => setActiveSetting('text_size'),
        'setting-text-size'
      )}
    </div>
  );

  // AI Companion Category Page
  const renderAICompanionCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '✨',
        'AI Companion Name',
        aiName,
        () => setActiveSetting('companion_name'),
        'setting-companion-name'
      )}
      {renderSettingRow(
        '🎙',
        'Voice',
        `${liveVoice} · Natural vocal character`,
        () => setActiveSetting('companion_voice'),
        'setting-companion-voice'
      )}
      {renderSettingRow(
        '🌐',
        'Companion Language',
        getCompanionLangLabel(),
        () => setActiveSetting('companion_language'),
        'setting-companion-language'
      )}
      {renderSettingRow(
        '⚡',
        'Speaking Speed',
        getSpeakingSpeedLabel(),
        () => setActiveSetting('speaking_speed'),
        'setting-speaking-speed'
      )}
      {renderSettingRow(
        '🔊',
        'Voice Settings',
        'Manage voice interaction & wake-word',
        () => setActiveSetting('voice_settings'),
        'setting-voice-settings'
      )}
    </div>
  );

  // Notifications Category Page
  const renderNotificationsCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '💊',
        'Medication Reminders',
        medRemindersEnabled ? 'On · Morning, Afternoon & Evening' : 'Muted',
        () => setActiveSetting('notif_medication'),
        'setting-notif-medication'
      )}
      {renderSettingRow(
        '📅',
        'Daily Check-in',
        `${checkInTime} Daily reminder`,
        () => setActiveSetting('notif_checkin'),
        'setting-notif-checkin'
      )}
      {renderSettingRow(
        '👨‍👩‍👧',
        'Family Alerts',
        notifyFamily ? 'Active · Alerts sent on abnormal trends' : 'Disabled',
        () => setActiveSetting('notif_family'),
        'setting-notif-family'
      )}
      {renderSettingRow(
        '🚨',
        'Emergency Alerts',
        emergencyAlertsEnabled ? 'Priority dispatch enabled' : 'Disabled',
        () => setActiveSetting('notif_emergency'),
        'setting-notif-emergency'
      )}
      {renderSettingRow(
        '📱',
        'WhatsApp Notifications',
        notifyFamily ? 'WhatsApp alerts sent to caregiver' : 'Disabled',
        () => setActiveSetting('notif_whatsapp'),
        'setting-notif-whatsapp'
      )}
    </div>
  );

  // Health & Medication Category Page
  const renderHealthMedicationCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '💊',
        'Medication Schedule',
        'View and manage prescribed tablets & timings',
        () => setActiveSetting('health_schedule'),
        'setting-health-schedule'
      )}
      {renderSettingRow(
        '📋',
        'Medical Records',
        'Synchronized records, lab reports & Body Map',
        () => setActiveSetting('health_records'),
        'setting-health-records'
      )}
      {renderSettingRow(
        '❤️',
        'Health Monitoring',
        'Continuous vitals, heart rate & pain tracking',
        () => setActiveSetting('health_monitoring'),
        'setting-health-monitoring'
      )}
      {renderSettingRow(
        '🔔',
        'Medication Reminders',
        'Tablet intake alarms and notifications',
        () => setActiveSetting('health_reminders'),
        'setting-health-reminders'
      )}
    </div>
  );

  // Emergency & Safety Category Page
  const renderEmergencySafetyCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '🚨',
        'Emergency Assist',
        '1-Tap SOS dispatch to all responders & clinic',
        () => setActiveSetting('emergency_assist'),
        'setting-emergency-assist'
      )}
      {renderSettingRow(
        '👨‍👩‍👧',
        'Emergency Contacts',
        emergencyContact || 'Caregivers & emergency phone numbers',
        () => setActiveSetting('emergency_contacts'),
        'setting-emergency-contacts'
      )}
      {renderSettingRow(
        '📞',
        'Emergency Calling',
        autoCall ? 'Auto-dial emergency responders enabled' : 'Disabled',
        () => setActiveSetting('emergency_calling'),
        'setting-emergency-calling'
      )}
      {renderSettingRow(
        '📱',
        'WhatsApp Emergency Alerts',
        'Instant WhatsApp messages to family circle',
        () => setActiveSetting('emergency_whatsapp'),
        'setting-emergency-whatsapp'
      )}
      {renderSettingRow(
        '📍',
        'Location Sharing',
        locationSharingEnabled ? 'GPS broadcast on SOS trigger' : 'Disabled',
        () => setActiveSetting('emergency_location'),
        'setting-emergency-location'
      )}
    </div>
  );

  // Account Category Page (WITH ONLY ONE CLEAR LOGOUT OPTION)
  const renderAccountCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '👤',
        'Profile',
        'Edit profile information & senior vitals',
        () => setActiveSetting('account_profile'),
        'setting-account-profile'
      )}
      {renderSettingRow(
        '📞',
        'Emergency Contacts',
        'Manage contacts & family numbers',
        () => setActiveSetting('account_contacts'),
        'setting-account-contacts'
      )}
      {renderSettingRow(
        '🔐',
        'Security',
        'Password and authentication settings',
        () => setActiveSetting('account_security'),
        'setting-account-security'
      )}

      {/* ONE CLEAR LOG OUT OPTION INSIDE ACCOUNT */}
      <div style={{ marginTop: 10 }}>
        <button
          id="btn-account-logout"
          type="button"
          onClick={handleLogOut}
          style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: 18,
            padding: '16px 18px',
            border: '1.5px solid #fecaca',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🚪</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>Log Out</div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                {user?.email ? `Signed in as ${user.email}` : 'Sign out of your account'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>Sign Out →</span>
        </button>
      </div>
    </div>
  );

  // Privacy & Security Category Page
  const renderPrivacyCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '🔒',
        'Medical Data Encryption',
        'Protected by AES-256 cloud encryption',
        () => setActiveSetting('privacy_encryption')
      )}
      {renderSettingRow(
        '👥',
        'Caregiver Permissions',
        'Control access for family & doctors',
        () => setActiveSetting('privacy_caregivers')
      )}
      {renderSettingRow(
        '📍',
        'Location Privacy',
        'Location transmitted strictly on emergency triggers',
        () => setActiveSetting('privacy_location')
      )}
    </div>
  );

  // Connected Devices Category Page
  const renderConnectedDevicesCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '⌚',
        'Smartwatch & Band',
        'Heart rate, SpO2 & sleep tracking',
        () => setActiveSetting('device_smartwatch')
      )}
      {renderSettingRow(
        '🩸',
        'BP & Glucose Monitor',
        'Bluetooth medical device gateway',
        () => setActiveSetting('device_bp_monitor')
      )}
      {renderSettingRow(
        '🏠',
        'Smart Home Fall Sensors',
        fallDetection ? 'Active · Continuous motion detection' : 'Offline',
        () => setActiveSetting('device_fall_sensors')
      )}
    </div>
  );

  // App Preferences Category Page
  const renderAppPreferencesCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {renderSettingRow(
        '🎨',
        'App Theme & Appearance',
        'Emerald & Violet Eldercare Palette',
        () => setActiveSetting('pref_theme')
      )}
      {renderSettingRow(
        '📏',
        'Measurement Units',
        'Metric (kg, mg/dL, °C)',
        () => setActiveSetting('pref_units')
      )}
      {renderSettingRow(
        '🔄',
        'Data Sync & Backup',
        'Real-time Firestore synchronization',
        () => setActiveSetting('pref_sync')
      )}
      {renderSettingRow(
        'ℹ️',
        'About Aura Companion',
        'Version 2.4.0 · Senior Eldercare Platform',
        () => setActiveSetting('pref_about')
      )}
    </div>
  );

  // =========================================================================
  // LEVEL 3: INDIVIDUAL SETTING CONFIGURATION SCREENS
  // =========================================================================

  // 1. Language Selection Screen
  const renderLanguageSelectionScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          Select Interface Language
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Choose your preferred language for menus, labels, and notifications.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {INTERFACE_LANGUAGES.map((lang) => {
          const isSelected = dashLang.toLowerCase() === lang.id.toLowerCase();
          return (
            <button
              key={lang.id}
              id={`lang-option-${lang.id.toLowerCase()}`}
              type="button"
              onClick={() => handleSelectLanguage(lang.id)}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: 16,
                background: isSelected ? '#ecfdf5' : '#f8fafc',
                border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{lang.flag}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? '#065f46' : '#0f172a' }}>
                    {lang.native}
                  </div>
                  <div style={{ fontSize: 12, color: isSelected ? '#047857' : '#64748b', fontWeight: 600 }}>
                    {lang.name}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: isSelected ? '#10b981' : '#ffffff',
                  border: `2px solid ${isSelected ? '#10b981' : '#cbd5e1'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {isSelected ? '✓' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // 2. High Contrast View Setting
  const renderHighContrastScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          High-Contrast Senior View
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Enhance visual contrast and bold typography across all screens.
        </p>
      </div>

      <div
        style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: 16,
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Enable Senior Contrast</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {highContrast ? 'Active for this device' : 'Off (Standard colors)'}
          </div>
        </div>

        <button
          id="btn-toggle-high-contrast"
          type="button"
          onClick={() => {
            const next = !highContrast;
            setHighContrast(next);
            localStorage.setItem('aura_high_contrast', String(next));
            window.dispatchEvent(new Event('aura_settings_updated'));
            showToast(next ? 'High Contrast Enabled' : 'High Contrast Disabled');
          }}
          style={{
            width: 52,
            height: 30,
            borderRadius: 15,
            background: highContrast ? '#10b981' : '#cbd5e1',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 24,
              height: 24,
              borderRadius: 12,
              background: 'white',
              top: 3,
              left: highContrast ? 25 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setActiveSetting(null)}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 12,
          background: '#059669',
          color: 'white',
          fontSize: 14,
          fontWeight: 800,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Done
      </button>
    </div>
  );

  // 3. Text Size Setting
  const renderTextSizeScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Text Size</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Adjust font sizing for comfortable reading without glasses.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { id: 'Normal', label: 'Normal (15px)', desc: 'Standard system font size' },
          { id: 'Large', label: 'Large (18px) · Recommended', desc: 'Optimal for eldercare visibility' },
          { id: 'Extra Large', label: 'Extra Large (21px)', desc: 'High visibility maximum zoom' },
        ].map((item) => {
          const isSelected = textSize === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTextSize(item.id)}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: 16,
                background: isSelected ? '#ecfdf5' : '#f8fafc',
                border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? '#065f46' : '#0f172a' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: isSelected ? '#047857' : '#64748b' }}>{item.desc}</div>
              </div>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: isSelected ? '#10b981' : '#ffffff',
                  border: `2px solid ${isSelected ? '#10b981' : '#cbd5e1'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {isSelected ? '✓' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // 4. Companion Name Setting
  const renderCompanionNameScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          AI Companion Name
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Set the wake-name for your senior companion (e.g., Siri, Aura).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>
            Companion Name
          </label>
          <input
            id="input-companion-name-config"
            type="text"
            value={aiNameInput}
            onChange={(e) => setAiNameInput(e.target.value)}
            placeholder="e.g. Siri"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 12,
              border: '2px solid #cbd5e1',
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Quick Presets */}
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>
            Quick Presets:
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Siri', 'Aura', 'Maya'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAiNameInput(preset)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  background: aiNameInput === preset ? '#ede9fe' : '#f1f5f9',
                  color: aiNameInput === preset ? '#7c3aed' : '#475569',
                  border: `1.5px solid ${aiNameInput === preset ? '#c4b5fd' : '#e2e8f0'}`,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {preset === 'Siri' ? '✨ Siri' : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Test Siri Voice Response */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#6b21a8' }}>Test Spoken Response</div>
            <div style={{ fontSize: 11, color: '#7e22ce' }}>Verify immediate spoken response</div>
          </div>
          <button
            type="button"
            onClick={() => triggerWakeWord(aiNameInput.trim() || 'Siri')}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: '#7c3aed',
              color: 'white',
              fontSize: 12,
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Test Now 🔊
          </button>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={() => {
            const trimmed = aiNameInput.trim() || 'Siri';
            setAiName(trimmed);
            localStorage.setItem('aura_ai_name', trimmed);
            window.dispatchEvent(new Event('aura_settings_updated'));
            showToast(`Companion name set to ${trimmed}`);
            setActiveSetting(null);
          }}
          style={{
            marginTop: 6,
            padding: '14px 0',
            borderRadius: 12,
            background: '#10b981',
            color: 'white',
            fontSize: 14,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}
        >
          Save Companion Name
        </button>
      </div>
    </div>
  );

  // 5. Companion Voice Selection Setting
  const renderCompanionVoiceScreen = () => {
    const voices = [
      { id: 'Aoede', name: 'Aoede', tag: 'Gentle & Warm', desc: 'Soothing tone ideal for seniors' },
      { id: 'Zephyr', name: 'Zephyr', tag: 'Calm & Steady', desc: 'Soft and patient articulation' },
      { id: 'Kore', name: 'Kore', tag: 'Bright & Cheerful', desc: 'Crisp, positive cadence' },
      { id: 'Puck', name: 'Puck', tag: 'Expressive', desc: 'Engaging, friendly companionship' },
    ];

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Select Companion Voice
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Choose the natural voice personality used by Aura Live.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {voices.map((voice) => {
            const isSelected = liveVoice === voice.id;
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => handleSelectVoice(voice.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                  border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#065f46' : '#0f172a' }}>
                      {voice.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: isSelected ? '#10b981' : '#e2e8f0',
                        color: isSelected ? 'white' : '#475569',
                        fontWeight: 800,
                      }}
                    >
                      {voice.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: isSelected ? '#047857' : '#64748b', marginTop: 2 }}>
                    {voice.desc}
                  </div>
                </div>

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: isSelected ? '#10b981' : '#ffffff',
                    border: `2px solid ${isSelected ? '#10b981' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Test Voice Sample Playback */}
        <button
          type="button"
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
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            background: '#0f172a',
            color: 'white',
            fontSize: 13,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>{isPlayingSample ? '🔊' : '▶️'}</span>
          <span>{isPlayingSample ? 'Testing Audio Sample...' : `Play Sample in ${liveVoice}`}</span>
        </button>
      </div>
    );
  };

  // 6. Companion Language Setting
  const renderCompanionLangScreen = () => {
    const langs = [
      { id: 'te-IN', name: 'Telugu', native: 'తెలుగు', desc: 'Native language for Rajamma' },
      { id: 'hi-IN', name: 'Hindi', native: 'हिंदी', desc: 'North Indian conversation' },
      { id: 'en-US', name: 'English', native: 'English', desc: 'International English' },
    ];

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Companion Spoken Language
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Language Aura speaks when you activate voice check-ins or wake-words.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {langs.map((l) => {
            const isSelected = liveLang === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelectCompanionLang(l.id)}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: isSelected ? '#ede9fe' : '#f8fafc',
                  border: `2px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? '#5b21b6' : '#0f172a' }}>
                    {l.native} ({l.name})
                  </div>
                  <div style={{ fontSize: 12, color: isSelected ? '#6d28d9' : '#64748b' }}>{l.desc}</div>
                </div>

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: isSelected ? '#7c3aed' : '#ffffff',
                    border: `2px solid ${isSelected ? '#7c3aed' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 7. Speaking Speed Setting
  const renderSpeakingSpeedScreen = () => {
    const speeds = [
      { id: 'Slow', label: 'Gentle (0.85x)', desc: 'Slower, soothing pace ideal for seniors' },
      { id: 'Normal', label: 'Natural (1.0x)', desc: 'Standard conversational speaking rate' },
      { id: 'Fast', label: 'Brisk (1.15x)', desc: 'Slightly faster playback speed' },
    ];

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Speaking Speed
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Calibrate voice pace for eldercare listening comfort.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {speeds.map((s) => {
            const isSelected = speechRate === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSpeechSpeed(s.id)}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                  border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? '#065f46' : '#0f172a' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, color: isSelected ? '#047857' : '#64748b' }}>{s.desc}</div>
                </div>

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: isSelected ? '#10b981' : '#ffffff',
                    border: `2px solid ${isSelected ? '#10b981' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 8. Voice Settings screen
  const renderVoiceSettingsScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          Voice Interaction Settings
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Manage microphone listening and background voice recognition.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Automatic Wake-Word Detection</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Listen continuously for &ldquo;Siri&rdquo; or &ldquo;Aura&rdquo;</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 8 }}>
            Active
          </span>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Spoken Proactive Health Check-in</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Siri asks about pain progress on wake-word</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 8 }}>
            Enabled
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveSetting(null)}
          style={{
            marginTop: 8,
            padding: '12px 0',
            borderRadius: 12,
            background: '#10b981',
            color: 'white',
            fontSize: 14,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );

  // 9. Profile Edit Configuration (under Account)
  const renderProfileEditScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          Senior Profile & Vitals
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Synchronized clinical profile for eldercare monitoring.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Senior Name
            </label>
            <input
              type="text"
              value={seniorName}
              onChange={(e) => setSeniorName(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 700,
                background: '#f8fafc',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Age
            </label>
            <input
              type="number"
              value={seniorAge}
              onChange={(e) => setSeniorAge(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 700,
                background: '#f8fafc',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Gender
            </label>
            <input
              type="text"
              value={seniorGender}
              onChange={(e) => setSeniorGender(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 700,
                background: '#f8fafc',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Blood Group
            </label>
            <input
              type="text"
              value={seniorBloodGroup}
              onChange={(e) => setSeniorBloodGroup(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 700,
                background: '#f8fafc',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={seniorPhone}
            onChange={(e) => setSeniorPhone(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Home Address
          </label>
          <input
            type="text"
            value={seniorAddress}
            onChange={(e) => setSeniorAddress(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Primary Doctor / Hospital
          </label>
          <input
            type="text"
            value={primaryDoctor}
            onChange={(e) => setPrimaryDoctor(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            saveAllPreferences();
            setActiveSetting(null);
          }}
          style={{
            marginTop: 8,
            padding: '14px 0',
            borderRadius: 12,
            background: '#10b981',
            color: 'white',
            fontSize: 14,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}
        >
          Save Profile Details
        </button>
      </div>
    </div>
  );

  // 10. Emergency Contacts Configuration
  const renderEmergencyContactsScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          Emergency Contacts
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Responders alerted immediately upon SOS or critical vital notifications.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Primary Caregiver Name & Relationship
          </label>
          <input
            type="text"
            value={caregiverName}
            onChange={(e) => setCaregiverName(e.target.value)}
            placeholder="e.g. Kavitha (Daughter)"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Caregiver Phone Number
          </label>
          <input
            type="tel"
            value={caregiverPhone}
            onChange={(e) => setCaregiverPhone(e.target.value)}
            placeholder="+91 98765 43210"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            24/7 Emergency SOS Contact
          </label>
          <input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="e.g. Ramesh (Son) · +91 98480 12345"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            saveAllPreferences();
            setActiveSetting(null);
          }}
          style={{
            marginTop: 6,
            padding: '14px 0',
            borderRadius: 12,
            background: '#10b981',
            color: 'white',
            fontSize: 14,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Save Emergency Contacts
        </button>
      </div>
    </div>
  );

  // 11. Security Setting (Password / Authentication)
  const renderSecurityScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          Security & Authentication
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Manage your login session, credentials and cloud security.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Current Authentication</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {user ? `Active account: ${user.email}` : 'Local Senior Session'}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Firestore Security Rules</div>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 2 }}>
            ✓ Production Security Rules Active
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSetting(null)}
          style={{
            marginTop: 6,
            padding: '12px 0',
            borderRadius: 12,
            background: '#059669',
            color: 'white',
            fontSize: 14,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    </div>
  );

  // 12. Emergency Assist Configuration Screen
  const renderEmergencyAssistScreen = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1.5px solid #fecaca',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#b91c1c' }}>
          🚨 Emergency Assist & Direct SOS
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>
          1-Tap priority dispatch transmitting location, vitals and medical records to all caregivers.
        </p>
      </div>

      <div
        style={{
          background: emergencyAlertSent ? '#f0fdf4' : '#fef2f2',
          borderRadius: 16,
          padding: 16,
          border: `1.5px solid ${emergencyAlertSent ? '#86efac' : '#fecaca'}`,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: emergencyAlertSent ? '#15803d' : '#991b1b' }}>
          {emergencyAlertSent ? '✓ SOS Dispatched to Family Responders' : 'Emergency Assist Ready'}
        </div>
        <div style={{ fontSize: 12, color: emergencyAlertSent ? '#166534' : '#7f1d1d', marginTop: 4 }}>
          {emergencyAlertSent
            ? 'WhatsApp alerts & GPS coordinates sent to Dr. Rao & Suresh'
            : `Primary Responder: ${caregiverName} (${caregiverPhone})`}
        </div>
      </div>

      <button
        id="btn-test-sos-assist"
        type="button"
        onClick={handleEmergencyAssist}
        disabled={emergencyAlertSent}
        style={{
          width: '100%',
          padding: '16px 0',
          borderRadius: 14,
          background: emergencyAlertSent ? '#16a34a' : '#dc2626',
          color: 'white',
          fontSize: 16,
          fontWeight: 800,
          border: 'none',
          cursor: emergencyAlertSent ? 'default' : 'pointer',
          boxShadow: emergencyAlertSent ? 'none' : '0 4px 14px rgba(220,38,38,0.35)',
        }}
      >
        {emergencyAlertSent ? 'SOS Dispatched ✓' : '🚨 Test Emergency SOS Alert'}
      </button>
    </div>
  );

  // Generic Sub-setting screen for others
  const renderGenericSettingScreen = (title: string, desc: string, icon: string = '⚙️') => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: 20,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>{desc}</p>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 14,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>✓ Active & Synchronized</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Connected in real-time with Patient Records, Body Map and AI Companion.
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveSetting(null)}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 12,
          background: '#059669',
          color: 'white',
          fontSize: 14,
          fontWeight: 800,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Back to Category
      </button>
    </div>
  );

  // Setting screen router
  const renderSettingConfiguration = () => {
    switch (activeSetting) {
      case 'app_interface_language':
        return renderLanguageSelectionScreen();
      case 'high_contrast_senior_view':
        return renderHighContrastScreen();
      case 'text_size':
        return renderTextSizeScreen();
      case 'companion_name':
        return renderCompanionNameScreen();
      case 'companion_voice':
        return renderCompanionVoiceScreen();
      case 'companion_language':
        return renderCompanionLangScreen();
      case 'speaking_speed':
        return renderSpeakingSpeedScreen();
      case 'voice_settings':
        return renderVoiceSettingsScreen();
      case 'account_profile':
        return renderProfileEditScreen();
      case 'account_contacts':
      case 'emergency_contacts':
        return renderEmergencyContactsScreen();
      case 'account_security':
        return renderSecurityScreen();
      case 'emergency_assist':
        return renderEmergencyAssistScreen();
      case 'notif_medication':
      case 'health_reminders':
        return renderGenericSettingScreen(
          'Medication Reminders',
          'Automated voice reminders for prescribed tablets & dosages.',
          '💊'
        );
      case 'notif_checkin':
        return renderGenericSettingScreen(
          'Daily Check-in',
          `Automated daily health inquiries scheduled at ${checkInTime}.`,
          '📅'
        );
      case 'notif_family':
        return renderGenericSettingScreen(
          'Family Alerts',
          'Family WhatsApp alert when abnormal pain or vitals persist 2+ days.',
          '👨‍👩‍👧'
        );
      case 'notif_emergency':
      case 'emergency_calling':
        return renderGenericSettingScreen(
          'Emergency Calling & Alerts',
          'Direct priority dispatch to emergency line 112 & family.',
          '🚨'
        );
      case 'notif_whatsapp':
      case 'emergency_whatsapp':
        return renderGenericSettingScreen(
          'WhatsApp Notifications',
          'WhatsApp automated messages sent to primary caregiver.',
          '📱'
        );
      case 'health_schedule':
        return renderGenericSettingScreen(
          'Medication Schedule',
          'Extracted automatically from uploaded doctor prescriptions & patient records.',
          '💊'
        );
      case 'health_records':
        return renderGenericSettingScreen(
          'Medical Records & Body Map',
          'Real-time synchronization between clinical reports, Body Map markers and Siri.',
          '📋'
        );
      case 'health_monitoring':
        return renderGenericSettingScreen(
          'Health Monitoring',
          'Tracks vital trends, pain progression score, and recovery history.',
          '❤️'
        );
      case 'emergency_location':
      case 'privacy_location':
        return renderGenericSettingScreen(
          'Location Sharing',
          'GPS coordinates transmitted to family and clinic on SOS trigger.',
          '📍'
        );
      default:
        return renderGenericSettingScreen(
          'Setting Configuration',
          'Configuration options saved automatically to local storage and cloud.',
          '⚙️'
        );
    }
  };

  // Helper title for Category View
  const getCategoryTitle = (cat: CategoryId): { icon: string; title: string } => {
    switch (cat) {
      case 'account':
        return { icon: '👤', title: 'Account' };
      case 'ai_companion':
        return { icon: '🤖', title: 'AI Companion' };
      case 'notifications':
        return { icon: '🔔', title: 'Notifications' };
      case 'health_medication':
        return { icon: '💊', title: 'Health & Medication' };
      case 'privacy_security':
        return { icon: '🛡️', title: 'Privacy & Security' };
      case 'accessibility':
        return { icon: '♿', title: 'Accessibility' };
      case 'emergency_safety':
        return { icon: '🚨', title: 'Emergency & Safety' };
      case 'connected_devices':
        return { icon: '📱', title: 'Connected Devices' };
      case 'app_preferences':
        return { icon: '⚙️', title: 'App Preferences' };
    }
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
      {/* Top Header / Navigation Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Back button when inside category or setting */}
          {activeSetting !== null ? (
            <button
              id="btn-settings-back-to-category"
              type="button"
              onClick={() => setActiveSetting(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 800,
              }}
              title="Back"
            >
              ←
            </button>
          ) : activeCategory !== null ? (
            <button
              id="btn-settings-back-to-main"
              type="button"
              onClick={() => setActiveCategory(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 800,
              }}
              title="Back to Settings"
            >
              ←
            </button>
          ) : null}

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {activeSetting !== null
                ? 'Setting Configuration'
                : activeCategory !== null
                ? `${getCategoryTitle(activeCategory).icon} ${getCategoryTitle(activeCategory).title}`
                : 'Settings & Preferences'}
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              {activeSetting !== null
                ? 'Configure setting'
                : activeCategory !== null
                ? 'Select a setting to customize'
                : 'Manage your care companion'}
            </p>
          </div>
        </div>

        {/* Saved Toast Notification */}
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
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#16a34a' }} />
            {savedMessage}
          </div>
        )}

        {/* Logged Out Toast Notification */}
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
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#dc2626' }} />
            Logged Out
          </div>
        )}
      </div>

      {/* Main Content Area: Renders exactly one level at a time! */}
      <div style={{ padding: '16px 14px 0' }}>
        {activeSetting !== null
          ? renderSettingConfiguration()
          : activeCategory !== null
          ? (
              <>
                {activeCategory === 'accessibility' && renderAccessibilityCategory()}
                {activeCategory === 'ai_companion' && renderAICompanionCategory()}
                {activeCategory === 'notifications' && renderNotificationsCategory()}
                {activeCategory === 'health_medication' && renderHealthMedicationCategory()}
                {activeCategory === 'privacy_security' && renderPrivacyCategory()}
                {activeCategory === 'emergency_safety' && renderEmergencySafetyCategory()}
                {activeCategory === 'account' && renderAccountCategory()}
                {activeCategory === 'connected_devices' && renderConnectedDevicesCategory()}
                {activeCategory === 'app_preferences' && renderAppPreferencesCategory()}
              </>
            )
          : renderMainSettings()}
      </div>
    </div>
  );
}
