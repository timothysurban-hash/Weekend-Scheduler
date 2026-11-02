import React, { useState, useRef, useEffect } from 'react';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { Printer, X, Layers, Calendar, ChevronDown, Check, Image as ImageIcon } from 'lucide-react';
import {
  formatTagalogMeetingDate,
  formatPrintOutlineInfo,
  chunkAssignmentsForPrint,
  generateSchedulePdfTitle
} from '../domain/scheduleFormatter';
import {
  exportSheetToPng,
  generateScheduleImageFilename,
  triggerDownload
} from '../domain/imageExporter';

interface MonthGroup {
  monthKey: string;
  monthName: string;
  dates: string[];
}

const groupDatesByMonth = (dates: string[]): MonthGroup[] => {
  const groups: { [key: string]: MonthGroup } = {};
  const monthNames = [
    'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
    'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'
  ];

  dates.forEach(d => {
    const [y, m] = d.split('-').map(Number);
    const key = `${y}-${m}`;
    if (!groups[key]) {
      groups[key] = {
        monthKey: key,
        monthName: `${monthNames[m - 1]} ${y}`,
        dates: []
      };
    }
    groups[key].dates.push(d);
  });

  return Object.values(groups);
};

interface DateRangeDropdownProps {
  label: string;
  value: string;
  allDates: string[];
  onChange: (date: string) => void;
}

const DateRangeDropdown: React.FC<DateRangeDropdownProps> = ({
  label,
  value,
  allDates,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const monthGroups = groupDatesByMonth(allDates);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayDate = value ? formatTagalogMeetingDate(value) : 'Select date';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'bg-[#F9EEED] dark:bg-[#2A080D]/30 border-[#2A080D]/40 text-[#2A080D] dark:text-[#f3a4be] ring-2 ring-[#2A080D]/20'
            : 'bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-[#2A080D] dark:text-[#f3a4be] shrink-0" />
        <span className="font-semibold text-slate-500 dark:text-slate-400">{`${label}:`}</span>
        <span className="font-bold tracking-tight text-slate-900 dark:text-white uppercase">{displayDate}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#2A080D] dark:text-[#f3a4be]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-56 max-h-72 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95">
          {monthGroups.map(group => (
            <div key={group.monthKey} className="mb-2 last:mb-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs">
                {group.monthName}
              </div>
              <div className="space-y-0.5">
                {group.dates.map(dateStr => {
                  const isSelected = dateStr === value;
                  const day = parseInt(dateStr.split('-')[2], 10);
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#F9EEED] dark:bg-[#2A080D]/40 text-[#2A080D] dark:text-[#f3a4be] font-bold shadow-xs'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          isSelected
                            ? 'bg-[#2A080D] text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}>
                          {day}
                        </span>
                        <span>{formatTagalogMeetingDate(dateStr)}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2A080D] dark:text-[#f3a4be]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface PrintScheduleModalProps {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  viewDate: Date;
  initialStartDate?: string;
  initialEndDate?: string;
  onClose: () => void;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  assignments,
  speakers,
  outlines,
  settings,
  viewDate,
  initialStartDate,
  initialEndDate,
  onClose
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string | 'all'>('all');

  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();

  // Collect all unique available assignment dates sorted chronologically
  const allDates = Array.from(new Set(assignments.map(a => a.date))).sort();

  const monthDates = allDates.filter(d => {
    const parts = d.split('-').map(Number);
    return parts[0] === year && parts[1] - 1 === monthIdx;
  });

  const firstMeetingOfMonth = monthDates[0] || allDates[0] || '';
  const defaultStart = initialStartDate || firstMeetingOfMonth;
  // Default 'To' to the 4th week of the month (index 3) so 4 weeks fit on 1 page by default
  const defaultEnd =
    initialEndDate ||
    (monthDates.length >= 4 ? monthDates[3] : monthDates[monthDates.length - 1]) ||
    allDates[Math.min(3, allDates.length - 1)] ||
    defaultStart;

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // 'From' only shows the weeks within the viewed month
  const fromDates = monthDates.length > 0 ? monthDates : allDates;

  // 'To' starts at the 3rd week of the viewed month (weeks 1 and 2 excluded) and includes future months
  const minToDate = (monthDates.length >= 3 ? monthDates[2] : monthDates[monthDates.length - 1]) || allDates[0] || '';
  const toDates = allDates.filter(d => d >= minToDate && d >= startDate);

  // Filter assignments across the chosen date range
  const filteredAssignments = assignments
    .filter(a => (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  const batches = chunkAssignmentsForPrint(filteredAssignments, 4);
  const displayedBatches =
    selectedBatchId === 'all'
      ? batches
      : batches.filter(b => b.id === selectedBatchId);

  const getBrotherName = (id?: string | null): string => {
    if (!id) return '';
    const sp = speakers.find(s => s.id === id);
    return sp ? sp.name : '';
  };

  const [isExportingImage, setIsExportingImage] = useState(false);

  const handleSaveAsImage = async () => {
    try {
      setIsExportingImage(true);
      const sheets = Array.from(document.querySelectorAll<HTMLElement>('.print-page-sheet'));
      if (sheets.length === 0) return;

      if (sheets.length === 1) {
        const dataUrl = await exportSheetToPng(sheets[0], { pixelRatio: 3, backgroundColor: '#ffffff' });
        triggerDownload(dataUrl, generateScheduleImageFilename(startDate, endDate));
      } else {
        for (let i = 0; i < sheets.length; i++) {
          const dataUrl = await exportSheetToPng(sheets[i], { pixelRatio: 3, backgroundColor: '#ffffff' });
          triggerDownload(dataUrl, generateScheduleImageFilename(startDate, endDate, i + 1));
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    } catch (err) {
      console.error('Failed to export schedule image:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Maintain document title so browser "Save as PDF" automatically suggests the formatted name
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalTitle = document.title;
    if (startDate && endDate) {
      document.title = generateSchedulePdfTitle(startDate, endDate);
    }
    return () => {
      document.title = originalTitle;
    };
  }, [startDate, endDate]);

  const handlePrint = () => {
    if (typeof document !== 'undefined' && startDate && endDate) {
      const originalTitle = document.title;
      const pdfTitle = generateSchedulePdfTitle(startDate, endDate);
      document.title = pdfTitle;

      const restoreTitle = () => {
        document.title = originalTitle;
        window.removeEventListener('afterprint', restoreTitle);
      };

      window.addEventListener('afterprint', restoreTitle);
      window.print();
      setTimeout(restoreTitle, 1000);
    } else {
      window.print();
    }
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
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col gap-3 print:hidden border border-slate-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2A080D] dark:text-[#f3a4be]" />
              Print Preview — Weekend Meeting Schedule
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {`${congTitle} • ${filteredAssignments.length} ${filteredAssignments.length === 1 ? 'meeting' : 'meetings'} selected`}
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-2.5 self-end sm:self-auto shrink-0">
            <button
              onClick={handleSaveAsImage}
              disabled={isExportingImage}
              className={`flex items-center px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer active:scale-95 border ${
                isExportingImage
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 border-slate-200 dark:border-zinc-700 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700'
              }`}
              title="Save high-resolution (300 DPI) image copy of the schedule"
            >
              {isExportingImage ? (
                <>
                  <span className="w-3.5 h-3.5 mr-1.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  Saving...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-1.5 text-[#2A080D] dark:text-[#f3a4be] shrink-0" />
                  Save as Image
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-3.5 sm:px-4 py-2 bg-[#2A080D] hover:bg-[#1f0509] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 mr-1.5" />
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

        {/* Date Range Selection & Batch Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
          {/* Custom Date Range Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <DateRangeDropdown
              label="From"
              value={startDate}
              allDates={fromDates}
              onChange={(newStart) => {
                setStartDate(newStart);
                if (endDate < newStart) setEndDate(newStart);
                setSelectedBatchId('all');
              }}
            />
            <DateRangeDropdown
              label="To"
              value={endDate}
              allDates={toDates}
              onChange={(newEnd) => {
                setEndDate(newEnd);
                if (startDate > newEnd) setStartDate(newEnd);
                setSelectedBatchId('all');
              }}
            />
          </div>

          {/* Batch Filter Segmented Control */}
          {batches.length > 1 && (
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedBatchId('all')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedBatchId === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All (4/page)
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
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            className={`w-full max-w-3xl bg-white text-slate-900 p-3 sm:p-5 shadow-2xl rounded-2xl sm:rounded-sm mb-4 last:mb-0 print:mb-0 print:p-0 print-page-sheet ${
              batchIndex < displayedBatches.length - 1 ? 'print-page-break' : ''
            }`}
          >
            {/* Header */}
            <div className="text-center mb-2 sm:mb-2.5">
              <h1 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight leading-tight">
                {congTitle}
              </h1>
              <h2 className="text-[11px] sm:text-xs font-bold text-slate-900 tracking-wider uppercase mt-0.5 leading-tight">
                ARRANGEMENT FOR WEEKEND MEETING
              </h2>
              <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-800 tracking-wide uppercase leading-tight">
                {settings.meetingTime || 'SUNDAY | 3:00 PM'}
              </h3>
            </div>

            {/* Meeting Cards (4 weeks per sheet) */}
            <div className="space-y-2 sm:space-y-2.5">
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
                const isNoMeetingSpecialEvent = Boolean(assignment.isSpecialEvent && (assignment.noMeeting ?? true));

                return (
                  <div
                    key={assignment.id}
                    className={`break-inside-avoid page-break-inside-avoid bg-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact] ${
                      isNoMeetingSpecialEvent
                        ? 'border-2 border-[#2A080D]'
                        : 'border-[1.5px] border-[#EEDCDA]'
                    }`}
                  >
                    {/* Burgundy Date Header Bar */}
                    <div className="bg-[#2A080D] text-white text-center font-bold uppercase text-[14px] py-0.5 tracking-wider [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                      {dateLabel}
                    </div>

                    {/* Duty Table or Special Event Notice */}
                    {isNoMeetingSpecialEvent ? (
                      <div className="py-7 sm:py-8 px-4 text-center bg-[#FAF6F5] border-t-2 border-[#2A080D] flex flex-col items-center justify-center space-y-1.5 [print-color-adjust:exact]">
                        <div className="text-[17px] sm:text-[19px] font-black uppercase tracking-wider text-[#2A080D] leading-tight">
                          {assignment.specialEventTitle || 'Special Event / Assembly'}
                        </div>
                        <div className="text-[12px] sm:text-[13px] font-bold text-slate-600 uppercase tracking-widest">
                          {settings.languageMode === 'tagalog'
                            ? 'Walang Pulong sa Kingdom Hall'
                            : settings.languageMode === 'both'
                            ? 'Walang Pulong sa Kingdom Hall • No Meeting at Kingdom Hall'
                            : 'No Meeting at Kingdom Hall'}
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[13.5px] leading-tight [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                      <tbody>
                        {/* Entrance Attendant (White) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-white">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA]">
                            Entrance Attendant
                          </td>
                          <td className="py-0.5 px-2 font-normal text-slate-900">
                            {getBrotherName(assignment.entranceAttendantId)}
                          </td>
                        </tr>

                        {/* Auditorium Attendant (Tinted #F9EEED) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-[#F9EEED]">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA]">
                            Auditorium Attendant
                          </td>
                          <td className="py-0.5 px-2 font-normal text-slate-900">
                            {getBrotherName(assignment.auditoriumAttendantId)}
                          </td>
                        </tr>

                        {/* Chairman (White) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-white">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA]">
                            Chairman
                          </td>
                          <td className="py-0.5 px-2 font-normal text-slate-900">
                            {getBrotherName(assignment.chairmanId)}
                          </td>
                        </tr>

                        {/* Speaker (Highlighted #2A080D, Tinted #F9EEED, Enclosed Top) */}
                        <tr className="border-t-2 border-l-2 border-r-2 border-[#2A080D] bg-[#F9EEED]">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-[#2A080D] border-r-2 border-[#2A080D]">
                            Speaker
                          </td>
                          <td className="p-0 font-bold text-[#2A080D]">
                            {isGuestSpeaker && speakerCongregation ? (
                              <div className="flex divide-x-2 divide-[#2A080D]">
                                <div className="py-0.5 px-2 flex-1">{speakerName}</div>
                                <div className="py-0.5 px-2 flex-1 font-bold text-[#2A080D]">{speakerCongregation}</div>
                              </div>
                            ) : (
                              <div className="py-0.5 px-2">{speakerName}</div>
                            )}
                          </td>
                        </tr>

                        {/* Tema (Highlighted #2A080D, White, Enclosed Bottom) */}
                        <tr className="border-t border-b-2 border-l-2 border-r-2 border-[#2A080D] bg-white">
                          <td className="w-44 sm:w-48 p-0 border-r-2 border-[#2A080D]">
                            <div className="flex divide-x-2 divide-[#2A080D] h-full items-stretch">
                              <div className="py-0.5 px-2 font-bold text-[#2A080D] flex-1">
                                Tema
                              </div>
                              <div className="w-12 text-center py-0.5 px-1 font-bold text-[#2A080D] shrink-0 flex items-center justify-center">
                                {outlineInfo.number || 'ST'}
                              </div>
                            </div>
                          </td>
                          <td className="py-0.5 px-2 font-bold text-[#2A080D]">
                            {outlineInfo.title || '\u00A0'}
                          </td>
                        </tr>

                        {/* WT Conductor (Tinted #F9EEED) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-[#F9EEED]">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA]">
                            WT Conductor
                          </td>
                          <td className="py-0.5 px-2 font-normal text-slate-900">
                            {getBrotherName(assignment.conductorId)}
                          </td>
                        </tr>

                        {/* Paragraph Reader (White) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-white">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA]">
                            Paragraph Reader
                          </td>
                          <td className="py-0.5 px-2 font-normal text-slate-900">
                            {getBrotherName(assignment.readerId)}
                          </td>
                        </tr>

                        {/* Microphone Servers (Alternating: Title #F9EEED, Line 1 #F9EEED, Line 2 White) */}
                        <tr className="border-t-[1.5px] border-[#EEDCDA] bg-[#F9EEED]">
                          <td className="w-44 sm:w-48 py-0.5 px-2 font-bold text-slate-900 border-r-[1.5px] border-[#EEDCDA] align-middle">
                            Microphone Servers
                          </td>
                          <td className="p-0 font-normal text-slate-900">
                            <div className="divide-y-[1.5px] divide-[#EEDCDA]">
                              <div className="py-0.5 px-2 min-h-[18px] flex items-center bg-[#F9EEED]">
                                {mic1 || (!mic2 ? '' : '\u00A0')}
                              </div>
                              <div className="py-0.5 px-2 min-h-[18px] flex items-center bg-white">
                                {mic2 || '\u00A0'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    )}
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
