import { Rule, RuleCondition, RuleThenActions, RuleConstOperand, RuleObjectOperand, UpdateOperation } from './RuleDefinition';

export interface WorkItem {
    id: number;
    url: string;
    fields: {
        [key: string]: any;
        "System.Title": string;
        "System.State": string;
        "System.AssignedTo"?: WorkItemAssignedTo
        "System.Tags"?: string;
        "System.Reason"?: string;
        "System.WorkItemType"?: string;
        "System.AreaPath"?: string;
        "System.TeamProject"?: string;
        "System.IterationPath"?: string;
    };
    relations?: {
        rel: string;
        url: string;
        attributes?: {
            name?: string;
        };
    }[];
}

interface WorkItemAssignedTo {
    displayName: string;
    uniqueName: string;
}

/**
 * Rule engine for evaluating and executing DSL-based rules
 */
export class RuleEngine {
    /**
     * Evaluate if a rule's conditions are met
     */
    public evaluateRule(
        rule: Rule,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): boolean {
        // Evaluate all conditions in the 'when' clause
        for (const condition of rule.when) {
            if (!this.evaluateCondition(condition, triggeringWorkItem, triggeringWorkItem, parentWorkItem, childWorkItems)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Execute the actions of a rule that has been evaluated as true
     */
    public executeRule(
        rule: Rule,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): UpdateOperation[] {
        const updateOperations: UpdateOperation[] = [];

        for (const action of rule.then) {
            const operations = this.executeAction(action, triggeringWorkItem, parentWorkItem, childWorkItems);
            updateOperations.push(...operations);
        }

        return updateOperations;
    }

    /**
     * Evaluate a single condition
     */
    private evaluateCondition(
        condition: RuleCondition,
        implicitWorkItem: WorkItem,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): boolean {
        const leftValue = this.resolveOperand(condition.leftOperand, implicitWorkItem, triggeringWorkItem, parentWorkItem, childWorkItems);
        const rightValue = this.resolveOperand(condition.rightOperand, implicitWorkItem, triggeringWorkItem, parentWorkItem, childWorkItems);

        if (leftValue === undefined || rightValue === undefined) {
            return false;
        }

        const leftStr = String(leftValue);
        const rightStr = String(rightValue);

        switch (condition.operator) {
            case "matches":
                return new RegExp(rightStr).test(leftStr);
            case "not matches":
                return !new RegExp(rightStr).test(leftStr);
            case "is":
                return leftStr === rightStr;
            case "is not":
                return leftStr !== rightStr;
            case "contains":
                return leftStr.includes(rightStr);
            case "starts with":
                return leftStr.startsWith(rightStr);
            case "ends with":
                return leftStr.endsWith(rightStr);
            default:
                return false;
        }
    }

    /**
     * Execute a single action
     */
    private executeAction(
        action: RuleThenActions,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): UpdateOperation[] {
        const operations: UpdateOperation[] = [];
        const targetWorkItems = this.resolveTargetWorkItems(action.assignableLeftOperand, triggeringWorkItem, parentWorkItem, childWorkItems);
        const value = this.resolveOperand(action.valueToAssign, triggeringWorkItem, triggeringWorkItem, parentWorkItem, childWorkItems);

        if (value === undefined) {
            return operations;
        }

        for (const workItem of targetWorkItems) {
            const fieldPath = `/fields/System.${action.assignableLeftOperand.field}`;

            let valueAsString = String(value);
            try {
                if ('uniqueName' in value) { //Only work for WorkItemAssignedTo type
                    valueAsString = String(value.uniqueName);
                }
            }
            catch { }

            switch (action.operator) {
                case "set":
                    operations.push({
                        url: workItem.url,
                        suppressNotifications: action.alterOptions.suppressNotifications,
                        bypassRules: action.alterOptions.bypassRules,
                        op: "replace",
                        path: fieldPath,
                        value: valueAsString
                    });
                    break;

                case "add":
                    // For tags, we need to handle them specially
                    if (action.assignableLeftOperand.field.toLowerCase() === "tags") {
                        const currentTags = workItem.fields["System.Tags"] || "";
                        const tagsArray = currentTags ? currentTags.split("; ") : [];
                        if (!tagsArray.includes(valueAsString)) {
                            tagsArray.push(valueAsString);
                            operations.push({
                                url: workItem.url,
                                suppressNotifications: action.alterOptions.suppressNotifications,
                                bypassRules: action.alterOptions.bypassRules,
                                op: "replace",
                                path: fieldPath,
                                value: tagsArray.join("; ")
                            });
                        }
                    } else {
                        // For other fields, treat as set operation
                        operations.push({
                            url: workItem.url,
                            suppressNotifications: action.alterOptions.suppressNotifications,
                            bypassRules: action.alterOptions.bypassRules,
                            op: "replace",
                            path: fieldPath,
                            value: valueAsString
                        });
                    }
                    break;

                case "remove":
                    // For tags, remove the specific tag
                    if (action.assignableLeftOperand.field.toLowerCase() === "tags") {
                        const currentTags = workItem.fields["System.Tags"] || "";
                        const tagsArray = currentTags ? currentTags.split("; ") : [];
                        const filteredTags = tagsArray.filter(tag => tag !== valueAsString);
                        operations.push({
                            url: workItem.url,
                            suppressNotifications: action.alterOptions.suppressNotifications,
                            bypassRules: action.alterOptions.bypassRules,
                            op: "replace",
                            path: fieldPath,
                            value: filteredTags.join("; ")
                        });
                    }
                    break;
            }
        }

        return operations;
    }

    /**
     * Resolve an operand to its actual value
     */
    private resolveOperand(
        operand: RuleConstOperand | RuleObjectOperand,
        implicitWorkItem: WorkItem,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): any {
        // If it's a constant value
        if ('value' in operand) {
            return operand.value;
        }

        // If it's an object operand
        const workItem = this.getWorkItemForOperand(operand, implicitWorkItem, triggeringWorkItem, parentWorkItem, childWorkItems);
        if (!workItem) {
            return undefined;
        }

        // Map field names to actual work item fields
        const fieldMap: { [key: string]: string } = {
            "Id": "id",
            "Title": "System.Title",
            "State": "System.State",
            "AssignedTo": "System.AssignedTo",
            "Tags": "System.Tags",
            "Reason": "System.Reason",
            "WorkItemType": "System.WorkItemType",
            "AreaPath": "System.AreaPath",
            "TeamProject": "System.TeamProject",
            "IterationPath": "System.IterationPath"
        };

        const actualFieldName = fieldMap[operand.field] || operand.field;

        if (actualFieldName === "id") {
            return workItem.id;
        }

        return workItem.fields[actualFieldName];
    }

    /**
     * Resolve target work items for an action
     */
    private resolveTargetWorkItems(
        operand: RuleObjectOperand,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): WorkItem[] {
        switch (operand.object) {
            case "me":
                return [triggeringWorkItem];

            case "parent":
                return parentWorkItem ? [parentWorkItem] : [];

            case "child":
                // Find the first child that matches conditions
                const matchingChild = this.findMatchingChild(operand.conditions, triggeringWorkItem, parentWorkItem, childWorkItems);
                return matchingChild ? [matchingChild] : [];

            case "children":
                // Find all children that match conditions
                return this.findMatchingChildren(operand.conditions, triggeringWorkItem, parentWorkItem, childWorkItems);

            default:
                return [triggeringWorkItem];
        }
    }

    /**
     * Get the work item referenced by an operand
     */
    private getWorkItemForOperand(
        operand: RuleObjectOperand,
        implicitWorkItem: WorkItem,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): WorkItem | undefined {
        switch (operand.object) {
            case "me":
                return triggeringWorkItem;

            case "parent":
                return parentWorkItem;

            case "child":
                return this.findMatchingChild(operand.conditions, triggeringWorkItem, parentWorkItem, childWorkItems);

            case "children":
                // For children, return the first matching child (this is a limitation)
                return this.findMatchingChild(operand.conditions, triggeringWorkItem, parentWorkItem, childWorkItems);

            case "implicit":
                return implicitWorkItem;

            default:
                return undefined;
        }
    }

    /**
     * Find the first child work item that matches the given conditions
     */
    private findMatchingChild(
        conditions: RuleCondition[] | undefined,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): WorkItem | undefined {
        if (!conditions || conditions.length === 0) {
            return childWorkItems[0]; // Return first child if no conditions
        }

        for (const child of childWorkItems) {
            let allConditionsMet = true;

            for (const condition of conditions) {
                if (!this.evaluateCondition(condition, child, triggeringWorkItem, parentWorkItem, childWorkItems)) {
                    allConditionsMet = false;
                    break;
                }
            }

            if (allConditionsMet) {
                return child;
            }
        }

        return undefined;
    }

    /**
     * Find all child work items that match the given conditions
     */
    private findMatchingChildren(
        conditions: RuleCondition[] | undefined,
        triggeringWorkItem: WorkItem,
        parentWorkItem?: WorkItem,
        childWorkItems: WorkItem[] = []
    ): WorkItem[] {
        if (!conditions || conditions.length === 0) {
            return childWorkItems; // Return all children if no conditions
        }

        const matchingChildren: WorkItem[] = [];

        for (const child of childWorkItems) {
            let allConditionsMet = true;

            for (const condition of conditions) {
                if (!this.evaluateCondition(condition, child, triggeringWorkItem, parentWorkItem, childWorkItems)) {
                    allConditionsMet = false;
                    break;
                }
            }

            if (allConditionsMet) {
                matchingChildren.push(child);
            }
        }

        return matchingChildren;
    }
}
