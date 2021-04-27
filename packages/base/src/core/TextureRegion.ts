/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.5
 *
 * Copyright (c) 2013-2016, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable, and
 * non-transferable license to use, install, execute, and perform the Spine
 * Runtimes software and derivative works solely for personal or internal
 * use. Without the written permission of Esoteric Software (see Section 2 of
 * the Spine Software License Agreement), you may not (a) modify, translate,
 * adapt, or develop new applications using the Spine Runtimes or otherwise
 * create derivative works or improvements of the Spine Runtimes or (b) remove,
 * delete, alter, or obscure any trademarks or any copyright, trademark, patent,
 * or other intellectual property or proprietary rights notices on or in the
 * Software, including any copy thereof. Redistributions in binary or source
 * form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF
 * USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

import { Texture } from '@pixi/core';
import { Rectangle } from '@pixi/math';

/**
 * @public
 */
export function filterFromString (text: string): TextureFilter {
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

/**
 * @public
 */
export function wrapFromString (text: string): TextureWrap {
    switch (text.toLowerCase()) {
        case "mirroredtepeat": return TextureWrap.MirroredRepeat;
        case "clamptoedge": return TextureWrap.ClampToEdge;
        case "repeat": return TextureWrap.Repeat;
        default: throw new Error(`Unknown texture wrap ${text}`);
    }
}

/**
 * @public
 */
export enum TextureFilter {
    Nearest = 9728, // WebGLRenderingContext.NEAREST
    Linear = 9729, // WebGLRenderingContext.LINEAR
    MipMap = 9987, // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR
    MipMapNearestNearest = 9984, // WebGLRenderingContext.NEAREST_MIPMAP_NEAREST
    MipMapLinearNearest = 9985, // WebGLRenderingContext.LINEAR_MIPMAP_NEAREST
    MipMapNearestLinear = 9986, // WebGLRenderingContext.NEAREST_MIPMAP_LINEAR
    MipMapLinearLinear = 9987 // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR
}

/**
 * @public
 */
export enum TextureWrap {
    MirroredRepeat = 33648, // WebGLRenderingContext.MIRRORED_REPEAT
    ClampToEdge = 33071, // WebGLRenderingContext.CLAMP_TO_EDGE
    Repeat = 10497 // WebGLRenderingContext.REPEAT
}

/**
 * @public
 */
export class TextureRegion {
    texture: Texture;

    //thats for overrides
    size: Rectangle = null;

    get width(): number {
        const tex = this.texture;
        if (tex.trim) {
            return tex.trim.width;
        }
        return tex.orig.width;
    }

    get height(): number {
        const tex = this.texture;
        if (tex.trim) {
            return tex.trim.height;
        }
        return tex.orig.height;
    }

    get u(): number {
        return (this.texture as any)._uvs.x0;
    }

    get v(): number {
        return (this.texture as any)._uvs.y0;
    }

    get u2(): number {
        return (this.texture as any)._uvs.x2;
    }

    get v2(): number {
        return (this.texture as any)._uvs.y2;
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
        let tex = this.texture;
        return this.originalHeight - this.height - (tex.trim ? tex.trim.y : 0);
    }

    get originalWidth(): number {
        return this.texture.orig.width;
    }

    get originalHeight(): number {
        return this.texture.orig.height;
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

    get degrees() {
        return (360 - this.texture.rotate * 45) % 360;
    }
}
