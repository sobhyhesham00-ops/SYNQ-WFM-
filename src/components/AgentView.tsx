import React, { useState } from 'react';
import { ScheduleGrid } from './ScheduleGrid';
import { MOCK_AGENTS, generateDatesForWeek } from '../data';
import { Calendar, RefreshCw } from 'lucide-react';
import { cn } from './Header';
import { wsClient } from '../lib/wsClient';
import toast from 'react-hot-toast';
import { useSchedule } from '../contexts/ScheduleContext';

interface AgentViewProps {
  currentUserId: string;
}

export function AgentView({ currentUserId }: AgentViewProps) {
  const dates = generateDatesForWeek();
  const [activeTab, setActiveTab] = useState<'schedule' | 'requests'>('schedule');
  const { agents, shifts } = useSchedule();
  const [viewMode, setViewMode] = useState<'shifts' | 'breaks' | 'lunch'>('shifts');

  const [swapTarget, setSwapTarget] = useState('');
  
  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTarget) return;

    // Simulate sending a request to the target agent
    wsClient.emit('notification', {
      targetUserId: swapTarget,
      message: `${MOCK_AGENTS.find(a => a.id === currentUserId)?.name} has requested a shift swap with you.`,
      type: 'info'
    });
    
    // Also simulate that the target agent immediately accepts for demonstration purposes
    setTimeout(() => {
      wsClient.emit('notification', {
        targetUserId: currentUserId,
        message: `${MOCK_AGENTS.find(a => a.id === swapTarget)?.name} accepted your shift swap request! It's now pending TL approval.`,
        type: 'success'
      });
    }, 2500);

    toast.success('Swap request submitted to agent!');
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Leave request submitted to TL');
  };

  // Filter out other agents and only show the logged-in agent to focus on "My Schedule" or show the team calendar
  return (
    <div className="flex flex-col h-full space-y-4 select-none font-sans bg-[#faf9fe]/10">
      
      {/* Page Title & Tabs Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800">My Schedule</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track your shift calendar, coordinate swaps, and request leave.</p>
        </div>
        
        <div className="flex space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md flex items-center transition-all",
              activeTab === 'schedule' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md flex items-center transition-all",
              activeTab === 'requests' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
            Request Center
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="flex-1 flex flex-col space-y-3">
          {/* Shifts / Breaks / Lunch Segmented Control */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/40 self-start">
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

          <ScheduleGrid 
            dates={dates}
            agents={agents}
            shifts={shifts}
            isEditable={false}
            viewMode={viewMode}
          />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-base font-bold text-slate-800 mb-1">Submit a Schedule Request</h2>
            <p className="text-xs text-slate-400 mb-6">Manage your schedule changes. Leave and swap requests will be sent to the Team Leader for approval.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Shift Swap Form */}
              <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/20 shadow-sm">
                <h3 className="font-bold text-xs text-slate-800 flex items-center mb-4 uppercase tracking-wider">
                  <RefreshCw className="w-4 h-4 mr-2 text-indigo-500" />
                  Shift Swap Request
                </h3>
                <form className="space-y-4" onSubmit={handleSwapSubmit}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">My Shift</label>
                    <select className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg shadow-sm sm:text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-medium text-slate-700">
                      <option>Select a shift to swap...</option>
                      {shifts.filter(s => s.agentId === currentUserId).map(shift => (
                        <option key={shift.id}>{shift.date} ({shift.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Target Agent</label>
                    <select 
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg shadow-sm sm:text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-medium text-slate-700"
                      value={swapTarget}
                      onChange={(e) => setSwapTarget(e.target.value)}
                    >
                      <option value="">Select an agent...</option>
                      {agents.filter(a => a.id !== currentUserId).map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:brightness-110 text-white py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98]">
                    Submit Swap Request
                  </button>
                </form>
              </div>

              {/* Annual Leave Form */}
              <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/20 shadow-sm">
                <h3 className="font-bold text-xs text-slate-800 flex items-center mb-4 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                  Annual Leave Request
                </h3>
                <form className="space-y-4" onSubmit={handleLeaveSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Start Date</label>
                      <input type="date" className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg shadow-sm sm:text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-medium text-slate-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">End Date</label>
                      <input type="date" className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg shadow-sm sm:text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-medium text-slate-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reason (Optional)</label>
                    <textarea rows={2} className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg shadow-sm sm:text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-medium text-slate-700" placeholder="E.g., Doctor appointment..."></textarea>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:brightness-110 text-white py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98]">
                    Submit Leave Request
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
