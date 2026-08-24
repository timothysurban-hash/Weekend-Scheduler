import { Outline } from '../types';

export interface OutlineImportResult {
  success: boolean;
  outlines: Outline[];
  newCount: number;
  updatedCount: number;
  totalCount: number;
  message: string;
  errors: string[];
}

/**
 * Parses a single CSV line respecting quotes and escaped quotes ("").
 */
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result.map(cell => cell.replace(/^"|"$/g, '').trim());
}

/**
 * Detects whether a string is raw binary data (e.g. from an Excel .xlsx / .xls file).
 */
function isBinaryContent(content: string): boolean {
  if (content.startsWith('PK\x03\x04') || content.startsWith('PK\u0003\u0004')) {
    return true;
  }
  // Check for common binary markers or null bytes in first 100 chars
  const sample = content.slice(0, 100);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      return true;
    }
  }
  return false;
}

/**
 * Tries to parse raw text as JSON array or object containing outlines.
 */
function tryParseJson(rawText: string): Outline[] | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    let items: any[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.outlines)) {
        items = parsed.outlines;
      } else if (parsed.data && Array.isArray(parsed.data.outlines)) {
        items = parsed.data.outlines;
      }
    }

    const outlines: Outline[] = [];
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const idNum = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
      const title = typeof item.title === 'string' ? item.title.trim() : '';

      if (!isNaN(idNum) && idNum > 0 && title) {
        outlines.push({
          id: idNum,
          title,
          lastUsed: typeof item.lastUsed === 'string' ? item.lastUsed : null,
          lastSpeakerId: typeof item.lastSpeakerId === 'string' ? item.lastSpeakerId : null,
          lastCongregation: typeof item.lastCongregation === 'string' ? item.lastCongregation : null
        });
      }
    }

    return outlines.length > 0 ? outlines : null;
  } catch {
    return null;
  }
}

/**
 * Tries to extract an outline (ID and Title) from a single formatted line of text.
 * Handles CSV, TSV, semicolon, pipe, and text formats (e.g. "1. Title", "Outline 2: Title", "#3 Title").
 */
function parseOutlineLine(line: string): { id: number; title: string; lastUsed?: string | null } | null {
  const cleanLine = line.replace(/^\uFEFF/, '').trim();
  if (!cleanLine) return null;

  // 1. Text format matching: e.g. "1. Title", "1 - Title", "Outline 1: Title", "1) Title", "#1 Title", "[1] Title"
  const textMatch = cleanLine.match(/^(?:outline\s+)?(?:\[\s*|\(#?\s*|#\s*)?(\d+)(?:\]|\))?[\.\s:\-–—\)]+\s*(.+)$/i);
  if (textMatch) {
    const idNum = parseInt(textMatch[1], 10);
    const title = textMatch[2].replace(/^"|"$/g, '').trim();
    if (!isNaN(idNum) && idNum > 0 && title) {
      return { id: idNum, title };
    }
  }

  // 2. Delimited formats (CSV, TSV, Semicolon, Pipe)
  let delimiter = ',';
  if (cleanLine.includes('\t')) {
    delimiter = '\t';
  } else if (cleanLine.includes(';') && !cleanLine.includes(',')) {
    delimiter = ';';
  } else if (cleanLine.includes('|') && !cleanLine.includes(',')) {
    delimiter = '|';
  }

  const parts = parseCsvLine(cleanLine, delimiter);

  if (parts.length >= 2) {
    const rawId = parts[0].replace(/^(outline|no\.?|#)\s*/i, '').trim();
    if (/^\d+$/.test(rawId)) {
      const idNum = parseInt(rawId, 10);
      if (idNum > 0) {
        let title = '';
        let lastUsed: string | null = null;

        if (parts.length === 2) {
          title = parts[1];
        } else {
          const lastPart = parts[parts.length - 1];
          // Check if last part looks like a date (e.g. YYYY-MM-DD or MM/DD/YYYY) or is empty
          if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(lastPart) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(lastPart)) {
            lastUsed = lastPart;
            title = parts.slice(1, -1).join(', ').trim();
          } else if (lastPart === '') {
            title = parts.slice(1, -1).join(', ').trim();
          } else {
            // All remaining parts are title with commas
            title = parts.slice(1).join(', ').trim();
          }
        }

        title = title.replace(/^"|"$/g, '').trim();
        if (title && title.toLowerCase() !== 'title' && title.toLowerCase() !== 'outline title') {
          return { id: idNum, title, lastUsed: lastUsed || null };
        }
      }
    }
  }

  return null;
}

/**
 * In-process deep module for parsing and importing outlines from various file formats.
 */
export function parseOutlinesFromContent(
  rawContent: string,
  currentOutlines: Outline[] = []
): OutlineImportResult {
  const errors: string[] = [];

  if (!rawContent || !rawContent.trim()) {
    return {
      success: false,
      outlines: currentOutlines,
      newCount: 0,
      updatedCount: 0,
      totalCount: currentOutlines.length,
      message: 'The file is empty. Please provide a valid file.',
      errors: ['Empty file content']
    };
  }

  if (isBinaryContent(rawContent)) {
    return {
      success: false,
      outlines: currentOutlines,
      newCount: 0,
      updatedCount: 0,
      totalCount: currentOutlines.length,
      message: 'Excel binary files (.xlsx / .xls) must be saved as CSV (.csv) or text (.txt) before importing.',
      errors: ['Binary Excel format detected']
    };
  }

  // Check JSON format
  const jsonOutlines = tryParseJson(rawContent);
  const parsedItems: Array<{ id: number; title: string; lastUsed?: string | null; lastSpeakerId?: string | null; lastCongregation?: string | null }> = [];

  if (jsonOutlines) {
    parsedItems.push(...jsonOutlines);
  } else {
    const lines = rawContent.split(/\r?\n/);
    for (const line of lines) {
      const parsed = parseOutlineLine(line);
      if (parsed) {
        parsedItems.push(parsed);
      }
    }
  }

  if (parsedItems.length === 0) {
    return {
      success: false,
      outlines: currentOutlines,
      newCount: 0,
      updatedCount: 0,
      totalCount: currentOutlines.length,
      message: 'No valid outlines found in file. Please ensure it contains outline numbers and titles.',
      errors: ['No valid outline records parsed']
    };
  }

  // Merge with existing outlines
  const updatedOutlinesMap = new Map<number, Outline>();
  for (const o of currentOutlines) {
    updatedOutlinesMap.set(o.id, { ...o });
  }

  let newCount = 0;
  let updatedCount = 0;

  for (const item of parsedItems) {
    const existing = updatedOutlinesMap.get(item.id);
    if (existing) {
      updatedOutlinesMap.set(item.id, {
        ...existing,
        title: item.title,
        ...(item.lastUsed ? { lastUsed: item.lastUsed } : {}),
        ...(item.lastSpeakerId ? { lastSpeakerId: item.lastSpeakerId } : {}),
        ...(item.lastCongregation ? { lastCongregation: item.lastCongregation } : {})
      });
      updatedCount++;
    } else {
      updatedOutlinesMap.set(item.id, {
        id: item.id,
        title: item.title,
        lastUsed: item.lastUsed || null,
        lastSpeakerId: item.lastSpeakerId || null,
        lastCongregation: item.lastCongregation || null
      });
      newCount++;
    }
  }

  const mergedOutlines = Array.from(updatedOutlinesMap.values()).sort((a, b) => a.id - b.id);

  return {
    success: true,
    outlines: mergedOutlines,
    newCount,
    updatedCount,
    totalCount: mergedOutlines.length,
    message: `Import successful! Added ${newCount} new ${newCount === 1 ? 'outline' : 'outlines'}, updated ${updatedCount}.`,
    errors
  };
}

/**
 * Validates and creates a single new Outline record.
 */
export function createOutlineRecord(
  id: number | string,
  title: string,
  currentOutlines: Outline[] = []
): { outline?: Outline; error?: string } {
  const idNum = typeof id === 'number' ? id : parseInt(String(id).trim(), 10);
  const cleanTitle = typeof title === 'string' ? title.trim() : '';

  if (isNaN(idNum) || idNum <= 0) {
    return { error: 'Outline number must be a valid positive integer.' };
  }

  if (!cleanTitle) {
    return { error: 'Outline title cannot be empty.' };
  }

  if (currentOutlines.some(o => o.id === idNum)) {
    return { error: `Outline #${idNum} already exists.` };
  }

  return {
    outline: {
      id: idNum,
      title: cleanTitle,
      lastUsed: null,
      lastSpeakerId: null,
      lastCongregation: null
    }
  };
}
