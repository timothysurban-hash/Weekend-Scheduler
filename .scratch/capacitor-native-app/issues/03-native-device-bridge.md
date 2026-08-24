# 03: Native Device Bridge (Status Bar, Haptics, Share Sheet & Friday Duty Reminders)

**What to build:**
Create `services/nativeBridge.ts` encapsulating Capacitor native plugins for safe-area status bar theming (`@capacitor/status-bar`), tactile vibration feedback on user actions (`@capacitor/haptics`), native system share sheets for roster/CSV exports (`@capacitor/share`), and local scheduled offline notifications for Friday 7:00 PM upcoming duty reminders (`@capacitor/local-notifications`).

**Blocked by:** 01: Standalone Native Repository Scaffolding & Build Pipeline

**Status:** completed

- [x] Implement `nativeBridge.setStatusBar(theme)` to sync with dark/light mode
- [x] Implement `nativeBridge.hapticImpact(style)` and `nativeBridge.hapticNotification(type)`
- [x] Implement `nativeBridge.shareRoster({ title, text, dialogTitle })`
- [x] Implement `nativeBridge.scheduleDutyReminder(assignment, brothers)` for Friday 7:00 PM notifications
- [x] Add unit tests in `tests/nativeBridge.test.ts` verifying web fallbacks and native calls
