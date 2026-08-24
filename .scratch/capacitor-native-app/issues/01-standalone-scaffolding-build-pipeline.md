# 01: Standalone Native Repository Scaffolding & Build Pipeline

**What to build:**
Initialize the standalone repository folder at `c:\Users\timot\Downloads\congregation-scheduler-native` with React 18, Vite 5, Tailwind CSS, TypeScript, and Capacitor 6 configuration targeting App ID `org.congregation.weekendscheduler`. Set up dependency manifests, build scripts, chunk splitting, and ensure `npm run build` succeeds cleanly.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Initialize directory `c:\Users\timot\Downloads\congregation-scheduler-native` with `package.json` and lockfiles
- [x] Configure `capacitor.config.ts` with `appId: 'org.congregation.weekendscheduler'`, `appName: 'Weekend Scheduler'`, and `webDir: 'dist'`
- [x] Configure `vite.config.ts` with manual vendor chunks and React plugin
- [x] Configure `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, and `index.html` (with `viewport-fit=cover`)
- [x] Verify `npm run build` runs and generates production bundles
