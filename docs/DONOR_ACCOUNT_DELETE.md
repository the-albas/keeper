# Donor account deletion

## Behavior

- **Web:** The donor dashboard (`/donor`) exposes **Delete Account** → confirm. It calls the API with the session cookie (`credentials: "include"`).
- **API:** `DELETE /api/auth/account` (authorized) signs the user out and removes the **ASP.NET Identity** user via `UserManager.DeleteAsync`.

## Implementation pointers

- Frontend: `web/src/routes/donor.tsx` — `deleteAccount()` → `DELETE {api}/api/auth/account`.
- Backend: `api/src/Controllers/AuthController.cs` — `DeleteAccount` action.

## Data model note

The delete flow removes the **Identity user record** only. If you later link donations or CRM data to `SupporterId`, user id, or email in a way that requires referential cleanup, extend the endpoint (e.g. soft-delete, anonymize, or delete related rows in one transaction) so history and constraints stay consistent with product policy.
