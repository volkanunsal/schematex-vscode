# Timing Diagram: SPI Transaction

A timing diagram for a single SPI transaction across clock, chip-select, and data lines.

```schematex
timing "SPI Transaction"
CLK:   pppppppp
CS_N:  10000001
MOSI:  x=======  data: ["0xAB","0xCD","0xEF","0x01"]
MISO:  zzzz====  data: ["","","","","0xFF","0x12"]
```
