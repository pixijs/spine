var spine = require('../SpineUtil');
spine.AtlasRegion = function ()
{};
spine.AtlasRegion.prototype = {
    name: null,
    /**
     * @member {PIXI.Texture}
     */
    texture: null,

    /**
     * @member {PIXI.spine.Spine.AtlasPage}
     */
    page: null,
    index: 0,
    splits: null,
    pads: null
};

Object.defineProperties(spine.AtlasRegion.prototype, {
    x: {
        get: function() {
            return this.texture.frame.x;
        }
    },
    y: {
        get: function() {
            return this.texture.frame.y;
        }
    },
    width: {
        get: function() {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                return tex.crop.width;
            }
            if (tex.trim) {
                return tex.trim.width;
            }
            return tex.orig.width;
        }
    },
    height: {
        get: function() {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                return tex.crop.height;
            }
            if (tex.trim) {
                return tex.trim.height;
            }
            return tex.orig.height;
        }
    },
    u: {
        get: function() {
            return this.texture._uvs.x0;
        }
    },
    v: {
        get: function() {
            return this.texture._uvs.y0;
        }
    },
    u2: {
        get: function() {
            return this.texture._uvs.x2;
        }
    },
    v2: {
        get: function() {
            return this.texture._uvs.y2;
        }
    },
    rotate: {
        get: function() {
            return !!this.texture.rotate;
        }
    },
    offsetX: {
        get: function() {
            var tex = this.texture;
            return tex.trim ? tex.trim.x : 0;
        }
    },
    offsetY: {
        get: function() {
            var tex = this.texture;
            return tex.trim ? tex.trim.y : 0;
        }
    },
    originalWidth: {
        get: function() {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                if (tex.trim) {
                    return tex.trim.width;
                }
                return tex.crop.width;
            }
            return tex.orig.width;
        }
    },
    originalHeight: {
        get: function() {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                if (tex.trim) {
                    return tex.trim.height;
                }
                return tex.crop.height;
            }
            return tex.orig.height;
        }
    }
});

module.exports = spine.AtlasRegion;

