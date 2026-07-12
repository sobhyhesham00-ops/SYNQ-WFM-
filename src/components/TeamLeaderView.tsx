import React, { useState } from 'react';
import { ScheduleGrid } from './ScheduleGrid';
import { MOCK_REQUESTS, generateDatesForWeek } from '../data';
import { Check, X, Bell, FileUp, Filter, Settings, Plus, Layers, ArrowLeftRight, CalendarRange, Clock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Shift, Request, Agent } from '../types';
import { wsClient } from '../lib/wsClient';
import toast from 'react-hot-toast';
import { useSchedule } from '../contexts/ScheduleContext';
import { ScheduleUploader } from './ScheduleUploader';

export function TeamLeaderView() {
  const { agents, shifts, setAgents, setShifts } = useSchedule();
  
  const [selectedBaseDate, setSelectedBaseDate] = useState<Date>(new Date());
  const [dates, setDates] = useState(generateDatesForWeek(selectedBaseDate));
  
  const [requests, setRequests] = useState<Request[]>(MOCK_REQUESTS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'shifts' | 'breaks' | 'lunch'>('shifts');
  
  // Custom Date and Hour Filters
  const [activeHourFilter, setActiveHourFilter] = useState<string>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [publishTrigger, setPublishTrigger] = useState(true);

  React.useEffect(() => {
    // Sync dates when base date changes
    setDates(generateDatesForWeek(selectedBaseDate));
  }, [selectedBaseDate]);

  const handleShiftClick = (shift: Shift) => {
    const types: Shift['type'][] = ['Early', 'Late', 'Mid', 'Standard', 'Vacation', 'Time off', 'Off'];
    const nextType = types[(types.indexOf(shift.type) + 1) % types.length];
    
    setShifts(shifts.map(s => s.id === shift.id ? { ...s, type: nextType } : s));
    setHasChanges(true);
    toast.success(`Updated shift to ${nextType}`, { id: 'shift-update' });
  };

  const handleEmptyCellClick = (agentId: string, date: string) => {
    const newShift: Shift = {
      id: `new-${Date.now()}`,
      agentId,
      date,
      startTime: '09:00',
      endTime: '17:00',
      type: 'Standard',
      activities: []
    };
    setShifts([...shifts, newShift]);
    setHasChanges(true);
    toast.success('Added new shift. Click to toggle types.', { id: 'shift-add' });
  };

  const handleApprove = (req: Request) => {
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    
    // Notify the agent
    wsClient.emit('notification', {
      targetUserId: req.agentId,
      message: `Your ${req.type} request has been approved!`,
      type: 'success'
    });
    
    if (req.type === 'swap') {
      wsClient.emit('notification', {
        targetUserId: req.targetAgentId,
        message: `Shift swap with ${agents.find(a => a.id === req.agentId)?.name} is now approved and official.`,
        type: 'info'
      });
    }

    toast.success('Request approved');
  };

  const handleReject = (req: Request) => {
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    
    wsClient.emit('notification', {
      targetUserId: req.agentId,
      message: `Your ${req.type} request was declined.`,
      type: 'error'
    });

    toast.error('Request rejected');
  };

  const handlePrevWeek = () => {
    const prev = new Date(selectedBaseDate);
    prev.setDate(selectedBaseDate.getDate() - 7);
    setSelectedBaseDate(prev);
    toast.success('Navigated to previous week', { id: 'nav-week' });
  };

  const handleNextWeek = () => {
    const next = new Date(selectedBaseDate);
    next.setDate(selectedBaseDate.getDate() + 7);
    setSelectedBaseDate(next);
    toast.success('Navigated to next week', { id: 'nav-week' });
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const selected = new Date(e.target.value);
      setSelectedBaseDate(selected);
      toast.success(`Week view updated to start on Sunday nearest ${e.target.value}`, { id: 'date-select' });
    }
  };

  const getWeekRangeLabel = () => {
    if (dates.length === 0) return 'Select Week';
    try {
      const firstDate = parseISO(dates[0]);
      const lastDate = parseISO(dates[dates.length - 1]);
      if (isValid(firstDate) && isValid(lastDate)) {
        return `${format(firstDate, 'Sun d')} - ${format(lastDate, 'Sat d MMM yy')}`;
      }
    } catch (e) {
      // ignore
    }
    return 'Select Week';
  };

  const filteredShifts = React.useMemo(() => {
    if (activeHourFilter === 'all') return shifts;
    return shifts.filter(shift => {
      if (shift.type === 'Off' || shift.type === 'Vacation' || shift.type === 'Time off') {
        return false;
      }
      const filterHour = activeHourFilter; // e.g. "09:00"
      return shift.startTime <= filterHour && shift.endTime >= filterHour;
    });
  }, [shifts, activeHourFilter]);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="flex h-full space-x-6 overflow-hidden relative select-none font-sans bg-[#faf9fe]/20">
      {isUploaderOpen && (
        <ScheduleUploader 
          onClose={(isUploaded) => {
            setIsUploaderOpen(false);
            if (isUploaded) {
              if (publishTrigger) {
                toast.success('Schedule uploaded and triggers Auto-Publish live!', { duration: 4000 });
                setHasChanges(false);
              } else {
                toast.success('Schedule uploaded to drafts! Review and click Publish to go live.', { duration: 4000 });
                setHasChanges(true);
              }
            }
          }} 
        />
      )}
      
      {/* Main Schedule Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full space-y-4">
        
        {/* SUBHEADER TOOLBAR MATCHING SCREENSHOT & EXTENDED WITH RICH FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm relative z-30">
          
          {/* Left Controls Group */}
          <div className="flex items-center space-x-3.5">
            {/* Shifts / Breaks / Lunch Segmented Control */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
              <button 
                onClick={() => setViewMode('shifts')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'shifts' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                Shifts
              </button>
              <button 
                onClick={() => setViewMode('breaks')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'breaks' 
                    ? "bg-pink-500 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                Breaks
              </button>
              <button 
                onClick={() => setViewMode('lunch')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'lunch' 
                    ? "bg-sky-500 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                Lunch
              </button>
            </div>

            {/* Date Range Picker Selector & Popover Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`flex items-center space-x-2 bg-white border rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-98 ${
                  isFilterDropdownOpen || activeHourFilter !== 'all'
                    ? "border-[#6c4bf6] text-[#6c4bf6] bg-indigo-50/20"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <CalendarRange className="w-4 h-4 text-indigo-500" />
                <span>{getWeekRangeLabel()}</span>
                {activeHourFilter !== 'all' && (
                  <span className="ml-1 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    @{activeHourFilter}
                  </span>
                )}
              </button>

              {/* Interactive Popover to Filter ANY Date or ANY Time */}
              {isFilterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl border border-slate-100 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-50">
                    <h4 className="text-xs font-bold text-slate-800">Filter Date & Time</h4>
                    <button 
                      onClick={() => setIsFilterDropdownOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Date Picker (Filter Any Date) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Choose Week Start Date
                      </label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={format(selectedBaseDate, 'yyyy-MM-dd')}
                          onChange={handleDateSelect}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#6c4bf6] focus:ring-1 focus:ring-[#6c4bf6]/20"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Select any date to filter the schedule on that week basis.
                      </p>
                    </div>

                    {/* Time Filter (Filter Any Time) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Filter by Active Hour
                      </label>
                      <select 
                        value={activeHourFilter}
                        onChange={(e) => {
                          setActiveHourFilter(e.target.value);
                          toast.success(e.target.value === 'all' ? 'Showing all hours' : `Filtering shifts active at ${e.target.value}`);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#6c4bf6] focus:ring-1 focus:ring-[#6c4bf6]/20"
                      >
                        <option value="all">All Hours (All Day)</option>
                        <option value="08:00">08:00 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM (Noon)</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="19:00">07:00 PM</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Filter shifts, breaks, or lunches active at this exact hour.
                      </p>
                    </div>

                    {/* Reset Button */}
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedBaseDate(new Date());
                          setActiveHourFilter('all');
                          setIsFilterDropdownOpen(false);
                          toast.success('Filters reset to default');
                        }}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold py-1.5 rounded-lg border border-slate-200 transition-all text-center"
                      >
                        Reset All
                      </button>
                      <button
                        onClick={() => setIsFilterDropdownOpen(false)}
                        className="flex-1 bg-indigo-600 hover:brightness-115 text-white text-xs font-semibold py-1.5 rounded-lg shadow-sm transition-all text-center"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* This Week Selector with Arrow Buttons */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3.5">
              <span className="text-xs font-bold text-slate-800">This Week</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                <button 
                  onClick={handlePrevWeek}
                  className="p-1 hover:bg-slate-50 rounded text-slate-500 transition-colors"
                  title="Previous Week"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={handleNextWeek}
                  className="p-1 hover:bg-slate-50 rounded text-slate-500 transition-colors"
                  title="Next Week"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Controls Group */}
          <div className="flex items-center space-x-2">
            {/* Filter button */}
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter</span>
            </button>

            {/* Display button */}
            <button className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg shadow-sm transition-all active:scale-95">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Display</span>
            </button>

            {/* Upload Schedule button (renamed from Tools per user request) */}
            <button 
              onClick={() => setIsUploaderOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-indigo-200 bg-[#6c4bf6]/5 hover:bg-[#6c4bf6]/10 text-xs font-semibold text-indigo-700 rounded-lg shadow-sm transition-all active:scale-95"
              title="Upload Schedule Sheet"
            >
              <FileUp className="w-3.5 h-3.5 text-[#6c4bf6]" />
              <span>Upload Schedule</span>
            </button>

            {/* Add Shifts Slot Button */}
            <button 
              onClick={() => {
                const defaultAgent = agents[0]?.id || 'a1';
                handleEmptyCellClick(defaultAgent, dates[1]); // Add a shift on Mon 2
              }}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Shifts</span>
            </button>

            {/* Auto-Publish Trigger Switch (pink & baby blue styling theme) */}
            <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none shrink-0">
                {publishTrigger ? 'Auto-Publish' : 'Draft Mode'}
              </span>
              <div 
                onClick={() => {
                  const val = !publishTrigger;
                  setPublishTrigger(val);
                  if (val) {
                    toast.success('Auto-Publish ON: uploaded schedules will publish live instantly.', {
                      icon: '⚡',
                      style: { background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8' }
                    });
                  } else {
                    toast('Draft Mode: upload schedules as drafts for review.', {
                      icon: '📝',
                      style: { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }
                    });
                  }
                }}
                className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all relative flex items-center shadow-inner ${
                  publishTrigger 
                    ? "bg-gradient-to-r from-[#D455B1] to-[#4ECBFF] justify-end" 
                    : "bg-slate-200 justify-start"
                }`}
                title="Publish Trigger Switch"
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200"></span>
              </div>
            </div>

            {/* Publish Action Button */}
            <button
              onClick={() => {
                setHasChanges(false);
                toast.success('Schedule published live to all agents!', {
                  icon: '🚀',
                  style: { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }
                });
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 shadow-sm bg-[#6c4bf6] text-white hover:brightness-110 active:scale-95 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Publish</span>
            </button>
          </div>

        </div>

        {/* Master Schedule Grid */}
        <ScheduleGrid 
          dates={dates}
          agents={agents}
          shifts={filteredShifts}
          isEditable={true}
          onShiftClick={handleShiftClick}
          onEmptyCellClick={handleEmptyCellClick}
          viewMode={viewMode}
        />
      </div>

      {/* Pending Requests Sidebar - styled beautiful glassmorphism style */}
      <div className="w-80 shrink-0 flex flex-col h-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Bell className="w-4.5 h-4.5 text-[#6c4bf6]" />
            <h2 className="text-sm font-bold text-slate-800">Pending Requests</h2>
          </div>
          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-rose-500/20">
            {pendingRequests.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {pendingRequests.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-12 font-light">
              No pending schedule requests
            </div>
          ) : (
            pendingRequests.map(req => {
              const agent = agents.find(a => a.id === req.agentId);
              return (
                <div key={req.id} className="bg-slate-50/50 rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 hover:bg-slate-50 transition-all flex flex-col">
                  <div className="flex items-center space-x-2.5 mb-2.5">
                    <img 
                      src={agent?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'} 
                      alt={agent?.name} 
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 leading-snug">{agent?.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center uppercase tracking-wide">
                        {req.type === 'swap' ? (
                          <ArrowLeftRight className="w-3 h-3 text-indigo-500 mr-1 shrink-0" />
                        ) : null}
                        {req.type} request
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-slate-600 mb-3 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed font-medium">
                    {req.type === 'leave' ? (
                      <>
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Requested Leave:</div>
                        <div className="text-slate-800 font-semibold mt-0.5">{req.startDate}</div>
                        {req.reason && <div className="mt-1 text-slate-500 font-light italic">"{req.reason}"</div>}
                      </>
                    ) : (
                      <>
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Swap Partners:</div>
                        <div className="text-slate-800 font-semibold mt-0.5">
                          Target: {agents.find(a => a.id === (req as any).targetAgentId)?.name}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex space-x-2 mt-auto">
                    <button 
                      onClick={() => handleApprove(req)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors text-[11px] font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button 
                      onClick={() => handleReject(req)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 py-1.5 rounded-lg transition-colors text-[11px] font-bold"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
