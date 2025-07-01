import { APP_PROTOCOL_VERSION, APP_VERSION } from "@/constants";
import { env } from "@/env";
import { getInterfaces } from "@/interfaces";
import { debounce } from "@/utils/debounce";
import { sleep } from "@/utils/timers";

const UPDATE_INTERVAL_SEC = 60;

export const GATEWAY_DEVICE_ID = "espnow2mqtt_gateway_device";

const { mqtt, serial } = getInterfaces();

export class GatewayDevice {
  #discoveryPromise?: Promise<unknown>;
  private mac: string | undefined;

  constructor() {
    mqtt.on("connected", () => {
      this.discover();
      this.update();
    });

    serial.on("connected", () => this.update());
    serial.on("disconnected", () => this.update());
    serial.on("packet", p => {
      if (p.type === "GATEWAY_INIT") {
        this.discover(p.mac);
        this.update();
      }
    });

    setInterval(() => this.update(), UPDATE_INTERVAL_SEC * 1000);
  }

  static init() {
    return new GatewayDevice();
  }

  private async _discover(mac?: string) {
    if (mac) this.mac = mac;

    const payload: Record<string, any> = {
      dev: {
        ids: [GATEWAY_DEVICE_ID],
        name: "ESPNOW MQTT Gateway",
        mf: "tmlabs",
        mdl: "ESPNow Gateway",
        sw: APP_VERSION,
        hw: `${env.SERIAL_PORT} // Protocol v${APP_PROTOCOL_VERSION}`,
      },
      o: {
        name: "espnow2mqtt",
        sw: APP_VERSION,
        url: "https://github.com/tanishqmanuja/espnow2mqtt",
      },
      device_class: "connectivity",
      value_template: "{{ value_json.connected }}",
      unique_id: "en2m_serial",
      name: "Serial",
      state_topic: `${env.MQTT_ESPNOW2MQTT_PREFIX}/serial/state`,
      expire_after: 120,
      force_update: true,
      entity_category: "diagnostic",
      qos: 2,
    };

    if (this.mac) {
      payload.dev["cns"] = [["mac", this.mac]];
    }

    this.#discoveryPromise = mqtt
      .publishAsync(
        `${env.MQTT_HA_PREFIX}/binary_sensor/espnow2mqtt_serial/config`,
        JSON.stringify(payload),
      )
      ?.then(() => sleep(1000))
      .finally(() => (this.#discoveryPromise = undefined));
  }
  discover = debounce((mac?: string) => this._discover(mac), 1000);

  private _update(state: boolean = serial.isConnected) {
    if (this.#discoveryPromise) {
      this.#discoveryPromise.finally(() => {
        this._update(state);
      });
    }

    mqtt.publish(
      `${env.MQTT_ESPNOW2MQTT_PREFIX}/serial/state`,
      JSON.stringify({ connected: state ? "ON" : "OFF" }),
    );
  }
  update = debounce((state?: boolean) => this._update(state), 1000);
}
