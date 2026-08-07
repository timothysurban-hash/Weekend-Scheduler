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
      if (!Array.isArray(raw)) return INITIAL_SPEAKERS;
      
      let valid = raw.filter(isValidSpeaker);
      
      // Migration: Ensure sortOrder & customTags exist
      valid = valid.map((s, idx) => {
        const init = INITIAL_SPEAKERS.find(i => i.id === s.id);
        return {
          ...s,
          sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : idx,
          customTags: (s.customTags && s.customTags.length > 0) ? s.customTags : (init?.customTags || [])
        };
      });

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

    return {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: { settings, outlines, speakers, assignments }
    };
  },

  restoreBackup: async (backup: any) => {
      try {
          if (!backup || !backup.data) throw new Error("Invalid backup format");
          const { settings, outlines, speakers, assignments } = backup.data;
          
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
          
          return true;
      } catch (e) {
          console.error("Restore failed", e);
          return false;
      }
  }
};
