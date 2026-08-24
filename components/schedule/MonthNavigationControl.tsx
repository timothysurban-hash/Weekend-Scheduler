import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, CheckSquare, Square } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { ALL_DASHBOARD_ROLES } from '../../constants';
import { formatViewMonth } from '../../utils/dateUtils';

export interface MonthNavigationControlProps {
  viewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  roleFilter: string;
  onRoleFilterChange: (filter: string) => void;
  visibleRoles: string[];
  onToggleVisibleRole: (roleKey: string) => void;
  onExportCsv: (months: number) => void;
  onExportJson?: () => void;
  onExportIcs?: () => void;
  onOpenPrintModal: () => void;
  onClearMonth: () => void;
  onOpenGuide: () => void;
  onAutoRotateMonth: () => void;
  onFillAssignments: () => void;
  hasUnlockedAssignments?: boolean;
}

export const MonthNavigationControl: React.FC<MonthNavigationControlProps> = React.memo(({
  viewDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  roleFilter,
  onRoleFilterChange,
  visibleRoles,
  onToggleVisibleRole,
  onExportCsv
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-1 w-full">
      {/* TOP / LEFT: Month Navigator & Today Action */}
      <div className="flex items-center justify-between gap-2 w-full md:w-auto">
        {/* Month Date Navigator Pill */}
        <div className="flex items-center bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 rounded-full px-3 py-1.5 shadow-xs gap-1 sm:gap-2 flex-1 md:flex-initial">
          <button onClick={onPrevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-600 dark:text-slate-300 transition cursor-pointer" aria-label="Previous Month">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight whitespace-nowrap min-w-[100px] sm:min-w-[120px] text-center flex-1">
            {formatViewMonth(viewDate)}
          </span>
          <button onClick={onNextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-600 dark:text-slate-300 transition cursor-pointer" aria-label="Next Month">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Today Quick Button */}
        <button 
          onClick={onToday} 
          className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-zinc-700 px-3.5 py-2.5 cursor-pointer rounded-full border border-indigo-200 dark:border-zinc-700 transition-all shadow-xs whitespace-nowrap shrink-0"
        >
          Today
        </button>

        {/* Mobile Quick Action Dropdowns (Export & Columns) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Export CSV Schedule"
              aria-label="Export Schedule"
              className="flex items-center justify-center w-10 h-10 bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                  <button onClick={() => { onExportCsv(1); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Current Month</button>
                  <button onClick={() => { onExportCsv(3); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 3 Months</button>
                  <button onClick={() => { onExportCsv(6); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 6 Months</button>
                  <div className="border-t border-slate-100 dark:border-zinc-800 my-1"></div>
                  <button onClick={() => { onExportCsv(0); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">All Upcoming</button>
                </div>
              </div>
            )}
          </div>

          {/* Columns Dropdown */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              title={`Visible Columns (${visibleRoles.length}/${ALL_DASHBOARD_ROLES.length})`}
              aria-label="Visible Columns Filter"
              className="w-10 h-10 rounded-full bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Columns</span>
                  <div className="flex gap-2 text-[10px]">
                    <button onClick={() => ALL_DASHBOARD_ROLES.forEach(r => !visibleRoles.includes(r.key) && onToggleVisibleRole(r.key))} className="text-indigo-600 font-bold hover:underline">All</button>
                    <button onClick={() => visibleRoles.forEach(k => onToggleVisibleRole(k))} className="text-slate-400 font-bold hover:underline">None</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {ALL_DASHBOARD_ROLES.map(role => {
                    const isChecked = visibleRoles.includes(role.key);
                    return (
                      <button key={role.key} onClick={() => onToggleVisibleRole(role.key)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-zinc-800 transition">
                        <span>{role.label}</span>
                        {isChecked ? <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: Cluster Focus Filter Tabs (Full-width segmented bar on mobile) */}
      <div className="flex items-center justify-between sm:justify-center gap-1 bg-slate-100/90 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 p-1 rounded-2xl shadow-xs w-full md:w-auto overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All Roles', icon: 'grid_view', shortName: 'All' },
          { id: 'presiding', label: '1. Presiding (Chairman)', icon: 'gavel', shortName: 'Presiding' },
          { id: 'meeting', label: '2. Weekend Meeting (Speaker, Conductor, Reader)', icon: 'record_voice_over', shortName: 'Meeting' },
          { id: 'support', label: '3. Support Roster (Attendants & Mic)', icon: 'support_agent', shortName: 'Support' }
        ].map(f => {
          const isActive = roleFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onRoleFilterChange(f.id)}
              title={f.label}
              aria-label={f.label}
              className={`flex-1 md:flex-initial h-10 px-2 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-extrabold shadow-sm scale-100' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white font-semibold'
              }`}
            >
              <Icon name={f.icon} className="text-base sm:text-lg shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap">{f.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* DESKTOP RIGHT GROUP: Export Dropdown + Columns Dropdown */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Desktop Export Pill */}
        <div className="relative" ref={exportMenuRef}>
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            title="Export CSV Schedule"
            aria-label="Export Schedule"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Export</span>
          </button>
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="py-1">
                <button onClick={() => { onExportCsv(1); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Current Month</button>
                <button onClick={() => { onExportCsv(3); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 3 Months</button>
                <button onClick={() => { onExportCsv(6); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 6 Months</button>
                <div className="border-t border-slate-100 dark:border-zinc-800 my-1"></div>
                <button onClick={() => { onExportCsv(0); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">All Upcoming</button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Columns Pill */}
        <div className="relative" ref={columnMenuRef}>
          <button
            onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
            title={`Visible Columns (${visibleRoles.length}/${ALL_DASHBOARD_ROLES.length})`}
            aria-label="Visible Columns Filter"
            className="w-11 h-11 rounded-full bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
          >
            <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
          {isColumnMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Columns</span>
                <div className="flex gap-2 text-[10px]">
                  <button onClick={() => ALL_DASHBOARD_ROLES.forEach(r => !visibleRoles.includes(r.key) && onToggleVisibleRole(r.key))} className="text-indigo-600 font-bold hover:underline">All</button>
                  <button onClick={() => visibleRoles.forEach(k => onToggleVisibleRole(k))} className="text-slate-400 font-bold hover:underline">None</button>
                </div>
              </div>
              <div className="space-y-1">
                {ALL_DASHBOARD_ROLES.map(role => {
                  const isChecked = visibleRoles.includes(role.key);
                  return (
                    <button key={role.key} onClick={() => onToggleVisibleRole(role.key)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-zinc-800 transition">
                      <span>{role.label}</span>
                      {isChecked ? <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
