import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Settings } from '../components/Settings';
import { DEFAULT_SETTINGS } from '../constants';

describe('Settings Component', () => {
  it('renders settings view without ReferenceError', () => {
    const html = renderToString(
      <Settings settings={DEFAULT_SETTINGS} saveSettings={() => {}} />
    );
    expect(html).toContain('Settings');
    expect(html).toContain('General Configuration');
    expect(html).toContain('Appearance &amp; Theme');
    expect(html).toContain('Backup &amp; Transfer');
    expect(html).toContain('Dynamic Roster Manager');
  });
});
