import { titleCase } from "scule";

import { getInterfaces } from "@/interfaces";
import { rgb } from "@/utils/colors";
import { createLogger } from "@/utils/logger";
import { sleep } from "@/utils/timers";

import { HA_DISCOVERY_COOLDOWN_MS } from "./constants";
import type { Device } from "./device";
import { COMMAND_CAPABLE_PLATFORMS } from "./platforms";
import { getDiscoveryTopic, getEntityTopic, getUniqueId } from "./utils";

const { mqtt } = getInterfaces();

const logger = createLogger("ENTITY", rgb(119, 221, 119));

export type Entity = EntityBase<any>;

/**
 * Generic base class that handles Home‑Assistant discovery, MQTT state
 * publishing and queued‑state logic for any entity capable of emitting a
 * string `state`. Subclasses provide payload parsing and (optionally)
 * implement processPacket or processMessage via interfaces.
 */
export abstract class EntityBase<TState extends string> {
  abstract readonly platform: string;

  protected discoveryInFlight?: Promise<void>;
  protected queuedState?: TState;

  protected logger = logger;

  constructor(
    public readonly id: string,
    public readonly device: Device,
  ) {}

  protected get supportsCommand(): boolean {
    return COMMAND_CAPABLE_PLATFORMS.includes(this.platform);
  }

  protected get entityTopic(): string {
    return getEntityTopic({ entityId: this.id, device: this.device });
  }

  protected get entityConfig() {
    const config: Record<string, unknown> = {
      "~": this.entityTopic,
      name: titleCase(this.id),
      uniq_id: getUniqueId(this.id, this.device.id),
      stat_t: "~/state",
      qos: 2 as const,
    };

    if (this.supportsCommand) {
      config.cmd_t = "~/cmd";
    }

    return config;
  }

  protected get discoveryTopic(): string {
    return getDiscoveryTopic({
      platform: this.platform,
      entityId: this.id,
      deviceId: this.device.id,
    });
  }

  protected get stateTopic(): string {
    return (this.entityConfig.stat_t as string).replace("~", this.entityTopic);
  }

  protected get commandTopic(): string | undefined {
    if (!this.supportsCommand) return undefined;
    return (this.entityConfig.cmd_t as string).replace("~", this.entityTopic);
  }

  async discover(): Promise<void> {
    if (this.discoveryInFlight) return this.discoveryInFlight;
    logger.debug(
      "HA Discovery for",
      `${this.id}(${this.platform}) via ${this.device.id}`,
    );

    this.discoveryInFlight = mqtt
      .publishAsync(
        this.discoveryTopic,
        JSON.stringify({
          dev: this.device.buildDeviceInfoShort(),
          ...this.entityConfig,
        }),
        { qos: 2 },
      )
      .then(() => sleep(HA_DISCOVERY_COOLDOWN_MS))
      .finally(() => {
        this.discoveryInFlight = undefined;
        if (this.queuedState !== undefined) {
          const lastState = this.queuedState;
          this.queuedState = undefined;
          void this.updateState(lastState);
        }
      });

    return this.discoveryInFlight;
  }

  async updateState(state: TState): Promise<void> {
    if (this.discoveryInFlight) {
      this.queuedState = state;
      return;
    }

    mqtt.publish(this.stateTopic, state, { qos: 1 });
  }
}
