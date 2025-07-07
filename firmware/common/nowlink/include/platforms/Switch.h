#pragma once
#include <ArduinoJson.h>
#include <functional>

#include <NowEntity.h>
#include <NowConstants.h>

class NowEntity;
namespace NowLink { void registerEntity(NowEntity*, bool); }

namespace K = NowConstants::Keys;
namespace T = NowConstants::Types;

class NowSwitch : public NowEntity {
public:
  using ChangeCallback = std::function<void(bool)>;

  NowSwitch(const char* id, bool init_discovery = false)
      : _id(id) {
    NowLink::registerEntity(this, init_discovery);
  }

  const char* id()       const override { return _id; }
  const char* platform() const override { return "switch"; }

  void serializeDiscovery(JsonDocument& doc) const override {
    doc[K::TYPE] = T::DISCOVERY;
    _fillCommon(doc);
  }
  void serializeState(JsonDocument& doc) const override {
    doc[K::TYPE] = T::HYBRID;
    _fillCommon(doc);
    doc[K::STATE] = _state ? "ON" : "OFF";
  }

  void setState(bool s) {
    if (_state != s) { _state = s; _dirty = true; if (onChange) onChange(_state); }
  }
  bool toggle() { setState(!_state); return _state; }

  bool state()   const { return _state; }
  bool isDirty() const override { return _dirty; }
  void clearDirty()     override { _dirty = false; }

  void handlePayload(const JsonDocument& doc) override {
    const char* st = doc[K::STATE] | "";
    if (st[0]) setState(!strcmp(st, "ON"));
  }

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