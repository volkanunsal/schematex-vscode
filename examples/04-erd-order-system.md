# ERD: Order System

A minimal customer/order schema in crow's-foot notation, with per-diagram config overriding the theme.

```schematex
---
theme: dark
---
erd
title: "Order System"
table Customer {
  customer_id  int       PK
  email        varchar   UK
  name         varchar   NN
}
table Order {
  order_id     int       PK
  customer_id  int       FK -> Customer.customer_id
  placed_at    timestamp NN
}
table OrderItem {
  order_id     int       PK FK -> Order.order_id
  sku          varchar   PK
  quantity     int       NN
}
ref Order.customer_id many-mandatory -- one-mandatory Customer.customer_id : "places"
ref OrderItem.order_id many-mandatory -- one-mandatory Order.order_id : "contains"
```
