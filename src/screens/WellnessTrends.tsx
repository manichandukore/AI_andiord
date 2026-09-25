import React, { useState, useEffect } from 'react';
import { SmartWatchHub } from '../components/SmartWatchHub';
import { AddReadingModal } from '../components/AddReadingModal';
import { smartWatchService } from '../services/smartWatchService';
import { VitalReading, SmartWatchLiveTelemetry } from '../types/vitals';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCORE_DATA = [82, 84, 83, 85, 87, 88, 90];
const SLEEP_DATA = [7.5, 7.8, 8, 7.9, 8.2, 8.1, 8.2];
const MOOD_DATA = [85, 88, 90, 92, 94, 96, 97];
const BASE_HR_DATA = [70, 72, 73, 71, 74, 72];

const INITIAL_READINGS: VitalReading[] = [
  {
    id: 'reading_init_1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    dateStr: 'Today, 09:15 AM',
    bpSystolic: 124,
    bpDiastolic: 82,
    heartRate: 72,
    spo2: 98,
    temperature: 36.8,
    bloodSugar: 104,
    height: 170,
    weight: 65,
    notes: 'Morning routine check. Patient energetic after breakfast.',
    source: 'manual',
  },
  {
    id: 'reading_init_2',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    dateStr: 'Yesterday, 05:40 PM',
    bpSystolic: 120,
    bpDiastolic: 79,
    heartRate: 76,
    spo2: 99,
    temperature: 36.7,
    bloodSugar: 110,
    height: 170,
    weight: 65,
    notes: 'Automated sync during evening garden stroll.',
    source: 'smart_watch',
    deviceModel: 'Samsung Galaxy Watch 6',
  },
];

interface TrendCurveProps {
  data: number[];
  color: string;
  height?: number;
}

function TrendCurve({ data, color, height = 80 }: TrendCurveProps) {
  const h = height;
  const min = Math.min(...data) - 2;
  const range = Math.max(...data) + 1 - min;
  const step = 310 / (data.length - 1);

  const points = data.map((val, idx) => ({
    x: idx * step,
    y: h - ((val - min) / range) * h,
  }));

  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = points[idx - 1];
    const cp = prev.x + step / 2;
    return `${acc} C ${cp.toFixed(1)} ${prev.y.toFixed(1)}, ${cp.toFixed(1)} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h} L 0 ${h} Z`;
  const gradId = `g${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 310 ${h}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x}
          cy={pt.y}
          r={idx === points.length - 1 ? 4 : 2.5}
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export function WellnessTrends() {
  const { user } = useAuth();

  // Smart Watch live state
  const [watchStatus, setWatchStatus] = useState(() => smartWatchService.getStatus());
  const [telemetry, setTelemetry] = useState<SmartWatchLiveTelemetry>(() => watchStatus.telemetry);

  // Add Reading Modal state (matching user's attached screenshot)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [showVitalReadings, setShowVitalReadings] = useState(false);

  // Vital readings list
  const [readings, setReadings] = useState<VitalReading[]>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('aura_vital_readings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // Ignore
        }
      }
    }
    return INITIAL_READINGS;
  });

  // Listen to watch telemetry updates and automatic reading snapshots
  useEffect(() => {
    const handleTelemetry = (e: any) => {
      if (e.detail) {
        setTelemetry(e.detail);
      }
    };

    const handleStatusChanged = (e: any) => {
      if (e.detail) {
        setWatchStatus(e.detail);
        setTelemetry(e.detail.telemetry);
      }
    };

    const handleAutoReading = (e: any) => {
      if (e.detail) {
        const autoReading: VitalReading = e.detail;
        handleSaveReading(autoReading, true);
      }
    };

    window.addEventListener('aura_watch_telemetry', handleTelemetry);
    window.addEventListener('aura_watch_status_changed', handleStatusChanged);
    window.addEventListener('aura_watch_auto_reading', handleAutoReading);

    return () => {
      window.removeEventListener('aura_watch_telemetry', handleTelemetry);
      window.removeEventListener('aura_watch_status_changed', handleStatusChanged);
      window.removeEventListener('aura_watch_auto_reading', handleAutoReading);
    };
  }, [readings]);

  // Fetch Firestore vitals if user is authenticated
  useEffect(() => {
    if (!user) return;
    const fetchFirestoreVitals = async () => {
      try {
        const vitalsCol = collection(db, 'users', user.uid, 'vitals');
        const q = query(vitalsCol, orderBy('timestamp', 'desc'), limit(20));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const fetched: VitalReading[] = [];
          snap.forEach((docSnap) => {
            fetched.push(docSnap.data() as VitalReading);
          });
          if (fetched.length > 0) {
            setReadings((prev) => {
              // Merge unique
              const map = new Map<string, VitalReading>();
              prev.forEach((r) => map.set(r.id, r));
              fetched.forEach((r) => map.set(r.id, r));
              const combined = Array.from(map.values()).sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              localStorage.setItem('aura_vital_readings', JSON.stringify(combined));
              return combined;
            });
          }
        }
      } catch (err) {
        console.warn('Firestore vitals query note:', err);
      }
    };
    fetchFirestoreVitals();
  }, [user]);

  // Handle saving a reading (from Modal or from Watch Snapshot / Auto-sync)
  const handleSaveReading = async (newReading: VitalReading, isAutoSync = false) => {
    setReadings((prev) => {
      const updated = [newReading, ...prev];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_vital_readings', JSON.stringify(updated.slice(0, 50)));
      }
      return updated;
    });

    if (isAutoSync) {
      setSuccessToast(`⌚ Auto-updated from watch: ${newReading.heartRate} bpm · SpO2 ${newReading.spo2}%`);
    } else {
      setSuccessToast(
        `✓ Vital reading logged (${newReading.bpSystolic ? `${newReading.bpSystolic}/${newReading.bpDiastolic} mmHg, ` : ''}${newReading.heartRate ? `${newReading.heartRate} bpm` : ''})`
      );
    }
    setTimeout(() => setSuccessToast(''), 3000);

    // Save to Firestore if authenticated
    if (user) {
      try {
        const vitalDoc = doc(db, 'users', user.uid, 'vitals', newReading.id);
        const payload: Record<string, any> = {
          id: newReading.id,
          userId: user.uid,
          timestamp: newReading.timestamp,
        };
        if (newReading.dateStr) payload.dateStr = newReading.dateStr;
        if (newReading.bpSystolic !== undefined) payload.bpSystolic = newReading.bpSystolic;
        if (newReading.bpDiastolic !== undefined) payload.bpDiastolic = newReading.bpDiastolic;
        if (newReading.heartRate !== undefined) payload.heartRate = newReading.heartRate;
        if (newReading.spo2 !== undefined) payload.spo2 = newReading.spo2;
        if (newReading.temperature !== undefined) payload.temperature = newReading.temperature;
        if (newReading.bloodSugar !== undefined) payload.bloodSugar = newReading.bloodSugar;
        if (newReading.height !== undefined) payload.height = newReading.height;
        if (newReading.weight !== undefined) payload.weight = newReading.weight;
        if (newReading.notes) payload.notes = newReading.notes;
        if (newReading.source) payload.source = newReading.source;
        if (newReading.deviceModel) payload.deviceModel = newReading.deviceModel;

        await setDoc(vitalDoc, payload);
      } catch (err) {
        console.warn('Could not persist vital to Firestore:', err);
      }
    }
  };

  // Compute live heart rate trend curve
  const currentHeartRate = telemetry?.heartRate || readings[0]?.heartRate || 74;
  const dynamicHrData = [...BASE_HR_DATA, currentHeartRate];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f2f4f7', paddingBottom: 40 }}>
      {/* Toast alert */}
      {successToast && (
        <div
          style={{
            position: 'sticky',
            top: 10,
            zIndex: 50,
            margin: '0 12px 8px',
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            color: '#065f46',
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
          }}
        >
          <span>{successToast}</span>
          <button
            onClick={() => setSuccessToast('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          margin: '10px 12px 10px',
          borderRadius: 20,
          padding: '14px 16px',
          background: 'linear-gradient(135deg,#ede9fe 0%,#ecfdf5 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: '#111827',
                margin: 0,
              }}
            >
              Wellness Trends & Analytics
            </h2>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>
              Smart watch telemetry & biometric intelligence for Rajamma
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Direct button matching user's requested Add Reading image */}
            <button
              id="btn-open-add-reading-header"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                background: '#372545',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(55, 37, 69, 0.25)',
              }}
            >
              <span>+</span>
              <span>Add Reading</span>
            </button>

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" style={{ width: 18, height: 18 }}>
                <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Watch Connection Hub & Live Sync */}
      <SmartWatchHub
        onLogReading={handleSaveReading}
        onOpenAddReadingModal={() => setIsAddModalOpen(true)}
      />

      {/* 4 Metric Summary Cards with Live Watch Telemetry */}
      <div style={{ margin: '0 12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        {/* Heart Rate */}
        <div style={{ borderRadius: 14, padding: '10px 8px 8px', background: 'white', textAlign: 'center' }}>
          <span style={{ fontSize: 18 }}>❤️</span>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: '#ef4444', margin: '3px 0 1px' }}>Heart Rate</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 13.5, color: '#111827', margin: 0 }}>
            {currentHeartRate} <span style={{ fontSize: 9, fontWeight: 500 }}>bpm</span>
          </p>
          <p style={{ fontSize: 8, color: watchStatus.isConnected ? '#16a34a' : '#9ca3af', margin: '1px 0 0', fontWeight: watchStatus.isConnected ? 700 : 500 }}>
            {watchStatus.isConnected ? '🟢 Live Watch' : 'Latest'}
          </p>
        </div>

        {/* SpO2 */}
        <div style={{ borderRadius: 14, padding: '10px 8px 8px', background: 'white', textAlign: 'center' }}>
          <span style={{ fontSize: 18 }}>🫁</span>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: '#2563eb', margin: '3px 0 1px' }}>SpO2</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 13.5, color: '#111827', margin: 0 }}>
            {telemetry?.spo2 || 98}%
          </p>
          <p style={{ fontSize: 8, color: watchStatus.isConnected ? '#16a34a' : '#9ca3af', margin: '1px 0 0', fontWeight: watchStatus.isConnected ? 700 : 500 }}>
            {watchStatus.isConnected ? '🟢 Live Watch' : 'Optimum'}
          </p>
        </div>

        {/* Blood Pressure */}
        <div style={{ borderRadius: 14, padding: '10px 8px 8px', background: 'white', textAlign: 'center' }}>
          <span style={{ fontSize: 18 }}>🩸</span>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: '#7c3aed', margin: '3px 0 1px' }}>BP</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 12, color: '#111827', margin: 0 }}>
            {telemetry?.bpSystolic || 120}/{telemetry?.bpDiastolic || 80}
          </p>
          <p style={{ fontSize: 8, color: watchStatus.isConnected ? '#16a34a' : '#9ca3af', margin: '1px 0 0', fontWeight: watchStatus.isConnected ? 700 : 500 }}>
            {watchStatus.isConnected ? '🟢 Live Watch' : 'mmHg'}
          </p>
        </div>

        {/* Sleep */}
        <div style={{ borderRadius: 14, padding: '10px 8px 8px', background: 'white', textAlign: 'center' }}>
          <span style={{ fontSize: 18 }}>🌙</span>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: '#f59e0b', margin: '3px 0 1px' }}>Sleep</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 13.5, color: '#111827', margin: 0 }}>
            8.2h
          </p>
          <p style={{ fontSize: 8, color: '#9ca3af', margin: '1px 0 0' }}>REM 92%</p>
        </div>
      </div>

      {/* Heart Rate Dynamic Trend (Live PPG stream) */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15 }}>💓</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              7-Day Heart Rate & Watch Biometrics
            </p>
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              background: '#ffe4e6',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e11d48' }} />
            {currentHeartRate} bpm (Live)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2 }}>
            {['80', '74', '68'].map((val) => (
              <span key={val} style={{ fontSize: 9, color: '#9ca3af' }}>
                {val}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <TrendCurve data={dynamicHrData} color="#ef4444" height={76} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {DAYS.map((d, i) => (
                <span
                  key={d}
                  style={{
                    fontSize: 9,
                    color: i === DAYS.length - 1 ? '#ef4444' : '#9ca3af',
                    fontWeight: i === DAYS.length - 1 ? 800 : 500,
                  }}
                >
                  {i === DAYS.length - 1 ? 'Now' : d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score Trend */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>📈</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Overall Score Trend
            </p>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              background: '#dcfce7',
              color: '#059669',
            }}
          >
            +5% Improved
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2 }}>
            {['92', '87', '82'].map((val) => (
              <span key={val} style={{ fontSize: 9, color: '#9ca3af' }}>
                {val}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <TrendCurve data={SCORE_DATA} color="#10b981" height={76} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {DAYS.map((d) => (
                <span key={d} style={{ fontSize: 9, color: '#9ca3af' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vital Readings Log (Collapsible Option - Hidden by default until clicked) */}
      <div style={{ margin: '0 12px 14px', borderRadius: 20, padding: '14px 16px', background: 'white', border: '1px solid #f1f5f9' }}>
        <div
          onClick={() => setShowVitalReadings((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>
                  Recent Vital Readings
                </p>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: '#ede9fe',
                    color: '#7c3aed',
                  }}
                >
                  {readings.length}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>
                {showVitalReadings ? 'Tap to collapse' : 'Logged manually or synced from smart watch'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddModalOpen(true);
              }}
              style={{
                background: '#372545',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '6px 11px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>+</span>
              <span>Add</span>
            </button>

            <span
              style={{
                background: showVitalReadings ? '#ede9fe' : '#f1f5f9',
                color: showVitalReadings ? '#7c3aed' : '#475569',
                borderRadius: 10,
                padding: '6px 10px',
                fontSize: 10.5,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {showVitalReadings ? 'Hide ▲' : 'Show ▼'}
            </span>
          </div>
        </div>

        {showVitalReadings && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            {readings.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                No vitals logged yet. Tap &quot;+ Add&quot; or sync from your smart watch.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {readings.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '12px 14px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>
                          {r.source === 'smart_watch' ? '⌚' : '📝'}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
                          {r.dateStr}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 8,
                          background: r.source === 'smart_watch' ? '#ede9fe' : '#e2e8f0',
                          color: r.source === 'smart_watch' ? '#7c3aed' : '#475569',
                        }}
                      >
                        {r.source === 'smart_watch' ? (r.deviceModel || 'Smart Watch') : 'Manual Entry'}
                      </span>
                    </div>

                    {/* Metrics pill row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: r.notes ? 6 : 0 }}>
                      {r.bpSystolic && r.bpDiastolic && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#334155' }}>
                          BP: <strong>{r.bpSystolic}/{r.bpDiastolic}</strong> mmHg
                        </span>
                      )}
                      {r.heartRate && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#be123c' }}>
                          HR: <strong>{r.heartRate}</strong> bpm
                        </span>
                      )}
                      {r.spo2 && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#1d4ed8' }}>
                          SpO2: <strong>{r.spo2}%</strong>
                        </span>
                      )}
                      {r.temperature && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#047857' }}>
                          Temp: <strong>{r.temperature}°C</strong>
                        </span>
                      )}
                      {r.bloodSugar && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#b45309' }}>
                          Sugar: <strong>{r.bloodSugar}</strong> mg/dL
                        </span>
                      )}
                      {r.weight && (
                        <span style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>
                          Weight: <strong>{r.weight}</strong> kg
                        </span>
                      )}
                    </div>

                    {r.notes && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sleep Quality */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🌙</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Sleep Quality (hrs/night)
            </p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>avg 8.0 hrs</span>
        </div>
        <TrendCurve data={SLEEP_DATA} color="#7c3aed" height={60} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {DAYS.map((d) => (
            <span key={d} style={{ fontSize: 9, color: '#9ca3af' }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Mood & Positivity */}
      <div style={{ margin: '0 12px 10px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>😊</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Mood & Positivity (%)
            </p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>97% positive</span>
        </div>
        <TrendCurve data={MOOD_DATA} color="#f59e0b" height={60} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {DAYS.map((d) => (
            <span key={d} style={{ fontSize: 9, color: '#9ca3af' }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Medication Adherence */}
      <div style={{ margin: '0 12px 16px', borderRadius: 20, padding: '14px 16px', background: 'white' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
          💊 Medication Adherence
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: 33,
              border: '3px solid #10b981',
              background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: '#059669',
              }}
            >
              100%
            </span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
              Perfect Adherence
            </p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 4px' }}>
              All 4 medications taken on time this week
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
              🏆 143-day streak!
            </span>
          </div>
        </div>
      </div>

      {/* Add Reading Full Modal (Matching the uploaded image.png screenshot exactly) */}
      <AddReadingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveReading={handleSaveReading}
        watchTelemetry={telemetry}
        watchConnected={watchStatus.isConnected}
        watchName={watchStatus.deviceName}
      />
    </div>
  );
}
