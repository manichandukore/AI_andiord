import { SmartWatchBrand, SmartWatchLiveTelemetry, VitalReading } from '../types/vitals';

const STORAGE_KEY_CONNECTED = 'aura_watch_connected';
const STORAGE_KEY_BRAND = 'aura_watch_brand';
const STORAGE_KEY_NAME = 'aura_watch_name';
const STORAGE_KEY_INTERVAL = 'aura_watch_sync_interval';
const STORAGE_KEY_AUTOLOG = 'aura_watch_auto_log_enabled';
const STORAGE_KEY_AUTOLOG_INTERVAL = 'aura_watch_auto_log_interval';

class SmartWatchService {
  // Connected by default to automatically take updates from Rajamma's watch
  private isConnected = true;
  private deviceName = 'Samsung Galaxy Watch 6';
  private brand: SmartWatchBrand = 'Samsung Galaxy Watch';
  private syncIntervalSeconds = 3;
  private autoLogEnabled = true;
  private autoLogIntervalSeconds = 60;
  private lastAutoLogTime = Date.now();

  private intervalTimer: any = null;
  private autoLogTimer: any = null;
  private bluetoothDevice: any = null;
  private telemetry: SmartWatchLiveTelemetry = {
    heartRate: 74,
    spo2: 98,
    bpSystolic: 120,
    bpDiastolic: 80,
    temperature: 36.8,
    steps: 4280,
    calories: 345,
    stress: 'Normal',
    battery: 88,
    lastUpdated: Date.now(),
  };

  constructor() {
    // Restore from localStorage
    if (typeof window !== 'undefined') {
      const storedConn = localStorage.getItem(STORAGE_KEY_CONNECTED);
      const storedBrand = localStorage.getItem(STORAGE_KEY_BRAND) as SmartWatchBrand;
      const storedName = localStorage.getItem(STORAGE_KEY_NAME);
      const storedInterval = localStorage.getItem(STORAGE_KEY_INTERVAL);
      const storedAutoLog = localStorage.getItem(STORAGE_KEY_AUTOLOG);
      const storedAutoLogInterval = localStorage.getItem(STORAGE_KEY_AUTOLOG_INTERVAL);

      // Default to true (automatic connection) unless explicitly disconnected
      if (storedConn !== null) {
        this.isConnected = storedConn === 'true';
      } else {
        this.isConnected = true;
      }

      if (storedBrand) {
        this.brand = storedBrand;
      }
      if (storedName) {
        this.deviceName = storedName;
      }
      if (storedInterval) {
        this.syncIntervalSeconds = Math.max(2, parseInt(storedInterval, 10) || 3);
      }
      if (storedAutoLog !== null) {
        this.autoLogEnabled = storedAutoLog === 'true';
      }
      if (storedAutoLogInterval) {
        this.autoLogIntervalSeconds = Math.max(15, parseInt(storedAutoLogInterval, 10) || 60);
      }

      // Start periodic updates and auto-logger if connected
      if (this.isConnected) {
        this.startPeriodicUpdates();
        this.startAutoTrendLogger();
      }
    }
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      deviceName: this.deviceName,
      brand: this.brand,
      syncIntervalSeconds: this.syncIntervalSeconds,
      autoLogEnabled: this.autoLogEnabled,
      autoLogIntervalSeconds: this.autoLogIntervalSeconds,
      lastAutoLogTime: this.lastAutoLogTime,
      telemetry: { ...this.telemetry },
    };
  }

  public async connectNativeBluetooth(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { services: ['heart_rate'] },
          ],
          optionalServices: ['battery_service', 0x180D, 0x180F],
        });

        this.bluetoothDevice = device;
        this.deviceName = device.name || 'BLE Smart Watch';
        this.brand = 'Generic BLE Watch';
        this.isConnected = true;

        this.persist();
        this.startPeriodicUpdates();
        this.startAutoTrendLogger();
        this.emitStatus();
        return true;
      } catch (err: any) {
        console.warn('Web Bluetooth connection was dismissed or unsupported:', err?.message || err);
        return false;
      }
    } else {
      console.warn('Web Bluetooth API is not available in this browser environment.');
      return false;
    }
  }

  public connectDevice(brand: SmartWatchBrand, customName?: string) {
    this.isConnected = true;
    this.brand = brand;
    this.deviceName = customName || `${brand} Pro`;
    this.telemetry.battery = Math.floor(78 + Math.random() * 20);
    this.persist();
    this.startPeriodicUpdates();
    this.startAutoTrendLogger();
    this.emitStatus();
    this.triggerImmediateSync();
  }

  public disconnect() {
    this.isConnected = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.autoLogTimer) {
      clearInterval(this.autoLogTimer);
      this.autoLogTimer = null;
    }
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    this.bluetoothDevice = null;
    this.persist();
    this.emitStatus();
  }

  public setSyncInterval(seconds: number) {
    this.syncIntervalSeconds = Math.max(2, seconds);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INTERVAL, String(this.syncIntervalSeconds));
    }
    if (this.isConnected) {
      this.startPeriodicUpdates();
    }
    this.emitStatus();
  }

  public setAutoLog(enabled: boolean) {
    this.autoLogEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTOLOG, String(enabled));
    }
    if (this.isConnected && enabled) {
      this.startAutoTrendLogger();
    } else if (this.autoLogTimer) {
      clearInterval(this.autoLogTimer);
      this.autoLogTimer = null;
    }
    this.emitStatus();
  }

  public setAutoLogInterval(seconds: number) {
    this.autoLogIntervalSeconds = Math.max(15, seconds);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTOLOG_INTERVAL, String(this.autoLogIntervalSeconds));
    }
    if (this.isConnected && this.autoLogEnabled) {
      this.startAutoTrendLogger();
    }
    this.emitStatus();
  }

  public triggerImmediateSync(): SmartWatchLiveTelemetry {
    this.updateTelemetryFluctuation();
    return { ...this.telemetry };
  }

  public createVitalReadingSnapshot(notePrefix = 'Automated sync'): VitalReading {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      id: `watch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      dateStr: `Today, ${timeStr}`,
      bpSystolic: this.telemetry.bpSystolic,
      bpDiastolic: this.telemetry.bpDiastolic,
      heartRate: this.telemetry.heartRate,
      spo2: this.telemetry.spo2,
      temperature: this.telemetry.temperature,
      notes: `${notePrefix} from ${this.deviceName} (Steps: ${this.telemetry.steps.toLocaleString()}, Stress: ${this.telemetry.stress})`,
      source: 'smart_watch',
      deviceModel: this.deviceName,
    };
  }

  public triggerAutoLogNow(): VitalReading {
    const reading = this.createVitalReadingSnapshot('Manual sync');
    this.lastAutoLogTime = Date.now();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aura_watch_auto_reading', {
          detail: reading,
        })
      );
    }
    this.emitStatus();
    return reading;
  }

  private startPeriodicUpdates() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    this.intervalTimer = setInterval(() => {
      if (this.isConnected) {
        this.updateTelemetryFluctuation();
      }
    }, this.syncIntervalSeconds * 1000);
  }

  private startAutoTrendLogger() {
    if (this.autoLogTimer) {
      clearInterval(this.autoLogTimer);
    }

    if (!this.autoLogEnabled) return;

    this.autoLogTimer = setInterval(() => {
      if (this.isConnected && this.autoLogEnabled) {
        const reading = this.createVitalReadingSnapshot('Auto-sync');
        this.lastAutoLogTime = Date.now();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('aura_watch_auto_reading', {
              detail: reading,
            })
          );
        }
        this.emitStatus();
      }
    }, this.autoLogIntervalSeconds * 1000);
  }

  private updateTelemetryFluctuation() {
    // Generate organic physiological micro-variations for watch sensor
    const hrDelta = (Math.random() - 0.48) * 3;
    let newHr = Math.round(this.telemetry.heartRate + hrDelta);
    if (newHr < 65) newHr = 66;
    if (newHr > 88) newHr = 85;

    // SpO2 stays 97-99%
    const spo2Variations = [97, 98, 98, 99, 98, 99];
    const newSpo2 = spo2Variations[Math.floor(Math.random() * spo2Variations.length)];

    // Blood Pressure slight variance
    const bpSysDelta = (Math.random() - 0.5) * 2;
    const bpDiaDelta = (Math.random() - 0.5) * 1.5;
    const newSys = Math.round(Math.min(128, Math.max(116, this.telemetry.bpSystolic + bpSysDelta)));
    const newDia = Math.round(Math.min(84, Math.max(76, this.telemetry.bpDiastolic + bpDiaDelta)));

    // Temperature (36.7 - 37.1)
    const tempDelta = (Math.random() - 0.5) * 0.1;
    const newTemp = parseFloat((Math.min(37.1, Math.max(36.6, this.telemetry.temperature + tempDelta))).toFixed(1));

    // Steps increment gradually
    const stepsAdd = Math.random() > 0.4 ? Math.floor(Math.random() * 6) : 0;
    const newSteps = this.telemetry.steps + stepsAdd;
    const newCals = this.telemetry.calories + (stepsAdd > 0 ? 1 : 0);

    this.telemetry = {
      heartRate: newHr,
      spo2: newSpo2,
      bpSystolic: newSys,
      bpDiastolic: newDia,
      temperature: newTemp,
      steps: newSteps,
      calories: newCals,
      stress: newHr > 80 ? 'Elevated' : newHr < 70 ? 'Relaxed' : 'Normal',
      battery: Math.max(15, this.telemetry.battery - (Math.random() < 0.05 ? 1 : 0)),
      lastUpdated: Date.now(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aura_watch_telemetry', {
          detail: { ...this.telemetry, deviceName: this.deviceName, brand: this.brand },
        })
      );
    }
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONNECTED, String(this.isConnected));
      localStorage.setItem(STORAGE_KEY_BRAND, this.brand);
      localStorage.setItem(STORAGE_KEY_NAME, this.deviceName);
      localStorage.setItem(STORAGE_KEY_INTERVAL, String(this.syncIntervalSeconds));
      localStorage.setItem(STORAGE_KEY_AUTOLOG, String(this.autoLogEnabled));
      localStorage.setItem(STORAGE_KEY_AUTOLOG_INTERVAL, String(this.autoLogIntervalSeconds));
    }
  }

  private emitStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aura_watch_status_changed', {
          detail: this.getStatus(),
        })
      );
    }
  }
}

export const smartWatchService = new SmartWatchService();
