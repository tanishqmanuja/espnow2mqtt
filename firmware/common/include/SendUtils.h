#pragma once

#include <ArduinoJson.h>
#include "entities/Entity.h"

extern const uint8_t GATEWAY_ADDRESS[6];

bool sendJson(const JsonDocument& doc);
bool sendDiscovery(Entity& e);
bool sendState(Entity& e);
