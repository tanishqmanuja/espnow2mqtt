#pragma once
#include <ArduinoJson.h>
#include <functional>
#include <algorithm> 

#include <NowLink.h>

class NowMonochromaticLight : public NowEntity {
public:
  using ChangeCallback = std::function<void(bool on, uint8_t brightness)>;

  static constexpr const char* PLATFORM = "light";
  static constexpr uint8_t DEFAULT_BRIGHTNESS = 128;

  NowMonochromaticLight(const char* id, bool init_discovery = false)
    : _id(id) {
    NowLink::registerEntity(this, init_discovery);
  }

  const char* id()       const override { return _id; }
  const char* platform() const override { return PLATFORM; }

  void serializeDiscovery(JsonDocument& doc) const override {
    doc[K::TYPE] = T::DISCOVERY;
    _fillCommon(doc);
    doc[K::SUPPORTED_COLOR_MODES] = "brightness";
  }

  void serializeState(JsonDocument& doc) const override {
    doc[K::TYPE] = T::HYBRID;
    _fillCommon(doc);
    doc[K::STATE]     = _on ? "ON" : "OFF";
    doc[K::BRIGHTNESS] = _brightness;
  }

  void set(bool on, uint8_t brightness) {
    brightness = std::clamp(brightness, uint8_t(0), uint8_t(255));

    // If turning ON with brightness 0 → use default brightness
    if (on && brightness == 0) {
      brightness = DEFAULT_BRIGHTNESS;
    }

    // Auto-turn off if brightness is still 0
    if (brightness == 0) {
      on = false;
    }

    bool changed = (_on != on) || (_brightness != brightness);
    if (changed) {
      _on = on;
      _brightness = brightness;
      _dirty = true;
      if (onChange) onChange(_on, _brightness);
    }
  }

  void setBrightness(uint8_t b) { set(_on, b); }
  void setOn(bool o)            { set(o, _brightness); }
  void toggle()                 { set(!_on, _brightness); }

  bool isOn()        const { return _on; }
  uint8_t brightness() const { return _brightness; }

  bool isDirty() const override { return _dirty; }
  void clearDirty() override { _dirty = false; }

  void handlePayload(const JsonDocument& doc) override {
    bool hasState = doc.containsKey(K::STATE);
    bool hasBrightness = doc.containsKey(K::BRIGHTNESS);
  
    bool newOn = _on;
    uint8_t newBrightness = _brightness;
  
    if (hasBrightness)
      newBrightness = std::clamp(doc[K::BRIGHTNESS].as<int>(), 0, 255);
  
    if (hasState) {
      const char* stateStr = doc[K::STATE] | "";
      newOn = !strcmp(stateStr, "ON");
    }
  
    set(newOn, newBrightness);
  }

  ChangeCallback onChange = nullptr;

private:
  void _fillCommon(JsonDocument& doc) const {
    doc[K::DEVICE_ID] = NowLink::id();
    doc[K::PLATFORM]  = platform();
    doc[K::ID]        = _id;
  }

  const char* _id;
  bool _on = false;
  uint8_t _brightness = 0;
  bool _dirty = true;
};
