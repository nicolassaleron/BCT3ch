# AL Page Scripting to Documentation

These rules are used to generate consistent, friendly and accurate step-by-step end user documentation from YAML files created with the AL Page Scripting feature.

## Rule 1: Use Clear and Concise Language

- Use simple and straightforward language.
- Avoid jargon or technical terms that may not be familiar to the end user.
- Use active voice to make instructions clear and direct.
- Keep sentences short and to the point.
- Use bullet points or numbered lists for steps to enhance readability.

## Rule 2: Provide Context

- Start with a brief introduction to the task or feature being documented.
- Explain why the task is important or how it benefits the user.
- Provide any necessary background information that will help the user understand the context of the task.
- You can reference documentation from https://learn.microsoft.com/en-us/dynamics365/business-central/
  for additional context, but do not rely on it as the sole source of information.

## Rule 3: Use Step-by-Step Instructions

- Break down the task into clear, manageable steps.
- Keep focus on one action per step to avoid confusion.
- Use emojis or icons to visually represent actions when appropriate.

## Rule 4: Do Not Use Embedded Values from YAML

- Avoid using embedded values in the documentation.
- Instead, use placeholders or general terms that can be easily understood by the user.
- Write validation rules in a way that the user can check their input without needing to reference specific values from the YAML file.

### Example 1

```yaml
  # This is an example of a YAML file that would be used to generate documentation.
  - type: input
    target:
      - page: Sales Order
        runtimeRef: b15w
      - part: SalesLines
      - page: Sales Order Subform
      - repeater: Control1
      - field: Quantity
    value: "10"
    description: Input <value>10</value> into <caption>Quantité</caption>
```
Good Documentation:
```markdown
1. In the **Quantity** field, enter the desired quantity of the item you are adding to the sales order.
```

Bad Documentation:
```markdown
1. In the **Quantity** field, enter a value of _10_.
```

### Example 2

```yaml
  # This is an example of a YAML file that would be used to generate documentation.
  - type: validate
    target:
      - page: Sales Order
        runtimeRef: b15w
      - part: SalesLines
      - page: Sales Order Subform
      - field: Total Amount Incl. VAT
    operation: =
    value: 12000
    description: Valider <caption>Total TTC (EUR)</caption>
      <operation>est</operation> <value>12 000,00</value>
```

Good Documentation:
```markdown
> Ensure that the **Total Amount Incl. VAT** field equals the expected value.
```

Bad Documentation:
```markdown
1. Validate that the **Total Amount Incl. VAT** field is equal to _12,000.00_.
```