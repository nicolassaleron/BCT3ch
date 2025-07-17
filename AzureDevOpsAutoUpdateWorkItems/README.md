# Azure DevOps Auto Update Work Items

This is an Azure Function that automatically updates Azure DevOps work items based on specific rules when a child work item is updated. It is designed to work with Azure DevOps Boards and can be triggered by various events in Azure DevOps.

## Setup

1. Deploy this function to Azure Functions.
2. Create a DSL file containing the rules for updating work items. This file should be hosted in Azure DevOps repository, and it should be accessible via a URL. The rules should follow the structure defined in the section below.
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
     - `X-ADO-RULES`: The URL to your DSL rules file in Azure DevOps. You can get this URL by navigating to the file in Azure DevOps, clicking on the "Download" button, and copying the URL from the browser's download list.
   - Then click **Finish** to create the subscription.
 

## DSL Rules Structure

The Azure Function expects a DSL rule file containing rules that define how work items should be updated. The rules should follow this structure:

```
rule "Active Task Assignment":
    when me.State is "Active"
    then set parent.AssignedTo = me.AssignedTo
         set parent.State = "Active"

rule "Development Completed - Assign to QA":
    when me.Title matches ".*Development.*" and me.State is "Closed" and me.Reason is "Completed"
    then set parent.AssignedTo = child(Title matches ".*Test QA.*").AssignedTo
         set parent.State = "Active"
         set child(Title matches ".*Test QA.*").State = "New"

rule "QA Testing Completed - Assign to UAT":
    when me.Title matches ".*Test QA.*" and me.State is "Closed" and me.Reason is "Completed"
    then set parent.AssignedTo = child(Title matches ".*Test UAT.*").AssignedTo
         set parent.State = "Active"

rule "QA Testing Closed with failure - Assign back to Development":
    when me.Title matches ".*Test QA.*" and me.State is "Closed" and me.Reason is not "Completed"
    then set parent.AssignedTo = child(Title matches ".*Development.*").AssignedTo
         set parent.State = "Active"
         set child(Title matches ".*Development.*").State = "New"
```

You can find more information about the DSL syntax and available actions in the [DSL documentation](dsl.md).

If multiple rules are defined, the first matching rule will be applied. If no rules match, the parent work item will not be updated.