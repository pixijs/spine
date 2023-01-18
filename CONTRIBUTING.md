# How to contribute

Please read this short guide to contributing before performing pull requests or reporting issues. The purpose
of this guide is to ensure the best experience for all involved and make development as smooth as possible.


## Reporting issues

To report a bug, request a feature, or even ask a question, make use of the [GitHub Issues][10] in this repo.
When submitting an issue please take the following steps:

**1. Search for existing issues.** Your bug may have already been fixed or addressed in an unreleased version, so
be sure to search the issues first before putting in a duplicate issue.

**2. Create an isolated and reproducible test case.** If you are reporting a bug, make sure you also have a minimal,
runnable, code example that reproduces the problem you have.

**3. Include a live example.** After narrowing your code down to only the problem areas, make use of [jsFiddle][11],
[jsBin][12], or a link to your live site so that we can view a live example of the problem.

**4. Share as much information as possible.** Include browser/node version affected, your OS, version of the library,
steps to reproduce, etc. "X isn't working!!!1!" will probably just be closed.

[10]: https://github.com/pixijs/pixi-spine/issues
[11]: http://jsfiddle.net
[12]: http://jsbin.com/


## Making Changes

To build the library you will need to download node.js from [nodejs.org][20].

This monorepo uses Lerna and NX in the background.

After that you can clone the repository and run `npm install` inside the cloned folder. This will install
dependencies necessary for building the project. You can rebuild the project by running `npm build` in the cloned
folder.

Please, before sending your commit make sure that `npm run lint` returns no errors nor warnings. You can use `npm run lint:fix` to automagically fix most issues but you still might need to fix them manually.

Once that is ready, you can make your changes and submit a Pull Request:

- **Send Pull Requests to the `master` branch.** All Pull Requests must be sent to the `master` branch, which is where
all "bleeding-edge" development takes place.

- **Only commit relevant changes.** Don't include changes that are not directly relevant to the fix you are making.
The more focused a PR is, the faster it will get attention and be merged. Extra files changing only whitespace or
trash files will likely get your PR closed.

[20]: http://nodejs.org
