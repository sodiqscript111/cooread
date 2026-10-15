import { describe, expect, it } from 'vitest';
import { continueReadingUrl, normalizeUrl, progressPercent } from '../src/url';

describe('normalizeUrl', () => {
    it('strips tracking params, fragments and trailing slashes', () => {
        expect(normalizeUrl('https://Example.com/post/?utm_source=x&id=3&fbclid=abc#section'))
            .toBe('https://example.com/post?id=3');
    });

    it('keeps the root path', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('drops default ports and credentials', () => {
        expect(normalizeUrl('https://user:pw@example.com:443/a')).toBe('https://example.com/a');
    });

    it('rejects non-http URLs', () => {
        expect(normalizeUrl('chrome://extensions')).toBeNull();
        expect(normalizeUrl('not a url')).toBeNull();
    });
});

describe('continueReadingUrl', () => {
    it('builds a text fragment from the first words', () => {
        expect(continueReadingUrl('https://a.com/p#old', 'The quick brown fox jumps over the lazy dog'))
            .toBe('https://a.com/p#:~:text=The%20quick%20brown%20fox%20jumps%20over');
    });

    it('escapes dashes and commas', () => {
        expect(continueReadingUrl('https://a.com', 'well-known, sure')).toBe('https://a.com#:~:text=well%2Dknown%2C%20sure');
    });

    it('returns the plain URL without anchor text', () => {
        expect(continueReadingUrl('https://a.com', null)).toBe('https://a.com');
    });
});

describe('progressPercent', () => {
    it('handles edge cases', () => {
        expect(progressPercent(-1, 10)).toBe(0);
        expect(progressPercent(4, 10)).toBe(50);
        expect(progressPercent(20, 10)).toBe(100);
        expect(progressPercent(0, 0)).toBe(0);
    });
});
