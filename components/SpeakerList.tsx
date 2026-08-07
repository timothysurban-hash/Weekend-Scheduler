import React, { useState, useEffect, useRef } from 'react';
import { Speaker, Outline, Assignment, DutyRole } from '../types';
import { isBrotherQualifiedForRole } from '../utils/dateUtils';
import { PRESET_TAGS } from '../constants';
import { MapPin, Trash2, ArrowUp, ArrowDown, Edit2, Check, ShieldCheck, Tag, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
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

export const SpeakerList: React.FC<SpeakerListProps> = ({ speakers, outlines: _outlines, updateSpeakers, assignments }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'elder' | 'ms' | 'baptized'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Dashboard Style Dropdown Menu State
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Close role dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
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
  const [editQualifications, setEditQualifications] = useState<DutyRole[]>([]);
  const [editCustomTags, setEditCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Reorder State
  const [reorderList, setReorderList] = useState<Speaker[]>([]);

  const [newSpeaker, setNewSpeaker] = useState<{
    name: string;
    congregation: string;
    isGuest: boolean;
    qualifications: DutyRole[];
    customTags: string[];
  }>({
    name: '',
    congregation: 'Green Heights',
    isGuest: false,
    qualifications: ['speaker', 'chairman', 'reader', 'mic'],
    customTags: []
  });

  // Init reorder list when modal opens
  useEffect(() => {
    if (isReordering) {
        setReorderList(
            speakers.filter(s => !s.isGuest).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
    }
  }, [isReordering]);

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
        qualifications: newSpeaker.qualifications,
        customTags: newSpeaker.customTags
    };
    updateSpeakers([...speakers, speaker]);
    setIsAdding(false);
    setNewSpeaker({ name: '', congregation: 'Green Heights', isGuest: false, qualifications: ['speaker', 'chairman', 'reader', 'mic'], customTags: [] });
  };

  const toggleNewQualification = (role: DutyRole) => {
    setNewSpeaker(prev => {
      const exists = prev.qualifications.includes(role);
      return {
        ...prev,
        qualifications: exists 
          ? prev.qualifications.filter(r => r !== role)
          : [...prev.qualifications, role]
      };
    });
  };

  const toggleNewCustomTag = (tag: string) => {
    setNewSpeaker(prev => {
      const exists = prev.customTags.includes(tag);
      return {
        ...prev,
        customTags: exists ? prev.customTags.filter(t => t !== tag) : [...prev.customTags, tag]
      };
    });
  };

  const addCustomTagToNew = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!newSpeaker.customTags.includes(trimmed)) {
      setNewSpeaker(prev => ({ ...prev, customTags: [...prev.customTags, trimmed] }));
    }
  };

  const toggleEditQualification = (role: DutyRole) => {
    setEditQualifications(prev => {
      const exists = prev.includes(role);
      return exists ? prev.filter(r => r !== role) : [...prev, role];
    });
  };

  const toggleEditCustomTag = (tag: string) => {
    setEditCustomTags(prev => {
      const exists = prev.includes(tag);
      return exists ? prev.filter(t => t !== tag) : [...prev, tag];
    });
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

  const moveReorderItem = (index: number, direction: number) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= reorderList.length) return;
      const newList = [...reorderList];
      const temp = newList[index];
      newList[index] = newList[newIndex];
      newList[newIndex] = temp;
      setReorderList(newList);
  };

  const saveReorder = () => {
      const updatedLocalSpeakers = reorderList.map((s, idx) => ({ ...s, sortOrder: idx }));
      const guests = speakers.filter(s => s.isGuest);
      updateSpeakers([...updatedLocalSpeakers, ...guests]);
      setIsReordering(false);
  };

  const startEditing = (speaker: Speaker) => {
      setEditingId(speaker.id);
      setEditName(speaker.name);
      setEditQualifications(speaker.qualifications || ['speaker', 'chairman', 'reader', 'mic']);
      setEditCustomTags(speaker.customTags || []);
      setCustomTagInput('');
  };

  const saveEditing = (id: string) => {
      if (!editName.trim()) return;
      const updated = speakers.map(s => s.id === id ? { 
        ...s, 
        name: editName.trim(),
        qualifications: editQualifications,
        customTags: editCustomTags
      } : s);
      updateSpeakers(updated);
      setEditingId(null);
  };

  const localSpeakers = speakers
    .filter(s => !s.isGuest)
    .filter(s => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(q);
        const tagMatch = (s.customTags || []).some(t => t.toLowerCase().includes(q));
        if (!nameMatch && !tagMatch) return false;
      }

      // 2. Spiritual Status Filter (Elder, MS, Baptized Only)
      const tags = s.customTags || [];
      const isElder = tags.some(t => t.toLowerCase().includes('elder'));
      const isMS = tags.some(t => t.toLowerCase() === 'ms' || t.toLowerCase().includes('ministerial'));

      if (statusFilter === 'elder' && !isElder) return false;
      if (statusFilter === 'ms' && !isMS) return false;
      if (statusFilter === 'baptized' && (isElder || isMS)) return false;

      // 3. Qualification Role Filter
      if (roleFilter !== 'all') {
        if (!isBrotherQualifiedForRole(s, roleFilter as DutyRole)) return false;
      }

      return true;
    })
    .sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-8">
      {/* Reorder Modal */}
      <Dialog open={isReordering} onOpenChange={setIsReordering}>
        <DialogHeader>
          <DialogTitle>Adjust Rotation Sequence</DialogTitle>
          <DialogDescription>Use up and down buttons to adjust rotation priority.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 my-2">
          {reorderList.map((speaker, idx) => (
            <div 
              key={speaker.id} 
              className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-xl"
            >
              <div className="flex items-center pointer-events-none">
                <Badge variant="default" className="mr-3 text-xs font-bold">#{idx + 1}</Badge>
                <span className="font-semibold text-foreground text-sm truncate max-w-[150px]">{speaker.name}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => moveReorderItem(idx, -1)}
                  disabled={idx === 0}
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => moveReorderItem(idx, 1)}
                  disabled={idx === reorderList.length - 1}
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsReordering(false)}>Cancel</Button>
          <Button onClick={saveReorder}>Save Order</Button>
        </DialogFooter>
      </Dialog>

      {/* Top Toolbar with Search, Status & Role Filters, and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Icon name="search" className="text-xl text-slate-400 dark:text-slate-500 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search brother or tag..."
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

          {/* Spiritual Privilege Filters (Elders, MS, Baptized Only) */}
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-zinc-800/90 rounded-full border border-slate-200/90 dark:border-zinc-700/70 shadow-xs shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
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
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
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
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                statusFilter === 'ms'
                  ? 'bg-blue-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              MS
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('baptized')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                statusFilter === 'baptized'
                  ? 'bg-emerald-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Baptized Only
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

          {/* Active Filter Clear Helper */}
          {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchQuery('');
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
            onClick={() => setIsReordering(true)}
            className="px-5 py-2.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 font-extrabold text-sm border border-slate-200/90 dark:border-zinc-700/70 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Icon name="swap_vert" className="text-lg" />
            Adjust Rotation
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-6 py-2.5 rounded-full bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-extrabold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-zinc-800 dark:border-zinc-200 whitespace-nowrap"
          >
            {isAdding ? <Icon name="close" className="text-lg" /> : <Icon name="add" className="text-lg" />}
            {isAdding ? 'Cancel' : 'New Brother'}
          </button>
        </div>
      </div>

      {isAdding && (
          <Card>
              <CardHeader>
                <CardTitle>Add New Brother</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm p-3 border outline-none transition"
                        placeholder="e.g. Jaballa, Jaymar"
                        value={newSpeaker.name}
                        onChange={(e) => setNewSpeaker({...newSpeaker, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Congregation</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm p-3 border outline-none transition"
                        placeholder="e.g. Green Heights"
                        value={newSpeaker.congregation}
                        onChange={(e) => setNewSpeaker({...newSpeaker, congregation: e.target.value})}
                      />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Role Qualifications</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map(role => {
                    const isSelected = newSpeaker.qualifications.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleNewQualification(role.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Custom Tags & Badges</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_TAGS.map(tag => {
                    const isSelected = newSpeaker.customTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleNewCustomTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Tag className="w-3 h-3 inline-block mr-1" />
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag (e.g. Stage, Sound)..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTagToNew(customTagInput);
                        setCustomTagInput('');
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addCustomTagToNew(customTagInput);
                      setCustomTagInput('');
                    }}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-border">
                  <Button 
                    onClick={handleAdd}
                    disabled={!newSpeaker.name}
                  >
                      Save Brother
                  </Button>
              </div>
              </CardContent>
          </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {localSpeakers.map((speaker, idx) => {
            const lastInfo = getLastAssignmentInfo(speaker);
            const isDeleting = deleteConfirmId === speaker.id;
            const isExiting = exitingId === speaker.id;
            const quals = speaker.qualifications || ['speaker', 'chairman', 'reader', 'mic'];
            const tags = speaker.customTags || [];

            return (
                <Card 
                    key={speaker.id} 
                    style={isExiting ? { animationDelay: '0s' } : { animationDelay: `${idx * 0.05}s` }}
                    className={`group transition-all duration-300 flex flex-col relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 
                    ${isExiting 
                        ? 'animate-fade-out-scale pointer-events-none opacity-0' 
                        : 'animate-in fade-in duration-200'}`}
                >
                  <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                    <div>
                      {/* Top Header with Avatar, Name, and Quick Actions */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-black text-xs shadow-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingId === speaker.id ? (
                              <div className="flex items-center gap-2">
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
                                <Button 
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); saveEditing(speaker.id); }}
                                  className="h-8 w-8"
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={speaker.name}>
                                    {speaker.name}
                                  </h3>
                                  {tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs shrink-0"
                                    >
                                      {tag}
                                    </span>
                                  ))}
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
                              title="Edit Brother Name"
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

                      {/* Qualifications section */}
                      <div className="space-y-3 mb-2">
                        <div>
                          <div className="flex items-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Qualifications
                          </div>
                          {editingId === speaker.id ? (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700">
                              {ALL_ROLES.map(role => {
                                const isSelected = editQualifications.includes(role.id);
                                return (
                                  <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => toggleEditQualification(role.id)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                      isSelected 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {role.shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_ROLES.filter(r => quals.includes(r.id)).map(role => (
                                <span 
                                  key={role.id}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${role.color}`}
                                >
                                  {role.shortLabel}
                                </span>
                              ))}
                              {quals.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No qualifications set</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Custom Tags Edit Section (only when editing) */}
                        {editingId === speaker.id && (
                          <div>
                            <div className="flex items-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                              <Tag className="w-3.5 h-3.5 mr-1" />
                              Custom Tags
                            </div>
                            <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {PRESET_TAGS.map(tag => {
                                  const isSelected = editCustomTags.includes(tag);
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => toggleEditCustomTag(tag)}
                                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition ${
                                        isSelected
                                          ? 'bg-slate-800 text-white border-slate-800'
                                          : 'bg-white text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {tag}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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