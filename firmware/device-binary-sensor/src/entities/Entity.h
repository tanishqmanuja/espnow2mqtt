#pragma once
#include <ArduinoJson.h>

class Entity {
public:
  virtual const char* id()        const = 0;
  virtual const char* platform()  const = 0;

  virtual void serializeDiscovery(JsonDocument& d) const = 0;
  virtual void serializeState    (JsonDocument& d) const = 0;

  virtual ~Entity() {}
};
