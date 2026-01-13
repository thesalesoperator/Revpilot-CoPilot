# Google OAuth Setup for RevPilot Web Platform

This guide walks you through setting up Google OAuth for the RevPilot web application.

## Prerequisites

- A Supabase project
- Access to Google Cloud Console

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application** as the application type
6. Configure:
   - **Name**: RevPilot Web App
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com`
   - **Authorized redirect URIs**:
     - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase Auth

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and enable it
5. Enter:
   - **Client ID**: (from Step 1)
   - **Client Secret**: (from Step 1)
6. Save the configuration

## Step 3: Configure OAuth Consent Screen (if not done)

1. In Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal for Google Workspace)
3. Fill in required information:
   - **App name**: RevPilot
   - **User support email**: your email
   - **Developer contact email**: your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Save and continue through the wizard

## Step 4: Verify Redirect URLs

Make sure your Supabase project has the correct redirect URLs configured:

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add your site URL: `https://your-domain.com`
3. Add redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## How It Works

1. User clicks "Continue with Google" on login/signup page
2. User is redirected to Google's OAuth consent screen
3. After approval, Google redirects to Supabase's callback URL
4. Supabase handles the OAuth token exchange
5. Supabase redirects to `/auth/callback` with an auth code
6. The callback route exchanges the code for a session
7. User is redirected to the dashboard, fully authenticated

## Testing

### Local Development

1. Make sure `http://localhost:3000` is added to:
   - Google OAuth's authorized JavaScript origins
   - Google OAuth's authorized redirect URIs (via Supabase)
   - Supabase's redirect URLs

2. Start your development server:
   ```bash
   npm run dev
   ```

3. Visit `http://localhost:3000/login`
4. Click "Continue with Google"
5. Complete the OAuth flow

### Production

1. Ensure all production URLs are added to Google OAuth credentials
2. Verify Supabase has the correct production redirect URLs
3. Test the flow on your production domain

## Troubleshooting

### "Error: Invalid Redirect URI"

- Check that the redirect URI matches exactly in Google Cloud Console
- The redirect should be: `https://<project>.supabase.co/auth/v1/callback`

### "This app isn't verified"

- Your Google app is in testing mode
- Add test users in OAuth consent screen, or
- Submit for Google verification for production use

### "Access Denied"

- Check that all required scopes are added
- Verify the user is added as a test user (if in testing mode)

### User not created in database

- Check that your database triggers are working
- Verify RLS policies allow user creation
- Check Supabase logs for errors

## Environment Variables

Ensure these are set in your environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Google OAuth credentials are stored in Supabase, not in environment variables.

## Security Notes

- Never expose your Google Client Secret in frontend code
- Client Secret should only be stored in Supabase
- Use HTTPS in production
- Regularly rotate credentials if compromised
