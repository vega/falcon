<p align="center">
  <img src="logo/logo.png" width="200" style="transform: rotate(90deg);">
</p>

# Falcon

![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

Crossfilter millions of records without latencies. This fork of [Falcon](https://github.com/vega/falcon) offers an API, so you can crossfilter on your own data and own charts!

## Development

```bash
yarn       # install packages for entire workspace
yarn dev   # runs demo in browser
```

A new browser tab should open with a demo that uses the`falcon` library.

Changes made in the `falcon` package and svelte `examples` will hot reload the user interface.

## Overview

### Data

Falcon supports

-   Javascript Objects
-   Arrow
-   DuckDB
-   HTTP (sends `GET` request with a `SQL` query)
-   MapD

for both categorical and continuous data

### Views

Falcon supports `0D` and `1D` views at the moment. `1D` meaning binned counts (histogram) across that dimension/column. `0D` being no dimension: just total counts across the entire data.

`2D` views (like heatmaps) will be brought soon
