import { LIMITS, type ExplainRequest } from '@coreeder/shared';
import { normalizeWhitespace } from './extractor';

/**
 * Finds which extracted paragraph a selection belongs to. Walks up from the
 * start of the selection; falls back to matching the selected text.
 */
export function findParagraphIndex(
    selection: { startNode: Node | null; text: string },
    paragraphs: string[],
    indexOf: WeakMap<Element, number>,
): number {
    let el: Element | null = selection.startNode instanceof Element
        ? selection.startNode
        : selection.startNode?.parentElement ?? null;
    while (el) {
        const index = indexOf.get(el);
        if (index !== undefined) return index;
        el = el.parentElement;
    }

    const needle = normalizeWhitespace(selection.text).slice(0, 80);
    if (!needle) return -1;
    return paragraphs.findIndex((paragraph) => paragraph.includes(needle));
}

/**
 * Builds the explain request from what the reader has seen: up to 30
 * paragraphs before the highlight, and at most one paragraph past the
 * furthest point they've reached.
 */
export function buildExplainRequest(input: {
    url: string;
    paragraphs: string[];
    highlightIndex: number;
    highlight: string;
    lastReadIndex: number;
}): ExplainRequest {
    const { paragraphs, highlightIndex, lastReadIndex } = input;
    const clip = (text: string) => text.slice(0, LIMITS.maxParagraphChars);

    const before = paragraphs
        .slice(Math.max(0, highlightIndex - LIMITS.maxContextParagraphs), highlightIndex)
        .map(clip);

    let afterEnd = Math.min(paragraphs.length, highlightIndex + 1 + LIMITS.maxForwardParagraphs);
    if (lastReadIndex >= 0) afterEnd = Math.min(afterEnd, lastReadIndex + 2);
    const after = paragraphs.slice(highlightIndex + 1, Math.max(highlightIndex + 1, afterEnd)).map(clip);

    return {
        url: input.url,
        highlight: input.highlight.trim().slice(0, LIMITS.maxHighlightChars),
        highlightParagraph: clip(paragraphs[highlightIndex] ?? input.highlight),
        before,
        after,
    };
}
