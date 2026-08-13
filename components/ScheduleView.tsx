import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Assignment, Speaker, Outline, AppSettings, DutyRole } from '../types';
import { Download, Calendar as CalendarIcon, ArrowLeftRight, AlertCircle, ArrowDown, ChevronLeft, ChevronRight, Trash2, ChevronDown, Eye, CheckSquare, Square, Copy } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { PrintScheduleModal } from './PrintScheduleModal';
import { isUpcomingSunday, getYearMonth, formatViewMonth, isCandidateEligible } from '../utils/dateUtils';
import { showToast } from './ui/Toast';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';

interface ScheduleViewProps {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  updateAssignments: (newAssignments: Assignment[]) => void;
  updateSpeakers: (newSpeakers: Speaker[]) => void;
}

export const ALL_DASHBOARD_ROLES = [
  { key: 'chairman', label: 'Chairman' },
  { key: 'conductor', label: 'WT Conductor' },
  { key: 'reader', label: 'WT Reader' },
  { key: 'speaker', label: 'Public Speaker' },
  { key: 'attendants', label: 'Attendants' },
  { key: 'mic', label: 'Mic Servers' }
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  assignments, speakers, outlines, settings, updateAssignments, updateSpeakers
}) => {
  // State for View Navigation
  const [viewDate, setViewDate] = useState(new Date());
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [visibleRoles, setVisibleRoles] = useState<string[]>(
    settings.visibleRoles && settings.visibleRoles.length > 0 
      ? settings.visibleRoles 
      : ['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']
  );
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // State for Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);



  // State for Fill Animation
  const [filledIds, setFilledIds] = useState<string[]>([]);
  
  // State for Clear/Delete Animation
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  
  // State for Quick Add Guest
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestTargetId, setGuestTargetId] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState({ name: '', congregation: '', hostId: '', outlineId: 0, customTalkTitle: '' });

  // State for Clear Month Confirmation
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // State for Export Menu
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // State for Schedule Guide Modal
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setIsExportMenuOpen(false);
        }
        if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
            setIsColumnMenuOpen(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        const isEditingText = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            (activeEl as HTMLElement).isContentEditable
        );

        if (e.key === 'Escape') {
            setIsColumnMenuOpen(false);
            setIsExportMenuOpen(false);
            setIsGuideOpen(false);
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

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const dates: string[] = [];
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7));
    nextSunday.setHours(12, 0, 0, 0);

    for (let i = 0; i < 52; i++) {
      const d = new Date(nextSunday);
      d.setDate(nextSunday.getDate() + (i * 7));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    const currentAssignments = Array.isArray(assignments) ? assignments : [];
    const missingDates = dates.filter(d => !currentAssignments.some(a => a.date === d));

    if (missingDates.length > 0) {
      const newEntries: Assignment[] = missingDates.map(date => ({
        id: Math.random().toString(36).substring(2, 11),
        date,
        speakerId: null,
        outlineId: null,
        locked: false
      }));
      const updated = [...currentAssignments, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
      updateAssignments(updated);
    }
  }, [viewDate]);

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
  };

  const handleCopyBrotherNames = (assignment: Assignment) => {
    const idsToCopy: string[] = [];

    // Order: 1. Entrance Attendant, 2. Auditorium Attendant, 3. Chairman, 4. WT Conductor, 5. Paragraph Reader, 6. Mic Servers
    if (assignment.entranceAttendantId) idsToCopy.push(assignment.entranceAttendantId);
    if (assignment.auditoriumAttendantId) idsToCopy.push(assignment.auditoriumAttendantId);
    if (assignment.chairmanId) idsToCopy.push(assignment.chairmanId);
    if (assignment.conductorId) idsToCopy.push(assignment.conductorId);
    if (assignment.readerId) idsToCopy.push(assignment.readerId);

    if (assignment.micServerIds && assignment.micServerIds.length > 0) {
      assignment.micServerIds.forEach(id => {
        if (id) idsToCopy.push(id);
      });
    }

    if (assignment.customDutyAssignments) {
      Object.values(assignment.customDutyAssignments).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(id => {
            if (id) idsToCopy.push(id);
          });
        }
      });
    }

    const names = idsToCopy
      .map(id => speakers.find(s => s.id === id)?.name)
      .filter((name): name is string => Boolean(name && name.trim()));

    if (names.length === 0) {
      showToast('No assigned brothers found for non-speaker roles on this date.', 'info');
      return;
    }

    const textToCopy = names.join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        const formattedDate = new Date(assignment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        showToast(`Copied ${names.length} brother ${names.length === 1 ? 'name' : 'names'} for ${formattedDate} to clipboard!`, 'success');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.', 'error');
      });
  };

  const displayedAssignments = assignments.filter(a => {
    const { year, month } = getYearMonth(a.date);
    return month === viewDate.getMonth() && year === viewDate.getFullYear();
  }).sort((a, b) => a.date.localeCompare(b.date));

  const getOutlineEffectiveLastUsed = (outline: Outline, excludeAssignmentId?: string) => {
    const dates = [outline.lastUsed].filter(Boolean) as string[];
    const scheduledDates = assignments
        .filter(a => a.outlineId === outline.id && a.id !== excludeAssignmentId) 
        .map(a => a.date);
    
    const allDates = [...dates, ...scheduledDates];
    if (allDates.length === 0) return null;

    return allDates.reduce((max, current) => current > max ? current : max, allDates[0]);
  };

  const toggleVisibleRole = (roleKey: string) => {
    setVisibleRoles(prev => {
      const exists = prev.includes(roleKey);
      return exists ? prev.filter(k => k !== roleKey) : [...prev, roleKey];
    });
  };

  const handleApplyAuthorityRoles = () => {
    const conductorId = settings.authorityRoles?.conductorId;
    const auditoriumAttendantId = settings.authorityRoles?.auditoriumAttendantId;

    if (!conductorId && !auditoriumAttendantId) {
      showToast("No Authority Roles set. Go to 'Role Rules' to assign a default Conductor or Attendant.", 'info');
      return;
    }

    const previousSnapshot = [...assignments];
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    let appliedCount = 0;

    const updatedAssignments = assignments.map(a => {
      const { year, month } = getYearMonth(a.date);
      if (year === viewYear && month === viewMonth && !a.locked) {
        const updated = { ...a };
        if (conductorId) {
          updated.conductorId = conductorId;
          appliedCount++;
        }
        if (auditoriumAttendantId) {
          updated.auditoriumAttendantId = auditoriumAttendantId;
          appliedCount++;
        }
        return updated;
      }
      return a;
    });

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
  };

  const handleAutoFill = () => {
    const localBrothers = speakers.filter(s => !s.isGuest);
    if (localBrothers.length === 0) {
      showToast("No qualified local brothers available for auto-fill.", 'error');
      return;
    }

    const previousSnapshot = [...assignments];
    let newAssignments = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const newlyFilledIds: string[] = [];

    // Ensure all Sundays for current view month exist in newAssignments
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        if (!newAssignments.some(a => a.date === dateStr)) {
          newAssignments.push({
            id: Math.random().toString(36).substring(2, 11),
            date: dateStr,
            speakerId: null,
            outlineId: null,
            locked: false
          });
        }
      }
    }
    newAssignments.sort((a, b) => a.date.localeCompare(b.date));

    // Helper: Find the most recent date a brother served in a specific role across all assignments
    const getLastRoleDate = (brotherId: string, role: DutyRole, beforeDate: string): string => {
      let maxDate = '';
      newAssignments.forEach(a => {
        if (a.date >= beforeDate) return;

        let servedInRole = false;
        if (role === 'chairman' && a.chairmanId === brotherId) servedInRole = true;
        else if (role === 'speaker' && a.speakerId === brotherId) servedInRole = true;
        else if (role === 'conductor' && a.conductorId === brotherId) servedInRole = true;
        else if (role === 'reader' && a.readerId === brotherId) servedInRole = true;
        else if (role === 'attendant_entrance' && a.entranceAttendantId === brotherId) servedInRole = true;
        else if (role === 'attendant_auditorium' && a.auditoriumAttendantId === brotherId) servedInRole = true;
        else if (role === 'mic' && a.micServerIds?.includes(brotherId)) servedInRole = true;

        if (servedInRole && a.date > maxDate) {
          maxDate = a.date;
        }
      });
      return maxDate;
    };

    const getQualifiedBrothers = (role: DutyRole) => {
      // Rotate strictly among brothers activated in roleRules roster
      const rule = settings.roleRules?.[role];
      if (rule && rule.rosterIds) {
        return localBrothers.filter(s => rule.rosterIds.includes(s.id));
      }
      return [];
    };

    // Track round-robin index offset per role for tie-breaking brothers with equal history
    const roleOffsetMap: Record<string, number> = {};

    const pickNextBrother = (
      role: DutyRole, 
      dateStr: string, 
      assignedInMeeting: Set<string>
    ): string | null => {
      const candidates = getQualifiedBrothers(role);
      if (candidates.length === 0) return null;

      const currentOffset = roleOffsetMap[role] || 0;

      // Sort candidates by last assignment date for this role (ascending: oldest / never assigned first)
      const sortedCandidates = [...candidates].sort((a, b) => {
        const lastA = getLastRoleDate(a.id, role, dateStr);
        const lastB = getLastRoleDate(b.id, role, dateStr);

        if (!lastA && !lastB) {
          const indexA = (candidates.indexOf(a) + currentOffset) % candidates.length;
          const indexB = (candidates.indexOf(b) + currentOffset) % candidates.length;
          return indexA - indexB;
        }
        if (!lastA) return -1;
        if (!lastB) return 1;
        return lastA.localeCompare(lastB);
      });

      for (const candidate of sortedCandidates) {
        if (isCandidateEligible(candidate, role, dateStr, assignedInMeeting)) {
          assignedInMeeting.add(candidate.id);
          roleOffsetMap[role] = (currentOffset + 1) % candidates.length;
          return candidate.id;
        }
      }
      return null;
    };

    for (let i = 0; i < newAssignments.length; i++) {
        const a = newAssignments[i];
        const { year, month } = getYearMonth(a.date);
        if (year === viewYear && month === viewMonth && !a.locked) {
            const assignedInMeeting = new Set<string>();

            // Preserve Public Speaker assignment if present
            if (a.speakerId) assignedInMeeting.add(a.speakerId);

            const updatedCard = { ...a };

            // 1. Presiding & Meeting Conductors (Public Speaker left for manual/guest selection)
            updatedCard.chairmanId = pickNextBrother('chairman', a.date, assignedInMeeting);

            if (settings.authorityRoles?.conductorId) {
              updatedCard.conductorId = settings.authorityRoles.conductorId;
              assignedInMeeting.add(settings.authorityRoles.conductorId);
            } else {
              updatedCard.conductorId = pickNextBrother('conductor', a.date, assignedInMeeting);
            }

            updatedCard.readerId = pickNextBrother('reader', a.date, assignedInMeeting);

            // 2. Attendants & Support Roles
            updatedCard.entranceAttendantId = pickNextBrother('attendant_entrance', a.date, assignedInMeeting);

            if (settings.authorityRoles?.auditoriumAttendantId) {
              updatedCard.auditoriumAttendantId = settings.authorityRoles.auditoriumAttendantId;
              assignedInMeeting.add(settings.authorityRoles.auditoriumAttendantId);
            } else {
              updatedCard.auditoriumAttendantId = pickNextBrother('attendant_auditorium', a.date, assignedInMeeting);
            }

            const mic1 = pickNextBrother('mic', a.date, assignedInMeeting);
            const mic2 = pickNextBrother('mic', a.date, assignedInMeeting);
            updatedCard.micServerIds = [mic1, mic2].filter(Boolean) as string[];

            newAssignments[i] = updatedCard;
            newlyFilledIds.push(a.id);
        }
    }
    updateAssignments([...newAssignments]);

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
  };

  const confirmClearMonth = () => {
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

      // Trigger Exit Animation
      setExitingIds(idsToClear);
      setIsClearModalOpen(false);

      // Wait for staggered animation to complete
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
  };

  const toggleLock = (id: string) => {
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    const newLocked = !target.locked;
    const updated = assignments.map(a => a.id === id ? { ...a, locked: newLocked } : a);
    updateAssignments(updated);

    const formattedDate = new Date(target.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (newLocked) {
      showToast(`Locked all roles for ${formattedDate}`, 'info');
    } else {
      showToast(`Unlocked roles for ${formattedDate}`, 'info');
    }
  };

  const toggleSpeakerLock = (id: string) => {
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    const newSpeakerLocked = !target.speakerLocked;
    const updated = assignments.map(a => a.id === id ? { ...a, speakerLocked: newSpeakerLocked } : a);
    updateAssignments(updated);

    const formattedDate = new Date(target.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (newSpeakerLocked) {
      showToast(`Locked speaker for ${formattedDate}`, 'info');
    } else {
      showToast(`Unlocked speaker for ${formattedDate}`, 'info');
    }
  };

  const handleSpeakerChange = (assignmentId: string, speakerId: string) => {
    const updated = assignments.map(a => a.id === assignmentId ? { ...a, speakerId: speakerId, outlineId: null, hostSpeakerId: null } : a);
    updateAssignments(updated);
  };

  const handleOutlineChange = (assignmentId: string, outlineId: number) => {
    const updated = assignments.map(a => a.id === assignmentId ? { ...a, outlineId: outlineId } : a);
    updateAssignments(updated);
  };

  const openGuestModal = (assignmentId: string) => {
      setGuestTargetId(assignmentId);
      setNewGuest({ name: '', congregation: '', hostId: '', outlineId: 0, customTalkTitle: '' });
      setIsAddingGuest(true);
  };

  const saveGuest = () => {
      if (!newGuest.name || !guestTargetId) return;
      const guestId = Math.random().toString(36).substr(2, 9);
      const guestSpeaker: Speaker = {
          id: guestId, name: newGuest.name, congregation: newGuest.congregation || 'Visiting', isGuest: true, unavailableDates: [], lastAssigned: null, sortOrder: 9999, spiritualStatus: 'publisher'
      };
      updateSpeakers([...speakers, guestSpeaker]);
      const updatedAssignments = assignments.map(a => 
          a.id === guestTargetId ? { 
              ...a, 
              speakerId: guestId, 
              outlineId: newGuest.outlineId || null, 
              customTalkTitle: newGuest.customTalkTitle || undefined,
              locked: false, 
              hostSpeakerId: newGuest.hostId || null 
          } : a
      );
      updateAssignments(updatedAssignments);
      setIsAddingGuest(false);
      setGuestTargetId(null);
  };



  const isRoleInFilter = (roleKey: string) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'presiding') return roleKey === 'chairman';
    if (roleFilter === 'meeting') return ['speaker', 'conductor', 'reader'].includes(roleKey);
    if (roleFilter === 'support') return ['attendants', 'mic'].includes(roleKey);
    return roleFilter === roleKey;
  };

  const getBrotherCandidateOptions = (role: DutyRole, dateStr: string, currentSelectedId?: string | null) => {
    const targetDate = new Date(dateStr).getTime();
    const eligibleBrothers = speakers.filter(s => !s.isGuest || s.id === currentSelectedId || role === 'speaker');
    
    const candidateOptions = eligibleBrothers
      .filter(s => {
        if (s.id === currentSelectedId) return true;
        if (s.isGuest && role === 'speaker') return true;
        const quals = s.qualifications || ['speaker', 'chairman', 'reader', 'mic', 'attendant_entrance', 'attendant_auditorium'];
        return quals.includes(role);
      })
      .map(s => {
        let lastDate: number | null = null;
        assignments.forEach(a => {
          const aDate = new Date(a.date).getTime();
          if (aDate < targetDate) {
            const isAssigned = 
              (role === 'chairman' && a.chairmanId === s.id) ||
              (role === 'speaker' && a.speakerId === s.id) ||
              (role === 'conductor' && a.conductorId === s.id) ||
              (role === 'reader' && a.readerId === s.id) ||
              (role === 'attendant_entrance' && a.entranceAttendantId === s.id) ||
              (role === 'attendant_auditorium' && a.auditoriumAttendantId === s.id) ||
              (role === 'mic' && a.micServerIds?.includes(s.id));
            if (isAssigned && (!lastDate || aDate > lastDate)) {
              lastDate = aDate;
            }
          }
        });

        let statusLabel = 'Available';
        let status: 'success' | 'warning' | 'neutral' = 'success';

        if (s.isGuest) {
          statusLabel = 'Guest Speaker';
          status = 'neutral';
        } else if (lastDate) {
          const weeks = Math.round((targetDate - lastDate) / (1000 * 60 * 60 * 24 * 7));
          if (weeks === 0) {
            statusLabel = 'Assigned today';
            status = 'warning';
          } else if (weeks === 1) {
            statusLabel = 'Assigned 1w ago';
            status = 'warning';
          } else {
            statusLabel = `Assigned ${weeks}w ago`;
            status = weeks >= 4 ? 'success' : 'neutral';
          }
        } else {
          statusLabel = 'Never assigned';
          status = 'neutral';
        }

        return {
          value: s.id,
          label: s.name,
          subLabel: s.isGuest ? `Guest • ${s.congregation}` : s.congregation,
          statusLabel,
          status
        };
      });

    candidateOptions.unshift({ value: '', label: 'Select...', subLabel: '', statusLabel: '', status: 'neutral' });
    return candidateOptions;
  };

  const getAssignmentConflicts = (assignment: Assignment) => {
    const assigned: { roleName: string; id: string; isAuditorium: boolean }[] = [];
    if (assignment.chairmanId) assigned.push({ roleName: 'Chairman', id: assignment.chairmanId, isAuditorium: false });
    if (assignment.conductorId) assigned.push({ roleName: 'WT Conductor', id: assignment.conductorId, isAuditorium: false });
    if (assignment.readerId) assigned.push({ roleName: 'WT Reader', id: assignment.readerId, isAuditorium: false });
    if (assignment.speakerId) assigned.push({ roleName: 'Public Speaker', id: assignment.speakerId, isAuditorium: false });
    if (assignment.entranceAttendantId) assigned.push({ roleName: 'Entrance Attendant', id: assignment.entranceAttendantId, isAuditorium: false });
    if (assignment.auditoriumAttendantId) assigned.push({ roleName: 'Auditorium Attendant', id: assignment.auditoriumAttendantId, isAuditorium: true });
    if (assignment.micServerIds && assignment.micServerIds.length > 0) {
      assignment.micServerIds.forEach((mId, idx) => {
        if (mId) assigned.push({ roleName: `Mic ${idx + 1}`, id: mId, isAuditorium: false });
      });
    }

    const counts: Record<string, { roleName: string; isAuditorium: boolean }[]> = {};
    assigned.forEach(item => {
      if (!counts[item.id]) counts[item.id] = [];
      counts[item.id].push(item);
    });

    const conflictList: string[] = [];
    Object.entries(counts).forEach(([id, items]) => {
      // Auditorium Attendant role can be double-booked with any other role without conflict
      const nonAuditoriumRoles = items.filter(it => !it.isAuditorium);
      if (nonAuditoriumRoles.length > 1) {
        const brotherName = speakers.find(s => s.id === id)?.name || 'Brother';
        conflictList.push(`${brotherName} (${nonAuditoriumRoles.map(r => r.roleName).join(' & ')})`);
      }
    });

    return conflictList;
  };

  const handleExport = (months: number) => {
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
        setIsExportMenuOpen(false);
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
    setIsExportMenuOpen(false);
  };

  const nextAssignment = assignments.filter(a => new Date(a.date) >= new Date(new Date().setDate(new Date().getDate() - 1))).sort((a,b) => a.date.localeCompare(b.date))[0];
  const nextSpeaker = speakers.find(s => s.id === nextAssignment?.speakerId);
  const nextOutline = outlines.find(o => o.id === nextAssignment?.outlineId);
  const nextHost = speakers.find(s => s.id === nextAssignment?.hostSpeakerId);

  const renderAssignmentCard = (id: string | null) => {
    if (!id) return null;
    const a = assignments.find(assign => assign.id === id);
    if (!a) return null;
    const s = speakers.find(s => s.id === a.speakerId);
    const o = outlines.find(o => o.id === a.outlineId);
    const h = speakers.find(s => s.id === a.hostSpeakerId);

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col space-y-2">
            <div className="flex items-center text-indigo-600 font-semibold text-sm">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Speaker</span>
                <span className="text-slate-800 font-medium truncate block max-w-full" title={s?.name}>{s ? s.name : 'Unassigned'}</span>
                {s && <span className="text-xs text-slate-500 ml-2 truncate block max-w-full">({s.congregation})</span>}
                {h && <div className="text-xs text-indigo-600 mt-1 truncate">Invited by: {h.name}</div>}
            </div>
            <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Outline</span>
                <span className="text-slate-800 text-sm truncate block max-w-full">{o ? `#${o.id} - ${o.title}` : 'No Outline'}</span>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Print Schedule Arrangement Modal */}
      {isPrintModalOpen && createPortal(
        <PrintScheduleModal
          assignments={assignments}
          speakers={speakers}
          outlines={outlines}
          settings={settings}
          viewDate={viewDate}
          onClose={() => setIsPrintModalOpen(false)}
        />,
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





      {/* Dark Hero Action Card & Toolbar */}
      <div className="bg-[#18181b] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Subtle Decorative Geometric Circles */}
        <div className="absolute -right-8 -bottom-8 w-56 h-56 border border-zinc-700/30 rounded-full pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-80 h-80 border border-zinc-700/15 rounded-full pointer-events-none" />

        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-300 font-medium">
            {nextAssignment 
              ? `Next Meeting: ${new Date(nextAssignment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
              : 'Next Meeting Arrangement'}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {nextSpeaker ? nextSpeaker.name : 'Speaker Needed'}
            {nextSpeaker && <span className="text-base text-zinc-400 font-normal ml-3">from {nextSpeaker.congregation}</span>}
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

        <div className="flex flex-wrap items-center gap-3.5 z-10 shrink-0 w-full md:w-auto">
          <button 
            onClick={handleAutoFill}
            className="flex-1 md:flex-initial px-6 py-3.5 rounded-full bg-[#c7d2fe] hover:bg-[#b4c6fc] text-[#1e1b4b] font-extrabold text-sm shadow-md transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Icon name="sync" className="text-xl" />
            Auto-Rotate Now
          </button>
          <button 
            onClick={handleApplyAuthorityRoles}
            className="px-5 py-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-zinc-700 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center gap-2.5 shadow-sm"
          >
            <Icon name="workspace_premium" className="text-xl text-amber-400" />
            Authority
          </button>
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="px-5 py-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-zinc-700 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer flex items-center gap-2.5 shadow-sm"
          >
            <Icon name="print" className="text-xl" />
            Print
          </button>
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-rose-400 flex items-center justify-center border border-zinc-700 transition-all active:scale-95 hover:scale-105 cursor-pointer shadow-sm shrink-0"
            title={`Clear unlocked assignments for ${formatViewMonth(viewDate)}`}
          >
            <Icon name="delete" className="text-xl" />
          </button>
        </div>
      </div>

       <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 w-full">
                
                {/* LEFT GROUP: Back to Today */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button onClick={handleToday} className="text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-2 cursor-pointer rounded-lg transition-colors whitespace-nowrap">
                    Back to Today
                  </button>
                </div>

                {/* CENTER GROUP: Cluster Focus Filter Icon Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 p-1.5 rounded-2xl shadow-xs">
                  {[
                    { id: 'all', label: 'All Roles', icon: 'grid_view' },
                    { id: 'presiding', label: '1. Presiding (Chairman)', icon: 'gavel' },
                    { id: 'meeting', label: '2. Weekend Meeting (Speaker, Conductor, Reader)', icon: 'record_voice_over' },
                    { id: 'support', label: '3. Support Roster (Attendants & Mic)', icon: 'support_agent' }
                  ].map(f => {
                    const isActive = roleFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setRoleFilter(f.id)}
                        title={f.label}
                        aria-label={f.label}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-md scale-105' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon name={f.icon} className="text-xl" />
                      </button>
                    );
                  })}
                </div>

                {/* RIGHT GROUP: Export Dropdown + Icon-Only Visible Columns Dropdown + Month Date Navigator */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  {/* Original Export Pill Dropdown */}
                  <div className="relative" ref={exportMenuRef}>
                    <button 
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      title="Export CSV Schedule"
                      aria-label="Export Schedule"
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>Export</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isExportMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="py-1">
                          <button onClick={() => handleExport(1)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Current Month</button>
                          <button onClick={() => handleExport(3)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 3 Months</button>
                          <button onClick={() => handleExport(6)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Next 6 Months</button>
                          <div className="border-t border-slate-100 dark:border-zinc-800 my-1"></div>
                          <button onClick={() => handleExport(0)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">All Upcoming</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Icon-Only Visible Columns Dropdown (44x44px Hitbox) */}
                  <div className="relative" ref={columnMenuRef}>
                    <button
                      onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                      title={`Visible Columns (${visibleRoles.length}/${ALL_DASHBOARD_ROLES.length})`}
                      aria-label="Visible Columns Filter"
                      className="w-11 h-11 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
                    >
                      <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </button>

                    {isColumnMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Dashboard Columns</span>
                          <div className="flex gap-2 text-[10px]">
                            <button
                              onClick={() => setVisibleRoles(ALL_DASHBOARD_ROLES.map(r => r.key))}
                              className="text-indigo-600 font-bold hover:underline"
                            >
                              All
                            </button>
                            <button
                              onClick={() => setVisibleRoles([])}
                              className="text-slate-400 font-bold hover:underline"
                            >
                              None
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {ALL_DASHBOARD_ROLES.map(role => {
                            const isChecked = visibleRoles.includes(role.key);
                            return (
                              <button
                                key={role.key}
                                onClick={() => toggleVisibleRole(role.key)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-zinc-800 transition"
                              >
                                <span>{role.label}</span>
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Original Month Date Navigator Pill */}
                  <div className="flex items-center bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 rounded-full px-4 py-2 shadow-sm gap-3">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-600 dark:text-slate-300 transition cursor-pointer" aria-label="Previous Month">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight whitespace-nowrap min-w-[120px] text-center">
                      {formatViewMonth(viewDate)}
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-600 dark:text-slate-300 transition cursor-pointer" aria-label="Next Month">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

           {/* Mobile List View (Hidden on MD+) */}
           <div className="md:hidden space-y-4 pb-4">
                {displayedAssignments.map((assignment, index) => {
                     const currentSpeaker = speakers.find(s => s.id === assignment.speakerId);
                     const hostSpeaker = speakers.find(s => s.id === assignment.hostSpeakerId);
                     const assignmentOutline = outlines.find(o => o.id === assignment.outlineId);
                     const filledIndex = filledIds.indexOf(assignment.id);
                     const isJustFilled = filledIndex !== -1;
                     const isExiting = exitingIds.includes(assignment.id);
                     const exitingIndex = exitingIds.indexOf(assignment.id);
                     
                     // Current Week Highlight Logic
                     const isThisWeek = isUpcomingSunday(assignment.date);

                     const validSpeakerOptions = speakers.filter(s => !s.isGuest || s.id === assignment.speakerId);
                     const speakerOptions = validSpeakerOptions.map(s => ({
                         value: s.id,
                         label: s.name,
                         subLabel: s.isGuest ? `Guest • ${s.congregation}` : s.congregation
                     }));
                     speakerOptions.unshift({ value: '', label: 'Select Speaker...', subLabel: '' });

                     let outlineOptions: any[] = outlines.map(out => {
                         const effectiveLastUsed = getOutlineEffectiveLastUsed(out, assignment.id);
                         const isCool = (_out: Outline, effectiveLastUsed: string | null) => {
                             if (!effectiveLastUsed) return true;
                             const usedDate = new Date(effectiveLastUsed);
                             const assignDate = new Date(assignment.date);
                             if (usedDate >= assignDate) return false;
                             const diffMonths = (assignDate.getFullYear() - usedDate.getFullYear()) * 12 + (assignDate.getMonth() - usedDate.getMonth());
                             return diffMonths >= settings.cooldownMonths;
                         };
                         const isCoolStatus = isCool(out, effectiveLastUsed);
                         let status: 'success' | 'warning' | 'neutral' = 'neutral';
                         let statusLabel = '';
                         if (!effectiveLastUsed) {
                              status = 'success';
                              statusLabel = 'Never Used';
                          } else {
                              const dateStr = new Date(effectiveLastUsed).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                              statusLabel = `Last used: ${dateStr}`;
                              status = isCoolStatus ? 'success' : 'warning';
                          }
                          return { value: out.id, label: `#${out.id} - ${out.title}`, status, statusLabel };
                     });
                     outlineOptions.unshift({ value: 0, label: 'Select Outline...', subLabel: undefined });

                     const conflicts = getAssignmentConflicts(assignment);

                     return (
                         <div 
                             key={assignment.id} 
                             style={isExiting ? { animationDelay: `${exitingIndex * 0.05}s` } : (isJustFilled ? { animationDelay: `${filledIndex * 0.05}s` } : { animationDelay: `${index * 0.03}s` })}
                             className={`bg-card text-card-foreground rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden 
                                 ${isJustFilled ? 'animate-pop-in' : ''} 
                                 ${isExiting 
                                     ? 'animate-fade-out-up opacity-0 pointer-events-none' 
                                     : `animate-enter-slide opacity-0 ${isThisWeek ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-xs bg-amber-500/10' : 'border-border shadow-xs'}`
                                 }`}
                         >
                             {isThisWeek && (
                                 <div className="absolute -right-12 top-6 rotate-45 bg-amber-400 text-amber-950 text-[10px] font-extrabold py-1 w-40 text-center shadow-xs z-10 uppercase tracking-wider">
                                     THIS WEEK
                                 </div>
                             )}

                             <div className="flex justify-between items-start mb-4">
                                 <div className="flex flex-col">
                                     <span className={`font-bold text-lg ${isThisWeek ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                         {new Date(assignment.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                     </span>
                                     <span className="text-xs text-muted-foreground font-medium">
                                         {new Date(assignment.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric'})}
                                     </span>
                                     <div className="mt-2">
                                         <button
                                             type="button"
                                             onClick={() => handleCopyBrotherNames(assignment)}
                                             className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                                             title="Copy non-speaker brother names to clipboard"
                                         >
                                             <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                             <span>Copy Names</span>
                                         </button>
                                     </div>
                                 </div>
                                 <div className="flex space-x-2 mr-6">
                                     <Button 
                                         size="icon"
                                         variant={assignment.locked ? "secondary" : "outline"}
                                         onClick={() => toggleLock(assignment.id)}
                                         className="h-10 w-10 min-h-[44px] min-w-[44px]"
                                         aria-label={assignment.locked ? "Unlock assignment" : "Lock assignment"}
                                         title={assignment.locked ? "Unlock assignment" : "Lock assignment"}
                                     >
                                         <Icon name={assignment.locked ? "lock" : "lock_open"} className="text-base" />
                                     </Button>
                                 </div>
                             </div>

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

                             <div className="space-y-4">
                                 {/* Duty Roster Grid for Mobile */}
                                 <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-3">
                                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex justify-between items-center">
                                     <span>Weekend Duty Roster</span>
                                     {assignment.isSpecialEvent && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full">Assembly / Special Event</span>}
                                   </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                     {/* Chairman */}
                                     {(roleFilter === 'all' || roleFilter === 'chairman') && visibleRoles.includes('chairman') && (
                                       <div>
                                         <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Chairman</span>
                                         <CustomSelect
                                           options={getBrotherCandidateOptions('chairman', assignment.date, assignment.chairmanId)}
                                           value={assignment.chairmanId || ''}
                                           onChange={(val) => {
                                             const updated = assignments.map(a => a.id === assignment.id ? { ...a, chairmanId: val || null } : a);
                                             updateAssignments(updated);
                                           }}
                                           disabled={assignment.locked}
                                           placeholder="Select Chairman..."
                                         />
                                       </div>
                                     )}

                                     {/* WT Conductor */}
                                     {(roleFilter === 'all' || roleFilter === 'conductor') && visibleRoles.includes('conductor') && (
                                       <div>
                                         <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">WT Conductor</span>
                                         <CustomSelect
                                           options={getBrotherCandidateOptions('conductor', assignment.date, assignment.conductorId)}
                                           value={assignment.conductorId || ''}
                                           onChange={(val) => {
                                             const updated = assignments.map(a => a.id === assignment.id ? { ...a, conductorId: val || null } : a);
                                             updateAssignments(updated);
                                           }}
                                           disabled={assignment.locked}
                                           placeholder="Select Conductor..."
                                         />
                                       </div>
                                     )}

                                     {/* WT Reader */}
                                     {(roleFilter === 'all' || roleFilter === 'reader') && visibleRoles.includes('reader') && (
                                       <div>
                                         <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">WT Reader</span>
                                         <CustomSelect
                                           options={getBrotherCandidateOptions('reader', assignment.date, assignment.readerId)}
                                           value={assignment.readerId || ''}
                                           onChange={(val) => {
                                             const updated = assignments.map(a => a.id === assignment.id ? { ...a, readerId: val || null } : a);
                                             updateAssignments(updated);
                                           }}
                                           disabled={assignment.locked}
                                           placeholder="Select Reader..."
                                         />
                                       </div>
                                     )}

                                     {/* Entrance Attendant */}
                                     {(roleFilter === 'all' || roleFilter === 'attendants') && visibleRoles.includes('attendants') && (
                                       <div>
                                         <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Entrance Attendant</span>
                                         <CustomSelect
                                           options={getBrotherCandidateOptions('attendant_entrance', assignment.date, assignment.entranceAttendantId)}
                                           value={assignment.entranceAttendantId || ''}
                                           onChange={(val) => {
                                             const updated = assignments.map(a => a.id === assignment.id ? { ...a, entranceAttendantId: val || null } : a);
                                             updateAssignments(updated);
                                           }}
                                           disabled={assignment.locked}
                                           placeholder="Select Attendant..."
                                         />
                                       </div>
                                     )}

                                     {/* Auditorium Attendant */}
                                     {(roleFilter === 'all' || roleFilter === 'attendants') && visibleRoles.includes('attendants') && (
                                       <div>
                                         <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Auditorium Attendant</span>
                                         <CustomSelect
                                           options={getBrotherCandidateOptions('attendant_auditorium', assignment.date, assignment.auditoriumAttendantId)}
                                           value={assignment.auditoriumAttendantId || ''}
                                           onChange={(val) => {
                                             const updated = assignments.map(a => a.id === assignment.id ? { ...a, auditoriumAttendantId: val || null } : a);
                                             updateAssignments(updated);
                                           }}
                                           disabled={assignment.locked}
                                           placeholder="Select Attendant..."
                                         />
                                       </div>
                                     )}

                                     {/* Mic Servers */}
                                     {isRoleInFilter('mic') && visibleRoles.includes('mic') && (
                                       <>
                                         <div>
                                           <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Mic Server 1</span>
                                           <CustomSelect
                                             options={getBrotherCandidateOptions('mic', assignment.date, assignment.micServerIds?.[0] || null)}
                                             value={assignment.micServerIds?.[0] || ''}
                                             onChange={(val) => {
                                               const currentSecond = assignment.micServerIds?.[1] || null;
                                               const newMics = val ? [val, ...(currentSecond ? [currentSecond] : [])] : (currentSecond ? [currentSecond] : []);
                                               const updated = assignments.map(a => a.id === assignment.id ? { ...a, micServerIds: newMics } : a);
                                               updateAssignments(updated);
                                             }}
                                             disabled={assignment.locked}
                                             placeholder="Mic Server 1..."
                                           />
                                         </div>
                                         <div>
                                           <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-1">Mic Server 2</span>
                                           <CustomSelect
                                             options={getBrotherCandidateOptions('mic', assignment.date, assignment.micServerIds?.[1] || null)}
                                             value={assignment.micServerIds?.[1] || ''}
                                             onChange={(val) => {
                                               const currentFirst = assignment.micServerIds?.[0] || null;
                                               const newMics = currentFirst ? [currentFirst, ...(val ? [val] : [])] : (val ? [val] : []);
                                               const updated = assignments.map(a => a.id === assignment.id ? { ...a, micServerIds: newMics } : a);
                                               updateAssignments(updated);
                                             }}
                                             disabled={assignment.locked}
                                             placeholder="Mic Server 2..."
                                           />
                                         </div>
                                       </>
                                     )}
                                   </div>
                                 </div>

                                 {isRoleInFilter('speaker') && visibleRoles.includes('speaker') && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Public Talk Speaker</span>
                                            <div className="flex items-center gap-1.5">
                                                {!assignment.locked && !assignment.speakerLocked && (
                                                    <button onClick={() => openGuestModal(assignment.id)} className="text-xs font-semibold text-primary flex items-center hover:bg-primary/10 px-2 py-0.5 rounded transition">
                                                        <Icon name="person_add" className="text-sm mr-1" /> Add Guest
                                                    </button>
                                                )}
                                                {!assignment.locked && (
                                                    <button 
                                                      onClick={() => toggleSpeakerLock(assignment.id)}
                                                      className={`text-xs font-bold flex items-center px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                                                        assignment.speakerLocked 
                                                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400' 
                                                          : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                                                      }`}
                                                      title={assignment.speakerLocked ? 'Speaker Locked (Click to unlock)' : 'Lock Speaker'}
                                                    >
                                                        <Icon name={assignment.speakerLocked ? "lock" : "lock_open"} className={`text-xs mr-1 ${assignment.speakerLocked ? 'text-amber-500' : ''}`} />
                                                        <span>{assignment.speakerLocked ? 'Locked' : 'Lock'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {assignment.locked || assignment.speakerLocked ? (
                                            <div className={`flex items-center p-3 rounded-xl border ${assignment.speakerLocked ? 'bg-amber-500/5 border-amber-500/30' : 'bg-muted/40 border-border'}`}>
                                                <div className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${currentSpeaker ? 'bg-primary' : 'bg-muted'}`}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                      <span className="truncate">{currentSpeaker?.name || 'Unassigned'}</span>
                                                      {assignment.speakerLocked && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                                                          Speaker Locked
                                                        </span>
                                                      )}
                                                    </div>
                                                    {hostSpeaker && <div className="text-xs text-muted-foreground mt-0.5">Invited by: {hostSpeaker.name}</div>}
                                                </div>
                                            </div>
                                        ) : (
                                            <CustomSelect 
                                                options={getBrotherCandidateOptions('speaker', assignment.date, assignment.speakerId)}
                                                value={assignment.speakerId || ''}
                                                onChange={(val) => handleSpeakerChange(assignment.id, val === '' ? '' : val)}
                                                placeholder="Select Speaker..."
                                            />
                                        )}
                                    </div>
                                  )}

                                 {isRoleInFilter('speaker') && visibleRoles.includes('speaker') && (
                                   <div>
                                       <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Outline</span>
                                       {assignment.locked ? (
                                           <div className="p-3 bg-muted/40 rounded-xl border border-border">
                                                {assignmentOutline ? (
                                                    <>
                                                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded mr-2 border border-primary/20">#{assignmentOutline.id}</span>
                                                        <span className="text-sm font-medium text-foreground">{assignmentOutline.title}</span>
                                                    </>
                                                ) : assignment.customTalkTitle ? (
                                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{assignment.customTalkTitle}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">No outline selected</span>
                                                )}
                                           </div>
                                       ) : (
                                           <div className="space-y-2">
                                               <CustomSelect 
                                                   options={outlineOptions}
                                                   value={assignment.outlineId || 0}
                                                   onChange={(val) => handleOutlineChange(assignment.id, Number(val))}
                                                   disabled={!assignment.speakerId}
                                                   placeholder={assignment.speakerId ? "Select Standard Outline..." : "First select speaker"}
                                               />
                                               <Input
                                                   type="text"
                                                   value={assignment.customTalkTitle || ''}
                                                   onChange={(e) => {
                                                       const val = e.target.value;
                                                       const updated = assignments.map(a => a.id === assignment.id ? { ...a, customTalkTitle: val } : a);
                                                       updateAssignments(updated);
                                                   }}
                                                   disabled={!assignment.speakerId}
                                                   placeholder="Or enter Special Talk Title..."
                                                   className="text-xs"
                                               />
                                           </div>
                                       )}
                                   </div>
                                 )}
                             </div>
                         </div>
                     );
                })}
                {displayedAssignments.length === 0 && (
                     <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">No assignments found.</div>
                )}
           </div>           {/* Desktop Table View */}
           <div className="hidden md:block bg-card rounded-2xl shadow-xs border border-border overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="min-w-[960px] w-full text-left text-xs border-collapse">
                        <thead className="bg-muted/40 border-b border-border">
                            {/* Single Header Role Row */}
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
                                const assignmentOutline = outlines.find(o => o.id === assignment.outlineId);
                                const isExiting = exitingIds.includes(assignment.id);
                                const exitingIndex = exitingIds.indexOf(assignment.id);
                                const isThisWeek = isUpcomingSunday(assignment.date);
                                const conflicts = getAssignmentConflicts(assignment);

                                return (
                                    <tr 
                                        key={assignment.id} 
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
                                                This Week
                                              </Badge>
                                            )}
                                            {conflicts.length > 0 && (
                                              <div className="mt-2 p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-600 dark:text-rose-400 text-[10px] font-bold shadow-2xs block w-fit" title={`Conflict: ${conflicts.join(', ')}`}>
                                                <span className="flex items-center gap-1"><Icon name="warning" className="text-xs" /> Double-booked</span>
                                              </div>
                                            )}
                                            <div className="mt-3 pt-1">
                                              <button
                                                type="button"
                                                onClick={() => handleCopyBrotherNames(assignment)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                title="Copy non-speaker brother names to clipboard"
                                              >
                                                <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                                <span>Copy Names</span>
                                              </button>
                                            </div>
                                        </td>

                                        {/* Chairman */}
                                        {isRoleInFilter('chairman') && visibleRoles.includes('chairman') && (
                                          <td className="px-3 py-3 align-top">
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('chairman', assignment.date, assignment.chairmanId)}
                                              value={assignment.chairmanId || ''}
                                              onChange={(val) => {
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, chairmanId: val || null } : a);
                                                updateAssignments(updated);
                                              }}
                                              disabled={assignment.locked}
                                              placeholder="Chairman..."
                                            />
                                          </td>
                                        )}

                                        {/* Conductor */}
                                        {isRoleInFilter('conductor') && visibleRoles.includes('conductor') && (
                                          <td className="px-3 py-3 align-top">
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('conductor', assignment.date, assignment.conductorId)}
                                              value={assignment.conductorId || ''}
                                              onChange={(val) => {
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, conductorId: val || null } : a);
                                                updateAssignments(updated);
                                              }}
                                              disabled={assignment.locked}
                                              placeholder="Conductor..."
                                            />
                                          </td>
                                        )}

                                        {/* Reader */}
                                        {isRoleInFilter('reader') && visibleRoles.includes('reader') && (
                                          <td className="px-3 py-3 align-top">
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('reader', assignment.date, assignment.readerId)}
                                              value={assignment.readerId || ''}
                                              onChange={(val) => {
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, readerId: val || null } : a);
                                                updateAssignments(updated);
                                              }}
                                              disabled={assignment.locked}
                                              placeholder="Reader..."
                                            />
                                          </td>
                                        )}

                                        {/* Speaker & Theme */}
                                         {isRoleInFilter('speaker') && visibleRoles.includes('speaker') && (
                                           <td className="px-3 py-3 align-top space-y-1">
                                             <CustomSelect
                                               options={getBrotherCandidateOptions('speaker', assignment.date, assignment.speakerId)}
                                               value={assignment.speakerId || ''}
                                               onChange={(val) => handleSpeakerChange(assignment.id, val || '')}
                                               disabled={assignment.locked || assignment.speakerLocked}
                                               placeholder="Speaker..."
                                             />
                                             <div className="flex items-center gap-1.5 mt-1">
                                               {!assignment.locked && !assignment.speakerLocked && (
                                                 <button
                                                   type="button"
                                                   onClick={() => openGuestModal(assignment.id)}
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
                                                   onClick={() => toggleSpeakerLock(assignment.id)}
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
                                             {assignmentOutline ? (
                                               <div className="text-[10px] text-primary font-semibold bg-primary/10 p-1.5 rounded-md border border-primary/20">
                                                 #{assignmentOutline.id} - {assignmentOutline.title}
                                               </div>
                                             ) : assignment.customTalkTitle ? (
                                               <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20">
                                                 {assignment.customTalkTitle}
                                               </div>
                                             ) : null}
                                           </td>
                                         )}

                                        {/* Attendants */}
                                        {isRoleInFilter('attendants') && visibleRoles.includes('attendants') && (
                                          <td className="px-3 py-3 align-top space-y-1.5">
                                            <div className="text-[10px] text-muted-foreground font-bold uppercase">Entrance</div>
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('attendant_entrance', assignment.date, assignment.entranceAttendantId)}
                                              value={assignment.entranceAttendantId || ''}
                                              onChange={(val) => {
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, entranceAttendantId: val || null } : a);
                                                updateAssignments(updated);
                                              }}
                                              disabled={assignment.locked}
                                              placeholder="Entrance..."
                                            />
                                            <div className="text-[10px] text-muted-foreground font-bold uppercase pt-1">Auditorium</div>
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('attendant_auditorium', assignment.date, assignment.auditoriumAttendantId)}
                                              value={assignment.auditoriumAttendantId || ''}
                                              onChange={(val) => {
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, auditoriumAttendantId: val || null } : a);
                                                updateAssignments(updated);
                                              }}
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
                                              options={getBrotherCandidateOptions('mic', assignment.date, assignment.micServerIds?.[0] || null)}
                                              value={assignment.micServerIds?.[0] || ''}
                                              onChange={(val) => {
                                                const currentSecond = assignment.micServerIds?.[1] || null;
                                                const newMics = val ? [val, ...(currentSecond ? [currentSecond] : [])] : (currentSecond ? [currentSecond] : []);
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, micServerIds: newMics } : a);
                                                updateAssignments(updated);
                                              }}
                                              disabled={assignment.locked}
                                              placeholder="Mic 1..."
                                            />
                                            <div className="text-[10px] text-muted-foreground font-bold uppercase pt-1">Mic 2</div>
                                            <CustomSelect
                                              options={getBrotherCandidateOptions('mic', assignment.date, assignment.micServerIds?.[1] || null)}
                                              value={assignment.micServerIds?.[1] || ''}
                                              onChange={(val) => {
                                                const currentFirst = assignment.micServerIds?.[0] || null;
                                                const newMics = currentFirst ? [currentFirst, ...(val ? [val] : [])] : (val ? [val] : []);
                                                const updated = assignments.map(a => a.id === assignment.id ? { ...a, micServerIds: newMics } : a);
                                                updateAssignments(updated);
                                              }}
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
                                              onClick={() => toggleLock(assignment.id)}
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
                            })}
                        </tbody>
                    </table>
                </div>
           </div>

           {displayedAssignments.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No assignments found for this month.</div>
           )}
      </div>
    </div>
  );
};