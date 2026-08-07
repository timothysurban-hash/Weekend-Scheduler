import { openDB, IDBPDatabase, deleteDB } from 'idb';
import { Assignment, Outline, Speaker, AppSettings, RoleDefinition } from '../types';
import { INITIAL_OUTLINES, INITIAL_SPEAKERS, DEFAULT_SETTINGS, DEFAULT_ROLES } from '../constants';

const DB_NAME = 'CongregationSchedulerDB';
const STORE_NAME = 'keyval';
const LS_KEYS = {
  ASSIGNMENTS: 'jw_sched_assignments',
  SPEAKERS: 'jw_sched_speakers',
  OUTLINES: 'jw_sched_outlines',
  SETTINGS: 'jw_sched_settings'
};

const IDB_KEYS = {
  ASSIGNMENTS: 'assignments',
  SPEAKERS: 'speakers',
  OUTLINES: 'outlines',
  SETTINGS: 'settings',
  ROLES: 'roles'
};

// --- Validation Helpers ---
const isValidAssignment = (item: any): boolean => {
    return (
        typeof item === 'object' && 
        item !== null && 
        typeof item.id === 'string' && 
        typeof item.date === 'string'
    );
};

const isValidSpeaker = (item: any): boolean => {
    return (
        typeof item === 'object' && 
        item !== null && 
        typeof item.id === 'string' && 
        typeof item.name === 'string'
    );
};

const isValidOutline = (item: any): boolean => {
    return (
        typeof item === 'object' && 
        item !== null && 
        (typeof item.id === 'number' || typeof item.id === 'string') && 
        typeof item.title === 'string'
    );
};

// --- DB Helper ---
let dbPromise: Promise<IDBPDatabase<any>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
};

async function getIDBData<T>(idbKey: string, defaultValue: T): Promise<T> {
    const db = await getDB();
    const val = await db.get(STORE_NAME, idbKey);
    return val !== undefined ? val : defaultValue;
}

export const DataService = {
  // --- Settings ---
  getSettings: async (): Promise<AppSettings> => {
    try {
      const data = await getIDBData(IDB_KEYS.SETTINGS, DEFAULT_SETTINGS);
      // Basic validation
      return (data && typeof data === 'object') ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
    } catch (e) {
      console.warn("Failed to load settings, using default.", e);
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings: async (settings: AppSettings) => {
    const db = await getDB();
    await db.put(STORE_NAME, settings, IDB_KEYS.SETTINGS);
  },

  // --- Roles ---
  getRoles: async (): Promise<RoleDefinition[]> => {
    try {
      const data = await getIDBData(IDB_KEYS.ROLES, DEFAULT_ROLES);
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_ROLES;
    } catch (e) {
      console.warn("Failed to load roles, using default.", e);
      return DEFAULT_ROLES;
    }
  },
  saveRoles: async (roles: RoleDefinition[]) => {
    const db = await getDB();
    await db.put(STORE_NAME, roles, IDB_KEYS.ROLES);
  },

  // --- Outlines ---
  getOutlines: async (): Promise<Outline[]> => {
    try {
      const raw = await getIDBData(IDB_KEYS.OUTLINES, INITIAL_OUTLINES);
      if (!Array.isArray(raw)) return INITIAL_OUTLINES;
      
      const valid = raw
        .filter(isValidOutline)
        .map(o => ({ ...o, id: Number(o.id) }));
        
      return valid.length > 0 ? valid : INITIAL_OUTLINES;
    } catch (e) {
      console.warn("Failed to load outlines, using initial.", e);
      return INITIAL_OUTLINES;
    }
  },
  saveOutlines: async (outlines: Outline[]) => {
    const db = await getDB();
    await db.put(STORE_NAME, outlines, IDB_KEYS.OUTLINES);
  },

  // --- Speakers ---
  getSpeakers: async (): Promise<Speaker[]> => {
    try {
      const raw = await getIDBData(IDB_KEYS.SPEAKERS, INITIAL_SPEAKERS);
      if (!Array.isArray(raw) || raw.length === 0) {
        await DataService.saveSpeakers(INITIAL_SPEAKERS);
        return INITIAL_SPEAKERS;
      }
      
      // Auto-migration: Check if IndexedDB has legacy cached data (e.g., sp-1 was named Arceta, John Daryl or missing spiritualStatus)
      const isLegacyCache = raw.some(s => s.id === 'sp-1' && s.name.includes('Arceta')) ||
                            raw.some(s => !s.spiritualStatus);
      
      if (isLegacyCache) {
        console.info("Upgrading legacy IndexedDB speaker cache to 28 brothers roster...");
        await DataService.saveSpeakers(INITIAL_SPEAKERS);
        return INITIAL_SPEAKERS;
      }

      const valid = raw.filter(isValidSpeaker);
      return valid.length > 0 ? valid : INITIAL_SPEAKERS;
    } catch (e) {
      console.warn("Failed to load speakers, using initial.", e);
      return INITIAL_SPEAKERS;
    }
  },
  saveSpeakers: async (speakers: Speaker[]) => {
    const db = await getDB();
    await db.put(STORE_NAME, speakers, IDB_KEYS.SPEAKERS);
  },

  // --- Assignments ---
  getAssignments: async (): Promise<Assignment[]> => {
    try {
      const raw = await getIDBData(IDB_KEYS.ASSIGNMENTS, []);
      if (!Array.isArray(raw)) return [];
      
      return raw.filter(isValidAssignment);
    } catch (e) {
      console.warn("Failed to load assignments, returning empty.", e);
      return [];
    }
  },
  saveAssignments: async (assignments: Assignment[]) => {
    const db = await getDB();
    await db.put(STORE_NAME, assignments, IDB_KEYS.ASSIGNMENTS);
  },

  // --- Helpers ---
  resetData: async () => {
    localStorage.clear(); // Clear legacy data too
    await deleteDB(DB_NAME);
    window.location.reload();
  },

  // --- Backup & Restore ---
  createBackup: async () => {
    const settings = await DataService.getSettings();
    const outlines = await DataService.getOutlines();
    const speakers = await DataService.getSpeakers();
    const assignments = await DataService.getAssignments();
    const roles = await DataService.getRoles();

    return {
        timestamp: new Date().toISOString(),
        version: '1.1',
        data: { settings, outlines, speakers, assignments, roles }
    };
  },

  restoreBackup: async (backup: any): Promise<{ success: boolean; counts?: { assignments: number; speakers: number; roles: number; hasAuthorityRoles: boolean } }> => {
      try {
          if (!backup || !backup.data) throw new Error("Invalid backup format");
          const { settings, outlines, speakers, assignments, roles } = backup.data;
          
          if (!settings || typeof settings !== 'object') throw new Error("Missing Settings data");
          if (!Array.isArray(outlines)) throw new Error("Missing Outlines data");
          if (!Array.isArray(speakers)) throw new Error("Missing Speakers data");
          if (!Array.isArray(assignments)) throw new Error("Missing Assignments data");

          // Clean Slate Restore: Clear IDB
          const db = await getDB();
          await db.clear(STORE_NAME);

          // Clear legacy LS to avoid confusion
          localStorage.removeItem(LS_KEYS.SETTINGS);
          localStorage.removeItem(LS_KEYS.OUTLINES);
          localStorage.removeItem(LS_KEYS.SPEAKERS);
          localStorage.removeItem(LS_KEYS.ASSIGNMENTS);

          // Save validated data
          await db.put(STORE_NAME, settings, IDB_KEYS.SETTINGS);
          
          const validOutlines = outlines.filter(isValidOutline);
          await db.put(STORE_NAME, validOutlines, IDB_KEYS.OUTLINES);
          
          const validSpeakers = speakers.filter(isValidSpeaker);
          await db.put(STORE_NAME, validSpeakers, IDB_KEYS.SPEAKERS);
          
          const validAssignments = assignments.filter(isValidAssignment);
          await db.put(STORE_NAME, validAssignments, IDB_KEYS.ASSIGNMENTS);

          const rolesToSave = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;
          await db.put(STORE_NAME, rolesToSave, IDB_KEYS.ROLES);

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
      } catch (e) {
          console.error("Restore failed", e);
          return { success: false };
      }
  }
};
