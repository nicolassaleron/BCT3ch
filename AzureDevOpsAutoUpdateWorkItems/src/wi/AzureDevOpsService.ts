import { InvocationContext } from "@azure/functions";
import axios from "axios";
import { WorkItemWebhook } from "./WorkItemWebhook";
import { UpdateOperation, WorkItem } from "../dsl";

/**
 * Sends update operations to Azure DevOps.
 * @param adoPat Azure DevOps Personal Access Token
 * @param operations The update operations to send. Please note that all operations must be for the same work item.
 * @param context Invocation context for logging
 */
export async function sendUpdateOperations(adoPat: string, operations: UpdateOperation[], context: InvocationContext): Promise<void> {

    const url = operations[0].url; // Assuming all operations are for the same work item
    const suppressNotifications = operations.some(op => op.suppressNotifications === false) ? false : true;
    const bypassRules = operations.some(op => op.bypassRules === true) ? true : false;

    context.log(`ℹ️ Sending ${operations.length} operations to ${url}`);
    context.log(`🐞 Operations:\n${JSON.stringify(operations)}`);

    /*await axios.patch(url,
        operations.map(op => ({
            "op": op.op,
            "path": op.path,
            "value": op.value
        })),
        {
            params: {
                suppressNotifications: suppressNotifications,
                bypassRules: bypassRules,
                "api-version": "7.1"
            },
            headers: {
                'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`,
                'Content-Type': 'application/json-patch+json'
            }
        }
    );*/
}

/**
 * Returns the parent work item of the given service hook.
 * @param adoPat Azure DevOps Personal Access Token
 * @param serviceHook The service hook containing the work item details
 * @returns The parent work item or undefined if not found
 */
export async function getParentWorkItem(adoPat: string, serviceHook: WorkItemWebhook, context: InvocationContext): Promise<WorkItem | undefined> {
    //Get the first relation where attributes.name is "Parent"
    const parentRelation = serviceHook.resource.revision.relations.find(relation =>
        relation.rel === 'System.LinkTypes.Hierarchy-Reverse' &&
        relation.attributes?.name === 'Parent'
    );

    if (!parentRelation) {
        context.log(`❌ No parent relation found for work item ${serviceHook.resource.workItemId}`);
        return undefined;
    }

    return await getWorkItem(adoPat, parentRelation.url, context);
}

/**
 * Returns the work item with the given ID.
 * @param adoPat Azure DevOps Personal Access Token
 * @param workItemUrl The ID of the work item to retrieve
 * @param context Invocation context for logging
 * @returns The work item or undefined if not found
 */
export async function getWorkItem(adoPat: string, workItemUrl: string, context: InvocationContext): Promise<WorkItem | undefined> {

    try {
        const response = await axios.get(workItemUrl, {
            params: {
                $expand: 'relations'
            },
            headers: {
                'Authorization': `Basic ${Buffer.from(`az:${adoPat}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data as WorkItem;
    } catch (error) {
        context.log(`❌ Error fetching work item ${workItemUrl}: ${error}`);
        return undefined;
    }
}

/**
 * Retrieves child work items of the given work item.
 * @param adoPat Azure DevOps Personal Access Token
 * @param workItem The work item to get child items for
 * @param context Invocation context for logging
 * @returns An array of child work items
 */
export async function getChildWorkItems(adoPat: string, workItem: WorkItem, context: InvocationContext): Promise<WorkItem[]> {
    const childRelations = workItem.relations.filter(relation =>
        relation.rel === 'System.LinkTypes.Hierarchy-Forward' &&
        relation.attributes?.name === 'Child'
    );

    if (childRelations.length === 0) {
        context.log(`ℹ️ No child relations found for work item ${workItem.id}`);
        return [];
    }

    const childWorkItems: WorkItem[] = [];

    for (const relation of childRelations) {
        const childWorkItem = await getWorkItem(adoPat, relation.url, context);

        if (childWorkItem) {
            childWorkItems.push(childWorkItem);
        }
    }

    return childWorkItems;
}