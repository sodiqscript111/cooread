# CoReeder Implementation Summary

## Current state

CoReeder is a Chrome extension prototype that:
- Extracts article-like content from a page
- Tracks how far the reader has scrolled
- Maps a text highlight back to its paragraph
- Builds a context-aware explanation prompt
- Shows the result in a floating tooltip

## Important implementation notes

- The Azure request now runs from `background.js`, not from the content script.
- Azure settings are intentionally blank in the repo:
  - `AZURE_API_KEY`
  - `AZURE_RESOURCE_NAME`
  - `AZURE_DEPLOYMENT_NAME`
- The repo is safe to hand off because no live API key is committed.

## Main files

- `background.js`: context menu registration and Azure request handling
- `src/content.js`: page orchestration and explain flow
- `src/contentExtractor.js`: readable-content extraction
- `src/scrollTracker.js`: reading progress tracking
- `src/highlightMapper.js`: selection-to-paragraph mapping
- `src/promptBuilder.js`: prompt assembly
- `src/aiService.js`: bridge from content script to service worker
- `src/tooltip.js`: tooltip UI behavior
- `src/tooltip.css`: tooltip styling

## Known limits

- The extension will not generate explanations until local Azure settings are filled in.
- For production, Azure access should move behind a backend instead of staying in the extension.
- Some highly dynamic sites may still extract content imperfectly.

## Handoff checklist

- Add local Azure values in `background.js` for development only
- Consider moving secrets to a backend before any real beta
- Test on a few article sites after the next person wires credentials back in
