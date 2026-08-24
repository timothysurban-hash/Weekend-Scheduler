import { useState, useEffect, lazy, Suspense } from 'react';
import { scheduleRepository } from './services/scheduleRepository';
import { ViewState, Assignment, Speaker, Outline, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { Navbar } from './components/Navbar';
import { ScheduleView } from './components/ScheduleView';
import { ToastContainer } from './components/ui/Toast';

// Lazy-loaded route views for optimal bundle splitting and fast initial paint
const SpeakerList = lazy(() => import('./components/SpeakerList').then(m => ({ default: m.SpeakerList })));
const RoleRulesView = lazy(() => import('./components/RoleRulesView').then(m => ({ default: m.RoleRulesView })));
const OutlineList = lazy(() => import('./components/OutlineList').then(m => ({ default: m.OutlineList })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('schedule');
  const [loading, setLoading] = useState(true);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Initialize theme on boot
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Load Initial Data Async via ScheduleRepository
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await scheduleRepository.loadAll();
        setAssignments(data.assignments);
        setSpeakers(data.speakers);
        setOutlines(data.outlines);
        setSettings(data.settings);
      } catch (error) {
        console.error("Failed to load application data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence Handlers
  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    const freshArray = Array.isArray(newAssignments) ? [...newAssignments] : [];
    setAssignments(freshArray);
    scheduleRepository.saveAssignments(freshArray);
  };

  const handleUpdateSpeakers = (newSpeakers: Speaker[]) => {
    setSpeakers(newSpeakers);
    scheduleRepository.saveSpeakers(newSpeakers);
  };

  const handleUpdateOutlines = (newOutlines: Outline[]) => {
    setOutlines(newOutlines);
    scheduleRepository.saveOutlines(newOutlines);
  };

  const handleRestoreReload = async () => {
    try {
      const data = await scheduleRepository.loadAll();
      setAssignments(data.assignments);
      setSpeakers(data.speakers);
      setOutlines(data.outlines);
      setSettings(data.settings);
    } catch (e) {
      console.error("Failed to reload restored data", e);
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    const previousCongName = settings.congregationName;
    setSettings(newSettings);
    const { updatedSpeakers } = await scheduleRepository.saveSettings(newSettings, previousCongName);
    if (updatedSpeakers) {
      setSpeakers(updatedSpeakers);
    }
  };

  const getViewTitle = () => {
    switch(currentView) {
      case 'schedule': return 'Dashboard';
      case 'speakers': return 'Brother Management';
      case 'roles': return 'Role Rules & Rosters';
      case 'outlines': return 'Outline Library';
      case 'settings': return 'Settings';
      default: return 'Congregation Scheduler';
    }
  };

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-background text-foreground">
              <div className="text-primary font-medium animate-pulse">Loading Schedule...</div>
          </div>
      );
  }

  return (
    <div className="w-screen h-screen bg-[#18181b] overflow-hidden flex p-0 sm:p-2 md:p-3 gap-0 sm:gap-2 md:gap-3 font-sans antialiased text-slate-900 dark:text-slate-100">
      
      {/* Sidebar Navigation */}
      <Navbar currentView={currentView} setView={setCurrentView} />
      
      {/* Main Page Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#14151b] rounded-none sm:rounded-2xl md:rounded-[32px] border-0 sm:border border-slate-200/80 dark:border-zinc-800/80 shadow-xl">
        
        {/* Mobile Header */}
        <header className="md:hidden px-4 py-3.5 bg-white dark:bg-[#14151b] border-b border-slate-100 dark:border-zinc-800/60 flex justify-between items-center text-slate-900 dark:text-white shrink-0">
           <div className="flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-xl bg-[#fef9c3] text-zinc-950 flex items-center justify-center font-black shadow-xs shrink-0">
               <span className="text-base font-black">📅</span>
             </div>
             <h1 className="text-base font-extrabold tracking-tight truncate">{getViewTitle()}</h1>
           </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pb-28 md:pb-8 no-scrollbar bg-slate-50/50 dark:bg-[#111218]">
          <div className="w-full max-w-full">
            <Suspense fallback={
              <div className="flex py-20 items-center justify-center">
                <div className="text-sm font-semibold text-muted-foreground animate-pulse">Loading view...</div>
              </div>
            }>
              <div key={currentView} className="animate-fade-in">
                {currentView === 'schedule' && (
                  <ScheduleView 
                    assignments={assignments}
                    speakers={speakers}
                    outlines={outlines}
                    settings={settings}
                    updateAssignments={handleUpdateAssignments}
                    updateSpeakers={handleUpdateSpeakers}
                  />
                )}
                {currentView === 'speakers' && (
                  <SpeakerList 
                    speakers={speakers}
                    outlines={outlines}
                    updateSpeakers={handleUpdateSpeakers}
                    assignments={assignments}
                    defaultCongregation={settings.congregationName}
                  />
                )}
                {currentView === 'roles' && (
                  <RoleRulesView 
                    speakers={speakers}
                    assignments={assignments}
                    settings={settings}
                    saveSettings={handleUpdateSettings}
                    updateAssignments={handleUpdateAssignments}
                  />
                )}
                {currentView === 'outlines' && (
                  <OutlineList 
                    outlines={outlines}
                    settings={settings}
                    updateOutlines={handleUpdateOutlines}
                    assignments={assignments}
                  />
                )}
                {currentView === 'settings' && (
                  <Settings 
                    settings={settings}
                    saveSettings={handleUpdateSettings}
                    onRestore={handleRestoreReload}
                  />
                )}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;