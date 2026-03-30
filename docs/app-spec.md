# App Spec: quick-notepad

## 1) App Overview
- **App Name:** Quick Notepad
- **Category:** Productivity / Notes
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Help an authenticated user capture short notes, search them quickly, and manage pin/favorite/archive state.
- **Primary User:** A signed-in user managing a private notes workspace.

## 2) User Stories
- As a user, I want to create notes with optional categories, so that I can capture information quickly.
- As a user, I want to pin and favorite notes, so that the most important notes stay easy to find.
- As a user, I want to archive and restore notes, so that I can keep history without deleting records.

## 3) Core Workflow
1. User signs in and opens `/app`.
2. User creates a new note from the drawer or edits an existing note.
3. App saves the note to the user-scoped database and refreshes the visible workspace list.
4. User opens the note detail route for full reading and status actions.
5. User searches, filters, pins, favorites, archives, and restores notes from the workspace.

## 4) Functional Behavior
- Notes are stored per user with title, content, optional category, pin state, favorite state, and archive state.
- The workspace supports create, edit, search, tab filtering, category filtering, pin, favorite, archive, and restore.
- `/app` and note detail routes are protected and scoped to the authenticated owner.
- Current implementation does not expose hard delete; archive is the retention mechanism in V1.

## 5) Data & Storage
- **Storage type:** Astro DB on the app’s isolated Turso database
- **Main entities:** QuickNotes
- **Persistence expectations:** Note records persist across refresh and future sessions for the authenticated owner.
- **User model:** Multi-user shared infrastructure with per-user isolation

## 6) Special Logic (Optional)
- Dashboard summary logic tracks active, pinned, favorite, archived, and recently updated note counts.
- Pin and favorite actions are available from both workspace cards and the note detail route.

## 7) Edge Cases & Error Handling
- Invalid IDs/routes: Missing or invalid note detail routes redirect safely back to `/app`.
- Empty input: Title and content are required before save.
- Unauthorized access: Protected routes redirect to the parent login flow.
- Missing records: Non-owned notes are not returned from the note detail lookup.
- Invalid payload/state: Invalid or missing action operations should fail without corrupting note state.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create a note, search for it, then open the detail route and confirm the full content is shown.
- [ ] Edit the note, pin it, favorite it, archive it, then restore it and confirm all state changes persist.

### Safety tests
- [ ] Open an invalid or missing note detail route and confirm the app falls back safely.
- [ ] Attempt to save a note without title or content and confirm the write is rejected.
- [ ] Confirm category and search filtering do not expose another user’s notes.

### Negative tests
- [ ] Confirm there is no hard-delete flow in V1.
- [ ] Confirm pin/favorite/archive actions do not break the detail page or workspace summary.

## 9) Out of Scope (V1)
- Shared notes or team collaboration
- Rich text formatting
- Permanent delete and restore history beyond archive state

## 10) Freeze Notes
- V1 release freeze: this document reflects the current repo implementation before final browser verification.
- This spec was populated conservatively from current workspace, detail route, and data-access behavior; runtime verification should confirm exact error handling and UI reactivity.
- During freeze, only verification fixes and cleanup are allowed; no undocumented feature expansion.
