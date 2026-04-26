# CoReeder - Deployment & Testing Guide

## Installation

### Prerequisites
- Google Chrome or Chromium-based browser
- Icons generated (run `node generate_icons.js` if icons/ folder is empty)

### Load Extension (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `coreeder` folder
5. Extension should appear in your toolbar

### Generate Icons (if needed)

```bash
cd coreeder
node generate_icons.js
```

This creates:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

## Testing

### Test Workflow

1. **Navigate to an article**
   - Go to any news site, blog, or article page
   - Example: Medium, Dev.to, news.ycombinator.com

2. **Scroll down**
   - Extension tracks your reading progress
   - `lastReadIndex` updates as you scroll
   - Check: Open DevTools → Console, type `__coreederLastReadIndex`

3. **Highlight text**
   - Select a passage after scrolling past it
   - **Important:** Highlight text that is BEFORE or AT your current scroll position
   - (Highlighting unread text will still explain, but prompt won't include that future context)

4. **Right-click and explain**
   - Context menu appears: "Explain with CoReeder"
   - Tooltip shows loading state
   - Explanation appears after 2-5 seconds

5. **Verify context limitation**
   - The explanation should reference previously-read content
   - Never includes paragraphs beyond `lastReadIndex`

### Debug Mode

In DevTools Console:

```javascript
// View all extracted paragraphs
__coreederParagraphs

// View current reading position
__coreederLastReadIndex

// Example output:
// __coreederParagraphs = [
//   "First paragraph text...",
//   "Second paragraph text...",
//   ...
// ]
// __coreederLastReadIndex = 5  (user has read through paragraph 5)
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No content extracted | Page structure not recognized | Try on a different page (structured articles work best) |
| Extension button inactive | Page uses shadow DOM or iframe content | Only works on main document content |
| "Could not identify highlighted text" | Selected from outside main article | Select text from the article body |
| API error 401 | Azure credentials invalid | Check `background.js` has valid local Azure settings |
| API error 429 | Rate limited | Wait a moment and retry |
| Explanation includes future content | `lastReadIndex` not updated | Scroll before highlighting to register read position |

## Configuration

### Adjust Context Size

Edit `src/promptBuilder.js`:
```javascript
const MAX_PRIOR_PARAGRAPHS = 30;      // Change to 15 for smaller context
const FORWARD_CONTEXT_COUNT = 2;      // Change to 0 to exclude forward context
```

### Change Reading Threshold

Edit `src/scrollTracker.js`:
```javascript
threshold: 0.5,   // Change to 0.25 for earlier detection, 0.75 for later
```

### Adjust AI Temperature

Edit `background.js`:
```javascript
temperature: 0.4,  // Lower = more factual, Higher = more creative
```

## Azure OpenAI Configuration

The extension uses:
- **Local setting:** `AZURE_RESOURCE_NAME`
- **Model:** `gpt-4o-mini` (via deployment)
- **Local setting:** `AZURE_API_KEY`

These values are stored locally in `background.js` and should stay out of Git.

**⚠️ Security Note:** For production, move API credentials to a backend service.

## Chrome Extension Manifest

Current manifest.json includes:
- **Permissions:**
  - `activeTab` - Access current tab
  - `contextMenus` - Register right-click menu

- **Content Scripts:** All JS files run on every page at `document_idle`
  - Load order: Extraction → Scroll Tracking → Highlight Mapper → Prompt Builder → AI Service → Tooltip → Orchestrator

- **Styles:** Tooltip CSS

- **Icons:** 16x16, 48x48, 128x128

## Performance Notes

- **First load:** ~50-200ms to extract and prepare paragraphs
- **Scroll tracking:** Minimal (IntersectionObserver is very efficient)
- **API call:** 2-5 seconds typically (includes network + model latency)
- **Tooltip rendering:** <100ms

## Troubleshooting

### Extension not appearing in Chrome

**Solution:**
1. Check manifest.json is valid (copy to https://jsonlint.com/)
2. Verify file paths in manifest are correct
3. Reload the extension (click refresh icon in chrome://extensions/)

### "This page can't be accessed by the extension"

**Why:** Chrome restricts extensions from running on certain pages (chrome:// pages, extensions://, chrome store)

**Solution:** This is by design. Try on regular websites.

### Tooltip not positioning correctly

**Solution:** This is rare. Try:
1. Refresh page (F5)
2. Select text again
3. Report issue with page URL

### Azure API returns 401

**Solution:**
1. Verify `AZURE_API_KEY` in `background.js` is correct
2. Check endpoint URL matches Azure resource
3. Ensure deployment name (`gpt-4o-mini`) exists
4. Verify API version is `2024-08-01-preview`

## Production Deployment

### Before shipping:

1. ✅ Move API key to backend service
2. ✅ Implement CORS on backend for API calls
3. ✅ Add rate limiting to prevent abuse
4. ✅ Set up request logging and monitoring
5. ✅ Get Chrome Web Store account
6. ✅ Create privacy policy (transparency on what data is sent)
7. ✅ Upload to Chrome Web Store

### Example backend flow:

```
Extension → Your Backend → Azure OpenAI
                ↑
           (securely forwards with key)
```

## Architecture Diagram

See `ARCHITECTURE.md` for detailed system design.

## Support

For issues:
1. Check console errors (DevTools → Console)
2. Verify page has structured article content
3. Try on a different article/page
4. Check Azure credentials are correct
5. Review error messages in tooltip
