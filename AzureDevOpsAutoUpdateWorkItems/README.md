# Azure DevOps Auto Update Work Items

This is an Azure Function that automatically updates Azure DevOps work items based on specific rules when a child work item is updated. It is designed to work with Azure DevOps Boards and can be triggered by various events in Azure DevOps.

## Setup

1. Deploy this function to Azure Functions.
2. Create a JSON file containing the rules for updating work items. This file should be hosted in Azure DevOps repository, and it should be accessible via a URL. The rules should follow the structure defined in the section below.
3. Create an Azure DevOps Personal Access Token (PAT) with sufficient permissions to read and update work items. This PAT will be used to authenticate requests to Azure DevOps.
4. In Azure DevOps, create a service hook that triggers this function when a work item is updated. Preferably, this should be set up to trigger on work item of type _Task_ and when the _State_ is changed.

   To setup the service hook, follow these steps:
   - Go to your Azure DevOps project.
   - Navigate to **Project Settings** > **Service Hooks**.
   - Click on **Create Subscription**.
   - Select **Web Hooks** and click **Next**.
   - For the field **Trigger on this type of event**, select **Work item updated**.
   - In the **Filters** section, you can specify the work item type (e.g., Task) and the field (e.g., State).
   - Then click **Next**.
   - In the **URL** field, enter the URL of your Azure Function.
   - In the **HTTP Headers** section, add the following headers:
     - `X-ADO-PAT`: Your Azure DevOps Personal Access Token (PAT) with sufficient permissions to read and update work items.
     - `X-ADO-RULES`: The URL to your rules JSON file in Azure DevOps. You can get this URL by navigating to the file in Azure DevOps, clicking on the "Download" button, and copying the URL from the browser's download list.
   - Then click **Finish** to create the subscription.
 

## Rules JSON Structure

The Azure Function expects a JSON file containing rules that define how work items should be updated. The rules should follow this structure:

```json
[
    {
        "if": {
            "triggeredFrom": ".*Dev.*",
            "withState": "Active"
        },
        "then": {
            "parentAssignedTo": "ref:.*Dev.*",
            "parentState": "Active"
        }
    },
    {
        "if": {
            "triggeredFrom": ".*Test.*",
            "withState": "Closed"
        },
        "then": {
            "parentAssignedTo": "ref:.*Release.*"
        }
    }
]
```

The file is an array of rules, where each rule has an `if` condition and a `then` action. The `if` condition specifies the criteria for triggering the rule, and the `then` action specifies how to update the parent work item.

In the `if` condition:

- `triggeredFrom` is a regex pattern that matches the work item title that triggered the rule. You can omit this field if you want the rule to apply regardless of the title.
- `withState` is the state of the work item that triggered the rule. You can omit this field if you want the rule to apply regardless of the state.
  
In the `then` action:

- `parentAssignedTo` is the user to whom the parent work item should be assigned. If you omit this field, the parent work item will not have its assigned user changed.

  > You can use `ref:` followed by a regex pattern. In that case, a child work item's title will be searched matching the regex. The parent will be assigned to the user found in the child work item.

- `parentState` is the state to which the parent work item should be set. You can use `Active`, `Closed`, or any other valid state. If you omit this field, the parent work item will not have its state changed.

  > You can use `ref:` followed by a regex pattern. In that case, a child work item's title will be searched matching the regex. The parent will be assigned to the state found in the child work item.


If multiple rules are defined, the first matching rule will be applied. If no rules match, the parent work item will not be updated.