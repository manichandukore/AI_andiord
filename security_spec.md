# Security Specification

## Data Invariants
1. A User Profile document under `/users/{userId}` can only be created or updated if `request.auth.uid == userId`.
2. A HealthCheckIn document under `/users/{userId}/checkins/{checkInId}` can only be read or written by the authenticated owner (`request.auth.uid == userId`).
3. Document IDs must be valid alphanumeric strings adhering to regex `^[a-zA-Z0-9_\\-]+$` with size <= 128 characters.
4. All string fields must adhere to declared bounds (`maxLength`).

## The "Dirty Dozen" Payloads (Attacks that MUST return PERMISSION_DENIED)
1. Anonymous write to `/users/{userId}` without auth.
2. Cross-user spoofing: User A writes to `/users/{userB}`.
3. Giant string payload injection exceeding 512 bytes on `displayName`.
4. Arbitrary unknown field injection into UserProfile (`isAdmin: true`).
5. Cross-user subcollection write: User A writes into `/users/{userB}/checkins/{checkInId}`.
6. Malformed document ID with special punctuation injection `/users/{userA}/checkins/../../admin`.
7. Client attempting to list all `/users` without scoping query to their own `request.auth.uid`.
8. User writing checkin with mismatched `userId != request.auth.uid`.
9. Modifying immutable `uid` on profile update.
10. Unverified token trying to write to another user's private data.
11. Injecting non-string types into string fields (e.g. numeric notes).
12. Attempting to bypass security by injecting ghost collections.
