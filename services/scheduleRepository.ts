import { openDB, IDBPDatabase, deleteDB } from 'idb';
import { Assignment, Outline, Speaker, AppSettings, RoleDefinition } from '../types';
import { INITIAL_OUTLINES, INITIAL_SPEAKERS, DEFAULT_SETTINGS, DEFAULT_ROLES } from '../constants';

const DB_NAME = 'CongregationSchedulerDB';
const STORE_NAME = 'keyval';
const IDB_KEYS = {
  ASSIGNMENTS: 'assignments',
  SPEAKERS: 'speakers',
  OUTLINES: 'outlines',
  SETTINGS: 'settings',
  ROLES: 'roles'
};

const LS_KEYS = {
  ASSIGNMENTS: 'jw_sched_assignments',
  SPEAKERS: 'jw_sched_speakers',
  OUTLINES: 'jw_sched_outlines',
  SETTINGS: 'jw_sched_settings'
};

// --- Validation Helpers ---
export const isValidAssignment = (item: any): item is Assignment => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.date === 'string'
  );
};

export const isValidSpeaker = (item: any): item is Speaker => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  );
};

export const isValidOutline = (item: any): item is Outline => {
  return (
    typeof item === 'object' &&
    item !== null &&
    (typeof item.id === 'number' || typeof item.id === 'string') &&
    typeof item.title === 'string'
  );
};

export interface BackupPayload {
  timestamp: string;
  version: string;
  data: {
    settings: AppSettings;
    outlines: Outline[];
    speakers: Speaker[];
    assignments: Assignment[];
    roles: RoleDefinition[];
  };
}

export interface RestoreResult {
  success: boolean;
  counts?: {
    assignments: number;
    speakers: number;
    roles: number;
    hasAuthorityRoles: boolean;
  };
}

/**
 * Storage Port / Seam Interface
 */
export interface ScheduleStore {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  getRoles(): Promise<RoleDefinition[]>;
  saveRoles(roles: RoleDefinition[]): Promise<void>;
  getOutlines(): Promise<Outline[]>;
  saveOutlines(outlines: Outline[]): Promise<void>;
  getSpeakers(): Promise<Speaker[]>;
  saveSpeakers(speakers: Speaker[]): Promise<void>;
  getAssignments(): Promise<Assignment[]>;
  saveAssignments(assignments: Assignment[]): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * Production IndexedDB Storage Adapter
 */
export class IndexedDbStore implements ScheduleStore {
  private dbPromise: Promise<IDBPDatabase<any>> | null = null;

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.dbPromise;
  }

  private async getIDBData<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.getDB();
    const val = await db.get(STORE_NAME, key);
    return val !== undefined ? val : defaultValue;
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const data = await this.getIDBData(IDB_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return data && typeof data === 'object' ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, settings, IDB_KEYS.SETTINGS);
  }

  async getRoles(): Promise<RoleDefinition[]> {
    try {
      const data = await this.getIDBData(IDB_KEYS.ROLES, DEFAULT_ROLES);
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_ROLES;
    } catch {
      return DEFAULT_ROLES;
    }
  }

  async saveRoles(roles: RoleDefinition[]): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, roles, IDB_KEYS.ROLES);
  }

  async getOutlines(): Promise<Outline[]> {
    try {
      const raw = await this.getIDBData(IDB_KEYS.OUTLINES, INITIAL_OUTLINES);
      if (!Array.isArray(raw)) return INITIAL_OUTLINES;
      const valid = raw.filter(isValidOutline).map(o => ({ ...o, id: Number(o.id) }));
      return valid.length > 0 ? valid : INITIAL_OUTLINES;
    } catch {
      return INITIAL_OUTLINES;
    }
  }

  async saveOutlines(outlines: Outline[]): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, outlines, IDB_KEYS.OUTLINES);
  }

  async getSpeakers(): Promise<Speaker[]> {
    try {
      const raw = await this.getIDBData<unknown[]>(IDB_KEYS.SPEAKERS, []);
      if (!Array.isArray(raw)) return [];

      let needsSave = false;
      const valid = raw.filter(isValidSpeaker).map(s => {
        if (!s.spiritualStatus) {
          needsSave = true;
          return { ...s, spiritualStatus: 'publisher' as const };
        }
        return s;
      });

      if (needsSave) {
        await this.saveSpeakers(valid);
      }
      return valid;
    } catch {
      return [];
    }
  }

  async saveSpeakers(speakers: Speaker[]): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, speakers, IDB_KEYS.SPEAKERS);
  }

  async getAssignments(): Promise<Assignment[]> {
    try {
      const raw = await this.getIDBData<unknown[]>(IDB_KEYS.ASSIGNMENTS, []);
      if (!Array.isArray(raw)) return [];
      return raw.filter(isValidAssignment);
    } catch {
      return [];
    }
  }

  async saveAssignments(assignments: Assignment[]): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, assignments, IDB_KEYS.ASSIGNMENTS);
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await db.clear(STORE_NAME);
    localStorage.removeItem(LS_KEYS.SETTINGS);
    localStorage.removeItem(LS_KEYS.OUTLINES);
    localStorage.removeItem(LS_KEYS.SPEAKERS);
    localStorage.removeItem(LS_KEYS.ASSIGNMENTS);
  }
}

/**
 * In-Memory Storage Adapter for Unit Tests & Ephemeral Sessions
 */
export class InMemoryStore implements ScheduleStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private roles: RoleDefinition[] = [...DEFAULT_ROLES];
  private outlines: Outline[] = [...INITIAL_OUTLINES];
  private speakers: Speaker[] = [...INITIAL_SPEAKERS];
  private assignments: Assignment[] = [];

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings };
  }

  async getRoles(): Promise<RoleDefinition[]> {
    return [...this.roles];
  }

  async saveRoles(roles: RoleDefinition[]): Promise<void> {
    this.roles = [...roles];
  }

  async getOutlines(): Promise<Outline[]> {
    return [...this.outlines];
  }

  async saveOutlines(outlines: Outline[]): Promise<void> {
    this.outlines = [...outlines];
  }

  async getSpeakers(): Promise<Speaker[]> {
    return [...this.speakers];
  }

  async saveSpeakers(speakers: Speaker[]): Promise<void> {
    this.speakers = [...speakers];
  }

  async getAssignments(): Promise<Assignment[]> {
    return [...this.assignments];
  }

  async saveAssignments(assignments: Assignment[]): Promise<void> {
    this.assignments = [...assignments];
  }

  async clearAll(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    this.roles = [...DEFAULT_ROLES];
    this.outlines = [];
    this.speakers = [];
    this.assignments = [];
  }
}

/**
 * Deep Schedule Repository Module
 */
export class ScheduleRepository {
  private store: ScheduleStore;

  constructor(store?: ScheduleStore) {
    this.store = store || new IndexedDbStore();
  }

  async loadAll() {
    const [assignments, speakers, outlines, settings, roles] = await Promise.all([
      this.store.getAssignments(),
      this.store.getSpeakers(),
      this.store.getOutlines(),
      this.store.getSettings(),
      this.store.getRoles()
    ]);
    return { assignments, speakers, outlines, settings, roles };
  }

  async saveAssignments(assignments: Assignment[]) {
    await this.store.saveAssignments(assignments);
  }

  async saveSpeakers(speakers: Speaker[]) {
    await this.store.saveSpeakers(speakers);
  }

  async saveOutlines(outlines: Outline[]) {
    await this.store.saveOutlines(outlines);
  }

  async saveRoles(roles: RoleDefinition[]) {
    await this.store.saveRoles(roles);
  }

  /**
   * Saves settings and handles cascade updates to local brother congregations if requested.
   */
  async saveSettings(
    newSettings: AppSettings,
    previousCongregationName?: string
  ): Promise<{ updatedSpeakers?: Speaker[] }> {
    await this.store.saveSettings(newSettings);

    const newCongName = newSettings.congregationName?.trim();
    if (newCongName && previousCongregationName && newCongName !== previousCongregationName) {
      const currentSpeakers = await this.store.getSpeakers();
      const updatedSpeakers = currentSpeakers.map(sp =>
        sp.isGuest ? sp : { ...sp, congregation: newCongName }
      );
      await this.store.saveSpeakers(updatedSpeakers);
      return { updatedSpeakers };
    }

    return {};
  }

  async createBackup(): Promise<BackupPayload> {
    const data = await this.loadAll();
    return {
      timestamp: new Date().toISOString(),
      version: '1.1',
      data
    };
  }

  async restoreBackup(backup: any): Promise<RestoreResult> {
    try {
      if (!backup || !backup.data) throw new Error("Invalid backup format");
      const { settings, outlines, speakers, assignments, roles } = backup.data;

      if (!settings || typeof settings !== 'object') throw new Error("Missing Settings data");
      if (!Array.isArray(outlines)) throw new Error("Missing Outlines data");
      if (!Array.isArray(speakers)) throw new Error("Missing Speakers data");
      if (!Array.isArray(assignments)) throw new Error("Missing Assignments data");

      await this.store.clearAll();

      await this.store.saveSettings(settings);
      const validOutlines = outlines.filter(isValidOutline);
      await this.store.saveOutlines(validOutlines);

      const validSpeakers = speakers.filter(isValidSpeaker);
      await this.store.saveSpeakers(validSpeakers);

      const validAssignments = assignments.filter(isValidAssignment);
      await this.store.saveAssignments(validAssignments);

      const rolesToSave = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;
      await this.store.saveRoles(rolesToSave);

      const hasAuthorityRoles = Boolean(
        settings.authorityRoles &&
        (settings.authorityRoles.conductorId || settings.authorityRoles.auditoriumAttendantId)
      );

      return {
        success: true,
        counts: {
          assignments: validAssignments.length,
          speakers: validSpeakers.length,
          roles: rolesToSave.length,
          hasAuthorityRoles
        }
      };
    } catch {
      return { success: false };
    }
  }

  async resetData(): Promise<void> {
    await this.store.clearAll();
    if (typeof deleteDB === 'function') {
      await deleteDB(DB_NAME);
    }
  }
}

// Default singleton instance for app consumption
export const scheduleRepository = new ScheduleRepository();
