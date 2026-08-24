import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, AlertCircle, CheckCircle2, Search, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  statusLabel?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  options, value, onChange, placeholder = "Select...", disabled = false, className = "", buttonClassName = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 0, maxHeight: 200 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // Calculate position when opening
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Determine available space
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Thresholds
        const MIN_HEIGHT = 150; 
        const PADDING = 10;

        let pos: MenuPosition = {
            left: rect.left,
            width: rect.width,
            maxHeight: 200 // default
        };

        // Decision logic: prefer below, unless space is tight (< 200px) AND space above is larger
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
            // Open Upwards
            pos.bottom = viewportHeight - rect.top + 4; // 4px gap
            pos.maxHeight = Math.min(spaceAbove - PADDING, 300);
        } else {
            // Open Downwards
            pos.top = rect.bottom + 4;
            // Constrain height to available space
            pos.maxHeight = Math.min(Math.max(spaceBelow - PADDING, MIN_HEIGHT), 300);
        }

        setMenuPosition(pos);
        
        // Focus input
        requestAnimationFrame(() => {
             if (inputRef.current) {
                 inputRef.current.focus({ preventScroll: true });
             }
        });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside container (the button)
      if (containerRef.current && containerRef.current.contains(event.target as Node)) {
          return;
      }
      // Check if click is inside dropdown (the portal)
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
          return;
      }
      setIsOpen(false);
      setSearchTerm('');
    };
    
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(option => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (option.value === '' || option.value === 0) return true;
      return (
          option.label.toLowerCase().includes(term) ||
          (option.subLabel && option.subLabel.toLowerCase().includes(term)) ||
          (option.statusLabel && option.statusLabel.toLowerCase().includes(term))
      );
  });

  const getStatusStyles = (status?: string) => {
      switch(status) {
          case 'success': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
          case 'warning': return 'text-amber-700 bg-amber-50 border-amber-100';
          default: return 'text-slate-500 bg-slate-100 border-slate-200';
      }
  };

  const getStatusIcon = (status?: string) => {
      switch(status) {
          case 'success': return <CheckCircle2 className="w-3 h-3 mr-1" />;
          case 'warning': return <AlertCircle className="w-3 h-3 mr-1" />;
          default: return null;
      }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`relative w-full bg-background border border-input rounded-md py-2 pl-3 pr-10 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors text-foreground
          ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:border-primary/50'}
          ${isOpen ? 'ring-2 ring-ring border-primary' : ''}
          ${buttonClassName}
        `}
      >
        <span className={`block truncate text-sm ${selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption && selectedOption.subLabel && (
           <span className="block truncate text-xs text-muted-foreground mt-0.5">{selectedOption.subLabel}</span>
        )}
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Render Dropdown via Portal to escape parent overflow/stacking contexts */}
      {isOpen && !disabled && createPortal(
        <div 
            ref={dropdownRef}
            style={{
                position: 'fixed',
                ...(menuPosition.top !== undefined ? { top: `${menuPosition.top}px` } : {}),
                ...(menuPosition.bottom !== undefined ? { bottom: `${menuPosition.bottom}px` } : {}),
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
                maxHeight: `${menuPosition.maxHeight}px`
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            className={`z-[9999] bg-popover text-popover-foreground shadow-md rounded-md border border-border py-1 focus:outline-none flex flex-col animate-in fade-in pop-in ${
                menuPosition.bottom !== undefined ? 'origin-bottom' : 'origin-top'
            }`}
        >
          
          {/* Search Input */}
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-background border border-input rounded-sm pl-8 pr-8 py-1 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ fontSize: '14px' }} 
                  />
                  {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                          <X className="w-3.5 h-3.5" />
                      </button>
                  )}
              </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {filteredOptions.length === 0 ? (
                <div className="py-3 px-4 text-muted-foreground text-sm text-center">No matching results</div>
            ) : (
                filteredOptions.map((option) => (
                <div
                    key={option.value}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-accent hover:text-accent-foreground transition-colors border-b border-transparent last:border-0
                    ${option.value === value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}
                    `}
                    onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                        setSearchTerm('');
                    }}
                >
                    <div className="flex flex-col">
                        <span className={`block truncate text-sm ${option.value === value ? 'font-semibold text-primary' : 'font-normal'}`}>
                        {option.label}
                        </span>
                        {option.subLabel && (
                            <span className={`block truncate text-xs mt-0.5 ${option.value === value ? 'text-primary/80' : 'text-muted-foreground'}`}>
                                {option.subLabel}
                            </span>
                        )}
                        {option.statusLabel && (
                            <span className={`flex items-center mt-1 text-[10px] font-medium w-fit px-1.5 py-0.5 rounded border ${getStatusStyles(option.status)}`}>
                                {getStatusIcon(option.status)} {option.statusLabel}
                            </span>
                        )}
                    </div>

                    {option.value === value && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                        <Check className="h-4 w-4" />
                    </span>
                    )}
                </div>
                ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};