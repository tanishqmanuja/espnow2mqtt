import { MAC } from "@/utils/mac";

import { PROTOCOL_VERSION, SYNC_BYTE } from "./constants";
import { PACKET_BYTE, TX_PACKET } from "./packets";
import { crc8 } from "./utils";

type PacketTypeDataMap = {
  [TX_PACKET.ESPNOW_TX]: {
    mac: string;
    payload: Buffer;
  };
  RAW: {
    type: number;
    payload: Buffer;
  };
};

export type HandledPacketType = keyof PacketTypeDataMap;
export type PacketData<T extends HandledPacketType> = PacketTypeDataMap[T];

export class PacketEncoder {
  private static wrap(type: number, body: Buffer): Buffer {
    const header = Buffer.from([SYNC_BYTE, PROTOCOL_VERSION, type]);
    const withoutSync = Buffer.concat([header.subarray(1), body]);
    const crc = Buffer.from([crc8(withoutSync)]);
    return Buffer.concat([header, body, crc]);
  }

  static encode<T extends HandledPacketType>(
    type: T,
    data: PacketData<T>,
  ): Buffer {
    if (type === TX_PACKET.ESPNOW_TX) {
      const { mac, payload } =
        data as PacketTypeDataMap[typeof TX_PACKET.ESPNOW_TX];
      return this.wrap(
        PACKET_BYTE[TX_PACKET.ESPNOW_TX],
        Buffer.concat([
          MAC.toBuffer(mac),
          Buffer.from([payload.length]),
          payload,
        ]),
      );
    }

    if (type === "RAW") {
      const { type, payload } = data as PacketTypeDataMap["RAW"];
      return this.wrap(type, payload);
    }

    throw new Error(`Unsupported packet type ${String(type)}`);
  }
}
