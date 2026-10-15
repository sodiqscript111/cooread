// Tracks the furthest paragraph the reader has reached.
//
// A paragraph counts as reached once any part of it enters the top 45% of the
// viewport (the "reading line"). Unlike "50% of the element is visible", this
// also works for blocks taller than the screen, like long code samples.

const READING_LINE_MARGIN = '0px 0px -55% 0px';
const BOTTOM_SLACK_PX = 48;

export interface ReadingTracker {
    readonly lastReadIndex: number;
    disconnect(): void;
}

export function createReadingTracker(elements: Element[], win: Window = window): ReadingTracker {
    let lastReadIndex = -1;
    const indexOf = new Map(elements.map((el, i) => [el, i]));

    const reach = (index: number) => {
        if (index > lastReadIndex) lastReadIndex = index;
    };

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) reach(indexOf.get(entry.target) ?? -1);
        }
    }, { rootMargin: READING_LINE_MARGIN, threshold: 0 });
    elements.forEach((el) => observer.observe(el));

    // Paragraphs in the bottom part of the last screen never cross the reading
    // line because the page can't scroll further. Count them once the reader
    // hits the bottom.
    let frame = 0;
    const onScroll = () => {
        if (frame) return;
        frame = win.requestAnimationFrame(() => {
            frame = 0;
            const doc = win.document.documentElement;
            if (win.scrollY + win.innerHeight < doc.scrollHeight - BOTTOM_SLACK_PX) return;
            for (let i = elements.length - 1; i > lastReadIndex; i--) {
                if (elements[i]!.getBoundingClientRect().top < win.innerHeight) {
                    reach(i);
                    break;
                }
            }
        });
    };
    win.addEventListener('scroll', onScroll, { passive: true });

    return {
        get lastReadIndex() {
            return lastReadIndex;
        },
        disconnect() {
            observer.disconnect();
            win.removeEventListener('scroll', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        },
    };
}
