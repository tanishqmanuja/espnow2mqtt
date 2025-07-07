import { titleCase } from "scule";

import { APP_VERSION } from "@/constants";
import { GATEWAY_DEVICE_ID } from "@/devices/gateway";
import type { Entity } from "@/entities/base";
import { ENK, HAK, NowPacketType } from "@/entities/keyvals";
import {
  getDiscoveryTopic,
  getEntityTopic,
  getUniqueId,
} from "@/entities/utils";
import { getInterfaces } from "@/interfaces";
import { rgb } from "@/utils/colors";
import { debounce } from "@/utils/debounce";
import { createLogger } from "@/utils/logger";

const { mqtt, serial } = getInterfaces();
const log = createLogger("DEVICE", rgb(174, 198, 207));

export class EspNowDevice {
  readonly entities = new Map<string, Entity>();

  constructor(
    public readonly id: string,
    public readonly mac: string,
  ) {
    log.info("Created", id, mac);
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
    return config[HAK.state_topic].replace("~", config["~"]);
  }

  private buildRSSIEntityConfig() {
    const baseTopic = getEntityTopic({ entityId: ".rssi", device: this });

    return Object.freeze({
      "~": baseTopic,
      [HAK.unique_id]: getUniqueId("rssi", this.id),
      [HAK.state_topic]: "~/state",
      [HAK.device_class]: "signal_strength",
      [HAK.unit_of_measurement]: "dBm",
      [HAK.entity_category]: "diagnostic",
      qos: 2,
    });
  }

  buildDeviceInfo() {
    return Object.freeze({
      [HAK.identifiers]: [this.id, this.mac],
      [HAK.connections]: [["mac", this.mac]] as const,
      [HAK.name]: titleCase(this.id),
      [HAK.manufacturer]: "tmlabs",
      [HAK.model]: "ESPNow Node",
      via_device: GATEWAY_DEVICE_ID,
    });
  }

  buildDeviceInfoShort() {
    const { ids, cns } = this.buildDeviceInfo();
    return { ids, cns } as const;
  }

  buildDeviceOrigin() {
    return Object.freeze({
      [HAK.name]: "espnow2mqtt",
      [HAK.software_version]: APP_VERSION,
      [HAK.support_url]: "https://github.com/tanishqmanuja/espnow2mqtt",
    });
  }

  async discoverRSSI(): Promise<void> {
    const payload = {
      [HAK.device]: this.buildDeviceInfo(),
      [HAK.origin]: this.buildDeviceOrigin(),
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
      JSON.stringify({
        [ENK.type]: NowPacketType.discovery,
        [ENK.id]: entityId,
      }),
    );
    serial.send("ESPNOW_TX", { mac: this.mac, payload });
    log.debug("Requested discovery for", entityId, "on", this.id);
  }
}
