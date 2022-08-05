const { main } = require('@pixi-spine/rollup-config/main');

const results = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine',
        '@pixi-spine/runtime-3.7': 'PIXI.spine37',
        '@pixi-spine/runtime-3.8': 'PIXI.spine38',
        '@pixi-spine/runtime-4.0': 'PIXI.spine40',
        '@pixi-spine/loader-base': 'PIXI.spine',
        '@pixi-spine/loader-uni': 'PIXI.spine',
    },
});

// TODO: get sorted deps of all our @pixi-spine deps

const umdDeps = ['@pixi/constants', '@pixi/core', '@pixi/display', '@pixi/graphics',
    '@pixi/loaders', '@pixi/math', '@pixi/mesh-extras', '@pixi/sprite', '@pixi/utils'];

const license1 = 'is licensed under the MIT License.\n * http://www.opensource.org/licenses/mit-license';
const licenseSpine = 'is licensed under SPINE-LICENSE\n * http://esotericsoftware.com/spine-runtimes-license';

results.forEach((entry) => {
    if (entry.output.banner) {
        entry.output.banner = entry.output.banner.replace(license1, licenseSpine);
    }
    if (entry.output.format === 'umd') {
        entry.external = entry.external.filter((moduleName) => {
            return moduleName.indexOf('@pixi-spine') !== 0;
        }).concat(umdDeps);
    }
})

module.exports = results;
