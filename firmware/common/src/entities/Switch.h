#pragma once

#include <functional>

#include "Entity.h"

class Switch : public Entity {
public:
  using ChangeCallback = std::function<void(bool)>;

  Switch(const char* id, const char* node_id);
  
  const char* id()       const override { return _id; }
  const char* platform() const override { return "switch"; }

  void serializeDiscovery(JsonDocument& doc) const override;
  void serializeState    (JsonDocument& doc) const override;

  void  setState(bool newState);
  bool  state()     const { return _state; }
  bool  isDirty()   const { return _dirty; }
  void  clearDirty()      { _dirty = false; }

  ChangeCallback onChange = nullptr;

private:
  const char* _id;
  const char* _node;
  bool  _state  = false;
  bool  _dirty  = true;
};
