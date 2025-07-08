import { z } from "zod/v4";

import { getInterfaces } from "@/interfaces";
import type { DecodedPacket } from "@/interfaces/protocols/serial";

import type { EspNowDevice } from "../../devices/espnow";
import { EntityBase } from "../base";
import type { CommandProcessor, PacketProcessor } from "../capabilities";
import { ENK, HAK } from "../keyvals";
import { PLATFORM } from "../platforms";

const { serial } = getInterfaces();

const LightPayloadSchema = z.object({
  [ENK.platform]: z.literal(PLATFORM.LIGHT),
  [ENK.id]: z.string(),
  [ENK.state]: z.union([z.literal("ON"), z.literal("OFF")]),
  [ENK.device_id]: z.string(),
  [ENK.brightness]: z.number().optional(),
});

export type LightPayload = z.infer<typeof LightPayloadSchema>;
export type LightState = {
  state: "ON" | "OFF";
  brightness?: number;
};

function identifyColorModes(payload: LightPayload | undefined): string[] {
  if (!payload) return ["onoff"];

  const hasOnOff = payload[ENK.state] === "ON" || payload[ENK.state] === "OFF";
  const hasBrightness = payload[ENK.brightness] !== undefined;

  if (hasOnOff && hasBrightness) return ["brightness"];
  if (hasOnOff) return ["onoff"];

  return ["onoff"];
}

export class LightEntity
  extends EntityBase<LightState>
  implements PacketProcessor, CommandProcessor
{
  readonly platform = PLATFORM.LIGHT;

  constructor(
    id: string,
    device: EspNowDevice,
    public hintPayload?: LightPayload,
  ) {
    super(id, device);
    this.logger.info("Created", this.platform, id, device.id);
  }

  override get discoveryConfig(): Record<string, unknown> {
    const scms = identifyColorModes(this.hintPayload);
    return {
      ...super.discoveryConfig,
      [HAK.schema]: "json",
      [HAK.supported_color_modes]: scms,
      [HAK.brightness]: scms.includes("brightness"),
    };
  }

  processMessage(topic: string, payload: Buffer): void {
    if (topic !== this.commandTopic) return;

    const json: Partial<LightPayload> = {
      [ENK.id]: this.id,
    };
    try {
      const receivedPayload = JSON.parse(payload.toString());
      const desiredState: LightState = {
        state: receivedPayload.state,
        brightness: receivedPayload.brightness,
      };

      json[ENK.state] = desiredState.state;
      json[ENK.brightness] = desiredState.brightness;
    } catch (e) {
      json[ENK.state] = payload.toString() === "ON" ? "ON" : "OFF";
    }

    serial.send("ESPNOW_TX", {
      mac: this.device.mac,
      payload: Buffer.from(JSON.stringify(json)),
    });
  }

  processPacket(packet: DecodedPacket): void {
    if (packet.type !== "ESPNOW_RX") return;

    const parsed = LightPayloadSchema.safeParse(packet.payload);
    if (!parsed.success) return;

    const data = parsed.data;
    if (data.id !== this.id) return;

    void this.updateState({
      state: data[ENK.state],
      brightness: data[ENK.brightness],
    });
  }
}
