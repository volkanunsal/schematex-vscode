# Sequential Function Chart: Two-Step Sequence

A minimal SFC with an initial step transitioning to a second step on a trigger.

```schematex
sfc
step S0 [initial]
step S1
transition from: S0 to: S1: Trigger
```
