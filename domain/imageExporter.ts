import { toPng } from 'html-to-image';

export interface ExportImageOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  toPngFn?: (element: HTMLElement, options?: any) => Promise<string>;
}

export function generateScheduleImageFilename(
  startDate: string,
  endDate: string,
  pageIndex?: number
): string {
  const base = `Weekend_Schedule_${startDate}_to_${endDate}`;
  if (pageIndex !== undefined) {
    return `${base}_page_${pageIndex}.png`;
  }
  return `${base}.png`;
}

export async function exportSheetToPng(
  element: HTMLElement,
  options?: ExportImageOptions
): Promise<string> {
  const pixelRatio = options?.pixelRatio ?? 3;
  const backgroundColor = options?.backgroundColor ?? '#ffffff';
  const renderFn = options?.toPngFn ?? toPng;

  return renderFn(element, {
    pixelRatio,
    backgroundColor,
    cacheBust: true
  });
}

export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
