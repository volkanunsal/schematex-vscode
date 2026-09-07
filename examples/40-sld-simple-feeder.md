# Single-Line Diagram: Simple Feeder

A single-line electrical diagram from the utility down through a transformer and breaker to a panel load.

```schematex
sld "Simple feeder"
util = utility [label: "Utility 13.8kV"]
xfmr = transformer [rating: "500 kVA", voltage: "13.8kV/480V"]
bus1 = bus [voltage: "480V", label: "480V Bus"]
cb1 = breaker [rating: "200A"]
load1 = load [label: "Panel LP-1"]
util -> xfmr
xfmr -> bus1
bus1 -> cb1
cb1 -> load1
```
