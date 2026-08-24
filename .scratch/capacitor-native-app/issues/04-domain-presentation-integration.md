# 04: Domain Engines & Presentation Layer Integration

**What to build:**
Integrate the deep domain modules and responsive presentation layer into the standalone native repository. Wire `ScheduleView`, `ScheduleDesktopRow`, `ScheduleMobileCard`, `SpeakerList`, `RoleRulesView`, `OutlineList`, `Settings`, and `Navbar` with the hybrid storage adapter and native device bridge (triggering haptics on slot updates/locks and sharing via native share sheet).

**Blocked by:** 02: Hybrid Storage Seam, 03: Native Device Bridge

**Status:** completed

- [x] Port `domain/scheduleCoordinator.ts`, `domain/scheduleEngine.ts`, `domain/eligibilityPolicy.ts`, `domain/brotherDirectory.ts`, `domain/scheduleFormatter.ts`, `domain/outlineImporter.ts`
- [x] Port all presentation seams and responsive components under `components/`
- [x] Connect `ScheduleView` copy/share buttons to `nativeBridge.shareRoster`
- [x] Connect slot clicks, lock toggles, and auto-rotation to `nativeBridge.hapticImpact`
- [x] Wire `App.tsx` view routing, theme initialization, and background duty reminder sync
