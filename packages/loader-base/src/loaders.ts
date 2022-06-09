import { ISkeletonParser, TextureAtlas } from "@pixi-spine/base";

function isJson(resource: PIXI.LoaderResource) {
    return resource.type === PIXI.LoaderResource.TYPE.JSON;
}

function isBuffer(resource: PIXI.LoaderResource) {
    return (
        resource.xhrType ===
        (PIXI.LoaderResource as any).XHR_RESPONSE_TYPE.BUFFER
    );
}

PIXI.LoaderResource.setExtensionXhrType(
    "skel",
    PIXI.LoaderResource.XHR_RESPONSE_TYPE.BUFFER
);

/**
 * @public
 */
export abstract class AbstractSpineParser {
    abstract createJsonParser(): ISkeletonParser;

    abstract createBinaryParser(): ISkeletonParser;

    abstract parseData(
        resource: PIXI.LoaderResource,
        parser: ISkeletonParser,
        atlas: TextureAtlas,
        dataToParse: any
    ): void;

    genMiddleware() {
        const self = this;

        return {
            use(
                this: PIXI.Loader,
                resource: PIXI.LoaderResource,
                next: () => any
            ) {
                // skip if no data, its not json, or it isn't atlas data
                if (!resource.data) {
                    return next();
                }

                const isJsonSpineModel =
                    isJson(resource) && resource.data.bones;
                const isBinarySpineModel =
                    isBuffer(resource) &&
                    (resource.extension === "skel" ||
                        (resource.metadata &&
                            (resource.metadata as any).spineMetadata));

                if (!isJsonSpineModel && !isBinarySpineModel) {
                    return next();
                }

                let parser: ISkeletonParser = null;
                let dataToParse = resource.data;

                if (isJsonSpineModel) {
                    parser = self.createJsonParser();
                } else {
                    parser = self.createBinaryParser();
                    if (resource.data instanceof ArrayBuffer) {
                        dataToParse = new Uint8Array(resource.data);
                    }
                }

                const metadata = resource.metadata || {};
                const metadataSkeletonScale = metadata
                    ? (metadata as any).spineSkeletonScale
                    : null;

                if (metadataSkeletonScale) {
                    parser.scale = metadataSkeletonScale;
                }

                const metadataAtlas = metadata.spineAtlas;
                if (metadataAtlas === false) {
                    return next();
                }
                if (metadataAtlas && metadataAtlas.pages) {
                    self.parseData(
                        resource,
                        parser,
                        metadataAtlas,
                        dataToParse
                    );
                    return next();
                }

                const metadataAtlasSuffix =
                    metadata.spineAtlasSuffix || ".atlas";

                /**
                 * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
                 * that correspond to the spine file are in the same base URL and that the .json and .atlas files
                 * have the same name
                 */
                let atlasPath = resource.url;
                let queryStringPos = atlasPath.indexOf("?");
                if (queryStringPos > 0) {
                    //remove querystring
                    atlasPath = atlasPath.substr(0, queryStringPos);
                }
                atlasPath =
                    atlasPath.substr(0, atlasPath.lastIndexOf(".")) +
                    metadataAtlasSuffix;
                // use atlas path as a params. (no need to use same atlas file name with json file name)
                if (metadata.spineAtlasFile) {
                    atlasPath = metadata.spineAtlasFile;
                }

                //remove the baseUrl
                atlasPath = atlasPath.replace(this.baseUrl, "");

                const atlasOptions = {
                    crossOrigin: resource.crossOrigin,
                    xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.TEXT,
                    metadata: metadata.spineMetadata || null,
                    parentResource: resource,
                };
                const imageOptions = {
                    crossOrigin: resource.crossOrigin,
                    metadata: metadata.imageMetadata || null,
                    parentResource: resource,
                };
                let baseUrl = resource.url.substr(
                    0,
                    resource.url.lastIndexOf("/") + 1
                );
                //remove the baseUrl
                baseUrl = baseUrl.replace(this.baseUrl, "");

                const namePrefix =
                    metadata.imageNamePrefix || resource.name + "_atlas_page_";

                const adapter = metadata.images
                    ? staticImageLoader(metadata.images)
                    : metadata.image
                    ? staticImageLoader({ default: metadata.image })
                    : metadata.imageLoader
                    ? metadata.imageLoader(
                          this,
                          namePrefix,
                          baseUrl,
                          imageOptions
                      )
                    : imageLoaderAdapter(
                          this,
                          namePrefix,
                          baseUrl,
                          imageOptions
                      );

                function createSkeletonWithRawAtlas(rawData: string) {
                    new TextureAtlas(rawData, adapter, function (spineAtlas) {
                        if (spineAtlas) {
                            self.parseData(
                                resource,
                                parser,
                                spineAtlas,
                                dataToParse
                            );
                        }
                        next();
                    });
                }

                if (metadata.atlasRawData) {
                    createSkeletonWithRawAtlas(metadata.atlasRawData);
                } else {
                    this.add(
                        resource.name + "_atlas",
                        atlasPath,
                        atlasOptions,
                        function (atlasResource: any) {
                            if (!atlasResource.error) {
                                createSkeletonWithRawAtlas(atlasResource.data);
                            } else {
                                next();
                            }
                        }
                    );
                }
            },
        };
    }
}

/**
 * @public
 */
export function imageLoaderAdapter(
    loader: any,
    namePrefix: any,
    baseUrl: any,
    imageOptions: any
) {
    if (baseUrl && baseUrl.lastIndexOf("/") !== baseUrl.length - 1) {
        baseUrl += "/";
    }
    return function (
        line: string,
        callback: (baseTexture: PIXI.BaseTexture) => any
    ) {
        const name = namePrefix + line;
        const url = baseUrl + line;

        const cachedResource = loader.resources[name];
        if (cachedResource) {
            const done = () => {
                callback(cachedResource.texture.baseTexture);
            };
            if (cachedResource.texture) {
                done();
            } else {
                cachedResource.onAfterMiddleware.add(done);
            }
        } else {
            loader.add(
                name,
                url,
                imageOptions,
                (resource: PIXI.LoaderResource) => {
                    if (!resource.error) {
                        if (line.indexOf("-pma.") >= 0) {
                            resource.texture.baseTexture.alphaMode =
                                PIXI.ALPHA_MODES.PMA;
                        }

                        callback(resource.texture.baseTexture);
                    } else {
                        callback(null);
                    }
                }
            );
        }
    };
}

/**
 * @public
 */
export function syncImageLoaderAdapter(baseUrl: any, crossOrigin: any) {
    if (baseUrl && baseUrl.lastIndexOf("/") !== baseUrl.length - 1) {
        baseUrl += "/";
    }
    return function (line: any, callback: any) {
        callback(PIXI.BaseTexture.from(line, crossOrigin));
    };
}

/**
 * @public
 */
export function staticImageLoader(pages: {
    [key: string]: PIXI.BaseTexture | PIXI.Texture;
}) {
    return function (line: any, callback: any) {
        let page = pages[line] || (pages["default"] as any);
        if (page && page.baseTexture) callback(page.baseTexture);
        else callback(page);
    };
}
