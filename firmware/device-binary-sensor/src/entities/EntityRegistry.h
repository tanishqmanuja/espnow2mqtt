#pragma once
#include "Entity.h"

#define MAX_ENTITIES 10

class EntityRegistry {
public:
  EntityRegistry() : count(0) {}

  bool add(Entity* e) {
    if (count < MAX_ENTITIES) {
      entities[count++] = e;
      return true;
    }
    return false;
  }

  template <typename F>
  void forEach(F&& fn) {
    for (uint8_t i = 0; i < count; ++i) {
        fn(*entities[i]);
    }
}

  void updateAll() {
    for (int i = 0; i < count; ++i) {
      entities[i]->update();
    }
  }

private:
  Entity* entities[MAX_ENTITIES];
  uint8_t count;
};
