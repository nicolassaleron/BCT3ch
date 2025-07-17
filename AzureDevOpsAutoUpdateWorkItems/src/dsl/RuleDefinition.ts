/**
 * Represents a rule for assigning and updating parent work items based on child work item states.
 */
export interface Rule {
    name: string;
    when: RuleCondition[];
    then: RuleThenActions[];
}

/**
 * Represents the conditions under which a rule is applied.
 */
export interface RuleCondition {
    leftOperand: RuleConstOperand | RuleObjectOperand;
    operator: "matches" | "not matches" | "is" | "is not" | "contains" | "starts with" | "ends with";
    rightOperand: RuleConstOperand | RuleObjectOperand;
}

/**
 * Represents the actions to be taken when a rule condition is met.
 */
export interface RuleThenActions {
    operator: "set" | "add" | "remove";
    alterOptions: RuleAlterOptions;
    assignableLeftOperand: RuleObjectOperand;
    valueToAssign: RuleConstOperand | RuleObjectOperand;
}

/**
 * Represents a constant operand in a rule condition or action.
 */
export interface RuleConstOperand {
    value: string;
}

/**
 * Represents an operand that refers to a work item object in a rule condition or action.
 */
export interface RuleObjectOperand {
    object: "implicit" | "me" | "parent" | "child" | "children";
    conditions?: RuleCondition[];
    field: string;
}

/**
 * Represents the options for altering the way the action is done.
 */
export interface RuleAlterOptions {
    suppressNotifications?: boolean;
    bypassRules?: boolean;
}

/**
 * Represents an update operation to be applied to a work item.
 */
export interface UpdateOperation {
    url: string;
    suppressNotifications?: boolean;
    bypassRules?: boolean;
    op: "replace";
    path: string;
    value: string;
}

