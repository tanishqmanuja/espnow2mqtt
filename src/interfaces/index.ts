import { MqttInterface } from "./mqtt";
import { SerialInterface } from "./serial";

class Interfaces {
  readonly mqtt = new MqttInterface();
  readonly serial = new SerialInterface();

  private constructor() {}

  async init() {
    await Promise.all([this.mqtt.init(), this.serial.init()]);
  }

  async stop() {
    await Promise.allSettled([this.mqtt.stop(), this.serial.stop()]);
  }

  private static _instance: Interfaces | null = null;

  static get instance(): Interfaces {
    if (!this._instance) this._instance = new Interfaces();
    return this._instance;
  }
}

export function getInterfaces(): Interfaces {
  return Interfaces.instance;
}

export async function initInterfaces(): Promise<void> {
  await Interfaces.instance.init();
}

export async function shutdownInterfaces(): Promise<void> {
  await Interfaces.instance.stop();
}
