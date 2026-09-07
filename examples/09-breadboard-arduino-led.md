# Breadboard: Arduino LED Circuit

An Arduino Uno driving an LED through a current-limiting resistor.

```schematex
breadboard
parts
  uno: mcu uno @beside-left
  r1:  resistor 220 @5e..9e
  d1:  led red @10e..10f

wires
  uno:5V  --red--   @+t1
  uno:GND --black-- @-t1
  uno:D13 --yellow-- @5a
  @10j    --black-- @-t1
```
