import { DSLParser } from './DSLParser';
import { RuleEngine, WorkItem } from './RuleEngine';
import { Rule } from './RuleDefinition';

/**
 * Comprehensive example demonstrating the DSL Parser and Rule Engine
 */
export class DSLExample {
    private parser = new DSLParser();
    private ruleEngine = new RuleEngine();

    public runExample(): void {
        console.log('=== DSL Parser and Rule Engine Example ===\n');

        // Example DSL rules
        const dslText = `
rule "Developer Task Started":
    when me.Title contains "Dev" and me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"

rule "QA Testing Complete":
    when me.Title matches ".*(Test|QA).*" and me.State is "Closed"
    then set parent.AssignedTo = child(title matches ".*Release.*").AssignedTo 
         set parent.State = "Active"
         add "Ready for Deployment" to parent.Tags

rule "Development Complete":
    when me.Title contains "Development" and me.State is "Closed"
    then set children(title contains "Test").State = "Active"
         add "Dev Complete" to me.Tags
        `;

        console.log('=== Parsing DSL ===');
        console.log(dslText);
        console.log('\n=== Parsed Rules ===');

        const rules: Rule[] = this.parser.parse(dslText);
        console.log(JSON.stringify(rules, null, 2));

        console.log('\n=== Rule Evaluation Example ===');

        // Mock work items for testing
        const triggeringWorkItem: WorkItem = {
            id: 123,
            url: "https://dev.azure.com/org/project/_apis/wit/workItems/123",
            fields: {
                "System.Title": "Dev Task: Implement user login",
                "System.State": "Active",
                "System.AssignedTo": {
                    displayName: "John Developer",
                    uniqueName: "john.developer@company.com"
                },
                "System.Tags": "",
                "System.Reason": "New"
            }
        };

        const parentWorkItem: WorkItem = {
            id: 100,
            url: "https://dev.azure.com/org/project/_apis/wit/workItems/100",
            fields: {
                "System.Title": "User Story: User Authentication",
                "System.State": "New",
                "System.Tags": "",
                "System.Reason": "New"
            }
        };

        const childWorkItems: WorkItem[] = [
            {
                id: 124,
                url: "https://dev.azure.com/org/project/_apis/wit/workItems/124",
                fields: {
                    "System.Title": "Test Task: User login tests",
                    "System.State": "New",
                    "System.AssignedTo": {
                        displayName: "Jane Tester",
                        uniqueName: "jane.tester@company.com"
                    },
                    "System.Tags": "",
                    "System.Reason": "New"
                }
            },
            {
                id: 125,
                url: "https://dev.azure.com/org/project/_apis/wit/workItems/125",
                fields: {
                    "System.Title": "Release Task: Deploy login feature",
                    "System.State": "New",
                    "System.AssignedTo": {
                        displayName: "Bob Deployer",
                        uniqueName: "bob.deployer@company.com"
                    },
                    "System.Tags": "",
                    "System.Reason": "New"
                }
            }
        ];

        // Test each rule
        for (const rule of rules) {
            console.log(`\n--- Evaluating Rule: "${rule.name}" ---`);

            const isApplicable = this.ruleEngine.evaluateRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
            console.log(`Rule applicable: ${isApplicable}`);

            if (isApplicable) {
                const updateOperations = this.ruleEngine.executeRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
                console.log('Update operations:', JSON.stringify(updateOperations, null, 2));
            }
        }

        console.log('\n=== Testing Different Scenarios ===');

        // Scenario 2: QA Task completed
        const qaTask: WorkItem = {
            id: 124,
            url: "https://dev.azure.com/org/project/_apis/wit/workItems/124",
            fields: {
                "System.Title": "QA Testing: User login validation",
                "System.State": "Closed",
                "System.AssignedTo": {
                    displayName: "Jane Tester",
                    uniqueName: "jane.tester@company.com"
                },
                "System.Tags": "",
                "System.Reason": "Fixed"
            }
        };

        console.log('\n--- Testing QA Task Completed ---');
        for (const rule of rules) {
            if (rule.name === "QA Testing Complete") {
                const isApplicable = this.ruleEngine.evaluateRule(rule, qaTask, parentWorkItem, childWorkItems);
                console.log(`Rule "${rule.name}" applicable: ${isApplicable}`);

                if (isApplicable) {
                    const updateOperations = this.ruleEngine.executeRule(rule, qaTask, parentWorkItem, childWorkItems);
                    console.log('Update operations:', JSON.stringify(updateOperations, null, 2));
                }
            }
        }
    }

    public parseAndValidateDSL(dslText: string): { success: boolean; rules?: Rule[]; error?: string } {
        try {
            const rules = this.parser.parse(dslText);
            return { success: true, rules };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    const example = new DSLExample();
    example.runExample();
}
