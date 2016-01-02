var spine = require('../SpineRuntime');

module.exports = function (loader, namePrefix, baseUrl, imageOptions) {
    if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length-1))
    {
        baseUrl += '/';
    }
    return function(line, callback) {
        var name = namePrefix + line;
        var url = baseUrl + line;
        loader.add(name, url, imageOptions, function(resource) {
            callback(resource.texture.baseTexture);
        });
    }
};
