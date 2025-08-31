export interface Timer {
  id: number;
  label: string;
  type: string;
  duration: number; // minutes
  running: boolean;
  endTime?: number; // timestamp when timer ends
}
