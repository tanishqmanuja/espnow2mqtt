import { APP_PROTOCOL_VERSION, APP_VERSION } from "@/constants";
import { HA_DISCOVERY_COOLDOWN_MS } from "@/entities/constants";
import { getDiscoveryTopic, getUniqueId } from "@/entities/utils";
import { env } from "@/env";
import { getInterfaces } from "@/interfaces";
import { debounce } from "@/utils/debounce";
import { createLogger } from "@/utils/logger";
import { sleep, type IntervalTimer } from "@/utils/timers";

const { mqtt, serial } = getInterfaces();
const log = createLogger("GATEWAY");

export const GATEWAY_DEVICE_ID = "gateway_device";

const SERIAL_DISCOVERY_TOPIC = getDiscoveryTopic({
  platform: "binary_sensor",
  entityId: "serial",
  deviceId: GATEWAY_DEVICE_ID,
});
const SERIAL_ENTITY_TOPIC = `${env.MQTT_ESPNOW2MQTT_PREFIX}/${GATEWAY_DEVICE_ID}/serial`;
const SERIAL_UPDATE_INTERVAL_MS = 60 * 1000;

export class GatewayDevice {
  static #instance?: GatewayDevice;

  private mac?: string;
  private discoveryInFlight?: Promise<void>;

  private interval?: IntervalTimer;

  static init() {
    if (this.#instance) {
      return this.#instance;
    }

    this.#instance = new GatewayDevice();
    return this.#instance;
  }

  private constructor() {
    mqtt.once("connected", () => {
      this.discover();

      serial.on("connected", () => this.update(true));
      serial.on("disconnected", () => this.update(false));
      serial.on("packet", this.onSerialPacket);

      this.interval = setInterval(
        () => this.update(),
        SERIAL_UPDATE_INTERVAL_MS,
      );
    });
  }

  static stop() {
    const that = this.#instance;
    if (!that) return;

    serial.off("connected", () => that.update(true));
    serial.off("disconnected", () => that.update(false));
    serial.off("packet", that.onSerialPacket);
    clearInterval(that.interval);
  }

  private readonly discover = debounce(async (mac?: string) => {
    if (mac) this.mac = mac;

    const payload = {
      dev: {
        ids: [GATEWAY_DEVICE_ID],
        name: "ESPNow Gateway",
        mf: "tmlabs",
        mdl: "ESPNow Gateway",
        sw: APP_VERSION,
        hw: `${env.SERIAL_PORT} // Protocol v${APP_PROTOCOL_VERSION}`,
        ...(this.mac ? { cns: [["mac", this.mac]] as const } : {}),
      },
      o: {
        name: "espnow2mqtt",
        sw: APP_VERSION,
        url: "https://github.com/tanishqmanuja/espnow2mqtt",
      },
      "~": SERIAL_ENTITY_TOPIC,
      device_class: "connectivity",
      uniq_id: getUniqueId("serial", GATEWAY_DEVICE_ID),
      name: "Serial",
      stat_t: "~/state",
      expire_after: (2 * SERIAL_UPDATE_INTERVAL_MS) / 1000,
      force_update: true,
      ent_cat: "diagnostic",
      qos: 2,
    };

    try {
      this.discoveryInFlight = mqtt.publishAsync(
        SERIAL_DISCOVERY_TOPIC,
        JSON.stringify(payload),
      );
      await this.discoveryInFlight;
      await sleep(HA_DISCOVERY_COOLDOWN_MS);
      log.debug("Published HA discovery");

      // to prevent Unavailable state in HA
      this.update();
    } catch (err) {
      log.warn("Failed HA discovery:", err);
    } finally {
      this.discoveryInFlight = undefined;
    }
  }, 1000);

  get serialStateTopic() {
    return `${SERIAL_ENTITY_TOPIC}/state`;
  }

  private update(state: boolean = serial.isConnected): void {
    if (this.discoveryInFlight) {
      void this.discoveryInFlight.finally(() => this.update(state));
      return;
    }

    const published = mqtt.publish(this.serialStateTopic, state ? "ON" : "OFF");
    if (published) {
      log.debug("Published serial state", state);
    }
  }

  private readonly onSerialPacket = (pkt: any): void => {
    if (pkt.type === "GATEWAY_INIT") {
      this.discover(pkt.mac);
    }
  };
}
