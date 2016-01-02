var spine = require('../SpineRuntime');

module.exports = function (baseUrl, crossOrigin) {
    if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length-1))
    {
        baseUrl += '/';
    }
    return function(line, callback) {
        callback(PIXI.BaseTexture.fromImage(line, crossOrigin));
    }
};
