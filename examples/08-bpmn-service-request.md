# BPMN: Service Request

A single-lane process for handling an incoming service request.

```schematex
bpmn
pool "Service" {
  lane "Worker" {
    A: start "Request"
    B: task service "Process"
    F: end "Done"
  }
}

flows
A --> B
B --> F
```
