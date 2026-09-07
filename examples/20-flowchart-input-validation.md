# Flowchart: Input Validation

A basic decision flowchart branching on whether input passes validation.

```schematex
flowchart TD
  start([Start]) --> check{Valid input?}
  check -->|Yes| process[Process data]
  check -->|No| error[Return error]
  process --> done([End])
  error --> done
```
