# UML Class Diagram: Account and Customer

A UML class diagram showing a customer owning a bank account, with a deposit operation.

```schematex
umlclass
class Account {
  + id : String
  - balance : Money
  + deposit(amount : Money) : void
}
class Customer {
  + name : String
}
Customer "1" o-- "*" Account : owns
```
