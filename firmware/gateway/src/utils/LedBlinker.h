#pragma once

#include <Arduino.h>

class LedBlinker {
public:
    LedBlinker(int ledPin, unsigned long blinkDuration = 10); 
    void setup();
    void blink(unsigned long duration = 0);
    void update();

private:
    int _ledPin;
    unsigned long _blinkDuration;
    unsigned long _lastLedOnTime;
    bool _isBlinking;
};
