import { GatewayDevice } from "@/devices/gateway";
import {
  devicemap,
  ensureEntityThen,
  pendingJobs,
  type EntityKey,
} from "@/entities/helpers";
import { extractFromTopic } from "@/entities/utils";
import { env } from "@/env";
import { ESPNOW_BROADCAST_MAC } from "@/helpers/espnow";
import { getWizmoteButtonCode, getWizmotePayload } from "@/helpers/wizmote";
import {
  getInterfaces,
  initInterfaces,
  shutdownInterfaces,
} from "@/interfaces";

import { isCommandProcessor, isPacketProcessor } from "./entities/capabilities";
import { createDevice, createEntity } from "./entities/factory";
import { ENK, NowPacketType } from "./entities/keyvals";
import { isSupportedPlatform } from "./entities/platforms";
import { mlog } from "./interfaces/mqtt";
import { slog } from "./interfaces/serial";
import { logger } from "./utils/logger";

export const TOPICS = {
  WIZMOTE_TX: "espnow/wizmote/send",
  ESPNOW2MQTT_ALL: (prefix: string) => `${prefix}/+/+/+`,
};

const { mqtt, serial } = getInterfaces();

function isIgnorableSerialError(err: Error): boolean {
  return ["File not found"].some(txt => err.message.includes(txt));
}

export class App {
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.bindMqttEvents();
    this.bindSerialEvents();

    GatewayDevice.init();
    await initInterfaces();

    this.subscribeRuntimeTopics();
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    this.unbindMqttEvents();
    this.unbindSerialEvents();

    GatewayDevice.stop();
    await shutdownInterfaces();
  }

  /* ------------ MQTT EVENT HANDLERS -------------------- */

  private readonly handleMqttConnect = () => {
    mlog.info("Connected");
    mqtt.subscribe([
      TOPICS.WIZMOTE_TX,
      TOPICS.ESPNOW2MQTT_ALL(env.MQTT_ESPNOW2MQTT_PREFIX),
    ]);
  };

  private readonly handleMqttDisconnect = () => mlog.warn("Disconnected");
  private readonly handleMqttError = (e: Error) => mlog.error(e);

  private readonly handleMqttMessage = (topic: string, payload: Buffer) => {
    if (topic === TOPICS.WIZMOTE_TX) return this.processWizmoteMessage(payload);

    const parsed = extractFromTopic(topic);
    if (!parsed) return;

    const { entityId, device } = parsed;

    if (entityId.startsWith(".")) {
      // Internal Entity
      return;
    }

    ensureEntityThen(device.id, entityId, device.mac, ({ entity }) => {
      if (isCommandProcessor(entity)) {
        entity.processMessage(topic, payload);
      }
    });
  };

  private processWizmoteMessage(buf: Buffer): void {
    const msg = buf.toString();
    const btnCode = getWizmoteButtonCode(msg);
    if (!btnCode) return;
    serial.send("ESPNOW_TX", {
      mac: ESPNOW_BROADCAST_MAC,
      payload: getWizmotePayload(btnCode),
    });
  }

  /* ------------ SERIAL EVENT HANDLERS ------------------ */

  private readonly handleSerialConnect = () => slog.info("Connected");
  private readonly handleSerialDisconnect = () => slog.warn("Disconnected");

  private readonly handleSerialError = (e: Error) => {
    if (isIgnorableSerialError(e)) return;
    slog.error(e);
  };

  private readonly handleSerialWrite = (pkt: unknown) =>
    slog.debug("Sending", pkt);

  private readonly handleSerialPacket = (pkt: any) => {
    slog.debug("Received", pkt);
    if (pkt.type !== "ESPNOW_RX") return;

    // --- Discovery packet ----------------------------------
    if (pkt.payload?.[ENK.type] === NowPacketType.discovery)
      return this.processDiscovery(pkt);

    // --- Regular device packet -----------------------------
    if (pkt.payload?.[ENK.type] === NowPacketType.state)
      return this.processDeviceData(pkt);

    // --- Hybrid packet -------------------------------------
    if (pkt.payload?.[ENK.type] === NowPacketType.hybrid) {
      if (!devicemap.get(pkt.payload.dev_id)?.entities.has(pkt.payload.id)) {
        this.processDiscovery(pkt);
      }
      this.processDeviceData(pkt);
      return;
    }
  };

  private processDiscovery(pkt: any): void {
    type Dsc = { dev_id: string; p: string; id: string };
    const p = pkt.payload as Dsc;

    // bootstrap / update device
    let device = devicemap.get(p.dev_id);
    if (!device) {
      device = createDevice(p.dev_id, pkt.mac);
      devicemap.set(p.dev_id, device);
    }

    device.discoverRSSI().then(() => device!.updateRSSI(pkt.rssi));

    // bootstrap entity
    let entity = device.entities.get(p.id);
    if (!entity) {
      if (isSupportedPlatform(p.p)) {
        entity = createEntity(p.p, p.id, device);
        device.entities.set(p.id, entity);
      } else {
        logger.warn("Unsupported platform", p.p);
      }
    }

    if (!entity) return;

    entity.discover();

    // flush any queued jobs
    const key: EntityKey = `${p.dev_id}/${p.id}`;
    const jobs = pendingJobs.get(key);
    if (jobs) {
      jobs.splice(0).forEach(job =>
        job({
          device,
          entity,
        }),
      );
      pendingJobs.delete(key);
    }
  }

  private processDeviceData(pkt: any): void {
    type DevMsg = { dev_id: string; id: string };
    const { dev_id, id } = pkt.payload as DevMsg;

    ensureEntityThen(dev_id, id, pkt.mac, ({ device, entity }) => {
      device.updateRSSI(pkt.rssi);

      if (isPacketProcessor(entity)) {
        entity.processPacket(pkt);
      }
    });
  }

  /* ------------ UTIL ------------------ */

  private bindMqttEvents(): void {
    mqtt.on("connected", this.handleMqttConnect);
    mqtt.on("disconnected", this.handleMqttDisconnect);
    mqtt.on("error", this.handleMqttError);
    mqtt.on("message", this.handleMqttMessage);
  }

  private unbindMqttEvents(): void {
    mqtt.off("connected", this.handleMqttConnect);
    mqtt.off("disconnected", this.handleMqttDisconnect);
    mqtt.off("error", this.handleMqttError);
    mqtt.off("message", this.handleMqttMessage);
  }

  private bindSerialEvents(): void {
    serial.on("connected", this.handleSerialConnect);
    serial.on("disconnected", this.handleSerialDisconnect);
    serial.on("error", this.handleSerialError);
    serial.on("write", this.handleSerialWrite);
    serial.on("packet", this.handleSerialPacket);
  }

  private unbindSerialEvents(): void {
    serial.off("connected", this.handleSerialConnect);
    serial.off("disconnected", this.handleSerialDisconnect);
    serial.off("error", this.handleSerialError);
    serial.off("write", this.handleSerialWrite);
    serial.off("packet", this.handleSerialPacket);
  }

  private subscribeRuntimeTopics(): void {
    mqtt.subscribe(TOPICS.ESPNOW2MQTT_ALL(env.MQTT_ESPNOW2MQTT_PREFIX));
    mqtt.subscribe(TOPICS.WIZMOTE_TX);
  }
}
