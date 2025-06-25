#pragma once
#include "Entity.h"
#include <functional>

class Switch : public Entity {
public:
  using ChangeCallback = std::function<void(bool)>;

  Switch(const char* id, const char* node_id);
  
  // ── Entity interface ──────────────────
  const char* id()       const override { return _id; }
  const char* platform() const override { return "switch"; }

  void serializeDiscovery(JsonDocument& doc) const override;
  void serializeState    (JsonDocument& doc) const override;

  // ── Logic ────────────────────────────────
  void  setState(bool newState);   // call from sketch when state changes
  bool  state()  const { return _state; }
  bool  isDirty()  const { return _dirty; }
  void  clearDirty()    { _dirty = false; }

  ChangeCallback onChange = nullptr;


private:
  const char* _id;
  const char* _node;
  bool  _state  = false;
  bool  _dirty  = true;
};
