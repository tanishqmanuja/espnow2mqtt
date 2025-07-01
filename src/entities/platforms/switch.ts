import { z } from "zod/v4";

import { getInterfaces } from "@/interfaces";
import type { DecodedPacket } from "@/interfaces/protocols/serial";

import { EntityBase } from "../base";
import type { CommandProcessor, PacketProcessor } from "../capabilities";
import type { Device } from "../device";
import { PLATFORM } from "../platforms";

const { serial } = getInterfaces();

const SwitchPayloadSchema = z.object({
  p: z.literal(PLATFORM.SWITCH),
  id: z.string(),
  stat: z.union([z.literal("ON"), z.literal("OFF")]),
  dev_id: z.string(),
});

type SwitchPayload = z.infer<typeof SwitchPayloadSchema>;
export type SwitchState = "ON" | "OFF";

export class SwitchEntity
  extends EntityBase<SwitchState>
  implements PacketProcessor, CommandProcessor
{
  readonly platform = PLATFORM.SWITCH;

  constructor(id: string, device: Device) {
    super(id, device);
    this.logger.debug("Created", this.platform, id, device.id);
  }

  processMessage(topic: string, payload: Buffer): void {
    if (topic !== this.commandTopic) return;

    const desiredState: SwitchState =
      payload.toString() === "ON" ? "ON" : "OFF";

    const json: Omit<SwitchPayload, "p" | "dev_id"> = {
      id: this.id,
      stat: desiredState,
    };

    serial.send("ESPNOW_TX", {
      mac: this.device.mac,
      payload: Buffer.from(JSON.stringify(json)),
    });
  }

  processPacket(packet: DecodedPacket): void {
    if (packet.type !== "ESPNOW_RX") return;

    const parsed = SwitchPayloadSchema.safeParse(packet.payload);
    if (!parsed.success) return;

    const data = parsed.data;
    if (data.id !== this.id) return;

    void this.updateState(data.stat);
  }
}
