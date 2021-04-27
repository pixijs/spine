/// <reference path="../global.d.ts" />
import {AbstractSpineParser} from '@pixi-spine/loader-base';
import {BinaryInput, ISkeletonData, ISkeletonParser, TextureAtlas} from "@pixi-spine/base";
import {ILoaderResource, Loader} from "@pixi/loaders";
import * as spine38 from "@pixi-spine/runtime-3.8";
import * as spine37 from "@pixi-spine/runtime-3.7";
import * as spine40 from "@pixi-spine/runtime-4.0";
import {detectSpineVersion, SPINE_VERSION} from "./versions";

class UniBinaryParser implements ISkeletonParser {
    scale = 1;

    readSkeletonData(atlas: TextureAtlas, dataToParse: Uint8Array): ISkeletonData {
        const input = new BinaryInput(dataToParse);
        input.readString();
        const version = input.readString();
        const ver = detectSpineVersion(version);
        let parser: any = null;

        if (ver === SPINE_VERSION.VER38) {
            parser = new spine38.SkeletonBinary(new spine38.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER40) {
            parser = new spine40.SkeletonBinary(new spine40.AtlasAttachmentLoader(atlas));
        }
        if (!parser) {
            let error = `Unsupported version of spine model ${version}, please update pixi-spine`;
            console.error(error);
        }

        parser.scale = this.scale;
        return parser.readSkeletonData(dataToParse);
    }
}

class UniJsonParser implements ISkeletonParser {
    scale = 1;

    readSkeletonData(atlas: TextureAtlas, dataToParse: any): ISkeletonData {
        const version = dataToParse.skeleton.spine;
        const ver = detectSpineVersion(version);
        let parser: any = null;

        if (ver === SPINE_VERSION.VER37) {
            parser = new spine37.SkeletonJson(new spine37.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER38) {
            parser = new spine38.SkeletonJson(new spine38.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER40) {
            parser = new spine40.SkeletonJson(new spine40.AtlasAttachmentLoader(atlas));
        }
        if (!parser) {
            let error = `Unsupported version of spine model ${version}, please update pixi-spine`;
            console.error(error);
        }

        parser.scale = this.scale;
        return parser.readSkeletonData(dataToParse);
    }
}

/**
 * @public
 */
export class SpineParser extends AbstractSpineParser {
    createBinaryParser(): ISkeletonParser {
        return new UniBinaryParser();
    }

    createJsonParser(): ISkeletonParser {
        return new UniJsonParser();
    }

    parseData(resource: ILoaderResource, parser: ISkeletonParser, atlas: TextureAtlas, dataToParse: any): void {
        const parserCast = parser as (UniBinaryParser | UniJsonParser);
        resource.spineData = parserCast.readSkeletonData(atlas, dataToParse);
        resource.spineAtlas = atlas;
    }

    static use = new SpineParser().genMiddleware().use;

    static registerLoaderPlugin() {
        Loader.registerPlugin(SpineParser);
    }
}
