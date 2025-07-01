import EventEmitter from "events";

import { MAC } from "@/utils/mac";

import {
  FIXED_HEADER_SIZE,
  PROTOCOL_VERSION,
  SIZE,
  SYNC_BYTE,
} from "./constants";
import { PACKET_BYTE, RX_PACKET } from "./packets";
import { crc8, toInt8 } from "./utils";

const MODULE_TAG = "[DECODER]";

export interface GatewayInitPacket {
  type: typeof RX_PACKET.GATEWAY_INIT;
  mac: string;
}

export interface EspNowRxPacket {
  type: typeof RX_PACKET.ESPNOW_RX;
  mac: string;
  rssi: number;
  payload: Record<string, unknown>;
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

type PacketDecoderEvents = {
  packet: [DecodedPacket];
};

export class PacketDecoder extends EventEmitter<PacketDecoderEvents> {
  private buffer = Buffer.alloc(0);

  feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const MAX_ITERATIONS = 100;
    let iterations = 0;

    while (iterations++ < MAX_ITERATIONS) {
      const start = this.buffer.indexOf(SYNC_BYTE);
      if (start === -1) {
        this.buffer = Buffer.alloc(0);
        return;
      }
      if (start > 0) this.buffer = this.buffer.subarray(start);
      if (this.buffer.length < FIXED_HEADER_SIZE + SIZE.CRC) return;

      if (this.buffer[1] !== PROTOCOL_VERSION) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const typeByte = this.buffer[2]!;
      if (!(Object.values(PACKET_BYTE) as number[]).includes(typeByte)) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const frameLen = this.expectedLength(typeByte);
      if (frameLen === null || this.buffer.length < frameLen) return;

      const frame = this.buffer.subarray(0, frameLen);
      const crcValid =
        frame[frameLen - 1] === crc8(frame.subarray(1, frameLen - 1));
      if (!crcValid) {
        console.warn("[DECODER] CRC mismatch, skipping byte");
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const body = frame.subarray(FIXED_HEADER_SIZE, frameLen - 1);
      this.emit("packet", this.parse(typeByte, body));
      this.buffer = this.buffer.subarray(frameLen);
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(
        MODULE_TAG,
        "Exiting feed loop early due to too many iterations",
      );
    }
  }

  private expectedLength(typeByte: number): number | null {
    switch (typeByte) {
      case PACKET_BYTE[RX_PACKET.GATEWAY_INIT]:
        return FIXED_HEADER_SIZE + SIZE.MAC + SIZE.CRC;
      case PACKET_BYTE[RX_PACKET.ESPNOW_RX]: {
        if (
          this.buffer.length <
          FIXED_HEADER_SIZE + SIZE.MAC + SIZE.RSSI + SIZE.LEN
        )
          return null;
        const PAYLOAD_SIZE =
          this.buffer[FIXED_HEADER_SIZE + SIZE.MAC + SIZE.RSSI]!;
        return (
          FIXED_HEADER_SIZE +
          SIZE.MAC +
          SIZE.RSSI +
          SIZE.LEN +
          PAYLOAD_SIZE +
          SIZE.CRC
        );
      }
      case PACKET_BYTE[RX_PACKET.ESPNOW_TX_STATUS]:
        const STATUS_SIZE = 1;
        return FIXED_HEADER_SIZE + SIZE.MAC + STATUS_SIZE + SIZE.CRC;
      default:
        return null;
    }
  }

  private parse(typeByte: number, body: Buffer): DecodedPacket {
    switch (typeByte) {
      case PACKET_BYTE[RX_PACKET.GATEWAY_INIT]:
        return {
          type: RX_PACKET.GATEWAY_INIT,
          mac: MAC.fromBuf(body.subarray(0, SIZE.MAC)),
        };
      case PACKET_BYTE[RX_PACKET.ESPNOW_RX]: {
        const mac = MAC.fromBuf(body.subarray(0, SIZE.MAC));
        const rssi = toInt8(body[SIZE.MAC]!);
        const payloadLen = body[SIZE.MAC + SIZE.RSSI]!;
        const payloadBuf = body.subarray(
          SIZE.MAC + SIZE.RSSI + SIZE.LEN,
          SIZE.MAC + SIZE.RSSI + SIZE.LEN + payloadLen,
        );
        return {
          type: RX_PACKET.ESPNOW_RX,
          mac,
          rssi,
          payload: JSON.parse(payloadBuf.toString()),
        };
      }
      case PACKET_BYTE[RX_PACKET.ESPNOW_TX_STATUS]:
        return {
          type: RX_PACKET.ESPNOW_TX_STATUS,
          mac: MAC.fromBuf(body.subarray(0, SIZE.MAC)),
          status: body[SIZE.MAC]!,
        };
      default:
        throw new Error(`Unhandled packet type ${typeByte}`);
    }
  }
}
