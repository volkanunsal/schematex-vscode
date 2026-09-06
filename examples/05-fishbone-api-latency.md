# Fishbone: API Latency Spike

A root-cause analysis for a P99 latency regression after a deploy.

```schematex
fishbone "API latency spike"
effect "P99 > 2 s after deploy"
category code "Code"
category infra "Infra"
category data "Data"
code : "N+1 query in new endpoint"
  - "Missing eager-load on orders"
infra : "DB connection pool exhausted"
  - "Pool size not scaled with new traffic"
data : "Index missing on accounts table"
```
