# Fault Tree: Redundant Pump Failure

A fault tree analysis for the top event where both redundant pumps fail simultaneously.

```schematex
faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01
```
