import { APP_PROTOCOL_VERSION, APP_VERSION } from "@/constants";
import { env } from "@/env";
import type { MqttInterface } from "@/interfaces/mqtt";
import type { SerialInterface } from "@/interfaces/serial";
import { debounce } from "@/utils/debouce";

const UPDATE_INTERVAL_SEC = 60;

export const GATEWAT_DEVICE_ID = "espnow2mqtt_gateway_device";

export class GatewayDevice {
  private mac: string | undefined;

  constructor(
    private mqtt: MqttInterface,
    private serial: SerialInterface,
  ) {
    this.mqtt.on("connected", () => {
      this.discover();
      this.update();
    });

    this.serial.on("connected", () => this.update());
    this.serial.on("disconnected", () => this.update());
    this.serial.on("packet", p => {
      if (p.type === "GATEWAY_INIT") {
        this.discover(p.mac);
        this.update();
      }
    });

    setInterval(() => this.update(), UPDATE_INTERVAL_SEC * 1000);
  }

  static init(mqtt: MqttInterface, serial: SerialInterface) {
    return new GatewayDevice(mqtt, serial);
  }

  private _discover(mac?: string) {
    if (mac) this.mac = mac;

    const payload: Record<string, any> = {
      dev: {
        ids: [GATEWAT_DEVICE_ID],
        name: "ESPNOW MQTT Gateway",
        mf: "tmlabs",
        mdl: "ESPNow2MQTT",
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

    this.mqtt.publish(
      `${env.MQTT_HA_PREFIX}/binary_sensor/espnow2mqtt_serial/config`,
      JSON.stringify(payload),
    );
  }
  discover = debounce((mac?: string) => this._discover(mac), 1000);

  private _update(state: boolean = this.serial.isConnected) {
    this.mqtt.publish(
      `${env.MQTT_ESPNOW2MQTT_PREFIX}/serial/state`,
      JSON.stringify({ connected: state ? "ON" : "OFF" }),
    );
  }
  update = debounce((state?: boolean) => this._update(state), 1000);
}
