export function crc8(buf: Buffer): number {
  let crc = 0x00;
  for (const byte of buf) crc ^= byte;
  return crc;
}

export function toInt8(uint8: number): number {
  return uint8 > 127 ? uint8 - 256 : uint8;
}
