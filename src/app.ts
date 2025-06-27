import { GatewayDevice } from "./devices/gateway";
import { BinarySensorEntity } from "./entities/binary-sensor";
import { DeviceEntity } from "./entities/device";
import {
  devicemap,
  ensureEntityThen,
  pendingJobs,
  type EntityKey,
} from "./entities/helpers";
import { SwitchEntity } from "./entities/switch";
import { extractFromTopic, normalisePrefix } from "./entities/utils";
import { env } from "./env";
import { ESPNOW_BROADCAST_MAC } from "./helpers/espnow";
import { getWizmoteButtonCode, getWizmotePayload } from "./helpers/wizmote";
import { INTERFACES } from "./interfaces";

const { mqtt, serial } = INTERFACES;

const ESPNOW_WIZMOTE_TOPIC = "espnow/wizmote/send";

export class App {
  private setupMqttHandlers() {
    mqtt.on("connected", () => {
      console.log("[MQTT] Connected");
      mqtt.subscribe(ESPNOW_WIZMOTE_TOPIC);
    });

    mqtt.on("disconnected", () => {
      console.log("[MQTT] Disconnected");
    });

    mqtt.on("error", e => console.error("[MQTT]", e));

    mqtt.on("message", (topic, message) => {
      const msg = message.toString();
      console.log("[MQTT] MSG", topic, msg);
    });
  }

  private setupSerialHandlers() {
    serial.on("connected", () => {
      console.log("[Serial] Connected");
    });
    serial.on("disconnected", () => {
      console.log("[Serial] Disconnected");
    });

    serial.on("error", e => {
      const FILTERED = ["File not found"];
      if (FILTERED.some(f => e.message.includes(f))) return;

      console.error("[Serial]", e);
    });

    serial.on("write", packet => {
      console.log("[Serial] SND", packet.type, packet.data);
    });

    serial.on("packet", packet => {
      console.log("[Serial] PKT", packet.type, packet);
    });
  }

  private setupDeviceHandlers() {
    const espnow2mqttPrefix = normalisePrefix(env.MQTT_ESPNOW2MQTT_PREFIX);
    mqtt.subscribe(`${espnow2mqttPrefix}/+/+/+`);
    mqtt.on("message", (topic, message) => {
      const parsed = extractFromTopic(topic);

      if (!parsed) {
        return;
      }

      const { entityId, device } = parsed;
      ensureEntityThen(device.id, entityId, device.mac, () => {
        const entity = devicemap.get(device.id)!.entities.get(entityId)!;
        if ("processMessage" in entity) {
          entity.processMessage(topic, message);
        }
      });
    });

    serial.on("packet", packet => {
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

        // DEVICE BOOTSTRAP
        if (!devicemap.has(payload.dev_id)) {
          const d = new DeviceEntity(payload.dev_id, packet.mac);
          devicemap.set(payload.dev_id, d);
        }

        const device = devicemap.get(payload.dev_id)!;
        device.discoverRSSI()?.then(() => device.updateRSSI(packet.rssi));

        // ENTITY BOOTSTRAP
        if (!device.entities.has(payload.id)) {
          if (payload.p === "binary_sensor") {
            const e = new BinarySensorEntity(payload.id, device);
            device.entities.set(payload.id, e);
          }

          if (payload.p === "switch") {
            const e = new SwitchEntity(payload.id, device);
            device.entities.set(payload.id, e);
          }
        }
        const entity = device.entities.get(payload.id)!;
        entity.discover();

        const key: EntityKey = `${payload.dev_id}/${payload.id}`;
        if (pendingJobs.has(key)) {
          pendingJobs
            .get(key)!
            .splice(0)
            .forEach(job => job());
          pendingJobs.delete(key);
        }
        return;
      }

      if ("dev_id" in packet.payload && "id" in packet.payload) {
        type DevicePayload = {
          dev_id: string;
          id: string;
        };
        const dp = packet.payload as DevicePayload;
        if (devicemap.has(dp.dev_id)) {
          const d = devicemap.get(dp.dev_id)!;
          d.updateRSSI(packet.rssi);
        } else {
          const d = new DeviceEntity(dp.dev_id, packet.mac);
          d.updateRSSI(packet.rssi);
          devicemap.set(dp.dev_id, d);
        }

        ensureEntityThen(dp.dev_id, dp.id, packet.mac, () => {
          const device = devicemap.get(dp.dev_id)!;
          const entity = device.entities.get(dp.id)!;
          entity.processPacket(packet);
          device.updateRSSI(packet.rssi);
        });

        return;
      }
    });
  }

  private setupWizmoteHandlers() {
    mqtt.subscribe(ESPNOW_WIZMOTE_TOPIC);
    mqtt.on("message", (topic, message) => {
      const msg = message.toString();
      if (topic === ESPNOW_WIZMOTE_TOPIC) {
        const btnCode = getWizmoteButtonCode(msg);
        if (btnCode) {
          serial.send("ESPNOW_TX", {
            mac: ESPNOW_BROADCAST_MAC,
            payload: getWizmotePayload(btnCode),
          });
        }
      }
    });
  }

  async start() {
    this.setupMqttHandlers();
    this.setupSerialHandlers();
    GatewayDevice.init();
    await INTERFACES.init();
    this.setupDeviceHandlers();
    this.setupWizmoteHandlers();
  }
}
