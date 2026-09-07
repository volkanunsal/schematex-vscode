# Genogram: The Smiths

A three-generation family tree with a divorce, a remarriage, and an identified patient.

```schematex
genogram "The Smiths"
robert [male, 1925, 1998]
helen [female, 1927]
robert -- helen
  john [male, 1950]
  carol [female, 1953]

john [male, 1950]
mary [female, 1952]
john -x- mary
  alice [female, 1975, index]
  ben [male, 1978]

mary [female, 1952]
david [male, 1949]
mary -- david
```
