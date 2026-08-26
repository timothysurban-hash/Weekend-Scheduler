import { Assignment, Speaker, Outline } from '../types';

export interface ClipboardRosterResult {
  text: string;
  count: number;
  formattedDate: string;
}

export interface PrintAssignmentBatch {
  id: string;
  label: string;
  assignments: Assignment[];
}

export const TAGALOG_MONTHS = [
  'ENERO', 'PEBRERO', 'MARSO', 'ABRIL', 'MAYO', 'HUNYO',
  'HULYO', 'AGOSTO', 'SETYEMBRE', 'OKTUBRE', 'NOBYEMBRE', 'DISYEMBRE'
];

/**
 * Formats YYYY-MM-DD into Tagalog meeting date string (e.g. "AGOSTO 9", "SETYEMBRE 16").
 */
export const formatTagalogMeetingDate = (dateStr: string): string => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr;
  const monthIdx = parts[1] - 1;
  const day = parts[2];
  const monthName = TAGALOG_MONTHS[monthIdx] || `MONTH ${parts[1]}`;
  return `${monthName} ${day}`;
};

/**
 * Formats outline info for the print layout with number box and talk title.
 */
export const formatPrintOutlineInfo = (
  assignment: Assignment,
  outlines: Outline[] = []
): { number: string; title: string } => {
  if (assignment.isSpecialEvent) {
    return {
      number: 'SE',
      title: assignment.specialEventTitle || assignment.customTalkTitle || 'Special Event / Assembly'
    };
  }

  if (assignment.outlineId) {
    const outline = outlines.find(o => o.id === assignment.outlineId);
    return {
      number: String(assignment.outlineId),
      title: assignment.customTalkTitle || outline?.title || `Outline #${assignment.outlineId}`
    };
  }

  if (assignment.customTalkTitle) {
    return {
      number: 'ST',
      title: assignment.customTalkTitle
    };
  }

  return { number: '', title: '' };
};

/**
 * Extracts and formats all assigned brother names for a given meeting into newline-separated text.
 */
export const formatBrotherNamesForClipboard = (
  assignment: Assignment,
  speakers: Speaker[]
): ClipboardRosterResult => {
  const idsToCopy: string[] = [];

  if (assignment.chairmanId) idsToCopy.push(assignment.chairmanId);
  if (assignment.conductorId) idsToCopy.push(assignment.conductorId);
  if (assignment.readerId) idsToCopy.push(assignment.readerId);
  if (assignment.speakerId) idsToCopy.push(assignment.speakerId);
  if (assignment.entranceAttendantId) idsToCopy.push(assignment.entranceAttendantId);
  if (assignment.auditoriumAttendantId) idsToCopy.push(assignment.auditoriumAttendantId);
  if (assignment.micServerIds && assignment.micServerIds.length > 0) {
    idsToCopy.push(...assignment.micServerIds.filter(Boolean));
  }

  // Dynamic / Custom duties
  if (assignment.customDutyAssignments) {
    Object.values(assignment.customDutyAssignments).forEach(ids => {
      if (Array.isArray(ids)) {
        idsToCopy.push(...ids.filter(Boolean));
      }
    });
  }

  const speakerMap = new Map<string, string>();
  speakers.forEach(s => speakerMap.set(s.id, s.name));

  const names = idsToCopy
    .map(id => speakerMap.get(id))
    .filter((name): name is string => Boolean(name && name.trim() !== ''));

  const dateObj = new Date(assignment.date);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : assignment.date;

  return {
    text: names.join('\n'),
    count: names.length,
    formattedDate
  };
};

/**
 * Serializes assignments, speakers, and outlines into a CSV string.
 */
export const formatScheduleCsv = (
  assignments: Assignment[],
  speakers: Speaker[],
  outlines: Outline[]
): string => {
  const speakerMap = new Map<string, Speaker>();
  speakers.forEach(s => speakerMap.set(s.id, s));

  const outlineMap = new Map<number, Outline>();
  outlines.forEach(o => outlineMap.set(o.id, o));

  const headers = [
    'Date',
    'Special Event',
    'Public Speaker',
    'Talk Title',
    'Outline #',
    'Congregation',
    'Chairman',
    'WT Conductor',
    'WT Reader',
    'Entrance Attendant',
    'Auditorium Attendant',
    'Mic Server 1',
    'Mic Server 2',
    'Note'
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = assignments.map(a => {
    const speaker = a.speakerId ? speakerMap.get(a.speakerId) : null;
    const outline = a.outlineId ? outlineMap.get(a.outlineId) : null;
    const chairman = a.chairmanId ? speakerMap.get(a.chairmanId)?.name : '';
    const conductor = a.conductorId ? speakerMap.get(a.conductorId)?.name : '';
    const reader = a.readerId ? speakerMap.get(a.readerId)?.name : '';
    const entrance = a.entranceAttendantId ? speakerMap.get(a.entranceAttendantId)?.name : '';
    const auditorium = a.auditoriumAttendantId ? speakerMap.get(a.auditoriumAttendantId)?.name : '';
    const mic1 = a.micServerIds && a.micServerIds[0] ? speakerMap.get(a.micServerIds[0])?.name : '';
    const mic2 = a.micServerIds && a.micServerIds[1] ? speakerMap.get(a.micServerIds[1])?.name : '';

    const talkTitle = a.customTalkTitle || (outline ? outline.title : '');

    return [
      escapeCsv(a.date),
      escapeCsv(a.isSpecialEvent ? a.specialEventTitle || 'Special Event' : ''),
      escapeCsv(speaker ? speaker.name : ''),
      escapeCsv(talkTitle),
      escapeCsv(a.outlineId || ''),
      escapeCsv(speaker ? speaker.congregation : ''),
      escapeCsv(chairman),
      escapeCsv(conductor),
      escapeCsv(reader),
      escapeCsv(entrance),
      escapeCsv(auditorium),
      escapeCsv(mic1),
      escapeCsv(mic2),
      escapeCsv(a.note || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Partitions assignments into batches of up to `batchSize` (default 3) for clean printing.
 */
export const chunkAssignmentsForPrint = (
  assignments: Assignment[],
  batchSize: number = 3
): PrintAssignmentBatch[] => {
  if (!assignments || assignments.length === 0) return [];
  const batches: PrintAssignmentBatch[] = [];
  const safeBatchSize = Math.max(1, batchSize);

  for (let i = 0; i < assignments.length; i += safeBatchSize) {
    const chunk = assignments.slice(i, i + safeBatchSize);
    const startWeek = i + 1;
    const endWeek = i + chunk.length;
    const label = startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}–${endWeek}`;
    batches.push({
      id: `batch-${Math.floor(i / safeBatchSize) + 1}`,
      label,
      assignments: chunk
    });
  }

  return batches;
};
