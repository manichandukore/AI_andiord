export interface CareMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  relationship: string; // 'son' | 'daughter' | 'neighbor' | 'doctor' | 'spouse' | 'caregiver'
  phone: string;
  email: string;
  location: string;
  avatarColor: string;
  badge: string | null;
  isPrimary: boolean;
}

export interface EmergencyEvent {
  id: string;
  timestamp: string;
  dateStr: string;
  patientName: string;
  symptoms: string[];
  severity: 'SERIOUS' | 'EMERGENCY';
  bodyParts: string[];
  contactNotified: {
    name: string;
    role: string;
    phone: string;
  };
  callInitiated: boolean;
  messageDispatched: boolean;
  channelUsed: string;
  summary: string;
}

export const DEFAULT_CARE_MEMBERS: CareMember[] = [
  {
    id: 'suresh-son',
    initials: 'SD',
    name: 'Suresh Dev',
    role: 'Primary Caregiver (Son)',
    relationship: 'son',
    phone: '+91 98765 43210',
    email: 'suresh.dev@example.com',
    location: 'Hyderabad (15 mins away)',
    avatarColor: '#059669',
    badge: 'PRIMARY 1ST RESPONDER',
    isPrimary: true,
  },
  {
    id: 'lakshmi-neighbor',
    initials: 'LD',
    name: 'Lakshmi Devi',
    role: 'Support (Neighbor)',
    relationship: 'neighbor',
    phone: '+91 98765 43211',
    email: 'lakshmi.d@example.com',
    location: 'Apartment 302 (Same Floor)',
    avatarColor: '#f59e0b',
    badge: null,
    isPrimary: false,
  },
  {
    id: 'dr-roy-gp',
    initials: 'RP',
    name: 'Dr. Roy Pillai',
    role: 'Geriatric GP',
    relationship: 'doctor',
    phone: '+91 98765 43212',
    email: 'dr.roy@cityclinic.org',
    location: 'City Care Hospital',
    avatarColor: '#ef4444',
    badge: null,
    isPrimary: false,
  },
];

const STORAGE_KEY_MEMBERS = 'aura_care_members';
const STORAGE_KEY_HISTORY = 'aura_emergency_history';

// Retrieve all Care Circle members
export function getCareCircleMembers(): CareMember[] {
  if (typeof window === 'undefined') return DEFAULT_CARE_MEMBERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_CARE_MEMBERS;
}

// Save updated Care Circle members
export function saveCareCircleMembers(members: CareMember[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
    window.dispatchEvent(new CustomEvent('aura_care_members_updated', { detail: { members } }));
  } catch {}
}

// Get the patient's configured name (defaults to 'Rajamma')
export function getPatientName(): string {
  if (typeof window === 'undefined') return 'Rajamma';
  return localStorage.getItem('aura_senior_name') || 'Rajamma';
}

// Resolve contact dynamically by relationship keyword or name
export function resolveCareContact(query: string): CareMember | null {
  const members = getCareCircleMembers();
  if (!query || typeof query !== 'string') {
    return getPrimaryEmergencyContact();
  }

  const q = query.toLowerCase().trim();

  // Relationship matchers (English, Telugu, Hindi)
  if (
    q.includes('son') ||
    q.includes('boy') ||
    q.includes('కొడుకు') ||
    q.includes('కుమారుడు') ||
    q.includes('అబ్బాయి') ||
    q.includes('बेटा') ||
    q.includes('पुत्र') ||
    q.includes('लड़का')
  ) {
    const match = members.find(
      (m) =>
        m.relationship === 'son' ||
        m.role.toLowerCase().includes('son') ||
        m.name.toLowerCase().includes('suresh') ||
        m.name.toLowerCase().includes('ramesh')
    );
    if (match) return match;
  }

  if (
    q.includes('daughter') ||
    q.includes('girl') ||
    q.includes('కూతురు') ||
    q.includes('కుమార్తె') ||
    q.includes('అమ్మాయి') ||
    q.includes('बेटी') ||
    q.includes('पुत्री') ||
    q.includes('लड़की')
  ) {
    const match = members.find(
      (m) =>
        m.relationship === 'daughter' ||
        m.role.toLowerCase().includes('daughter') ||
        m.name.toLowerCase().includes('kavitha') ||
        m.name.toLowerCase().includes('anita')
    );
    if (match) return match;
  }

  if (
    q.includes('doctor') ||
    q.includes('dr') ||
    q.includes('physician') ||
    q.includes('hospital') ||
    q.includes('clinic') ||
    q.includes('డాక్టర్') ||
    q.includes('వైద్యుడు') ||
    q.includes('डॉक्टर') ||
    q.includes('वैद्य')
  ) {
    const match = members.find(
      (m) =>
        m.relationship === 'doctor' ||
        m.role.toLowerCase().includes('gp') ||
        m.role.toLowerCase().includes('doctor') ||
        m.name.toLowerCase().includes('roy') ||
        m.name.toLowerCase().includes('rao') ||
        m.name.toLowerCase().includes('sharma')
    );
    if (match) return match;
  }

  if (
    q.includes('neighbor') ||
    q.includes('neighbour') ||
    q.includes('flat') ||
    q.includes('floor') ||
    q.includes('పక్కింటి') ||
    q.includes('పక్కింట్లో') ||
    q.includes('पड़ोसी') ||
    q.includes('पड़ोस')
  ) {
    const match = members.find(
      (m) =>
        m.relationship === 'neighbor' ||
        m.role.toLowerCase().includes('neighbor') ||
        m.name.toLowerCase().includes('lakshmi')
    );
    if (match) return match;
  }

  // Name matchers
  for (const m of members) {
    const first = m.name.toLowerCase().split(' ')[0];
    if (q.includes(first) || q.includes(m.name.toLowerCase())) {
      return m;
    }
  }

  // Default fallback to primary contact
  return getPrimaryEmergencyContact();
}

// Get the designated primary emergency responder
export function getPrimaryEmergencyContact(): CareMember {
  const members = getCareCircleMembers();
  const primary = members.find((m) => m.isPrimary || m.badge?.includes('PRIMARY'));
  return primary || members[0] || DEFAULT_CARE_MEMBERS[0];
}

// Record an emergency incident in history and patient records
export function recordEmergencyEvent(event: EmergencyEvent): void {
  if (typeof window === 'undefined') return;

  try {
    let history: EmergencyEvent[] = [];
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) history = JSON.parse(saved);

    history = [event, ...history];
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    // Also append to patient medical records for comprehensive audit trail
    let records: any[] = [];
    const rSaved = localStorage.getItem('aura_patient_records');
    if (rSaved) records = JSON.parse(rSaved);

    const newRecord = {
      type: 'EMERGENCY ALERT',
      date: event.dateStr,
      by: 'Automatic Emergency Care Circle Engine',
      title: `🚨 ${event.severity}: ${event.symptoms.join(', ')}`,
      desc: event.summary,
      metric: `Contacted: ${event.contactNotified.name} (${event.contactNotified.phone})`,
      status: 'Critical Alert',
      statusOk: false,
      icon: '🚨',
      filterKey: 'Emergency Alert',
      hasPain: true,
      painLocation: event.bodyParts[0] || 'heart',
      painSeverity: 'severe',
    };

    records = [newRecord, ...records];
    localStorage.setItem('aura_patient_records', JSON.stringify(records));

    window.dispatchEvent(new CustomEvent('aura_emergency_history_updated', { detail: { event } }));
    window.dispatchEvent(new CustomEvent('aura_records_updated'));
  } catch (err) {
    console.warn('Failed to record emergency event:', err);
  }
}

// Retrieve past emergency incidents
export function getEmergencyHistory(): EmergencyEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}
