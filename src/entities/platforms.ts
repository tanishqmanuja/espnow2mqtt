export const PLATFORM = {
  BINARY_SENSOR: "binary_sensor",
  SWITCH: "switch",
  LIGHT: "light",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export function isSupportedPlatform(platform: string): platform is Platform {
  return Object.values(PLATFORM).includes(platform as Platform);
}

export const COMMAND_CAPABLE_PLATFORMS: readonly string[] = [
  PLATFORM.SWITCH,
  PLATFORM.LIGHT,
] as const;
