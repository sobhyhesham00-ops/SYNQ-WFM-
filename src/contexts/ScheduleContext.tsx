import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Agent, Shift } from '../types';
import { MOCK_AGENTS, MOCK_SHIFTS } from '../data';

interface ScheduleContextType {
  agents: Agent[];
  shifts: Shift[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);

  return (
    <ScheduleContext.Provider value={{ agents, shifts, setAgents, setShifts }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
