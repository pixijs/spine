const { main } = require('@pixi-build-tools/rollup-configurator/main');

module.exports = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine.base',
    },
});
