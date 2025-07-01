import type { Entity } from "./base";
import { Device } from "./device";
import { PLATFORM, type Platform } from "./platforms";
import { BinarySensorEntity } from "./platforms/binary-sensor";
import { SwitchEntity } from "./platforms/switch";

export function createEntity(
  platform: Platform,
  id: string,
  device: Device,
): Entity {
  switch (platform) {
    case PLATFORM.SWITCH:
      return new SwitchEntity(id, device);

    case PLATFORM.BINARY_SENSOR:
      return new BinarySensorEntity(id, device);

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function createDevice(id: string, mac: string): Device {
  return new Device(id, mac);
}
