# P&ID: Tank, Pump, and Vessel

A simple piping and instrumentation diagram moving process fluid from a tank through a pump into a vessel.

```schematex
pid

equip T-1 : tank_atm
equip P-1 : pump_centrifugal
equip V-1 : vessel_v

line L1 from T-1.bottom to P-1.in [size: "2\"", type: "process"]
line L2 from P-1.out    to V-1.in [size: "2\"", type: "process"]
```
