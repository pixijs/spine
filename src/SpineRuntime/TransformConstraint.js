var spine = require('../SpineUtil');
var tempVec = [0, 0];
spine.TransformConstraint = function (data, skeleton)
{
    this.data = data;
    this.translateMix = data.translateMix;
    this.rotateMix = data.rotateMix;
    this.scaleMix = data.scaleMix;
    this.shearMix = data.shearMix;
    this.offsetX = data.offsetX;
    this.offsetY = data.offsetY;
    this.offsetScaleX = data.offsetScaleX;
    this.offsetScaleY = data.offsetScaleY;
    this.offsetShearY = data.offsetShearY;

    this.bone = skeleton.findBone(data.bone.name);
    this.target = skeleton.findBone(data.target.name);
};

spine.TransformConstraint.prototype = {
    update: function() {
        this.apply();
    },
    apply: function ()
    {
        var bm = this.bone.matrix;
        var tm = this.target.matrix;

        var rotateMix = this.rotateMix;
        if (rotateMix > 0) {
            var a = bm.a, b = bm.c, c = bm.b, d = bm.d;
            var r = Math.atan2(tm.b, tm.a) - Math.atan2(c, a) + this.offsetRotation * spine.degRad;
            if (r > Math.PI)
                r -= Math.PI*2;
            else if (r < -Math.PI) r += Math.PI*2;
            r *= rotateMix;
            var cos = Math.cos(r), sin = Math.sin(r);
            bm.a = cos * a - sin * c;
            bm.c = cos * b - sin * d;
            bm.b = sin * a + cos * c;
            bm.d = sin * b + cos * d;
        }

        var scaleMix = this.rotateMix;
        if (scaleMix > 0) {
            var bs = Math.sqrt(bm.a * bm.a + bm.b * bm.b);
            var ts = Math.sqrt(tm.a * tm.a + tm.b * tm.b);
            var s = bs > 0.00001 ? (bs + (ts - bs + this.offsetScaleX) * scaleMix) / bs : 0;
            bm.a *= s;
            bm.b *= s;
            bs = Math.sqrt(bm.c * bm.c + bm.d * bm.d);
            ts = Math.sqrt(bm.c * bm.c + bm.d * bm.d);
            s = bs > 0.00001 ? (bs + (ts - bs + this.offsetScaleY) * scaleMix) / bs : 0;
            bm.c *= s;
            bm.d *= s;
        }

        var shearMix = this.shearMix;
        if (shearMix > 0) {
            var b = bm.c, d = bm.d;
            var by = Math.atan2(d, b);
            var r = Math.atan2(tm.d, tm.c) - Math.atan2(tm.b, target.a) - (by - Math.atan2(bm.b, bm.a));
            if (r > Math.PI)
                r -= Math.PI*2;
            else if (r < -Math.PI) r += Math.PI*2;
            r = by + (r + this.offsetShearY * spine.degRad) * shearMix;
            var s = Math.sqrt(b * b + d * d);
            bm.c = Math.cos(r) * s;
            bm.d = Math.sin(r) * s;
        }

        var translateMix = this.translateMix;
        if (translateMix > 0) {
            tempVec[0] = this.offsetX;
            tempVec[1] = this.offsetY;
            target.localToWorld(tempVec);
            bm.tx += (tempVec.x - bm.tx) * translateMix;
            bm.ty += (tempVec.y - bm.ty) * translateMix;
        }
    }
};

module.exports = spine.TransformConstraint;
