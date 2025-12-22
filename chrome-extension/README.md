# RevPilot Sales Coach - Chrome Extension

Real-time AI sales coaching during your Zoom calls.

## Features

- **Real-Time Suggestions**: Get coaching tips and follow-up questions as you talk
- **Objection Handling**: AI detects objections and suggests responses instantly
- **Talk Ratio Tracking**: Monitor your talk/listen balance in real-time
- **Private Overlay**: Only you can see the coaching panel - not visible to other participants

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

2. **Join a Zoom Call**: Open Zoom in Chrome at `zoom.us/wc/join` or join from a meeting link

3. **Start Coaching**: When the meeting loads, you'll see the RevPilot overlay. Click **Start Coaching**

4. **Get Real-Time Tips**: As you speak, AI will analyze the conversation and show:
   - Discovery questions to ask
   - Tips for improving your pitch
   - Objection handling suggestions
   - Positive reinforcement when you're doing well
   - Talk ratio tracking

5. **End Session**: Click **End Coaching** when done. Your call will be saved to RevPilot for post-call review.

## Tips

- **Use Zoom Web**: The extension only works with Zoom in Chrome (not the desktop app)
- **Drag to Reposition**: Click and drag the panel header to move it
- **Minimize**: Click the minimize button to hide the panel (shows as floating button)
- **Private**: The overlay is only visible in your browser - not to other participants or in screen shares

## Troubleshooting

**"Please log in to RevPilot first"**
- Click the extension icon and sign in with your credentials

**Overlay doesn't appear**
- Make sure you're on a zoom.us meeting page
- Refresh the page and wait for the meeting to fully load
- Check that the extension is enabled in `chrome://extensions`

**Suggestions aren't appearing**
- The AI needs a few seconds to analyze the conversation
- Speak naturally - suggestions appear based on conversation context

## Privacy

- Audio is processed in real-time and not stored during the call
- Only anonymized transcripts are saved for post-call review
- The coaching overlay is never visible to other call participants
- Extension only activates on zoom.us domains

## Support

For help or feedback, visit [RevPilot Dashboard](https://revpilot-commission-calculator.netlify.app) or contact support.
