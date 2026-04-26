# CoReeder - Context-Aware Reading Assistant Architecture

## Overview
CoReeder is a Chrome Extension that extracts article content, tracks reading progress, and explains highlighted text using only previously-read context.

## Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    User activates extension                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────▼─────────────────┐
        │  contentExtractor.js           │
        │  - Extracts main content       │
        │  - Removes nav/ads/sidebars    │
        │  - Splits into paragraphs      │
        │  - Assigns numeric IDs         │
        └──────────────┬─────────────────┘
                       │
        ┌──────────────▼─────────────────────────┐
        │  State initialized                     │
        │  {                                     │
        │    paragraphs: [{id, text}, ...],     │
        │    lastReadIndex: -1                  │
        │  }                                     │
        └──────────────┬─────────────────────────┘
                       │
        ┌──────────────▼─────────────────────────┐
        │  scrollTracker.js                      │
        │  - Tracks visible paragraphs           │
        │  - Updates lastReadIndex               │
        │  - Uses IntersectionObserver (50%)     │
        └──────────────┬─────────────────────────┘
                       │
              User scrolls & reads
                       │
        ┌──────────────▼──────────────────────┐
        │  User highlights text               │
        │  Right-click → Explain with CoReeder│
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  background.js (message relay)          │
        │  - Receives context menu click          │
        │  - Sends EXPLAIN_SELECTION to content   │
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  highlightMapper.js                     │
        │  - Identifies highlighted text          │
        │  - Maps to paragraph index              │
        │  - Returns: text + highlightIndex       │
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  promptBuilder.js                       │
        │  - Builds context from prior paragraphs │
        │  - Respects lastReadIndex (no future!)  │
        │  - Limits to MAX_PRIOR_PARAGRAPHS (30)  │
        │  - Includes highlighted text            │
        │  - Adds limited forward context         │
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  tooltip.js (showLoading)               │
        │  - Displays loading state                │
        │  - Positions near selection              │
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  aiService.js (Azure OpenAI)            │
        │  - Sends prompt to Azure                │
        │  - Receives explanation                 │
        │  - Handles errors gracefully            │
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │  tooltip.js (showExplanation)           │
        │  - Updates tooltip with response        │
        │  - User can close or read more          │
        └──────────────────────────────────────────┘
```

## Module Structure

### 1. **contentExtractor.js** - Text Extraction
**Responsibility:** Extract main readable content, remove noise, parse into paragraphs

**Key functions:**
- `extractContent()` → `{ paragraphs: string[], paragraphElements: Element[] }`

**Noise removal:**
- Navigation, headers, footers, sidebars
- Ads, comments, modals, iframes
- Scripts, styles

**Paragraph detection:**
- Tags: `P, LI, BLOCKQUOTE, H1-H6, TD, TH, PRE, FIGCAPTION, DT, DD`
- Minimum text length: 10 characters
- Each element tagged with `data-coreeder-idx`

---

### 2. **scrollTracker.js** - Reading Progress Tracking
**Responsibility:** Monitor which paragraphs user has scrolled past

**Key functions:**
- `initScrollTracker(paragraphElements)` - Start observing
- `getLastReadIndex()` → number

**Mechanism:**
- IntersectionObserver with 50% threshold
- Tracks highest-index paragraph that was ≥50% visible
- State: `lastReadParagraphIndex`

---

### 3. **highlightMapper.js** - Highlight Detection
**Responsibility:** Map user selection to paragraph

**Key functions:**
- `mapHighlightToParagraph(selection, paragraphElements)` → `{ text, paragraphIndex }` or `null`

**Strategy:**
1. Check `data-coreeder-idx` attribute on anchor element
2. Walk DOM tree upward looking for tagged element
3. Find by containment in paragraph elements
4. Last resort: text substring matching

---

### 4. **promptBuilder.js** - Context Assembly
**Responsibility:** Build LLM prompt from extracted content

**Key functions:**
- `buildPrompt({ paragraphs, highlightIndex, highlightedText, lastReadIndex, maxPriorParagraphs })` → string

**Context boundaries:**
- **Prior context:** From `max(0, highlightIndex - 30)` to `highlightIndex - 1`
- **Highlighted:** Paragraph at `highlightIndex`
- **Forward context:** Limited to `lastReadIndex + 2` (never include unread future content!)
- **Max tokens:** 512 output

**Prompt structure:**
```
[Instructions]
[Previously Read Context]  ← Only includes read paragraphs
[Highlighted Paragraph]
[Highlighted Text]
[Forward Context]         ← Reference only, respects read boundary
[Your Explanation]
```

---

### 5. **aiService.js** - AI Integration
**Responsibility:** Send prompt to Azure OpenAI, retrieve explanation

**Key functions:**
- `explainHighlight(prompt)` → Promise<string>

**Azure OpenAI Configuration:**
- **Endpoint:** `https://<your-resource>.openai.azure.com/`
- **Deployment:** `gpt-4o-mini`
- **API Version:** `2024-08-01-preview`
- **Temperature:** 0.4 (low creativity for factual explanations)
- **Max tokens:** 512

**Request format:**
```javascript
{
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.4,
  max_tokens: 512
}
```

---

### 6. **tooltip.js** - UI Display
**Responsibility:** Show/hide explanation in a floating tooltip

**Key functions:**
- `showLoading(highlightedText)` - Show loading state
- `showExplanation(explanation)` - Update with response
- `showError(message)` - Show error message
- `hideTooltip()` - Close tooltip

**Features:**
- Positioned near text selection
- Flips above if near bottom of screen
- Responsive scrolling container
- Dismissible (close button, click outside, ESC key)
- Glass-morphism design

---

### 7. **background.js** - Message Relay
**Responsibility:** Register context menu, relay messages

**Flow:**
1. On install: Register "Explain with CoReeder" context menu
2. On right-click: Listen for menu click
3. Send `EXPLAIN_SELECTION` message to content script

---

### 8. **content.js** - Orchestrator
**Responsibility:** Coordinate all modules, handle main flow

**Key steps:**
1. Initialize on page load
2. Extract paragraphs using `contentExtractor.js`
3. Start scroll tracking with `scrollTracker.js`
4. Listen for explain requests from background
5. Map selection using `highlightMapper.js`
6. Build prompt with `promptBuilder.js`
7. Call AI with `aiService.js`
8. Display result with `tooltip.js`

---

## State Management

### Global State (in content.js)
```javascript
{
  paragraphs: string[],              // All extracted paragraph texts
  paragraphElements: Element[],       // Corresponding DOM elements
  initialized: boolean                // Has extraction run?
}
```

### Scroll Tracker State (in scrollTracker.js)
```javascript
{
  lastReadParagraphIndex: number,     // Highest visible paragraph
  observer: IntersectionObserver      // Active observer instance
}
```

## Configuration Constants

| Variable | Value | Purpose |
|----------|-------|---------|
| `MAX_PRIOR_PARAGRAPHS` | 30 | Limit context size for token efficiency |
| `FORWARD_CONTEXT_COUNT` | 2 | Include next N paragraphs for reference |
| `NOISE_SELECTORS` | [multiple] | Elements to remove during extraction |
| `CONTENT_TAGS` | {P, LI, H1-H6, ...} | Tags that count as paragraphs |
| `INTERSECTION_THRESHOLD` | 0.5 | % visible before marking as read |
| `MIN_PARAGRAPH_LENGTH` | 10 | Minimum chars to be a valid paragraph |

## Error Handling

1. **No readable content found**
   - Log to console
   - Show error in tooltip

2. **Highlight mapping failed**
   - User selected non-article content
   - Show error with guidance

3. **AI API error**
   - Network failure, auth failure, rate limit
   - Show error message with status code
   - User can retry

## UX Flow

```
1. Page loads
   └─ Extension initializes silently
      └─ Content extracted & cached

2. User scrolls
   └─ Reading progress tracked automatically
      └─ lastReadIndex updated

3. User highlights text
   └─ Selects passage of interest

4. User right-clicks
   └─ Sees "Explain with CoReeder" option
      └─ Clicks it

5. Extension explains
   └─ Tooltip shows loading state
   └─ Queries Azure OpenAI with context
   └─ Displays explanation

6. User reads explanation
   └─ Can dismiss with close button, click outside, or ESC
```

## Security & Privacy

- **No external trackers:** Only sends to Azure OpenAI
- **No persistent storage:** Everything in-memory
- **No user data:** Doesn't persist highlights or explanations
- **No cross-domain:** Only works on current tab
- **API key:** Stored in source (for local testing; should use backend for production)

## Performance Considerations

- **Lazy initialization:** Extract only when needed
- **Cached paragraphs:** Avoid re-extracting on multiple explains
- **Limited context:** Max 30 prior + 2 forward paragraphs
- **IntersectionObserver:** Efficient scroll tracking (native browser API)
- **Token limits:** 512 max output for fast responses

## Future Enhancements

1. **Backend relay:** Move API key to backend to avoid exposure
2. **Caching:** Store explanations for repeated highlights
3. **Multi-language:** Translate explanations to user's language
4. **Settings UI:** Let users configure context size, model selection
5. **Keyboard shortcuts:** Alt+X to explain without right-click
6. **Reading history:** Show what user has already explained
7. **Explain full paragraph:** Extend beyond highlight to full containing paragraph
