/*
 * Copyright 2018 Spencer Russell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE
 * AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const int LED_OUT_PIN = 13;
const int OSC_IN_PIN = 2;
const int BTN_IN_PIN = 10;
//const int POT_IN_PIN = PIN_A0;
// count this number of cycles before updating periodMicros
// higher numbers are less sensitive to timing quantization (`micros`
// has 4us precision), but update less often. Higher numbers also reduce
// overhead, as the ISR is getting called very frequently (on the order of
// every 50us for R1=100, R2=4.7M, C=10p)
const int MEASURE_CYCLES = 20;
const unsigned long MAX_PERIOD = MEASURE_CYCLES * 1000;

// wait this long between sending UART reports
const int REPORT_DELAY_MS = 10;

// this tracks how many microseconds per MEASURE_CYLES periods
volatile unsigned long periodMicros;

// default threshold microseconds
int threshMicros = 100*MEASURE_CYCLES;

// used internally for tracking period. Probably don't actually need to be
// volatile but I haven't tested
volatile unsigned long lastMicros;
volatile unsigned int periodCount = 0;

void setup() {
  pinMode(LED_OUT_PIN, OUTPUT);
  pinMode(OSC_IN_PIN, INPUT);
  pinMode(BTN_IN_PIN, INPUT_PULLUP);
  Serial.begin(115200);
  lastMicros = micros();

  //attachInterrupt(INT0, oscISR, RISING);

  // enable INT0 interrupt on change - less overhead than using attachInterrupt()
  EICRA = 0x03;  // enable INT0 for rising edge
  EIMSK = 0x01;  // enable INT0
}

void loop() {
  unsigned long _periodMicros;
  // disable interrupts while we copy the value so we don't get garbage
  noInterrupts();
  _periodMicros = periodMicros;
  interrupts();
  Serial.print("{periodMicros: ");
  Serial.print(_periodMicros);
  Serial.println("}");
  digitalWrite(LED_OUT_PIN, _periodMicros > threshMicros ? HIGH : LOW);
  if(digitalRead(BTN_IN_PIN) == LOW) {
    // set the threshold
    threshMicros = _periodMicros * 1.1;
  }
  delay(REPORT_DELAY_MS);
}


ISR(INT0_vect) {
  unsigned long now = micros();
  ++periodCount;
  if(periodCount == MEASURE_CYCLES) {
    if(now - lastMicros < MAX_PERIOD) {
      // otherwise we probably rolled over, so don't update the period
      periodMicros = now - lastMicros;
    }
    lastMicros = now;
    periodCount = 0;
  }
}
