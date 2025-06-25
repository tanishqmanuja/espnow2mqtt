import { MAC } from "@/utils/mac";

import { SYNC, VERSION } from "./constants";
import { PACKET_BYTE, TX_PACKET } from "./packets";
import { crc8 } from "./utils";

type PacketTypeDataMap = {
  ESPNOW_TX: {
    mac: string;
    payload: Buffer;
  };
};

export type HandledPacketType = keyof PacketTypeDataMap;
export type PacketData<T extends HandledPacketType | {}> =
  T extends HandledPacketType ? PacketTypeDataMap[T] : Buffer;

export class PacketEncoder {
  static raw(type: number, data: Buffer): Buffer {
    const header = Buffer.from([SYNC, VERSION, type]);
    const payload = Buffer.concat([header, data]);
    const crc = Buffer.from([crc8(payload.subarray(1))]);
    return Buffer.concat([payload, crc]);
  }

  static encode<T extends HandledPacketType>(
    type: T | number,
    data: PacketData<T>,
  ): Buffer {
    if (type === TX_PACKET.ESPNOW_TX) {
      return this.raw(
        PACKET_BYTE["ESPNOW_TX"],
        Buffer.concat([
          MAC.toBuffer(data.mac),
          Buffer.from([data.payload.length]),
          data.payload,
        ]),
      );
    }

    if (typeof type === "number") {
      return this.raw(type, data as Buffer);
    }

    throw new Error(`Invalid packet type: ${type}`);
  }
}
