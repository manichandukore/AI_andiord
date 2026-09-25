export interface VitalReading {
  id: string;
  userId?: string;
  timestamp: string; // ISO string
  dateStr: string;   // e.g. "Today, 10:45 AM"
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  bloodSugar?: number;
  height?: number;
  weight?: number;
  notes?: string;
  source?: 'manual' | 'smart_watch';
  deviceModel?: string;
}

export type SmartWatchBrand =
  | 'Apple Watch'
  | 'Samsung Galaxy Watch'
  | 'Fitbit'
  | 'Garmin'
  | 'Noise'
  | 'boAt'
  | 'Amazfit'
  | 'Generic BLE Watch';

export interface SmartWatchLiveTelemetry {
  heartRate: number;
  spo2: number;
  bpSystolic: number;
  bpDiastolic: number;
  temperature: number;
  steps: number;
  calories: number;
  stress: 'Normal' | 'Relaxed' | 'Elevated';
  battery: number;
  lastUpdated: number; // Date.now()
}
