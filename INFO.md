The npm Dependency Checker skill ensures that all the dependencies you have
declared in your project's `package.json` are actually being used in your 
project. Additionally, the skill will find dependencies that are used in 
your code but are not declared as project dependency.

The skill uses `depcheck` to scan your repository for unused and missing
dependencies.

This skill leverages this tool to:

-   Always make sure your declared dependencies are in line with the code
-   Get help to fix dependency issues across your entire organization
-   Help to keep dependencies current and up-to-date
