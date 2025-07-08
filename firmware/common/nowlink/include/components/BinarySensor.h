#pragma once
#include <ArduinoJson.h>
#include <functional>

#include <NowLink.h>

namespace K = NowConstants::Keys;
namespace T = NowConstants::Types;

class NowBinarySensor : public NowEntity {
public:
  using ChangeCallback = std::function<void(bool)>;

  NowBinarySensor(const char* id, bool init_discovery = false)
      : _id(id) {
    NowLink::registerEntity(this, init_discovery);
  }

  // Identification
  const char* id()       const override { return _id; }
  const char* platform() const override { return "binary_sensor"; }

  // Serialization
  void serializeDiscovery(JsonDocument& doc) const override {
    doc[K::TYPE] = T::DISCOVERY;
    _fillCommon(doc);
  }
  void serializeState(JsonDocument& doc) const override {
    doc[K::TYPE] = T::HYBRID;
    _fillCommon(doc);
    doc[K::STATE] = _state ? "ON" : "OFF";
  }

  // State API
  void setState(bool s) {
    if (_state != s) { _state = s; _dirty = true; if (onChange) onChange(_state); }
  }
  bool state()   const { return _state; }
  bool isDirty() const override { return _dirty; }
  void clearDirty()     override { _dirty = false; }

  ChangeCallback onChange = nullptr;

private:
  void _fillCommon(JsonDocument& doc) const {
    doc[K::DEVICE_ID] = NowLink::id();
    doc[K::PLATFORM]  = platform();
    doc[K::ID]        = _id;
  }

  const char* _id;
  bool _state = false;
  bool _dirty = true;
};
