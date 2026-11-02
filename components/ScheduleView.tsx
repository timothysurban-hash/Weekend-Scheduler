import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { ALL_DASHBOARD_ROLES } from '../constants';
import { isUpcomingSunday, getYearMonth, formatViewMonth } from '../utils/dateUtils';
import { applyAuthorityRoles, autoRotateMonth } from '../domain/scheduleEngine';
import { useScheduleCoordinator } from '../domain/scheduleCoordinator';
import { formatBrotherNamesForClipboard } from '../domain/scheduleFormatter';
import { showToast } from './ui/Toast';

const PrintScheduleModal = lazy(() => import('./PrintScheduleModal').then(m => ({ default: m.PrintScheduleModal })));
import { Button } from './ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';
import { CustomSelect } from './ui/CustomSelect';
import { AlertCircle, Trash2 } from 'lucide-react';
import { MonthNavigationControl } from './schedule/MonthNavigationControl';
import { ScheduleHeroCard } from './schedule/ScheduleHeroCard';
import { ScheduleDesktopRow } from './schedule/ScheduleDesktopRow';
import { ScheduleMobileCard } from './schedule/ScheduleMobileCard';
import { SpecialWeekModal } from './schedule/SpecialWeekModal';
import { setAssignmentSpecialEvent, revertAssignmentSpecialEvent } from '../domain/specialWeekHelper';

export { ALL_DASHBOARD_ROLES };

interface ScheduleViewProps {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  updateAssignments: (newAssignments: Assignment[]) => void;
  updateSpeakers: (newSpeakers: Speaker[]) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  assignments, speakers, outlines, settings, updateAssignments, updateSpeakers
}) => {
  const coordinator = useScheduleCoordinator({
    assignments,
    speakers,
    outlines,
    settings,
    updateAssignments,
    updateSpeakers
  });

  // State for View Navigation
  const [viewDate, setViewDate] = useState(new Date());
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [visibleRoles, setVisibleRoles] = useState<string[]>(
    settings.visibleRoles && settings.visibleRoles.length > 0 
      ? settings.visibleRoles 
      : ['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']
  );

  // Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestTargetId, setGuestTargetId] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState({ name: '', congregation: '', hostId: '', outlineId: 0, customTalkTitle: '' });
  const [specialWeekTarget, setSpecialWeekTarget] = useState<Assignment | null>(null);

  // Animation States
  const [filledIds, setFilledIds] = useState<string[]>([]);
  const [exitingIds, setExitingIds] = useState<string[]>([]);

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const handleToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingText = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        (activeEl as HTMLElement).isContentEditable
      );

      if (e.key === 'Escape') {
        setIsGuideOpen(false);
        setIsClearModalOpen(false);
        setIsAddingGuest(false);
      } else if (!isEditingText) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevMonth();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextMonth();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevMonth, handleNextMonth]);

  useEffect(() => {
    coordinator.ensureMonthSchedule(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate]);

  const handleCopyBrotherNames = useCallback((assignment: Assignment) => {
    const result = formatBrotherNamesForClipboard(assignment, speakers);
    if (result.count === 0) {
      showToast('No assigned brothers found for non-speaker roles on this date.', 'info');
      return;
    }

    navigator.clipboard.writeText(result.text)
      .then(() => {
        showToast(`Copied ${result.count} brother ${result.count === 1 ? 'name' : 'names'} for ${result.formattedDate} to clipboard!`, 'success');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.', 'error');
      });
  }, [speakers]);

  const displayedAssignments = assignments.filter(a => {
    const { year, month } = getYearMonth(a.date);
    return month === viewDate.getMonth() && year === viewDate.getFullYear();
  }).sort((a, b) => a.date.localeCompare(b.date));

  const toggleVisibleRole = useCallback((roleKey: string) => {
    setVisibleRoles(prev => {
      const exists = prev.includes(roleKey);
      return exists ? prev.filter(k => k !== roleKey) : [...prev, roleKey];
    });
  }, []);

  const handleApplyAuthorityRoles = useCallback(() => {
    const conductorId = settings.authorityRoles?.conductorId;
    const auditoriumAttendantId = settings.authorityRoles?.auditoriumAttendantId;

    if (!conductorId && !auditoriumAttendantId) {
      showToast("No Authority Roles set. Go to 'Role Rules' to assign a default Conductor or Attendant.", 'info');
      return;
    }

    const previousSnapshot = [...assignments];
    const { updatedAssignments, appliedCount } = applyAuthorityRoles(
      assignments,
      settings,
      viewDate.getFullYear(),
      viewDate.getMonth()
    );

    updateAssignments(updatedAssignments);
    showToast(
      `Applied Authority Roles across ${appliedCount} slots for ${formatViewMonth(viewDate)}`,
      'success',
      () => {
        updateAssignments(previousSnapshot);
        showToast('Restored previous schedule state.', 'info');
      },
      6000
    );
  }, [assignments, settings, viewDate, updateAssignments]);

  const handleAutoFill = useCallback(() => {
    const localBrothers = speakers.filter(s => !s.isGuest);
    if (localBrothers.length === 0) {
      showToast("No qualified local brothers available for auto-fill.", 'error');
      return;
    }

    const previousSnapshot = [...assignments];
    const { updatedAssignments, newlyFilledIds } = autoRotateMonth(
      assignments,
      speakers,
      settings,
      viewDate.getFullYear(),
      viewDate.getMonth()
    );

    updateAssignments(updatedAssignments);

    if (newlyFilledIds.length > 0) {
      setFilledIds(newlyFilledIds);
      setTimeout(() => setFilledIds([]), 2500);
      showToast(
        `Auto-rotated duties for ${formatViewMonth(viewDate)} (Public Speaker left for manual assignment)`,
        'success',
        () => {
          updateAssignments(previousSnapshot);
          showToast('Restored previous schedule state.', 'info');
        },
        6000
      );
    } else {
      showToast(`No unlocked meetings found for ${formatViewMonth(viewDate)}.`, 'info');
    }
  }, [assignments, speakers, settings, viewDate, updateAssignments]);

  const confirmClearMonth = useCallback(() => {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth() + 1;
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    const isRoleAssigned = (a: Assignment) => {
      if (roleFilter === 'all') {
        return a.speakerId || a.chairmanId || a.conductorId || a.readerId || a.entranceAttendantId || a.auditoriumAttendantId || (a.micServerIds && a.micServerIds.length > 0);
      }
      if (roleFilter === 'speaker') return Boolean(a.speakerId);
      if (roleFilter === 'chairman') return Boolean(a.chairmanId);
      if (roleFilter === 'conductor') return Boolean(a.conductorId);
      if (roleFilter === 'reader') return Boolean(a.readerId);
      if (roleFilter === 'attendants') return Boolean(a.entranceAttendantId || a.auditoriumAttendantId);
      if (roleFilter === 'mic') return Boolean(a.micServerIds && a.micServerIds.length > 0);
      return false;
    };

    const idsToClear = assignments
      .filter(a => a.date.startsWith(prefix) && !a.locked && isRoleAssigned(a))
      .map(a => a.id);

    if (idsToClear.length === 0) {
      setIsClearModalOpen(false);
      return;
    }

    setExitingIds(idsToClear);
    setIsClearModalOpen(false);

    const animationDuration = 300;
    const staggerDelay = 50; 
    const totalWaitTime = animationDuration + (idsToClear.length * staggerDelay);

    const previousSnapshot = [...assignments];
    setTimeout(() => {
      const updatedAssignments = assignments.map(a => {
        if (idsToClear.includes(a.id)) {
          if (roleFilter === 'all') {
            const keepSpeaker = Boolean(a.speakerLocked);
            return {
              ...a,
              speakerId: keepSpeaker ? a.speakerId : null,
              outlineId: keepSpeaker ? a.outlineId : null,
              hostSpeakerId: keepSpeaker ? a.hostSpeakerId : null,
              customTalkTitle: keepSpeaker ? a.customTalkTitle : undefined,
              chairmanId: null, conductorId: null, readerId: null,
              entranceAttendantId: null, auditoriumAttendantId: null, micServerIds: []
            };
          }
          const updated = { ...a };
          if (roleFilter === 'speaker' && !a.speakerLocked) {
            updated.speakerId = null;
            updated.outlineId = null;
            updated.hostSpeakerId = null;
            updated.customTalkTitle = undefined;
          }
          if (roleFilter === 'chairman') updated.chairmanId = null;
          if (roleFilter === 'conductor') updated.conductorId = null;
          if (roleFilter === 'reader') updated.readerId = null;
          if (roleFilter === 'attendants') { updated.entranceAttendantId = null; updated.auditoriumAttendantId = null; }
          if (roleFilter === 'mic') updated.micServerIds = [];
          return updated;
        }
        return a;
      });
      updateAssignments(updatedAssignments);
      setExitingIds([]);
      showToast(
        `Cleared unlocked assignments for ${formatViewMonth(viewDate)}`,
        'info',
        () => {
          updateAssignments(previousSnapshot);
          showToast('Restored cleared assignments.', 'info');
        },
        6000
      );
    }, totalWaitTime); 
  }, [viewDate, roleFilter, assignments, updateAssignments]);

  const toggleLock = useCallback((id: string) => {
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    coordinator.toggleLock(id, 'row');
    const formattedDate = new Date(target.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!target.locked) {
      showToast(`Locked all roles for ${formattedDate}`, 'info');
    } else {
      showToast(`Unlocked roles for ${formattedDate}`, 'info');
    }
  }, [assignments, coordinator]);

  const toggleSpeakerLock = useCallback((id: string) => {
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    coordinator.toggleLock(id, 'speaker');
    const formattedDate = new Date(target.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!target.speakerLocked) {
      showToast(`Locked speaker for ${formattedDate}`, 'info');
    } else {
      showToast(`Unlocked speaker for ${formattedDate}`, 'info');
    }
  }, [assignments, coordinator]);

  const openGuestModal = useCallback((assignmentId: string) => {
    setGuestTargetId(assignmentId);
    setNewGuest({ name: '', congregation: '', hostId: '', outlineId: 0, customTalkTitle: '' });
    setIsAddingGuest(true);
  }, []);

  const saveGuest = useCallback(() => {
    if (!newGuest.name || !guestTargetId) return;
    coordinator.addGuestSpeaker({
      assignmentId: guestTargetId,
      name: newGuest.name,
      congregation: newGuest.congregation,
      hostId: newGuest.hostId,
      outlineId: newGuest.outlineId,
      customTalkTitle: newGuest.customTalkTitle
    });
    setIsAddingGuest(false);
    setGuestTargetId(null);
  }, [newGuest, guestTargetId, coordinator]);

  const handleOpenSpecialWeek = useCallback((assignment: Assignment) => {
    setSpecialWeekTarget(assignment);
  }, []);

  const handleSaveSpecialWeek = useCallback((options: {
    isSpecialEvent: boolean;
    specialEventType?: any;
    specialEventTitle?: string;
    noMeeting?: boolean;
    customTalkTitle?: string;
  }) => {
    if (!specialWeekTarget) return;
    const updated = setAssignmentSpecialEvent(specialWeekTarget, options);
    updateAssignments(assignments.map(a => a.id === updated.id ? updated : a));
    showToast(
      options.isSpecialEvent
        ? `Marked ${new Date(specialWeekTarget.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} as ${options.specialEventTitle || 'Special Week'}`
        : 'Reverted to regular meeting',
      'success'
    );
  }, [specialWeekTarget, assignments, updateAssignments]);

  const handleRevertSpecialWeek = useCallback(() => {
    if (!specialWeekTarget) return;
    const reverted = revertAssignmentSpecialEvent(specialWeekTarget);
    updateAssignments(assignments.map(a => a.id === reverted.id ? reverted : a));
    showToast('Reverted to regular meeting and restored duties', 'success');
  }, [specialWeekTarget, assignments, updateAssignments]);

  const isRoleInFilter = (roleKey: string) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'presiding') return roleKey === 'chairman';
    if (roleFilter === 'meeting') return ['speaker', 'conductor', 'reader'].includes(roleKey);
    if (roleFilter === 'support') return ['attendants', 'mic'].includes(roleKey);
    return roleFilter === roleKey;
  };

  const handleExport = useCallback((months: number) => {
    let filteredData = [];
    const sortedAssignments = [...assignments].sort((a,b) => a.date.localeCompare(b.date));
    if (months === 0) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      filteredData = sortedAssignments.filter(a => a.date >= todayStr);
    } else {
      const startYear = viewDate.getFullYear();
      const startMonth = viewDate.getMonth();
      const startYM = startYear * 12 + startMonth;
      const endYM = startYM + months;
      
      filteredData = sortedAssignments.filter(a => {
        const { year, month } = getYearMonth(a.date);
        const aYM = year * 12 + month;
        return aYM >= startYM && aYM < endYM;
      });
    }
    if (filteredData.length === 0) {
      showToast("No assignments found for the selected period.", 'info');
      return;
    }
    const headers = ['Date', 'Speaker', 'Host', 'Congregation', 'Outline #', 'Outline Title'];
    const rows = filteredData.map(a => {
      const s = speakers.find(sp => sp.id === a.speakerId);
      const h = speakers.find(sp => sp.id === a.hostSpeakerId);
      const o = outlines.find(out => out.id === a.outlineId);
      const [year, month, day] = a.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      return [
        `"${dateStr.replace(/"/g, '""')}"`,
        `"${(s ? s.name : 'Unassigned').replace(/"/g, '""')}"`,
        `"${(h ? h.name : '-').replace(/"/g, '""')}"`,
        `"${(s ? s.congregation : '-').replace(/"/g, '""')}"`,
        `"${o ? o.id : '-'}"`,
        `"${(o ? o.title : '-').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let filename = '';
    if (months === 0) filename = 'schedule_all_upcoming.csv';
    else if (months === 1) filename = `schedule_${viewDate.getFullYear()}_${viewDate.getMonth()+1}.csv`;
    else filename = `schedule_${months}months_from_${viewDate.getMonth()+1}_${viewDate.getFullYear()}.csv`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [assignments, speakers, outlines, viewDate]);

  const nextAssignment = assignments.filter(a => new Date(a.date) >= new Date(new Date().setDate(new Date().getDate() - 1))).sort((a,b) => a.date.localeCompare(b.date))[0];
  const nextSpeaker = speakers.find(s => s.id === nextAssignment?.speakerId);
  const nextOutline = outlines.find(o => o.id === nextAssignment?.outlineId);
  const nextHost = speakers.find(s => s.id === nextAssignment?.hostSpeakerId);

  return (
    <div className="space-y-8">
      {/* Print Schedule Arrangement Modal */}
      {isPrintModalOpen && createPortal(
        <Suspense fallback={null}>
          <PrintScheduleModal
            assignments={assignments}
            speakers={speakers}
            outlines={outlines}
            settings={settings}
            viewDate={viewDate}
            onClose={() => setIsPrintModalOpen(false)}
          />
        </Suspense>,
        document.body
      )}

      {/* Clear Month Modal */}
      <Dialog open={isClearModalOpen} onOpenChange={setIsClearModalOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertCircle className="w-5 h-5 mr-2" />
            Clear Month Schedule?
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to remove all <strong>unlocked</strong> {roleFilter === 'all' ? 'assignments across ALL duty roles' : `assignments for the ${roleFilter.toUpperCase()} role`} for <span className="font-bold text-foreground">{formatViewMonth(viewDate)}</span>? 
            <br/><br/>
            This action cannot be undone. Locked assignments will remain safe.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsClearModalOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmClearMonth}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Assignments
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Schedule Guide & Help Modal */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Icon name="help_outline" className="text-xl" />
            Congregation Schedule Guide & Help
          </DialogTitle>
          <DialogDescription>
            Learn how the auto-rotation engine, authority roles, and schedule tools manage weekend assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm text-foreground">
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 text-primary">
              <Icon name="sync" className="text-base" /> Auto-Rotation Algorithm
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-fill evaluates brother qualifications (Chairman, Conductor, Reader, Attendant, Mic) and uses round-robin tie-breaking based on weeks since their last duty.
            </p>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 text-primary">
              <Icon name="workspace_premium" className="text-base" /> Authority Roles
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Applies primary overseer duties (e.g. Watchtower Conductor & Auditorium Attendant) across all unlocked dates in the current month in 1 click.
            </p>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 text-primary">
              <Icon name="lock" className="text-base" /> Assignment Locks & Undo Safety
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lock assignments to protect manual choices from auto-fill or clear actions. Every bulk operation includes a 6-second 1-click Undo toast option.
            </p>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 text-primary">
              <Icon name="keyboard" className="text-base" /> Keyboard Shortcuts
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Escape</kbd> anytime to close open menus or modals.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsGuideOpen(false)}>Got it</Button>
        </DialogFooter>
      </Dialog>

      {/* Guest Modal */}
      <Dialog open={isAddingGuest} onOpenChange={setIsAddingGuest}>
        <DialogHeader>
          <DialogTitle>Add Guest Speaker</DialogTitle>
          <DialogDescription>Assign an invited visiting speaker to this weekend meeting.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Guest Name</label>
            <Input 
              type="text" 
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              placeholder="e.g. Bro. Visitor"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Congregation</label>
            <Input 
              type="text" 
              value={newGuest.congregation}
              onChange={(e) => setNewGuest({...newGuest, congregation: e.target.value})}
              placeholder="e.g. Nearby West"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hosted By (Optional)</label>
            <CustomSelect 
              options={speakers.filter(s => !s.isGuest).map(s => ({ value: s.id, label: s.name }))}
              value={newGuest.hostId || ''}
              onChange={(val) => setNewGuest({...newGuest, hostId: val === '' ? '' : val})}
              placeholder="Select local host..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Outline (Standard List)</label>
            <CustomSelect 
              options={outlines.map(o => ({ value: o.id, label: `#${o.id} - ${o.title}` }))}
              value={newGuest.outlineId || 0}
              onChange={(val) => setNewGuest({...newGuest, outlineId: Number(val)})}
              placeholder="Select outline from list..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">OR Custom Special Talk Title / Theme</label>
            <Input 
              type="text" 
              value={newGuest.customTalkTitle}
              onChange={(e) => setNewGuest({...newGuest, customTalkTitle: e.target.value})}
              placeholder="e.g. Special Talk: Real Hope for the Future"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">Use this for special talks or themes not included in the standard outline list.</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={saveGuest} disabled={!newGuest.name}>
            Add to Schedule
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Special Week Modal */}
      {specialWeekTarget && (
        <SpecialWeekModal
          isOpen={Boolean(specialWeekTarget)}
          assignment={specialWeekTarget}
          languageMode={settings.languageMode}
          onClose={() => setSpecialWeekTarget(null)}
          onSave={handleSaveSpecialWeek}
          onRevert={handleRevertSpecialWeek}
        />
      )}

      {/* Dark Hero Action Card */}
      <ScheduleHeroCard
        viewDate={viewDate}
        displayedAssignments={displayedAssignments}
        speakers={speakers}
        nextAssignment={nextAssignment}
        nextSpeaker={nextSpeaker}
        nextOutline={nextOutline}
        nextHost={nextHost}
        onAutoRotateMonth={handleAutoFill}
        onApplyAuthorityRoles={handleApplyAuthorityRoles}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onClearMonth={() => setIsClearModalOpen(true)}
      />

      <div className="space-y-4">
        {/* Responsive Toolbar */}
        <MonthNavigationControl
          viewDate={viewDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          visibleRoles={visibleRoles}
          onToggleVisibleRole={toggleVisibleRole}
          onExportCsv={handleExport}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onClearMonth={() => setIsClearModalOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onAutoRotateMonth={handleAutoFill}
          onFillAssignments={handleAutoFill}
        />

        {/* Mobile List View (Hidden on MD+) */}
        <div className="md:hidden space-y-6 pb-8">
          {displayedAssignments.map((assignment, index) => {
            const filledIndex = filledIds.indexOf(assignment.id);
            const isJustFilled = filledIndex !== -1;
            const isExiting = exitingIds.includes(assignment.id);
            const exitingIndex = exitingIds.indexOf(assignment.id);
            const isThisWeek = isUpcomingSunday(assignment.date);
            const conflicts = coordinator.getConflicts(assignment);

            return (
              <ScheduleMobileCard
                key={assignment.id}
                assignment={assignment}
                speakers={speakers}
                outlines={outlines}
                index={index}
                totalWeeks={displayedAssignments.length}
                roleFilter={roleFilter}
                isThisWeek={isThisWeek}
                isJustFilled={isJustFilled}
                isExiting={isExiting}
                exitingIndex={exitingIndex}
                filledIndex={filledIndex}
                conflicts={conflicts}
                getBrotherOptions={coordinator.getBrotherOptions}
                getOutlineOptions={coordinator.getOutlineOptionsForDate}
                onAssignmentChange={coordinator.assignDuty}
                onSpeakerChange={coordinator.assignSpeakerAndOutline}
                onLockToggle={toggleLock}
                onSpeakerLockToggle={toggleSpeakerLock}
                onAddGuest={openGuestModal}
                onCopyNames={handleCopyBrotherNames}
                onOpenSpecialWeek={handleOpenSpecialWeek}
              />
            );
          })}

          {displayedAssignments.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-8 shadow-xs">
              <Icon name="event_busy" className="text-4xl text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No meeting dates found for this month.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View (Hidden on Mobile) */}
        <div className="hidden md:block bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-[960px] w-full text-left text-xs border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-xs font-semibold text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 min-w-[140px]">Meeting Date</th>
                  {isRoleInFilter('chairman') && visibleRoles.includes('chairman') && <th className="px-3 py-3">Chairman</th>}
                  {isRoleInFilter('conductor') && visibleRoles.includes('conductor') && <th className="px-3 py-3">WT Conductor</th>}
                  {isRoleInFilter('reader') && visibleRoles.includes('reader') && <th className="px-3 py-3">WT Reader</th>}
                  {isRoleInFilter('speaker') && visibleRoles.includes('speaker') && <th className="px-3 py-3">Public Speaker & Theme</th>}
                  {isRoleInFilter('attendants') && visibleRoles.includes('attendants') && <th className="px-3 py-3">Attendants</th>}
                  {isRoleInFilter('mic') && visibleRoles.includes('mic') && <th className="px-3 py-3">Mic Servers</th>}
                  <th className="px-3 py-3 text-right w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody key={viewDate.toISOString()} className="divide-y divide-border">
                {displayedAssignments.map((assignment, index) => {
                  const isExiting = exitingIds.includes(assignment.id);
                  const exitingIndex = exitingIds.indexOf(assignment.id);
                  const isThisWeek = isUpcomingSunday(assignment.date);
                  const conflicts = coordinator.getConflicts(assignment);

                  return (
                    <ScheduleDesktopRow
                      key={assignment.id}
                      assignment={assignment}
                      speakers={speakers}
                      outlines={outlines}
                      visibleRoles={visibleRoles}
                      roleFilter={roleFilter}
                      isThisWeek={isThisWeek}
                      isExiting={isExiting}
                      exitingIndex={exitingIndex}
                      index={index}
                      conflicts={conflicts}
                      getBrotherOptions={coordinator.getBrotherOptions}
                      getOutlineOptions={coordinator.getOutlineOptionsForDate}
                      onAssignmentChange={coordinator.assignDuty}
                      onSpeakerChange={coordinator.assignSpeakerAndOutline}
                      onLockToggle={toggleLock}
                      onSpeakerLockToggle={toggleSpeakerLock}
                      onAddGuest={openGuestModal}
                      onCopyBrotherNames={handleCopyBrotherNames}
                      onOpenSpecialWeek={handleOpenSpecialWeek}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};