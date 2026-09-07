# Causal Loop: Product Adoption

A reinforcing feedback loop between adoption rate and the number of adopters.

```schematex
causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +
loop R1 "Word of mouth"
```
