const {main} = require('@pixi-spine/rollup-config/main');

module.exports = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine.base',
    },
});
