import React from 'react';
import { Agent, Shift } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from './Header';

interface ScheduleGridProps {
  dates: string[];
  agents: Agent[];
  shifts: Shift[];
  isEditable: boolean;
  onShiftClick?: (shift: Shift) => void;
  onEmptyCellClick?: (agentId: string, date: string) => void;
  viewMode?: 'shifts' | 'breaks' | 'lunch';
}

const formatShiftTime = (time: string) => {
  const [hour, min] = time.split(':');
  const h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return min === '00' ? `${h12}${ampm}` : `${h12}:${min}${ampm}`;
};

export const getShiftActivities = (shift: Shift) => {
  if (shift.type === 'Off' || shift.type === 'Vacation' || shift.type === 'Time off') {
    return { breaks: [], lunch: null };
  }
  
  // If activities exist and are not empty, use them
  const breaks = shift.activities?.filter(a => a.type === 'Break') || [];
  const lunch = shift.activities?.find(a => a.type === 'Lunch') || null;
  
  if (breaks.length > 0 || lunch) {
    return { breaks, lunch };
  }
  
  // Otherwise, calculate default ones based on startTime and endTime
  if (!shift.startTime || !shift.endTime) {
    return { breaks: [], lunch: null };
  }
  
  const [startHourStr] = shift.startTime.split(':');
  const startHour = parseInt(startHourStr, 10) || 9;
  
  // 1st break: startHour + 2
  const break1Start = `${String((startHour + 2) % 24).padStart(2, '0')}:30`;
  const break1End = `${String((startHour + 2) % 24).padStart(2, '0')}:45`;
  
  // Lunch: startHour + 4
  const lunchStart = `${String((startHour + 4) % 24).padStart(2, '0')}:00`;
  const lunchEnd = `${String((startHour + 5) % 24).padStart(2, '0')}:00`;
  
  // 2nd break: startHour + 6
  const break2Start = `${String((startHour + 6) % 24).padStart(2, '0')}:15`;
  const break2End = `${String((startHour + 6) % 24).padStart(2, '0')}:30`;
  
  return {
    breaks: [
      { id: 'b1', type: 'Break' as const, startTime: break1Start, endTime: break1End },
      { id: 'b2', type: 'Break' as const, startTime: break2Start, endTime: break2End }
    ],
    lunch: { id: 'l1', type: 'Lunch' as const, startTime: lunchStart, endTime: lunchEnd }
  };
};

const getShiftDetails = (type: string) => {
  switch (type) {
    case 'Early':
      return {
        className: 'border border-rose-100/60 border-l-[3.5px] border-l-rose-500 bg-rose-50/70 text-rose-700',
        label: 'Early'
      };
    case 'Late':
      return {
        className: 'border border-amber-100/60 border-l-[3.5px] border-l-amber-500 bg-amber-50/70 text-amber-700',
        label: 'Late'
      };
    case 'Standard':
      return {
        className: 'border border-teal-100/60 border-l-[3.5px] border-l-teal-500 bg-teal-50/70 text-teal-700',
        label: 'Standard'
      };
    case 'Vacation':
      return {
        className: 'border border-emerald-100/60 border-l-[3.5px] border-l-emerald-500 bg-emerald-50/40 text-emerald-800',
        label: 'Vacation',
        icon: '🌴'
      };
    case 'Time off':
      return {
        className: 'border border-slate-200 border-l-[3.5px] border-l-slate-400 bg-slate-100/80 text-slate-600',
        label: 'Time off',
        icon: '🕒'
      };
    case 'Mid':
      return {
        className: 'border border-yellow-100/60 border-l-[3.5px] border-l-yellow-500 bg-yellow-50/70 text-yellow-800',
        label: 'Mid'
      };
    case 'Available':
      return {
        className: 'border border-dashed border-amber-400/60 bg-white text-slate-800 shadow-sm shadow-amber-500/5',
        label: 'Available',
        icon: '🔔'
      };
    default:
      return {
        className: 'border border-indigo-100/60 border-l-[3.5px] border-l-indigo-500 bg-indigo-50/70 text-indigo-700',
        label: type
      };
  }
};

const getAgentSidebarInfo = (agent: Agent) => {
  const name = agent.name;
  if (name === 'Amy Tan') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-emerald-600 font-medium flex items-center shrink-0">
          ✓ 40h
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 flex items-center shrink-0">
          <span className="mr-1 text-[11px]">🇺🇸</span>
          <span className="text-rose-500 font-semibold">-5h</span>
        </span>
      </div>
    );
  }
  if (name === 'Andrea Edwards') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-emerald-600 font-medium flex items-center shrink-0">
          ✓ 40h
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 flex items-center shrink-0">
          <span className="mr-1 text-[11px]">🇺🇸</span>
          <span className="text-rose-500 font-semibold">-5h</span>
        </span>
      </div>
    );
  }
  if (name === 'Emily Prowse') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-emerald-600 font-medium flex items-center shrink-0">
          ✓ 40h
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 flex items-center shrink-0">
          <span className="mr-1 text-[11px]">🇺🇸</span>
        </span>
      </div>
    );
  }
  if (name === 'Harold Yuen') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-slate-500 flex items-center font-medium shrink-0">
          <svg className="w-3.5 h-3.5 mr-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          -8h
        </span>
      </div>
    );
  }
  if (name === 'Jack Lewis') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-emerald-600 font-semibold flex items-center shrink-0">
          +7h
        </span>
      </div>
    );
  }
  if (name === 'Mikel Musa') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-emerald-600 font-medium flex items-center shrink-0">
          ✓ 34h
        </span>
      </div>
    );
  }
  if (name === 'Vaishvi Chowdhury') {
    return (
      <div className="flex items-center space-x-1 mt-1 text-[11px]">
        <span className="text-slate-500 flex items-center font-medium shrink-0">
          <svg className="w-3.5 h-3.5 mr-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          -20h
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 flex items-center shrink-0">
          <span className="mr-1 text-[11px]">🇨🇦</span>
          <span className="text-rose-500 font-semibold">-8h</span>
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-1 mt-1 text-[11px]">
      <span className="text-emerald-600 font-medium flex items-center shrink-0">
        ✓ {agent.totalHours}h
      </span>
    </div>
  );
};

export function ScheduleGrid({
  dates,
  agents,
  shifts,
  isEditable,
  onShiftClick,
  onEmptyCellClick,
  viewMode = 'shifts'
}: ScheduleGridProps) {
  
  // Group agents by tier
  const groupedAgents = agents.reduce((acc, agent) => {
    const tier = agent.tier || 'Tier 1';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  // Deterministic order: Tier 1 first, then Finance dept., then any others
  const defaultOrder = ['Tier 1', 'Finance dept.'];
  const tiers = Array.from(new Set([...defaultOrder, ...Object.keys(groupedAgents)])).filter(
    (t) => groupedAgents[t] && groupedAgents[t].length > 0
  );

  return (
    <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-150 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="min-w-[1100px]">
        {/* Header Row */}
        <div className="flex border-b border-slate-100 sticky top-0 bg-white z-20">
          
          {/* Top-Left Box */}
          <div className="w-64 shrink-0 border-r border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
            <button className="flex items-center space-x-1 text-[12px] font-bold text-slate-700 hover:text-slate-900 transition-colors">
              <span>Shift coverage</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 text-slate-400">
              <button className="hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button className="hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Days Weekdays Columns */}
          <div className="flex flex-1">
            {dates.map((date, i) => {
              const parsedDate = parseISO(date);
              const isValidDate = isValid(parsedDate);
              const weekday = isValidDate ? format(parsedDate, 'EEE') : 'Day';
              const dayNum = isValidDate ? format(parsedDate, 'd') : '';
              
              // Mon 2 is highlighted red
              const isHighlighted = weekday === 'Mon' || dayNum === '2';

              return (
                <div key={date} className="flex-1 min-w-[120px] border-r border-slate-100 last:border-r-0 p-3 flex flex-col justify-between">
                  {/* Day Date Label */}
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {weekday}
                    </span>
                    <span className={cn(
                      "text-[14px] font-extrabold w-6 h-6 inline-flex items-center justify-center rounded-md mt-0.5 transition-all",
                      isHighlighted ? "bg-rose-600 text-white shadow-sm font-black" : "text-slate-800"
                    )}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Split Dual-Colored Coverage Bar-Chart (from dialpadWFM screenshot) */}
                  <div className="h-10 mt-3 flex items-end justify-center space-x-0.5 px-1">
                    {Array.from({ length: 15 }).map((_, j) => {
                      // Generate beautiful natural wave/sine coverage capacities
                      const wave = Math.sin((j / 15) * Math.PI) * 55 + (i * 5) % 30 + 15;
                      const noise = Math.random() * 15;
                      const heightPercent = Math.min(100, Math.max(20, wave + noise));
                      
                      return (
                        <div 
                          key={j} 
                          className="w-[3px] rounded-t-sm transition-all"
                          style={{ 
                            height: `${heightPercent}%`,
                            backgroundImage: 'linear-gradient(to top, #6c4bf6 50%, #fc7085 50%)'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grouped Agent Rows */}
        <div className="divide-y divide-slate-100">
          {tiers.map((tier) => (
            <React.Fragment key={tier}>
              
              {/* Tier Section Header Bar */}
              <div className="flex bg-slate-50/70 border-b border-t border-slate-100/80 sticky z-10">
                <div className="w-full flex items-center justify-between px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      {tier}
                    </span>
                    <span className="bg-slate-200/60 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {groupedAgents[tier].length}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {/* User group icon */}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Rows inside this tier */}
              <div className="divide-y divide-slate-100">
                {groupedAgents[tier].map((agent) => (
                  <div key={agent.id} className="flex hover:bg-slate-50/40 transition-colors group">
                    
                    {/* Agent details side bar card */}
                    <div className="w-64 shrink-0 border-r border-slate-100 p-3 flex items-center bg-white">
                      <img 
                        src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'} 
                        alt={agent.name} 
                        className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="ml-2.5 min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-slate-800 truncate leading-snug">
                          {agent.name}
                        </div>
                        {getAgentSidebarInfo(agent)}
                      </div>
                    </div>

                    {/* Shifts Grid Columns */}
                    <div className="flex flex-1 bg-slate-50/10">
                      {dates.map((date) => {
                        const dayShifts = shifts.filter((s) => s.agentId === agent.id && s.date === date);

                        return (
                          <div 
                            key={date} 
                            className={cn(
                              "flex-1 min-w-[120px] border-r border-slate-100 last:border-r-0 p-1.5 relative flex flex-col justify-center space-y-1",
                              dayShifts.length === 0 && isEditable && "cursor-pointer hover:bg-indigo-50/20"
                            )}
                            onClick={() => {
                              if (dayShifts.length === 0 && isEditable && onEmptyCellClick) {
                                onEmptyCellClick(agent.id, date);
                              }
                            }}
                          >
                            {dayShifts.map((shift) => {
                              const details = getShiftDetails(shift.type);
                              const { breaks, lunch } = getShiftActivities(shift);

                              if (viewMode === 'breaks') {
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={(e) => {
                                      if (isEditable && onShiftClick) {
                                        e.stopPropagation();
                                        onShiftClick(shift);
                                      }
                                    }}
                                    className={cn(
                                      "rounded-[6px] p-2.5 flex flex-col justify-center relative select-none transition-all text-left",
                                      shift.type === 'Off' || shift.type === 'Vacation'
                                        ? "bg-slate-100/50 text-slate-400 border border-slate-200/60"
                                        : "bg-pink-500/[0.03] text-[#D455B1] border border-pink-200/50 border-l-[3.5px] border-l-[#D455B1]",
                                      isEditable && "cursor-pointer hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                                    )}
                                  >
                                    <div className="text-[9px] font-extrabold uppercase tracking-widest mb-1 text-[#D455B1]">
                                      {shift.type === 'Off' || shift.type === 'Vacation' ? shift.type : 'Breaks'}
                                    </div>
                                    {breaks.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {breaks.map((b, idx) => (
                                          <div key={b.id || idx} className="text-[10px] font-bold font-mono">
                                            {idx + 1}st: {formatShiftTime(b.startTime)} - {formatShiftTime(b.endTime)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] italic font-medium opacity-70">
                                        No breaks
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              if (viewMode === 'lunch') {
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={(e) => {
                                      if (isEditable && onShiftClick) {
                                        e.stopPropagation();
                                        onShiftClick(shift);
                                      }
                                    }}
                                    className={cn(
                                      "rounded-[6px] p-2.5 flex flex-col justify-center relative select-none transition-all text-left",
                                      shift.type === 'Off' || shift.type === 'Vacation'
                                        ? "bg-slate-100/50 text-slate-400 border border-slate-200/60"
                                        : "bg-sky-500/[0.03] text-[#0284c7] border border-sky-200/50 border-l-[3.5px] border-l-[#4ECBFF]",
                                      isEditable && "cursor-pointer hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                                    )}
                                  >
                                    <div className="text-[9px] font-extrabold uppercase tracking-widest mb-1 text-[#4ECBFF]">
                                      {shift.type === 'Off' || shift.type === 'Vacation' ? shift.type : 'Lunch'}
                                    </div>
                                    {lunch ? (
                                      <div className="text-[10px] font-bold font-mono">
                                        {formatShiftTime(lunch.startTime)} - {formatShiftTime(lunch.endTime)}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] italic font-medium opacity-70">
                                        No lunch
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={shift.id}
                                  onClick={(e) => {
                                    if (isEditable && onShiftClick) {
                                      e.stopPropagation();
                                      onShiftClick(shift);
                                    }
                                  }}
                                  className={cn(
                                    "rounded-[6px] p-2 flex flex-col justify-center relative select-none transition-all text-left",
                                    details.className,
                                    isEditable && "cursor-pointer hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                                  )}
                                >
                                  {/* Shift Hours */}
                                  <div className="text-[11px] font-bold tracking-tight">
                                    {formatShiftTime(shift.startTime)} - {formatShiftTime(shift.endTime)}
                                  </div>
                                  
                                  {/* Label and Icon indicators */}
                                  <div className="text-[10px] opacity-90 mt-0.5 font-medium flex items-center justify-between">
                                    <span>{details.label}</span>
                                    {details.icon && (
                                      <span className="text-[11px] shrink-0">{details.icon}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
