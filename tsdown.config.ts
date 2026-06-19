import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };

const banner = `/**
 * ${pkg.name} v${pkg.version}
 *
 * Copyright (c) Geostrategists Consulting GmbH
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license MIT
 */`;

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  target: "es2022",
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  outputOptions: {
    banner,
  },
});
