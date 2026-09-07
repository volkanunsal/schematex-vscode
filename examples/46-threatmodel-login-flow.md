# Threat Model: Login Flow

A STRIDE-style data flow diagram for a user logging in through a web server against a user database.

```schematex
threatmodel "Login flow"
external: User
process 1.1: Web Server
datastore D1: User DB
User -> 1.1 : "Login request"
1.1 -> D1 : Lookup
```
