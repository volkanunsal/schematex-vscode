# EPC: Order Fulfillment

An event-driven process chain for checking credit before confirming an order.

```schematex
epc "Order fulfilment"
event E1 "Order received"
function F1 "Check credit"
event E2 "Credit OK"
E1 -> F1 -> E2
```
