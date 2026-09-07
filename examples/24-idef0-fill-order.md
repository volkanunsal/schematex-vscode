# IDEF0: Fill Order

An IDEF0 function model for receiving a customer order, with its inputs, controls, mechanisms, and output.

```schematex
idef0 "Fill order"
function A1 "Receive order"
input     A1 "Customer request"
control   A1 "Order policy"
mechanism A1 "Order clerk"
output    A1 "Confirmed order"
```
