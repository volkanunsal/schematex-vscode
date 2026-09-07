# Event Tree: Smoke Detector Demand

An event tree analysis of outcomes following a fire, based on detector and suppression success.

```schematex
eventtree "Smoke detector demand"
  initiating FIRE "Fire starts" freq: 0.01
  function D "Detector actuates" p: 0.02
  function S "Suppression works" p: 0.05
  outcome s s -> "Controlled"
  outcome s f -> "Damage, contained"
  outcome f * -> "Uncontrolled fire"
```
