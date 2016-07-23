/**
 * @namespace PIXI.spine
 */
module.exports = PIXI.spine = { // "PIXI.spine" assignment is here for people/plugins who use plugin both through require and as a plugin.
    Spine:          require('./Spine'),
    SpineRuntime:   require('./SpineRuntime'),
    loaders:        require('./loaders')
};
