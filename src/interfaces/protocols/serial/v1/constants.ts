// PROTOCOL
export const SYNC = 0xaa;
export const VERSION = 0x01;

// HEADER
export const SYNC_SIZE = 1;
export const VERSION_SIZE = 1;
export const TYPE_SIZE = 1;
export const HEADER_SIZE = SYNC_SIZE + VERSION_SIZE + TYPE_SIZE;

// OTHERS
export const MAC_SIZE = 6;
export const RSSI_SIZE = 1;
export const LEN_SIZE = 1;
export const CRC_SIZE = 1;
