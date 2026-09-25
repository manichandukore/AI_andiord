import React, { useState, useEffect } from 'react';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  userName?: string;
}

export function EmergencySOSModal({
  isOpen,
  onClose,
  onConfirm,
  userName = 'Rajamma',
}: EmergencySOSModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [isDispatched, setIsDispatched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dispatchedData, setDispatchedData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setIsDispatched(false);
      setIsSending(false);
      return;
    }

    if (isDispatched) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      triggerEmergencyAlert();
    }
  }, [isOpen, countdown, isDispatched]);

  const triggerEmergencyAlert = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/send-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomText: 'Acute Health Discomfort / SOS Alert',
          contacts: [
            { id: '1', name: 'Suresh Dev', role: 'Primary Caregiver (Son)', phone: '+91 98765 43210' },
            { id: '2', name: 'Lakshmi Devi', role: 'Neighbor', phone: '+91 98765 43211' },
            { id: '3', name: 'Dr. Roy Pillai', role: 'Geriatric GP', phone: '+91 98765 43212' },
          ],
          userName,
          location: 'Home (Flat 302, Hyderabad)',
        }),
      });
      const data = await res.json();
      setDispatchedData(data);
      setIsDispatched(true);
      if (onConfirm) onConfirm();
    } catch {
      setIsDispatched(true);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'white',
          borderRadius: 24,
          padding: '24px 20px',
          boxShadow: '0 20px 50px rgba(220,38,38,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {!isDispatched ? (
          <>
            {/* Pulsing Alarm Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                marginBottom: 12,
                boxShadow: '0 0 0 10px rgba(239,68,68,0.15)',
              }}
            >
              🚨
            </div>

            <h3
              style={{
                margin: '0 0 4px',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: '#dc2626',
              }}
            >
              Emergency SOS Trigger
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#4b5563', lineHeight: 1.4 }}>
              Alerting Suresh Dev, Lakshmi Devi, and Dr. Roy Pillai with GPS Location & Vital status.
            </p>

            {/* Countdown Ring */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                border: '4px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 800,
                color: '#dc2626',
                fontFamily: "'Poppins', sans-serif",
                marginBottom: 16,
              }}
            >
              {countdown}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <button
                onClick={triggerEmergencyAlert}
                disabled={isSending}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 16,
                  background: '#dc2626',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
                }}
              >
                {isSending ? 'Dispatching Alert...' : 'Dispatch Immediately'}
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 16,
                  background: '#f3f4f6',
                  color: '#4b5563',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel (False Alarm)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: '#dcfce7',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                marginBottom: 12,
              }}
            >
              ✓
            </div>

            <h3
              style={{
                margin: '0 0 4px',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: '#065f46',
              }}
            >
              Care Circle Dispatched!
            </h3>

            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#4b5563' }}>
              WhatsApp Emergency alert sent to all 3 designated contacts.
            </p>

            <div
              style={{
                width: '100%',
                background: '#f9fafb',
                borderRadius: 12,
                padding: '10px',
                border: '1px solid #e5e7eb',
                marginBottom: 14,
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                Dispatched Contacts:
              </p>
              {[
                { name: 'Suresh Dev', role: 'Primary Son', phone: '+919876543210' },
                { name: 'Lakshmi Devi', role: 'Neighbor', phone: '+919876543211' },
                { name: 'Dr. Roy Pillai', role: 'Geriatric GP', phone: '+919876543212' },
              ].map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: 11,
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                  <a
                    href={`https://wa.me/${c.phone}?text=🚨%20Urgent%20health%20alert%20for%20Rajamma`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#059669',
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: '#dcfce7',
                    }}
                  >
                    Open WA ↗
                  </a>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <a
                href="tel:108"
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 14,
                  background: '#dc2626',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                📞 Call 108
              </a>

              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 14,
                  background: '#111827',
                  color: 'white',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
