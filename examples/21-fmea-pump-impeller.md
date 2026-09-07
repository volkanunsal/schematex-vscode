# FMEA: Pump Impeller

A failure mode and effects analysis worksheet for a pump impeller losing flow.

```schematex
fmea "Pump DFMEA"
  item "Impeller" fn "Move fluid"
    mode "No flow"
      effect "Process stops" sev: 8
      cause "Impeller wear" occ: 4
        controls detection: "Flow sensor" det: 5
```
