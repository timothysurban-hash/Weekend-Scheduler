import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleRepository, InMemoryStore } from '../services/scheduleRepository';
import { Assignment, Speaker, Outline, AppSettings, RoleDefinition } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_ROLES, INITIAL_OUTLINES } from '../constants';

describe('ScheduleRepository Backup & Restore Seam (TDD)', () => {
  let repository: ScheduleRepository;
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
    repository = new ScheduleRepository(store);
  });

  const sampleSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    congregationName: 'Restored Test Cong',
    locationName: 'Restored Hall'
  };

  const sampleSpeakers: Speaker[] = [
    {
      id: 'sp-restored-1',
      name: 'Brother Restored',
      congregation: 'Restored Test Cong',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 0,
      spiritualStatus: 'elder',
      qualifications: {
        chairman: true,
        conductor: true,
        reader: true,
        speaker: true,
        attendants: true,
        mic: true
      }
    }
  ];

  const sampleAssignments: Assignment[] = [
    {
      id: 'asg-restored-1',
      date: '2026-10-04',
      chairmanId: 'sp-restored-1',
      conductorId: 'sp-restored-1',
      readerId: 'sp-restored-1',
      speakerId: 'sp-restored-1',
      locked: true
    }
  ];

  const sampleOutlines: Outline[] = [
    { id: 1, title: 'Restored Outline 1' },
    { id: 2, title: 'Restored Outline 2' }
  ];

  it('restores standard wrapped backup payload successfully', async () => {
    const wrappedBackup = {
      timestamp: '2026-08-24T12:00:00.000Z',
      version: '1.1',
      data: {
        settings: sampleSettings,
        outlines: sampleOutlines,
        speakers: sampleSpeakers,
        assignments: sampleAssignments,
        roles: DEFAULT_ROLES
      }
    };

    const result = await repository.restoreBackup(wrappedBackup);
    expect(result.success).toBe(true);
    expect(result.counts?.assignments).toBe(1);
    expect(result.counts?.speakers).toBe(1);
    expect(result.counts?.roles).toBe(DEFAULT_ROLES.length);

    const loaded = await repository.loadAll();
    expect(loaded.settings.congregationName).toBe('Restored Test Cong');
    expect(loaded.speakers[0].name).toBe('Brother Restored');
    expect(loaded.assignments[0].id).toBe('asg-restored-1');
  });

  it('restores root-level unwrapped backup (legacy format without .data wrapper)', async () => {
    const unwrappedBackup = {
      settings: sampleSettings,
      speakers: sampleSpeakers,
      assignments: sampleAssignments
      // Note: outlines and roles intentionally omitted to simulate partial/legacy export
    };

    const result = await repository.restoreBackup(unwrappedBackup);
    expect(result.success).toBe(true);
    expect(result.counts?.assignments).toBe(1);
    expect(result.counts?.speakers).toBe(1);

    const loaded = await repository.loadAll();
    expect(loaded.settings.congregationName).toBe('Restored Test Cong');
    expect(loaded.speakers.length).toBe(1);
    expect(loaded.assignments.length).toBe(1);
    // Should fallback to initial outlines and default roles
    expect(loaded.outlines.length).toBeGreaterThan(0);
    expect(loaded.roles.length).toBe(DEFAULT_ROLES.length);
  });

  it('restores backup with stringified JSON or alternate key names (schedules, brothers)', async () => {
    const alternateFormat = {
      data: {
        settings: sampleSettings,
        schedules: sampleAssignments,
        brothers: sampleSpeakers
      }
    };

    const result = await repository.restoreBackup(alternateFormat);
    expect(result.success).toBe(true);
    expect(result.counts?.assignments).toBe(1);
    expect(result.counts?.speakers).toBe(1);

    const loaded = await repository.loadAll();
    expect(loaded.assignments[0].id).toBe('asg-restored-1');
    expect(loaded.speakers[0].name).toBe('Brother Restored');
  });

  it('rejects corrupt or completely non-object payloads cleanly without throwing', async () => {
    const result1 = await repository.restoreBackup(null);
    expect(result1.success).toBe(false);

    const result2 = await repository.restoreBackup('not a json object');
    expect(result2.success).toBe(false);

    const result3 = await repository.restoreBackup({ randomKey: 123 });
    expect(result3.success).toBe(false);
  });
});
