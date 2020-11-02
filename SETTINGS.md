## Before you get started

Connect and configure this integration:

1.  [**GitHub**][github] _(required)_

[github]: https://go.atomist.com/catalog/integration/github "GitHub Integration"

## How to configure

1.  **Report missing dependencies**

    This skill can find missing dependencies in your project by scanning known
    source code. Enable this if you want to get notifications and fixes of
    missing dependencies.

1.  **Ignore binary packages**

    Ignore npm packages that have `bin` entries or binaries. These are often
    used from your npm scripts and are otherwise hard to detect.

1.  **Exclude specific packages**

    Configure any npm package that should not get reported or fixed.

1.  **Exclude specific files**

    Use this parameter to exclude specific files from scanning.

1.  **Path to config file**

    `depcheck` can be configured to use a project specific configuration file.
    If this parameter is set and the configured configuration file exists in
    your project, it will be passed to `depcheck`.

1.  **Specify how to fix unused or missing dependencies**

    Choose which how and when to fix unused or missing dependencies. The
    following options are available:

    -   **Raise pull request for default branch; commit to other branches** -
        with this option, fixes on the default branch will be submitted via a
        pull request; fixes on other branches will be committed straight onto
        the branch
    -   **Raise pull request for default branch only** - with this option, fixes
        on the default branch will be submitted via a pull request; fixes on
        other branches will not be persisted
    -   **Raise pull request for any branch** - with this option, fixes on all
        branches will be submitted via a pull request
    -   **Commit to default branch only** - with this option, fixes on the
        default branch will be committed straight to the branch; fixes on other
        branches will not be persisted
    -   **Commit to any branch** - with this option, fixes on all branches will
        be committed straight to the branch
    -   **Do not fix dependencies**

    Pull requests that get raised by this skill will automatically have a
    reviewer assigned based on the person who pushed code. Pull requests that
    are not needed any longer, i.e., because all dependencies were fixed
    manually, are closed automatically.

1.  **Configure pull request labels**

    Add additional labels to pull requests raised by this skill.

    This is useful to influence how and when the PR should be auto-merged by the
    [Auto-Merge Pull Requests](https://go.atomist.com/catalog/skills/atomist/github-auto-merge-skill)
    skill.

1.  **Determine repository scope**

    ![Repository filter](docs/images/repo-filter.png)

    By default, this skill will be enabled for all repositories in all
    organizations you have connected.

    To restrict the organizations or specific repositories on which the skill
    will run, you can explicitly choose organizations and repositories.

1.  **Activate the skill**

    Save your configuration and activate the skill by clicking the "Enable
    skill" button.
