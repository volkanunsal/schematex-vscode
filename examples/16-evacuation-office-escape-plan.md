# Evacuation Plan: Office Escape Route

A compliance-annotated escape route from an open office to the nearest final exit.

```schematex
evacuation "Office Escape Plan" unit m
compliance iso
sheet a3 landscape
room office "Open Office" at 0,0 size 6x5
room lobby "Lift Lobby" below office size 6x2.4
opening between office lobby at 50% width 1.6
here in office at 3,2.5
exit-final x1 in lobby at 3,1.2 side south "EXIT"
route primary here -> lobby -> x1
```
