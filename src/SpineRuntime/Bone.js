var spine = require('../SpineUtil');
spine.Bone = function (boneData, skeleton, parent)
{
    this.data = boneData;
    this.skeleton = skeleton;
    this.parent = parent;
    this.matrix = new PIXI.Matrix();
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0, rotationIK: 0,
    scaleX: 1, scaleY: 1,
    flipX: false, flipY: false,

    worldSignX: 1, worldSignY: 1,
    updateWorldTransform: function() {
        var rotation = this.rotationIK;
        var scaleX = this.scaleX;
        var scaleY = this.scaleY;
        var x = this.x;
        var y = this.y;

        var cos = Math.cos(rotation * spine.degRad), sin = Math.sin(rotation * spine.degRad);
        var la = cos * scaleX, lb = -sin * scaleY, lc = sin * scaleX, ld = cos * scaleY;
        var parent = this.parent;
        var m = this.matrix;
        var skeleton = this.skeleton;
        if (!parent) { // Root bone.
            if (skeleton.flipX) {
                x = -x;
                la = -la;
                lb = -lb;
            }
            if (skeleton.flipY !== spine.Bone.yDown) {
                y = -y;
                lc = -lc;
                ld = -ld;
            }
            m.a = la;
            m.c = lb;
            m.b = lc;
            m.d = ld;
            m.tx = x;
            m.ty = y;
            this.worldSignX = spine.signum(scaleX);
            this.worldSignY = spine.signum(scaleY);
            return;
        }


        var pa = parent.matrix.a, pb = parent.matrix.c, pc = parent.matrix.b, pd = parent.matrix.d;
        m.tx = pa * x + pb * y + parent.matrix.tx;
        m.ty = pc * x + pd * y + parent.matrix.ty;
        this.worldSignX = parent.worldSignX * spine.signum(scaleX);
        this.worldSignY = parent.worldSignY * spine.signum(scaleY);
        var data = this.data;

        if (data.inheritRotation && data.inheritScale) {
            m.a = pa * la + pb * lc;
            m.c = pa * lb + pb * ld;
            m.b = pc * la + pd * lc;
            m.d = pc * lb + pd * ld;
        } else if (data.inheritRotation) { // No scale inheritance.
            pa = 1;
            pb = 0;
            pc = 0;
            pd = 1;
            do {
                cos = Math.cos(parent.rotationIK * spine.degRad);
                sin = Math.sin(parent.rotationIK * spine.degRad);
                var temp = pa * cos + pb * sin;
                pb = pa * -sin + pb * cos;
                pa = temp;
                temp = pc * cos + pd * sin;
                pd = pc * -sin + pd * cos;
                pc = temp;

                if (!parent.data.inheritRotation) break;
                parent = parent.parent;
            } while (parent != null);
            m.a = pa * la + pb * lc;
            m.c = pa * lb + pb * ld;
            m.b = pc * la + pd * lc;
            m.d = pc * lb + pd * ld;
            if (skeleton.flipX) {
                m.a = -m.a;
                m.c = -m.c;
            }
            if (skeleton.flipY !== spine.Bone.yDown) {
                m.b = -m.b;
                m.d = -m.d;
            }
        } else if (data.inheritScale) { // No rotation inheritance.
            pa = 1;
            pb = 0;
            pc = 0;
            pd = 1;
            do {
                var r = parent.rotation;
                cos = Math.cos(r * spine.radDeg);
                sin = Math.sin(r * spine.radDeg);
                var psx = parent.scaleX, psy = parent.scaleY;
                var za = cos * psx, zb = -sin * psy, zc = sin * psx, zd = cos * psy;
                temp = pa * za + pb * zc;
                pb = pa * zb + pb * zd;
                pa = temp;
                temp = pc * za + pd * zc;
                pd = pc * zb + pd * zd;
                pc = temp;

                if (psx < 0) {
                    r = -r;
                    sin = -sin;
                }
                temp = pa * cos + pb * sin;
                pb = pa * -sin + pb * cos;
                pa = temp;
                temp = pc * cos + pd * sin;
                pd = pc * -sin + pd * cos;
                pc = temp;

                if (!parent.data.inheritScale) break;
                parent = parent.parent;
            } while (parent != null);
            m.a = pa * la + pb * lc;
            m.c = pa * lb + pb * ld;
            m.b = pc * la + pd * lc;
            m.d = pc * lb + pd * ld;
            if (skeleton.flipX) {
                m.a = -m.a;
                m.c = -m.c;
            }
            if (skeleton.flipY !== spine.Bone.yDown) {
                m.b = -m.b;
                m.d = -m.d;
            }
        } else {
            m.a = la;
            m.c = lb;
            m.b = lc;
            m.d = ld;
        }
    },

    setToSetupPose: function ()
    {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.rotationIK = this.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.flipX = data.flipX;
        this.flipY = data.flipY;
    },
    worldToLocal: function (world)
    {
        var m = this.matrix;
        var dx = world[0] - m.tx, dy = m.ty;
        var invDet = 1 / (m.a * m.d - m.b * m.c);
        //Yep, its a bug in original spine. I hope they'll fix it: https://github.com/EsotericSoftware/spine-runtimes/issues/544
        world[0] = dx * m.a * invDet - dy * m.c * invDet;
        world[1] = dy * m.d * invDet - dx * m.b * invDet;
    },
    localToWorld: function (local)
    {
        var localX = local[0], localY = local[1];
        var m = this.matrix;
        local[0] = localX * m.a + localY * m.c + m.tx;
        local[1] = localX * m.b + localY * m.d + m.ty;
    },
    getWorldRotationX: function() {
        return Math.atan2(this.matrix.b, this.matrix.a) * spine.radDeg;

    },
    getWorldRotationY: function() {
        return Math.atan2(this.matrix.d, this.matrix.c) * spine.radDeg;
    },
    getWorldScaleX: function() {
        var a = this.matrix.a;
        var b = this.matrix.b;
        return Math.sqrt(a*a+b*b);
    },
    getWorldScaleY: function() {
        var c = this.matrix.c;
        var d = this.matrix.d;
        return Math.sqrt(c * c + d * d);
    }
};

Object.defineProperties(spine.Bone.prototype, {
    worldX: {
        get: function() {
            return this.matrix.tx;
        }
    },
    worldY:  {
        get: function() {
            return this.matrix.ty;
        }
    }
});

module.exports = spine.Bone;
