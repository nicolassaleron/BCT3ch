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
 
 
## git-hub-tag-azure-devops-workitems.yml

This pipeline is designed to tag user stories in Azure DevOps depending on the branch they are merged into.
This script has been designed when you use Azure DevOps for tracking your work items (Boards) but your code repositories are hosted in GitHub.

This is workflow is an improvement over the `azure-pipelines-tag-user-stories.yml` pipeline, as it uses GitHub Actions to trigger the tagging of user stories in Azure DevOps when a pull request is merged into a specific branch.

To use this pipeline, you need to follow these steps:

1. Save this as .github/workflows/git-hub-tag-azure-devops-workitems.yml in your repository
2. Configure the required secrets
3. When you create PRs, mention work items in the title or body using patterns like:
   * "Fixes #12345"
   * "Implements User Story 67890"
   * "Resolves AB#54321"
   When the PR is merged to main or qa, the workflow will automatically tag the referenced work items