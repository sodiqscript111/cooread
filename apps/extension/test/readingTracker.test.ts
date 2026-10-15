import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReadingTracker } from '../lib/readingTracker';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let observerCallback: Callback;
let observerOptions: IntersectionObserverInit | undefined;

beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
        constructor(callback: Callback, options?: IntersectionObserverInit) {
            observerCallback = callback;
            observerOptions = options;
        }
        observe() {}
        disconnect() {}
    });
});

afterEach(() => vi.unstubAllGlobals());

describe('createReadingTracker', () => {
    const elements = Array.from({ length: 5 }, () => document.createElement('p'));

    it('uses a reading line instead of a visibility ratio', () => {
        createReadingTracker(elements);
        expect(observerOptions).toMatchObject({ rootMargin: '0px 0px -55% 0px', threshold: 0 });
    });

    it('records the furthest paragraph reached and never goes back', () => {
        const tracker = createReadingTracker(elements);
        expect(tracker.lastReadIndex).toBe(-1);

        observerCallback([{ target: elements[3], isIntersecting: true }]);
        expect(tracker.lastReadIndex).toBe(3);

        observerCallback([{ target: elements[1], isIntersecting: true }]);
        expect(tracker.lastReadIndex).toBe(3);

        observerCallback([{ target: elements[4], isIntersecting: false }]);
        expect(tracker.lastReadIndex).toBe(3);
    });
});
