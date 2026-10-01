# Security Specification

## Data Invariants
1. A user document at `/users/{userId}` can only be read and written by that authenticated user (`request.auth.uid == userId`).
2. A mess document at `/messes/{messId}` can only be created by an authenticated user who sets `mgrUid` to their own auth UID or `mgrEmail` to their verified email.
3. A mess document can only be read or updated by members who belong to the mess (or the manager).
4. No unauthorized user can alter or delete another user's mess without membership/manager permissions.
5. All write operations require authenticated requests.

## The Dirty Dozen Payloads (Rejection Matrix)
1. Write to `/users/victim_user_123` with `request.auth.uid = attacker_456` -> PERMISSION_DENIED.
2. Read from `/users/victim_user_123` with unauthenticated client -> PERMISSION_DENIED.
3. Update `/messes/{messId}` by unauthenticated client -> PERMISSION_DENIED.
4. Update `/messes/{messId}` by an attacker not in members list -> PERMISSION_DENIED.
5. Delete `/messes/{messId}` by a non-manager member -> PERMISSION_DENIED.
6. Create `/messes/{messId}` claiming `mgrUid` of another user -> PERMISSION_DENIED.
7. Inject huge 2MB junk into `/messes/{messId}` -> PERMISSION_DENIED.
8. Set manager role or elevate permissions without authentication -> PERMISSION_DENIED.
9. Blind query scraping of `/users` collection without specifying exact target -> PERMISSION_DENIED.
10. Anonymous user modifying mess data -> PERMISSION_DENIED.
11. Corrupting mess ID path with malicious payload -> PERMISSION_DENIED.
12. Attempting to bypass auth token checks -> PERMISSION_DENIED.
