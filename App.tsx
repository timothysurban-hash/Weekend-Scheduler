import { useState, useEffect } from 'react';
import { DataService } from './services/dataService';
import { ViewState, Assignment, Speaker, Outline, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { Navbar } from './components/Navbar';
import { ScheduleView } from './components/ScheduleView';
import { SpeakerList } from './components/SpeakerList';
import { RoleRulesView } from './components/RoleRulesView';
import { OutlineList } from './components/OutlineList';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ui/Toast';

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

  // Load Initial Data Async
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedAssignments, loadedSpeakers, loadedOutlines, loadedSettings] = await Promise.all([
          DataService.getAssignments(),
          DataService.getSpeakers(),
          DataService.getOutlines(),
          DataService.getSettings()
        ]);

        setAssignments(loadedAssignments);
        setSpeakers(loadedSpeakers);
        setOutlines(loadedOutlines);
        setSettings(loadedSettings);
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
    DataService.saveAssignments(freshArray);
  };

  const handleUpdateSpeakers = (newSpeakers: Speaker[]) => {
    setSpeakers(newSpeakers);
    DataService.saveSpeakers(newSpeakers);
  };

  const handleUpdateOutlines = (newOutlines: Outline[]) => {
    setOutlines(newOutlines);
    DataService.saveOutlines(newOutlines);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    DataService.saveSettings(newSettings);
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
    <div className="w-screen h-screen bg-[#18181b] overflow-hidden flex p-2 md:p-3 gap-3 font-sans antialiased text-slate-900 dark:text-slate-100">
      
      {/* Sidebar Navigation */}
      <Navbar currentView={currentView} setView={setCurrentView} />
      
      {/* Rounded Square Main Page Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#14151b] rounded-[32px] border border-slate-200/80 dark:border-zinc-800/80 shadow-xl">
        
        {/* Mobile Header */}
        <header className="md:hidden px-4 py-4 bg-white dark:bg-[#14151b] border-b border-slate-100 dark:border-zinc-800/60 flex justify-between items-center text-slate-900 dark:text-white">
           <h1 className="text-lg font-bold">{getViewTitle()}</h1>
        </header>

        {/* Scrollable Main Content - Hidden Scrollbar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 no-scrollbar bg-slate-50/50 dark:bg-[#111218]">
          <div className="w-full max-w-full">
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
                />
              )}
            </div>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;