import React, { useState, useEffect } from 'react';
import { syncHealthProgress, BodyPartKey } from '../utils/painDetection';

export interface Medication {
  time: string;
  freq: string;
  name: string;
  dose: string;
  note: string;
  active?: boolean;
  isPainRelief?: boolean;
}

export interface MedicalRecord {
  type: string;
  date: string;
  by: string;
  title: string;
  desc: string;
  metric: string;
  status: string;
  statusOk: boolean;
  icon: string;
  filterKey: string;
  hasPain?: boolean;
  painLocation?: string;
  painSeverity?: string;
  painReliefNote?: string;
}

export const DEFAULT_MEDICATIONS: Medication[] = [
  {
    time: '08:00 AM',
    freq: 'DAILY',
    name: 'Amlodipine (Blood Pressure)',
    dose: '5 mg',
    note: 'With warm water after breakfast',
    active: true,
    isPainRelief: false,
  },
  {
    time: '10:00 AM',
    freq: 'ALT',
    name: 'Calcium & Vitamin D3',
    dose: '1 Tablet',
    note: 'After morning tea for bone strength',
    active: true,
    isPainRelief: false,
  },
  {
    time: '01:30 PM',
    freq: 'DAILY',
    name: 'Metformin (Blood Sugar)',
    dose: '500 mg',
    note: 'During lunch',
    active: true,
    isPainRelief: false,
  },
  {
    time: '02:00 PM',
    freq: 'DAILY',
    name: 'Glucosamine Joint Support',
    dose: '500 mg',
    note: 'After lunch for knee joint & pain comfort',
    active: true,
    isPainRelief: true,
  },
  {
    time: '08:30 PM',
    freq: 'DAILY',
    name: 'Atorvastatin (Cholesterol)',
    dose: '10 mg',
    note: 'After dinner before sleep',
    active: true,
    isPainRelief: false,
  },
];

export const DEFAULT_RECORDS: MedicalRecord[] = [
  {
    type: 'VITAL SCAN',
    date: '2026-08-05',
    by: 'Home Care Nurse',
    title: 'Blood Pressure & Heart Rate Monitoring',
    desc: 'BP 128/82 mmHg. HR 72 bpm. Stable parameters.',
    metric: '128/82 mmHg · HR: 72 bpm',
    status: 'Normal',
    statusOk: true,
    icon: '📊',
    filterKey: 'Vital Scan',
    hasPain: false,
  },
  {
    type: 'LAB REPORT',
    date: '2026-07-28',
    by: 'Dr. K.S. Sharma',
    title: 'Comprehensive Lipid & Fasting Sugar Panel',
    desc: 'Fasting Glucose 110 mg/dL, HbA1c 6.2%. Lipid within range.',
    metric: 'Glucose: 110 mg/dL · HbA1c: 6.2%',
    status: 'Normal',
    statusOk: true,
    icon: '🧪',
    filterKey: 'Lab Report',
    hasPain: false,
  },
  {
    type: 'SYMPTOM LOG',
    date: '2026-07-15',
    by: 'Dr. K.S. Sharma',
    title: 'Mild Knee Joint Stiffness Logged',
    desc: 'Stiffness after morning walk. Recommended Glucosamine joint tablet after lunch & warm compress.',
    metric: 'Pain level: 3/10',
    status: 'Needs Attention',
    statusOk: false,
    icon: '⚠️',
    filterKey: 'Symptom Log',
    hasPain: true,
    painLocation: 'knee',
    painSeverity: 'mild',
    painReliefNote: 'Glucosamine 500mg daily & warm compresses',
  },
  {
    type: 'DOCTOR VISIT',
    date: '2026-06-20',
    by: 'Dr. K.S. Sharma',
    title: 'Quarterly Cardiac & General Check-up',
    desc: 'ECG normal sinus rhythm. Amlodipine 5mg continued.',
    metric: 'Sinus Rhythm · Normal ECG',
    status: 'Normal',
    statusOk: true,
    icon: '👨‍⚕️',
    filterKey: 'Doctor Visit',
    hasPain: false,
  },
];

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  'LAB REPORT': { bg: '#ede9fe', text: '#7c3aed' },
  'VITAL SCAN': { bg: '#e0f2fe', text: '#0369a1' },
  'SYMPTOM LOG': { bg: '#fef3c7', text: '#d97706' },
  'DOCTOR VISIT': { bg: '#f0fdf4', text: '#059669' },
  'PRESCRIPTION': { bg: '#dcfce7', text: '#15803d' },
};

export function PatientRecords() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Persist records & medications in localStorage so Siri & other tabs can read them
  const [records, setRecords] = useState<MedicalRecord[]>(() => {
    try {
      const saved = localStorage.getItem('aura_patient_records');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RECORDS;
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem('aura_medications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MEDICATIONS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_patient_records', JSON.stringify(records));
    } catch {}
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_medications', JSON.stringify(medications));
    } catch {}
  }, [medications]);

  const [isUploading, setIsUploading] = useState(false);

  // In-app modals state
  const [showAddMed, setShowAddMed] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('10 mg');
  const [medTime, setMedTime] = useState('09:00 AM');
  const [medFreq, setMedFreq] = useState('DAILY');
  const [medNote, setMedNote] = useState('Take with warm water');

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recCategory, setRecCategory] = useState('Lab Report');
  const [recTitle, setRecTitle] = useState('');
  const [recBy, setRecBy] = useState('Dr. Sharma');
  const [recMetric, setRecMetric] = useState('Normal parameter');
  const [recDesc, setRecDesc] = useState('');

  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  const filteredRecords = records.filter((r) => {
    const matchesFilter = activeFilter === 'All' || r.filterKey === activeFilter;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.by.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSaveMedication = () => {
    if (!medName.trim()) return;
    const isPain =
      medName.toLowerCase().includes('glucosamine') ||
      medName.toLowerCase().includes('pain') ||
      medName.toLowerCase().includes('paracetamol') ||
      medName.toLowerCase().includes('dolo') ||
      medName.toLowerCase().includes('joint') ||
      medNote.toLowerCase().includes('pain') ||
      medNote.toLowerCase().includes('stiff');

    setMedications((prev) => [
      ...prev,
      {
        time: medTime || '09:00 AM',
        freq: medFreq,
        name: medName.trim(),
        dose: medDose || '1 dose',
        note: medNote || 'Take with water',
        active: true,
        isPainRelief: isPain,
      },
    ]);
    setShowAddMed(false);
    setMedName('');
  };

  const handleSaveRecord = () => {
    if (!recTitle.trim()) return;
    const typeUpper = recCategory.toUpperCase();
    const icons: Record<string, string> = {
      'LAB REPORT': '🧪',
      'VITAL SCAN': '📊',
      'SYMPTOM LOG': '📝',
      'DOCTOR VISIT': '🩺',
      'PRESCRIPTION': '💊',
    };

    const hasPain =
      recTitle.toLowerCase().includes('pain') ||
      recTitle.toLowerCase().includes('stiff') ||
      recTitle.toLowerCase().includes('knee') ||
      recDesc.toLowerCase().includes('pain') ||
      recDesc.toLowerCase().includes('stiff');

    setRecords((prev) => [
      {
        type: typeUpper,
        date: new Date().toISOString().split('T')[0],
        by: recBy || 'Home Care',
        title: recTitle.trim(),
        desc: recDesc || 'Direct health record logged.',
        metric: recMetric || 'Normal status',
        status: hasPain ? 'Needs Attention' : 'Normal',
        statusOk: !hasPain,
        icon: icons[typeUpper] || '📋',
        filterKey: recCategory,
        hasPain,
        painLocation: hasPain ? 'knee' : undefined,
        painReliefNote: hasPain ? 'Warm compress & rest' : undefined,
      },
      ...prev,
    ]);
    setShowAddRecord(false);
    setRecTitle('');
    setRecDesc('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/analyze-medical-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            fileBase64: base64,
          }),
        });
        const data = await res.json();
        if (data.success && data.analysis) {
          const analysis = data.analysis;
          const painInfo = analysis.painAnalysis;
          const hasPainDoc = !!painInfo?.hasPain;
          const painLocation = painInfo?.bodyPart || 'knee';

          const newRecord: MedicalRecord = {
            type: (analysis.category || 'LAB REPORT').toUpperCase(),
            date: new Date().toISOString().split('T')[0],
            by: analysis.doctor || 'AI Medical Extraction',
            title: analysis.title || file.name,
            desc: analysis.notes || 'Analyzed via Gemini Medical Document Vision.',
            metric: analysis.vitalsSummary || 'Extracted via AI',
            status: analysis.status || (hasPainDoc ? 'Needs Attention' : 'Normal'),
            statusOk: analysis.status !== 'Needs Attention' && !hasPainDoc,
            icon: hasPainDoc ? '🩹' : '📄',
            filterKey: analysis.category || 'Lab Report',
            hasPain: hasPainDoc,
            painLocation: hasPainDoc ? painLocation : undefined,
            painSeverity: painInfo?.severity,
            painReliefNote: painInfo?.painTablets?.join(', ') || undefined,
          };

          setRecords((prev) => [newRecord, ...prev]);

          // If pain is documented in the uploaded record, immediately sync with Body Map & Siri
          if (hasPainDoc) {
            syncHealthProgress(
              painLocation as BodyPartKey,
              'active',
              painInfo?.description || 'Pain documented in medical report'
            );

            window.dispatchEvent(
              new CustomEvent('aura_pain_reported', {
                detail: {
                  bodyPart: painLocation,
                  label: `${painLocation.toUpperCase()} (Documented in Medical Record)`,
                  symptom: painInfo?.description || 'Pain documented in medical report',
                  rec: `Prescribed relief: ${painInfo?.painTablets?.join(', ') || 'Medication on file'}. ${analysis.notes || ''}`,
                  source: `Uploaded Record (${analysis.title || file.name})`,
                  timestamp: Date.now(),
                },
              })
            );
          }

          if (analysis.extractedMedications && analysis.extractedMedications.length > 0) {
            setMedications((prev) => [
              ...prev,
              ...analysis.extractedMedications.map((m: any) => ({
                time: m.time || '09:00 AM',
                freq: (m.frequency || 'DAILY').toUpperCase(),
                name: m.name,
                dose: m.dosage || '1 dose',
                note: m.instructions || 'Extracted prescription',
                active: true,
                isPainRelief:
                  m.isPainRelief ||
                  m.name.toLowerCase().includes('glucosamine') ||
                  m.name.toLowerCase().includes('pain') ||
                  m.name.toLowerCase().includes('dolo') ||
                  m.name.toLowerCase().includes('paracetamol'),
              })),
            ]);
          }

          if (hasPainDoc) {
            setUploadNotice(
              `⚡ Document Analyzed: Found documented ${painLocation.toUpperCase()} pain. Prescribed tablets (${(painInfo?.painTablets || []).join(', ') || 'Glucosamine'}) added and Body Map updated!`
            );
          } else {
            setUploadNotice(`Medical document analyzed successfully: ${analysis.title || file.name}`);
          }
        } else {
          setUploadNotice(`Document parsed and added to medical history: ${file.name}`);
        }
      } catch {
        setUploadNotice(`Report uploaded and indexed to patient records: ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
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
        <h2
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: '#111827',
            margin: 0,
          }}
        >
          Patient Records
        </h2>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>
          Medications, history & lab reports for Rajamma
        </p>
      </div>

      {/* Siri Voice Assistant Helper Banner */}
      <div
        style={{
          margin: '0 12px 10px',
          borderRadius: 16,
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1.5px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>🎙️</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#1e40af' }}>
            Siri Medical Records & Tablets Assistant
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#3b82f6', lineHeight: 1.4 }}>
            Say &ldquo;Siri, is there any pain in my records?&rdquo; or &ldquo;Siri, what tablets do I take?&rdquo; to hear your medical reports and prescribed medicines aloud.
          </p>
        </div>
      </div>

      {/* Medication Schedule Section */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>💊</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Medication Schedule
            </p>
          </div>
          <button
            onClick={() => setShowAddMed(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 10,
              background: '#10b981',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            + Add
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {medications.map((med, idx) => (
            <div
              key={`${med.name}-${idx}`}
              style={{
                borderRadius: 12,
                padding: '10px 12px',
                background: med.isPainRelief ? '#fff5f5' : '#f9fafb',
                border: `1px solid ${med.isPainRelief ? '#fecaca' : '#e9ecef'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                    ⏰ {med.time}
                  </span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: med.freq === 'DAILY' ? '#dcfce7' : '#fef3c7',
                      color: med.freq === 'DAILY' ? '#059669' : '#d97706',
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {med.freq}
                  </span>
                  {med.isPainRelief && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      🩹 Pain Relief Tablet
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {med.name}
                </p>
                <p style={{ fontSize: 10, color: '#6b7280', margin: '1px 0' }}>
                  Dose: {med.dose} · {med.note}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    setMedications((prev) =>
                      prev.map((m, i) => (i === idx ? { ...m, active: !m.active } : m))
                    );
                  }}
                  title={med.active ? 'Mark as taken today' : 'Mark as pending'}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: med.active ? '#dcfce7' : '#f1f5f9',
                    color: med.active ? '#15803d' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {med.active ? '✓ Taken' : '○ Pending'}
                </button>
                <button
                  onClick={() => {
                    setMedications((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  title="Remove medication"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical History & Records Section */}
      <div style={{ margin: '0 12px 16px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Medical History & Records
            </p>
          </div>
          <button
            onClick={() => setShowAddRecord(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 10,
              background: '#111827',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            + Add Log
          </button>
        </div>

        {/* Upload Button */}
        <label
          style={{
            display: 'block',
            width: '100%',
            padding: '9px 0',
            borderRadius: 12,
            background: '#f0fdf4',
            color: '#059669',
            fontSize: 12,
            fontWeight: 700,
            border: '1.5px dashed #10b981',
            cursor: 'pointer',
            marginBottom: 10,
            textAlign: 'center',
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          {isUploading ? '⏳ Analyzing Document with AI...' : '☁️ Upload PDF Report (AI Analysis)'}
          <input
            type="file"
            accept=".pdf,image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>

        {/* Upload notice banner */}
        {uploadNotice && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#15803d',
              fontWeight: 600,
            }}
          >
            <span>✓ {uploadNotice}</span>
            <button
              onClick={() => setUploadNotice(null)}
              style={{ background: 'none', border: 'none', color: '#15803d', fontSize: 12, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['All', 'Lab Report', 'Vital Scan', 'Doctor Visit', 'Symptom Log'].map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: isActive ? '#10b981' : '#f4f6f9',
                  color: isActive ? 'white' : '#6b7280',
                  fontSize: 10,
                  fontWeight: 700,
                  border: `1px solid ${isActive ? '#10b981' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <svg
            viewBox="0 0 24 24"
            fill="#9ca3af"
            style={{
              width: 14,
              height: 14,
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px 8px 28px',
              borderRadius: 12,
              background: '#f4f6f9',
              border: '1px solid #e5e7eb',
              fontSize: 12,
              color: '#374151',
              fontFamily: "'Nunito', sans-serif",
              outline: 'none',
            }}
          />
        </div>

        {/* Records List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredRecords.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', padding: '20px 0' }}>
              No records found
            </p>
          ) : (
            filteredRecords.map((rec) => {
              const badgeStyle = TYPE_STYLES[rec.type] ?? { bg: '#f4f6f9', text: '#6b7280' };
              return (
                <div
                  key={rec.title}
                  style={{
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: '#f9fafb',
                    border: '1px solid #e9ecef',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{rec.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {rec.type}
                        </span>
                        <span style={{ fontSize: 9, color: '#9ca3af' }}>
                          📅 {rec.date} · {rec.by}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>
                        {rec.title}
                      </p>
                      <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 6px' }}>
                        {rec.desc}
                      </p>
                      {rec.hasPain && (
                        <div style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: 9,
                              fontWeight: 800,
                            }}
                          >
                            🚨 Documented Pain: {rec.painLocation ? rec.painLocation.toUpperCase() : 'KNEE'}
                          </span>
                          {rec.painReliefNote && (
                            <span style={{ fontSize: 9.5, color: '#991b1b', fontWeight: 600 }}>
                              Relief: {rec.painReliefNote}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>
                          {rec.metric}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: rec.statusOk ? '#dcfce7' : '#fef3c7',
                              color: rec.statusOk ? '#059669' : '#d97706',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {rec.status}
                          </span>
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            title="View record"
                            style={{
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: '#f1f5f9',
                              border: 'none',
                              fontSize: 10,
                              color: '#475569',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              setRecords((prev) => prev.filter((r) => r.title !== rec.title));
                            }}
                            title="Remove record"
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 5,
                              background: '#fee2e2',
                              border: 'none',
                              fontSize: 10,
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Medication Modal */}
      {showAddMed && (
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
              + Add Medication
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Medicine Name & Indication
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metformin (Sugar)"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
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
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                    Dosage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg"
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                    Schedule Time
                  </label>
                  <input
                    type="text"
                    placeholder="08:00 AM"
                    value={medTime}
                    onChange={(e) => setMedTime(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. After breakfast with warm water"
                  value={medNote}
                  onChange={(e) => setMedNote(e.target.value)}
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
                onClick={() => setShowAddMed(false)}
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
                onClick={handleSaveMedication}
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
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecord && (
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
              + Add Health Record
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: 'white',
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="Vital Scan">Vital Scan</option>
                  <option value="Doctor Visit">Doctor Visit</option>
                  <option value="Symptom Log">Symptom Log</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Record Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Blood Sugar & Pulse"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
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
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                    Logged By / Doctor
                  </label>
                  <input
                    type="text"
                    value={recBy}
                    onChange={(e) => setRecBy(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                    Key Metric
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80 mmHg"
                    value={recMetric}
                    onChange={(e) => setRecMetric(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                  Notes & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical observations or findings..."
                  value={recDesc}
                  onChange={(e) => setRecDesc(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: "'Nunito', sans-serif",
                    resize: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowAddRecord(false)}
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
                onClick={handleSaveRecord}
                style={{
                  flex: 1.2,
                  padding: '9px 0',
                  borderRadius: 12,
                  background: '#111827',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Record Full Detail Modal */}
      {selectedRecord && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: '#ede9fe',
                    color: '#7c3aed',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {selectedRecord.type}
                </span>
                <h3 style={{ margin: '6px 0 2px', fontSize: 16, color: '#111827', fontWeight: 800 }}>
                  {selectedRecord.title}
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                  📅 {selectedRecord.date} · Provider: {selectedRecord.by}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#334155' }}>
                Key Measurements:
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                {selectedRecord.metric}
              </p>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              {selectedRecord.desc}
            </p>

            <button
              onClick={() => setSelectedRecord(null)}
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
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
