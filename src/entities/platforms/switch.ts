import { z } from "zod/v4";

import { getInterfaces } from "@/interfaces";
import type { DecodedPacket } from "@/interfaces/protocols/serial";

import type { EspNowDevice } from "../../devices/espnow";
import { EntityBase } from "../base";
import type { CommandProcessor, PacketProcessor } from "../capabilities";
import { ENK } from "../keys";
import { PLATFORM } from "../platforms";

const { serial } = getInterfaces();

const SwitchPayloadSchema = z.object({
  [ENK.platform]: z.literal(PLATFORM.SWITCH),
  [ENK.id]: z.string(),
  [ENK.state]: z.union([z.literal("ON"), z.literal("OFF")]),
  [ENK.device_id]: z.string(),
});

export type SwitchPayload = z.infer<typeof SwitchPayloadSchema>;
export type SwitchState = "ON" | "OFF";

export class SwitchEntity
  extends EntityBase<SwitchState>
  implements PacketProcessor, CommandProcessor
{
  readonly platform = PLATFORM.SWITCH;

  constructor(id: string, device: EspNowDevice) {
    super(id, device);
    this.logger.info("Created", this.platform, id, device.id);
  }

  processMessage(topic: string, payload: Buffer): void {
    if (topic !== this.commandTopic) return;

    const desiredState: SwitchState =
      payload.toString() === "ON" ? "ON" : "OFF";

    const json: Omit<SwitchPayload, "p" | "dev_id"> = {
      [ENK.id]: this.id,
      [ENK.state]: desiredState,
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

    void this.updateState(data[ENK.state]);
  }
}
