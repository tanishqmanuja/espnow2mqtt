import { env } from "@/env";
import { INTERFACES } from "@/interfaces";
import { sleep } from "@/utils/timers";

import type { DeviceEntity } from "./device";

type BinarySensorPayload = {
  dev_id: string;
  p: "binary_sensor";
  id: string;
  stat: "ON" | "OFF";
};

function isBinarySensorPayload(payload: any): payload is BinarySensorPayload {
  return "p" in payload && payload.p === "binary_sensor";
}

export class BinarySensorEntity {
  #discoveryPromise?: Promise<unknown>;

  constructor(
    public readonly id: string,
    public readonly device: DeviceEntity,
  ) {
    INTERFACES.serial.on("packet", packet => {
      if (packet.type !== "ESPNOW_RX") {
        return;
      }
      const payload = packet.payload;
      if (!isBinarySensorPayload(payload)) {
        return;
      }

      if (payload.id === id) {
        this.updateState(payload.stat === "ON" ? "ON" : "OFF");
      }
    });
  }

  get EntityConfig() {
    return {
      unique_id: `e2m_${this.device.id}_${this.id}_state`,
      qos: 2,
    };
  }

  get stateTopic() {
    return `${env.MQTT_ESPNOW2MQTT_PREFIX}/${this.device.mac.replaceAll(":", "")}_${this.id}/state`;
  }

  discover() {
    this.#discoveryPromise = INTERFACES.mqtt
      .publishAsync(
        `${env.MQTT_HA_PREFIX}/binary_sensor/e2m_${this.device.id}_${this.id}/config`,
        JSON.stringify({
          dev: this.device.DeviceInfoShort,
          ...this.EntityConfig,
          state_topic: this.stateTopic,
        }),
      )
      ?.then(() => sleep(1000))
      .then(() => (this.#discoveryPromise = undefined));
  }

  updateState(state: "ON" | "OFF") {
    if (this.#discoveryPromise) {
      this.#discoveryPromise.finally(() => this.updateState(state));
    } else {
      INTERFACES.mqtt.publish(this.stateTopic, state);
    }
  }
}
