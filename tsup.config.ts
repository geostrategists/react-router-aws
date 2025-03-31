import { defineConfig } from "tsup";

import pkg from "./package.json";

const entry = ["src/index.ts"];

export default defineConfig([
  {
    clean: true,
    entry,
    format: ["cjs", "esm"],
    outDir: "dist",
    dts: true,
    banner: {
      js: `/**
* ${pkg.name} v${pkg.version}
*
* Copyright (c) Geostrategists Consulting GmbH
*
* This source code is licensed under the MIT license found in the
* LICENSE.md file in the root directory of this source tree.
*
* @license MIT
*/`,
    },
  },
]);
