import EventEmitter from "events";

import { SerialPort } from "serialport";

import { env } from "@/env";
import { rgb } from "@/utils/colors";
import { createLogger } from "@/utils/logger";
import { sleep } from "@/utils/timers";

import {
  PacketDecoder,
  PacketEncoder,
  type DecodedPacket,
  type HandledPacketType,
  type PacketData,
} from "./protocols/serial";

const RECONNECT_DELAY_MS = 2000;

export const slog = createLogger("SERIAL", rgb(253, 253, 150));

interface SerialInterfaceEventMap {
  connected: [];
  disconnected: [];
  error: [err: Error];
  data: [data: Buffer];
  packet: [packet: DecodedPacket];
  write: [
    packet: { type: HandledPacketType; data: PacketData<HandledPacketType> },
  ];
}

export class SerialInterface extends EventEmitter<SerialInterfaceEventMap> {
  private port?: SerialPort;
  private readonly decoder = new PacketDecoder();

  private isReady = false;
  private isStopping = false;

  constructor() {
    super();

    this.decoder.on("packet", p => this.emit("packet", p));
  }

  get isConnected() {
    return this.isReady && !!this.port?.isOpen;
  }

  async init(): Promise<void> {
    while (!this.isStopping) {
      try {
        this.port = await this.open();
        if (env.SERIAL_RESET_ON_CONNECT) await this.pulseReset();
        this.attach(this.port);
        this.isReady = true;
        this.emit("connected");
        return;
      } catch (err) {
        this.emit("error", err as Error);
        await sleep(RECONNECT_DELAY_MS);
      }
    }
  }

  async stop(): Promise<void> {
    this.isStopping = true;
    this.isReady = false;
    if (this.port?.isOpen) {
      await new Promise<void>(res => this.port!.close(() => res()));
    }
  }

  async reset(): Promise<void> {
    if (!this.port) throw new Error("No port to reset");

    this.port.set({ rts: true, dtr: false });
    await sleep(100);
    this.port.set({ rts: false, dtr: false });
    await sleep(200);
  }

  private open(): Promise<SerialPort> {
    return new Promise((resolve, reject) => {
      const port = new SerialPort({
        path: env.SERIAL_PORT,
        baudRate: env.SERIAL_BAUD_RATE,
        autoOpen: false,
      });
      port.open(err => (err ? reject(err) : resolve(port)));
    });
  }

  private attach(port: SerialPort): void {
    port.on("data", buf => {
      this.emit("data", buf);
      this.decoder.feed(buf);
    });

    port.on("error", err => {
      this.emit("error", err);
      port.close();
    });

    port.on("close", () => {
      this.isReady = false;
      this.emit("disconnected");
      if (!this.isStopping) void this.reconnectLoop();
    });
  }

  private async reconnectLoop(): Promise<void> {
    await sleep(RECONNECT_DELAY_MS);
    if (!this.isStopping) void this.init();
  }

  private async pulseReset(): Promise<void> {
    if (!this.port) return;
    this.port.set({ rts: true, dtr: false });
    await sleep(100);
    this.port.set({ rts: false, dtr: false });
    await sleep(200);
  }

  private write(buf: Buffer): boolean {
    if (!this.isConnected || !this.port) return false;
    this.port.write(buf, err => err && this.emit("error", err));
    return true;
  }

  send<T extends HandledPacketType>(type: T, data: PacketData<T>): void {
    const buf = PacketEncoder.encode(type, data);
    if (this.write(buf)) this.emit("write", { type, data });
    else slog.warn("Dropping write, not connected");
  }
}
