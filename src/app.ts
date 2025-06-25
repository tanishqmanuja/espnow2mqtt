import { GatewayDevice } from "./devices/gateway";
import { BinarySensorEntity } from "./entities/binary-sensor";
import { DeviceEntity } from "./entities/device";
import { SwitchEntity } from "./entities/switch";
import { ESPNOW_BROADCAST_MAC } from "./helpers/espnow";
import { getWizmoteButtonCode, getWizmotePayload } from "./helpers/wizmote";
import { INTERFACES } from "./interfaces";

const ESPNOW_WIZMOTE_TOPIC = "espnow/wizmote/send";

export class App {
  private serial = INTERFACES.serial;
  private mqtt = INTERFACES.mqtt;

  private setupMqttHandlers() {
    this.mqtt.on("connected", () => {
      console.log("[MQTT] Connected");
      this.mqtt.subscribe(ESPNOW_WIZMOTE_TOPIC);
    });

    this.mqtt.on("disconnected", () => {
      console.log("[MQTT] Disconnected");
    });

    this.mqtt.on("error", e => console.error("[MQTT]", e));

    this.mqtt.on("message", (topic, message) => {
      const msg = message.toString();
      console.log("[MQTT] -> Serial", topic, msg);

      if (topic === ESPNOW_WIZMOTE_TOPIC) {
        const btnCode = getWizmoteButtonCode(msg);
        if (btnCode) {
          this.serial.send("ESPNOW_TX", {
            mac: ESPNOW_BROADCAST_MAC,
            payload: getWizmotePayload(btnCode),
          });
        }
      }
    });
  }

  private setupSerialHandlers() {
    this.serial.on("connected", () => {
      console.log("[Serial] Connected");
    });
    this.serial.on("disconnected", () => {
      console.log("[Serial] Disconnected");
    });

    this.serial.on("error", e => {
      const FILTERED = ["File not found"];
      if (FILTERED.some(f => e.message.includes(f))) return;

      console.error("[Serial]", e);
    });

    // this.serial.on("data", buf => {
    //   console.log("[Serial] -> RAW", buf.toString("hex"));
    // });

    this.serial.on("packet", packet => {
      console.log("[Serial] -> MQTT", packet.type, packet);
    });
  }

  private setupDeviceHandlers() {
    const devicemap = new Map<string, DeviceEntity>();

    this.serial.on("packet", packet => {
      if (packet.type !== "ESPNOW_RX") {
        return;
      }

      if ("typ" in packet.payload && packet.payload.typ === "dscvry") {
        // SETUP DEVICE
        type DiscoveryPayload = {
          typ: "dscvry";
          dev_id: string;
          p: "binary_sensor" | (string & {});
          id: string;
        };
        const payload = packet.payload as DiscoveryPayload;
        if (!devicemap.has(payload.dev_id)) {
          const d = new DeviceEntity(payload.dev_id, packet.mac);
          devicemap.set(payload.dev_id, d);
          d.discoverRSSI()?.then(() => d.updateRSSI(packet.rssi));
        }

        // SETUP ENTITIES
        const device = devicemap.get(payload.dev_id)!;
        if (!device.entities.has(payload.id)) {
          if (payload.p === "binary_sensor") {
            const e = new BinarySensorEntity(payload.id, device);
            device.entities.set(payload.id, e);
            e.discover();
          }

          if (payload.p === "switch") {
            const e = new SwitchEntity(payload.id, device);
            device.entities.set(payload.id, e);
            e.discover();
          }
        }
      }

      if ("dev_id" in packet.payload) {
        type DevicePayload = {
          dev_id: string;
        };
        const p = packet.payload as DevicePayload;
        if (devicemap.has(p.dev_id)) {
          const d = devicemap.get(p.dev_id)!;
          d.updateRSSI(packet.rssi);
        }
      }
    });
  }

  async start() {
    this.setupMqttHandlers();
    this.setupSerialHandlers();
    this.setupDeviceHandlers();
    GatewayDevice.init(this.mqtt, this.serial);
    await Promise.all([this.mqtt.init(), this.serial.init()]);
  }
}
