# Network Topology: Home Network

A small home network with a gateway router serving a wired PC and a wireless laptop.

```schematex
network "Home"
  layout: star
  router gw "Gateway"
  pc pc1
  laptop lt1
  gw -- pc1
  gw -- lt1 : wireless
```
