/// <reference path="../global.d.ts" />
import { AbstractSpineParser } from "@pixi-spine/loader-base";
import { ISkeletonParser, TextureAtlas } from "@pixi-spine/base";
import {
    AtlasAttachmentLoader,
    SkeletonBinary,
    SkeletonJson,
} from "@pixi-spine/runtime-4.0";

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

    parseData(
        resource: PIXI.LoaderResource,
        parser: ISkeletonParser,
        atlas: TextureAtlas,
        dataToParse: any
    ): void {
        const parserCast = parser as SkeletonBinary | SkeletonJson;

        parserCast.attachmentLoader = new AtlasAttachmentLoader(atlas);
        resource.spineData = parserCast.readSkeletonData(dataToParse);
        resource.spineAtlas = atlas;
    }

    static use = new SpineParser().genMiddleware().use;

    static registerLoaderPlugin() {
        PIXI.Loader.registerPlugin(SpineParser);
    }
}
