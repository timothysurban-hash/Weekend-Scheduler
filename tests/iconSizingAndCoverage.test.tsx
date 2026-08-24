import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Icon } from '../components/ui/Icon';

const REQUIRED_APP_ICONS = [
  'calendar_today',
  'light_mode',
  'dark_mode',
  'grid_view',
  'group',
  'verified_user',
  'menu_book',
  'settings',
  'search',
  'close',
  'download',
  'upload',
  'content_paste',
  'add',
  'workspace_premium',
  'bolt',
  'gavel',
  'record_voice_over',
  'support_agent',
  'warning',
  'person_add',
  'lock',
  'lock_open',
  'sync',
  'print',
  'delete',
  'topic',
  'help_outline',
  'keyboard',
  'event_busy',
  'domain',
  'swap_vert',
  'check_circle',
  'info'
];

describe('Icon Sizing & Visual Coverage Seam (TDD)', () => {
  it.each(REQUIRED_APP_ICONS)('renders dedicated SVG icon for "%s" without falling back to generic placeholder', (iconName) => {
    const html = renderToString(<Icon name={iconName} className="text-xl mr-2 text-indigo-600" />);
    
    // Must be an SVG element
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
    
    // Must have width="1em" and height="1em" so font-size classes (text-xl, text-sm, etc.) scale it properly
    expect(html).toMatch(/width="1em"|w-\[1em\]|w-current/);
    expect(html).toMatch(/height="1em"|h-\[1em\]|h-current/);
    
    // Must preserve user class names
    expect(html).toContain('text-xl');
    expect(html).toContain('mr-2');
    expect(html).toContain('text-indigo-600');
  });

  it('renders with default 1em dimensions preventing full-width container blowup', () => {
    const html = renderToString(<Icon name="calendar_today" />);
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toMatch(/width="1em"/);
    expect(html).toMatch(/height="1em"/);
  });

  it('preserves custom width and height when explicitly provided in className', () => {
    const html = renderToString(<Icon name="group" className="w-8 h-8 text-white" />);
    expect(html).toContain('w-8');
    expect(html).toContain('h-8');
    expect(html).toContain('text-white');
  });
});
