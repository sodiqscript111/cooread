/**
 * Incremental parser for a text/event-stream body. Feed it decoded chunks as
 * they arrive; it calls `onData` with each complete event's `data` payload.
 */
export function createSseParser(onData: (data: string) => void): (chunk: string) => void {
    let buffer = '';
    return (chunk) => {
        buffer += chunk.replace(/\r\n?/g, '\n');
        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = block
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).replace(/^ /, ''))
                .join('\n');
            if (data) onData(data);
        }
    };
}
