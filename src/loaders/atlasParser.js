var Resource = PIXI.loaders.Resource,
    spine = require('../SpineRuntime'),
    imageLoaderAdapter = require('./imageLoaderAdapter');

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
        //remove the baseUrl
        atlasPath = atlasPath.replace(this.baseUrl, '');

        var atlasOptions = {
            crossOrigin: resource.crossOrigin,
            xhrType: Resource.XHR_RESPONSE_TYPE.TEXT,
            metadata: resource.metadata ? resource.metadata.spineMetadata : null
        };
        var imageOptions = {
            crossOrigin: resource.crossOrigin,
            metadata: resource.metadata ? resource.metadata.imageMetadata: null
        };
        var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);
        //remove the baseUrl
        baseUrl = baseUrl.replace(this.baseUrl, '');

        var adapter = imageLoaderAdapter(this, resource.name + '_atlas_page_', baseUrl, imageOptions);
        this.add(resource.name + '_atlas', atlasPath, atlasOptions, function (res) {
            new spine.Atlas(this.xhr.responseText, adapter, function(spineAtlas) {
                var spineJsonParser = new spine.SkeletonJsonParser(new spine.AtlasAttachmentParser(spineAtlas));
                var skeletonData = spineJsonParser.readSkeletonData(resource.data);

                resource.spineData = skeletonData;
                resource.spineAtlas = spineAtlas;
                if (atlasParser.enableCaching)
                    atlasParser.AnimCache[resource.name] = resource.spineData;

                next();
            });
        });
    };
};

atlasParser.AnimCache = {};
atlasParser.enableCaching = true;
