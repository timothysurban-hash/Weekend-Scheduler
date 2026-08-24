# ADR-0002: Standalone Capacitor Native Mobile App with Offline-First SQLite Architecture

## Status
Accepted

## Context
The congregation weekend scheduler application was originally designed as a responsive web application running IndexedDB (`idb`) in the browser. To provide a first-class mobile experience on iOS and Android devices, the application needs to run as a native mobile app with complete offline reliability, native status bar theming, device haptics, system share sheets for schedule dissemination, and scheduled local notifications for upcoming weekend duties, housed within a dedicated standalone repository (`congregation-scheduler-native`).

## Decision

1. **Standalone Repository Architecture**:
   - Create a dedicated, standalone repository located at `c:\Users\timot\Downloads\congregation-scheduler-native`.
   - The repository contains the modular React 18 + Vite frontend, deep domain engines, responsive presentation seams, and native Capacitor 6 configuration.

2. **Capacitor Configuration & App Identity**:
   - **App Name**: `Weekend Scheduler`
   - **App ID / Package Identifier**: `org.congregation.weekendscheduler`
   - **Supported Platforms**: Android (`@capacitor/android`) and iOS (`@capacitor/ios`).
   - **Web Directory**: `dist` with automated build synchronization (`npx cap sync`).

3. **Hybrid Storage Adapter Seam (`services/storage/`)**:
   - Introduce a unified `StorageAdapter` interface:
     - `SQLiteStorageAdapter`: Utilizes `@capacitor-community/sqlite` on native iOS and Android runtimes for OS-level SQLite persistence.
     - `IndexedDBStorageAdapter`: Utilizes `idb` on web browsers and automated test environments.
   - **Transparent Boot Migration**: On first launch, the app automatically checks for existing IndexedDB records, migrates them to SQLite, and seeds initial outline library records if the database is newly initialized.

4. **Native Device Capabilities**:
   - **Status Bar & Safe Areas (`@capacitor/status-bar`)**: Automatically styles the native status bar to match dark/light theme mode and respects device notch safe-area insets.
   - **Haptic Feedback (`@capacitor/haptics`)**: Provides tactile feedback on duty slot selections, lock toggles, and auto-rotation triggers.
   - **Native Share Sheet (`@capacitor/share`)**: Enables 1-click sharing of formatted brother duty rosters and CSV files directly into messaging apps (WhatsApp, Telegram, SMS, Email).
   - **Local Duty Reminders (`@capacitor/local-notifications`)**: Schedules an automated offline notification every Friday at 7:00 PM summarizing assigned brothers for the upcoming Sunday meeting.

5. **100% Offline Capability**:
   - Zero remote network dependencies are required for any application feature.
   - All auto-rotation, outline searching, qualification checks, PDF print generation, and export operations execute entirely on-device.

## Consequences

- Coordinators can install and run the app natively on their Android and iOS phones and tablets with zero internet connectivity.
- Native mobile features (haptics, status bar, share sheet, offline notifications) enhance responsiveness and user experience.
- The web app codebase remains clean, while the standalone native repository provides full build isolation and dedicated Android Studio / Xcode project structures.
