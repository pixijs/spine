declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IResourceMetadata {
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

    interface ILoaderResource
    {
        spineData?: import('@pixi-spine/runtime-3.8').SkeletonData;
    }
}
