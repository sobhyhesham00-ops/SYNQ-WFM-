import React, { useState, useRef, DragEvent } from 'react';
import { UploadCloud, FileUp, Loader2, CheckCircle2, X, Link, FileSpreadsheet, Info, BookOpen, AlertCircle, Sparkles, Check, FileDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Agent, Shift } from '../types';
import { useSchedule } from '../contexts/ScheduleContext';
import { cn } from './Header';

interface ScheduleUploaderProps {
  onClose: (uploaded?: boolean) => void;
}

type TabType = 'excel' | 'gsheets' | 'format';

export function ScheduleUploader({ onClose }: ScheduleUploaderProps) {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [parsedData, setParsedData] = useState<{ agents: Agent[], shifts: Shift[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setAgents, setShifts } = useSchedule();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-schedule', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        if (isJson) {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.details || errorData.error || errorMessage;
        } else {
          const text = await response.text().catch(() => '');
          if (text.includes('<!doctype') || text.includes('<html')) {
            errorMessage = 'Server returned an HTML error page instead of JSON. The server might be restarting or experiencing an internal error.';
          } else {
            errorMessage = text || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        const text = await response.text().catch(() => '');
        console.error('Server returned non-JSON response:', text);
        throw new Error('Server returned an invalid non-JSON response (possibly an HTML page or directory listing) instead of the parsed schedule.');
      }

      const data = await response.json();
      
      const newAgents: Agent[] = data.agents.map((a: any, i: number) => ({
        id: `agent-${Date.now()}-${i}`,
        username: a.username,
        name: a.name,
        tier: a.tier || 'Tier 1',
        totalHours: a.totalHours || 40,
        avatarUrl: `https://i.pravatar.cc/150?u=${a.username}`
      }));

      const newShifts: Shift[] = data.shifts.map((s: any, i: number) => {
        const agent = newAgents.find(na => na.username === s.username);
        return {
          id: `shift-${Date.now()}-${i}`,
          agentId: agent ? agent.id : `unknown-${i}`,
          date: s.date,
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '17:00',
          type: s.shiftType || 'Off',
          activities: []
        };
      });

      setParsedData({ agents: newAgents, shifts: newShifts });
      toast.success('File parsed successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to parse schedule file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoogleSheetsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUrl.trim()) {
      toast.error('Please enter a Google Sheets URL.');
      return;
    }

    const sheetIdMatch = googleUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      toast.error('Could not extract spreadsheet ID. Please paste a valid Google Sheets link.');
      return;
    }

    const sheetId = sheetIdMatch[1];
    // Create direct export url as .xlsx
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

    setIsUploading(true);
    toast.loading('Fetching sheet from Google Drive...', { id: 'gsheet-fetch' });

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Could not access Google Sheet. Please check if "Anyone with the link" can view.');
      }

      const blob = await response.blob();
      const file = new File([blob], 'google-sheet.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      toast.success('Google Sheet downloaded! Parsing...', { id: 'gsheet-fetch' });
      await processFile(file);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to access Google Sheets link.', { id: 'gsheet-fetch' });
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      setAgents(parsedData.agents);
      setShifts(parsedData.shifts);
      toast.success('Schedule published to agents!');
      onClose(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D455B1] to-[#4ECBFF] flex items-center justify-center">
              <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                SYNQ WFM Schedule Center
              </h2>
              <p className="text-xs text-gray-400">Import shifts via Excel or Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('excel')}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
              activeTab === 'excel'
                ? "border-[#D455B1] text-white bg-gray-900/40"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Upload Excel File</span>
          </button>
          <button
            onClick={() => setActiveTab('gsheets')}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
              activeTab === 'gsheets'
                ? "border-[#D455B1] text-white bg-gray-900/40"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Link className="w-4 h-4 text-sky-400" />
            <span>Google Sheets Link</span>
          </button>
          <button
            onClick={() => setActiveTab('format')}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
              activeTab === 'format'
                ? "border-[#D455B1] text-white bg-gray-900/40"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <BookOpen className="w-4 h-4 text-pink-400" />
            <span>Required Layout Guide</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-900/30">
          {!parsedData && (
            <>
              {activeTab === 'excel' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start space-x-3">
                    <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300 space-y-1">
                      <p className="font-semibold text-emerald-300">Supported Formats: Excel Workbook (.xlsx, .xls)</p>
                      <p className="text-gray-400">Download your schedule spreadsheet and drop it below. Ensure columns map to agent names and shift details as detailed in the <strong className="text-pink-400 cursor-pointer hover:underline" onClick={() => setActiveTab('format')}>Required Layout Guide</strong>.</p>
                    </div>
                  </div>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                      isDragging ? "border-[#D455B1] bg-pink-500/5" : "border-gray-800 hover:border-gray-700 hover:bg-gray-850",
                      isUploading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                      accept=".xlsx,.xls,.csv"
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-[#D455B1] animate-spin mb-4" />
                        <p className="text-gray-300 font-bold">Parsing Excel Matrix...</p>
                        <p className="text-xs text-gray-500 mt-2">Extracting agents and mapping shift patterns</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 border border-gray-750">
                          <FileUp className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-200 font-bold text-base">Click or drag Excel sheet here</p>
                        <p className="text-xs text-gray-500 mt-1">Supports standard Excel .xlsx & .xls matrices</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'gsheets' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-start space-x-3">
                    <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300 space-y-2">
                      <p className="font-semibold text-sky-300">Publish from Google Sheets instantly</p>
                      <p className="text-gray-400 leading-relaxed">
                        To load a Google Sheet directly:
                      </p>
                      <ul className="list-decimal list-inside space-y-1 pl-1 text-gray-400">
                        <li>Open your spreadsheet in Google Sheets</li>
                        <li>Click <strong className="text-gray-200 font-bold">Share</strong> (top right)</li>
                        <li>Under General Access, change to <strong className="text-[#4ECBFF] font-bold">"Anyone with the link can view"</strong></li>
                        <li>Copy the link from your browser bar and paste it below!</li>
                      </ul>
                    </div>
                  </div>

                  <form onSubmit={handleGoogleSheetsSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Google Sheets Browser Link
                      </label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-4 flex items-center text-gray-500 pointer-events-none">
                            <Link className="w-4 h-4" />
                          </span>
                          <input
                            type="url"
                            required
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            value={googleUrl}
                            onChange={(e) => setGoogleUrl(e.target.value)}
                            className="w-full bg-gray-850 border border-gray-700/80 focus:border-[#D455B1]/80 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#D455B1]/10 transition-all font-semibold"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="bg-gradient-to-r from-[#D455B1] to-[#6c4bf6] text-white text-xs font-bold px-6 rounded-xl transition-all duration-150 hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Import Live</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'format' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300">
                      <p className="font-semibold text-pink-300">Spreadsheet Matrix Rules</p>
                      <p className="text-gray-400 mt-1 leading-relaxed">
                        To correctly align and publish schedules to SYNQ agents, your file or Google Sheet must match this structure precisely.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Visual Spreadsheet Template:</span>
                    </h3>
                    
                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/40 shadow-sm">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-gray-900 border-b border-gray-800">
                          <tr>
                            <th className="p-3 font-semibold text-gray-400">Agent Name (Col A)</th>
                            <th className="p-3 font-semibold text-pink-400 border-l border-gray-850">2026-07-12 (Col B)</th>
                            <th className="p-3 font-semibold text-pink-400 border-l border-gray-850">2026-07-13 (Col C)</th>
                            <th className="p-3 font-semibold text-pink-400 border-l border-gray-850">2026-07-14 (Col D)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850 text-gray-300">
                          <tr className="hover:bg-gray-800/20">
                            <td className="p-3 font-bold bg-gray-900/30">Hesham Sobhy</td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-bold">7 AM to 4 PM</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-bold">7 AM to 4 PM</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-bold">Off</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-800/20">
                            <td className="p-3 font-bold bg-gray-900/30">Amy Tan</td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-bold">1 PM to 10 PM</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-bold">Off</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-bold">1 PM to 10 PM</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-800/20">
                            <td className="p-3 font-bold bg-gray-900/30">Jack Lewis</td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-purple-500/10 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Night</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-orange-500/10 text-orange-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Annual</span>
                            </td>
                            <td className="p-3 border-l border-gray-850">
                              <span className="inline-block bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-bold">10 PM to 7 AM</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 space-y-1.5">
                      <p className="text-xs font-bold text-pink-300 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Automatic Agent Matching</span>
                      </p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Col A rows match against database usernames. E.g. <code className="text-gray-300">Hesham Sobhy</code> or <code className="text-gray-300">h.sobhy</code> maps automatically to Team Leader.
                      </p>
                    </div>

                    <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 space-y-1.5">
                      <p className="text-xs font-bold text-pink-300 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Shift Hour Extraction</span>
                      </p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Use format <code className="text-gray-300">"X AM to Y PM"</code>. System calculates shift durations automatically. Standalone words like <code className="text-gray-300">Off</code>, <code className="text-gray-300">Annual</code>, <code className="text-gray-300">Night</code>, <code className="text-gray-300">Morning</code> are supported.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {parsedData && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 bg-indigo-500/10 text-indigo-400 p-4 rounded-lg border border-indigo-500/20">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium text-xs text-gray-200">
                  Successfully extracted <strong className="text-white">{parsedData.agents.length}</strong> agents and <strong className="text-white">{parsedData.shifts.length}</strong> total shift assignments!
                </span>
              </div>

              <div className="bg-gray-850 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-950/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Parsed Agents Summary</h3>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-gray-400 font-bold font-mono">
                    {parsedData.shifts.length} Entries
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr className="border-b border-gray-850">
                        <th className="px-4 py-2.5 font-semibold text-gray-400">Agent Name</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-400">Mapped Username</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-400 text-right">Shifts Mapped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/20">
                      {parsedData.agents.map(agent => {
                        const agentShifts = parsedData.shifts.filter(s => s.agentId === agent.id);
                        return (
                          <tr key={agent.id} className="hover:bg-gray-800/30">
                            <td className="px-4 py-2.5 font-medium text-gray-200">{agent.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">
                              <span className="bg-gray-950 px-2 py-0.5 rounded text-[#D455B1]">{agent.username}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-200">
                              {agentShifts.length}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-between items-center">
          <button
            onClick={() => setActiveTab('format')}
            className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#D455B1]" />
            <span>Format Guidelines</span>
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={parsedData ? () => setParsedData(null) : onClose}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors rounded-lg bg-transparent hover:bg-gray-800"
            >
              Cancel
            </button>
            
            {parsedData && (
              <button 
                onClick={handleConfirm}
                className="px-5 py-2 bg-gradient-to-r from-[#D455B1] to-[#6c4bf6] hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-lg shadow-pink-500/10 transition-all active:scale-95 flex items-center"
              >
                Confirm & Publish Schedule
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
