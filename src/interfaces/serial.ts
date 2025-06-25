import EventEmitter from "events";

import { SerialPort } from "serialport";

import { env } from "@/env";
import { sleep } from "@/utils/timers";

import {
  PacketDecoder,
  PacketEncoder,
  type DecodedPacket,
  type HandledPacketType,
  type PacketData,
} from "./protocols/serial/v1";

const CONNECTION_RETRY_DELAY_MS = 2000;

interface SerialInterfaceEventMap {
  connected: [];
  disconnected: [];
  data: [data: Buffer];
  error: [err: Error];

  packet: [packet: DecodedPacket];
}

export class SerialInterface extends EventEmitter<SerialInterfaceEventMap> {
  private port?: SerialPort;
  private isReady = false;

  private decoder = new PacketDecoder();

  constructor() {
    super();
    this.decoder.on("packet", packet => this.emit("packet", packet));
  }

  get isConnected() {
    return this.isReady && !!this.port?.isOpen;
  }

  async init() {
    await this.connect();
  }

  async reset(): Promise<void> {
    if (!this.port) throw new Error("No port to reset");

    this.port.set({ rts: true, dtr: false });
    await sleep(100);
    this.port.set({ rts: false, dtr: false });
    await sleep(200);
  }

  async open(): Promise<SerialPort> {
    return new Promise((resolve, reject) => {
      const port = new SerialPort({
        path: env.SERIAL_PORT,
        baudRate: env.SERIAL_BAUD_RATE,
        autoOpen: false,
      });
      port.open(err => {
        err ? reject(err) : resolve(port);
      });
    });
  }

  private setup(port: SerialPort) {
    port.on("data", data => {
      this.emit("data", data);
      this.decoder.feed(data);
    });

    port.on("close", () => {
      this.isReady = false;
      this.emit("disconnected");
      void this.connect(); // restart connection loop
    });

    port.on("error", err => {
      this.emit("error", err);
      port.close();
    });
  }

  private async connect(): Promise<void> {
    while (true) {
      try {
        const port = await this.open();
        this.port = port;

        if (env.SERIAL_RESET_ON_CONNECT) {
          await this.reset();
        }

        this.setup(port);
        this.isReady = true;
        this.emit("connected");
        return;
      } catch (err) {
        this.emit("error", err as Error);
        await sleep(CONNECTION_RETRY_DELAY_MS);
      }
    }
  }

  private write(data: Buffer) {
    if (this.isReady && this.port) {
      this.port.write(data);
    } else {
      console.warn("[SERIAL] Dropping message");
    }
  }

  send<T extends HandledPacketType>(type: T, data: PacketData<T>): void {
    const packet = PacketEncoder.encode(type, data);
    this.write(packet);
  }
}
