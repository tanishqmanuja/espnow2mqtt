import { EventEmitter } from "events";

import mqtt, { type IClientPublishOptions } from "mqtt";

import { env } from "@/env";
import { rgb } from "@/utils/colors";
import { createLogger } from "@/utils/logger";

const RECONNECT_DELAY_MS = 1000;

export const mlog = createLogger("MQTT", rgb(177, 156, 217));

interface MqttInterfaceEventMap {
  connected: [];
  disconnected: [];
  reconnecting: [];
  error: [err: Error];
  message: [topic: string, payload: Buffer];
}

export class MqttInterface extends EventEmitter<MqttInterfaceEventMap> {
  private client?: mqtt.MqttClient;
  private isReady = false;

  constructor() {
    super();
  }

  get isConnected(): boolean {
    return this.isReady && !!this.client?.connected;
  }

  async init(): Promise<void> {
    if (this.client) return;

    this.client = mqtt.connect({
      host: env.MQTT_HOST,
      port: env.MQTT_PORT,
      username: env.MQTT_USER,
      password: env.MQTT_PASSWORD,
      reconnectPeriod: RECONNECT_DELAY_MS,
    });

    this.wireEvents();

    await new Promise<void>((res, rej) => {
      this.client!.once("connect", () => res());
      this.client!.once("error", err => rej(err));
    });
  }

  async stop(): Promise<void> {
    if (!this.client) return;
    this.client.options.reconnectPeriod = 0;
    await this.client.endAsync();
    this.isReady = false;
  }

  /** QoS 0 helper – fire‑and‑forget. */
  publish(
    topic: string,
    payload: string | Buffer,
    opts: IClientPublishOptions = {},
  ): void {
    if (!this.isConnected) return mlog.warn("Dropping publish, not connected");
    this.client!.publish(
      topic,
      payload,
      opts,
      err => err && this.emit("error", err),
    );
  }

  /** Promise‑based publish (useful for QoS 1/2). */
  publishAsync(
    topic: string,
    payload: string | Buffer,
    opts: IClientPublishOptions = {},
  ): Promise<void> {
    if (!this.isConnected)
      return Promise.reject(new Error("MQTT not connected"));
    return new Promise((res, rej) =>
      this.client!.publish(topic, payload, opts, err =>
        err ? rej(err) : res(),
      ),
    );
  }

  subscribe(topic: string | string[]): Promise<void> {
    if (!this.isConnected)
      return Promise.reject(new Error("MQTT not connected"));
    return new Promise((res, rej) =>
      this.client!.subscribe(topic, err => (err ? rej(err) : res())),
    );
  }

  unsubscribe(topic: string | string[]): Promise<void> {
    if (!this.isConnected)
      return Promise.reject(new Error("MQTT not connected"));
    return new Promise((res, rej) =>
      this.client!.unsubscribe(topic, err => (err ? rej(err) : res())),
    );
  }

  private wireEvents(): void {
    const c = this.client!;
    c.on("connect", () => {
      this.isReady = true;
      this.emit("connected");
    });

    c.on("reconnect", () => {
      this.isReady = false;
      this.emit("reconnecting");
    });

    c.on("close", () => {
      this.isReady = false;
      this.emit("disconnected");
    });

    c.on("error", err => this.emit("error", err));
    c.on("message", (t, msg) => this.emit("message", t, msg));
  }
}
