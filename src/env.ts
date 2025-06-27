import { prettifyError, z } from "zod/v4";

const ENV_SCHEMA = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  // MQTT
  MQTT_HOST: z.string(),
  MQTT_PORT: z.coerce.number().min(1).max(65535).default(1883),
  MQTT_USER: z.string(),
  MQTT_PASSWORD: z.string(),
  MQTT_HA_PREFIX: z.string().default("homeassistant"),
  MQTT_ESPNOW2MQTT_PREFIX: z.string().default("espnow2mqtt"),

  // SERIAL
  SERIAL_PORT: z.string(),
  SERIAL_BAUD_RATE: z.coerce.number().default(9600),
  SERIAL_RESET_ON_CONNECT: z.coerce.boolean().default(false),
});

const { data, error } = ENV_SCHEMA.safeParse(process.env);

if (error) {
  console.error("Invalid Environment");
  console.warn(prettifyError(error));
  process.exit(1);
}

export const env = data;
