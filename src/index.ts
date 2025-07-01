import { App } from "./app";
import { APP_VERSION } from "./constants";

console.log(`===+++=== ESPNOW2MQTT v${APP_VERSION} ===+++===`, "\n");

const app = new App();
let isStopping = false;

async function shutdown(signal: string) {
  if (isStopping) return;
  isStopping = true;
  console.log(`\nReceived ${signal}, shutting down...\n`);
  await app.stop();
  process.exit(0);
}

["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP"].forEach(sig =>
  process.on(sig, () => shutdown(sig)),
);

app.start().catch(err => {
  console.error("Fatal error\n", err);
  process.exit(1);
});
