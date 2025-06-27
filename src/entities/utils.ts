import { snakeCase } from "scule";

import { env } from "@/env";

const UNIQUE_ID_PREFIX = "espnow";

export function normalisePrefix(prefixRaw: string | undefined): string {
  const prefix = (prefixRaw ?? "").replace(/\/+$/, "");
  if (!prefix)
    throw new Error("env.MQTT_ESPNOW2MQTT_PREFIX is empty or undefined");
  return prefix;
}

const MAC_NO_COLON = /^[0-9a-f]{12}$/i;
function buildNodeId(device: { id: string; mac: string }): string {
  const macNoColon = device.mac.toLowerCase().replace(/:/g, "");
  if (!MAC_NO_COLON.test(macNoColon))
    throw new Error(`Invalid MAC: “${device.mac}”`);
  return `${device.id}_${macNoColon}`;
}

export function getUniqueId(entityId: string, deviceId: string): string {
  const id = `${deviceId}_${entityId}`;
  return `${UNIQUE_ID_PREFIX}_${snakeCase(id)}`;
}

export function getDiscoveryTopic({
  platform,
  entityId,
  deviceId,
}: {
  platform: string;
  entityId: string;
  deviceId: string;
}): string {
  const prefix = normalisePrefix(env.MQTT_HA_PREFIX);
  const uid = getUniqueId(entityId, deviceId);
  return `${prefix}/${platform}/${uid}/config`;
}

export function getEntityTopic({
  entityId,
  device,
}: {
  entityId: string;
  device: { id: string; mac: string };
}): string {
  const prefix = normalisePrefix(env.MQTT_ESPNOW2MQTT_PREFIX);
  const nodeId = buildNodeId(device);
  const objectId = entityId;
  return `${prefix}/${nodeId}/${objectId}`;
}

export function extractFromTopic(
  topic: string,
  noSuffix = false,
): {
  entityId: string;
  device: { id: string; mac: string };
} | null {
  const prefix = normalisePrefix(env.MQTT_ESPNOW2MQTT_PREFIX);

  if (!topic.startsWith(prefix + "/")) return null;
  const remainder = topic.slice(prefix.length + 1);

  const [nodeId, objectId, ...rest] = remainder.split("/");
  if (!nodeId || !objectId || (noSuffix && rest.length)) return null;

  const lastUnderscore = nodeId.lastIndexOf("_");
  if (lastUnderscore === -1) return null;

  const idPart = nodeId.slice(0, lastUnderscore);
  const macPart = nodeId.slice(lastUnderscore + 1);
  if (!MAC_NO_COLON.test(macPart)) return null;

  const macColon = macPart.match(/.{1,2}/g)!.join(":");

  return {
    entityId: objectId,
    device: { id: idPart, mac: macColon },
  };
}
