import React, { useState } from 'react';
import { DutyRole, Speaker, Assignment, AppSettings, RoleRule, RoleDefinition } from '../types';
import { DEFAULT_ROLES } from '../constants';
import { getCandidateStatus } from '../utils/dateUtils';
import { Search } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { showToast } from './ui/Toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';

const ROLE_TAB_ICONS: Record<string, string> = {
  chairman: 'gavel',
  speaker: 'record_voice_over',
  conductor: 'school',
  reader: 'menu_book',
  attendant_entrance: 'door_front',
  attendant_auditorium: 'event_seat',
  mic: 'mic'
};

interface RoleRulesViewProps {
  speakers: Speaker[];
  assignments: Assignment[];
  settings: AppSettings;
  saveSettings: (s: AppSettings) => void;
  updateAssignments: (a: Assignment[]) => void;
  roles?: RoleDefinition[];
}

export const RoleRulesView: React.FC<RoleRulesViewProps> = ({
  speakers, assignments, settings, saveSettings, updateAssignments, roles = DEFAULT_ROLES
}) => {
  const [selectedRole, setSelectedRole] = useState<DutyRole>('chairman');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'elder' | 'ms' | 'publisher' | 'up'>('all');

  const roleRules = settings.roleRules || {};
  const authorityRoles = settings.authorityRoles || { conductorId: null, auditoriumAttendantId: null };

  const currentRule: RoleRule = roleRules[selectedRole] || {
    role: selectedRole,
    frequency: 'weekly',
    rosterIds: []
  };

  const localBrothers = speakers.filter(s => !s.isGuest);
  const brotherOptions = [{ value: '', label: 'None (Rotate automatically)' }, ...localBrothers.map(b => ({ value: b.id, label: b.name }))];

  const handleUpdateAuthorityRoles = (field: 'conductorId' | 'auditoriumAttendantId', val: string | null) => {
    saveSettings({
      ...settings,
      authorityRoles: {
        ...authorityRoles,
        [field]: val || null
      }
    });
    showToast("Authority roles updated successfully!", "success");
  };

  const handleApplyAuthorityRoles = () => {
    if (!authorityRoles.conductorId && !authorityRoles.auditoriumAttendantId) {
      showToast("Please select at least one authority role brother first.", "info");
      return;
    }

    const updated = assignments.map(a => {
      if (a.locked || a.isSpecialEvent) return a;
      return {
        ...a,
        ...(authorityRoles.conductorId ? { conductorId: authorityRoles.conductorId } : {}),
        ...(authorityRoles.auditoriumAttendantId ? { auditoriumAttendantId: authorityRoles.auditoriumAttendantId } : {})
      };
    });

    updateAssignments(updated);
    showToast("Applied authority roles across unlocked meetings!", "success");
  };

  const toggleBrotherInRoster = (brotherId: string) => {
    const currentRoster = currentRule.rosterIds || [];
    const newRoster = currentRoster.includes(brotherId)
      ? currentRoster.filter(id => id !== brotherId)
      : [...currentRoster, brotherId];

    const updated: RoleRule = {
      ...currentRule,
      rosterIds: newRoster
    };

    const newRoleRules = {
      ...roleRules,
      [selectedRole]: updated
    };
    saveSettings({
      ...settings,
      roleRules: newRoleRules
    });
  };

  const filteredBrothers = localBrothers.filter(brother => {
    const status = getCandidateStatus(brother);
    // Status filter check
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false;
    }

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = brother.name.toLowerCase().includes(q);
      const tagMatch = brother.customTags?.some(t => t.toLowerCase().includes(q));
      if (!nameMatch && !tagMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#18181b] text-white rounded-3xl p-6 md:p-7 border border-zinc-800 shadow-xl overflow-hidden relative space-y-6">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 border border-zinc-700/20 rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-zinc-800/80 text-amber-400 rounded-2xl border border-zinc-700/80">
              <Icon name="workspace_premium" className="text-2xl" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center">
                Authority Roles (Fixed Assignments)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Assign dedicated brothers for Watchtower Conductor and Auditorium Attendant.
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyAuthorityRoles}
            className="px-5 py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white shrink-0"
          >
            <Icon name="bolt" className="text-base text-amber-500" />
            Apply Authority Roles
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Watchtower Conductor</label>
            <CustomSelect
              options={brotherOptions}
              value={authorityRoles.conductorId || ''}
              onChange={(val) => handleUpdateAuthorityRoles('conductorId', val || null)}
              placeholder="Select fixed Conductor..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Auditorium Attendant</label>
            <CustomSelect
              options={brotherOptions}
              value={authorityRoles.auditoriumAttendantId || ''}
              onChange={(val) => handleUpdateAuthorityRoles('auditoriumAttendantId', val || null)}
              placeholder="Select fixed Attendant..."
            />
          </div>
        </div>
      </div>

      <Tabs value={selectedRole} onValueChange={(val) => setSelectedRole(val as DutyRole)}>
        <TabsList className="w-full flex justify-start overflow-x-auto h-auto p-2 bg-slate-100/90 dark:bg-zinc-800/60 rounded-3xl border border-slate-200/80 dark:border-zinc-700/60 gap-2">
          {roles.map(def => {
            const isTabActive = selectedRole === def.key;
            return (
              <TabsTrigger
                key={def.key}
                value={def.key}
                className={`group py-3.5 px-5 text-xs font-extrabold whitespace-nowrap cursor-pointer rounded-2xl transition-all flex flex-col items-center justify-center gap-1 min-w-[105px] border ${
                  isTabActive
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-slate-200/90 dark:border-zinc-700/80 shadow-lg shadow-slate-200/80 dark:shadow-black/60 scale-105 z-10'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon 
                  name={ROLE_TAB_ICONS[def.key] || 'settings'} 
                  className={`text-2xl transition-all ${
                    isTabActive 
                      ? 'text-amber-500 dark:text-amber-400 scale-110' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`} 
                />
                <span className="tracking-tight font-extrabold">{def.name}</span>
                {isTabActive && (
                  <div className="w-7 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-0.5 animate-in fade-in zoom-in-75 duration-200 shadow-xs" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {roles.map(def => {
          return (
            <TabsContent key={def.key} value={def.key} className="mt-6">
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xs">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-extrabold tracking-tight">{def.name} Configuration</CardTitle>
                      <CardDescription className="mt-1">{def.desc}</CardDescription>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Search brother..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-1.5 h-9 text-xs rounded-full border-slate-200 dark:border-zinc-700 w-full sm:w-48 bg-slate-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-full border border-slate-200/80 dark:border-zinc-700/60 text-xs">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                            statusFilter === 'all'
                              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('elder')}
                          className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                            statusFilter === 'elder'
                              ? 'bg-amber-500 text-white dark:bg-amber-500 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Elder
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('ms')}
                          className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                            statusFilter === 'ms'
                              ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          MS
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('publisher')}
                          className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                            statusFilter === 'publisher'
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Publisher
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('up')}
                          className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                            statusFilter === 'up'
                              ? 'bg-amber-600 text-white dark:bg-amber-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          UP
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Roster for {def.name} ({currentRule.rosterIds.length} Active / {localBrothers.length} Brothers)
                      </h4>
                      {(searchQuery || statusFilter !== 'all') && (
                        <span className="text-xs text-muted-foreground">
                          Showing {filteredBrothers.length} of {localBrothers.length}
                        </span>
                      )}
                    </div>

                    {filteredBrothers.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                        No brothers found matching "{searchQuery}" {statusFilter !== 'all' ? `with filter '${statusFilter.toUpperCase()}'` : ''}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredBrothers.map(brother => {
                          const isInRoster = currentRule.rosterIds.includes(brother.id);

                          return (
                            <div
                              key={brother.id}
                              onClick={() => toggleBrotherInRoster(brother.id)}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                                isInRoster
                                  ? 'bg-primary/10 border-primary text-primary font-medium'
                                  : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-semibold text-sm truncate">{brother.name}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {isInRoster ? (
                                  <Badge variant="default" className="text-[10px]">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Excluded</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
