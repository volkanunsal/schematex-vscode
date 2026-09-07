# Block Diagram: Temperature Control Loop

A PID feedback loop for a heater, with a summing junction comparing setpoint to measured temperature.

```schematex
blockdiagram "Temperature control"
ctrl = block("PID") [role: controller]
plant = block("Heater") [role: plant]
sensor = block("Thermocouple") [role: sensor]
err = sum(+ref, -measured)
ref = signal("Setpoint")
measured = signal("T_measured")
ref -> err
err -> ctrl
ctrl -> plant
plant -> measured
measured -> sensor
sensor -> err
```
