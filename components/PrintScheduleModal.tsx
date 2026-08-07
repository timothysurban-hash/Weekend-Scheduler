import React from 'react';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { Printer, X } from 'lucide-react';

interface PrintScheduleModalProps {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  viewDate: Date;
  onClose: () => void;
}

const ROLE_LABELS = {
  entrance: {
    both: 'Entrace Attendant / Entrance Attendant',
    tagalog: 'Entrace Attendant',
    english: 'Entrance Attendant'
  },
  auditorium: {
    both: 'Auditorium Attendant / Tagapangasiwa sa Auditorium',
    tagalog: 'Auditorium Attendant',
    english: 'Auditorium Attendant'
  },
  chairman: {
    both: 'Chairman / Tagapangulo',
    tagalog: 'Chairman',
    english: 'Chairman'
  },
  speaker: {
    both: 'Speaker / Tagapagsalita',
    tagalog: 'Speaker',
    english: 'Speaker'
  },
  theme: {
    both: 'Tema / Subject Title',
    tagalog: 'Tema',
    english: 'Talk Theme'
  },
  conductor: {
    both: 'Konduktor ng Bantayan / Watchtower Conductor',
    tagalog: 'Konduktor ng Bantayan',
    english: 'Watchtower Conductor'
  },
  reader: {
    both: 'Tagabasa ng Parapo / Paragraph Reader',
    tagalog: 'Tagabasa ng Parapo',
    english: 'Paragraph Reader'
  },
  mic: {
    both: 'Microphone Servers / Tagahawak ng Mikropono',
    tagalog: 'Microphone Servers',
    english: 'Microphone Servers'
  }
};

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  assignments, speakers, outlines, settings, viewDate, onClose
}) => {
  const mode = settings.languageMode || 'both';

  const monthNameTagalog = viewDate.toLocaleDateString('tl-PH', { month: 'long' }).toUpperCase();
  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();

  const monthAssignments = assignments.filter(a => {
    const parts = a.date.split('-').map(Number);
    return parts[0] === year && (parts[1] - 1) === monthIdx;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const getBrotherName = (id?: string | null) => {
    if (!id) return '';
    const sp = speakers.find(s => s.id === id);
    return sp ? sp.name : '';
  };

  const getOutlineInfo = (outlineId?: number | null) => {
    if (!outlineId) return '';
    const o = outlines.find(item => item.id === outlineId);
    return o ? `${o.id}. ${o.title}` : '';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-start p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-4 mb-4 flex items-center justify-between print:hidden">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Print Preview - Weekend Meeting Schedule</h3>
          <p className="text-xs text-slate-500">{monthNameTagalog} {year} • {settings.congregationName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Arrangement Sheet
          </button>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl bg-white border border-slate-300 p-8 shadow-2xl rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full">
        <div className="text-center mb-6 font-serif uppercase tracking-wide">
          <h1 className="text-lg font-bold text-black">{settings.congregationName || 'GREEN HEIGHTS CONGREGATION'} - {settings.locationName || 'TAYABAS CITY'}</h1>
          <h2 className="text-md font-bold text-black">ARRANGEMENT FOR WEEKEND MEETING</h2>
          <h3 className="text-sm font-semibold text-black">{settings.meetingTime || 'SUNDAY 3:00 P.M.'}</h3>
        </div>

        <div className="space-y-6">
          {monthAssignments.map((assignment) => {
            const dayNum = parseInt(assignment.date.split('-')[2], 10);
            const dateLabel = `${monthNameTagalog} ${dayNum}`;
            const micServers = (assignment.micServerIds || []).map(getBrotherName).filter(Boolean);

            return (
              <div key={assignment.id} className="border-2 border-black">
                <div className="bg-white border-b-2 border-black text-center font-bold font-serif py-1 text-sm tracking-wider text-black uppercase">
                  {dateLabel}
                </div>

                <table className="w-full text-left border-collapse text-xs font-serif">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-1/3 py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.entrance[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.entranceAttendantId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.auditorium[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.auditoriumAttendantId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.chairman[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.chairmanId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.speaker[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.speakerId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.theme[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getOutlineInfo(assignment.outlineId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.conductor[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.conductorId)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 border-r border-black font-semibold">{ROLE_LABELS.reader[mode]}</td>
                      <td className="py-1 px-3 font-semibold">{getBrotherName(assignment.readerId)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 border-r border-black font-semibold align-top">{ROLE_LABELS.mic[mode]}</td>
                      <td className="py-1 px-3 font-semibold">
                        {micServers.length > 0 ? (
                          micServers.map((name, idx) => (
                            <div key={idx}>{name}</div>
                          ))
                        ) : ''}
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
