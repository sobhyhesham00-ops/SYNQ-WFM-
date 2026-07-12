import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_USERS } from '../data';
import { User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter your username.');
      return;
    }

    try {
      // Resolve mock user by username or full name
      const cleanInput = username.trim().toLowerCase();
      let matchedUser = MOCK_USERS.find(u => u.username.toLowerCase() === cleanInput);
      
      if (!matchedUser) {
        matchedUser = MOCK_USERS.find(u => u.name.toLowerCase() === cleanInput);
      }
      
      if (!matchedUser && cleanInput.includes('@')) {
        const localPart = cleanInput.split('@')[0];
        matchedUser = MOCK_USERS.find(u => u.username.toLowerCase() === localPart);
      }

      if (matchedUser) {
        login(matchedUser.username);
        toast.success(`Welcome back, ${matchedUser.name}!`);
      } else {
        toast.error('Account not found. Please enter a valid username (e.g., h.sobhy).');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid login attempt');
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 select-none font-sans relative overflow-hidden bg-[#EFF0F9]"
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, #E8D5FF 0%, #F5ECFF 30%, #DFE2FA 70%, #EAF5FC 100%)',
      }}
    >
      {/* GLOWING ABSTRACT COLOR BULBS MATCHING SCREENSHOT 2 */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-[#EA43C2] to-[#B06FF2] opacity-35 blur-[80px] pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#8D65F7] to-[#4ECBFF] opacity-30 blur-[90px] pointer-events-none" />
      <div className="absolute top-12 right-1/3 w-[250px] h-[250px] rounded-full bg-pink-300 opacity-20 blur-[60px] pointer-events-none" />

      {/* FLOATING GLASS SPHERE ART PIECE MATCHING SCREENSHOT 2 */}
      <div className="absolute top-[15%] left-[55%] w-32 h-32 rounded-full pointer-events-none z-10 hidden sm:block">
        <div 
          className="w-full h-full rounded-full relative overflow-hidden shadow-[inset_0_-8px_20px_rgba(255,255,255,0.6),0_15px_30px_rgba(108,75,246,0.15)]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(212,85,177,0.4) 50%, rgba(78,203,255,0.4) 100%)',
            backdropFilter: 'blur(5px)'
          }}
        >
          <div className="absolute top-2 left-4 w-8 h-4 bg-white/60 rounded-full rotate-[-15deg] blur-[1px]" />
          <div className="absolute bottom-2 right-4 w-4 h-4 bg-white/40 rounded-full blur-[2px]" />
        </div>
      </div>

      <div className="w-full max-w-[420px] flex flex-col space-y-4 z-20">
        
        {/* BRANDING HEADER IN UPPERCASE MODERN TYPE */}
        <div className="flex flex-col items-center justify-center space-y-1 mb-2">
          <div className="text-[26px] font-black tracking-[0.2em] text-[#6c4bf6] uppercase font-mono drop-shadow-sm">
            SYNQ WFM
          </div>
          <div className="w-8 h-1 bg-gradient-to-r from-[#D455B1] to-[#6c4bf6] rounded-full" />
        </div>

        {/* MAIN GLASSMORPHISM CARD */}
        <div className="w-full bg-white/70 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(108,75,246,0.12)] border border-white/50 p-8 md:p-10 flex flex-col">
          
          {/* Header text */}
          <div className="mb-6 text-center sm:text-left">
            <h1 className="text-[30px] font-black tracking-tight text-slate-900 leading-tight">
              Welcome Back
            </h1>
            <p className="text-[12px] text-slate-400 mt-1 font-semibold tracking-wide uppercase">
              Sign In
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username / Email field */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Enter username (e.g. h.sobhy)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/60 border border-slate-200/60 focus:border-[#D455B1]/60 rounded-[16px] py-3.5 pl-11 pr-4 text-xs text-slate-800 placeholder-slate-400/80 focus:outline-none focus:ring-4 focus:ring-[#D455B1]/10 transition-all font-semibold shadow-inner"
                />
              </div>
            </div>

            {/* Premium Pink-Magenta Sign In Button */}
            <button
              type="submit"
              className="w-full bg-[#D455B1] hover:bg-[#C2419E] text-white font-extrabold py-3.5 px-6 rounded-full shadow-lg shadow-pink-500/10 text-[13px] tracking-wider transition-all duration-350 active:scale-[0.98] hover:shadow-xl hover:shadow-pink-500/15"
            >
              Sign In
            </button>

          </form>

        </div>

      </div>
    </div>
  );
}
