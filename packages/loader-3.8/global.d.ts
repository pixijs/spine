declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IResourceMetadata extends Partial<import('@pixi-spine/loader-3.8').ISpine38ResourceMetadata>
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ILoaderResource extends Partial<import('@pixi-spine/loader-3.8').ISpine38LoaderResource>    {
    }
}
