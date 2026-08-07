import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outline, AppSettings, Assignment } from '../types';
import { Clock, CheckCircle, AlertCircle, Trash2, ArrowUp } from 'lucide-react';
import { showToast } from './ui/Toast';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';

interface OutlineListProps {
  outlines: Outline[];
  settings: AppSettings;
  updateOutlines: (outlines: Outline[]) => void;
  assignments: Assignment[];
}

export const OutlineList: React.FC<OutlineListProps> = ({ outlines, settings, updateOutlines, assignments }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newOutline, setNewOutline] = useState<{id: string, title: string}>({ id: '', title: '' });
  
  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [exitingId, setExitingId] = useState<number | null>(null);

  const [importMessage, setImportMessage] = useState<{ text: string, isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      setShowScrollTop(mainEl.scrollTop > 600);
    };

    mainEl.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExport = () => {
    const headers = ['Number', 'Title', 'Last Used'];
    const rows = outlines.map(o => {
      const effectiveLastUsed = getEffectiveLastUsed(o);
      const dateStr = effectiveLastUsed ? new Date(effectiveLastUsed).toLocaleDateString() : '';
      return [`"${o.id}"`, `"${o.title.replace(/"/g, '""')}"`, `"${dateStr}"`].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Outlines.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let updatedOutlines = [...outlines];
        let importedCount = 0;

        lines.forEach(line => {
          const parts = line.split(/,|\t/).map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length < 2) return;
          const idNum = parseInt(parts[0], 10);
          const title = parts[1];
          if (isNaN(idNum) || !title || title.toLowerCase() === 'title') return;

          const existingIdx = updatedOutlines.findIndex(o => o.id === idNum);
          if (existingIdx !== -1) {
            updatedOutlines[existingIdx] = { ...updatedOutlines[existingIdx], title };
          } else {
            updatedOutlines.push({
              id: idNum,
              title,
              lastUsed: null,
              lastSpeakerId: null,
              lastCongregation: null
            });
          }
          importedCount++;
        });

        updateOutlines(updatedOutlines.sort((a, b) => a.id - b.id));
        setImportMessage({ text: `Import successful! Processed ${importedCount} outlines.`, isError: false });
        setTimeout(() => setImportMessage(null), 3000);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setImportMessage({ text: "Failed to read the file. Please ensure it is a valid CSV or text file.", isError: true });
        setTimeout(() => setImportMessage(null), 5000);
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const getEffectiveLastUsed = (outline: Outline) => {
    const dates = [outline.lastUsed].filter(Boolean) as string[];
    const scheduledDates = assignments
        .filter(a => a.outlineId === outline.id)
        .map(a => a.date);
    
    const allDates = [...dates, ...scheduledDates];
    if (allDates.length === 0) return null;

    return allDates.reduce((max, current) => current > max ? current : max, allDates[0]);
  };

  const getStatus = (lastUsed: string | null) => {
    if (!lastUsed) return { label: 'Eligible', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
    
    const usedDate = new Date(lastUsed);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - usedDate.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30); 

    if (diffMonths < settings.cooldownMonths) {
        return { label: 'Recent', color: 'bg-amber-50 text-amber-600', icon: AlertCircle };
    }
    return { label: 'Eligible', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle };
  };

  const handleAdd = () => {
      const idNum = parseInt(newOutline.id);
      if (!newOutline.id || !newOutline.title || isNaN(idNum)) return;

      if (outlines.find(o => o.id === idNum)) {
          showToast("Outline ID already exists.", 'error');
          return;
      }

      const outline: Outline = {
          id: idNum,
          title: newOutline.title,
          lastUsed: null,
          lastSpeakerId: null,
          lastCongregation: null
      };
      
      updateOutlines([...outlines, outline]);
      setIsAdding(false);
      setNewOutline({ id: '', title: '' });
  };

  const handleDeleteClick = (id: number) => {
    if (deleteConfirmId === id) {
        // Confirmed - Fade out up
        setExitingId(id);
        setTimeout(() => {
            const newOutlines = outlines.filter(o => o.id !== id);
            updateOutlines(newOutlines);
            setDeleteConfirmId(null);
            setExitingId(null);
        }, 300);
    } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
    }
  };

  const filteredOutlines = outlines.filter(outline => 
    outline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    outline.id.toString().includes(searchTerm)
  );

  const sortedOutlines = [...filteredOutlines].sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Icon name="search" className="text-lg text-slate-400 dark:text-slate-500 absolute left-4 top-2.5" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlines..."
              className="w-full pl-11 pr-9 py-2.5 text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/60 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 transition-all shadow-xs hover:shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <Icon name="close" className="text-base" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            hidden 
            ref={fileInputRef} 
            onChange={handleImport} 
          />
          <button
            onClick={handleExport}
            title="Export to CSV"
            className="px-4 py-2.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-zinc-700/60 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Icon name="download" className="text-base" />
            <span>Export</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Excel or CSV File"
            className="px-4 py-2.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-zinc-700/60 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Icon name="upload" className="text-base" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 rounded-full bg-[#18181b] dark:bg-white text-white dark:text-zinc-950 font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-800 dark:border-zinc-200 whitespace-nowrap"
          >
            <Icon name="add" className="text-base" />
            <span>New Outline</span>
          </button>
        </div>
      </div>
      {importMessage && (
        <p className={`text-xs font-semibold px-4 py-2 rounded-xl ${importMessage.isError ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
          {importMessage.text}
        </p>
      )}


      {isAdding && (
          <Card>
              <CardHeader>
                <CardTitle>New Outline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Number</label>
                        <Input 
                          type="number" 
                          placeholder="#"
                          value={newOutline.id}
                          onChange={(e) => setNewOutline({...newOutline, id: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Title</label>
                        <Input 
                          type="text" 
                          placeholder="Outline Title"
                          value={newOutline.title}
                          onChange={(e) => setNewOutline({...newOutline, title: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleAdd}
                      disabled={!newOutline.id || !newOutline.title}
                    >
                        Save Outline
                    </Button>
                </div>
              </CardContent>
          </Card>
      )}

      {/* Mobile Card View (Visible on < MD) */}
      <div className="md:hidden space-y-3 pb-4">
        {sortedOutlines.length > 0 ? (
             sortedOutlines.map((outline, idx) => {
                 const effectiveLastUsed = getEffectiveLastUsed(outline);
                 const status = getStatus(effectiveLastUsed);
                 const StatusIcon = status.icon;
                 const isDeleting = deleteConfirmId === outline.id;
                 const isExiting = exitingId === outline.id;

                 return (
                    <Card 
                        key={outline.id} 
                        style={isExiting ? { animationDelay: '0s' } : { animationDelay: `${idx * 0.02}s` }}
                        className={`transition-all duration-300 relative overflow-hidden
                        ${isExiting 
                            ? 'animate-fade-out-up pointer-events-none opacity-0' 
                            : 'animate-in fade-in duration-200'}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                             <div className="flex items-start gap-3">
                                 <Badge variant="default" className="text-xs font-bold min-w-[2.5rem] justify-center mt-0.5">
                                    #{outline.id}
                                 </Badge>
                                 <h4 className="font-semibold text-foreground text-sm leading-snug">{outline.title}</h4>
                             </div>
                             <button
                                onClick={() => handleDeleteClick(outline.id)}
                                className={`p-2 rounded-lg transition-colors ${isDeleting ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                             <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                                  {effectiveLastUsed ? new Date(effectiveLastUsed).toLocaleDateString() : 'Never'}
                             </div>
                             <div className={`flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {status.label}
                             </div>
                        </div>
                      </CardContent>
                    </Card>
                 );
             })
        ) : (
            <Card className="py-12 text-center text-muted-foreground text-sm border-dashed">
                No outlines found matching "{searchTerm}"
            </Card>
        )}
      </div>

      {/* Desktop Table View (Visible on MD+) */}
      <Card className="hidden md:block overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider w-20">No.</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider w-48">Last Used</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">Status</th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                  {sortedOutlines.length > 0 ? (
                      sortedOutlines.map((outline, idx) => {
                          const effectiveLastUsed = getEffectiveLastUsed(outline);
                          const status = getStatus(effectiveLastUsed);
                          const StatusIcon = status.icon;
                          const isDeleting = deleteConfirmId === outline.id;
                          const isExiting = exitingId === outline.id;

                          return (
                              <tr 
                                key={outline.id} 
                                style={isExiting ? { animationDelay: '0s' } : { animationDelay: `${idx * 0.02}s` }}
                                className={`transition-all duration-300 group
                                ${isExiting 
                                    ? 'animate-fade-out-up pointer-events-none opacity-0' 
                                    : 'animate-in fade-in duration-200 hover:bg-muted/30'}`}
                              >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-sm font-bold text-slate-400 group-hover:text-violet-600 transition-colors">#{outline.id}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className="text-sm font-semibold text-slate-700">{outline.title}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center text-sm text-slate-500">
                                          <Clock className="w-4 h-4 mr-2 text-slate-300" />
                                          {effectiveLastUsed ? new Date(effectiveLastUsed).toLocaleDateString() : 'Never'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className={`flex items-center w-fit px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                          <StatusIcon className="w-3 h-3 mr-1.5" />
                                          {status.label}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <button
                                          onClick={() => handleDeleteClick(outline.id)}
                                          className={`p-2 rounded-lg transition-all ${
                                            isDeleting 
                                            ? 'bg-red-50 text-red-600' 
                                            : 'text-slate-300 hover:text-red-500 hover:bg-slate-100'
                                          }`}
                                          title="Delete Outline"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </td>
                              </tr>
                          );
                      })
                  ) : (
                      <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                              No outlines found matching "{searchTerm}"
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
        </div>
      </Card>

      {showScrollTop && createPortal(
        <button 
          onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 md:bottom-10 md:right-10 p-3 bg-violet-600 text-white rounded-full shadow-xl hover:bg-violet-700 transition transform hover:-translate-y-1 focus:outline-none z-[100] animate-fade-in shadow-glow-sm"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>,
        document.body
      )}
    </div>
  );
};