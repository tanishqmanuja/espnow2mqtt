#pragma once
#include <ArduinoJson.h>

class NowEntity {
public:
  virtual const char* id()       const = 0;
  virtual const char* platform() const = 0;

  virtual void serializeDiscovery(JsonDocument&) const = 0;
  virtual void serializeState    (JsonDocument&) const = 0;

  virtual bool  isDirty()  const = 0;
  virtual void  clearDirty()     = 0;

  virtual void handlePayload(const JsonDocument&) {}

  virtual ~NowEntity() {}
};