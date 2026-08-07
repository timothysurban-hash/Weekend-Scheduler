import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { Icon } from './ui/Icon';

interface NavbarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const navItems = [
    { id: 'schedule', label: 'Dashboard', icon: 'grid_view' },
    { id: 'speakers', label: 'Brothers', icon: 'group' },
    { id: 'roles', label: 'Role Rules', icon: 'verified_user' },
    { id: 'outlines', label: 'Outlines', icon: 'menu_book' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Desktop Dark Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-20 lg:w-64 bg-[#18181b] text-white h-full p-5 z-20 relative select-none">
        <div>
          {/* Top Logo & App Squircle Badge */}
          <div className="flex items-center gap-3.5 mb-10 px-1">
            <div className="w-12 h-12 rounded-2xl bg-[#fef9c3] text-zinc-950 flex items-center justify-center font-black shadow-md shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Icon name="calendar_today" className="text-2xl text-zinc-950" />
            </div>
            <div className="hidden lg:block">
              <h2 className="font-extrabold text-base text-white leading-tight tracking-tight">Congregation</h2>
              <p className="text-[11px] font-medium text-zinc-400">Scheduler Dashboard</p>
            </div>
          </div>

          <div className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3.5 px-3.5 hidden lg:block">Menu</div>
          
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as ViewState)}
                  className={`w-full flex items-center px-4 h-12 text-base rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 hover:scale-[1.01] ${
                    isActive 
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-black shadow-md' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40 font-bold'
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 mr-3.5">
                    <Icon name={item.icon} className={`text-2xl ${isActive ? 'text-zinc-950 dark:text-white' : 'text-zinc-400'}`} />
                  </div>
                  <span className="hidden lg:inline tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Toggle & Bottom Actions */}
        <div className="pt-4 border-t border-zinc-800/60">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-800 active:scale-95"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="flex items-center gap-3">
              {isDark ? <Icon name="light_mode" className="text-xl text-amber-400" /> : <Icon name="dark_mode" className="text-xl text-indigo-400" />}
              <span className="hidden lg:inline text-xs font-semibold">{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <span className="hidden lg:inline text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono">{isDark ? 'LIGHT' : 'DARK'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18181b] border-t border-zinc-800 z-50 px-4 py-2 text-white shadow-xl">
        <div className="flex justify-between items-center relative">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as ViewState)}
                  aria-label={`Navigate to ${item.label}`}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90
                    ${isActive ? 'text-white font-bold scale-105' : 'text-zinc-400'}`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-white/10' : 'bg-transparent'}`}>
                    <Icon name={item.icon} className="text-xl" />
                  </div>
                  <span className={`text-[10px] font-medium mt-0.5 transition-all duration-200 ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white cursor-pointer active:scale-90"
            >
              <div className="p-1.5 rounded-xl bg-transparent">
                {isDark ? <Icon name="light_mode" className="text-xl text-amber-400" /> : <Icon name="dark_mode" className="text-xl text-indigo-400" />}
              </div>
              <span className="text-[10px] font-medium mt-0.5 opacity-70">
                Mode
              </span>
            </button>
        </div>
      </nav>
    </>
  );
};