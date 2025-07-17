# Azure DevOps DSL Parser

This directory contains a Domain-Specific Language (DSL) parser for Azure DevOps work item automation rules. The parser converts human-readable rule definitions into structured `Rule` objects that can be processed by the rule engine.

## Features

- **DSL Parser**: Converts text-based rule definitions into structured objects
- **Rule Engine**: Evaluates and executes rules against work items
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Test Suite**: Comprehensive test coverage for all parser functionality

## Quick Start

```typescript
import { DSLParser, RuleEngine } from './dsl';

// Parse DSL text into rules
const parser = new DSLParser();
const dslText = `
rule "Auto-assign Dev Tasks":
    when me.Title contains "Development" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"
`;

const rules = parser.parse(dslText);

// Execute rules using the rule engine
const ruleEngine = new RuleEngine();
const isApplicable = ruleEngine.evaluateRule(rules[0], triggeringWorkItem, parentWorkItem, childWorkItems);

if (isApplicable) {
    const updateOperations = ruleEngine.executeRule(rules[0], triggeringWorkItem, parentWorkItem, childWorkItems);
    // Apply updateOperations to Azure DevOps
}
```

## DSL Syntax

### Rule Structure
```
rule "Rule Name":
    when <conditions>
    then <actions>
```

### Conditions
- `field operator "value"` - Compare field to constant value
- `field operator other.field` - Compare field to another field
- `and` - Combine multiple conditions

#### Supported Operators
- `matches` - Regex match
- `not matches` - Negative regex match
- `contains` - String contains
- `starts with` - String starts with
- `ends with` - String ends with
- `is` - Exact equality
- `is not` - Not equal

#### Supported Objects
- `me` - The work item that triggered the rule
- `parent` - The parent work item
- `child(condition)` - First child work item matching condition
- `children(condition)` - All child work items matching condition

#### Supported Fields
- `Id` - Work item ID (read-only)
- `Title` - Work item title
- `State` - Work item state
- `AssignedTo` - Assigned user
- `Tags` - Work item tags
- `Reason` - State change reason

### Actions
- `set target = value` - Assign value to target
- `add "value" to field` - Add value to field (e.g., tags)
- `remove "value" from field` - Remove value from field

#### Alter Options
Actions can include options:
- `set with suppressNotifications target = value`
- `set with bypassRules target = value`

## Examples

### Basic Assignment
```
rule "Developer Task Started":
    when me.Title contains "Dev" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"
```

### Conditional Child Updates
```
rule "QA Testing Complete":
    when me.Title matches ".*(Test|QA).*" and me.State is "Closed"
    then set parent.AssignedTo = child(title matches ".*Release.*").AssignedTo
         add "Ready for Deployment" to parent.Tags
```

### Bulk Child Updates
```
rule "Development Complete":
    when me.Title contains "Development" and me.State is "Closed"
    then set children(title contains "Test").State = "Active"
         add "Dev Complete" to me.Tags
```

## API Reference

### DSLParser

```typescript
class DSLParser {
    parse(dslText: string): Rule[]
}
```

Parses DSL text and returns an array of `Rule` objects.

### RuleEngine

```typescript
class RuleEngine {
    evaluateRule(rule: Rule, triggeringWorkItem: WorkItem, parentWorkItem?: WorkItem, childWorkItems?: WorkItem[]): boolean
    executeRule(rule: Rule, triggeringWorkItem: WorkItem, parentWorkItem?: WorkItem, childWorkItems?: WorkItem[]): UpdateOperation[]
}
```

Evaluates rule conditions and generates update operations for Azure DevOps.

### Rule Interface

```typescript
interface Rule {
    name: string;
    when: RuleCondition[];
    then: RuleThenActions[];
}
```

## Error Handling

The parser throws descriptive errors for syntax issues:

```typescript
try {
    const rules = parser.parse(dslText);
} catch (error) {
    console.error('DSL parsing error:', error.message);
}
```

## Testing

Run the test suite:

```bash
npm run build
node dist/src/dsl/DSLParserTests.js
node dist/src/dsl/DSLExample.js
```

## Integration

The DSL parser can be integrated into Azure Functions or other Azure DevOps automation systems:

```typescript
import { DSLParser, RuleEngine } from './dsl';

async function processWorkItemUpdate(workItemWebhook: WorkItemWebhook) {
    // Load rules from configuration
    const dslText = await loadRulesFromConfig();
    
    // Parse rules
    const parser = new DSLParser();
    const rules = parser.parse(dslText);
    
    // Get work item data
    const triggeringWorkItem = await getWorkItem(workItemWebhook.resource.workItemId);
    const parentWorkItem = await getParentWorkItem(triggeringWorkItem);
    const childWorkItems = await getChildWorkItems(parentWorkItem);
    
    // Apply rules
    const ruleEngine = new RuleEngine();
    for (const rule of rules) {
        if (ruleEngine.evaluateRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems)) {
            const updateOperations = ruleEngine.executeRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
            await applyUpdates(updateOperations);
        }
    }
}
```

## Files

- `RuleDefinition.ts` - TypeScript interfaces for rules and operations
- `DSLParser.ts` - Main parser implementation
- `RuleEngine.ts` - Rule evaluation and execution engine
- `DSLParserTests.ts` - Test suite for parser functionality
- `DSLExample.ts` - Comprehensive usage examples
- `index.ts` - Module exports

## License

This DSL parser is part of the Azure DevOps automation project.
