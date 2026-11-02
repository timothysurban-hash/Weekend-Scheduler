import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Icon } from '../ui/Icon';
import { Assignment, SpecialEventType } from '../../types';
import { SPECIAL_EVENT_PRESETS, getSpecialEventPresetDetails } from '../../constants';

export interface SpecialWeekModalProps {
  isOpen: boolean;
  assignment: Assignment;
  languageMode?: 'english' | 'tagalog' | 'both';
  onClose: () => void;
  onSave: (options: {
    isSpecialEvent: boolean;
    specialEventType?: SpecialEventType;
    specialEventTitle?: string;
    noMeeting?: boolean;
    customTalkTitle?: string;
  }) => void;
  onRevert: () => void;
}

export const SpecialWeekModal: React.FC<SpecialWeekModalProps> = ({
  isOpen,
  assignment,
  languageMode = 'english',
  onClose,
  onSave,
  onRevert,
}) => {
  const [selectedType, setSelectedType] = useState<SpecialEventType>(
    assignment.specialEventType || 'circuit_assembly'
  );
  const [title, setTitle] = useState<string>(
    assignment.specialEventTitle ||
      getSpecialEventPresetDetails(assignment.specialEventType || 'circuit_assembly', languageMode).title
  );
  const [noMeeting, setNoMeeting] = useState<boolean>(
    assignment.noMeeting !== undefined
      ? assignment.noMeeting
      : SPECIAL_EVENT_PRESETS.find(p => p.key === (assignment.specialEventType || 'circuit_assembly'))?.defaultNoMeeting ?? true
  );
  const [customTalkTitle, setCustomTalkTitle] = useState<string>(
    assignment.customTalkTitle || ''
  );

  useEffect(() => {
    if (isOpen) {
      const type = assignment.specialEventType || 'circuit_assembly';
      setSelectedType(type);
      setTitle(
        assignment.specialEventTitle ||
          getSpecialEventPresetDetails(type, languageMode).title
      );
      setNoMeeting(
        assignment.noMeeting !== undefined
          ? assignment.noMeeting
          : SPECIAL_EVENT_PRESETS.find(p => p.key === type)?.defaultNoMeeting ?? true
      );
      setCustomTalkTitle(assignment.customTalkTitle || '');
    }
  }, [isOpen, assignment, languageMode]);

  const handleSelectPreset = (presetKey: SpecialEventType) => {
    setSelectedType(presetKey);
    const details = getSpecialEventPresetDetails(presetKey, languageMode);
    setTitle(details.title);
    const preset = SPECIAL_EVENT_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      setNoMeeting(preset.defaultNoMeeting);
    }
  };

  const handleSave = () => {
    onSave({
      isSpecialEvent: true,
      specialEventType: selectedType,
      specialEventTitle: title.trim() || getSpecialEventPresetDetails(selectedType, languageMode).title,
      noMeeting,
      customTalkTitle: noMeeting ? undefined : customTalkTitle.trim() || undefined,
    });
    onClose();
  };

  const handleRevert = () => {
    onRevert();
    onClose();
  };

  const formattedDate = new Date(assignment.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Icon name="event" className="text-xl" />
          </div>
          <div>
            <DialogTitle>Configure Special Week</DialogTitle>
            <DialogDescription>{formattedDate}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Preset Selector */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Event Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPECIAL_EVENT_PRESETS.map(preset => {
              const details = getSpecialEventPresetDetails(preset.key, languageMode);
              const isSelected = selectedType === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectPreset(preset.key)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30'
                      : 'border-border bg-card hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="font-bold line-clamp-1">{details.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {preset.defaultNoMeeting ? 'No meeting' : 'Meeting with duties'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Event Title / Theme
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 2026 Circuit Assembly with Circuit Overseer"
            className="text-sm"
          />
        </div>

        {/* No Meeting Toggle */}
        <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">
                No Meeting at Kingdom Hall (Suspend Duties)
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {noMeeting
                  ? 'All local duties (Chairman, Conductor, Reader, Mics, Attendants) are suspended.'
                  : 'Meeting is held; regular duty roles can be assigned.'}
              </span>
            </div>
            <input
              type="checkbox"
              id="no-meeting-toggle"
              checked={noMeeting}
              onChange={e => setNoMeeting(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Custom Talk / Visiting Speaker if meeting is held */}
        {!noMeeting && (
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Visiting Speaker / Talk Title
            </label>
            <Input
              value={customTalkTitle}
              onChange={e => setCustomTalkTitle(e.target.value)}
              placeholder="e.g. Talk by Circuit Overseer, Memorial Discourse"
              className="text-sm"
            />
          </div>
        )}
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 mt-4">
        {assignment.isSpecialEvent && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRevert}
            className="text-destructive hover:bg-destructive/10 border-destructive/30 mr-auto"
          >
            <Icon name="undo" className="text-sm mr-1" />
            Revert to Regular Meeting
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            Save Special Week
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
