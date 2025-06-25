#pragma once
#include <ArduinoJson.h>

class Entity {
public:
  virtual const char* id()        const = 0;   // e.g. "flash-button"
  virtual const char* platform()  const = 0;   // e.g. "binary_sensor"

  // populate JSON for discovery and for state
  virtual void serializeDiscovery(JsonDocument& d) const = 0;
  virtual void serializeState    (JsonDocument& d) const = 0;

  // optional tick for derived classes that have internal timers
  virtual void update() {}
  virtual ~Entity() {}
};
