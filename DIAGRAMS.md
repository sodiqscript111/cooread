# CoReeder - Visual Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHROME BROWSER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      CONTENT SCRIPT (content.js)                   │  │
│  │                        [ORCHESTRATOR]                              │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 1. INITIALIZATION                                           │ │  │
│  │  │   - On page load: extract paragraphs                        │ │  │
│  │  │   - Start scroll tracking                                   │ │  │
│  │  │   - Cache DOM references                                   │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 2. LISTEN FOR EXPLAIN REQUEST                               │ │  │
│  │  │   - Receive message from background.js                      │ │  │
│  │  │   - Message type: EXPLAIN_SELECTION                         │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 3. EXTRACT HIGHLIGHT                                        │ │  │
│  │  │   - Get current window.getSelection()                       │ │  │
│  │  │   - Identify paragraph containing selection                 │ │  │
│  │  │   - Get highlightIndex                                      │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 4. GET READING POSITION                                     │ │  │
│  │  │   - lastReadIndex from scroll tracker                       │ │  │
│  │  │   - (highest paragraph user has scrolled past)              │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 5. BUILD CONTEXT PROMPT                                     │ │  │
│  │  │   - Prior paragraphs: (highlightIndex - 30) to highlightIdx │ │  │
│  │  │   - Forward context: only up to lastReadIndex + 2           │ │  │
│  │  │   - NO future unread content!                               │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 6. SEND TO AI                                               │ │  │
│  │  │   - Call Azure OpenAI API                                   │ │  │
│  │  │   - Send prompt + highlighted text                          │ │  │
│  │  │   - Wait for response                                       │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ 7. DISPLAY EXPLANATION                                      │ │  │
│  │  │   - Show tooltip with explanation                           │ │  │
│  │  │   - Position near selection                                 │  │  │
│  │  │   - Let user dismiss or read                                │  │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                                                                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  BACKGROUND SERVICE WORKER (background.js)                          │  │
│  │  - Listens for context menu clicks                                  │  │
│  │  - Relays message to content script                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ↓                               ↓
         ┌──────────────────────┐     ┌──────────────────────┐
         │  USER INTERACTION    │     │   AZURE OPENAI API   │
         │                      │     │                      │
         │  - Click "Explain"   │     │  - gpt-4o-mini       │
         │  - Read explanation  │     │  - Temperature 0.4   │
         │  - Dismiss tooltip   │     │  - Max 512 tokens    │
         └──────────────────────┘     └──────────────────────┘
```

## Module Dependencies

```
content.js (ORCHESTRATOR)
    │
    ├─ contentExtractor.js
    │  └─ Extracts paragraphs from DOM
    │
    ├─ scrollTracker.js
    │  └─ Tracks reading progress via IntersectionObserver
    │
    ├─ highlightMapper.js
    │  └─ Maps selection to paragraph index
    │
    ├─ promptBuilder.js
    │  ├─ Uses scrollTracker.getLastReadIndex()
    │  └─ Builds context respecting read boundary
    │
    ├─ aiService.js
    │  └─ Calls Azure OpenAI API
    │
    └─ tooltip.js
       └─ Shows UI to user
```

## Data Flow: Highlight → Explanation

```
┌──────────────────────────────────────────────────────────────────────┐
│ HIGHLIGHT SELECTION                                                 │
│ - User selects text in article                                      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ RIGHT-CLICK CONTEXT MENU                                            │
│ background.js registers: "Explain with CoReeder"                    │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ USER CLICKS "EXPLAIN WITH COREEDER"                                 │
│ background.js sends: { type: 'EXPLAIN_SELECTION', ... }             │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ highlightMapper.js IDENTIFIES PARAGRAPH                             │
│ INPUT:  window.getSelection()                                       │
│ OUTPUT: { text: "selected words", paragraphIndex: 5 }               │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ↓                                   ↓
  ┌───────────────────┐         ┌──────────────────────────┐
  │ highlightIndex=5  │         │ lastReadIndex from       │
  │                   │         │ scrollTracker.js         │
  │ (where we are)    │         │ (how far user scrolled)  │
  └───────────────────┘         └──────────────────────────┘
          │                           │
          │                           │
          └───────────────┬───────────┘
                          │
                          ↓
        ┌─────────────────────────────────────┐
        │ promptBuilder.js BUILDS CONTEXT     │
        │                                     │
        │ Context boundaries:                 │
        │  Prior:    [5 - 30] to [5 - 1]     │
        │  Current:  [5]                     │
        │  Forward:  [6] to MIN(8, lastRead+2)
        │                                     │
        │ ❌ NEVER include paragraphs AFTER   │
        │    lastReadIndex!                  │
        │                                     │
        │ OUTPUT: Structured prompt with:    │
        │  - Instructions for AI             │
        │  - Prior context paragraphs        │
        │  - Highlighted paragraph           │
        │  - Highlighted text                │
        │  - Forward context (if any)        │
        └─────────────────┬───────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────┐
        │ aiService.js SENDS TO AZURE OPENAI  │
        │                                     │
        │ Request:                            │
        │  POST /chat/completions             │
        │  {                                  │
        │    messages: [                      │
        │      {                              │
        │        role: "user",                │
        │        content: prompt              │
        │      }                              │
        │    ],                               │
        │    temperature: 0.4,                │
        │    max_tokens: 512                  │
        │  }                                  │
        │                                     │
        │ Headers:                            │
        │  - Content-Type: application/json   │
        │  - api-key: [AZURE_API_KEY]         │
        │                                     │
        └─────────────────┬───────────────────┘
                          │
                          ↓ [Network Request]
                          │
        ┌─────────────────────────────────────┐
        │        AZURE OPENAI (Remote)        │
        │                                     │
        │  gpt-4o-mini Model                  │
        │  - Reads prompt & context           │
        │  - Understands highlighted text     │
        │  - Generates explanation            │
        │  - Respects token limit (512)       │
        │                                     │
        │  OUTPUT:                            │
        │  "This passage means..."            │
        │                                     │
        └─────────────────┬───────────────────┘
                          │
                          ↓ [Network Response]
                          │
        ┌─────────────────────────────────────┐
        │ aiService.js PARSES RESPONSE        │
        │                                     │
        │ data.choices[0].message.content     │
        │                                     │
        │ OUTPUT:                             │
        │  "This passage means..."            │
        │                                     │
        └─────────────────┬───────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────┐
        │ tooltip.js DISPLAYS EXPLANATION     │
        │                                     │
        │ ┌─ CoReeder ─────────────────────┐ │
        │ │ "selected text"                 │ │
        │ │                                 │ │
        │ │ "This passage means: ...        │ │
        │ │  [explanation continues]        │ │
        │ │ "                               │ │
        │ │                                 │ │
        │ │  [✕ Close Button]               │ │
        │ └─────────────────────────────────┘ │
        │                                     │
        │ Options:                            │
        │  - Click close button               │
        │  - Click outside tooltip            │
        │  - Press ESC key                    │
        │                                     │
        └─────────────────────────────────────┘
```

## State Initialization Flow

```
┌─ PAGE LOADS ─┐
       │
       ↓
┌────────────────────────────────────────┐
│ content.js: initialize()               │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ contentExtractor.extractContent()      │
│                                        │
│ Returns:                               │
│  {                                     │
│    paragraphs: [                       │
│      "First paragraph...",             │
│      "Second paragraph...",            │
│      ...                               │
│    ],                                  │
│    paragraphElements: [...]            │
│  }                                     │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ STATE IN content.js:                   │
│                                        │
│ {                                      │
│   paragraphs: string[],                │
│   paragraphElements: Element[],        │
│   initialized: true                    │
│ }                                      │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ scrollTracker.initScrollTracker()      │
│                                        │
│ Sets up IntersectionObserver:          │
│  - Observes all paragraphElements      │
│  - Threshold: 50% visible              │
│  - Updates lastReadIndex when visible  │
│                                        │
│ STATE IN scrollTracker.js:             │
│ {                                      │
│   lastReadParagraphIndex: -1,          │
│   observer: IntersectionObserver       │
│ }                                      │
└────────────────┬───────────────────────┘
                 │
                 ↓
     ✅ READY FOR USER INTERACTION
```

## Scroll Tracking Example

```
ARTICLE CONTENT                          STATE

[Para 0: "Intro..."]  ──────────┐
                                ├─ Visible (user reading)
[Para 1: "Section.."]  ─────────┤
                                └─ lastReadIndex = 1
[Para 2: "Details..."]  ──── not visible yet


USER SCROLLS DOWN ↓

[Para 1: "Section.."]  ──────────┐
                                ├─ Visible (user reading)
[Para 2: "Details..."]  ─────────┤
                                └─ lastReadIndex = 2
[Para 3: "More info..."] ──── not visible yet


USER SCROLLS DOWN ↓

[Para 2: "Details..."]  ──────────┐
                                ├─ Visible (user reading)
[Para 3: "More info..."]  ────────┤
                                └─ lastReadIndex = 3
[Para 4: "Analysis..."] ────── not visible yet


USER HIGHLIGHTS TEXT IN PARA 2, CLICKS EXPLAIN

promptBuilder.js:
  - highlightIndex = 2
  - lastReadIndex = 3
  - Prior context: paragraphs 0-1 (2 - 30 capped to 0)
  - Current: paragraph 2
  - Forward: paragraph 3 (but NOT 4, because lastReadIndex = 3)

Result: Context includes only ALREADY READ content! ✅
```

## Key Design Principles

```
┌─────────────────────────────────────────────────────────────┐
│                   COREEDER PRINCIPLES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. NEVER USE FUTURE CONTENT                                │
│    ❌ Don't include paragraphs beyond lastReadIndex         │
│    ✅ Only explain using context user has already read     │
│                                                             │
│ 2. TRACK READING NATURALLY                                 │
│    ✅ Use IntersectionObserver (native, efficient)        │
│    ❌ Don't try to detect eye movement                     │
│                                                             │
│ 3. MODULAR & MAINTAINABLE                                  │
│    ✅ Each file has one responsibility                     │
│    ❌ Don't mix concerns                                   │
│                                                             │
│ 4. ERROR HANDLING                                          │
│    ✅ Show clear error messages to user                    │
│    ❌ Don't silently fail                                  │
│                                                             │
│ 5. USER PRIVACY                                            │
│    ✅ Everything happens locally                           │
│    ✅ No tracking across sites                             │
│    ❌ Don't store reading history                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Token & Performance Budget

```
REQUEST BUDGET: 2048 tokens total (Azure OpenAI gpt-4o-mini)

┌─ INPUT TOKENS (approx) ────────────────────────────┐
│                                                    │
│ System prompt instructions          ~200 tokens   │
│ Prior context paragraphs (30 max)   ~1000 tokens  │
│ Current paragraph                   ~100 tokens   │
│ Forward context (2 max)             ~100 tokens   │
│                                                    │
│ TOTAL INPUT: ~1400 tokens                         │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ OUTPUT TOKENS (max) ──────────────────────────────┐
│                                                    │
│ Maximum output                      ~512 tokens   │
│                                                    │
│ TOTAL OUTPUT: ~512 tokens                         │
│                                                    │
└────────────────────────────────────────────────────┘

SAFETY MARGIN: ~136 tokens for overhead
```

---

**All diagrams show the complete flow and architecture of CoReeder!**
