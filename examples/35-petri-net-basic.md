# Petri Net: Basic Token Flow

A simple Petri net with a marked place firing a transition to move a token forward.

```schematex
petri
  place P1 *1
  transition T1
  place P2
  transition T2
  place P3
  P1 -> T1
  T1 -> P2
  P2 -> T2
  T2 -> P3
  fire: T1
```
