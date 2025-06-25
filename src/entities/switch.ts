import { snakeCase } from "scule";

import { env } from "@/env";
import { INTERFACES } from "@/interfaces";
import { sleep } from "@/utils/timers";

import type { DeviceEntity } from "./device";

type SwitchPayload = {
  dev_id: string;
  p: "switch";
  id: string;
  stat: "ON" | "OFF";
};

function isSwitchPayload(payload: any): payload is SwitchPayload {
  return "p" in payload && payload.p === "switch";
}

export class SwitchEntity {
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
      if (!isSwitchPayload(payload)) {
        return;
      }

      if (payload.id === id) {
        this.updateState(payload.stat === "ON" ? "ON" : "OFF");
      }
    });

    INTERFACES.mqtt.subscribe(this.commandTopic);
    INTERFACES.mqtt.on("message", (topic, message) => {
      if (topic !== this.commandTopic) {
        return;
      }

      const state = message.toString() === "ON" ? "ON" : "OFF";
      const json = {
        id: this.id,
        stat: state,
      };
      INTERFACES.serial.send("ESPNOW_TX", {
        mac: this.device.mac,
        payload: Buffer.from(JSON.stringify(json)),
      });
    });
  }

  get EntityConfig() {
    return {
      unique_id: `e2m_${this.device.id}_${this.id}_state`,
      qos: 2,
    };
  }

  get discoveryTopic() {
    return `${env.MQTT_HA_PREFIX}/switch/e2m_${snakeCase(this.device.id)}_${snakeCase(this.id)}/config`;
  }

  get stateTopic() {
    return `${env.MQTT_ESPNOW2MQTT_PREFIX}/${this.device.mac.replaceAll(":", "")}_${snakeCase(this.id)}/state`;
  }

  get commandTopic() {
    return `${env.MQTT_ESPNOW2MQTT_PREFIX}/${this.device.mac.replaceAll(":", "")}_${snakeCase(this.id)}/set`;
  }

  discover() {
    this.#discoveryPromise = INTERFACES.mqtt
      .publishAsync(
        this.discoveryTopic,
        JSON.stringify({
          dev: this.device.DeviceInfoShort,
          ...this.EntityConfig,
          state_topic: this.stateTopic,
          command_topic: this.commandTopic,
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
