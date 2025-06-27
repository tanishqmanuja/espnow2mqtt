import { titleCase } from "scule";

import { INTERFACES } from "@/interfaces";
import type { DecodedPacket } from "@/interfaces/protocols/serial/v1";
import { sleep } from "@/utils/timers";

import { HA_DISCOVERY_COOLDOWN_MS } from "../constants";
import type { DeviceEntity } from "../device";
import { PLATFORM } from "../platforms";
import { getDiscoveryTopic, getEntityTopic } from "../utils";

const { mqtt } = INTERFACES;

type BinarySensorPayload = {
  p: typeof PLATFORM.BINARY_SENSOR;
  id: string;
  stat: "ON" | "OFF";
  dev_id: string;
};

function isBinarySensorPayload(payload: any): payload is BinarySensorPayload {
  return "p" in payload && payload.p === PLATFORM.BINARY_SENSOR;
}

export class BinarySensorEntity {
  #discoveryPromise?: Promise<unknown>;

  constructor(
    public readonly id: string,
    public readonly device: DeviceEntity,
  ) {
    // serial.on("packet", packet => this.processPacket(packet));
  }

  processPacket(packet: DecodedPacket) {
    if (packet.type !== "ESPNOW_RX") {
      return;
    }

    const payload = packet.payload;
    if (!isBinarySensorPayload(payload)) {
      return;
    }

    if (payload.id === this.id) {
      this.updateState(payload.stat);
    }
  }

  get entityTopic() {
    return getEntityTopic({
      entityId: this.id,
      device: this.device,
    });
  }

  get entityConfig() {
    return {
      "~": this.entityTopic,
      name: titleCase(this.id),
      uniq_id: `e2m_${this.device.id}_${this.id}_state`,
      stat_t: "~/state",
      qos: 2,
    };
  }

  get discoveryTopic() {
    return getDiscoveryTopic({
      platform: PLATFORM.BINARY_SENSOR,
      entityId: this.id,
      deviceId: this.device.id,
    });
  }

  get stateTopic() {
    return this.entityConfig.stat_t.replace("~", this.entityTopic);
  }

  discover() {
    this.#discoveryPromise = mqtt
      .publishAsync(
        this.discoveryTopic,
        JSON.stringify({
          dev: this.device.DeviceInfoShort,
          ...this.entityConfig,
        }),
      )
      ?.then(() => sleep(HA_DISCOVERY_COOLDOWN_MS))
      .then(() => (this.#discoveryPromise = undefined));
  }

  updateState(state: "ON" | "OFF") {
    if (this.#discoveryPromise) {
      this.#discoveryPromise.finally(() => this.updateState(state));
    } else {
      mqtt.publish(this.stateTopic, state);
    }
  }
}
