export const SYNC_BYTE = 0xaa as const;
export const PROTOCOL_VERSION = 0x01 as const;

export const SIZE = {
  SYNC: 1,
  VERSION: 1,
  TYPE: 1,
  MAC: 6,
  RSSI: 1,
  LEN: 1,
  CRC: 1,
} as const;

export const FIXED_HEADER_SIZE = SIZE.SYNC + SIZE.VERSION + SIZE.TYPE;
