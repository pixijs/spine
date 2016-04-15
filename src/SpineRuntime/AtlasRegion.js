var spine = require('../SpineUtil');
spine.AtlasRegion = function ()
{};
spine.AtlasRegion.prototype = {
    name: null,
    /**
     * @member {PIXI.Texture}
     */
    rendererObject: null,

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
            return this.rendererObject.frame.x;
        }
    },
    y: {
        get: function() {
            return this.rendererObject.frame.y;
        }
    },
    width: {
        get: function() {
            return this.rendererObject.trim.width;
        }
    },
    height: {
        get: function() {
            return this.rendererObject.trim.height;
        }
    },
    u: {
        get: function() {
            return this.rendererObject._uvs.x0;
        }
    },
    v: {
        get: function() {
            return this.rendererObject._uvs.y0;
        }
    },
    u2: {
        get: function() {
            return this.rendererObject._uvs.x2;
        }
    },
    v2: {
        get: function() {
            return this.rendererObject._uvs.y2;
        }
    },
    rotate: {
        get: function() {
            return !!this.rendererObject.rotate;
        }
    },
    offsetX: {
        get: function() {
            return this.rendererObject.trim.x;
        }
    },
    offsetY: {
        get: function() {
            return this.rendererObject.trim.y;
        }
    },
    originalWidth: {
        get: function() {
            return this.rendererObject.orig.width;
        }
    },
    originalHeight: {
        get: function() {
            return this.rendererObject.orig.height;
        }
    }
});

module.exports = spine.AtlasRegion;

