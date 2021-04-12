const { main } = require('@pixi-build-tools/rollup-configurator/main');

module.exports = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine',
        '@pixi-spine/runtime-3.8': 'PIXI.spine',
        '@pixi-spine/loaders-3.8': 'PIXI.spine',
    },
});
