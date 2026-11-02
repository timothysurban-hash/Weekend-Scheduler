import React from 'react';
import { Copy } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CustomSelect } from '../ui/CustomSelect';
import { Assignment, Speaker, Outline } from '../../types';

export interface ScheduleMobileCardProps {
  assignment: Assignment;
  speakers: Speaker[];
  outlines: Outline[];
  index: number;
  totalWeeks: number;
  roleFilter?: string;
  isThisWeek: boolean;
  isJustFilled?: boolean;
  isExiting?: boolean;
  exitingIndex?: number;
  filledIndex?: number;
  conflicts?: string[];
  getBrotherOptions?: (date: string, role: string, currentId?: string | null) => any[];
  getOutlineOptions?: (date: string, assignmentId: string) => any[];
  onAssignmentChange: (assignmentId: string, role: string, value: any) => void;
  onSpeakerChange: (assignmentId: string, data: { speakerId?: string; outlineId?: number; customTalkTitle?: string }) => void;
  onLockToggle: (assignmentId: string) => void;
  onSpeakerLockToggle: (assignmentId: string) => void;
  onAddGuest: (assignmentId: string) => void;
  onCopyNames?: (assignment: Assignment) => void;
  onOpenSpecialWeek?: (assignment: Assignment) => void;
}

export const ScheduleMobileCard: React.FC<ScheduleMobileCardProps> = React.memo(({
  assignment,
  speakers,
  outlines,
  index,
  totalWeeks,
  roleFilter = 'all',
  isThisWeek,
  isJustFilled = false,
  isExiting = false,
  exitingIndex = 0,
  filledIndex = 0,
  conflicts = [],
  getBrotherOptions,
  getOutlineOptions,
  onAssignmentChange,
  onSpeakerChange,
  onLockToggle,
  onSpeakerLockToggle,
  onAddGuest,
  onCopyNames,
  onOpenSpecialWeek
}) => {
  const currentSpeaker = speakers.find(s => s.id === assignment.speakerId);
  const hostSpeaker = speakers.find(s => s.id === assignment.hostSpeakerId);
  const isMeetingSuspended = Boolean(assignment.isSpecialEvent && (assignment.noMeeting ?? true));
  const assignmentOutline = outlines.find(o => o.id === assignment.outlineId);

  const isRoleInFilter = (roleKey: string) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'presiding') return roleKey === 'chairman';
    if (roleFilter === 'meeting') return ['speaker', 'conductor', 'reader'].includes(roleKey);
    if (roleFilter === 'support') return ['attendants', 'mic'].includes(roleKey);
    return true;
  };

  const fallbackBrotherOptions = (role: string, currentId?: string | null) => {
    const list = speakers.filter(s => !s.isGuest || s.id === currentId).map(s => ({
      value: s.id,
      label: s.name,
      subLabel: s.congregation
    }));
    return [{ value: '', label: 'Select...' }, ...list];
  };

  const fallbackOutlineOptions = () => {
    const list = outlines.map(o => ({
      value: o.id,
      label: `#${o.id} - ${o.title}`
    }));
    return [{ value: 0, label: 'Select Outline...' }, ...list];
  };

  const getOptions = (role: string, currentId?: string | null) => {
    if (getBrotherOptions) return getBrotherOptions(assignment.date, role, currentId);
    return fallbackBrotherOptions(role, currentId);
  };

  const getOutlines = () => {
    if (getOutlineOptions) return getOutlineOptions(assignment.date, assignment.id);
    return fallbackOutlineOptions();
  };

  return (
    <div 
      style={isExiting ? { animationDelay: `${exitingIndex * 0.05}s` } : (isJustFilled ? { animationDelay: `${filledIndex * 0.05}s` } : { animationDelay: `${index * 0.03}s` })}
      className={`bg-white dark:bg-[#18181b] rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-md 
        ${isJustFilled ? 'animate-pop-in' : ''} 
        ${isExiting 
          ? 'animate-fade-out-up opacity-0 pointer-events-none' 
          : (isThisWeek 
            ? 'border-amber-400 ring-2 ring-amber-400/30 dark:border-amber-500 shadow-amber-500/5' 
            : 'border-slate-200/90 dark:border-zinc-800 shadow-slate-200/50 dark:shadow-none')
        }`}
    >
      {/* Prominent Week Header Banner for clear separation */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isThisWeek 
          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400/30' 
          : 'bg-slate-50/90 dark:bg-zinc-800/60 border-slate-100 dark:border-zinc-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
            isThisWeek 
              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/40' 
              : 'bg-indigo-600 dark:bg-indigo-500 text-white'
          }`}>
            <Icon name="calendar_today" className="text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-black text-base tracking-tight ${
                isThisWeek ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'
              }`}>
                {new Date(assignment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                • {new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
              {isThisWeek && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-2xs tracking-wide">
                  This Week
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 block">
              {`Week ${index + 1} of ${totalWeeks} • ${new Date(assignment.date).getFullYear()}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSpecialWeek && (
            <button
              type="button"
              onClick={() => onOpenSpecialWeek(assignment)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer ${
                assignment.isSpecialEvent
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
              }`}
              title="Configure Special Week"
            >
              <Icon name="event" className="text-xs" />
              <span>{assignment.isSpecialEvent ? 'Special' : 'Special Week'}</span>
            </button>
          )}
          {onCopyNames && (
            <button
              type="button"
              onClick={() => onCopyNames(assignment)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition shadow-2xs active:scale-95 cursor-pointer"
              title="Copy non-speaker brother names"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Copy</span>
            </button>
          )}
          <Button 
            size="icon"
            variant={assignment.locked ? "secondary" : "outline"}
            onClick={() => onLockToggle(assignment.id)}
            className="h-8 w-8 min-h-[36px] min-w-[36px] rounded-xl cursor-pointer"
            aria-label={assignment.locked ? "Unlock assignment" : "Lock assignment"}
            title={assignment.locked ? "Unlock assignment" : "Lock assignment"}
          >
            <Icon name={assignment.locked ? "lock" : "lock_open"} className="text-sm" />
          </Button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {conflicts.length > 0 && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-semibold flex items-start gap-2">
            <Icon name="warning" className="text-base flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Double-Booking Conflict Detected:</span>
              <ul className="list-disc list-inside text-[11px] font-normal opacity-90">
                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        )}

        {isMeetingSuspended ? (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Icon name="event" className="text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-900 dark:text-amber-200 tracking-tight">
                    {assignment.specialEventTitle || 'Special Event'}
                  </span>
                  {assignment.specialEventType && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 uppercase">
                      {assignment.specialEventType.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  No Meeting at Kingdom Hall (Duties Suspended)
                </div>
              </div>
            </div>
            {onOpenSpecialWeek && (
              <button
                type="button"
                onClick={() => onOpenSpecialWeek(assignment)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
              >
                <Icon name="edit" className="text-sm" />
                <span>Edit Special Week</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Duty Roster Grid for Mobile */}
            <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex justify-between items-center">
            <span>Weekend Duty Roster</span>
            {assignment.isSpecialEvent && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full">Assembly / Special Event</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Chairman */}
            {isRoleInFilter('chairman') && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Chairman</span>
                <CustomSelect
                  options={getOptions('chairman', assignment.chairmanId)}
                  value={assignment.chairmanId || ''}
                  onChange={(val) => onAssignmentChange(assignment.id, 'chairman', val || null)}
                  disabled={assignment.locked}
                  placeholder="Select Chairman..."
                />
              </div>
            )}

            {/* WT Conductor */}
            {isRoleInFilter('conductor') && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">WT Conductor</span>
                <CustomSelect
                  options={getOptions('conductor', assignment.conductorId)}
                  value={assignment.conductorId || ''}
                  onChange={(val) => onAssignmentChange(assignment.id, 'conductor', val || null)}
                  disabled={assignment.locked}
                  placeholder="Select Conductor..."
                />
              </div>
            )}

            {/* WT Reader */}
            {isRoleInFilter('reader') && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">WT Reader</span>
                <CustomSelect
                  options={getOptions('reader', assignment.readerId)}
                  value={assignment.readerId || ''}
                  onChange={(val) => onAssignmentChange(assignment.id, 'reader', val || null)}
                  disabled={assignment.locked}
                  placeholder="Select Reader..."
                />
              </div>
            )}

            {/* Entrance Attendant */}
            {isRoleInFilter('attendants') && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Entrance Attendant</span>
                <CustomSelect
                  options={getOptions('attendant_entrance', assignment.entranceAttendantId)}
                  value={assignment.entranceAttendantId || ''}
                  onChange={(val) => onAssignmentChange(assignment.id, 'entrance', val || null)}
                  disabled={assignment.locked}
                  placeholder="Select Attendant..."
                />
              </div>
            )}

            {/* Auditorium Attendant */}
            {isRoleInFilter('attendants') && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Auditorium Attendant</span>
                <CustomSelect
                  options={getOptions('attendant_auditorium', assignment.auditoriumAttendantId)}
                  value={assignment.auditoriumAttendantId || ''}
                  onChange={(val) => onAssignmentChange(assignment.id, 'auditorium', val || null)}
                  disabled={assignment.locked}
                  placeholder="Select Attendant..."
                />
              </div>
            )}

            {/* Mic Servers */}
            {isRoleInFilter('mic') && (
              <>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Mic Server 1</span>
                  <CustomSelect
                    options={getOptions('mic', assignment.micServerIds?.[0] || null)}
                    value={assignment.micServerIds?.[0] || ''}
                    onChange={(val) => onAssignmentChange(assignment.id, 'mic_1', val || null)}
                    disabled={assignment.locked}
                    placeholder="Mic 1..."
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Mic Server 2</span>
                  <CustomSelect
                    options={getOptions('mic', assignment.micServerIds?.[1] || null)}
                    value={assignment.micServerIds?.[1] || ''}
                    onChange={(val) => onAssignmentChange(assignment.id, 'mic_2', val || null)}
                    disabled={assignment.locked}
                    placeholder="Mic 2..."
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Public Talk & Guest Speaker Section */}
        {isRoleInFilter('speaker') && (
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Public Talk Discourse</span>
              {currentSpeaker?.isGuest && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                  Guest Speaker
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Public Speaker</label>
                <CustomSelect
                  options={getOptions('speaker', assignment.speakerId)}
                  value={assignment.speakerId || ''}
                  onChange={(val) => onSpeakerChange(assignment.id, { speakerId: val || '' })}
                  disabled={assignment.locked || assignment.speakerLocked}
                  placeholder="Select Public Speaker..."
                />
              </div>

              {/* Guest Actions and Speaker Lock */}
              <div className="flex items-center justify-between pt-1">
                {!assignment.locked && !assignment.speakerLocked && (
                  <button
                    type="button"
                    onClick={() => onAddGuest(assignment.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition cursor-pointer"
                  >
                    <Icon name="person_add" className="text-sm" />
                    <span>Add Guest</span>
                  </button>
                )}
                {!assignment.locked && (
                  <button
                    type="button"
                    onClick={() => onSpeakerLockToggle(assignment.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      assignment.speakerLocked 
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground border-border'
                    }`}
                  >
                    <Icon name={assignment.speakerLocked ? "lock" : "lock_open"} className="text-sm" />
                    <span>{assignment.speakerLocked ? "Speaker Locked" : "Lock"}</span>
                  </button>
                )}
              </div>

              {/* Talk Outline Selector */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Talk Theme & Outline</label>
                <CustomSelect
                  options={getOutlines()}
                  value={assignment.outlineId || 0}
                  onChange={(val) => onSpeakerChange(assignment.id, { outlineId: Number(val) })}
                  disabled={assignment.locked}
                  placeholder="Select Outline..."
                />
                <Input
                  type="text"
                  placeholder="Or Special Talk Title..."
                  value={assignment.customTalkTitle || ''}
                  onChange={(e) => onSpeakerChange(assignment.id, { customTalkTitle: e.target.value })}
                  disabled={assignment.locked}
                  className="text-xs h-9 bg-background"
                />
                {assignmentOutline && (
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                    <Icon name="topic" className="text-xs" />
                    <span>Topic: #{assignmentOutline.id} — {assignmentOutline.title}</span>
                  </div>
                )}
                {hostSpeaker && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Host: <strong className="text-foreground font-semibold">{hostSpeaker.name}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
});
