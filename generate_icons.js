// Generates simple PNG icons for CoReeder Chrome Extension
// Uses the 'canvas' npm package if available, otherwise creates minimal valid PNGs

const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Minimal PNG generator (no dependencies required)
// Creates a simple colored square icon with a gradient effect

function createPNG(width, height) {
    // PNG file structure
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function crc32(buf) {
        let c;
        const crcTable = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crcTable[n] = c;
        }
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    function makeChunk(type, data) {
        const typeBytes = Buffer.from(type);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);
        const crcData = Buffer.concat([typeBytes, data]);
        const crcVal = Buffer.alloc(4);
        crcVal.writeUInt32BE(crc32(crcData), 0);
        return Buffer.concat([length, typeBytes, data, crcVal]);
    }

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: RGB
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // Raw pixel data with filter bytes
    const rawData = Buffer.alloc(height * (width * 3 + 1));
    for (let y = 0; y < height; y++) {
        const rowOffset = y * (width * 3 + 1);
        rawData[rowOffset] = 0; // no filter

        for (let x = 0; x < width; x++) {
            const px = rowOffset + 1 + x * 3;
            const cx = x / width;
            const cy = y / height;

            // Dark background with gradient
            const dist = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2);

            // Background: dark navy (#1a1a2e to #0f0f1a)
            let r = Math.round(26 - dist * 20);
            let g = Math.round(26 - dist * 20);
            let b = Math.round(46 - dist * 20);

            // Book shape in center (simple rectangle representing open pages)
            const bookCx = 0.5, bookCy = 0.48;
            const bookW = 0.32, bookH = 0.38;
            const inBook = Math.abs(cx - bookCx) < bookW / 2 && Math.abs(cy - bookCy) < bookH / 2;

            if (inBook) {
                // White pages
                r = 240; g = 240; b = 245;

                // Left page darker shade
                if (cx < bookCx) {
                    r = 220; g = 220; b = 230;
                }

                // Spine line
                if (Math.abs(cx - bookCx) < 0.02) {
                    r = 180; g = 180; b = 195;
                }
            }

            // Purple-blue accent line (highlight bar)
            const lineY = 0.55;
            const lineThick = 0.04;
            if (Math.abs(cy - lineY) < lineThick / 2 && cx > 0.25 && cx < 0.75) {
                const t = (cx - 0.25) / 0.5;
                r = Math.round(124 + t * (68 - 124)); // #7c4dff -> #448aff
                g = Math.round(77 + t * (138 - 77));
                b = 255;
            }

            // Rounded corners mask
            const cornerR = 0.15;
            function isOutsideCorner(px, py, cornerX, cornerY) {
                const dx = Math.abs(px - cornerX);
                const dy = Math.abs(py - cornerY);
                if (dx > cornerR || dy > cornerR) return false;
                const cdist = Math.sqrt((dx) ** 2 + (dy) ** 2);
                return cdist < cornerR ? false : (dx > cornerR * 0.7 || dy > cornerR * 0.7);
            }

            // Make corners transparent (dark)
            const corners = [
                [cornerR, cornerR], [1 - cornerR, cornerR],
                [cornerR, 1 - cornerR], [1 - cornerR, 1 - cornerR]
            ];

            for (const [ccx, ccy] of corners) {
                if (isOutsideCorner(cx, cy, ccx, ccy)) {
                    const cdist = Math.sqrt((cx - ccx) ** 2 + (cy - ccy) ** 2);
                    if (cdist > cornerR) {
                        r = 0; g = 0; b = 0;
                    }
                }
            }

            rawData[px] = Math.max(0, Math.min(255, r));
            rawData[px + 1] = Math.max(0, Math.min(255, g));
            rawData[px + 2] = Math.max(0, Math.min(255, b));
        }
    }

    // Compress with zlib
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData);

    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons at all required sizes
const sizes = [16, 48, 128];
for (const size of sizes) {
    const png = createPNG(size, size);
    const filePath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log('Done! Icons generated.');
