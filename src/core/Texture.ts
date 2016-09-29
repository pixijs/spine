export abstract class Texture {
    protected _image: HTMLImageElement;

    constructor (image: HTMLImageElement) {
        this._image = image;
    }

    getImage (): HTMLImageElement {
        return this._image;
    }

    abstract setFilters (minFilter: TextureFilter, magFilter: TextureFilter): void;
    abstract setWraps (uWrap: TextureWrap, vWrap: TextureWrap): void;
    abstract dispose (): void;


    public static filterFromString (text: string): TextureFilter {
        switch (text.toLowerCase()) {
            case "nearest": return TextureFilter.Nearest;
            case "linear": return TextureFilter.Linear;
            case "mipmap": return TextureFilter.MipMap;
            case "mipmapnearestnearest": return TextureFilter.MipMapNearestNearest;
            case "mipmaplinearnearest": return TextureFilter.MipMapLinearNearest;
            case "mipmapnearestlinear": return TextureFilter.MipMapNearestLinear;
            case "mipmaplinearlinear": return TextureFilter.MipMapLinearLinear;
            default: throw new Error(`Unknown texture filter ${text}`);
        }
    }

    public static wrapFromString (text: string): TextureWrap {
        switch (text.toLowerCase()) {
            case "mirroredtepeat": return TextureWrap.MirroredRepeat;
            case "clamptoedge": return TextureWrap.ClampToEdge;
            case "repeat": return TextureWrap.Repeat;
            default: throw new Error(`Unknown texture wrap ${text}`);
        }
    }
}

export enum TextureFilter {
    Nearest = 9728, // WebGLRenderingContext.NEAREST
    Linear = 9729, // WebGLRenderingContext.LINEAR
    MipMap = 9987, // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR
    MipMapNearestNearest = 9984, // WebGLRenderingContext.NEAREST_MIPMAP_NEAREST
    MipMapLinearNearest = 9985, // WebGLRenderingContext.LINEAR_MIPMAP_NEAREST
    MipMapNearestLinear = 9986, // WebGLRenderingContext.NEAREST_MIPMAP_LINEAR
    MipMapLinearLinear = 9987 // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR
}

export enum TextureWrap {
    MirroredRepeat = 33648, // WebGLRenderingContext.MIRRORED_REPEAT
    ClampToEdge = 33071, // WebGLRenderingContext.CLAMP_TO_EDGE
    Repeat = 10497 // WebGLRenderingContext.REPEAT
}

export class TextureRegion {
    texture: PIXI.Texture;

    //thats for overrides
    size: PIXI.Rectangle = null;

    get width(): number {
        const tex = this.texture;
        if (PIXI.VERSION[0] == '3') {
            return tex.crop.width;
        }
        if (tex.trim) {
            return tex.trim.width;
        }
        return tex.orig.width;
    }

    get height(): number {
        const tex = this.texture;
        if (PIXI.VERSION[0] == '3') {
            return tex.crop.height;
        }
        if (tex.trim) {
            return tex.trim.height;
        }
        return tex.orig.height;
    }

    get u(): number {
        return this.texture._uvs.x0;
    }

    get v(): number {
        return this.texture._uvs.y0;
    }

    get u2(): number {
        return this.texture._uvs.x2;
    }

    get v2(): number {
        return this.texture._uvs.y2;
    }

    get offsetX(): number {
        const tex = this.texture;
        return tex.trim ? tex.trim.x : 0;
    }

    get offsetY(): number {
        console.warn("Deprecation Warning: @Hackerham: I guess, if you are using PIXI-SPINE ATLAS region.offsetY, you want a texture, right? Use region.texture from now on.");
        return this.spineOffsetY;
    }

    get pixiOffsetY(): number {
        const tex = this.texture;
        return tex.trim ? tex.trim.y : 0;
    }

    get spineOffsetY(): number {
        var tex = this.texture;
        return this.originalHeight - this.height - (tex.trim ? tex.trim.y : 0);
    }

    get originalWidth(): number {
        var tex = this.texture;
        if (PIXI.VERSION[0] == '3') {
            if (tex.trim) {
                return tex.trim.width;
            }
            return tex.crop.width;
        }
        return tex.orig.width;
    }

    get originalHeight(): number {
        const tex = this.texture;
        if (PIXI.VERSION[0] == '3') {
            if (tex.trim) {
                return tex.trim.height;
            }
            return tex.crop.height;
        }
        return tex.orig.height;
    }

    get x(): number {
        return this.texture.frame.x;
    }

    get y(): number {
        return this.texture.frame.y;
    }

    get rotate(): boolean {
        return this.texture.rotate !== 0;
    }
}
