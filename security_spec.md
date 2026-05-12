# Security Specification - ZenHabit

## Data Invariants
1. All user-created data (Habits, Tasks, Logs, Budget Items) must belong to a valid `userId` (the authenticated user).
2. Users can only read, update, or delete their own data.
3. Users cannot modify certain system fields like `createdAt` after creation.
4. Timestamps must be validated using `request.time`.
5. Budget amounts must be positive numbers.

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a habit for another user.
2. **Identity Spoofing (Update)**: Attempt to change the `userId` of an existing habit.
3. **Privilege Escalation**: Attempt to set `isAdmin` (though not used, checking for rogue fields).
4. **Invalid Type**: Attempt to set `timeSpent` as a string instead of an integer.
5. **Boundary Breach**: Attempt to set `amount` to a negative number in budget.
6. **Immutable Field Attack**: Attempt to change `createdAt` on a user profile.
7. **Orphaned Record**: Attempt to create a log for a non-existent habit (check relational sync).
8. **Shadow Field Injection**: Adding a `verified: true` field to a user profile.
9. **Large Payload**: Attempt to inject 1MB string into a habit title (Denial of Wallet).
10. **State Skipping**: Attempt to mark a task as completed without a `userId`.
11. **Future Timestamp**: Attempt to set `createdAt` in the future (must use server time).
12. **Blanket Read**: Attempt to list all habits (must be restricted to own userId).

## Test Implementation (Draft)
A comprehensive `firestore.rules.test.ts` will verify these cases.
