import React from 'react';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { Printer, X } from 'lucide-react';
import { formatTagalogMeetingDate, formatPrintOutlineInfo } from '../domain/scheduleFormatter';

interface PrintScheduleModalProps {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  viewDate: Date;
  onClose: () => void;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  assignments,
  speakers,
  outlines,
  settings,
  viewDate,
  onClose
}) => {
  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();

  const monthAssignments = assignments
    .filter(a => {
      const parts = a.date.split('-').map(Number);
      return parts[0] === year && parts[1] - 1 === monthIdx;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const getBrotherName = (id?: string | null): string => {
    if (!id) return '';
    const sp = speakers.find(s => s.id === id);
    return sp ? sp.name : '';
  };

  const handlePrint = () => {
    window.print();
  };

  const congTitle = settings.congregationName
    ? `${settings.congregationName}${settings.locationName ? ` — ${settings.locationName}` : ''}`
    : 'Green Heights Congregation — Tayabas City';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto">
      {/* Print Controls Header - Hidden on Print */}
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden border border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Print Preview — Weekend Meeting Schedule
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {congTitle} • {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-[#4a1525] hover:bg-[#3d111e] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Schedule
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="w-full max-w-3xl bg-white text-slate-900 p-4 sm:p-8 md:p-10 shadow-2xl rounded-2xl sm:rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none font-sans overflow-x-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
            {congTitle}
          </h1>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wider uppercase mt-0.5">
            ARRANGEMENT FOR WEEKEND MEETING
          </h2>
          <h3 className="text-xs font-semibold text-slate-800 tracking-wide uppercase mt-0.5">
            {settings.meetingTime || 'SUNDAY | 3:00 PM'}
          </h3>
        </div>

        {/* Meeting Cards */}
        <div className="space-y-6">
          {monthAssignments.map(assignment => {
            const dateLabel = formatTagalogMeetingDate(assignment.date);
            const outlineInfo = formatPrintOutlineInfo(assignment, outlines);

            const speakerObj = assignment.speakerId
              ? speakers.find(s => s.id === assignment.speakerId)
              : null;
            const isGuestSpeaker = Boolean(
              speakerObj?.isGuest ||
              (speakerObj?.congregation &&
                settings.congregationName &&
                speakerObj.congregation.trim().toLowerCase() !== settings.congregationName.trim().toLowerCase())
            );
            const speakerName = speakerObj ? speakerObj.name : '';
            const speakerCongregation = speakerObj ? speakerObj.congregation : '';

            const mic1 = assignment.micServerIds?.[0] ? getBrotherName(assignment.micServerIds[0]) : '';
            const mic2 = assignment.micServerIds?.[1] ? getBrotherName(assignment.micServerIds[1]) : '';

            return (
              <div
                key={assignment.id}
                className="border border-slate-900 break-inside-avoid page-break-inside-avoid bg-white"
              >
                {/* Burgundy Date Header Bar */}
                <div className="bg-[#4a1525] text-white text-center font-bold uppercase text-xs sm:text-sm py-1 tracking-widest [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                  {dateLabel}
                </div>

                {/* Duty Table */}
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Entrance Attendant
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-900">
                        {getBrotherName(assignment.entranceAttendantId)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Auditorium Attendant
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-900">
                        {getBrotherName(assignment.auditoriumAttendantId)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Chairman
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-900">
                        {getBrotherName(assignment.chairmanId)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Speaker
                      </td>
                      <td className="p-0 font-medium text-slate-900">
                        {isGuestSpeaker && speakerCongregation ? (
                          <div className="flex divide-x divide-slate-900">
                            <div className="py-1 px-3 flex-1">{speakerName}</div>
                            <div className="py-1 px-3 flex-1 text-slate-900 font-semibold">{speakerCongregation}</div>
                          </div>
                        ) : (
                          <div className="py-1 px-3">{speakerName}</div>
                        )}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Tema
                      </td>
                      <td className="p-0 font-medium text-slate-900">
                        <div className="flex divide-x divide-slate-900">
                          <div className="w-14 text-center py-1 px-2 font-semibold text-slate-900 shrink-0">
                            {outlineInfo.number || '\u00A0'}
                          </div>
                          <div className="py-1 px-3 flex-1 text-slate-900">
                            {outlineInfo.title}
                          </div>
                        </div>
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        WT Conductor
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-900">
                        {getBrotherName(assignment.conductorId)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900">
                        Paragraph Reader
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-900">
                        {getBrotherName(assignment.readerId)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-900">
                      <td className="w-44 sm:w-48 py-1 px-3 font-semibold text-slate-900 border-r border-slate-900 align-middle">
                        Microphone Servers
                      </td>
                      <td className="p-0 font-medium text-slate-900">
                        <div className="divide-y divide-slate-900">
                          <div className="py-1 px-3 min-h-[24px]">
                            {mic1 || (!mic2 ? '' : '\u00A0')}
                          </div>
                          <div className="py-1 px-3 min-h-[24px]">
                            {mic2 || '\u00A0'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
