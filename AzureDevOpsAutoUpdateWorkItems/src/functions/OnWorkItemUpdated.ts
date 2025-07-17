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
        context.log('ℹ️ There is no operations to perform.');
        return;
    }

    const workItemUrl = updateOperations[0].url; // Assuming all operations are for the same work item

    context.log(`ℹ️ Sending update operations to ${workItemUrl}`);

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
            context.log('✅ Update operations sent successfully.');
        } catch (error) {
            context.log(`❌ Error sending update operations: ${error}`);
        }
    }

}

export async function OnWorkItemUpdated(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`\n\n** OnWorkItemUpdated: Started **"`);

    if (!request.headers.has('X-ADO-PAT')) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
        return {
            status: 400,
            body: 'X-ADO-PAT header is required'
        };
    }
    const adoPat = request.headers.get('X-ADO-PAT');

    if (!request.headers.has('X-ADO-RULES')) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
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
    context.log(`🐞 Rules:\n${dslRules}`);

    const serviceHook: WorkItemWebhook = await request.json() as WorkItemWebhook;

    if (!await isSupportedEventType(serviceHook)) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
        return {
            status: 400,
            body: `Unsupported event type: ${serviceHook.eventType}`
        };
    }
    context.log(`🐞 Request body:\n${JSON.stringify(serviceHook)}`);

    //const parentHref = serviceHook.resource._links.parent?.href || undefined;
    const parentWorkItem = await getParentWorkItem(adoPat, serviceHook, context);
    if (!parentWorkItem) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
        return {
            status: 400,
            body: `Parent for work item ${serviceHook.resource.workItemId} not found.`
        };
    }

    if (!isRequirementWorkItem(parentWorkItem)) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
        return {
            status: 400,
            body: 'Parent work item is not a requirement, nothing to do.'
        };
    }

    const triggeringWorkItem = await getWorkItem(adoPat, serviceHook.resource._links.parent.href, context);
    if (!triggeringWorkItem) {
        context.log(`\n\n** ❌ OnWorkItemUpdated: Finished with status 400 **"`);
        return {
            status: 400,
            body: `Triggering work item ${serviceHook.resource.workItemId} not found.`
        };
    }

    const childWorkItems = await getChildWorkItems(adoPat, parentWorkItem, context);

    const parser = new DSLParser();
    const rules = parser.parse(dslRules);
    context.log(`🐞 Parsed rules:\n${JSON.stringify(rules)}`);

    context.log(`ℹ️ Triggered Work Item is ${triggeringWorkItem.id}`);
    context.log(`ℹ️ Parent Work Item is ${parentWorkItem.id} with ${childWorkItems.length} child(ren)`);

    
    for (const rule of rules) {
        context.log(`\nℹ️ Evaluating Rule: "${rule.name}"...`);

        const ruleEngine = new RuleEngine();
        
        const isApplicable = ruleEngine.evaluateRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
        
        
        if (isApplicable) {
            context.log(`🐞 Rule is applicable, executing rules...`);
            const updateOperations = ruleEngine.executeRule(rule, triggeringWorkItem, parentWorkItem, childWorkItems);
            context.log(`🐞 Operations to perform:\n${JSON.stringify(updateOperations)}`);
                        
            await performOperations(adoPat, updateOperations, context);

            break;
        }
        else {
            context.log(`ℹ️ Rule is not applicable.`);
        }
    }


    context.log(`\n\n** ✅ OnWorkItemUpdated: Finished with status 200 **"`);

    return {
        status: 200
    };
};

app.http('OnWorkItemUpdated', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: OnWorkItemUpdated
});
