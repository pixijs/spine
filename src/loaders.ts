declare namespace PIXI.loaders {
    export interface IMetadata {
        spineSkeletonScale?: number;
        spineAtlas?: any;
        spineAtlasSuffix?: string;
        spineAtlasFile?: string;
        spineMetadata?: any;
        imageNamePrefix?: string;
        atlasRawData?: string;
        imageLoader?: any;
        images?: any;
        imageMetadata?: any;
        image?: any;
    }
}

namespace pixi_spine {
    let Resource: any = PIXI.loaders.Resource; //pixijs 4.8.7 types, !@#$

    function isJson(resource: PIXI.loaders.Resource) {
        return resource.type === Resource.TYPE.JSON;
    }

    export function atlasParser() {
        return function atlasParser(resource: PIXI.loaders.Resource, next: () => any) {
            // skip if no data, its not json, or it isn't atlas data
            if (!resource.data ||
                !isJson(resource) ||
                !resource.data.bones) {
                return next();
            }
            const metadata = resource.metadata || {};
            const metadataSkeletonScale = metadata ? resource.metadata.spineSkeletonScale : null;

            const metadataAtlas = metadata ? resource.metadata.spineAtlas : null;
            if (metadataAtlas === false) {
                return next();
            }
            if (metadataAtlas && metadataAtlas.pages) {
                //its an atlas!
                const spineJsonParser = new core.SkeletonJson(new core.AtlasAttachmentLoader(metadataAtlas));
                if (metadataSkeletonScale) {
                    spineJsonParser.scale = metadataSkeletonScale;
                }
                const skeletonData = spineJsonParser.readSkeletonData(resource.data);

                resource.spineData = skeletonData;
                resource.spineAtlas = metadataAtlas;

                return next();
            }

            const metadataAtlasSuffix = metadata.spineAtlasSuffix || '.atlas';

            /**
             * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
             * that correspond to the spine file are in the same base URL and that the .json and .atlas files
             * have the same name
             */
            let atlasPath = resource.url
            let queryStringPos = atlasPath.indexOf('?')
            if (queryStringPos > 0) {
                //remove querystring
                atlasPath = atlasPath.substr(0, queryStringPos)
            }
            atlasPath = atlasPath.substr(0, atlasPath.lastIndexOf('.')) + metadataAtlasSuffix;
            // use atlas path as a params. (no need to use same atlas file name with json file name)
            if (resource.metadata && resource.metadata.spineAtlasFile) {
                atlasPath = resource.metadata.spineAtlasFile;
            }

            //remove the baseUrl
            atlasPath = atlasPath.replace(this.baseUrl, '');

            const atlasOptions = {
                crossOrigin: resource.crossOrigin,
                xhrType: Resource.XHR_RESPONSE_TYPE.TEXT,
                metadata: metadata.spineMetadata || null,
                parentResource: resource
            };
            const imageOptions = {
                crossOrigin: resource.crossOrigin,
                metadata: metadata.imageMetadata || null,
                parentResource: resource
            };
            let baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);
            //remove the baseUrl
            baseUrl = baseUrl.replace(this.baseUrl, '');

            const namePrefix = metadata.imageNamePrefix || (resource.name + '_atlas_page_');

            const adapter = metadata.images ? staticImageLoader(metadata.images)
                : metadata.image ? staticImageLoader({ 'default': metadata.image })
                    : metadata.imageLoader ? metadata.imageLoader(this, namePrefix, baseUrl, imageOptions)
                        : imageLoaderAdapter(this, namePrefix, baseUrl, imageOptions);

            const createSkeletonWithRawAtlas = function (rawData: string) {
                new core.TextureAtlas(rawData, adapter, function (spineAtlas) {
                    if (spineAtlas) {
                        const spineJsonParser = new pixi_spine.core.SkeletonJson(new pixi_spine.core.AtlasAttachmentLoader(spineAtlas));
                        if (metadataSkeletonScale) {
                            spineJsonParser.scale = metadataSkeletonScale;
                        }
                        resource.spineData = spineJsonParser.readSkeletonData(resource.data);
                        resource.spineAtlas = spineAtlas;
                    }
                    next();
                });
            };

            if (resource.metadata && resource.metadata.atlasRawData) {
                createSkeletonWithRawAtlas(resource.metadata.atlasRawData)
            } else {
                this.add(resource.name + '_atlas', atlasPath, atlasOptions, function (atlasResource: any) {
                    if (!atlasResource.error) {
                        createSkeletonWithRawAtlas(atlasResource.data);
                    } else {
                        next();
                    }
                });
            }
        };
    }

    export function imageLoaderAdapter(loader: any, namePrefix: any, baseUrl: any, imageOptions: any) {
        if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
            baseUrl += '/';
        }
        return function (line: string, callback: (baseTexture: PIXI.BaseTexture) => any) {
            const name = namePrefix + line;
            const url = baseUrl + line;

            const cachedResource = loader.resources[name];
            if (cachedResource) {
                function done() {
                    callback(cachedResource.texture.baseTexture)
                }

                if (cachedResource.texture) {
                    done();
                }
                else {
                    cachedResource.onAfterMiddleware.add(done);
                }
            } else {
                loader.add(name, url, imageOptions, (resource: PIXI.loaders.Resource) => {
                  if (!resource.error) {
                    callback(resource.texture.baseTexture);
                  } else {
                    callback(null);
                  }
                });
            }
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

    export function staticImageLoader(pages: { [key: string]: (PIXI.BaseTexture | PIXI.Texture) }) {
        return function (line: any, callback: any) {
            let page = pages[line] || pages['default'] as any;
            if (page && page.baseTexture)
                callback(page.baseTexture);
            else
                callback(page);
        }
    }

    if (PIXI.loaders.Loader) {
        PIXI.loaders.Loader.addPixiMiddleware(atlasParser);
        PIXI.loader.use(atlasParser());
    }
}
