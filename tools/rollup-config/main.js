// copied @pixi-build-tools/rollup-configurator, added plugin-typescript

const fs = require('fs');
const path = require('path');
const {globals} = require('@pixi-build-tools/globals');
const resolve = require('rollup-plugin-node-resolve');

const string = require('rollup-plugin-string').string;
const sourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('rollup-plugin-replace');
const {terser} = require('rollup-plugin-terser');
const typescript = require('@rollup/plugin-typescript');

const projectFolder = process.cwd();
const packageJsonPath = path.relative(__dirname, path.join(projectFolder, './package.json'));

const pkg = require(packageJsonPath);
const pkgName = pkg.name;
const pkgAuthor = pkg.author;

exports.main = function main(options) {
    options = Object.assign({
        sourcemap: true,
        globals: {},
        production: false,
    }, options);

    const plugins = [
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        string({
            include: [
                '**/*.frag',
                '**/*.vert',
            ],
        }),
        replace({
            __VERSION__: pkg.version,
        }),
        typescript({
            tsconfig: path.relative(__dirname, path.join(projectFolder, './tsconfig.json')),
        }),
        sourcemaps(),
        commonjs({}),
    ];

    const compiled = (new Date()).toUTCString()
        .replace(/GMT/g, 'UTC');
    let banner = [
        `/* eslint-disable */`,
        ` `,
        `/*!`,
        ` * ${pkg.name} - v${pkg.version}`,
        ` * Compiled ${compiled}`,
        ` *`,
        ` * ${pkg.name} is licensed under the MIT License.`,
        ` * http://www.opensource.org/licenses/mit-license`,
        ` * `,
        ` * Copyright 2019-2020, ${pkg.author}, All Rights Reserved`,
        ` */`,
    ].join('\n');

    const {
        main,
        module,
        bundle,
        bundleInput,
        bundleOutput,
        bundleNoExports,
        namespace,
        standalone,
        peerDependencies,
        dependencies,
    } = pkg;

    let input = options.input;

    if (!input) {
        const indexTs = path.join(projectFolder, 'src/index.ts');

        if (fs.existsSync(indexTs)) {
            input = indexTs;
        }
    }
    if (!input) {
        const indexJs = path.join(projectFolder, 'src/index.js');

        if (fs.existsSync(indexJs)) {
            input = indexJs;
        }
    }
    if (!input) {
        throw new Error(`Unable to resolve entry file: <projectFolder>/src/index.(js|ts) do not exist?`);
    }

    const external = []
        .concat(options.external || [])
        .concat(Object.keys(pkg.peerDependencies || {}))
        .concat(Object.keys(pkg.dependencies || {}))
        .filter((pkg) => !options.excludedExternals?.includes(pkg));

    const config = {
        plugins,
        external,
        input,
        output: [],
    };

    if (options.main || main) {
        config.output.push({
            banner,
            file: path.join(projectFolder, options.main || main),
            format: 'cjs',
            sourcemap: options.sourcemap,
        });
    }
    if (options.module || module) {
        config.output.push({
            banner,
            file: path.join(projectFolder, options.module || module),
            format: 'esm',
            sourcemap: options.sourcemap,
        });
    }

    if (!options.bundle && !bundle) {
        // No UMD bundle, we're done!
        return [config];
    }

    const results = [config];
    const name = pkg.name.replace(/[^a-z]+/g, '_');
    const ns = namespace || 'PIXI';

    // Assign to namespace
    let footer;

    // Standalone packages do not export anything into a namespace
    if (!standalone) {
        if (bundleNoExports !== true) {
            footer = `if (typeof ${name} !== 'undefined') { Object.assign(this.${ns}, ${name}); }`;
        }

        // Allow namespaces upto 2-depth (like PIXI.tilemap)
        if (ns.includes('.')) {
            const base = ns.split('.')[0];

            banner += `\nthis.${base} = this.${base} || {};`;
        }

        banner += `\nthis.${ns} = this.${ns} || {};`;
    }

    const file = path.join(projectFolder, options.bundle || bundle);

    results.push({
        input,
        external,
        output: Object.assign({
            banner,
            file,
            format: 'umd',
            globals: {...globals, ...options.globals},
            name,
            footer,
            sourcemap: options.sourcemap,
        }, bundleOutput),
        treeshake: false,
        plugins,
    });

    if (process.env.NODE_ENV === 'production' || options.production) {
        results.push({
            input,
            external,
            output: Object.assign({
                banner,
                file: file.replace(/\.js$/, '.min.js'),
                format: 'umd',
                globals: {...globals, ...options.globals},
                name,
                footer,
                sourcemap: options.sourcemap,
            }, bundleOutput),
            treeshake: false,
            plugins: [...plugins, terser({
                output: {
                    comments: (node, comment) => comment.line === 1,
                },
            })],
        });
    }

    return results;
};

