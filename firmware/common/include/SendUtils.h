#pragma once

#include <ArduinoJson.h>
#include "entities/Entity.h"

bool sendJson(const JsonDocument& doc);
bool sendDiscovery(Entity& e);
bool sendState(Entity& e);
