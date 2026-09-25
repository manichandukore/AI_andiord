import React, { useState, useEffect } from 'react';
import { smartWatchService } from '../services/smartWatchService';
import { SmartWatchBrand, SmartWatchLiveTelemetry, VitalReading } from '../types/vitals';

interface SmartWatchHubProps {
  onLogReading: (reading: VitalReading) => void;
  onOpenAddReadingModal?: () => void;
}

export function SmartWatchHub({ onLogReading, onOpenAddReadingModal }: SmartWatchHubProps) {
  const [status, setStatus] = useState(() => smartWatchService.getStatus());
  const [telemetry, setTelemetry] = useState<SmartWatchLiveTelemetry>(() => status.telemetry);
  const [showPairModal, setShowPairModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logSuccessNotice, setLogSuccessNotice] = useState(false);
  const [syncInterval, setSyncInterval] = useState(status.syncIntervalSeconds);
  const [selectedBrand, setSelectedBrand] = useState<SmartWatchBrand>(status.brand);
  const [customDeviceName, setCustomDeviceName] = useState(status.deviceName);
  const [bluetoothScanning, setBluetoothScanning] = useState(false);
  const [bluetoothError, setBluetoothError] = useState('');

  useEffect(() => {
    const handleTelemetry = (e: any) => {
      if (e.detail) {
        setTelemetry(e.detail);
      }
    };

    const handleStatusChanged = (e: any) => {
      if (e.detail) {
        setStatus(e.detail);
        setTelemetry(e.detail.telemetry);
        setSyncInterval(e.detail.syncIntervalSeconds);
      }
    };

    window.addEventListener('aura_watch_telemetry', handleTelemetry);
    window.addEventListener('aura_watch_status_changed', handleStatusChanged);

    return () => {
      window.removeEventListener('aura_watch_telemetry', handleTelemetry);
      window.removeEventListener('aura_watch_status_changed', handleStatusChanged);
    };
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    const updated = smartWatchService.triggerImmediateSync();
    setTelemetry(updated);
    // Also trigger instant auto-log snapshot to trends
    const reading = smartWatchService.triggerAutoLogNow();
    onLogReading(reading);
    setLogSuccessNotice(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLogSuccessNotice(false);
    }, 2000);
  };

  const handleQuickAutoConnect = () => {
    smartWatchService.connectDevice('Samsung Galaxy Watch', "Rajamma's Galaxy Watch 6");
    setStatus(smartWatchService.getStatus());
  };

  const handleToggleAutoLog = () => {
    const next = !status.autoLogEnabled;
    smartWatchService.setAutoLog(next);
  };

  const handleConnectBrand = (brand: SmartWatchBrand) => {
    setSelectedBrand(brand);
    smartWatchService.connectDevice(brand, customDeviceName || `${brand} Active`);
    setShowPairModal(false);
  };

  const handleConnectBluetooth = async () => {
    setBluetoothScanning(true);
    setBluetoothError('');
    try {
      const success = await smartWatchService.connectNativeBluetooth();
      if (success) {
        setShowPairModal(false);
      } else {
        setBluetoothError('Web Bluetooth scan cancelled or device not found. You can choose any watch model preset below.');
      }
    } catch (err: any) {
      setBluetoothError('Bluetooth error: ' + (err?.message || 'Failed to connect.'));
    } finally {
      setBluetoothScanning(false);
    }
  };

  const handleDisconnect = () => {
    smartWatchService.disconnect();
    setStatus(smartWatchService.getStatus());
    setShowPairModal(false);
  };

  const handleSnapshotToTrends = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reading: VitalReading = {
      id: `watch_${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr: `Today, ${timeStr}`,
      bpSystolic: telemetry.bpSystolic,
      bpDiastolic: telemetry.bpDiastolic,
      heartRate: telemetry.heartRate,
      spo2: telemetry.spo2,
      temperature: telemetry.temperature,
      notes: `Automated sync from ${status.deviceName} (Steps: ${telemetry.steps}, Stress: ${telemetry.stress})`,
      source: 'smart_watch',
      deviceModel: status.deviceName,
    };

    onLogReading(reading);
    setLogSuccessNotice(true);
    setTimeout(() => setLogSuccessNotice(false), 2500);
  };

  const secondsAgo = Math.max(0, Math.floor((Date.now() - telemetry.lastUpdated) / 1000));

  return (
    <div
      id="smart-watch-hub-card"
      style={{
        margin: '0 12px 14px',
        borderRadius: 20,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: status.isConnected ? 'linear-gradient(135deg, #10b981, #059669)' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 19,
              color: status.isConnected ? '#ffffff' : '#64748b',
              boxShadow: status.isConnected ? '0 4px 10px rgba(16,185,129,0.25)' : 'none',
            }}
          >
            ⌚
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                {status.isConnected ? status.deviceName : 'Smart Watch Disconnected'}
              </h3>
              {status.isConnected && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#16a34a',
                      boxShadow: '0 0 0 2px rgba(22,163,74,0.2)',
                    }}
                  />
                  Live Auto-Update Active
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#64748b' }}>
              {status.isConnected
                ? `Automatic PPG stream every ${syncInterval}s · Last update: ${secondsAgo < 2 ? 'Just now' : `${secondsAgo}s ago`}`
                : 'Auto-stream continuous heart rate, SpO2 & vitals into trends'}
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={() => setShowPairModal(true)}
          style={{
            background: status.isConnected ? '#f8fafc' : '#7c3aed',
            color: status.isConnected ? '#334155' : '#ffffff',
            border: status.isConnected ? '1px solid #cbd5e1' : 'none',
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
          {status.isConnected ? '⚙️ Watch Settings' : '⚡ Connect Watch'}
        </button>
      </div>

      {status.isConnected ? (
        <>
          {/* Live Telemetry Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {/* Heart Rate */}
            <div
              style={{
                borderRadius: 14,
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                border: '1px solid #fecdd3',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#e11d48' }}>HEART RATE</span>
                <span
                  style={{
                    fontSize: 13,
                    animation: 'heartbeat 1s infinite',
                    display: 'inline-block',
                  }}
                >
                  ❤️
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#9f1239',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {telemetry.heartRate}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#be123c' }}>bpm</span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#e11d48', fontWeight: 600 }}>
                {telemetry.heartRate > 80 ? 'Active rate' : telemetry.heartRate < 68 ? 'Resting rate' : 'Normal rhythm'}
              </p>
            </div>

            {/* SpO2 Blood Oxygen */}
            <div
              style={{
                borderRadius: 14,
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8' }}>SpO2 OXYGEN</span>
                <span style={{ fontSize: 13 }}>🫁</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#1e40af',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {telemetry.spo2}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>%</span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#2563eb', fontWeight: 600 }}>
                Optimum Saturation
              </p>
            </div>

            {/* Blood Pressure (Estimate) */}
            <div
              style={{
                borderRadius: 14,
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                border: '1px solid #e9d5ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7e22ce' }}>EST. BP</span>
                <span style={{ fontSize: 13 }}>🩸</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#581c87',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {telemetry.bpSystolic}/{telemetry.bpDiastolic}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#7e22ce', fontWeight: 600 }}>
                mmHg · Stable
              </p>
            </div>
          </div>

          {/* Secondary Telemetry Row: Temp, Steps, Battery */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: 11,
              color: '#475569',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>🌡️</span>
              <span style={{ fontWeight: 600 }}>Temp:</span>
              <strong style={{ color: '#0f172a' }}>{telemetry.temperature}°C</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>👣</span>
              <span style={{ fontWeight: 600 }}>Steps:</span>
              <strong style={{ color: '#0f172a' }}>{telemetry.steps.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>🔋</span>
              <span style={{ fontWeight: 600 }}>Battery:</span>
              <strong style={{ color: telemetry.battery < 20 ? '#dc2626' : '#059669' }}>
                {telemetry.battery}%
              </strong>
            </div>
          </div>

          {/* Auto-Record to Trends Status Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: status.autoLogEnabled ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${status.autoLogEnabled ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: 10,
              padding: '6px 10px',
              marginBottom: 10,
              fontSize: 10.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{status.autoLogEnabled ? '⚡' : '⏸️'}</span>
              <span style={{ color: status.autoLogEnabled ? '#166534' : '#64748b', fontWeight: 600 }}>
                {status.autoLogEnabled
                  ? `Auto-logging vital snapshot to Trends every ${status.autoLogIntervalSeconds}s`
                  : 'Auto-logging to Trends paused'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoLog}
              style={{
                background: status.autoLogEnabled ? '#dcfce7' : '#e2e8f0',
                border: 'none',
                color: status.autoLogEnabled ? '#15803d' : '#475569',
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {status.autoLogEnabled ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Interactive controls */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
                🔄
              </span>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              type="button"
              onClick={handleSnapshotToTrends}
              style={{
                flex: 1.4,
                padding: '8px 10px',
                borderRadius: 10,
                background: '#7c3aed',
                border: 'none',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
              }}
            >
              <span>📥</span>
              Log Watch Vitals
            </button>
          </div>

          {logSuccessNotice && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: 10.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>✅</span>
              Watch readings ({telemetry.heartRate} bpm, SpO2 {telemetry.spo2}%) saved to Trends!
            </div>
          )}
        </>
      ) : (
        /* Disconnected State - Guide to connect */
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
            Pair any smart watch (Apple Watch, Samsung Galaxy Watch, Fitbit, boAt, Noise, Garmin) to stream live heart rate, SpO2, and activity into Rajamma&apos;s wellness trends automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={handleQuickAutoConnect}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
              }}
            >
              <span>⚡</span>
              <span>Connect & Auto-Update from Watch</span>
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowPairModal(true)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>⌚</span>
                Choose Model
              </button>
              {onOpenAddReadingModal && (
                <button
                  type="button"
                  onClick={onOpenAddReadingModal}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span>+</span>
                  Add Manual
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Watch Pairing / Settings Modal */}
      {showPairModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowPairModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 420,
              padding: 20,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>⌚</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Smart Watch Integration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Bluetooth Scan Option */}
            <div
              style={{
                border: '1.5px dashed #8b5cf6',
                borderRadius: 14,
                padding: '14px',
                background: '#faf5ff',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#581c87' }}>
                Native Bluetooth (BLE) Discovery
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 10.5, color: '#6b7280' }}>
                Search for any nearby BLE smart watch or chest strap with standard Heart Rate GATT service.
              </p>
              <button
                type="button"
                onClick={handleConnectBluetooth}
                disabled={bluetoothScanning}
                style={{
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {bluetoothScanning ? '🔍 Scanning Bluetooth...' : '📡 Scan Bluetooth Devices'}
              </button>
              {bluetoothError && (
                <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#b91c1c' }}>
                  {bluetoothError}
                </p>
              )}
            </div>

            {/* Quick 1-Click Watch Presets */}
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#334155' }}>
              Select Watch Model & Brand:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(
                [
                  { brand: 'Samsung Galaxy Watch', label: 'Samsung Galaxy Watch', icon: '⌚' },
                  { brand: 'Apple Watch', label: 'Apple Watch Series', icon: '🍎' },
                  { brand: 'Fitbit', label: 'Fitbit Sense / Charge', icon: '🏃' },
                  { brand: 'Garmin', label: 'Garmin Venu / Forerunner', icon: '🧭' },
                  { brand: 'Noise', label: 'Noise ColorFit', icon: '⚡' },
                  { brand: 'boAt', label: 'boAt Wave / Storm', icon: '⛵' },
                  { brand: 'Amazfit', label: 'Amazfit GTS / GTR', icon: '🔋' },
                  { brand: 'Generic BLE Watch', label: 'Generic BLE Fitness Band', icon: '📡' },
                ] as const
              ).map((w) => {
                const isCurrent = status.isConnected && status.brand === w.brand;
                return (
                  <button
                    key={w.brand}
                    type="button"
                    onClick={() => handleConnectBrand(w.brand)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isCurrent ? '2px solid #10b981' : '1px solid #e2e8f0',
                      background: isCurrent ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{w.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                        {w.label}
                      </p>
                      {isCurrent && (
                        <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>
                          Connected ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom device label */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="custom-watch-name-input"
                style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}
              >
                Custom Watch Name (optional):
              </label>
              <input
                id="custom-watch-name-input"
                type="text"
                value={customDeviceName}
                onChange={(e) => setCustomDeviceName(e.target.value)}
                placeholder="e.g. Amma's Galaxy Watch"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  padding: '8px 12px',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            {/* Auto-Sync Frequency */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="auto-sync-frequency-select"
                style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}
              >
                Auto-Sync Frequency:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { sec: 3, label: '3s (Live)' },
                  { sec: 5, label: '5s (Normal)' },
                  { sec: 15, label: '15s' },
                  { sec: 30, label: '30s (Eco)' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => {
                      setSyncInterval(item.sec);
                      smartWatchService.setSyncInterval(item.sec);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 8,
                      border: syncInterval === item.sec ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: syncInterval === item.sec ? '#ede9fe' : '#ffffff',
                      color: syncInterval === item.sec ? '#6d28d9' : '#475569',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Disconnect or Close */}
            <div style={{ display: 'flex', gap: 8 }}>
              {status.isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    background: '#fee2e2',
                    border: 'none',
                    color: '#b91c1c',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  smartWatchService.connectDevice(selectedBrand, customDeviceName);
                  setShowPairModal(false);
                }}
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: 10,
                  background: '#0f172a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Apply & Start Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for heart pulse animation */}
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          15% { transform: scale(1.22); }
          30% { transform: scale(1); }
          45% { transform: scale(1.18); }
          60% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
