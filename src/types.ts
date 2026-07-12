export type Role = 'AGENT' | 'TEAM_LEADER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatarUrl: string;
}

export type ShiftType = 'Early' | 'Late' | 'Night' | 'Standard' | 'Vacation' | 'Time off' | 'Mid' | 'Available' | 'Off';

export interface Activity {
  id: string;
  type: 'Break' | 'Lunch' | 'Meeting' | 'Training';
  startTime: string; // e.g., '09:00'
  endTime: string;   // e.g., '09:15'
}

export interface Shift {
  id: string;
  agentId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., '07:00'
  endTime: string; // e.g., '15:00'
  type: ShiftType;
  activities: Activity[];
}

export interface Agent {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  tier: string;
  totalHours: number;
}

export interface LeaveRequest {
  id: string;
  agentId: string;
  type: 'leave';
  status: 'pending' | 'approved' | 'rejected';
  dateRequested: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
}

export interface SwapRequest {
  id: string;
  agentId: string;
  type: 'swap';
  status: 'pending' | 'approved' | 'rejected';
  dateRequested: string; // YYYY-MM-DD
  sourceShiftId: string;
  targetShiftId: string;
  targetAgentId: string;
}

export type Request = LeaveRequest | SwapRequest;
