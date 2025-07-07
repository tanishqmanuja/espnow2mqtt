import { z } from "zod/v4";

import type { DecodedPacket } from "@/interfaces/protocols/serial";

import type { EspNowDevice } from "../../devices/espnow";
import { EntityBase } from "../base";
import { ENK } from "../keyvals";
import { PLATFORM } from "../platforms";

const BinarySensorPayloadSchema = z.object({
  [ENK.platform]: z.literal(PLATFORM.BINARY_SENSOR),
  [ENK.id]: z.string(),
  [ENK.state]: z.union([z.literal("ON"), z.literal("OFF")]),
  [ENK.device_id]: z.string(),
});

export type BinarySensorPayload = z.infer<typeof BinarySensorPayloadSchema>;
export type BinarySensorState = "ON" | "OFF";

export class BinarySensorEntity extends EntityBase<BinarySensorState> {
  readonly platform = PLATFORM.BINARY_SENSOR;

  constructor(id: string, device: EspNowDevice) {
    super(id, device);
    this.logger.info("Created", this.platform, id, device.id);
  }

  processPacket(packet: DecodedPacket): void {
    if (packet.type !== "ESPNOW_RX") return;

    const parsed = BinarySensorPayloadSchema.safeParse(packet.payload);
    if (!parsed.success) return;

    const data: BinarySensorPayload = parsed.data;
    if (data.id !== this.id) return;

    void this.updateState(data[ENK.state]);
  }
}
