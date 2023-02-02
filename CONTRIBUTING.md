# Contributing

**🚧Work In Progress**

Thank you for your interest in contributing! This file should help you started.

## Getting Started

This project houses the `falcon2` library and examples.

To cut down on node garbage, we are using [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to install and share packages across those projects. In the `Examples/` directory alone there are a few separate [Svelte](https://svelte.dev/) projects.

**To install all packages in the workspace**

```bash
yarn
```

**To run the development server**

```bash
yarn dev
```

A new browser tab will open that uses the`falcon2` library.

Changes made in the `falcon2` package or svelte `examples` will be updated on save.

## Standards

1. We use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standards for commit messages.
2. We format code with [Prettier](https://prettier.io/) as defined by the `falcon2/.prettierrc`
3. ...
