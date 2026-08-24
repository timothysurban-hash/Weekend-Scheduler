import React, { useRef, useState } from 'react';
import { AppSettings, Speaker, SpiritualStatus } from '../types';
import { DEMO_SPEAKERS } from '../constants';
import { getDefaultQualificationsForStatus } from '../utils/dateUtils';
import { scheduleRepository } from '../services/scheduleRepository';
import { showToast } from './ui/Toast';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';
import { CustomSelect } from './ui/CustomSelect';
import { Save, Info, HardDrive, Download, Upload } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  saveSettings: (s: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, saveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSettings(localSettings);
    setSaved(true);
    showToast("Settings saved successfully!", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemeChange = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    showToast(`Switched to ${mode === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setProcessing(true);
    try {
      const lines = bulkText.split('\n');
      const parsedSpeakers: Speaker[] = [];

      lines.forEach((line) => {
        let trimmed = line.trim();
        if (!trimmed) return;
        if (/^group\s*\d+/i.test(trimmed)) return;

        trimmed = trimmed.replace(/^[\*\-\d\.]+\s*/, '').replace(/\*\*/g, '').trim();
        if (!trimmed) return;

        let status: SpiritualStatus = 'publisher';
        const lower = trimmed.toLowerCase();

        if (lower.includes('(group overseer)') || lower.includes('(elder)')) {
          status = 'elder';
        } else if (lower.includes('(assistant group overseer)') || lower.includes('(ms)')) {
          status = lower.includes('(ms)') ? 'ms' : 'elder';
        } else if (lower.includes('(up)')) {
          status = 'up';
        }

        const cleanName = trimmed.replace(/\s*\([^)]*\)/g, '').trim();
        if (!cleanName) return;

        parsedSpeakers.push({
          id: Math.random().toString(36).substr(2, 9),
          name: cleanName,
          congregation: localSettings.congregationName || settings.congregationName || 'Green Heights',
          isGuest: false,
          unavailableDates: [],
          lastAssigned: null,
          sortOrder: parsedSpeakers.length,
          spiritualStatus: status,
          qualifications: getDefaultQualificationsForStatus(status)
        });
      });

      if (parsedSpeakers.length === 0) {
        showToast("No valid brothers found in pasted text.", "error");
        return;
      }

      await scheduleRepository.saveSpeakers(parsedSpeakers);
      showToast(`Successfully imported ${parsedSpeakers.length} brothers! Reloading...`, "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      showToast("Error parsing bulk text list.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleClearAllSpeakers = async () => {
    if (!window.confirm("Are you sure you want to clear all brothers from your roster?")) return;
    setProcessing(true);
    try {
      await scheduleRepository.saveSpeakers([]);
      showToast("Cleared all brothers from roster. Reloading...", "info");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      showToast("Failed to clear brother roster.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadDemoSpeakers = async () => {
    setProcessing(true);
    try {
      await scheduleRepository.saveSpeakers(DEMO_SPEAKERS);
      showToast("Loaded sample 28 brothers roster! Reloading...", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      showToast("Failed to load sample brother roster.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadBackup = async () => {
    setProcessing(true);
    try {
        const backup = await scheduleRepository.createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scheduler_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        const scheduleCount = backup.data.assignments.length;
        const speakerCount = backup.data.speakers.length;
        const roleCount = backup.data.roles.length;
        showToast(`Backup downloaded! Includes ${scheduleCount} schedules, ${speakerCount} brothers, ${roleCount} roles & settings.`, "success");
    } catch (e) {
        console.error("Backup failed", e);
        showToast("Failed to create backup.", "error");
    } finally {
        setProcessing(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const result = event.target?.result;
            if (typeof result !== 'string') throw new Error("File read error");
            
            const json = JSON.parse(result);
            const res = await scheduleRepository.restoreBackup(json);
            if (res.success && res.counts) {
                const { assignments, speakers, roles, hasAuthorityRoles } = res.counts;
                const authMsg = hasAuthorityRoles ? "Authority Roles Set" : "No Authority Roles";
                showToast(`Restored: ${assignments} Schedules, ${speakers} Brothers, ${roles} Roles (${authMsg}). Reloading...`, "success");
                setTimeout(() => window.location.reload(), 1800);
            } else {
                showToast("Failed to restore backup. Invalid file format.", "error");
            }
        } catch (err) {
            console.error("Import error:", err);
            showToast("Error parsing backup JSON file.", "error");
        } finally {
            setProcessing(false);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Title with Inline Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 rounded-3xl shadow-xs">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Configure congregation details, theme preference, and manage data.</p>
        </div>
        <Button onClick={handleSave} className="px-6 py-3 rounded-full font-extrabold shadow-md shrink-0 bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 hover:scale-[1.02] active:scale-95 border border-zinc-800 dark:border-zinc-200 transition-all">
          <Save className="w-4 h-4 mr-2" />
          {saved ? 'Settings Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Responsive 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols) - General Config & Logic */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-extrabold text-slate-900 dark:text-white">
                <Icon name="domain" className="text-xl mr-2 text-slate-700 dark:text-slate-300" />
                General Configuration
              </CardTitle>
              <CardDescription>Congregation headers and print schedule settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Congregation & Header Details</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Congregation Name</label>
                    <Input 
                      type="text"
                      value={localSettings.congregationName}
                      onChange={(e) => setLocalSettings({...localSettings, congregationName: e.target.value})}
                      placeholder="e.g. GREEN HEIGHTS"
                      className="bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-semibold border-slate-200/90 dark:border-zinc-700/80"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Location / City</label>
                    <Input 
                      type="text"
                      value={localSettings.locationName || ''}
                      onChange={(e) => setLocalSettings({...localSettings, locationName: e.target.value})}
                      placeholder="e.g. TAYABAS CITY"
                      className="bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-semibold border-slate-200/90 dark:border-zinc-700/80"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Meeting Day & Time</label>
                    <Input 
                      type="text"
                      value={localSettings.meetingTime || ''}
                      onChange={(e) => setLocalSettings({...localSettings, meetingTime: e.target.value})}
                      placeholder="e.g. SUNDAY 3:00 P.M."
                      className="bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-semibold border-slate-200/90 dark:border-zinc-700/80"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Print Schedule Role Labels</label>
                  <CustomSelect
                    options={[
                      { value: 'both', label: 'Both Tagalog & English (e.g. Konduktor ng Bantayan / Watchtower Conductor)' },
                      { value: 'tagalog', label: 'Tagalog Only (e.g. Konduktor ng Bantayan, Tagabasa ng Parapo)' },
                      { value: 'english', label: 'English Only (e.g. Watchtower Conductor, Paragraph Reader)' }
                    ]}
                    value={localSettings.languageMode || 'both'}
                    onChange={(val) => setLocalSettings({...localSettings, languageMode: val})}
                    buttonClassName="rounded-xl py-2.5 text-xs font-semibold bg-white dark:bg-zinc-800 border-slate-200/90 dark:border-zinc-700/80"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Scheduling Logic</label>
                <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Outline Rotation Cooldown</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-200/80 dark:bg-zinc-700 px-3 py-1 rounded-full border border-slate-300 dark:border-zinc-600">{localSettings.cooldownMonths} Months</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="24"
                    value={localSettings.cooldownMonths}
                    onChange={(e) => setLocalSettings({...localSettings, cooldownMonths: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Minimum time before an outline can be automatically reused.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) - Theme, Storage Info & Backup */}
        <div className="space-y-6">
          {/* Appearance & Theme Card */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-extrabold text-slate-900 dark:text-white">
                <Icon name="light_mode" className="text-xl mr-2 text-slate-700 dark:text-slate-300" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>Select preferred interface mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center justify-center py-3 px-4 rounded-2xl border transition-all cursor-pointer text-xs font-extrabold ${
                    themeMode === 'light' 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs scale-[1.02]' 
                      : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon name="light_mode" className="text-lg mr-2 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center justify-center py-3 px-4 rounded-2xl border transition-all cursor-pointer text-xs font-extrabold ${
                    themeMode === 'dark' 
                      ? 'border-white bg-white text-zinc-950 shadow-xs scale-[1.02]' 
                      : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon name="dark_mode" className="text-lg mr-2 text-slate-900 dark:text-slate-100" />
                  <span>Dark</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Storage Info Badge */}
          <div className="bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/60 rounded-3xl p-4 flex items-start text-slate-800 dark:text-slate-200 shadow-xs">
            <div className="bg-slate-200 dark:bg-zinc-700 p-2 rounded-2xl mr-3 text-slate-900 dark:text-white shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Device Storage</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                Saved automatically to IndexedDB. Use Backup & Transfer to move data between devices.
              </p>
            </div>
          </div>

          {/* Backup & Transfer */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-extrabold text-slate-900 dark:text-white">
                <HardDrive className="w-5 h-5 mr-2 text-slate-700 dark:text-slate-300" />
                Backup & Transfer
              </CardTitle>
              <CardDescription>Export or import schedule data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline"
                onClick={handleDownloadBackup}
                disabled={processing}
                className="w-full justify-start rounded-2xl py-3 text-xs font-extrabold border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-slate-100"
              >
                <Download className="w-4 h-4 mr-2.5 text-slate-700 dark:text-slate-300" />
                {processing ? 'Processing...' : 'Download JSON Backup'}
              </Button>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json,text/plain,application/*"
                className="hidden"
                id="backup-upload"
              />
              <Button 
                variant="outline"
                onClick={handleImportClick}
                disabled={processing}
                className="w-full justify-start rounded-2xl py-3 text-xs font-extrabold border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60"
              >
                <Upload className="w-4 h-4 mr-2.5 text-rose-600 dark:text-rose-400" />
                {processing ? 'Processing...' : 'Restore JSON File'}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Brother Roster Import & Reset */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-extrabold text-slate-900 dark:text-white">
                <Icon name="group" className="text-xl mr-2 text-indigo-600 dark:text-indigo-400" />
                Dynamic Roster Manager
              </CardTitle>
              <CardDescription>Paste raw text lists or reset congregation brothers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                rows={4}
                placeholder={`Paste raw brother list here... e.g.\nGroup 1\nSurban, James (Group Overseer)\nDayanan, Jhon Mark\nJaballa, Jaymar (MS)\nYago, Alexis James (UP)`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 text-xs font-mono border rounded-2xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={handleBulkImport}
                  disabled={!bulkText.trim() || processing}
                  className="flex-1 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Import Pasted List
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearAllSpeakers}
                  disabled={processing}
                  className="rounded-2xl text-xs font-bold border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                >
                  Clear All Brothers
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadDemoSpeakers}
                  disabled={processing}
                  className="rounded-2xl text-xs font-bold border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
                >
                  Load Sample Demo Roster
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};