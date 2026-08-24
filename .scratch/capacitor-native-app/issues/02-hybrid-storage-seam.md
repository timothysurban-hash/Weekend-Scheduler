# 02: Hybrid Storage Seam (Offline SQLite Native + IndexedDB Fallback)

**What to build:**
Create a unified `StorageAdapter` interface and deep module under `services/storage/` in the new standalone native repo. Provide a `SQLiteStorageAdapter` backed by `@capacitor-community/sqlite` for native Android/iOS runtimes and an `IndexedDBStorageAdapter` backed by `idb` for web/testing. Include auto-migration from IndexedDB and initial outline seeding on first boot.

**Blocked by:** 01: Standalone Native Repository Scaffolding & Build Pipeline

**Status:** completed

- [x] Implement `StorageAdapter` contract in `services/storage/types.ts`
- [x] Implement `SQLiteStorageAdapter` in `services/storage/sqliteAdapter.ts`
- [x] Implement `IndexedDBStorageAdapter` in `services/storage/indexedDbAdapter.ts`
- [x] Implement `getStorageAdapter()` factory with transparent runtime platform detection
- [x] Add unit tests in `tests/storageAdapter.test.ts` verifying persistence and migration
