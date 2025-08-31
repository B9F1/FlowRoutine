export interface Timer {
  id: number;
  label: string;
  type: string;
  duration: number; // minutes
  running: boolean;
  color: string;
  endTime?: number; // timestamp when timer ends
  x?: number;
  y?: number;
}

export interface TimerType {
  name: string;
  color: string;
}

export interface Settings {
  defaultLabel: string;
  timerTypes: TimerType[];
  showFloating: boolean;
  enableNotifications: boolean;
  enableSound: boolean;
  volume: number; // 0-1
}

export interface StatRecord {
  label: string;
  duration: number; // minutes
  timestamp: number; // ms since epoch
}
