import React, { useState } from 'react';
import { DutyRole, Speaker, Assignment, AppSettings, RoleRule, RoleDefinition } from '../types';
import { DEFAULT_ROLES } from '../constants';
import { isBrotherQualifiedForRole, getCandidateStatus } from '../utils/dateUtils';
import { Search } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { showToast } from './ui/Toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'elder' | 'ms' | 'publisher'>('all');

  const roleRules = settings.roleRules || {};
  const authorityRoles = settings.authorityRoles || { conductorId: null, auditoriumAttendantId: null };

  const currentRule: RoleRule = roleRules[selectedRole] || {
    role: selectedRole,
    frequency: 'weekly',
    rosterIds: speakers.filter(s => !s.isGuest && (s.qualifications?.includes(selectedRole) ?? true)).map(s => s.id)
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
      <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Icon name="workspace_premium" className="text-2xl" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center">
                  Authority Roles (Fixed Assignments)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Assign dedicated brothers for Watchtower Conductor and Auditorium Attendant.
                </CardDescription>
              </div>
            </div>

            <button
              onClick={handleApplyAuthorityRoles}
              className="px-5 py-2.5 rounded-full bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-800 dark:border-zinc-200 shrink-0"
            >
              <Icon name="bolt" className="text-base text-amber-400 dark:text-amber-500" />
              Apply Authority Roles
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Watchtower Conductor</label>
              <CustomSelect
                options={brotherOptions}
                value={authorityRoles.conductorId || ''}
                onChange={(val) => handleUpdateAuthorityRoles('conductorId', val || null)}
                placeholder="Select fixed Conductor..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Auditorium Attendant</label>
              <CustomSelect
                options={brotherOptions}
                value={authorityRoles.auditoriumAttendantId || ''}
                onChange={(val) => handleUpdateAuthorityRoles('auditoriumAttendantId', val || null)}
                placeholder="Select fixed Attendant..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedRole} onValueChange={(val) => setSelectedRole(val as DutyRole)}>
        <TabsList className="w-full flex justify-start overflow-x-auto h-auto p-1.5 bg-slate-100 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
          {roles.map(def => (
            <TabsTrigger
              key={def.key}
              value={def.key}
              className="py-2 px-4 text-xs font-bold whitespace-nowrap cursor-pointer rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              {def.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map(def => {
          const qualifiedForRole = localBrothers.filter(b => isBrotherQualifiedForRole(b, def.key, roles));

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
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Qualified Roster for {def.name} ({qualifiedForRole.length} Brothers)
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
                          const isQualified = isBrotherQualifiedForRole(brother, def.key, roles);

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
                                {brother.customTags && brother.customTags.length > 0 && (
                                  <div className="flex gap-1 mt-0.5 flex-wrap">
                                    {brother.customTags.map(tag => (
                                      <span key={tag} className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-medium">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {!isQualified && (
                                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-300">Unqualified</Badge>
                                )}
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
