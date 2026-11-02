export interface Outline {
  id: number;
  title: string;
  lastUsed: string | null; // ISO Date string
  lastSpeakerId: string | null;
  lastCongregation: string | null;
}

export type DutyRole = 
  | 'speaker'
  | 'chairman'
  | 'conductor'
  | 'reader'
  | 'attendant_entrance'
  | 'attendant_auditorium'
  | 'mic'
  | string; // Dynamic role support

export type SpiritualStatus = 'elder' | 'ms' | 'publisher' | 'up';

export type SpecialEventType = 
  | 'circuit_assembly'
  | 'regional_convention'
  | 'circuit_overseer_visit'
  | 'memorial'
  | 'special_talk'
  | 'custom';

export interface SuspendedDuties {
  speakerId?: string | null;
  outlineId?: number | null;
  customTalkTitle?: string;
  chairmanId?: string | null;
  conductorId?: string | null;
  readerId?: string | null;
  entranceAttendantId?: string | null;
  auditoriumAttendantId?: string | null;
  micServerIds?: string[];
  customDutyAssignments?: Record<string, string[]>;
}

export type RoleCategory = 'meeting_conduct' | 'attendants' | 'audio_video' | 'custom';

export interface RoleDefinition {
  id: string;
  key: string;
  name: string;
  tagalogName: string;
  desc: string;
  category: RoleCategory;
  minSpiritualStatus: SpiritualStatus;
  slotCapacity: number; // Default slot count per meeting
  isActive: boolean;
  isSystemDefault: boolean;
}

export interface BrotherQualification {
  brotherId: string;
  roleId: string;
  qualifiedAt?: string;
}

export interface Speaker {
  id: string;
  name: string;
  congregation: string;
  isGuest: boolean;
  unavailableDates: string[]; // ISO Date strings
  lastAssigned: string | null;
  sortOrder: number; // For manual rotation sequencing
  qualifications?: DutyRole[]; // Duty roles brother is qualified for
  customTags?: string[]; // Custom tags e.g. 'Elder', 'MS', 'AV', 'Sound'
  spiritualStatus?: SpiritualStatus; // Normalized spiritual status
}

export interface Assignment {
  id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  speakerId: string | null;
  outlineId: number | null;
  entranceAttendantId?: string | null;
  auditoriumAttendantId?: string | null;
  chairmanId?: string | null;
  conductorId?: string | null;
  readerId?: string | null;
  micServerIds?: string[]; // Array of 1 or 2 brother IDs
  isSpecialEvent?: boolean; // Assembly / Convention flag
  specialEventType?: SpecialEventType;
  specialEventTitle?: string;
  noMeeting?: boolean;
  suspendedDuties?: SuspendedDuties;
  locked: boolean;
  speakerLocked?: boolean;
  note?: string;
  hostSpeakerId?: string | null;
  customTalkTitle?: string;
  customDutyAssignments?: Record<string, string[]>; // Dynamic roleId -> array of brother IDs
}

export interface RoleRule {
  role: DutyRole;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  fixedPairs?: [string, string][];
  rosterIds: string[];
  lastRotationIndex?: number;
}

export interface AppSettings {
  cooldownMonths: number;
  maxMonthlyDutiesPerBrother: number;
  congregationName: string;
  locationName?: string;
  meetingTime?: string;
  languageMode?: 'english' | 'tagalog' | 'both';
  roleRules?: Partial<Record<DutyRole, RoleRule>>;
  authorityRoles?: {
    conductorId?: string | null;
    auditoriumAttendantId?: string | null;
  };
  visibleRoles?: string[]; // Column visibility keys on Dashboard
}

export type ViewState = 'schedule' | 'speakers' | 'roles' | 'outlines' | 'settings';
