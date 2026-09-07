# Ecomap: Client Support Network

A social worker's ecomap showing a client's relationships to family, work, and care providers.

```schematex
ecomap
center: client [label: "Maria"]
mom [label: "Mother", category: family]
work [label: "Tech Corp", category: work]
therapist [label: "Dr. Patel", category: mental-health]
mom === client
work --- client
therapist <-> client [label: "weekly"]
```
