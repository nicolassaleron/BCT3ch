import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios from "axios";

interface WorkItemWebhook {
    eventType: string;
    resource: {
        workItemId: number;
        fields?: {
            "System.WorkItemType": string;
            "System.State"?: {
                oldValue?: string;
                newValue?: string;
            };
            "System.Parent": string;
            "System.AssignedTo"?: {
                oldValue?: string;
                newValue?: string;
            };
        };
        revision: {
            fields: {
                "System.State": string;
                "System.WorkItemType": string;
                "System.Parent": number;
                "System.Title": string;
            }
            relations: {
                rel: string;
                url: string;
                attributes?: {
                    name?: string;
                };
            }[];
        };
        _links: {
            self: {
                href: string;
            };
        };
    };
    resourceContainers: {
        project: {
            id: string;
            baseUrl: string;
        };
    };
}

interface WorkItem {
    id: number;
    fields: {
        "System.WorkItemType": string;
        "System.State": string;
        "System.Title": string;
        "System.AssignedTo"?: {
            displayName: string;
            uniqueName: string;
        }
    },
    relations: {
        rel: string;
        url: string;
        attributes?: {
            name?: string;
        };
    }[];
    _links: {
        self: {
            href: string;
        };
        parent?: {
            href: string;
        };
    };
    url: string;
}

/**
 * Returns a value indicating whether the Azure DevOps service hook is related to a supported event.
 * @param serviceHook 
 * @returns 
 */
async function isSupportedEventType(serviceHook: WorkItemWebhook): Promise<boolean> {
    return (serviceHook.eventType === 'workitem.updated');
}

/**
 * Returns the parent work item of the given service hook.
 * @param adoPat Azure DevOps Personal Access Token
 * @param serviceHook The service hook containing the work item details
 * @returns The parent work item or undefined if not found
 */
async function getParentWorkItem(adoPat: string, serviceHook: WorkItemWebhook, context: InvocationContext): Promise<WorkItem | undefined> {
    //Get the first relation where attributes.name is "Parent"
    const parentRelation = serviceHook.resource.revision.relations.find(relation =>
        relation.rel === 'System.LinkTypes.Hierarchy-Reverse' &&
        relation.attributes?.name === 'Parent'
    );

    if (!parentRelation) {
        context.log(`No parent relation found for work item ${serviceHook.resource.workItemId}`);
        return undefined;
    }

    const parentUrl = parentRelation.url;

    context.log(`getParentWorkItem: ${parentUrl}`);

    const response = await axios.get(parentUrl, {
        params: {
            $expand: 'relations'
        },
        headers: {
            'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data as WorkItem;
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

/**
 * Retrieves child work items of the given work item.
 * @param adoPat Azure DevOps Personal Access Token
 * @param workItem The work item to get child items for
 * @param context Invocation context for logging
 * @returns An array of child work items
 */
async function getChildWorkItems(adoPat: string, workItem: WorkItem, context: InvocationContext): Promise<WorkItem[]> {
    const childRelations = workItem.relations.filter(relation =>
        relation.rel === 'System.LinkTypes.Hierarchy-Forward' &&
        relation.attributes?.name === 'Child'
    );

    if (childRelations.length === 0) {
        context.log(`No child relations found for work item ${workItem.id}`);
        return [];
    }

    const childWorkItems: WorkItem[] = [];

    for (const relation of childRelations) {
        const childUrl = relation.url;

        context.log(`getChildWorkItems: ${childUrl}`);

        const response = await axios.get(childUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });

        childWorkItems.push(response.data as WorkItem);
    }

    return childWorkItems;
}

/**
 * Applies the given schema to the parent work items based on the child work items and service hook.
 * @param adoPat Azure DevOps Personal Access Token
 * @param serviceHook The service hook containing the work item details that triggered the function
 * @param requirementWorkItem The parent work item that is a requirement
 * @param childWorkItems The child work items of the requirement
 * @param rules the list of the rules to apply
 * @param context Invocation context for logging
 */
async function ApplyRules(adoPat: string, serviceHook: WorkItemWebhook, requirementWorkItem: WorkItem, childWorkItems: WorkItem[], rules: Rule[], context: InvocationContext): Promise<void> {

    context.log(`Applying rules to requirement work item ${requirementWorkItem.id}`);

    // Example logic to apply the rules
    for (const rule of rules) {
        if (await applyRule(adoPat, serviceHook, requirementWorkItem, childWorkItems, rule, context)) {
            break; // If a rule is applied, we can stop further processing
        }
    }
}

/**
 * Returns the update operations for the parent work item based on the child work items and service hook.
 * @param fieldName The field name to update in the parent work item
 * @param thenValue The value to set in the parent work item, can be a reference to a child work item
 * @param appliesToWorkItem The parent work item that is a requirement
 * @param childWorkItems The child work items of the requirement
 * @returns 
 */
async function getUpdateOperations(fieldName: string, thenValue: string | undefined, appliesToWorkItem: WorkItem, childWorkItems: WorkItem[]): Promise<UpdateOperation | undefined> {

    if (!thenValue)
        return undefined;

    let newValue = thenValue;

    if (thenValue.startsWith("ref:")) {
        const thenValueRegex = new RegExp(thenValue.substring(4));
        const childWorkItem = childWorkItems.find(child => thenValueRegex.test(child.fields["System.Title"]));
        if (childWorkItem) {
            newValue = childWorkItem.fields[fieldName]?.uniqueName;
        }
    }

    if (!newValue)
        return undefined;

    return {
        op: "replace",
        path: `/fields/${fieldName}`,
        value: newValue
    };
}

/**
 * Applies a single rule to the parent work item based on the child work items and service hook.
 * @param adoPat Azure DevOps Personal Access Token
 * @param serviceHook The service hook containing the work item details that triggered the function
 * @param requirementWorkItem The parent work item that is a requirement
 * @param childWorkItems The child work items of the requirement
 * @param rule The rule to apply
 * @param context Invocation context for logging
 * @returns A boolean indicating whether the rule was applied or not
 */
async function applyRule(adoPat: string, serviceHook: WorkItemWebhook, requirementWorkItem: WorkItem, childWorkItems: WorkItem[], rule: Rule, context: InvocationContext): Promise<boolean> {
    context.log(`Evaluating rule: ${JSON.stringify(rule)}`);

    if (rule.when.triggeredFrom) {
        const triggeredFromRegex = new RegExp(rule.when.triggeredFrom);
        if (!triggeredFromRegex.test(serviceHook.resource.revision.fields["System.Title"])) {
            context.log(`Triggered from condition does not match. Expected: ${rule.when.triggeredFrom}, Actual: ${serviceHook.resource.revision.fields["System.Title"]}`);
            return false;
        }
    }

    if (rule.when.withState !== serviceHook.resource.revision.fields["System.State"]) {
        context.log(`State condition does not match. Expected: ${rule.when.withState}, Actual: ${serviceHook.resource.revision.fields["System.State"]}`);
        return false;
    }

    context.log(`Applying rule: ${JSON.stringify(rule)}`);


    for (const thenAction of rule.then) {
        context.log(`Processing then action: ${JSON.stringify(thenAction)}`);

        const updateOperations: UpdateOperation[] = [];
        let workItemUrl = requirementWorkItem.url;

        //TODO: choisir la bonne workItemUrl

        const parentSystemState = await getUpdateOperations("System.State", thenAction.state, requirementWorkItem, childWorkItems);
        if (parentSystemState) {
            context.log(`System.State: ${JSON.stringify(parentSystemState)}`);
            updateOperations.push(parentSystemState);
        }
        const parentSystemAssignedTo = await getUpdateOperations("System.AssignedTo", thenAction.assignedTo, requirementWorkItem, childWorkItems);
        if (parentSystemAssignedTo) {
            context.log(`System.AssignedTo: ${JSON.stringify(parentSystemAssignedTo)}`);
            updateOperations.push(parentSystemAssignedTo);
        }

        if (updateOperations.length !== 0) {
            await axios.patch(workItemUrl,
                updateOperations,
                {
                    params: {
                        suppressNotifications: true,
                        "api-version": "7.1"
                    },
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`,
                        'Content-Type': 'application/json-patch+json'
                    }
                }
            );
        }
    }



    return true;
}

export async function OnWorkItemUpdated(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

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
    const rules = adoRulesResponse.data as Rule[];
    context.log(`Rules to apply: ${JSON.stringify(rules)}`);

    const serviceHook: WorkItemWebhook = await request.json() as WorkItemWebhook;

    if (!await isSupportedEventType(serviceHook)) {
        return {
            status: 400,
            body: `Unsupported event type: ${serviceHook.eventType}`
        };
    }

    //const parentHref = serviceHook.resource._links.parent?.href || undefined;
    const requirementWorkItem = await getParentWorkItem(adoPat, serviceHook, context);
    if (!requirementWorkItem) {
        return {
            status: 400,
            body: `Parent for work item ${serviceHook.resource.workItemId} not found.`
        };
    }

    if (!isRequirementWorkItem(requirementWorkItem)) {
        return {
            status: 400,
            body: 'Parent work item is not a requirement, nothing to do.'
        };
    }

    const childWorkItems = await getChildWorkItems(adoPat, requirementWorkItem, context);
    await ApplyRules(adoPat, serviceHook, requirementWorkItem, childWorkItems, rules, context);

    return {
        status: 200
    };
};

app.http('OnWorkItemUpdated', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: OnWorkItemUpdated
});
