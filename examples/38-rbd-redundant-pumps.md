# Reliability Block Diagram: Redundant Pumps

A reliability block diagram for two pumps in a parallel (redundant) configuration.

```schematex
rbd "Two redundant pumps"
  parallel {
    block A "Pump A" R=0.9
    block B "Pump B" R=0.9
  }
```
