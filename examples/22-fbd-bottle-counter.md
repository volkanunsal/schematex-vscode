# Function Block Diagram: Bottle Counter

An IEC 61131-3 style function block diagram debouncing a sensor and counting bottles in a batch.

```schematex
fbd "Bottle Counter"

var BottleSensor: bool
var BatchDone: bool
var BatchSize: counter

network 0 "Debounce sensor":
  Dwell = TON(IN: BottleSensor, PT: T#50ms)

network 1 "Count bottles":
  Pulse = R_TRIG(CLK: Dwell.Q)
  BatchSize = CTU(CU: Pulse.Q, R: BatchDone, PV: 24)
```
