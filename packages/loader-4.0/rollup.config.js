const { main } = require('@pixi-build-tools/rollup-configurator/main');

module.exports = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine.base',
        '@pixi-spine/runtime-3.8': 'PIXI.spine',
        '@pixi-spine/loader-base': 'PIXI.spine',
    },
});
