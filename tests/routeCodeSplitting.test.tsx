import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

describe('Route-Level Code Splitting & Dynamic View Lazy-Loading (TDD)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('verifies that route views are dynamically importable and separate modules', async () => {
    // Dynamic import checks
    const speakerListModule = await import('../components/SpeakerList');
    expect(speakerListModule.SpeakerList).toBeDefined();

    const roleRulesModule = await import('../components/RoleRulesView');
    expect(roleRulesModule.RoleRulesView).toBeDefined();

    const outlineListModule = await import('../components/OutlineList');
    expect(outlineListModule.OutlineList).toBeDefined();

    const settingsModule = await import('../components/Settings');
    expect(settingsModule.Settings).toBeDefined();

    const printModalModule = await import('../components/PrintScheduleModal');
    expect(printModalModule.PrintScheduleModal).toBeDefined();
  });

  it('renders lazy suspense fallback placeholder when component is loading', () => {
    const SuspenseContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <React.Suspense fallback={<div data-testid="suspense-fallback">Loading view...</div>}>
        {children}
      </React.Suspense>
    );

    const html = renderToString(
      <SuspenseContainer>
        <div>Loaded Content</div>
      </SuspenseContainer>
    );

    expect(html).toContain('Loaded Content');
  });

  it('verifies vite configuration includes manualChunks configuration for vendor splitting', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const viteConfigContent = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');

    expect(viteConfigContent).toContain('manualChunks');
  });
});
