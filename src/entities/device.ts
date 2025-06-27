import { snakeCase, titleCase } from "scule";

import { APP_VERSION } from "@/constants";
import { GATEWAT_DEVICE_ID } from "@/devices/gateway";
import { env } from "@/env";
import { INTERFACES } from "@/interfaces";
import { debounce } from "@/utils/debouce";

import type { BinarySensorEntity } from "./binary-sensor";
import type { SwitchEntity } from "./switch";

const { mqtt, serial } = INTERFACES;

export class DeviceEntity {
  readonly entities = new Map<string, BinarySensorEntity | SwitchEntity>();

  constructor(
    public readonly id: string,
    public readonly mac: string,
  ) {}

  get DeviceInfo() {
    return {
      ids: [this.id, this.mac],
      cns: [["mac", this.mac]],
      name: titleCase(this.id),
      mf: "tmlabs",
      mdl: "ESPNow Node",
      via_device: GATEWAT_DEVICE_ID,
    };
  }

  get DeviceInfoShort() {
    return {
      ids: this.DeviceInfo.ids,
      cns: this.DeviceInfo.cns,
    };
  }

  get DeviceOrigin() {
    return {
      name: "espnow2mqtt",
      sw: APP_VERSION,
      url: "https://espnow2mqtt.example.com/support",
    };
  }

  get RSSIEntityConfig() {
    return {
      unique_id: `e2m_${this.id}_rssi`,
      state_topic: this.rssiStateTopic,
      device_class: "signal_strength",
      unit_of_measurement: "dBm",
      entity_category: "diagnostic",
      qos: 2,
    };
  }

  get rssiDiscoveryTopic() {
    return `${env.MQTT_HA_PREFIX}/sensor/e2m_${snakeCase(this.id)}_rssi/config`;
  }
  get rssiStateTopic() {
    return `${env.MQTT_ESPNOW2MQTT_PREFIX}/${this.mac.replaceAll(":", "")}/rssi`;
  }

  discoverRSSI() {
    return mqtt.publishAsync(
      this.rssiDiscoveryTopic,
      JSON.stringify({
        dev: this.DeviceInfo,
        o: this.DeviceOrigin,
        ...this.RSSIEntityConfig,
      }),
    );
  }

  private _updateRSSI(rssi: number) {
    mqtt.publish(this.rssiStateTopic, rssi.toString());
  }
  updateRSSI = debounce((rssi: number) => this._updateRSSI(rssi), 1000);

  requestDiscovery(entityId: string) {
    const payloadStr = JSON.stringify({ typ: "dscvry", id: entityId });
    serial.send("ESPNOW_TX", {
      mac: this.mac,
      payload: Buffer.from(payloadStr),
    });
  }
}
