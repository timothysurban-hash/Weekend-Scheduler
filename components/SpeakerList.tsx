import React, { useState, useEffect, useRef } from 'react';
import { Speaker, Outline, Assignment, DutyRole, SpiritualStatus } from '../types';
import { isBrotherQualifiedForRole, getCandidateStatus, getDefaultQualificationsForStatus } from '../utils/dateUtils';
import { MapPin, Trash2, Edit2, Check, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Icon } from './ui/Icon';

interface SpeakerListProps {
  speakers: Speaker[];
  outlines: Outline[];
  updateSpeakers: (s: Speaker[]) => void;
  assignments: Assignment[];
}

const ALL_ROLES: { id: DutyRole; label: string; shortLabel: string; color: string }[] = [
  { id: 'speaker', label: 'Speaker', shortLabel: 'Speaker', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'chairman', label: 'Chairman', shortLabel: 'Chairman', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'conductor', label: 'WT Conductor', shortLabel: 'Conductor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'reader', label: 'WT Reader', shortLabel: 'Reader', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'attendant_entrance', label: 'Entrance Attendant', shortLabel: 'Entrance', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'attendant_auditorium', label: 'Auditorium Attendant', shortLabel: 'Auditorium', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'mic', label: 'Mic Server', shortLabel: 'Mic', color: 'bg-rose-50 text-rose-700 border-rose-200' }
];

const SORT_OPTIONS: { id: 'rotation' | 'name_asc' | 'name_desc' | 'status' | 'last_assigned'; label: string }[] = [
  { id: 'rotation', label: 'Rotation Sequence' },
  { id: 'name_asc', label: 'Name (A to Z)' },
  { id: 'name_desc', label: 'Name (Z to A)' },
  { id: 'status', label: 'Spiritual Status' },
  { id: 'last_assigned', label: 'Last Assigned Date' }
];

const SPIRITUAL_STATUS_OPTIONS: { id: SpiritualStatus; label: string }[] = [
  { id: 'elder', label: 'Elder' },
  { id: 'ms', label: 'Ministerial Servant (MS)' },
  { id: 'publisher', label: 'Baptized Publisher' },
  { id: 'up', label: 'Unbaptized Publisher (UP)' }
];

export const SpeakerList: React.FC<SpeakerListProps> = ({ speakers, outlines: _outlines, updateSpeakers, assignments }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'elder' | 'ms' | 'publisher' | 'up'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rotation' | 'name_asc' | 'name_desc' | 'status' | 'last_assigned'>('rotation');
  
  // Dashboard Style Dropdown Menu State
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [isNewStatusMenuOpen, setIsNewStatusMenuOpen] = useState(false);
  const newStatusMenuRef = useRef<HTMLDivElement>(null);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const editStatusMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (newStatusMenuRef.current && !newStatusMenuRef.current.contains(e.target as Node)) {
        setIsNewStatusMenuOpen(false);
      }
      if (editStatusMenuRef.current && !editStatusMenuRef.current.contains(e.target as Node)) {
        setIsEditStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Deletion State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpiritualStatus, setEditSpiritualStatus] = useState<SpiritualStatus>('publisher');
  const [editQualifications, setEditQualifications] = useState<DutyRole[]>([]);

  const [newSpeaker, setNewSpeaker] = useState<{
    name: string;
    congregation: string;
    isGuest: boolean;
    spiritualStatus: SpiritualStatus;
    qualifications: DutyRole[];
  }>({
    name: '',
    congregation: 'Green Heights',
    isGuest: false,
    spiritualStatus: 'publisher',
    qualifications: getDefaultQualificationsForStatus('publisher')
  });

  // Calculate the effective last date and whether it was a hosting duty
  const getLastAssignmentInfo = (speaker: Speaker) => {
    let maxDate = speaker.lastAssigned || '';
    let isHost = false;

    const speakerAssignments = assignments.filter(a => 
      a.speakerId === speaker.id || 
      a.chairmanId === speaker.id || 
      a.conductorId === speaker.id ||
      a.readerId === speaker.id ||
      a.entranceAttendantId === speaker.id ||
      a.auditoriumAttendantId === speaker.id ||
      a.micServerIds?.includes(speaker.id)
    );

    speakerAssignments.forEach(a => {
        if (a.date > maxDate) {
            maxDate = a.date;
            isHost = false;
        }
    });

    const hostedAssignments = assignments.filter(a => a.hostSpeakerId === speaker.id);
    hostedAssignments.forEach(a => {
        if (a.date > maxDate) {
            maxDate = a.date;
            isHost = true;
        }
    });

    return maxDate ? { date: maxDate, isHost } : null;
  };

  const handleAdd = () => {
    if (!newSpeaker.name) return;
    
    const maxSort = speakers.reduce((max, s) => (s.sortOrder ?? 0) > max ? (s.sortOrder ?? 0) : max, 0);

    const speaker: Speaker = {
        id: Math.random().toString(36).substr(2, 9),
        name: newSpeaker.name,
        congregation: newSpeaker.congregation || 'Green Heights',
        isGuest: newSpeaker.isGuest || false,
        unavailableDates: [],
        lastAssigned: null,
        sortOrder: maxSort + 1,
        spiritualStatus: newSpeaker.spiritualStatus,
        qualifications: newSpeaker.qualifications
    };
    updateSpeakers([...speakers, speaker]);
    setIsAdding(false);
    setNewSpeaker({ name: '', congregation: 'Green Heights', isGuest: false, spiritualStatus: 'publisher', qualifications: getDefaultQualificationsForStatus('publisher') });
  };

  const handleNewStatusChange = (status: SpiritualStatus) => {
    setNewSpeaker(prev => ({
      ...prev,
      spiritualStatus: status,
      qualifications: getDefaultQualificationsForStatus(status)
    }));
  };

  const handleEditStatusChange = (status: SpiritualStatus) => {
    setEditSpiritualStatus(status);
    setEditQualifications(getDefaultQualificationsForStatus(status));
  };

  const handleDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
        setExitingId(id);
        setTimeout(() => {
            const newSpeakers = speakers.filter(s => s.id !== id);
            updateSpeakers(newSpeakers);
            setDeleteConfirmId(null);
            setExitingId(null);
        }, 300);
    } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
    }
  };

  const startEditing = (speaker: Speaker) => {
      const status = getCandidateStatus(speaker);
      setEditingId(speaker.id);
      setEditName(speaker.name);
      setEditSpiritualStatus(status);
      setEditQualifications(speaker.qualifications || getDefaultQualificationsForStatus(status));
  };

  const saveEditing = (id: string) => {
      if (!editName.trim()) return;
      const updated = speakers.map(s => s.id === id ? { 
        ...s, 
        name: editName.trim(),
        spiritualStatus: editSpiritualStatus,
        qualifications: editQualifications
      } : s);
      updateSpeakers(updated);
      setEditingId(null);
  };

  const statusRank: Record<SpiritualStatus, number> = {
    elder: 1,
    ms: 2,
    publisher: 3,
    up: 4
  };

  const localSpeakers = speakers
    .filter(s => !s.isGuest)
    .filter(s => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(q);
        const congMatch = (s.congregation || '').toLowerCase().includes(q);
        if (!nameMatch && !congMatch) return false;
      }

      // 2. Spiritual Status Filter
      const status = getCandidateStatus(s);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      // 3. Qualification Role Filter
      if (roleFilter !== 'all') {
        if (!isBrotherQualifiedForRole(s, roleFilter as DutyRole)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'status') {
        const rankA = statusRank[getCandidateStatus(a)] || 99;
        const rankB = statusRank[getCandidateStatus(b)] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }
      if (sortBy === 'last_assigned') {
        const lastA = getLastAssignmentInfo(a)?.date || '';
        const lastB = getLastAssignmentInfo(b)?.date || '';
        if (!lastA && !lastB) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (!lastA) return -1;
        if (!lastB) return 1;
        return lastA.localeCompare(lastB);
      }
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  return (
    <div className="space-y-8">
      {/* Top Toolbar with Search, Status & Role Filters, and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Icon name="search" className="text-xl text-slate-400 dark:text-slate-500 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search brother name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 text-sm font-semibold bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700/70 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 transition-all shadow-xs hover:shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <Icon name="close" className="text-lg" />
              </button>
            )}
          </div>

          {/* Spiritual Status Filters */}
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-zinc-800/90 rounded-full border border-slate-200/90 dark:border-zinc-700/70 shadow-xs shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('elder')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'elder'
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Elders
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ms')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ms'
                  ? 'bg-blue-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              MS
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('publisher')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'publisher'
                  ? 'bg-emerald-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Publishers
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('up')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'up'
                  ? 'bg-amber-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              UP
            </button>
          </div>

          {/* Qualification Role Filter (Dashboard Column Dropdown Style) */}
          <div className="relative shrink-0" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center justify-between gap-2.5 px-5 py-2.5 bg-white dark:bg-[#18181b] border border-slate-200/90 dark:border-zinc-800 text-slate-700 dark:text-slate-200 font-extrabold text-sm rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
            >
              <span>
                {roleFilter === 'all' 
                  ? 'All Roles' 
                  : ALL_ROLES.find(r => r.id === roleFilter)?.label || 'All Roles'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoleMenuOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('all');
                    setIsRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-extrabold'
                      : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span>All Roles</span>
                  {roleFilter === 'all' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>

                <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

                {ALL_ROLES.map(role => {
                  const isSelected = roleFilter === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setRoleFilter(role.id);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-extrabold'
                          : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span>{role.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort Dropdown (Custom Popover Style matching All Roles) */}
          <div className="relative shrink-0" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center justify-between gap-2.5 px-5 py-2.5 bg-white dark:bg-[#18181b] border border-slate-200/90 dark:border-zinc-800 text-slate-700 dark:text-slate-200 font-extrabold text-sm rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icon name="swap_vert" className="text-base text-slate-500 dark:text-slate-400" />
                <span>
                  {SORT_OPTIONS.find(s => s.id === sortBy)?.label || 'Rotation Sequence'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {SORT_OPTIONS.map(opt => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-extrabold'
                          : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Filter Clear Helper */}
          {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery || sortBy !== 'rotation') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchQuery('');
                setSortBy('rotation');
              }}
              className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0 ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-2.5 rounded-full bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-extrabold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-zinc-800 dark:border-zinc-200 whitespace-nowrap"
          >
            <Icon name="add" className="text-lg" />
            New Brother
          </button>
        </div>
      </div>

      {/* Add New Brother Pop-up Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogHeader>
          <DialogTitle>Add New Brother</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white text-sm p-3 border outline-none transition font-semibold"
              placeholder="e.g. Jaballa, Jaymar"
              value={newSpeaker.name}
              onChange={(e) => setNewSpeaker({...newSpeaker, name: e.target.value})}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSpeaker.name) handleAdd();
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Spiritual Status</label>
            <div className="relative" ref={newStatusMenuRef}>
              <button
                type="button"
                onClick={() => setIsNewStatusMenuOpen(!isNewStatusMenuOpen)}
                className="w-full flex items-center justify-between gap-2.5 px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-semibold text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700/70 transition-all shadow-xs cursor-pointer"
              >
                <span>
                  {SPIRITUAL_STATUS_OPTIONS.find(s => s.id === newSpeaker.spiritualStatus)?.label || 'Select Status'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isNewStatusMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isNewStatusMenuOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-[100] p-1.5 space-y-0.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                  {SPIRITUAL_STATUS_OPTIONS.map(opt => {
                    const isSelected = newSpeaker.spiritualStatus === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          handleNewStatusChange(opt.id);
                          setIsNewStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-extrabold'
                            : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!newSpeaker.name}>Save Brother</Button>
        </DialogFooter>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {localSpeakers.map((speaker, idx) => {
            const lastInfo = getLastAssignmentInfo(speaker);
            const isDeleting = deleteConfirmId === speaker.id;
            const isExiting = exitingId === speaker.id;
            const status = getCandidateStatus(speaker);

            const statusBadgeStyle = {
              elder: 'bg-indigo-600 text-white',
              ms: 'bg-blue-600 text-white',
              publisher: 'bg-slate-700 text-white',
              up: 'bg-amber-600 text-white'
            }[status];

            const statusLabel = {
              elder: 'Elder',
              ms: 'MS',
              publisher: 'Publisher',
              up: 'UP'
            }[status];

            return (
                <Card 
                    key={speaker.id} 
                    style={isExiting ? { animationDelay: '0s' } : { animationDelay: `${idx * 0.05}s` }}
                    className={`group transition-all duration-300 flex flex-col relative rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 
                    ${isExiting 
                        ? 'animate-fade-out-scale pointer-events-none opacity-0 overflow-hidden' 
                        : 'animate-in fade-in duration-200 overflow-visible'}`}
                >
                  <CardContent className="p-6 pt-7 flex flex-col h-full justify-between gap-5">
                    <div>
                      {/* Top Header with Avatar, Name, Status Badge, and Quick Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-black text-xs shadow-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingId === speaker.id ? (
                              <div className="space-y-2">
                                <Input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-sm font-bold"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing(speaker.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()} 
                                />
                                <div className="flex items-center gap-2">
                                  <div className="relative shrink-0" ref={editStatusMenuRef}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditStatusOpen(!isEditStatusOpen);
                                      }}
                                      className="flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-extrabold text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/70 transition-all shadow-xs cursor-pointer"
                                    >
                                      <span>
                                        {SPIRITUAL_STATUS_OPTIONS.find(s => s.id === editSpiritualStatus)?.label || 'Select'}
                                      </span>
                                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isEditStatusOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isEditStatusOpen && (
                                      <div className="absolute left-0 mt-1.5 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] p-1.5 space-y-0.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                        {SPIRITUAL_STATUS_OPTIONS.map(opt => {
                                          const isSelected = editSpiritualStatus === opt.id;
                                          return (
                                            <button
                                              key={opt.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditStatusChange(opt.id);
                                                setIsEditStatusOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                                isSelected
                                                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-extrabold'
                                                  : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                                              }`}
                                            >
                                              <span>{opt.label}</span>
                                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <Button 
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); saveEditing(speaker.id); }}
                                    className="h-7 text-xs"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={speaker.name}>
                                    {speaker.name}
                                  </h3>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shadow-xs shrink-0 ${statusBadgeStyle}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                  <MapPin className="w-3 h-3 mr-1 shrink-0" />
                                  <span className="truncate">{speaker.congregation}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Quick Action Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {editingId !== speaker.id && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEditing(speaker); }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Edit Brother Name & Status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(isDeleting ? null : speaker.id); }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                              isDeleting 
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                                : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            }`}
                            title="Remove Brother"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Delete Confirmation Alert */}
                      {isDeleting && (
                        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl animate-in fade-in duration-200 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-rose-800 dark:text-rose-200">Delete this brother?</span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} 
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(speaker.id); }} 
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Clean Card Footer: Last Assignment */}
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Last Assignment</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {lastInfo ? new Date(lastInfo.date).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
            );
        })}
      </div>
    </div>
  );
};