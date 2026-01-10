# Google OAuth Setup for RevPilot Chrome Extension

This guide walks you through setting up Google OAuth for the Chrome extension.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "RevPilot Sales Coach" and create it

## Step 2: Enable the OAuth API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google+ API" and enable it
3. Search for "People API" and enable it

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in the app information:
   - **App name**: RevPilot Sales Coach
   - **User support email**: your email
   - **App logo**: (optional) upload RevPilot logo
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Add test users (your email) while in testing mode
6. Complete the wizard

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Chrome Extension** as the application type
4. Enter:
   - **Name**: RevPilot Chrome Extension
   - **Extension ID**: Get this from `chrome://extensions` after loading the extension
5. Click **Create**
6. Copy the **Client ID** (looks like `XXXXX.apps.googleusercontent.com`)

## Step 5: Update the Extension

1. Open `chrome-extension/manifest.json`
2. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID:

```json
"oauth2": {
  "client_id": "123456789-abcdefg.apps.googleusercontent.com",
  "scopes": [
    "openid",
    "email",
    "profile"
  ]
}
```

## Step 6: Get Extension ID

To get the extension ID for the OAuth credentials:

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked** and select the `chrome-extension` folder
4. Your extension ID will appear (32 lowercase letters)
5. Go back to Google Cloud Console and add this ID to your OAuth credentials

## Step 7: Reload the Extension

1. Go to `chrome://extensions`
2. Click the refresh icon on RevPilot Sales Coach
3. Test Google Sign-In by clicking the extension icon

## Troubleshooting

### "OAuth2 not granted or revoked"
- Make sure your extension ID matches what's in Google Cloud Console
- Try removing and re-adding the extension

### "This app is blocked"
- Your app is still in testing mode
- Add your Google account as a test user in OAuth consent screen

### "Access denied"
- Check that all required scopes are added to the OAuth consent screen
- Verify the client ID is correctly copied

### Getting the Extension ID
```
1. Go to chrome://extensions
2. Enable Developer Mode
3. Look for "ID:" under the extension name
4. It looks like: abcdefghijklmnopqrstuvwxyz123456
```

## Production Deployment

Before publishing to Chrome Web Store:

1. **Verify your app**: Complete Google's verification process for production OAuth
2. **Update OAuth consent screen**: Switch from "Testing" to "In production"
3. **Use the Chrome Web Store extension ID**: When published, the extension gets a permanent ID

## Environment Variables

Make sure these are set in your Netlify/deployment environment:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The backend endpoint `/api/auth/google` handles:
1. Verifying the Google access token
2. Creating/finding the user in Supabase
3. Returning an access token for the extension
