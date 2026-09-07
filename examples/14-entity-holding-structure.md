# Entity Structure: Simple Holding

A minimal corporate holding structure with a parent LLC and two wholly-owned subsidiaries.

```schematex
entity-structure "Simple holding"
entity holdco "Holdco LLC" llc@DE
entity opco "OpCo Inc." corp@DE
entity sub_uk "UK Sub Ltd." llc@UK
holdco -> opco : 100%
holdco -> sub_uk : 100%
```
