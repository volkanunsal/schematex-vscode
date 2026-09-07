# State Diagram: Simple Running State

A minimal state diagram with a start pseudostate entering a running state that completes back to the end.

```schematex
stateDiagram-v2
[*] --> Running
Running --> [*] : done
```
