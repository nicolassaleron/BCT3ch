
export interface WorkItemWebhook {
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
            parent: {
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