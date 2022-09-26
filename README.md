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

Then you can modify the code in `src` (falcon 2 code) and see changes in the example project in your browser with a real example. More examples will be made for mode dbs as time goes on.

Under the hood it does the following:

Runs the svelte project in `examples/flights-in-browser` and simply imports the `src` falcon library. To be specific it does this:

```bash
cd examples/flights-in-browser
yarn # make sure to install dependencies
yarn dev --open # to start the dev server and open the browser
```

### Old Falcon (version 1) – Getting Started

Inside of the `old` directory, install the dependencies with `yarn`. Then run `yarn start` to start the flight demo with in memory data. Have a look at the other `script` commands in [`package.json`](https://github.com/vega/falcon/blob/master/package.json).

## Developers

Just so we can take advantage of the old code, right now its in the `old` directory. This will be removed when Falcon 2 is a package. Simply for convenience for now.

Some standards are in the `DEVELOPMENT.md` file if you wish to contribute.
