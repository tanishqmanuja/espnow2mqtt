import { getInterfaces } from "@/interfaces";

import type { Entity } from "./base";
import type { Device } from "./device";

const { serial } = getInterfaces();

export type PendingJob = ({
  device,
  entity,
}: {
  device: Device;
  entity: Entity;
}) => void; // what to do after discovery
export type EntityKey = `${string}/${string}`; //  dev_id/entity_id  (cheap tuple)

export const devicemap = new Map<string, Device>();
export const pendingJobs = new Map<EntityKey, PendingJob[]>();
export const pendingReq = new Set<EntityKey>(); // to debounce discovery traffic

export function ensureEntityThen(
  devId: string,
  entityId: string,
  mac: string,
  job: PendingJob,
) {
  const key: EntityKey = `${devId}/${entityId}`;

  // Already in memory?  → run job right away
  const device = devicemap.get(devId);
  if (device && device.entities.has(entityId)) {
    job({ device, entity: device.entities.get(entityId)! });
    return;
  }

  /* ---------- queue the job ---------- */
  (pendingJobs.get(key) ?? pendingJobs.set(key, []).get(key)!).push(job);

  /* ---------- fire a single discovery request ---------- */
  if (!pendingReq.has(key)) {
    pendingReq.add(key);

    const payloadStr = JSON.stringify({ typ: "dscvry", id: entityId });
    serial.send("ESPNOW_TX", {
      mac,
      payload: Buffer.from(payloadStr),
    });

    // clear the debounce flag after 3 s so we can re-ask if node is down
    setTimeout(() => pendingReq.delete(key), 3000);
  }
}
