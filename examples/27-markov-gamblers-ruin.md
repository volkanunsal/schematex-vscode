# Markov Chain: Gambler's Ruin

A four-state Markov chain with two absorbing states, "Broke" and "Rich".

```schematex
markov "Gambler's ruin"
  state Broke "$0" absorbing
  state Rich  "$4" absorbing
  state S1
  state S2
  S1 -> Broke : 0.5
  S1 -> S2 : 0.5
  S2 -> S1 : 0.5
  S2 -> Rich : 0.5
```
