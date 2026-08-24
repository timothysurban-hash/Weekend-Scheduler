import React from 'react';
import { Copy } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { CustomSelect } from '../ui/CustomSelect';
import { Assignment, Speaker, Outline } from '../../types';

export interface ScheduleDesktopRowProps {
  assignment: Assignment;
  speakers: Speaker[];
  outlines: Outline[];
  visibleRoles: string[];
  roleFilter?: string;
  isThisWeek: boolean;
  isJustFilled?: boolean;
  isExiting?: boolean;
  exitingIndex?: number;
  index?: number;
  conflicts?: string[];
  getBrotherOptions?: (date: string, role: string, currentId?: string | null) => any[];
  getOutlineOptions?: (date: string, assignmentId: string) => any[];
  onAssignmentChange: (assignmentId: string, role: string, value: any) => void;
  onSpeakerChange: (assignmentId: string, data: { speakerId?: string; outlineId?: number; customTalkTitle?: string }) => void;
  onLockToggle: (assignmentId: string) => void;
  onSpeakerLockToggle: (assignmentId: string) => void;
  onAddGuest: (assignmentId: string) => void;
  onCopyBrotherNames?: (assignment: Assignment) => void;
  onDeleteAssignment?: (assignmentId: string) => void;
}

export const ScheduleDesktopRow: React.FC<ScheduleDesktopRowProps> = React.memo(({
  assignment,
  speakers,
  outlines,
  visibleRoles,
  roleFilter = 'all',
  isThisWeek,
  isExiting = false,
  exitingIndex = 0,
  index = 0,
  conflicts = [],
  getBrotherOptions,
  getOutlineOptions,
  onAssignmentChange,
  onSpeakerChange,
  onLockToggle,
  onSpeakerLockToggle,
  onAddGuest,
  onCopyBrotherNames
}) => {
  const isRoleInFilter = (roleKey: string) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'presiding') return roleKey === 'chairman';
    if (roleFilter === 'meeting') return ['speaker', 'conductor', 'reader'].includes(roleKey);
    if (roleFilter === 'support') return ['attendants', 'mic'].includes(roleKey);
    return true;
  };

  // Fallback options generator if not passed
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
    <tr 
      style={isExiting ? { animationDelay: `${exitingIndex * 0.05}s` } : { animationDelay: `${index * 0.03}s` }}
      className={`group transition-all duration-300 ${isThisWeek ? 'bg-amber-500/10' : 'hover:bg-muted/30'}`}
    >
      <td className="px-4 py-3.5 align-top">
        <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          {new Date(assignment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
          {new Date(assignment.date).getFullYear()}
        </div>
        {isThisWeek && (
          <Badge className="bg-amber-400 hover:bg-amber-400 text-amber-950 font-black text-[10px] uppercase px-2 py-0.5 mt-2 shadow-2xs block w-fit">
            THIS WEEK
          </Badge>
        )}
        {conflicts.length > 0 && (
          <div className="mt-2 p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-600 dark:text-rose-400 text-[10px] font-bold shadow-2xs block w-fit" title={`Conflict: ${conflicts.join(', ')}`}>
            <span className="flex items-center gap-1"><Icon name="warning" className="text-xs" /> Double-booked</span>
          </div>
        )}
        {onCopyBrotherNames && (
          <div className="mt-3 pt-1">
            <button
              type="button"
              onClick={() => onCopyBrotherNames(assignment)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Copy non-speaker brother names to clipboard"
            >
              <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>Copy Names</span>
            </button>
          </div>
        )}
      </td>

      {/* Chairman */}
      {isRoleInFilter('chairman') && visibleRoles.includes('chairman') && (
        <td className="px-3 py-3 align-top">
          <CustomSelect
            options={getOptions('chairman', assignment.chairmanId)}
            value={assignment.chairmanId || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'chairman', val || null)}
            disabled={assignment.locked}
            placeholder="Chairman..."
          />
        </td>
      )}

      {/* Conductor */}
      {isRoleInFilter('conductor') && visibleRoles.includes('conductor') && (
        <td className="px-3 py-3 align-top">
          <CustomSelect
            options={getOptions('conductor', assignment.conductorId)}
            value={assignment.conductorId || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'conductor', val || null)}
            disabled={assignment.locked}
            placeholder="Conductor..."
          />
        </td>
      )}

      {/* Reader */}
      {isRoleInFilter('reader') && visibleRoles.includes('reader') && (
        <td className="px-3 py-3 align-top">
          <CustomSelect
            options={getOptions('reader', assignment.readerId)}
            value={assignment.readerId || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'reader', val || null)}
            disabled={assignment.locked}
            placeholder="Reader..."
          />
        </td>
      )}

      {/* Speaker & Theme */}
      {isRoleInFilter('speaker') && visibleRoles.includes('speaker') && (
        <td className="px-3 py-3 align-top space-y-1.5 min-w-[220px]">
          <CustomSelect
            options={getOptions('speaker', assignment.speakerId)}
            value={assignment.speakerId || ''}
            onChange={(val) => onSpeakerChange(assignment.id, { speakerId: val || '' })}
            disabled={assignment.locked || assignment.speakerLocked}
            placeholder="Speaker..."
          />
          <div className="flex items-center gap-1.5 mt-1">
            {!assignment.locked && !assignment.speakerLocked && (
              <button
                type="button"
                onClick={() => onAddGuest(assignment.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 dark:border-primary/30 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Add visiting guest speaker for this date"
              >
                <Icon name="person_add" className="text-xs text-primary" />
                <span>Add Guest Speaker</span>
              </button>
            )}
            {!assignment.locked && (
              <button
                type="button"
                onClick={() => onSpeakerLockToggle(assignment.id)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  assignment.speakerLocked
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                }`}
                title={assignment.speakerLocked ? 'Speaker Locked (Click to unlock)' : 'Lock Speaker'}
              >
                <Icon name={assignment.speakerLocked ? "lock" : "lock_open"} className={`text-xs ${assignment.speakerLocked ? 'text-amber-500' : ''}`} />
                <span>{assignment.speakerLocked ? 'Locked' : 'Lock'}</span>
              </button>
            )}
          </div>

          {/* Outline selection right below speaker */}
          <div className="space-y-1.5 pt-1">
            <CustomSelect
              options={getOutlines()}
              value={assignment.outlineId || 0}
              onChange={(val) => onSpeakerChange(assignment.id, { outlineId: Number(val) })}
              disabled={assignment.locked}
              placeholder="Select Outline..."
            />
            <Input
              type="text"
              value={assignment.customTalkTitle || ''}
              onChange={(e) => onSpeakerChange(assignment.id, { customTalkTitle: e.target.value })}
              disabled={assignment.locked}
              placeholder="Or Special Talk Title..."
              className="text-xs py-1.5 h-8 bg-background"
            />
          </div>
        </td>
      )}

      {/* Attendants */}
      {isRoleInFilter('attendants') && visibleRoles.includes('attendants') && (
        <td className="px-3 py-3 align-top space-y-1.5">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">Entrance</div>
          <CustomSelect
            options={getOptions('attendant_entrance', assignment.entranceAttendantId)}
            value={assignment.entranceAttendantId || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'entrance', val || null)}
            disabled={assignment.locked}
            placeholder="Entrance..."
          />
          <div className="text-[10px] text-muted-foreground font-bold uppercase pt-1">Auditorium</div>
          <CustomSelect
            options={getOptions('attendant_auditorium', assignment.auditoriumAttendantId)}
            value={assignment.auditoriumAttendantId || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'auditorium', val || null)}
            disabled={assignment.locked}
            placeholder="Auditorium..."
          />
        </td>
      )}

      {/* Mic Servers */}
      {isRoleInFilter('mic') && visibleRoles.includes('mic') && (
        <td className="px-3 py-3 align-top space-y-1.5">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">Mic 1</div>
          <CustomSelect
            options={getOptions('mic', assignment.micServerIds?.[0] || null)}
            value={assignment.micServerIds?.[0] || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'mic_1', val || null)}
            disabled={assignment.locked}
            placeholder="Mic 1..."
          />
          <div className="text-[10px] text-muted-foreground font-bold uppercase pt-1">Mic 2</div>
          <CustomSelect
            options={getOptions('mic', assignment.micServerIds?.[1] || null)}
            value={assignment.micServerIds?.[1] || ''}
            onChange={(val) => onAssignmentChange(assignment.id, 'mic_2', val || null)}
            disabled={assignment.locked}
            placeholder="Mic 2..."
          />
        </td>
      )}

      {/* Actions Column */}
      <td className="px-3 py-3 align-top text-right">
        <div className="flex items-center justify-end space-x-1">
          <Button
            size="icon"
            variant={assignment.locked ? "secondary" : "ghost"}
            onClick={() => onLockToggle(assignment.id)}
            className="h-10 w-10 min-h-[44px] min-w-[44px]"
            aria-label={assignment.locked ? "Unlock assignment" : "Lock assignment"}
            title={assignment.locked ? "Unlock assignment" : "Lock assignment"}
          >
            <Icon name="lock" className={`text-base ${assignment.locked ? 'text-amber-500 font-bold' : ''}`} />
          </Button>
        </div>
      </td>
    </tr>
  );
});
