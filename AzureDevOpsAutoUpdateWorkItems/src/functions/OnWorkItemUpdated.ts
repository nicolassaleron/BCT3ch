import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios from "axios";
import { RuleEngine, WorkItem, UpdateOperation, DSLParser } from "../dsl";
import { getParentWorkItem, getWorkItem, getChildWorkItems, WorkItemWebhook, sendUpdateOperations } from "../wi";


/**
 * Returns a value indicating whether the Azure DevOps service hook is related to a supported event.
 * @param serviceHook 
 * @returns 
 */
async function isSupportedEventType(serviceHook: WorkItemWebhook): Promise<boolean> {
    return (serviceHook.eventType === 'workitem.updated');
}


/**
 * Checks if the given work item is a requirement work item.
 * @param workItem The work item to check
 * @returns True if the work item is a requirement, false otherwise
 */
function isRequirementWorkItem(workItem: WorkItem): boolean {
    return (
        workItem.fields["System.WorkItemType"] === "User Story" ||
        workItem.fields["System.WorkItemType"] === "Bug"
    );
}


async function performOperations(adoPat: string, updateOperations: UpdateOperation[], context: InvocationContext): Promise<void> {
    if (updateOperations.length === 0) {
        context.log('\n\nNo update operations to send.');
        return;
    }

    const workItemUrl = updateOperations[0].url; // Assuming all operations are for the same work item

    context.log(`\n\nSending update operations to ${workItemUrl}`);

    //Group operations by work item URL
    const groupedOperations: { [key: string]: UpdateOperation[] } = {};
    for (const operation of updateOperations) {
        if (!groupedOperations[operation.url]) {
            groupedOperations[operation.url] = [];
        }
        groupedOperations[operation.url].push(operation);
    }
    

    // Iterate over each work item URL
    for (const url in groupedOperations) {
        const operations = groupedOperations[url];

        try {
            sendUpdateOperations(adoPat, operations, context);
            context.log('\nUpdate operations sent successfully.');
        } catch (error) {
            context.log(`\nError sending update operations: ${error}`);
        }
    }

}

export async function OnWorkItemUpdated(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`\n\nHttp function processed request for url "${request.url}"`);

    if (!request.headers.has('X-ADO-PAT')) {
        return {
            status: 400,
            body: 'X-ADO-PAT header is required'
        };
    }
    const adoPat = request.headers.get('X-ADO-PAT');

    if (!request.headers.has('X-ADO-RULES')) {
        return {
            status: 400,
            body: 'X-ADO-RULES header is required'
        };
    }
    const adoRules = request.headers.get('X-ADO-RULES');

    const adoRulesResponse = await axios.get(
        adoRules, {
        headers: {
            'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`
        }
    });
    const dslRules = adoRulesResponse.data;
    context.log(`\nRaw rules to apply: ${dslRules}`);

    const serviceHook: WorkItemWebhook = await request.json() as WorkItemWebhook;

    if (!await isSupportedEventType(serviceHook)) {
        return {
            status: 400,
            body: `Unsupported event type: ${serviceHook.eventType}`
        };
    }

    //const parentHref = serviceHook.resource._links.parent?.href || undefined;
    const parentWorkItem = await getParentWorkItem(adoPat, serviceHook, context);
    if (!parentWorkItem) {
        return {
            status: 400,
            body: `Parent for work item ${serviceHook.resource.workItemId} not found.`
        };
    }

    if (!isRequirementWorkItem(parentWorkItem)) {
        return {
            status: 400,
            body: 'Parent work item is not a requirement, nothing to do.'
        };
    }

    const triggeringWorkItem = await getWorkItem(adoPat, serviceHook.resource._links.parent.href, context);
    if (!triggeringWorkItem) {
        return {
            status: 400,
            body: `Triggering work item ${serviceHook.resource.workItemId} not found.`
        };
    }

    const childWorkItems = await getChildWorkItems(adoPat, parentWorkItem, context);

    const parser = new DSLParser();
    const rules = parser.parse(dslRules);
    context.log(`\nParsed rules to apply: ${JSON.stringify(rules)}`);

    
    for (const rule of rules) {
        console.log(`\n--- Evaluating Rule: "${rule.name}" ---`);

        const ruleEngine = new RuleEngine();
        
        const isApplicable = ruleEngine.evaluateRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
        console.log(`Rule applicable: ${isApplicable}`);
        
        if (isApplicable) {
            const updateOperations = ruleEngine.executeRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
            console.log('Update operations:', JSON.stringify(updateOperations, null, 2));
            
            await performOperations(adoPat, updateOperations, context);

            break;
        }
    }

    return {
        status: 200
    };
};

app.http('OnWorkItemUpdated', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: OnWorkItemUpdated
});
