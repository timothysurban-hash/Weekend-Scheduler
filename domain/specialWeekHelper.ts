import { Assignment, SpecialEventType, SuspendedDuties } from '../types';

export interface SetSpecialEventOptions {
  isSpecialEvent: boolean;
  specialEventType?: SpecialEventType;
  specialEventTitle?: string;
  noMeeting?: boolean;
  customTalkTitle?: string;
}

export const setAssignmentSpecialEvent = (
  assignment: Assignment,
  options: SetSpecialEventOptions
): Assignment => {
  if (!options.isSpecialEvent) {
    return revertAssignmentSpecialEvent(assignment);
  }

  if (options.noMeeting) {
    const suspended: SuspendedDuties = {
      speakerId: assignment.speakerId,
      outlineId: assignment.outlineId,
      customTalkTitle: assignment.customTalkTitle,
      chairmanId: assignment.chairmanId,
      conductorId: assignment.conductorId,
      readerId: assignment.readerId,
      entranceAttendantId: assignment.entranceAttendantId,
      auditoriumAttendantId: assignment.auditoriumAttendantId,
      micServerIds: assignment.micServerIds,
      customDutyAssignments: assignment.customDutyAssignments,
    };

    return {
      ...assignment,
      isSpecialEvent: true,
      specialEventType: options.specialEventType,
      specialEventTitle: options.specialEventTitle,
      noMeeting: true,
      suspendedDuties: assignment.suspendedDuties || suspended,
      speakerId: null,
      outlineId: null,
      customTalkTitle: undefined,
      chairmanId: null,
      conductorId: null,
      readerId: null,
      entranceAttendantId: null,
      auditoriumAttendantId: null,
      micServerIds: [],
      customDutyAssignments: {},
    };
  }

  return {
    ...assignment,
    isSpecialEvent: true,
    specialEventType: options.specialEventType,
    specialEventTitle: options.specialEventTitle,
    noMeeting: false,
    customTalkTitle: options.customTalkTitle !== undefined ? options.customTalkTitle : assignment.customTalkTitle,
  };
};

export const revertAssignmentSpecialEvent = (assignment: Assignment): Assignment => {
  const restored = assignment.suspendedDuties || {};
  return {
    ...assignment,
    isSpecialEvent: false,
    specialEventType: undefined,
    specialEventTitle: undefined,
    noMeeting: false,
    suspendedDuties: undefined,
    speakerId: restored.speakerId !== undefined ? restored.speakerId : assignment.speakerId,
    outlineId: restored.outlineId !== undefined ? restored.outlineId : assignment.outlineId,
    customTalkTitle: restored.customTalkTitle !== undefined ? restored.customTalkTitle : assignment.customTalkTitle,
    chairmanId: restored.chairmanId !== undefined ? restored.chairmanId : assignment.chairmanId,
    conductorId: restored.conductorId !== undefined ? restored.conductorId : assignment.conductorId,
    readerId: restored.readerId !== undefined ? restored.readerId : assignment.readerId,
    entranceAttendantId: restored.entranceAttendantId !== undefined ? restored.entranceAttendantId : assignment.entranceAttendantId,
    auditoriumAttendantId: restored.auditoriumAttendantId !== undefined ? restored.auditoriumAttendantId : assignment.auditoriumAttendantId,
    micServerIds: restored.micServerIds !== undefined ? restored.micServerIds : assignment.micServerIds,
    customDutyAssignments: restored.customDutyAssignments !== undefined ? restored.customDutyAssignments : assignment.customDutyAssignments,
  };
};
