import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { OutlineList } from '../components/OutlineList';
import { DEFAULT_SETTINGS, INITIAL_OUTLINES } from '../constants';

describe('OutlineList Component', () => {
  it('renders outline list view without error', () => {
    const html = renderToString(
      <OutlineList
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateOutlines={() => {}}
        assignments={[]}
      />
    );

    expect(html).toContain('Search outlines...');
    expect(html).toContain('Export');
    expect(html).toContain('Import');
    expect(html).toContain('Paste Outlines');
    expect(html).toContain('New Outline');
    expect(html).toContain('Gaano Mo Kakilala ang Diyos?');
  });
});
