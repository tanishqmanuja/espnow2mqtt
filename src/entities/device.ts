import { titleCase } from "scule";

import { APP_VERSION } from "@/constants";
import { GATEWAY_DEVICE_ID } from "@/devices/gateway";
import { getInterfaces } from "@/interfaces";
import { rgb } from "@/utils/colors";
import { debounce } from "@/utils/debounce";
import { createLogger } from "@/utils/logger";

import type { Entity } from "./base";
import { getDiscoveryTopic, getEntityTopic, getUniqueId } from "./utils";

const { mqtt, serial } = getInterfaces();
const log = createLogger("DEVICE", rgb(174, 198, 207));

export class Device {
  readonly entities = new Map<string, Entity>();

  constructor(
    public readonly id: string,
    public readonly mac: string,
  ) {
    log.debug("Created", id, mac);
  }

  private buildDiscoveryTopic(): string {
    return getDiscoveryTopic({
      platform: "sensor",
      entityId: "rssi",
      deviceId: this.id,
    });
  }

  private buildStateTopic(): string {
    const config = this.buildRSSIEntityConfig();
    return config.state_topic.replace("~", config["~"]);
  }

  private buildRSSIEntityConfig() {
    const baseTopic = getEntityTopic({ entityId: "rssi", device: this });

    return Object.freeze({
      "~": baseTopic,
      unique_id: getUniqueId("rssi", this.id),
      state_topic: "~/rssi",
      device_class: "signal_strength",
      unit_of_measurement: "dBm",
      entity_category: "diagnostic",
      qos: 2 as const,
    });
  }

  buildDeviceInfo() {
    return Object.freeze({
      ids: [this.id, this.mac],
      cns: [["mac", this.mac]] as const,
      name: titleCase(this.id),
      mf: "tmlabs",
      mdl: "ESPNow Node",
      via_device: GATEWAY_DEVICE_ID,
    });
  }

  buildDeviceInfoShort() {
    const { ids, cns } = this.buildDeviceInfo();
    return { ids, cns } as const;
  }

  buildDeviceOrigin() {
    return Object.freeze({
      name: "espnow2mqtt",
      sw: APP_VERSION,
      url: "https://github.com/tanishqmanuja/espnow2mqtt",
    });
  }

  async discoverRSSI(): Promise<void> {
    const payload = {
      dev: this.buildDeviceInfo(),
      o: this.buildDeviceOrigin(),
      ...this.buildRSSIEntityConfig(),
    };

    try {
      await mqtt.publishAsync(
        this.buildDiscoveryTopic(),
        JSON.stringify(payload),
      );
    } catch (err) {
      log.warn("Failed to publish RSSI discovery:", err);
    }
  }

  private publishRSSIValue(rssi: number) {
    try {
      mqtt.publish(this.buildStateTopic(), rssi.toString());
    } catch (err) {
      log.warn("Failed to publish RSSI for", this.id, ":", err);
    }
  }

  readonly updateRSSI = debounce(
    (rssi: number) => this.publishRSSIValue(rssi),
    1_000,
  );

  hasEntity(entityId: string): boolean {
    return this.entities.has(entityId);
  }

  addEntity(entityId: string, entity: Entity): void {
    this.entities.set(entityId, entity);
  }

  requestEntityDiscovery(entityId: string): void {
    const payload = Buffer.from(
      JSON.stringify({ typ: "dscvry", id: entityId }),
    );
    serial.send("ESPNOW_TX", { mac: this.mac, payload });
    log.debug("Requested discovery for", entityId, "on", this.id);
  }
}
