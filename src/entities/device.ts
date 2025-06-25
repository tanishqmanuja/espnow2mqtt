import { titleCase } from "scule";

import { APP_VERSION } from "@/constants";
import { GATEWAT_DEVICE_ID } from "@/devices/gateway";
import { env } from "@/env";
import { INTERFACES } from "@/interfaces";
import { debounce } from "@/utils/debouce";

export class DeviceEntity {
  readonly entities = new Map<string, any>();

  constructor(
    public readonly id: string,
    public readonly mac: string,
  ) {}

  get DeviceInfo() {
    return {
      ids: [this.id, this.mac],
      cns: [["mac", this.mac]],
      name: titleCase(this.id),
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

  get rssiTopic() {
    return `${env.MQTT_ESPNOW2MQTT_PREFIX}/${this.mac.replaceAll(":", "")}/rssi`;
  }

  get RSSIEntityConfig() {
    return {
      unique_id: `e2m_${this.id}_rssi`,
      state_topic: this.rssiTopic,
      device_class: "signal_strength",
      unit_of_measurement: "dBm",
      entity_category: "diagnostic",
      qos: 2,
    };
  }

  discoverRSSI() {
    return INTERFACES.mqtt.publishAsync(
      `${env.MQTT_HA_PREFIX}/sensor/e2m_${this.id}_rssi/config`,
      JSON.stringify({
        dev: this.DeviceInfo,
        o: this.DeviceOrigin,
        ...this.RSSIEntityConfig,
      }),
    );
  }

  private _updateRSSI(rssi: number) {
    INTERFACES.mqtt.publish(this.rssiTopic, rssi.toString());
  }
  updateRSSI = debounce((rssi: number) => this._updateRSSI(rssi), 1000);
}
