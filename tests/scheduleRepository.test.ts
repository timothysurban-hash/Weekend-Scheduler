import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleRepository, InMemoryStore } from '../services/scheduleRepository';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '../constants';
import { Speaker } from '../types';

describe('ScheduleRepository Seam', () => {
  let repo: ScheduleRepository;
  let inMemoryStore: InMemoryStore;

  beforeEach(() => {
    inMemoryStore = new InMemoryStore();
    repo = new ScheduleRepository(inMemoryStore);
  });

  it('loads default initial state correctly from empty store', async () => {
    const data = await repo.loadAll();
    expect(data.settings.congregationName).toBe(DEFAULT_SETTINGS.congregationName);
    expect(data.roles.length).toBe(DEFAULT_ROLES.length);
    expect(Array.isArray(data.speakers)).toBe(true);
    expect(Array.isArray(data.assignments)).toBe(true);
  });

  it('persists and retrieves updated assignments', async () => {
    const sampleAssignment = {
      id: 'test-1',
      date: '2026-08-23',
      speakerId: null,
      outlineId: null,
      locked: false
    };

    await repo.saveAssignments([sampleAssignment]);
    const { assignments } = await repo.loadAll();
    expect(assignments.length).toBe(1);
    expect(assignments[0].id).toBe('test-1');
  });

  it('cascades congregation name updates to non-guest speakers when settings change', async () => {
    const speakers: Speaker[] = [
      { id: '1', name: 'Local Brother', congregation: 'Old Cong', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 1 },
      { id: '2', name: 'Guest Brother', congregation: 'Other Cong', isGuest: true, unavailableDates: [], lastAssigned: null, sortOrder: 2 }
    ];

    await repo.saveSpeakers(speakers);

    const updatedSettings = { ...DEFAULT_SETTINGS, congregationName: 'New Cong' };
    const { updatedSpeakers } = await repo.saveSettings(updatedSettings, 'Old Cong');

    expect(updatedSpeakers).toBeDefined();
    expect(updatedSpeakers?.find(s => s.id === '1')?.congregation).toBe('New Cong');
    expect(updatedSpeakers?.find(s => s.id === '2')?.congregation).toBe('Other Cong');
  });

  it('creates and restores valid backups round-trip', async () => {
    const backup = await repo.createBackup();
    expect(backup.version).toBe('1.1');
    expect(backup.data.settings).toBeDefined();

    const restoreResult = await repo.restoreBackup(backup);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.counts).toBeDefined();
  });
});
