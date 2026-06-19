# Gmail connect — Google Cloud setup

Dashboard email can sync a connected Gmail inbox alongside Resend (`support@companionsofcaddo.org`).

## Google Cloud Console links

| Step | URL |
|------|-----|
| Console home | https://console.cloud.google.com/ |
| Project: **companions-of-cpas** | Select from the project picker |
| Enable Gmail API | https://console.cloud.google.com/apis/library/gmail.googleapis.com |
| OAuth consent screen | https://console.cloud.google.com/apis/credentials/consent |
| OAuth credentials | https://console.cloud.google.com/apis/credentials |

## One-time setup

1. **Enable Gmail API** on project `companions-of-cpas`.
2. Open the existing **Web application** OAuth client (`companions-of-cpas`).
3. Under **Authorized redirect URIs**, add:
   ```
   https://companionsofcaddo.org/api/social/oauth/google/callback
   ```
4. On **OAuth consent screen**, add scopes:
   - `gmail.readonly`
   - `gmail.send`
   - `gmail.modify`
   - `userinfo.email`
5. If the app is in **Testing**, add each Google account under **Test users**.

## Worker secrets (already used for Drive/login)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DRIVE_ENCRYPT_KEY` (encrypts Gmail refresh tokens)

## Connect in dashboard

1. Log in at https://companionsofcaddo.org/dashboard/email
2. Click **Connect Gmail** in the left nav
3. Approve with a Google account (must be a test user while app is in Testing)
4. Inbox syncs automatically after redirect; use **Sync** anytime

## API routes

- `GET /api/integrations/gmail/connect` — start OAuth (auth required)
- `GET /api/social/oauth/google/callback` — OAuth callback (shared with Drive)
- `POST /api/integrations/gmail/sync` — pull latest INBOX messages
- `POST /api/integrations/gmail/disconnect` — revoke and clear tokens
