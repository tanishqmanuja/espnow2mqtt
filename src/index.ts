import { App } from "./app";
import { APP_VERSION } from "./constants";

console.log(`===+++=== ESPNOW2MQTT v${APP_VERSION} ===+++===`, "\n");
const app = new App();
app.start().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
