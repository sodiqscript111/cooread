# CoReeder - Quick Start Guide

## 30-Second Setup

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → Select `coreeder` folder
4. Done! CoReeder is now active

## 1-Minute First Use

1. Go to any article (Medium, Dev.to, etc.)
2. **Scroll down** to read some paragraphs
3. **Highlight** any text you want explained
4. **Right-click** → "Explain with CoReeder"
5. **Read** the explanation in the tooltip

## How It Works

```
Your Browser                    CoReeder                    Groq API
    │                              │                            │
    ├─ You read article ──────────→ Extracts & tracks ─ ─ ─ ─ ─ ─
    │                              │
    ├─ You highlight text ─────────→ Maps to paragraph
    │                              │
    ├─ Right-click explain ────────→ Builds context (only read parts!)
    │                              │
    ├─ ← ← ← ← ← ← ← ← ← ← Show tooltip ← ← Explanation ← ← ← ├─ Generates answer
    │                              │
    └─ You read explanation        └─────────────────────────────
```

## Key Feature: Respects What You've Already Read

- Extension tracks your scroll position
- When you click "Explain", it builds context ONLY from paragraphs you've already scrolled past
- Never includes future unread content in the explanation
- This keeps explanations grounded in what you know so far

## Configuration

### Want smaller context window?
Edit `src/promptBuilder.js`:
```javascript
const MAX_PRIOR_PARAGRAPHS = 15;  // Instead of 30
```

### Want faster but less creative answers?
Edit `src/aiService.js`:
```javascript
temperature: 0.2,  // Lower is more factual
```

### Want to see debug info?
Open DevTools Console (F12) and type:
```javascript
__coreederParagraphs        // All paragraphs extracted
__coreederLastReadIndex      // How far you've scrolled
```

## Common Questions

**Q: Why did it explain something I haven't read yet?**
A: You highlighted text from a paragraph you haven't scrolled past. The extension allows this but notes it in the system prompt.

**Q: Does it work on all websites?**
A: Most websites with article-style content (Medium, news sites, blogs). Won't work on JavaScript-heavy single-page apps without structured content.

**Q: Will my reading be tracked somewhere?**
A: No. Everything happens locally in your browser. The only thing sent to Groq API is: the text context + your highlight (for that one request). No history stored.

**Q: Can I customize the tooltip appearance?**
A: Yes. Edit `src/tooltip.css` to change colors, size, animations, etc.

**Q: What if the API fails?**
A: You'll see an error message in the tooltip. Just try again.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not extract readable content" | Try a different page with structured article content |
| "Could not identify highlighted text" | Highlight text from the article body, not headers/footers |
| API error (401, 403) | Check Groq API key in `background.js` |
| Tooltip not showing | Reload the page (F5) and try again |
| Extension not loading | Check `manifest.json` is valid (jsonlint.com) |

## Advanced: Using with Backend

For production, replace the API key logic in `src/aiService.js`:

```javascript
// Instead of:
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Use:
const API_URL = 'https://your-backend.com/api/explain'

// Then your backend forwards securely to Groq API
// This way your API key never leaves your server
```

## Architecture Overview

```
contentExtractor.js  ← Pulls article text
         ↓
scrollTracker.js     ← Tracks your reading
         ↓
highlightMapper.js   ← Finds your selection
         ↓
promptBuilder.js     ← Builds context (respecting read position)
         ↓
aiService.js         ← Sends to Groq API
         ↓
tooltip.js           ← Shows explanation
```

## Next Steps

1. ✅ Load extension (see above)
2. ✅ Test on your favorite article
3. 📖 Read [ARCHITECTURE.md](ARCHITECTURE.md) for deep dive
4. 🧪 See [TESTING.md](TESTING.md) for more test scenarios
5. 🚀 Deploy to production (move API key to backend first!)

## File Structure

```
coreeder/
├── manifest.json              ← Chrome extension config
├── background.js              ← Context menu handler
├── generate_icons.js          ← Icon generator
├── src/
│   ├── content.js             ← Main orchestrator
│   ├── contentExtractor.js    ← Text extraction
│   ├── scrollTracker.js       ← Reading progress
│   ├── highlightMapper.js     ← Selection to paragraph
│   ├── promptBuilder.js       ← Context assembly
│   ├── aiService.js           ← Groq API
│   ├── tooltip.js             ← UI display
│   └── tooltip.css            ← Styling
├── icons/                     ← Extension icons
├── ARCHITECTURE.md            ← Detailed design
├── TESTING.md                 ← Test guide
├── IMPLEMENTATION_SUMMARY.md  ← What was built
└── README.md                  ← This file
```

## Support

- Check console errors (DevTools → F12 → Console)
- Try on a different article
- Review error messages in tooltip
- See [TESTING.md](TESTING.md) for troubleshooting section

---

**Ready? Load the extension and start explaining!** 🚀
