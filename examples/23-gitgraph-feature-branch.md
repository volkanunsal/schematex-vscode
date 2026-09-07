# Git Graph: Feature Branch and Merge

A short commit history with a develop branch merged back into main as a tagged release.

```schematex
gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit tag: "v0.1"
  checkout main
  merge develop tag: "v1.0"
```
