# Development

## Getting Started

This project houses the `falcon-vis` library and examples.

To cut down on node garbage, we are using [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to install and share packages across those projects. In the `examples/` directory alone there are a few separate [Svelte](https://svelte.dev/) projects.

**To install all packages in the workspace**

```bash
yarn
```

**To run the development server**

```bash
yarn dev
```

A new browser tab will open that uses the`falcon-vis` library.

Changes made in the `falcon-vis` package or svelte `examples` will be updated on save.

## Build

Check the respective projects `package.json` to get individual instructions how to build examples or the main library.

## Publish to NPM

```bash
yarn publish-falcon-vis
```

will publish to npm.

## Deploy Examples

```bash
yarn deploy-examples
```

will deploy all the live examples listed in the `deploy.sh`.

## Standards

1. We use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standards for commit messages.
2. We format code with [Prettier](https://prettier.io/) as defined by the `falcon2/.prettierrc`
