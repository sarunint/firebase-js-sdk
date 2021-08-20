/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import json from '@rollup/plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import pkgExp from './exp/package.json';
import alias from '@rollup/plugin-alias';
import pkg from './package.json';
import path from 'path';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

const { generateAliasConfig } = require('./rollup.shared');

const deps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/app'
];

const nodeDeps = [...deps, 'util'];

const es5Plugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false,
    transformers: [importPathTransformer]
  }),
  json()
];

const es5Builds = [
  // Browser
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkgExp.esm5),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('browser')), ...es5Plugins],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

const es2017Plugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    abortOnError: false,
    transformers: [importPathTransformer]
  }),
  json({ preferConst: true })
];

const es2017Builds = [
  // Node
  {
    input: './exp/index.node.ts',
    output: {
      file: path.resolve('./exp', pkgExp.main),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('node')), ...es2017Plugins],
    external: id =>
      nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  },

  // Browser
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkgExp.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('browser')), ...es2017Plugins],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

// eslint-disable-next-line import/no-default-export
export default [...es5Builds, ...es2017Builds];
