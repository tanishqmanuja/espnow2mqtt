export const crc8 = (buf: Buffer): number => {
  let crc = 0;
  for (const byte of buf) crc ^= byte;
  return crc;
};

export const toInt8 = (byte: number): number =>
  byte > 127 ? byte - 256 : byte;
