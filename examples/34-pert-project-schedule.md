# PERT: Project Schedule

A PERT/CPM network for a small project with dependent research, design, and build tasks.

```schematex
pert
unit: days

task A "Market research" duration: 5
task B "Design mockups"  duration: 8 after: A
task C "Backend API"     duration: 15 after: A
task D "Frontend build"  duration: 10 after: B, C
```
