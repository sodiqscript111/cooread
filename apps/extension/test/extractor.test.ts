import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildExplainRequest, findParagraphIndex } from '../lib/context';
import { extractContent } from '../lib/extractor';

const fixture = readFileSync(path.join(import.meta.dirname, 'fixture-article.html'), 'utf8');

function load(html: string) {
    document.body.innerHTML = html;
}

describe('extractContent', () => {
    beforeEach(() => load(''));

    it('extracts article paragraphs and skips nav, sidebar and footer', () => {
        document.documentElement.innerHTML = fixture;
        const { paragraphs } = extractContent();

        expect(paragraphs[0]).toBe('The Future of Artificial Intelligence');
        expect(paragraphs.join(' ')).not.toContain('Navigation | Home');
        expect(paragraphs.some((p) => p.includes('Did you know'))).toBe(false);
        expect(paragraphs.some((p) => p.includes('All rights reserved'))).toBe(false);
    });

    it('does not duplicate paragraphs nested in list items or quotes', () => {
        load(`<article>
            <p>${'Intro paragraph with enough text to count. '.repeat(10)}</p>
            <ul><li><p>A list item that wraps a paragraph element.</p></li></ul>
            <blockquote><p>A quoted paragraph inside a blockquote.</p></blockquote>
        </article>`);
        const { paragraphs } = extractContent();

        expect(paragraphs).toHaveLength(3);
        expect(paragraphs.filter((p) => p.includes('list item'))).toHaveLength(1);
        expect(paragraphs.filter((p) => p.includes('quoted paragraph'))).toHaveLength(1);
    });

    it('falls back to the body when the <article> is just a teaser', () => {
        load(`<article><p>Short teaser card.</p></article>
              <div><p>${'Real content lives outside the article tag. '.repeat(15)}</p></div>`);
        const { paragraphs } = extractContent();
        expect(paragraphs.some((p) => p.startsWith('Real content'))).toBe(true);
    });

    it('collapses whitespace and leaves the page DOM untouched', () => {
        load('<main><p>   Spaced\n\n   out    text that is long enough.   </p></main>');
        const before = document.body.innerHTML;
        const { paragraphs } = extractContent();

        expect(paragraphs).toEqual(['Spaced out text that is long enough.']);
        expect(document.body.innerHTML).toBe(before);
    });

    it('ignores the CoReeder UI itself', () => {
        load('<p>A normal paragraph on the page.</p><coreeder-ui><p>Explain with CoReeder button</p></coreeder-ui>');
        expect(extractContent().paragraphs).toEqual(['A normal paragraph on the page.']);
    });
});

describe('findParagraphIndex', () => {
    it('maps a selection inside inline markup to its paragraph', () => {
        load('<article><p>First paragraph is here.</p><p>Second with <em id="target">emphasis</em> inside.</p></article>');
        const { paragraphs, indexOf } = extractContent();
        const startNode = document.getElementById('target')!.firstChild;

        expect(findParagraphIndex({ startNode, text: 'emphasis' }, paragraphs, indexOf)).toBe(1);
    });

    it('falls back to text matching', () => {
        load('<article><p>First paragraph is here.</p><p>Second paragraph is here.</p></article>');
        const { paragraphs, indexOf } = extractContent();

        expect(findParagraphIndex({ startNode: null, text: 'Second  paragraph' }, paragraphs, indexOf)).toBe(1);
        expect(findParagraphIndex({ startNode: null, text: 'not on the page' }, paragraphs, indexOf)).toBe(-1);
    });
});

describe('buildExplainRequest', () => {
    const paragraphs = Array.from({ length: 50 }, (_, i) => `Paragraph ${i}`);

    it('sends up to 30 earlier paragraphs', () => {
        const req = buildExplainRequest({ url: 'https://a.com', paragraphs, highlightIndex: 40, highlight: 'x', lastReadIndex: 45 });
        expect(req.before).toHaveLength(30);
        expect(req.before[0]).toBe('Paragraph 10');
        expect(req.highlightParagraph).toBe('Paragraph 40');
    });

    it('never looks more than one paragraph past what was read', () => {
        const req = buildExplainRequest({ url: 'https://a.com', paragraphs, highlightIndex: 5, highlight: 'x', lastReadIndex: 5 });
        expect(req.after).toEqual(['Paragraph 6']);
    });

    it('sends no forward context when the highlight is past the reading position', () => {
        const req = buildExplainRequest({ url: 'https://a.com', paragraphs, highlightIndex: 20, highlight: 'x', lastReadIndex: 3 });
        expect(req.after).toEqual([]);
    });

    it('clips very long paragraphs', () => {
        const long = ['a'.repeat(10_000)];
        const req = buildExplainRequest({ url: 'https://a.com', paragraphs: long, highlightIndex: 0, highlight: 'a', lastReadIndex: 0 });
        expect(req.highlightParagraph).toHaveLength(2_000);
    });
});
