import { titleCase } from "scule";

import { INTERFACES } from "@/interfaces";
import type { DecodedPacket } from "@/interfaces/protocols/serial/v1";
import { sleep } from "@/utils/timers";

import { HA_DISCOVERY_COOLDOWN_MS } from "../constants";
import type { DeviceEntity } from "../device";
import { PLATFORM } from "../platforms";
import { getDiscoveryTopic, getEntityTopic, getUniqueId } from "../utils";

const { mqtt, serial } = INTERFACES;

type SwitchPayload = {
  p: typeof PLATFORM.SWITCH;
  id: string;
  stat: "ON" | "OFF";
  dev_id: string;
};

function isSwitchPayload(payload: any): payload is SwitchPayload {
  return "p" in payload && payload.p === PLATFORM.SWITCH;
}

export class SwitchEntity {
  #discoveryPromise?: Promise<unknown>;

  constructor(
    public readonly id: string,
    public readonly device: DeviceEntity,
  ) {}

  processMessage(topic: string, message: Buffer) {
    if (topic !== this.commandTopic) {
      return;
    }

    const state = message.toString() === "ON" ? "ON" : "OFF";
    const json = {
      id: this.id,
      stat: state,
    };
    serial.send("ESPNOW_TX", {
      mac: this.device.mac,
      payload: Buffer.from(JSON.stringify(json)),
    });
  }
  processPacket(packet: DecodedPacket) {
    if (packet.type !== "ESPNOW_RX") {
      return;
    }

    const payload = packet.payload;
    if (!isSwitchPayload(payload)) {
      return;
    }

    if (payload.id === this.id) {
      this.updateState(payload.stat === "ON" ? "ON" : "OFF");
    }
  }

  get discoveryTopic() {
    return getDiscoveryTopic({
      platform: PLATFORM.SWITCH,
      entityId: this.id,
      deviceId: this.device.id,
    });
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
      unique_id: getUniqueId(this.id, this.device.id),
      stat_t: "~/state",
      cmd_t: "~/cmd",
      qos: 2,
    };
  }

  get stateTopic() {
    return this.entityConfig.stat_t.replace("~", this.entityTopic);
  }

  get commandTopic() {
    return this.entityConfig.cmd_t.replace("~", this.entityTopic);
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
