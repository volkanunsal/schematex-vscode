# Sociogram: Study Group

A sociogram of a small study group showing friendships and a rivalry.

```schematex
sociogram "Study group"
  alice [label: "Alice"]
  bob [label: "Bob"]
  carol [label: "Carol"]
  dave [label: "Dave"]
  alice <-> bob [label: "lab partners"]
  carol -> alice
  dave -x> bob [label: "rivalry"]
```
