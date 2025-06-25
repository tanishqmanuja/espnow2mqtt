import { EventEmitter } from "events";

import mqtt from "mqtt";

import { env } from "@/env";

const CONNECTION_RETRY_DELAY_MS = 1000;

interface MqttInterfaceEventMap {
  connected: [];
  disconnected: [];
  reconnecting: [];
  error: [err: Error];

  message: [topic: string, message: Buffer];
}

export class MqttInterface extends EventEmitter<MqttInterfaceEventMap> {
  private client!: mqtt.MqttClient;
  private isReady = false;

  constructor() {
    super();
  }

  getClient() {
    return this.client;
  }

  async init(): Promise<void> {
    return new Promise(resolve => {
      this.client = mqtt.connect({
        host: env.MQTT_HOST,
        port: env.MQTT_PORT,
        username: env.MQTT_USER,
        password: env.MQTT_PASSWORD,
        reconnectPeriod: CONNECTION_RETRY_DELAY_MS,
      });

      this.client.on("connect", () => {
        this.isReady = true;
        this.emit("connected");
        resolve();
      });

      this.client.on("reconnect", () => this.emit("reconnecting"));
      this.client.on("close", () => {
        this.isReady = false;
        this.emit("disconnected");
      });

      this.client.on("error", err => this.emit("error", err));

      this.client.on("message", (topic, message) => {
        this.emit("message", topic, message);
      });
    });
  }

  publish(topic: string, message: string) {
    if (this.isReady) {
      this.client.publish(topic, message);
    } else {
      console.warn("[MQTT] Dropping message");
    }
  }

  publishAsync(topic: string, message: string) {
    if (this.isReady) {
      return this.client.publishAsync(topic, message);
    } else {
      console.warn("[MQTT] Dropping message");
    }
  }

  subscribe(topic: string) {
    this.client.subscribe(topic);
  }
}
