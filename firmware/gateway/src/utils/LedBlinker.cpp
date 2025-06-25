#include "LedBlinker.h"


LedBlinker::LedBlinker(int ledPin, unsigned long blinkDuration)
    : _ledPin(ledPin), _blinkDuration(blinkDuration), _lastLedOnTime(0), _isBlinking(false) {}

void LedBlinker::setup() {
  pinMode(_ledPin, OUTPUT);
  digitalWrite(_ledPin, HIGH);
}

void LedBlinker::blink(unsigned long duration) {
  digitalWrite(_ledPin, LOW);
  _lastLedOnTime = millis();
  _isBlinking = true;

  // If a specific duration is provided, use it; otherwise, use the default
  _blinkDuration = (duration > 0) ? duration : _blinkDuration;
}

void LedBlinker::update() {
  if (_isBlinking && (millis() - _lastLedOnTime > _blinkDuration)) {
      digitalWrite(_ledPin, HIGH); // Turn LED off (active high)
      _isBlinking = false; // Reset blink state
  }
}