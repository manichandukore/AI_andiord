import React, { useState, useEffect } from 'react';
import { VitalReading, SmartWatchLiveTelemetry } from '../types/vitals';
import { analyzeHealthSymptoms, executeEmergencyWorkflow } from '../utils/emergencyDetection';
import { syncHealthProgress } from '../utils/painDetection';

interface AddReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReading: (reading: VitalReading) => void;
  watchTelemetry?: SmartWatchLiveTelemetry | null;
  watchConnected?: boolean;
  watchName?: string;
}

export function AddReadingModal({
  isOpen,
  onClose,
  onSaveReading,
  watchTelemetry,
  watchConnected,
  watchName,
}: AddReadingModalProps) {
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncingFromWatch, setIsSyncingFromWatch] = useState(false);

  // Auto-populate with live watch telemetry whenever opened
  useEffect(() => {
    if (isOpen && watchConnected && watchTelemetry) {
      setHeartRate(String(watchTelemetry.heartRate));
      setSpo2(String(watchTelemetry.spo2));
      setBpSystolic(String(watchTelemetry.bpSystolic));
      setBpDiastolic(String(watchTelemetry.bpDiastolic));
      setTemperature(String(watchTelemetry.temperature));
    }
  }, [isOpen, watchConnected, watchTelemetry]);

  if (!isOpen) return null;

  const handleFillFromWatch = () => {
    if (!watchTelemetry) return;
    setIsSyncingFromWatch(true);
    setHeartRate(String(watchTelemetry.heartRate));
    setSpo2(String(watchTelemetry.spo2));
    setBpSystolic(String(watchTelemetry.bpSystolic));
    setBpDiastolic(String(watchTelemetry.bpDiastolic));
    setTemperature(String(watchTelemetry.temperature));
    setErrorMsg('');
    setTimeout(() => setIsSyncingFromWatch(false), 500);
  };

  const handleSave = () => {
    const sys = bpSystolic ? parseFloat(bpSystolic) : undefined;
    const dia = bpDiastolic ? parseFloat(bpDiastolic) : undefined;
    const hr = heartRate ? parseFloat(heartRate) : undefined;
    const o2 = spo2 ? parseFloat(spo2) : undefined;
    const temp = temperature ? parseFloat(temperature) : undefined;
    const sugar = bloodSugar ? parseFloat(bloodSugar) : undefined;
    const h = height ? parseFloat(height) : undefined;
    const w = weight ? parseFloat(weight) : undefined;

    const hasAnyMetric = [sys, dia, hr, o2, temp, sugar, h, w].some((val) => val !== undefined && !isNaN(val));

    if (!hasAnyMetric && !notes.trim()) {
      setErrorMsg('Please enter at least one vital metric or a clinical note.');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = `Today, ${timeStr}`;

    const newReading: VitalReading = {
      id: `reading_${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      bpSystolic: sys,
      bpDiastolic: dia,
      heartRate: hr,
      spo2: o2,
      temperature: temp,
      bloodSugar: sugar,
      height: h,
      weight: w,
      notes: notes.trim() || undefined,
      source: watchConnected && hr === watchTelemetry?.heartRate ? 'smart_watch' : 'manual',
      deviceModel: watchConnected ? watchName : undefined,
    };

    onSaveReading(newReading);

    // Health monitoring analysis: evaluate vital readings and any reported symptoms
    const symptomAnalysis = analyzeHealthSymptoms(notes.trim(), undefined, {
      hr,
      bpSys: sys,
      bpDia: dia,
      spo2: o2,
      glucose: sugar,
    });

    if (symptomAnalysis.hasSymptom) {
      syncHealthProgress(
        symptomAnalysis.primaryBodyPart,
        'active',
        notes.trim() || `Health vitals: HR ${hr || '--'} bpm, BP ${sys || '--'}/${dia || '--'} mmHg`
      );
      for (const sec of symptomAnalysis.secondaryBodyParts) {
        syncHealthProgress(
          sec,
          'active',
          notes.trim() || `Health vitals: HR ${hr || '--'} bpm, BP ${sys || '--'}/${dia || '--'} mmHg`
        );
      }
      if (symptomAnalysis.isEmergency) {
        executeEmergencyWorkflow(symptomAnalysis);
      }
    }

    onClose();
  };

  return (
    <div
      id="modal-add-reading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px 12px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
          }}
          aria-label="Back"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Add Reading
        </h1>
      </div>

      {/* Scrollable Form Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 540,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Subtitle */}
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 13,
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          Enter at least one vital metric
        </p>

        {/* Watch Auto-Sync Prompt if connected */}
        {watchConnected && watchTelemetry && (
          <div
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
              border: '1px solid #d8b4fe',
              borderRadius: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⌚</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#581c87' }}>
                  {watchName || 'Smart Watch'} Connected
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 10.5, color: '#7e22ce' }}>
                  Live HR: {watchTelemetry.heartRate} bpm · SpO2: {watchTelemetry.spo2}% · {watchTelemetry.bpSystolic}/{watchTelemetry.bpDiastolic} mmHg
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillFromWatch}
              style={{
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {isSyncingFromWatch ? 'Filled ✓' : '⚡ Auto-Fill'}
            </button>
          </div>
        )}

        {/* 1. BP Systolic */}
        <MetricCard
          label="BP Systolic"
          unit="mmHg"
          placeholder="120"
          value={bpSystolic}
          onChange={setBpSystolic}
        />

        {/* 2. BP Diastolic */}
        <MetricCard
          label="BP Diastolic"
          unit="mmHg"
          placeholder="80"
          value={bpDiastolic}
          onChange={setBpDiastolic}
        />

        {/* 3. Heart Rate */}
        <MetricCard
          label="Heart Rate"
          unit="bpm"
          placeholder="72"
          value={heartRate}
          onChange={setHeartRate}
        />

        {/* 4. SpO2 */}
        <MetricCard
          label="SpO2"
          unit="%"
          placeholder="98"
          value={spo2}
          onChange={setSpo2}
        />

        {/* 5. Temperature */}
        <MetricCard
          label="Temperature"
          unit="°C / °F"
          placeholder="37.0"
          value={temperature}
          onChange={setTemperature}
        />

        {/* 6. Blood Sugar */}
        <MetricCard
          label="Blood Sugar"
          unit="mg/dL"
          placeholder="100"
          value={bloodSugar}
          onChange={setBloodSugar}
        />

        {/* 7. Height */}
        <MetricCard
          label="Height"
          unit="cm"
          placeholder="170"
          value={height}
          onChange={setHeight}
        />

        {/* 8. Weight */}
        <MetricCard
          label="Weight"
          unit="kg"
          placeholder="65"
          value={weight}
          onChange={setWeight}
        />

        {/* Notes Section */}
        <div style={{ marginTop: 6 }}>
          <label
            htmlFor="reading-notes-input"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Notes
          </label>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <textarea
              id="reading-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this reading..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 13,
                color: '#1e293b',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
            />
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Bottom Save Reading Button */}
        <div style={{ marginTop: 10, paddingBottom: 20 }}>
          <button
            id="btn-save-reading"
            type="button"
            onClick={handleSave}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 24,
              background: '#372545', // Exact dark plum/purple from screenshot
              color: '#ffffff',
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(55, 37, 69, 0.25)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Save Reading
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Metric Card matching the exact visual styling from the provided screenshot
function MetricCard({
  label,
  unit,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{unit}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: 84,
            textAlign: 'right',
            border: 'none',
            borderBottom: '1px solid #e2e8f0',
            outline: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: '#1e293b',
            padding: '4px 0',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
