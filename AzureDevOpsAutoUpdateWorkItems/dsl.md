# Azure DevOps DSL Rules Examples

This document provides examples of how to use the Domain-Specific Language (DSL) for defining Azure DevOps work item automation rules.

## DSL Syntax Reference

### Basic Structure
```
rule "Rule Name":
    when <conditions>
    then <actions>
```

### Conditions

- `leftOperand <operator> **rightOperand**` - Left value is compared to right value = the operator
- `and` - Combine multiple conditions (all must be true)

#### Operators

- `matches` - Check if a value matches a regex pattern
- `not matches` - Check if a value does not match a regex pattern
- `contains` - Check if a value contains a substring
- `starts with` - Check if a value starts with a substring
- `ends with` - Check if a value ends with a substring
- `is` - Check if a value is equal to another value
- `is not` - Check if a value is not equal to another value

#### About operands

Left/right operands can be:
- `"value"` - A constant value (string)
- `field` - A field of the work item in the current context:
  - In `when` conditions: refers to the triggering work item (same as `me.field`)
  - In `child(<conditions>)`: refers to the current child work item being evaluated
- `me.field` - The field of the work item that triggered the rule
- `parent.field` - The field of the parent work item
- `child(<condition>).field` - The field of the first child work item that matches the conditions

Assignable left operands can be any operand except a constant value.
In assignable left operands, you can also use:
- `children(<condition>).field` - The field of all child work items that match the conditions. This is useful for bulk update on all child work items that match the conditions.

Supported fields include:
- `Id` - The ID of the work item, this is a read-only field
- `Title` - The title of the work item
- `State` - The state of the work item (e.g., Active, Closed)
- `AssignedTo` - The user to whom the work item is assigned
- `Tags` - The tags associated with the work item
- `Reason` - The reason for the current state of the work item

### Actions

- `set [with <alter-options>] assignableLeftOperand = rightOperand` - Assign the value of the right operand to the left operand
- `add [with <alter-options>] "value" to field` - Add a value to a field (e.g., Tags)
- `remove [with <alter-options>] "value" from field` - Remove a value from a field (e.g., Tags)

#### Alter Options

- `suppressNotifications` - Specifies the change will not trigger hook notifications. This value is implicit if not specified. This value cannot be used with `notifications`.
- `notifications` - Specifies the change will trigger hook notifications. This value cannot be used with `suppressNotifications`.
- `bypassRules` - Specifies the change will bypass rules processing.

## Example Rules

### Development Workflow
```
rule "Developer Task Started":
    when me.Title contains "Dev" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"

rule "Developer Task Finished":
    when me.Title contains "Dev" and me.State is "Closed"
    then set with notifications child(title matches ".*(Test|QA).*").State = "Active"
```

### Testing Workflow
```
rule "QA Testing Complete":
    when me.Title matches ".*(Test|QA).*" and me.State is "Closed"
    then set parent.AssignedTo = child(title matches ".*Release.*").AssignedTo 
         set parent.State = "Active"
```

## Common Use Cases

### 1. Automatic Assignment Based on Task Type
When a developer task becomes active, automatically assign the parent user story to the developer:

```
rule "Auto-assign Dev Tasks":
    when me.Title matches ".*Development.*" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
```

### 2. Status Propagation
When testing is complete, mark the parent for deployment:

```
rule "Testing Complete":
    when me.Title matches ".*Test.*" and me.State is "Closed"
    then add "Ready for Deployment" to parent.Tags         
```
