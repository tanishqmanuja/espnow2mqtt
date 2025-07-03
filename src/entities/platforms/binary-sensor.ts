import { z } from "zod/v4";

import type { DecodedPacket } from "@/interfaces/protocols/serial";

import { EntityBase } from "../base";
import type { Device } from "../device";
import { PLATFORM } from "../platforms";

const BinarySensorPayloadSchema = z.object({
  p: z.literal(PLATFORM.BINARY_SENSOR),
  id: z.string(),
  stat: z.union([z.literal("ON"), z.literal("OFF")]),
  dev_id: z.string(),
});

export type BinarySensorPayload = z.infer<typeof BinarySensorPayloadSchema>;
export type BinarySensorState = "ON" | "OFF";

export class BinarySensorEntity extends EntityBase<BinarySensorState> {
  readonly platform = PLATFORM.BINARY_SENSOR;

  constructor(id: string, device: Device) {
    super(id, device);
    this.logger.info("Created", this.platform, id, device.id);
  }

  processPacket(packet: DecodedPacket): void {
    if (packet.type !== "ESPNOW_RX") return;

    const parsed = BinarySensorPayloadSchema.safeParse(packet.payload);
    if (!parsed.success) return;

    const data: BinarySensorPayload = parsed.data;
    if (data.id !== this.id) return;

    void this.updateState(data.stat);
  }
}
