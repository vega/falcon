<p align="center">
  <img src="logo/logo.png" width="200" style="transform: rotate(90deg);">
</p>

# Falcon

![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

Crossfilter millions of records without latencies. This fork of [Falcon](https://github.com/vega/falcon) offers an API, so you can crossfilter on your own data and own charts!

## Usage

Import the main `Falcon` object and whichever data you plan to use

```typescript
import { Falcon, ObjectDB, ArrowDB, DuckDB } from "falcon2";
```

## Development

```bash
yarn       # install packages for entire workspace
yarn dev   # runs demo in browser
```
