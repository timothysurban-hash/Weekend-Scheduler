import React from 'react';
import { Icon } from '../ui/Icon';
import { Assignment, Speaker } from '../../types';
import { formatViewMonth } from '../../utils/dateUtils';

export interface ScheduleHeroCardProps {
  viewDate: Date;
  displayedAssignments: Assignment[];
  speakers: Speaker[];
  nextAssignment?: Assignment;
  nextSpeaker?: Speaker;
  nextOutline?: { id: number; title: string };
  nextHost?: Speaker;
  onAutoRotateMonth: () => void;
  onFillAssignments?: () => void;
  onApplyAuthorityRoles?: () => void;
  onOpenPrintModal?: () => void;
  onClearMonth: () => void;
  onOpenGuide?: () => void;
  hasUnlockedAssignments?: boolean;
}

export const ScheduleHeroCard: React.FC<ScheduleHeroCardProps> = React.memo(({
  viewDate,
  nextAssignment,
  nextSpeaker,
  nextOutline,
  nextHost,
  onAutoRotateMonth,
  onApplyAuthorityRoles,
  onOpenPrintModal,
  onClearMonth
}) => {
  return (
    <div className="bg-[#18181b] text-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
      {/* Subtle Decorative Geometric Circles */}
      <div className="absolute -right-8 -bottom-8 w-56 h-56 border border-zinc-700/30 rounded-full pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 w-80 h-80 border border-zinc-700/15 rounded-full pointer-events-none" />

      <div className="space-y-1.5 z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-300 font-medium">
          {nextAssignment 
            ? `Next Meeting: ${new Date(nextAssignment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
            : 'Next Meeting Arrangement'}
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {nextSpeaker ? nextSpeaker.name : 'Speaker Needed'}
          {nextSpeaker && <span className="text-sm sm:text-base text-zinc-400 font-normal ml-2 sm:ml-3">from {nextSpeaker.congregation}</span>}
        </h2>
        <p className="text-xs md:text-sm text-zinc-400 flex flex-wrap items-center gap-2 pt-0.5">
          {nextOutline ? (
            <>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-amber-300 font-bold text-xs">
                Outline #{nextOutline.id}
              </span>
              <span className="text-zinc-300 font-medium">{nextOutline.title}</span>
            </>
          ) : nextAssignment?.customTalkTitle ? (
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold text-xs">
              {nextAssignment.customTalkTitle}
            </span>
          ) : (
            <span>No talk outline assigned for this weekend meeting.</span>
          )}
          {nextHost && (
            <span className="text-xs text-zinc-400 ml-2">
              (Invited by <strong className="text-zinc-200">{nextHost.name}</strong>)
            </span>
          )}
        </p>
      </div>

      {/* Actions on Desktop (flex row) & Mobile (structured clean grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center gap-2 sm:gap-2.5 z-10 shrink-0 w-full md:w-auto">
        <button 
          onClick={onAutoRotateMonth}
          className="col-span-2 sm:col-span-1 md:flex-initial px-5 py-3 rounded-2xl md:rounded-full bg-[#c7d2fe] hover:bg-[#b4c6fc] text-[#1e1b4b] font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Icon name="sync" className="text-lg sm:text-xl shrink-0" />
          <span>Auto-Rotate</span>
        </button>
        {onApplyAuthorityRoles && (
          <button 
            onClick={onApplyAuthorityRoles}
            className="px-3 sm:px-4 py-3 rounded-2xl md:rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm border border-zinc-700 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Icon name="workspace_premium" className="text-lg text-amber-400 shrink-0" />
            <span>Authority</span>
          </button>
        )}
        {onOpenPrintModal && (
          <button 
            onClick={onOpenPrintModal}
            className="px-3 sm:px-4 py-3 rounded-2xl md:rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm border border-zinc-700 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Icon name="print" className="text-lg shrink-0" />
            <span>Print</span>
          </button>
        )}
        <button 
          onClick={onClearMonth}
          className="col-span-2 sm:col-span-1 md:w-11 md:h-11 px-3 sm:px-4 md:px-0 py-3 md:py-0 rounded-2xl md:rounded-full bg-zinc-800 hover:bg-zinc-700 text-rose-400 flex items-center justify-center gap-1.5 border border-zinc-700 transition-all active:scale-95 hover:scale-105 cursor-pointer shadow-sm min-h-[44px]"
          title={`Clear unlocked assignments for ${formatViewMonth(viewDate)}`}
        >
          <Icon name="delete" className="text-lg shrink-0" />
          <span className="md:hidden text-xs font-bold">Clear Month</span>
        </button>
      </div>
    </div>
  );
});
