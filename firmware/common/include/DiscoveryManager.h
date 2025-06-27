#pragma once

#include "entities/Entity.h"

struct DiscoReq {
  Entity* ent;
  uint8_t attempts = 0;
};

void discoveryInit();
void discoEnqueue(Entity* e);
bool discoDequeue(DiscoReq& out);
void discoveryTick();
