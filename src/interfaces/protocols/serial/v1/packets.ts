export const TX_PACKET = {
  ESPNOW_TX: "ESPNOW_TX",
} as const;
export type TxPacket = (typeof TX_PACKET)[keyof typeof TX_PACKET];

export const RX_PACKET = {
  GATEWAY_INIT: "GATEWAY_INIT",
  ESPNOW_RX: "ESPNOW_RX",
  ESPNOW_TX_STATUS: "ESPNOW_TX_STATUS",
} as const;
export type RxPacket = (typeof RX_PACKET)[keyof typeof RX_PACKET];

export const PACKET_BYTE = {
  [RX_PACKET.GATEWAY_INIT]: 0x01,
  [RX_PACKET.ESPNOW_RX]: 0x20,
  [TX_PACKET.ESPNOW_TX]: 0x21,
  [RX_PACKET.ESPNOW_TX_STATUS]: 0x22,
} as const satisfies Record<RxPacket | TxPacket, number>;
export type Packet = RxPacket | TxPacket;
