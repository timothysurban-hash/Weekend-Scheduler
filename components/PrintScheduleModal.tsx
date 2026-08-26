import React, { useState } from 'react';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { Printer, X, Layers } from 'lucide-react';
import {
  formatTagalogMeetingDate,
  formatPrintOutlineInfo,
  chunkAssignmentsForPrint
} from '../domain/scheduleFormatter';

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
  const [selectedBatchId, setSelectedBatchId] = useState<string | 'all'>('all');

  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();

  const monthAssignments = assignments
    .filter(a => {
      const parts = a.date.split('-').map(Number);
      return parts[0] === year && parts[1] - 1 === monthIdx;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const batches = chunkAssignmentsForPrint(monthAssignments, 3);
  const displayedBatches =
    selectedBatchId === 'all'
      ? batches
      : batches.filter(b => b.id === selectedBatchId);

  const getBrotherName = (id?: string | null): string => {
    if (!id) return '';
    const sp = speakers.find(s => s.id === id);
    return sp ? sp.name : '';
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedCongName = settings.congregationName
    ? settings.congregationName.includes('Congregation')
      ? settings.congregationName
      : `${settings.congregationName} Congregation`
    : 'Green Heights Congregation';

  const congTitle = settings.locationName
    ? `${formattedCongName} — ${settings.locationName}`
    : `${formattedCongName} — Tayabas City`;

  return (
    <div className="print-modal-backdrop fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto custom-scrollbar">
      {/* Print Controls Header - Hidden on Print */}
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden border border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#2A080D] dark:text-[#f3a4be]" />
            Print Preview — Weekend Meeting Schedule
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {congTitle} • {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Batch Filter Segmented Control */}
        {batches.length > 1 && (
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 text-xs self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                selectedBatchId === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All (3/page)
            </button>
            {batches.map(batch => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatchId(batch.id)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedBatchId === batch.id
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {batch.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-[#2A080D] hover:bg-[#1f0509] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition cursor-pointer active:scale-95"
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

      {/* Printable Sheets Container */}
      {displayedBatches.length === 0 ? (
        <div className="w-full max-w-3xl bg-white text-slate-900 p-8 shadow-xl rounded-2xl text-center">
          <p className="text-slate-500 font-medium text-sm">
            No meeting assignments scheduled for this month.
          </p>
        </div>
      ) : (
        displayedBatches.map((batch, batchIndex) => (
          <div
            key={batch.id}
            className={`w-full max-w-3xl bg-white text-slate-900 p-4 sm:p-6 shadow-2xl rounded-2xl sm:rounded-sm font-sans mb-6 last:mb-0 print:mb-0 print:p-0 print-page-sheet ${
              batchIndex < displayedBatches.length - 1 ? 'print-page-break' : ''
            }`}
          >
            {/* Header */}
            <div className="text-center mb-3.5 sm:mb-4">
              <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight leading-tight">
                {congTitle}
              </h1>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wider uppercase mt-1 leading-tight">
                ARRANGEMENT FOR WEEKEND MEETING
              </h2>
              <h3 className="text-xs font-semibold text-slate-800 tracking-wide uppercase mt-0.5 leading-tight">
                {settings.meetingTime || 'SUNDAY | 3:00 PM'}
              </h3>
            </div>

            {/* Meeting Cards (3 weeks per sheet) */}
            <div className="space-y-3.5 sm:space-y-4">
              {batch.assignments.map(assignment => {
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
                    className="border border-slate-300 break-inside-avoid page-break-inside-avoid bg-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                  >
                    {/* Burgundy Date Header Bar */}
                    <div className="bg-[#2A080D] text-white text-center font-bold uppercase text-[12px] sm:text-xs py-1 tracking-widest [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                      {dateLabel}
                    </div>

                    {/* Duty Table */}
                    <table className="w-full text-left border-collapse text-[11.5px] sm:text-[12px] leading-snug [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                      <tbody>
                        {/* Entrance Attendant (White) */}
                        <tr className="border-t border-slate-300 bg-white">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300">
                            Entrance Attendant
                          </td>
                          <td className="py-1.5 px-3 font-normal text-slate-900">
                            {getBrotherName(assignment.entranceAttendantId)}
                          </td>
                        </tr>

                        {/* Auditorium Attendant (Tinted) */}
                        <tr className="border-t border-slate-300 bg-[#f9ecef]">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300">
                            Auditorium Attendant
                          </td>
                          <td className="py-1.5 px-3 font-normal text-slate-900">
                            {getBrotherName(assignment.auditoriumAttendantId)}
                          </td>
                        </tr>

                        {/* Chairman (White) */}
                        <tr className="border-t border-slate-300 bg-white">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300">
                            Chairman
                          </td>
                          <td className="py-1.5 px-3 font-normal text-slate-900">
                            {getBrotherName(assignment.chairmanId)}
                          </td>
                        </tr>

                        {/* Speaker (Highlighted #2A080D, White, Enclosed Top) */}
                        <tr className="border-t-2 border-l-2 border-r-2 border-[#2A080D] bg-white">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-[#2A080D] border-r-2 border-[#2A080D]">
                            Speaker
                          </td>
                          <td className="p-0 font-bold text-[#2A080D]">
                            {isGuestSpeaker && speakerCongregation ? (
                              <div className="flex divide-x-2 divide-[#2A080D]">
                                <div className="py-1.5 px-3 flex-1">{speakerName}</div>
                                <div className="py-1.5 px-3 flex-1 font-bold text-[#2A080D]">{speakerCongregation}</div>
                              </div>
                            ) : (
                              <div className="py-1.5 px-3">{speakerName}</div>
                            )}
                          </td>
                        </tr>

                        {/* Tema (Highlighted #2A080D, White, Enclosed Bottom) */}
                        <tr className="border-t border-b-2 border-l-2 border-r-2 border-[#2A080D] bg-white">
                          <td className="w-44 sm:w-48 p-0 border-r-2 border-[#2A080D]">
                            <div className="flex divide-x-2 divide-[#2A080D] h-full items-stretch">
                              <div className="py-1.5 px-3 font-bold text-[#2A080D] flex-1">
                                Tema
                              </div>
                              <div className="w-12 text-center py-1.5 px-1 font-bold text-[#2A080D] shrink-0 flex items-center justify-center">
                                {outlineInfo.number || 'ST'}
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 font-bold text-[#2A080D]">
                            {outlineInfo.title || '\u00A0'}
                          </td>
                        </tr>

                        {/* WT Conductor (White) */}
                        <tr className="border-t border-slate-300 bg-white">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300">
                            WT Conductor
                          </td>
                          <td className="py-1.5 px-3 font-normal text-slate-900">
                            {getBrotherName(assignment.conductorId)}
                          </td>
                        </tr>

                        {/* Paragraph Reader (Tinted) */}
                        <tr className="border-t border-slate-300 bg-[#f9ecef]">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300">
                            Paragraph Reader
                          </td>
                          <td className="py-1.5 px-3 font-normal text-slate-900">
                            {getBrotherName(assignment.readerId)}
                          </td>
                        </tr>

                        {/* Microphone Servers (Tinted) */}
                        <tr className="border-t border-slate-300 bg-[#f9ecef]">
                          <td className="w-44 sm:w-48 py-1.5 px-3 font-bold text-slate-900 border-r border-slate-300 align-middle">
                            Microphone Servers
                          </td>
                          <td className="p-0 font-normal text-slate-900">
                            <div className="divide-y divide-slate-300">
                              <div className="py-1 px-3 min-h-[22px] flex items-center">
                                {mic1 || (!mic2 ? '' : '\u00A0')}
                              </div>
                              <div className="py-1 px-3 min-h-[22px] flex items-center">
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
        ))
      )}
    </div>
  );
};
