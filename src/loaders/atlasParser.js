var Resource = PIXI.loaders.Resource,
    async = PIXI.utils.async,
    spine = require('../SpineRuntime');

var atlasParser = module.exports = function () {
    return function (resource, next) {
        // skip if no data, its not json, or it isn't atlas data
        if (!resource.data || !resource.isJson || !resource.data.bones) {
            return next();
        }

        /**
         * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
         * that correspond to the spine file are in the same base URL and that the .json and .atlas files
         * have the same name
         */
        var atlasPath = resource.url.substr(0, resource.url.lastIndexOf('.')) + '.atlas';
        var atlasOptions = {
            crossOrigin: resource.crossOrigin,
            xhrType: Resource.XHR_RESPONSE_TYPE.TEXT
        };
        var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);


        this.add(resource.name + '_atlas', atlasPath, atlasOptions, function (res) {
            // create a spine atlas using the loaded text
            var spineAtlas = new spine.Atlas(this.xhr.responseText, baseUrl, res.crossOrigin);

            // spine animation
            var spineJsonParser = new spine.SkeletonJsonParser(new spine.AtlasAttachmentParser(spineAtlas));
            var skeletonData = spineJsonParser.readSkeletonData(resource.data);

            resource.spineData = skeletonData;
            resource.spineAtlas = spineAtlas;
            if (atlasParser.enableCaching)
                atlasParser.AnimCache[resource.name] = resource.spineData;

            // Go through each spineAtlas.pages and wait for page.rendererObject (a baseTexture) to
            // load. Once all loaded, then call the next function.
            async.each(spineAtlas.pages, function (page, done) {
                if (page.rendererObject.hasLoaded) {
                    done();
                }
                else {
                    page.rendererObject.once('loaded', done);
                }
            }, next);
        });
    };
};

atlasParser.AnimCache = {};
atlasParser.enableCaching = true;
