/**
 * @file        Spine resource loader
 * @author      Ivan Popelyshev <ivan.popelyshev@gmail.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI.loaders
 */

var atlasParser = require('./atlasParser');

function Loader(baseUrl, concurrency)
{
    PIXI.loaders.Loader.call(this, baseUrl, concurrency);

    // parse any spine data into a spine object
    this.use(atlasParser());
}

Loader.prototype = Object.create(PIXI.loaders.Loader.prototype);
Loader.prototype.constructor = Loader;

module.exports = Loader;
