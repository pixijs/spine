/* eslint-disable spaced-comment */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../global.d.ts" />
import { AbstractSpineParser } from '@pixi-spine/loader-base';
import type { ISkeletonParser, TextureAtlas } from '@pixi-spine/base';
import { LoaderResource, Loader } from '@pixi/loaders';
import { AtlasAttachmentLoader, SkeletonBinary, SkeletonJson } from '@pixi-spine/runtime-3.8';

/**
 * @public
 */
export class SpineParser extends AbstractSpineParser {
    createBinaryParser(): ISkeletonParser {
        return new SkeletonBinary(null);
    }

    createJsonParser(): ISkeletonParser {
        return new SkeletonJson(null);
    }

    parseData(resource: LoaderResource, parser: ISkeletonParser, atlas: TextureAtlas, dataToParse: any): void {
        const parserCast = parser as SkeletonBinary | SkeletonJson;

        parserCast.attachmentLoader = new AtlasAttachmentLoader(atlas);
        resource.spineData = parserCast.readSkeletonData(dataToParse);
        resource.spineAtlas = atlas;
    }

    static use = new SpineParser().genMiddleware().use;

    static registerLoaderPlugin() {
        Loader.registerPlugin(SpineParser);
    }
}
