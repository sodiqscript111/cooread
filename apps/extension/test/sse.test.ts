import { describe, expect, it } from 'vitest';
import { createSseParser } from '../lib/sse';

describe('createSseParser', () => {
    it('handles events split across chunks', () => {
        const events: string[] = [];
        const feed = createSseParser((data) => events.push(data));

        feed('data: {"type":"delta","te');
        feed('xt":"Hel"}\n\ndata: {"type":"delta","text":"lo"}\n');
        expect(events).toEqual(['{"type":"delta","text":"Hel"}']);

        feed('\ndata: {"type":"done"}\n\n');
        expect(events).toHaveLength(3);
    });

    it('accepts CRLF line endings and ignores comments', () => {
        const events: string[] = [];
        const feed = createSseParser((data) => events.push(data));
        feed(': keep-alive\r\n\r\ndata: hello\r\n\r\n');
        expect(events).toEqual(['hello']);
    });
});
