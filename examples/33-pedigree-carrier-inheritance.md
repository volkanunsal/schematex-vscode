# Pedigree: Carrier Inheritance

A two-generation pedigree tracking a carrier couple and their affected proband.

```schematex
pedigree
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, affected, proband]
    II-2 [female, unaffected]
```
