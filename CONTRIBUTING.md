# Contributing

**🚧Work In Progress contributing document**

Thank you for your interest in contributing! This file should help you started.

## Milestones

-   [x] decouple the app from falcon
-   [ ] Write tests and performance benchmarks
-   [ ] Refactor and revise API and code (move to stdlib.js arrays too)
-   [ ] Add categorical data support
-   [ ] Create documentation for the falcon API
-   [ ] Launch v1.0.0 to the public

## Getting Started

This project houses the falcon library and examples.

To cut down on node garbage, we are using [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to install and share packages across those projects.

To install all packages in the workspace, run

```bash
yarn
```

## Running the 10k flights example with Falcon

```bash
yarn start:flights
```

starts the svelte app that imports `falcon/src` typescript files. The demo doesn't actually use the compiled javascript build.

This is because vite allows us to have fast development with hot reloading whenever changes are made directly in the typescript files instead of rebuilding every time.

If this example is deployed, we'll need to use the build version instead.

## Changing the library

The library lives in `falcon`

Changes there will be reflected in the example app if its running.

For production, you can build this library with

```bash
yarn build
```

and this will create a build in `falcon/build` (this houses the compiled js from the ts)
