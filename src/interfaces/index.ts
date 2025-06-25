import { MqttInterface } from "./mqtt";
import { SerialInterface } from "./serial";

const mqtt = new MqttInterface();
const serial = new SerialInterface();

export const INTERFACES = Object.freeze({ mqtt, serial });
