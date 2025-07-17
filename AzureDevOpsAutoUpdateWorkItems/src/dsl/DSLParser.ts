import { Rule, RuleCondition, RuleThenActions, RuleConstOperand, RuleObjectOperand, RuleAlterOptions } from './RuleDefinition';

/**
 * DSL Parser for Azure DevOps work item automation rules
 */
export class DSLParser {
    private lines: string[] = [];
    private currentIndex: number = 0;

    /**
     * Parse DSL text into an array of Rule objects
     */
    public parse(dslText: string): Rule[] {
        this.lines = dslText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#')); // Remove empty lines and comments
        
        this.currentIndex = 0;
        const rules: Rule[] = [];

        while (this.currentIndex < this.lines.length) {
            const rule = this.parseRule();
            if (rule) {
                rules.push(rule);
            }
        }

        return rules;
    }

    private parseRule(): Rule | null {
        const line = this.getCurrentLine();
        if (!line || !line.startsWith('rule ')) {
            this.currentIndex++;
            return null;
        }

        // Extract rule name
        const nameMatch = line.match(/^rule\s+"([^"]+)":\s*$/);
        if (!nameMatch) {
            throw new Error(`Invalid rule syntax at line ${this.currentIndex + 1}: ${line}`);
        }

        const name = nameMatch[1];
        this.currentIndex++;

        // Parse when conditions
        const whenConditions = this.parseWhenConditions();
        
        // Parse then actions
        const thenActions = this.parseThenActions();

        return {
            name,
            when: whenConditions,
            then: thenActions
        };
    }

    private parseWhenConditions(): RuleCondition[] {
        const conditions: RuleCondition[] = [];
        
        if (!this.getCurrentLine()?.trim().startsWith('when ')) {
            throw new Error(`Expected 'when' clause at line ${this.currentIndex + 1}`);
        }

        let conditionText = this.getCurrentLine().replace(/^\s*when\s+/, '');
        this.currentIndex++;

        // Handle multi-line conditions
        while (this.currentIndex < this.lines.length && 
               !this.getCurrentLine()?.trim().startsWith('then ') &&
               this.getCurrentLine()?.trim() !== '') {
            conditionText += ' ' + this.getCurrentLine().trim();
            this.currentIndex++;
        }

        // Split by 'and' but preserve quotes
        const conditionParts = this.splitByAndPreservingQuotes(conditionText);
        
        for (const part of conditionParts) {
            const condition = this.parseCondition(part.trim());
            if (condition) {
                conditions.push(condition);
            }
        }

        return conditions;
    }

    private parseThenActions(): RuleThenActions[] {
        const actions: RuleThenActions[] = [];

        if (!this.getCurrentLine()?.trim().startsWith('then ')) {
            throw new Error(`Expected 'then' clause at line ${this.currentIndex + 1}`);
        }

        let actionText = this.getCurrentLine().replace(/^\s*then\s+/, '');
        this.currentIndex++;

        // Handle multi-line actions
        while (this.currentIndex < this.lines.length && 
               !this.getCurrentLine()?.startsWith('rule ') &&
               this.getCurrentLine()?.trim() !== '') {
            actionText += ' ' + this.getCurrentLine().trim();
            this.currentIndex++;
        }

        // Split actions by looking for action keywords
        const actionParts = this.splitActions(actionText);
        
        for (const part of actionParts) {
            const action = this.parseAction(part.trim());
            if (action) {
                actions.push(action);
            }
        }

        return actions;
    }

    private parseCondition(conditionText: string): RuleCondition | null {
        // Match operators - order matters! Check longer operators first
        const operatorRegex = /(not matches|starts with|ends with|matches|contains|is not|is)/;
        
        // Find the operator match
        const operatorMatch = conditionText.match(operatorRegex);
        if (!operatorMatch) {
            return null;
        }

        const operator = operatorMatch[0] as RuleCondition['operator'];
        const operatorIndex = operatorMatch.index!;
        
        const leftText = conditionText.substring(0, operatorIndex).trim();
        const rightText = conditionText.substring(operatorIndex + operator.length).trim();

        return {
            leftOperand: this.parseOperand(leftText),
            operator,
            rightOperand: this.parseOperand(rightText)
        };
    }

    private parseAction(actionText: string): RuleThenActions | null {
        // Parse set action: set [with <options>] leftOperand = rightOperand
        const setMatch = actionText.match(/^set(?:\s+with\s+([^=]+?))?\s+([^=]+?)\s*=\s*(.+)$/);
        if (setMatch) {
            const alterOptions = this.parseAlterOptions(setMatch[1]);
            const leftOperand = this.parseOperand(setMatch[2].trim()) as RuleObjectOperand;
            const valueToAssign = this.parseOperand(setMatch[3].trim());

            return {
                operator: 'set',
                alterOptions,
                assignableLeftOperand: leftOperand,
                valueToAssign
            };
        }

        // Parse add action: add [with <options>] "value" to field
        const addMatch = actionText.match(/^add(?:\s+with\s+([^"]+?))?\s+"([^"]+)"\s+to\s+(.+)$/);
        if (addMatch) {
            const alterOptions = this.parseAlterOptions(addMatch[1]);
            const value = addMatch[2];
            const field = this.parseOperand(addMatch[3].trim()) as RuleObjectOperand;

            return {
                operator: 'add',
                alterOptions,
                assignableLeftOperand: field,
                valueToAssign: { value }
            };
        }

        // Parse remove action: remove [with <options>] "value" from field
        const removeMatch = actionText.match(/^remove(?:\s+with\s+([^"]+?))?\s+"([^"]+)"\s+from\s+(.+)$/);
        if (removeMatch) {
            const alterOptions = this.parseAlterOptions(removeMatch[1]);
            const value = removeMatch[2];
            const field = this.parseOperand(removeMatch[3].trim()) as RuleObjectOperand;

            return {
                operator: 'remove',
                alterOptions,
                assignableLeftOperand: field,
                valueToAssign: { value }
            };
        }

        return null;
    }

    private parseOperand(operandText: string): RuleConstOperand | RuleObjectOperand {
        operandText = operandText.trim();

        // Check if it's a quoted string (constant value)
        if (operandText.startsWith('"') && operandText.endsWith('"')) {
            return {
                value: operandText.slice(1, -1) // Remove quotes
            };
        }

        // Check for object operands with conditions like child(condition)
        const objectWithConditionMatch = operandText.match(/^(child|children)\(([^)]+)\)\.(.+)$/);
        if (objectWithConditionMatch) {
            const object = objectWithConditionMatch[1] as "child" | "children";
            const conditionText = objectWithConditionMatch[2];
            const field = objectWithConditionMatch[3];

            // Parse the condition inside parentheses
            const condition = this.parseCondition(conditionText);
            const conditions = condition ? [condition] : [];

            return {
                object,
                conditions,
                field
            };
        }

        // Check for simple object operands like me.field, parent.field
        const objectMatch = operandText.match(/^(me|parent|child|children)\.(.+)$/);
        if (objectMatch) {
            return {
                object: objectMatch[1] as "me" | "parent" | "child" | "children",
                field: objectMatch[2]
            };
        }

        // If no object prefix, assume it's referring to 'me' in the current context
        return {
            object: "implicit",
            field: operandText
        };
    }

    private parseAlterOptions(optionsText: string | undefined): RuleAlterOptions {
        const options: RuleAlterOptions = {};

        if (!optionsText) {
            return options;
        }

        if (optionsText.includes('notifications')) {
            options.suppressNotifications = false;
        }

        if (optionsText.includes('bypassRules')) {
            options.bypassRules = true;
        }

        return options;
    }

    private splitByAndPreservingQuotes(text: string): string[] {
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < text.length) {
            const char = text[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                current += char;
            } else if (!inQuotes && i + 5 <= text.length && text.substring(i, i + 5) === ' and ') {
                parts.push(current.trim());
                current = '';
                i += 4; // Skip the ' and '
            } else {
                current += char;
            }
            i++;
        }

        if (current.trim()) {
            parts.push(current.trim());
        }

        return parts;
    }

    private splitActions(text: string): string[] {
        const actions: string[] = [];
        const actionKeywords = ['set', 'add', 'remove'];
        
        let current = '';
        let i = 0;

        while (i < text.length) {
            // Look for action keywords at word boundaries
            let foundKeyword = false;
            
            if (current.trim() && (i === 0 || text[i - 1] === ' ')) {
                for (const keyword of actionKeywords) {
                    if (text.substring(i, i + keyword.length) === keyword && 
                        (i + keyword.length >= text.length || text[i + keyword.length] === ' ')) {
                        
                        if (current.trim()) {
                            actions.push(current.trim());
                        }
                        current = keyword;
                        i += keyword.length;
                        foundKeyword = true;
                        break;
                    }
                }
            }

            if (!foundKeyword) {
                current += text[i];
                i++;
            }
        }

        if (current.trim()) {
            actions.push(current.trim());
        }

        return actions;
    }

    private getCurrentLine(): string | undefined {
        return this.currentIndex < this.lines.length ? this.lines[this.currentIndex] : undefined;
    }
}
