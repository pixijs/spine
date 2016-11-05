module PIXI.spine {
    export function atlasParser() {
        return function (resource: PIXI.loaders.Resource, next: () => any) {
            // skip if no data, its not json, or it isn't atlas data
            if (!resource.data || !resource.isJson || !resource.data.bones) {
                return next();
            }

            var metadataAtlas = resource.metadata ? resource.metadata.spineAtlas : null;
            if (metadataAtlas === false) {
                return next();
            }
            if (metadataAtlas && metadataAtlas.pages) {
                //its an atlas!
                var spineJsonParser = new core.SkeletonJson(new core.AtlasAttachmentLoader(metadataAtlas));
                var skeletonData = spineJsonParser.readSkeletonData(resource.data);

                resource.spineData = skeletonData;
                resource.spineAtlas = metadataAtlas;

                return next();
            }

            var metadataAtlasSuffix = '.atlas';
            if (resource.metadata && resource.metadata.spineAtlasSuffix) {
                metadataAtlasSuffix = resource.metadata.spineAtlasSuffix;
            }

            /**
             * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
             * that correspond to the spine file are in the same base URL and that the .json and .atlas files
             * have the same name
             */
            var atlasPath = resource.url.substr(0, resource.url.lastIndexOf('.')) + metadataAtlasSuffix;
            //remove the baseUrl
            atlasPath = atlasPath.replace(this.baseUrl, '');

            var atlasOptions = {
                crossOrigin: resource.crossOrigin,
                xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.TEXT,
                metadata: resource.metadata ? resource.metadata.spineMetadata : null
            };
            var imageOptions = {
                crossOrigin: resource.crossOrigin,
                metadata: resource.metadata ? resource.metadata.imageMetadata : null
            };
            var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);
            //remove the baseUrl
            baseUrl = baseUrl.replace(this.baseUrl, '');

            var adapter = imageLoaderAdapter(this, resource.name + '_atlas_page_', baseUrl, imageOptions);

            this.add(resource.name + '_atlas', atlasPath, atlasOptions, function () {
                new core.TextureAtlas(this.xhr.responseText, adapter, function (spineAtlas) {
                    var spineJsonParser = new core.SkeletonJson(new core.AtlasAttachmentLoader(spineAtlas));
                    var skeletonData = spineJsonParser.readSkeletonData(resource.data);

                    resource.spineData = skeletonData;
                    resource.spineAtlas = spineAtlas;

                    next();
                });
            });
        };
    }

    export function imageLoaderAdapter(loader: any, namePrefix: any, baseUrl: any, imageOptions: any) {
        if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
            baseUrl += '/';
        }
        return function (line: String, callback: (baseTexture: PIXI.BaseTexture) => any) {
            var name = namePrefix + line;
            var url = baseUrl + line;
            loader.add(name, url, imageOptions, (resource: PIXI.loaders.Resource) => {
                callback(resource.texture.baseTexture);
            });
        }
    }

    export function syncImageLoaderAdapter(baseUrl: any, crossOrigin: any) {
        if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
            baseUrl += '/';
        }
        return function (line: any, callback: any) {
            callback(PIXI.BaseTexture.fromImage(line, crossOrigin));
        }
    }

    PIXI.loaders.Loader.addPixiMiddleware(atlasParser);
    PIXI.loader.use(atlasParser());
}
