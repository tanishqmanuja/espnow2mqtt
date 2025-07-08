import { EspNowDevice } from "../devices/espnow";
import type { Entity } from "./base";
import { PLATFORM, type Platform } from "./platforms";
import { BinarySensorEntity } from "./platforms/binary-sensor";
import { LightEntity, type LightPayload } from "./platforms/light";
import { SwitchEntity } from "./platforms/switch";

export function createEntity(
  platform: Platform,
  id: string,
  device: EspNowDevice,
  hintPayload?: Record<string, unknown>,
): Entity {
  switch (platform) {
    case PLATFORM.SWITCH:
      return new SwitchEntity(id, device);

    case PLATFORM.BINARY_SENSOR:
      return new BinarySensorEntity(id, device);

    case PLATFORM.LIGHT:
      return new LightEntity(id, device, hintPayload as LightPayload);

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function createDevice(id: string, mac: string): EspNowDevice {
  return new EspNowDevice(id, mac);
}
