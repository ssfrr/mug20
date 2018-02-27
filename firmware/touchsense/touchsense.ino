const int LED_OUT_PIN = 13;
const int OSC_IN_PIN = 2;

// count this number of cycles before updating periodMicros
// higher numbers are less sensitive to timing quantization (`micros`
// has 4us precision), but update less often. Higher numbers also reduce
// overhead, as the ISR is getting called very frequently (on the order of
// every 50us for R1=100, R2=4.7M, C=10p)
const int MEASURE_CYCLES = 5;
const unsigned long MAX_PERIOD = MEASURE_CYCLES * 1000;

// wait this long between sending UART reports
const int REPORT_DELAY_MS = 10;

// this tracks how many microseconds per MEASURE_CYLES periods
volatile unsigned long periodMicros;

// used internally for tracking period. Probably don't actually need to be
// volatile but I haven't tested
volatile unsigned long lastMicros;
volatile unsigned int periodCount = 0;

void setup() {
  pinMode(LED_OUT_PIN, OUTPUT);
  pinMode(OSC_IN_PIN, INPUT);
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
  digitalWrite(LED_OUT_PIN, _periodMicros > 100*MEASURE_CYCLES ? HIGH : LOW);
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
