# Ladder Logic: Motor Start/Stop

A classic start/stop motor control rung using start and stop pushbuttons.

```schematex
ladder "Simple Control"
rung 1 "Start and stop logic":
  XIC(START_PB, "IN 1.0", name="Start Button")
  XIO(STOP_PB, "IN 1.1", name="Stop Button")
  OTE(MOTOR_RUN, "OUT 2.0", name="Motor")
```
