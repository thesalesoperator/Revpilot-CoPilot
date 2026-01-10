# RevPilot Sales Coach - Chrome Extension v2.0

Real-time AI sales coaching during your video calls - **no bot required**.

## What's New in v2.0

- **Bot-Free Mode**: Audio is captured directly from your browser tab - no awkward bot joining your calls
- **Multi-Platform Support**: Works with Zoom, Google Meet, and Microsoft Teams
- **Lower Cost**: Uses Deepgram for transcription (~$0.46/hour vs $1-2/hour with meeting bots)
- **Better Privacy**: Audio is processed locally and streamed directly to transcription service

## Features

- **Real-Time Suggestions**: Get coaching tips and follow-up questions as you talk
- **Objection Handling**: AI detects objections and suggests responses instantly
- **Talk Ratio Tracking**: Monitor your talk/listen balance in real-time
- **Private Overlay**: Only you can see the coaching panel - not visible to other participants
- **Live Transcription**: See what's being said in real-time

## How It Works

1. **Tab Audio Capture**: The extension uses Chrome's `tabCapture` API to capture audio from your meeting tab
2. **Real-Time Transcription**: Audio is streamed to Deepgram for instant transcription
3. **AI Analysis**: Transcripts are analyzed by OpenAI to generate coaching suggestions
4. **Private Display**: Suggestions appear in a draggable overlay only you can see

## Installation

### Quick Install (Recommended)

1. Download the extension ZIP file from your RevPilot Settings page
2. Extract the ZIP to a folder on your computer
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (toggle in top right)
5. Click **Load unpacked**
6. Select the extracted folder
7. Done! You'll see the RevPilot icon in your extensions bar

### Manual Install (Developers)

```bash
git clone <repo>
cd chrome-extension
```

Then follow steps 3-7 above.

## Usage

1. **Sign In**: Click the RevPilot extension icon and sign in with your RevPilot credentials

2. **Join a Meeting**: Open your video call in Chrome:
   - Zoom: `zoom.us/wc/join` or web client
   - Google Meet: `meet.google.com`
   - Microsoft Teams: `teams.microsoft.com`

3. **Start Coaching**: When the meeting loads, you'll see the RevPilot overlay. Click **Start Coaching**

4. **Get Real-Time Tips**: As you speak, AI will analyze the conversation and show:
   - Discovery questions to ask
   - Tips for improving your pitch
   - Objection handling suggestions
   - Positive reinforcement when you're doing well
   - Live transcription of the conversation

5. **End Session**: Click **End Coaching** when done. Your call will be saved to RevPilot for post-call review.

## Supported Platforms

| Platform | Support | Notes |
|----------|---------|-------|
| Zoom (Web) | ✅ Full | Use `zoom.us/wc/` web client |
| Google Meet | ✅ Full | `meet.google.com` |
| Microsoft Teams | ✅ Full | `teams.microsoft.com` |
| Zoom (Desktop) | ❌ | Desktop app not supported - use web client |

## Tips

- **Use Web Clients**: The extension captures audio from browser tabs, so use the web version of your meeting platform
- **Drag to Reposition**: Click and drag the panel header to move it
- **Minimize**: Click the minimize button to hide the panel (shows as floating button)
- **Private**: The overlay is only visible in your browser - not to other participants or in screen shares
- **Keep Tab Open**: Don't minimize or close the meeting tab while coaching is active

## Troubleshooting

**"Please log in to RevPilot first"**
- Click the extension icon and sign in with your credentials

**Overlay doesn't appear**
- Make sure you're on a supported meeting page (Zoom web, Google Meet, or Teams)
- Refresh the page and wait for the meeting to fully load
- Check that the extension is enabled in `chrome://extensions`

**No transcription/suggestions appearing**
- Ensure your microphone is working and meeting audio is playing
- Check the browser console for any error messages
- Verify the backend has valid Deepgram and OpenAI API keys

**Audio not playing after starting coaching**
- This is a known Chrome limitation - the extension routes audio back to your speakers
- If audio stops, try refreshing the page and restarting coaching

## Privacy & Security

- **No Recording Storage**: Audio is processed in real-time and not stored
- **Bot-Free**: No visible bot joins your meeting
- **Private Overlay**: Never visible to other call participants
- **Tab-Only Access**: Extension only activates on meeting platform domains
- **Encrypted**: All data transmitted over HTTPS/WSS

## Technical Requirements

- Google Chrome (or Chromium-based browser) version 116+
- Active RevPilot account
- Microphone access for meeting
- Stable internet connection

## Environment Variables (Backend)

The backend requires these environment variables for full functionality:

```
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Support

For help or feedback, visit [RevPilot Dashboard](https://revpilot-copilot.netlify.app) or contact support.
