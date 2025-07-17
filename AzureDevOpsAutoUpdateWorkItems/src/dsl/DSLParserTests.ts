import { DSLParser } from './DSLParser';
import { Rule } from './RuleDefinition';

/**
 * Test cases for the DSL Parser
 */
export class DSLParserTests {
    private parser = new DSLParser();

    public runAllTests(): void {
        console.log('Running DSL Parser Tests...\n');

        try {
            this.testBasicRule();
            this.testComplexRule();
            this.testMultipleRules();
            this.testWithAlterOptions();
            this.testAddRemoveActions();
            
            console.log('✅ All tests passed!');
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    private testBasicRule(): void {
        console.log('Test 1: Basic Rule');
        
        const dsl = `
rule "Developer Task Started":
    when me.Title contains "Dev" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"
        `;

        const rules = this.parser.parse(dsl);
        
        console.assert(rules.length === 1, 'Should parse one rule');
        console.assert(rules[0].name === 'Developer Task Started', 'Rule name should match');
        console.assert(rules[0].when.length === 2, 'Should have two conditions');
        console.assert(rules[0].then.length === 2, 'Should have two actions');
        
        console.log('✓ Basic rule test passed\n');
    }

    private testComplexRule(): void {
        console.log('Test 2: Complex Rule with Child Conditions');
        
        const dsl = `
rule "QA Testing Complete":
    when me.Title matches ".*(Test|QA).*" and me.State is "Closed"
    then set parent.AssignedTo = child(title matches ".*Release.*").AssignedTo 
         set parent.State = "Active"
        `;

        const rules = this.parser.parse(dsl);
        
        console.assert(rules.length === 1, 'Should parse one rule');
        console.assert(rules[0].when[0].operator === 'matches', 'First condition should use matches operator');
        console.assert((rules[0].then[0].valueToAssign as any).object === 'child', 'Should reference child object');
        
        console.log('✓ Complex rule test passed\n');
    }

    private testMultipleRules(): void {
        console.log('Test 3: Multiple Rules');
        
        const dsl = `
rule "Auto-assign Dev Tasks":
    when me.Title matches ".*Development.*" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo

rule "Testing Complete":
    when me.Title matches ".*Test.*" and me.State is "Closed"
    then add "Ready for Deployment" to parent.Tags
        `;

        const rules = this.parser.parse(dsl);
        
        console.assert(rules.length === 2, 'Should parse two rules');
        console.assert(rules[0].name === 'Auto-assign Dev Tasks', 'First rule name should match');
        console.assert(rules[1].name === 'Testing Complete', 'Second rule name should match');
        
        console.log('✓ Multiple rules test passed\n');
    }

    private testWithAlterOptions(): void {
        console.log('Test 4: Actions with Alter Options');
        
        const dsl = `
rule "Task with Options":
    when me.State is "Active"
    then set with suppressNotifications bypassRules parent.State = "Active"
        `;

        const rules = this.parser.parse(dsl);
        
        console.assert(rules.length === 1, 'Should parse one rule');
        console.assert(rules[0].then[0].alterOptions.suppressNotifications === true, 'Should have suppressNotifications option');
        console.assert(rules[0].then[0].alterOptions.bypassRules === true, 'Should have bypassRules option');
        
        console.log('✓ Alter options test passed\n');
    }

    private testAddRemoveActions(): void {
        console.log('Test 5: Add and Remove Actions');
        
        const dsl = `
rule "Tag Management":
    when me.State is "Completed"
    then add "Done" to me.Tags
         remove "In Progress" from me.Tags
        `;

        const rules = this.parser.parse(dsl);
        
        console.assert(rules.length === 1, 'Should parse one rule');
        console.assert(rules[0].then.length === 2, 'Should have two actions');
        console.assert(rules[0].then[0].operator === 'add', 'First action should be add');
        console.assert(rules[0].then[1].operator === 'remove', 'Second action should be remove');
        console.assert((rules[0].then[0].valueToAssign as any).value === 'Done', 'Add value should be "Done"');
        console.assert((rules[0].then[1].valueToAssign as any).value === 'In Progress', 'Remove value should be "In Progress"');
        
        console.log('✓ Add/Remove actions test passed\n');
    }

    public printParsedRule(dsl: string): void {
        console.log('=== DSL Input ===');
        console.log(dsl);
        console.log('\n=== Parsed Output ===');
        
        const rules = this.parser.parse(dsl);
        console.log(JSON.stringify(rules, null, 2));
        console.log('\n');
    }
}

// Example usage and manual testing
if (require.main === module) {
    const tests = new DSLParserTests();
    tests.runAllTests();
    
    // Demo with example from documentation
    console.log('\n=== Demo: Development Workflow Example ===');
    const developmentWorkflowDSL = `
rule "Developer Task Started":
    when me.Title contains "Dev" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"

rule "Developer Task Finished":
    when me.Title contains "Dev" and me.State is "Closed"
    then set with notifications child(title matches ".*(Test|QA).*").State = "Active"
    `;
    
    tests.printParsedRule(developmentWorkflowDSL);
}
