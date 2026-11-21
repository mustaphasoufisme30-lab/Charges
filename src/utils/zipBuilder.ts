/**
 * Minimal, standards-compliant zero-dependency ZIP archive generator (Store method, CRC32).
 * Produces valid .zip Uint8Arrays readable by macOS, Windows, Linux, and Android Studio.
 */

export interface ZipInputFile {
  path: string;
  content: string;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

function writeUint32LE(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

export function buildZipArchive(files: ZipInputFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const cleanPath = file.path.replace(/^\/+/, '');
    const nameBytes = encoder.encode(cleanPath);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lView = new DataView(localHeader.buffer);
    writeUint32LE(lView, 0, 0x04034b50); // Local file header signature
    writeUint16LE(lView, 4, 20); // Version needed to extract (2.0)
    writeUint16LE(lView, 6, 0x0800); // General purpose bit flag (UTF-8)
    writeUint16LE(lView, 8, 0); // Compression method: 0 = Store
    writeUint16LE(lView, 10, 0); // Mod time
    writeUint16LE(lView, 12, 0x5821); // Mod date
    writeUint32LE(lView, 14, checksum);
    writeUint32LE(lView, 18, dataBytes.length); // Compressed size
    writeUint32LE(lView, 22, dataBytes.length); // Uncompressed size
    writeUint16LE(lView, 26, nameBytes.length);
    writeUint16LE(lView, 28, 0); // Extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(centralHeader.buffer);
    writeUint32LE(cView, 0, 0x02014b50); // Central directory signature
    writeUint16LE(cView, 4, 20); // Version made by
    writeUint16LE(cView, 6, 20); // Version needed
    writeUint16LE(cView, 8, 0x0800); // UTF-8 flag
    writeUint16LE(cView, 10, 0); // Store
    writeUint16LE(cView, 12, 0);
    writeUint16LE(cView, 14, 0x5821);
    writeUint32LE(cView, 16, checksum);
    writeUint32LE(cView, 20, dataBytes.length);
    writeUint32LE(cView, 24, dataBytes.length);
    writeUint16LE(cView, 28, nameBytes.length);
    writeUint16LE(cView, 30, 0); // Extra length
    writeUint16LE(cView, 32, 0); // Comment length
    writeUint16LE(cView, 34, 0); // Disk number start
    writeUint16LE(cView, 36, 0); // Internal file attributes
    writeUint32LE(cView, 38, 0); // External file attributes
    writeUint32LE(cView, 42, localOffset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  // End of Central Directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  writeUint32LE(eView, 0, 0x06054b50); // EOCD signature
  writeUint16LE(eView, 4, 0); // Disk number
  writeUint16LE(eView, 6, 0); // Central dir start disk
  writeUint16LE(eView, 8, files.length); // Entries on this disk
  writeUint16LE(eView, 10, files.length); // Total entries
  writeUint32LE(eView, 12, centralSize);
  writeUint32LE(eView, 16, localOffset);
  writeUint16LE(eView, 20, 0); // Comment length

  const totalSize = localOffset + centralSize + eocd.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);

  return output;
}
