<p align="center">
  <img src="logo/logo.png" width="200">
</p>

# Falcon 2: Interactive Visual Analysis for Big Data

![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

Crossfilter millions of records without latencies. This is a new version of [Falcon](https://github.com/vega/falcon) with cleaned up APIs and reusable components.

For current mockups and architecture choices, go to this [Figma Page](https://www.figma.com/file/0fErf0QvmhpgNGrCwFM3hZ/falcon2?node-id=3%3A2). Ask @xnought if you need editing permission.

### Falcon 2 – Getting Started

`yarn dev` will start the dev server and open the browser.

this just does the following for you:

```bash
cd svelte
yarn # make sure to install dependencies
yarn dev --open # to start the dev server and open the browser
```

currently, we are developing within a svelte environment and importing the ts code. More build stuff will need to be implemented for the actual package down the line.

## Milestones

-   [x] Take the current Falcon and decouple it from the UI
-   [ ] Refactor the code to be more modular and reusable
-   [ ] Support Categorical Dimensions
-   [ ] Update the Live demo with Svelte and some premade charts
