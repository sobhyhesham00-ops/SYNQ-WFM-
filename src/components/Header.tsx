import React, { useState } from 'react';
import { Settings, LogOut, Globe, Bell, HelpCircle, ChevronDown, Check, Sparkles, Sliders, BellOff, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warn';
}

export function Header() {
  const { user, logout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timezoneFormat, setTimezoneFormat] = useState('24h');
  const [autoPublish, setAutoPublish] = useState(true);
  const [aiEngine, setAiEngine] = useState('flash');

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Shift Swap Approved',
      desc: 'Amy Tan\'s swap request approved by Team Leader Hesham Sobhy.',
      time: '12m ago',
      unread: true,
      type: 'success'
    },
    {
      id: '2',
      title: 'Live Sheet Sync Complete',
      desc: 'Master schedule updated successfully via Google Sheets link.',
      time: '1h ago',
      unread: true,
      type: 'info'
    },
    {
      id: '3',
      title: 'Anomaly Flagged',
      desc: 'Mikel Musa has an overlapping shift on Tuesday.',
      time: '3h ago',
      unread: true,
      type: 'warn'
    },
    {
      id: '4',
      title: 'Database Synced',
      desc: 'WFM agent directory and schedule synchronized with server.',
      time: '5h ago',
      unread: false,
      type: 'success'
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const handleTestNotification = () => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      title: 'New WFM Event',
      desc: 'A live schedule update was broadcast to all active agents.',
      time: 'Just now',
      unread: true,
      type: 'info'
    };
    setNotifications(prev => [newNotif, ...prev]);
    toast.success('Simulated dynamic notification trigger!');
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-2.5 z-30 relative select-none font-sans">
      <div className="flex items-center justify-between">
        {/* Left Brand and Navigation */}
        <div className="flex items-center space-x-8">
          {/* Brand Logo matching SYNQ WFM */}
          <div className="flex items-center space-x-1.5 cursor-pointer group">
            {/* Custom high-fidelity message chat bubble icon in pink and baby blue gradient */}
            <div className="relative w-6 h-6 flex items-center justify-center bg-gradient-to-tr from-[#D455B1] to-[#4ECBFF] rounded-full shadow-sm shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-[17px] font-black text-[#D455B1] tracking-wider uppercase font-mono">SYNQ</span>
              <span className="text-[17px] font-extrabold text-[#4ECBFF] tracking-tight font-mono">WFM</span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {[
              { label: 'Forecasts', active: false },
              { label: 'Shift Plans', active: false },
              { label: 'Schedule', active: true },
              { label: 'Real-Time', active: false },
              { label: 'Reports', active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-all duration-150 ${
                  item.active 
                    ? "bg-slate-100 text-slate-900 border border-slate-200/40" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Status / Tools Controls */}
        <div className="flex items-center space-x-4">
          
          {/* Location / Timezone Indicator (Changed to Egypt Time as requested) */}
          <div 
            onClick={() => toast.success('Egypt Time Standard (EET) is locked for this workspace.')}
            className="hidden sm:flex items-center space-x-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/75 border border-slate-200/40"
          >
            <Globe className="w-4 h-4 text-[#D455B1]" />
            <span className="text-xs font-bold text-slate-700">Egypt Time - EET</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>

          {/* Interactive Utility Icons */}
          <div className="flex items-center space-x-1">
            
            {/* Notifications Bell with unread count */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowSettings(false);
                  setShowProfileDropdown(false);
                }}
                className={cn(
                  "relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all active:scale-95 focus:outline-none",
                  showNotifications && "bg-slate-100 text-[#D455B1]"
                )}
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center rounded-full animate-pulse shadow-sm shadow-rose-500/30">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100/90 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>Notifications</span>
                        <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      </span>
                      <button 
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-[#D455B1] hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-3 text-left hover:bg-slate-50/80 transition-colors relative",
                            notif.unread && "bg-pink-500/[0.015]"
                          )}
                        >
                          {notif.unread && (
                            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#D455B1]" />
                          )}
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                            {notif.desc}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 block font-medium font-mono">
                            {notif.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="px-3.5 pt-2 border-t border-slate-50 flex space-x-2">
                      <button 
                        onClick={handleTestNotification}
                        className="w-full text-center py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 transition-colors flex items-center justify-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3 text-[#D455B1]" />
                        <span>Trigger Alert</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Settings Gear */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowNotifications(false);
                  setShowProfileDropdown(false);
                }}
                className={cn(
                  "p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all active:scale-95 focus:outline-none",
                  showSettings && "bg-slate-100 text-[#4ECBFF]"
                )}
                title="WFM Settings"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100/90 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-1.5 border-b border-slate-50 pb-2 mb-3">
                      <Sliders className="w-3.5 h-3.5 text-[#4ECBFF]" />
                      <span>Workspace Settings</span>
                    </h3>

                    <div className="space-y-4">
                      {/* Timezone Switcher Display */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Time Display Format
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button 
                            onClick={() => {
                              setTimezoneFormat('24h');
                              toast.success('Set to 24-hour time format');
                            }}
                            className={cn(
                              "py-1 text-[11px] font-bold rounded-md transition-all border",
                              timezoneFormat === '24h' 
                                ? "bg-[#D455B1]/10 text-[#D455B1] border-[#D455B1]/20" 
                                : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-transparent"
                            )}
                          >
                            24h Clock
                          </button>
                          <button 
                            onClick={() => {
                              setTimezoneFormat('12h');
                              toast.success('Set to 12-hour (AM/PM) format');
                            }}
                            className={cn(
                              "py-1 text-[11px] font-bold rounded-md transition-all border",
                              timezoneFormat === '12h' 
                                ? "bg-[#D455B1]/10 text-[#D455B1] border-[#D455B1]/20" 
                                : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-transparent"
                            )}
                          >
                            AM / PM
                          </button>
                        </div>
                      </div>

                      {/* Auto Publish Toggle */}
                      <div className="flex items-center justify-between py-1 border-t border-slate-50 pt-3">
                        <div>
                          <p className="text-[11px] font-bold text-slate-700">Auto-Publish Plan</p>
                          <p className="text-[9px] text-slate-400 font-medium">Verify sheet upon upload</p>
                        </div>
                        <button 
                          onClick={() => {
                            setAutoPublish(!autoPublish);
                            toast.success(`Auto-publish ${!autoPublish ? 'enabled' : 'disabled'}`);
                          }}
                          className={cn(
                            "w-9 h-5 rounded-full transition-all relative flex items-center p-0.5",
                            autoPublish ? "bg-emerald-500" : "bg-slate-200"
                          )}
                        >
                          <span className={cn(
                            "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                            autoPublish ? "translate-x-4" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* AI Parser Choice */}
                      <div className="space-y-1 border-t border-slate-50 pt-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          AI Engine Sensitivity
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button 
                            onClick={() => {
                              setAiEngine('flash');
                              toast.success('Fast-Response parsing engine selected');
                            }}
                            className={cn(
                              "py-1 text-[10px] font-bold rounded-md transition-all border flex items-center justify-center space-x-1",
                              aiEngine === 'flash' 
                                ? "bg-[#4ECBFF]/10 text-[#2AA9E0] border-[#4ECBFF]/20" 
                                : "bg-slate-50 text-slate-500 border-transparent"
                            )}
                          >
                            <Sparkles className="w-3 h-3 shrink-0 text-[#4ECBFF]" />
                            <span>Fast Flash</span>
                          </button>
                          <button 
                            onClick={() => {
                              setAiEngine('pro');
                              toast.success('High-precision Deep Analysis selected');
                            }}
                            className={cn(
                              "py-1 text-[10px] font-bold rounded-md transition-all border flex items-center justify-center space-x-1",
                              aiEngine === 'pro' 
                                ? "bg-[#4ECBFF]/10 text-[#2AA9E0] border-[#4ECBFF]/20" 
                                : "bg-slate-50 text-slate-500 border-transparent"
                            )}
                          >
                            <ShieldAlert className="w-3 h-3 shrink-0 text-[#6C4BF6]" />
                            <span>Ultra Pro</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help / FAQ */}
            <button 
              onClick={() => toast('For WFM help documentation, contact support@synq.com', { icon: '📖' })}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all active:scale-95 focus:outline-none"
              title="Documentation Help"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Profile User Dropdown */}
          {user && (
            <div className="relative">
              <button 
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                  setShowSettings(false);
                }}
                className="flex items-center space-x-2 p-1 pl-2 pr-1 hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-100 transition-all focus:outline-none"
              >
                <img 
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover border border-slate-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showProfileDropdown && (
                <>
                  {/* Backdrop overlay */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-light">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50/70 text-indigo-600 border border-indigo-100/30">
                        {user.role === 'TEAM_LEADER' ? 'Team Leader' : 'Agent'}
                      </span>
                    </div>

                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

