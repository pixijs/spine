// from https://github.com/pixijs/extension-scripts, adapted to this monorepo

import path from 'node:path';
import rename from '@pixi/rollup-plugin-rename-node-modules';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { string } from 'rollup-plugin-string';
import replace from '@rollup/plugin-replace';

// function that eats arguments and spits rollup configs
export default (extensionConfig, pkg) => {
    const compiled = new Date().toUTCString().replace(/GMT/g, 'UTC');
    const banner = [
        `/*!`,
        ` * ${pkg.name} - v${pkg.version}`,
        ` * Compiled ${compiled}`,
        ` *`,
        ` * ${pkg.name} is licensed under the MIT License.`,
        ` * http://www.opensource.org/licenses/mit-license`,
        ` * `,
        ` * Copyright ${new Date().getFullYear()}, ${pkg.author}, All Rights Reserved`,
        ` */`,
    ].join('\n');

    // External dependencies, not bundled
    const externalBrowser = [].concat(Object.keys(pkg.peerDependencies || {}));

    const externalNpm = [].concat(Object.keys(pkg.peerDependencies || {})).concat(Object.keys(pkg.dependencies || {}));

    const builtInPackages = [
        'accessibility',
        'app',
        'assets',
        'basis',
        'canvas-display',
        'canvas-extract',
        'canvas-graphics',
        'canvas-mesh',
        'canvas-particle-container',
        'canvas-renderer',
        'canvas-prepare',
        'canvas-sprite',
        'canvas-sprite-tiling',
        'canvas-text',
        'compressed-textures',
        'core',
        'display',
        'events',
        'extensions',
        'extract',
        'graphics-extras',
        'graphics',
        'math-extras',
        'math',
        'mesh-extras',
        'mesh',
        'mixin-cache-as-bitmap',
        'mixin-get-child-by-name',
        'mixin-get-global-position',
        'particle-container',
        'prepare',
        'runner',
        'settings',
        'sprite-animated',
        'sprite-tiling',
        'sprite',
        'spritesheet',
        'text-bitmap',
        'text',
        'ticker',
        'unsafe-eval',
    ].reduce((acc, name) => ({ ...acc, [`@pixi/${name}`]: 'PIXI' }), {});

    // Plugins for module and browser output
    const plugins = [
        commonjs(),
        resolve(),
        string({
            include: ['**/*.frag', '**/*.vert'],
        }),
        replace({
            __VERSION__: pkg.version,
        }),
    ];

    // These are the PixiJS built-in default globals
    // for the browser bundle when referencing other core packages
    const globals = {
        ...builtInPackages,
        ...extensionConfig.globals,
    };

    const source = pkg.source ?? 'src/index.ts';
    const basePath = path.dirname(path.join(process.cwd(), source));
    const bundle = path.join(process.cwd(), extensionConfig.bundle);
    const bundleModule = path.join(process.cwd(), extensionConfig.bundleModule);
    const mainDir = path.dirname(path.join(process.cwd(), pkg.main));
    const moduleDir = path.dirname(path.join(process.cwd(), pkg.module));
    let namespace = extensionConfig.namespace;
    let footer;

    // If we're adding to the main PIXI namespace, we need to
    // make sure we don't override the PIXI global, so we'll do this
    // to insert the output of the extension into the PIXI global
    if (namespace === 'PIXI') {
        namespace = pkg.name.replace(/[^a-z-]/gi, '_').replace(/-/g, '');
        footer = `Object.assign(PIXI, ${namespace});`;
    }

    return [
        {
            plugins: [...plugins, rename(), esbuild({ target: 'ES2020' })],
            external: externalNpm,
            input: source,
            output: [
                {
                    dir: mainDir,
                    entryFileNames: '[name].js',
                    format: 'cjs',
                    preserveModules: true,
                    preserveModulesRoot: basePath,
                    sourcemap: true,
                    exports: 'named',
                },
                {
                    dir: moduleDir,
                    entryFileNames: '[name].mjs',
                    format: 'esm',
                    preserveModules: true,
                    preserveModulesRoot: basePath,
                    sourcemap: true,
                    exports: 'named',
                },
            ],
        },
        {
            plugins: [
                ...plugins,
                esbuild({
                    target: 'ES2017',
                    minify: true,
                }),
            ],
            external: externalBrowser,
            input: source,
            treeshake: false,
            output: [
                {
                    banner,
                    file: bundle,
                    format: 'iife',
                    name: namespace,
                    footer,
                    sourcemap: true,
                    globals,
                    exports: 'named',
                },
                {
                    banner,
                    file: bundleModule,
                    format: 'esm',
                    sourcemap: true,
                    exports: 'named',
                },
            ],
        },
    ];
};
