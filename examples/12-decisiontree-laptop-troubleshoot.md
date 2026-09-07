# Decision Tree: Laptop Troubleshooting

A simple yes/no diagnostic flow for a laptop that won't display anything.

```schematex
decisiontree "Laptop troubleshoot"

  question "Does it power on?"
    yes: answer "Check display — connect external monitor"
    no: question "Is the charger light on?"
      yes: answer "Hold power button 10 s — try again"
      no: answer "Check outlet and charging cable"
```
