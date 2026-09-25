import React, { useState, useEffect } from 'react';
import { CareMember, EmergencyEvent } from '../utils/careCircleStorage';
import { SymptomAnalysisResult } from '../utils/emergencyDetection';

export function EmergencyActionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<SymptomAnalysisResult | null>(null);
  const [contact, setContact] = useState<CareMember | null>(null);
  const [callUrl, setCallUrl] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [smsUrl, setSmsUrl] = useState<string>('');
  const [partsUpdated, setPartsUpdated] = useState<string[]>([]);
  const [actionReport, setActionReport] = useState<string>('');
  const [isDialing, setIsDialing] = useState(false);

  useEffect(() => {
    const handleEmergencyAlert = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      setAnalysis(detail.symptomAnalysis || null);
      setContact(detail.contact || null);
      setCallUrl(detail.callUrl || '');
      setWhatsappUrl(detail.whatsappUrl || '');
      setSmsUrl(detail.smsUrl || '');
      setPartsUpdated(detail.partsUpdated || []);
      setActionReport(detail.actionReport || '');
      setIsOpen(true);
      setIsDialing(true);

      // Play soft alert chime if available
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {}
    };

    window.addEventListener('aura_emergency_alert_triggered', handleEmergencyAlert);
    return () => {
      window.removeEventListener('aura_emergency_alert_triggered', handleEmergencyAlert);
    };
  }, []);

  if (!isOpen) return null;

  const patient = analysis?.patientName || 'Rajamma';
  const contactName = contact?.name || 'Suresh Dev';
  const contactRole = contact?.role || 'Primary Caregiver (Son)';
  const contactPhone = contact?.phone || '+91 98765 43210';
  const cleanPhone = contactPhone.replace(/[^0-9+]/g, '');

  const handleDirectCall = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleDirectWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    } else {
      window.open(`https://wa.me/${cleanPhone.replace(/^\+/, '')}`, '_blank');
    }
  };

  const handleDirectSms = () => {
    if (smsUrl) {
      window.location.href = smsUrl;
    } else {
      window.location.href = `sms:${cleanPhone}`;
    }
  };

  const handleCall112 = () => {
    window.location.href = 'tel:112';
  };

  return (
    <div
      id="emergency-action-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'white',
          borderRadius: 24,
          padding: '20px 18px',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.45)',
          border: '2px solid #ef4444',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          animation: 'emergencyScaleUp 0.25s ease-out',
        }}
      >
        <style>{`
          @keyframes emergencyScaleUp {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes emergencyBeacon {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
            50% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
          }
        `}</style>

        {/* Pulsing Alarm Beacon Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              color: 'white',
              animation: 'emergencyBeacon 1.8s infinite',
              flexShrink: 0,
            }}
          >
            🚨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: 10.5,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                }}
              >
                {analysis?.severity || 'EMERGENCY / SERIOUS'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                Care Circle Alert
              </span>
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#111827',
                margin: '3px 0 0',
                lineHeight: 1.2,
              }}
            >
              Emergency Warning
            </h2>
          </div>
        </div>

        {/* Symptoms & Body Map Status Box */}
        <div
          style={{
            background: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderRadius: 14,
            padding: '12px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', margin: 0 }}>
                {patient} Reported Symptoms:
              </p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', margin: '3px 0 0' }}>
                {analysis?.symptomsDetected.join(' + ') || 'Acute health condition'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 4.5,
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                }}
              />
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#dc2626' }}>
                RED DOT ON MAP
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px dashed #fecdd3',
              fontSize: 11,
              color: '#475569',
              lineHeight: 1.35,
            }}
          >
            <strong>Body Map Updated:</strong> Red alert dots placed on{' '}
            <span style={{ fontWeight: 800, color: '#b91c1c' }}>
              {(partsUpdated.length > 0 ? partsUpdated : [analysis?.primaryBodyPart || 'heart'])
                .join(', ')
                .toUpperCase()}
            </span>
            .
          </div>
        </div>

        {/* Care Circle Responder Identified */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: 14,
            padding: '12px',
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: 0 }}>
            Configured Emergency Responder:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {contactName}
              </p>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', margin: '2px 0 0' }}>
                {contactRole} · {contactPhone}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: '#dcfce7',
                color: '#15803d',
                padding: '3px 8px',
                borderRadius: 8,
              }}
            >
              ✓ ALERTED
            </span>
          </div>
        </div>

        {/* Real Communication Action Status */}
        <div
          style={{
            fontSize: 11,
            color: '#334155',
            background: '#f1f5f9',
            borderRadius: 10,
            padding: '8px 10px',
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 800 }}>
            <span>✓</span>
            <span>Emergency dialer & WhatsApp alert dispatched automatically.</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            Tap below to redial or open WhatsApp directly if dialer did not open automatically.
          </span>
        </div>

        {/* Direct Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Direct Phone Call Button */}
          <button
            type="button"
            onClick={handleDirectCall}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white',
              fontSize: 14.5,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <span style={{ fontSize: 18 }}>📞</span>
            <span>CALL {contactName.toUpperCase()} NOW</span>
          </button>

          {/* Direct WhatsApp Button */}
          <button
            type="button"
            onClick={handleDirectWhatsApp}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 14,
              border: '1.5px solid #25d366',
              background: '#f0fdf4',
              color: '#166534',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            <span>Send WhatsApp Emergency Alert</span>
          </button>

          {/* Direct SMS and 112 backup in row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleDirectSms}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#334155',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <span>📱</span>
              <span>Send SMS</span>
            </button>

            <button
              type="button"
              onClick={handleCall112}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 12,
                border: '1.5px solid #ef4444',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <span>🚑</span>
              <span>Call 112 SOS</span>
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            marginTop: 14,
            padding: '9px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'underline',
          }}
        >
          Dismiss Alert (I am safe now / Help has arrived)
        </button>
      </div>
    </div>
  );
}
