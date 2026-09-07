# Site Plan: Residential Listing

A residential property site plan with the parcel boundary, road frontage, house, driveway, and a dimension callout.

```schematex
siteplan "Residential Listing Site Plan" unit ft
parcel lot points 0,0 62,0 58,96 8,104 -4,42
road maple "Maple Ave" from -12,-16 to 74,-16 width 22
frontage front from 0,0 to 62,0
setback frontSetback "Front setback" from 5,8 to 57,8
structure house "Residence" points 15,28 45,28 45,64 34,64 34,78 15,78
driveway drive points 52,0 52,32 width 10
tree oak at 9,22 size 8 "Oak"
dim "62 ft frontage" from 0,-30 to 62,-30
scale 20
```
