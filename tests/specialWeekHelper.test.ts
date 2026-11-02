import { describe, it, expect } from 'vitest';
import { setAssignmentSpecialEvent, revertAssignmentSpecialEvent } from '../domain/specialWeekHelper';
import { Assignment } from '../types';

describe('specialWeekHelper', () => {
  const initialAssignment: Assignment = {
    id: 'assign-1',
    date: '2026-11-08',
    speakerId: 'spk-1',
    outlineId: 45,
    customTalkTitle: 'Original Talk',
    chairmanId: 'bro-1',
    conductorId: 'bro-2',
    readerId: 'bro-3',
    entranceAttendantId: 'bro-4',
    auditoriumAttendantId: 'bro-5',
    micServerIds: ['bro-6', 'bro-7'],
    locked: false,
  };

  it('suspends duties and clears active fields when noMeeting is true', () => {
    const updated = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_assembly',
      specialEventTitle: 'Circuit Assembly with Circuit Overseer',
      noMeeting: true,
    });

    expect(updated.isSpecialEvent).toBe(true);
    expect(updated.specialEventType).toBe('circuit_assembly');
    expect(updated.specialEventTitle).toBe('Circuit Assembly with Circuit Overseer');
    expect(updated.noMeeting).toBe(true);

    // Active duties cleared
    expect(updated.speakerId).toBeNull();
    expect(updated.chairmanId).toBeNull();
    expect(updated.conductorId).toBeNull();
    expect(updated.readerId).toBeNull();
    expect(updated.entranceAttendantId).toBeNull();
    expect(updated.auditoriumAttendantId).toBeNull();
    expect(updated.micServerIds).toEqual([]);

    // Suspended duties preserved
    expect(updated.suspendedDuties?.speakerId).toBe('spk-1');
    expect(updated.suspendedDuties?.chairmanId).toBe('bro-1');
    expect(updated.suspendedDuties?.micServerIds).toEqual(['bro-6', 'bro-7']);
  });

  it('restores suspended duties when reverting special week to normal meeting', () => {
    const special = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_assembly',
      specialEventTitle: 'Circuit Assembly',
      noMeeting: true,
    });

    const reverted = revertAssignmentSpecialEvent(special);

    expect(reverted.isSpecialEvent).toBe(false);
    expect(reverted.specialEventType).toBeUndefined();
    expect(reverted.specialEventTitle).toBeUndefined();
    expect(reverted.noMeeting).toBe(false);
    expect(reverted.suspendedDuties).toBeUndefined();

    expect(reverted.speakerId).toBe('spk-1');
    expect(reverted.outlineId).toBe(45);
    expect(reverted.chairmanId).toBe('bro-1');
    expect(reverted.conductorId).toBe('bro-2');
    expect(reverted.micServerIds).toEqual(['bro-6', 'bro-7']);
  });

  it('keeps duties active when noMeeting is false (e.g. CO Visit)', () => {
    const updated = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_overseer_visit',
      specialEventTitle: 'Circuit Overseer Visit',
      noMeeting: false,
      customTalkTitle: 'Service Talk by Circuit Overseer',
    });

    expect(updated.isSpecialEvent).toBe(true);
    expect(updated.specialEventType).toBe('circuit_overseer_visit');
    expect(updated.noMeeting).toBe(false);
    expect(updated.customTalkTitle).toBe('Service Talk by Circuit Overseer');

    // Duties remain active
    expect(updated.chairmanId).toBe('bro-1');
    expect(updated.conductorId).toBe('bro-2');
  });
});
