# Azure DevOps Automation

This repository contains scripts and tools to automate various tasks in Azure DevOps, such as managing pipelines, repositories, and work items.

## azure-pipelines-tag-user-stories.yml

This pipeline is designed to tag user stories in Azure DevOps depending on the branch they are merged into.
This script has been designed when you use Azure DevOps for tracking your work items (Boards) but your code repositories are hosted in GitHub.

It is expected that you link your Azure DevOps Boards to your GitHub repositories, so that the user stories can be tagged based on the branch they are merged into.

To use this pipeline, you need to follow these steps:

1. Add a [GitHub connection in Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/boards/github/connect-to-github?view=azure-devops).

2. Create a new pipeline base on `azure-pipelines-tag-user-stories.yml`.

3. Set two variables in the pipeline:
   - AzureDevOpsAccessToken: A Personal Access Token (PAT) with the `Work Items (read and write)` scope and `GitHub Connections (read)` scope.
   - GitHubAccessToken: A Personal Access Token (PAT) with the `repo` scope.