const { main } = require('@pixi-build-tools/rollup-configurator/main');

const results = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine',
        '@pixi-spine/runtime-3.8': 'PIXI.spine',
        '@pixi-spine/loader-base': 'PIXI.spine',
        '@pixi-spine/loader-3.8': 'PIXI.spine',
    },
});

// TODO: get sorted deps of all our @pixi-spine deps

const umdDeps = ['@pixi/app', '@pixi/constants', '@pixi/core', '@pixi/display', '@pixi/graphics',
    '@pixi/loaders', '@pixi/math', '@pixi/mesh-extras', '@pixi/sprite', '@pixi/utils'];

results.forEach((entry) => {
    if (entry.output.format === 'umd') {
        entry.external = entry.external.filter((moduleName) => {
            return moduleName.indexOf('@pixi-spine') !== 0;
        }).concat(umdDeps);
    }
})

module.exports = results;
