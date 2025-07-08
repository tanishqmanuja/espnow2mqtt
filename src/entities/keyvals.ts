/* Home Assistant keys */
export const HAK = {
  brightness: "brightness",
  command_topic: "cmd_t",
  device: "dev",
  device_class: "dev_cla",
  enabled_by_default: "en",
  entity_category: "ent_cat",
  expire_after: "exp_aft",
  icon: "ic",
  name: "name",
  origin: "o",
  platform: "p",
  state_topic: "stat_t",
  unique_id: "uniq_id",
  unit_of_measurement: "unit_of_meas",
  supported_color_modes: "sup_clrm",
  schema: "schema",

  // device
  configuration_url: "cu",
  connections: "cns",
  hardware_version: "hw",
  identifiers: "ids",
  manufacturer: "mf",
  model: "mdl",
  model_id: "mdl_id",
  serial_number: "sn",
  software_version: "sw",
  suggested_area: "sa",

  //origin
  support_url: "url",
} as const;

/* ESPNow keys */
export const ENK = {
  device_id: "dev_id",
  id: "id",
  platform: "p",
  state: "stat",
  type: ".t",
  brightness: "br",
} as const;

export const NowPacketType = {
  discovery: "d",
  state: "s",
  hybrid: "h",
} as const;
