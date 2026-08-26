import { describe, it, expect, vi } from 'vitest';
import { generateScheduleImageFilename, exportSheetToPng } from '../domain/imageExporter';

describe('Image Exporter Module (TDD)', () => {
  it('generates correct formatted filename for single sheet date range', () => {
    const filename = generateScheduleImageFilename('2026-09-06', '2026-09-20');
    expect(filename).toBe('Weekend Schedule_Sept 06 2026 to Sept 20 2026.png');
  });

  it('generates correct formatted filename when page index is provided', () => {
    const filename = generateScheduleImageFilename('2026-09-06', '2026-10-18', 2);
    expect(filename).toBe('Weekend Schedule_Sept 06 2026 to Oct 18 2026_page_2.png');
  });

  it('exports HTML element to PNG with 3x pixel ratio and white background', async () => {
    const mockElement = { id: 'sheet-1' } as unknown as HTMLElement;
    const mockToPng = vi.fn().mockResolvedValue('data:image/png;base64,fakePngData');
    
    const result = await exportSheetToPng(mockElement, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      toPngFn: mockToPng
    });

    expect(mockToPng).toHaveBeenCalledWith(mockElement, expect.objectContaining({
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true
    }));
    expect(result).toBe('data:image/png;base64,fakePngData');
  });
});
