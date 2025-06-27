import { MqttInterface } from "./mqtt";
import { SerialInterface } from "./serial";

export class Interfaces {
  #mqtt = new MqttInterface();
  #serial = new SerialInterface();

  constructor() {}

  get mqtt() {
    return this.#mqtt;
  }

  get serial() {
    return this.#serial;
  }

  async init() {
    await Promise.all([this.mqtt.init(), this.serial.init()]);
  }
}

/* Global Singleton */
export const INTERFACES = new Interfaces();
