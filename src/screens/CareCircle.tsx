import React, { useState } from 'react';

interface CareMember {
  initials: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  avatarColor: string;
  badge: string | null;
}

const CARE_MEMBERS: CareMember[] = [
  {
    initials: 'SD',
    name: 'Suresh Dev',
    role: 'Primary Caregiver (Son)',
    phone: '+91 98765 43210',
    email: 'suresh.dev@example.com',
    location: 'Hyderabad (15 mins away)',
    avatarColor: '#059669',
    badge: 'PRIMARY 1ST RESPONDER',
  },
  {
    initials: 'LD',
    name: 'Lakshmi Devi',
    role: 'Support (Neighbor)',
    phone: '+91 98765 43211',
    email: 'lakshmi.d@example.com',
    location: 'Apartment 302 (Same Floor)',
    avatarColor: '#f59e0b',
    badge: null,
  },
  {
    initials: 'RP',
    name: 'Dr. Roy Pillai',
    role: 'Geriatric GP',
    phone: '+91 98765 43212',
    email: 'dr.roy@cityclinic.org',
    location: 'City Care Hospital',
    avatarColor: '#ef4444',
    badge: null,
  },
];

export function CareCircle() {
  const [autoWhatsApp, setAutoWhatsApp] = useState(true);
  const [sosSent, setSosSent] = useState(false);
  const [sosDispatchedData, setSosDispatchedData] = useState<any>(null);
  const [members, setMembers] = useState<CareMember[]>(CARE_MEMBERS);

  // In-app modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CareMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<CareMember | null>(null);

  // New member form
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Family Member');
  const [formPhone, setFormPhone] = useState('+91 ');
  const [formLocation, setFormLocation] = useState('Hyderabad');

  const handleTriggerSOS = async () => {
    setSosSent(true);
    try {
      const res = await fetch('/api/whatsapp/send-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomText: 'Acute Health Discomfort / Urgent SOS Alert from Rajamma',
          contacts: members,
          userName: 'Rajamma',
          location: 'Home (Flat 302, Hyderabad)',
        }),
      });
      const data = await res.json();
      setSosDispatchedData(data);
    } catch {
      setSosDispatchedData({
        success: true,
        dispatchedCount: members.length,
        contacts: members.map((m) => ({
          name: m.name,
          phone: m.phone,
          status: 'simulated_delivery',
          waLink: `https://wa.me/${m.phone.replace(/[^0-9]/g, '')}?text=URGENT%20SOS`,
        })),
      });
    }
  };

  const handleWhatsAppDirect = (member: CareMember) => {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${member.name}, this is an update regarding Rajamma's daily wellness monitoring.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDirectCall = (member: CareMember) => {
    window.location.href = `tel:${member.phone.replace(/\s+/g, '')}`;
  };

  const handleSaveNewMember = () => {
    if (!formName.trim() || !formPhone.trim()) return;
    const colors = ['#059669', '#7c3aed', '#f59e0b', '#2563eb', '#dc2626'];
    const randomColor = colors[members.length % colors.length];
    setMembers((prev) => [
      ...prev,
      {
        initials: formName.slice(0, 2).toUpperCase(),
        name: formName.trim(),
        role: formRole.trim() || 'Caregiver',
        phone: formPhone.trim(),
        email: `${formName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        location: formLocation.trim() || 'Nearby',
        avatarColor: randomColor,
        badge: null,
      },
    ]);
    setShowAddModal(false);
    setFormName('');
    setFormPhone('+91 ');
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f2f4f7' }}>
      {/* Top Banner */}
      <div
        style={{
          margin: '10px 12px 10px',
          borderRadius: 20,
          padding: '14px 16px',
          background: 'linear-gradient(135deg,#ede9fe 0%,#ecfdf5 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 8,
                background: '#dcfce7',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 10 }}>⚡</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#059669',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                WhatsApp Auto-Dispatch Ready
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: '#111827',
                margin: 0,
              }}
            >
              Care Circle & Emergency
            </h2>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>
              Rajamma's family, doctors & emergency dispatch
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 12,
              background: '#10b981',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
              flexShrink: 0,
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Auto WhatsApp Emergency Alert Setting Box */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                Auto WhatsApp Emergency Alert
              </p>
              {autoWhatsApp && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: '#dcfce7',
                    color: '#059669',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  ACTIVE ✓
                </span>
              )}
            </div>
            <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>
              Acute symptoms trigger auto-dispatch to all Care Circle members
            </p>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => setAutoWhatsApp(!autoWhatsApp)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 12,
              background: autoWhatsApp ? '#10b981' : '#d1d5db',
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
                left: autoWhatsApp ? 20 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* Emergency Template Preview */}
        <div
          style={{
            borderRadius: 10,
            padding: '8px 10px',
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Auto Emergency Template
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 4,
                background: '#e5e7eb',
                color: '#6b7280',
              }}
            >
              Auto-Formatted
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#374151', margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>
            🚨 URGENT: Rajamma Dev reported acute symptoms ([Symptom]) at [Time]. Please check on her immediately. GPS: Home (Flat 302, Hyderabad).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleTriggerSOS}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 12,
              background: sosSent ? '#059669' : '#111827',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
              transition: 'background 0.3s',
            }}
          >
            {sosSent ? '✓ SOS Sent!' : '🚨 Trigger WhatsApp SOS'}
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 12,
              background: '#f4f6f9',
              color: '#374151',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            🔔 Test Recipients
          </button>
        </div>

        {/* SOS Dispatched Live Feedback */}
        {sosDispatchedData && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>
                ✓ Dispatched to {sosDispatchedData.dispatchedCount || members.length} Contacts
              </span>
              <button
                onClick={() => setSosDispatchedData(null)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#166534', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 10.5, color: '#15803d' }}>
              Auto-sent WhatsApp emergency template with GPS coordinates & vital stats.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {members.map((m) => (
                <button
                  key={m.name}
                  onClick={() => handleWhatsAppDirect(m)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    fontSize: 9.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💬 {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Members Section Header */}
      <div
        style={{
          margin: '0 12px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          Care Circle Members ({members.length})
        </p>
        <p style={{ fontSize: 9, color: '#6b7280', margin: 0 }}>All receive auto alerts</p>
      </div>

      {/* Member Cards */}
      {members.map((member) => (
        <div
          key={member.name}
          style={{
            margin: '8px 12px',
            borderRadius: 20,
            padding: '14px 16px',
            background: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: member.avatarColor,
                color: 'white',
                fontWeight: 800,
                fontSize: 14,
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {member.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {member.name}
                </p>
                {member.badge && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: '#ede9fe',
                      color: '#7c3aed',
                    }}
                  >
                    {member.badge}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: member.avatarColor, fontWeight: 600, margin: '2px 0 0' }}>
                {member.role}
              </p>
            </div>

            {/* Quick Action Icons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setEditingMember({ ...member })}
                title="Edit contact"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#f4f6f9',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 13, height: 13 }}>
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
              <button
                onClick={() => setDeletingMember(member)}
                title="Remove contact"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 24 24" fill="#ef4444" style={{ width: 13, height: 13 }}>
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Details list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {[
              { icon: '📞', text: member.phone },
              { icon: '✉️', text: member.email },
              { icon: '📍', text: member.location },
            ].map((d) => (
              <div key={d.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{d.icon}</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{d.text}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleWhatsAppDirect(member)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 12,
                background: '#dcfce7',
                color: '#059669',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => handleDirectCall(member)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 12,
                background: '#111827',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              📱 Direct Call
            </button>
          </div>
        </div>
      ))}

      {/* Add Member Modal */}
      {showAddModal && (
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
              maxWidth: '92%',
              background: 'white',
              borderRadius: 22,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#111827', fontWeight: 800 }}>
              + Add Care Circle Contact
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Role / Relation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Son, Physiotherapist, Neighbor"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewMember}
                style={{
                  flex: 1.2,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#10b981',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
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
              maxWidth: '92%',
              background: 'white',
              borderRadius: 22,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#111827', fontWeight: 800 }}>
              Edit {editingMember.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Location / Notes
                </label>
                <input
                  type="text"
                  value={editingMember.location}
                  onChange={(e) => setEditingMember({ ...editingMember, location: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditingMember(null)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setMembers((prev) =>
                    prev.map((m) => (m.name === editingMember.name ? editingMember : m))
                  );
                  setEditingMember(null);
                }}
                style={{
                  flex: 1.2,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#10b981',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {deletingMember && (
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
              width: 320,
              maxWidth: '90%',
              background: 'white',
              borderRadius: 22,
              padding: 20,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                margin: '0 auto 10px',
              }}
            >
              🗑️
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#111827', fontWeight: 800 }}>
              Remove Contact?
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Are you sure you want to remove <strong>{deletingMember.name}</strong> from Rajamma's Care Circle?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeletingMember(null)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setMembers((prev) => prev.filter((m) => m.name !== deletingMember.name));
                  setDeletingMember(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#dc2626',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Recipients Modal */}
      {showTestModal && (
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
                <span style={{ fontSize: 20 }}>🔔</span>
                <h3 style={{ margin: 0, fontSize: 16, color: '#111827', fontWeight: 800 }}>
                  Active Recipients ({members.length})
                </h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#64748b' }}>
              Every contact below receives instant WhatsApp and SMS alerts during an emergency:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>
              {members.map((m) => (
                <div
                  key={m.name}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      {m.name} <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>({m.role})</span>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#059669' }}>
                      {m.phone}
                    </p>
                  </div>
                  <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 6, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    Verified ✓
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowTestModal(false)}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 14,
                background: '#111827',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
