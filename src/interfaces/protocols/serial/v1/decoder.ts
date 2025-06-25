import EventEmitter from "events";

import { MAC } from "@/utils/mac";

import {
  CRC_SIZE,
  HEADER_SIZE,
  LEN_SIZE,
  MAC_SIZE,
  RSSI_SIZE,
  SYNC,
  VERSION,
} from "./constants";
import { PACKET_BYTE, RX_PACKET } from "./packets";
import { crc8, toInt8 } from "./utils";

export interface GatewayInitPacket {
  type: typeof RX_PACKET.GATEWAY_INIT;
  mac: string;
}

export interface EspNowRxPacket {
  type: typeof RX_PACKET.ESPNOW_RX;
  mac: string;
  rssi: number;
  payload: object;
}

export interface EspNowTxStatusPacket {
  type: typeof RX_PACKET.ESPNOW_TX_STATUS;
  mac: string;
  status: number;
}

export type DecodedPacket =
  | GatewayInitPacket
  | EspNowRxPacket
  | EspNowTxStatusPacket;

export interface PacketDecoderEventMap {
  packet: [packet: DecodedPacket];
}

export class PacketDecoder extends EventEmitter<PacketDecoderEventMap> {
  private buffer = Buffer.alloc(0);

  feed(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length >= 4) {
      const syncIndex = this.buffer.indexOf(SYNC);
      if (syncIndex === -1) {
        this.buffer = Buffer.alloc(0);
        return;
      }
      if (syncIndex > 0) this.buffer = this.buffer.subarray(syncIndex);
      if (this.buffer.length < 4) return;

      const version = this.buffer[1];
      if (version !== VERSION) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const type = this.buffer[2];
      let minLength = 0;

      switch (type) {
        case PACKET_BYTE["GATEWAY_INIT"]:
          minLength = HEADER_SIZE + MAC_SIZE + CRC_SIZE;
          break;
        case PACKET_BYTE["ESPNOW_RX"]:
          const LEN_OFFSET = HEADER_SIZE + MAC_SIZE + RSSI_SIZE + LEN_SIZE;
          if (this.buffer.length < LEN_OFFSET) return;
          const PAYLOAD_SIZE = this.buffer[LEN_OFFSET - 1]!;
          minLength = LEN_OFFSET + PAYLOAD_SIZE + CRC_SIZE;
          break;
        case PACKET_BYTE["ESPNOW_TX_STATUS"]:
          const STATUS_SIZE = 1;
          minLength = HEADER_SIZE + MAC_SIZE + STATUS_SIZE + CRC_SIZE;
          break;
        default:
          this.buffer = this.buffer.subarray(1);
          continue;
      }

      if (this.buffer.length < minLength) return;

      const packet = this.buffer.subarray(0, minLength);
      const expectedCrc = packet[minLength - 1];
      const actualCrc = crc8(packet.subarray(1, minLength - 1));

      if (expectedCrc !== actualCrc) {
        console.warn("[PACKET] CRC mismatch");
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const tdata = packet.subarray(3, minLength - 1);
      this.emit("packet", this.handlePacket(type, tdata));
      this.buffer = this.buffer.subarray(minLength);
    }
  }

  private handlePacket(type: number, tdata: Buffer): DecodedPacket {
    switch (type) {
      case PACKET_BYTE["GATEWAY_INIT"]: {
        const mac = MAC.fromBuf(tdata.subarray(0, 6));
        return { type: RX_PACKET.GATEWAY_INIT, mac };
      }
      case PACKET_BYTE["ESPNOW_RX"]: {
        const mac = MAC.fromBuf(tdata.subarray(0, 6));
        const rssi = toInt8(tdata[6]!);
        const len = tdata[7]!;
        const payload = tdata.subarray(8, 8 + len);
        return {
          type: RX_PACKET.ESPNOW_RX,
          mac,
          rssi,
          payload: JSON.parse(payload.toString()),
        };
      }
      case PACKET_BYTE["ESPNOW_TX_STATUS"]: {
        const mac = MAC.fromBuf(tdata.subarray(0, 6));
        const status = tdata[6]!;
        return { type: RX_PACKET.ESPNOW_TX_STATUS, mac, status };
      }
      default:
        throw new Error(`Unhandled packet type: ${type}`);
    }
  }
}
