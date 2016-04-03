var spine = require('../SpineUtil');
spine.IkConstraint = function (data, skeleton)
{
    this.data = data;
    this.mix = data.mix;
    this.bendDirection = data.bendDirection;

    this.bones = [];
    for (var i = 0, n = data.bones.length; i < n; i++)
        this.bones.push(skeleton.findBone(data.bones[i].name));
    this.target = skeleton.findBone(data.target.name);
};
spine.IkConstraint.prototype = {
    apply: function ()
    {
        var target = this.target;
        var bones = this.bones;
        switch (bones.length)
        {
        case 1:
            spine.IkConstraint.apply1(bones[0], target.worldX, target.worldY, this.mix);
            break;
        case 2:
            spine.IkConstraint.apply2(bones[0], bones[1], target.worldX, target.worldY, this.bendDirection, this.mix);
            break;
        }
    }
};
/** Adjusts the bone rotation so the tip is as close to the target position as possible. The target is specified in the world
 * coordinate system. */
spine.IkConstraint.apply1 = function (bone, targetX, targetY, alpha)
{
    var parentRotation = bone.parent ? bone.parent.getWorldRotationX(): 0;
    var rotation = bone.rotation;
    var rotationIK = Math.atan2(targetY - bone.worldY, targetX - bone.worldX) * spine.radDeg - parentRotation;
    if ((bone.worldSignX != bone.worldSignY) != (bone.skeleton.flipX != (bone.skeleton.flipY != spine.Bone.yDown))) rotationIK = 360 - rotationIK;
    if (rotationIK > 180)
        rotationIK -= 360;
    else if (rotationIK < -180) rotationIK += 360;
    bone.rotationIK = rotation + (rotationIK - rotation) * alpha;
};
/** Adjusts the parent and child bone rotations so the tip of the child is as close to the target position as possible. The
 * target is specified in the world coordinate system.
 * @param child Any descendant bone of the parent. */
spine.IkConstraint.apply2 = function (parent, child, targetX, targetY, bendDir, alpha)
{
    if (alpha == 0) return;
    var px = parent.x, py = parent.y, psx = parent.scaleX, psy = parent.scaleY, csx = child.scaleX, cy = child.y;
    var offset1, offset2, sign2;
    if (psx < 0) {
        psx = -psx;
        offset1 = 180;
        sign2 = -1;
    } else {
        offset1 = 0;
        sign2 = 1;
    }
    if (psy < 0) {
        psy = -psy;
        sign2 = -sign2;
    }
    if (csx < 0) {
        csx = -csx;
        offset2 = 180;
    } else
        offset2 = 0;
    var pp = parent.parent;
    var ppm = pp.matrix;
    var tx, ty, dx, dy;
    if (pp == null) {
        tx = targetX - px;
        ty = targetY - py;
        dx = child.worldX - px;
        dy = child.worldY - py;
    } else {
        var a = ppm.a, b = ppm.c, c = ppm.b, d = ppm.d, invDet = 1 / (a * d - b * c);
        var wx = ppm.tx, wy = ppm.ty, x = targetX - wx, y = targetY - wy;
        tx = (x * d - y * b) * invDet - px;
        ty = (y * a - x * c) * invDet - py;
        x = child.worldX - wx;
        y = child.worldY - wy;
        dx = (x * d - y * b) * invDet - px;
        dy = (y * a - x * c) * invDet - py;
    }
    var l1 = Math.sqrt(dx * dx + dy * dy), l2 = child.data.length * csx, a1, a2;
    outer:
        if (Math.abs(psx - psy) <= 0.0001) {
            l2 *= psx;
            var cos = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
            if (cos < -1)
                cos = -1;
            else if (cos > 1) cos = 1;
            a2 = Math.acos(cos) * bendDir;
            var a = l1 + l2 * cos, o = l2 * Math.sin(a2);
            a1 = Math.atan2(ty * a - tx * o, tx * a + ty * o);
        } else {
            cy = 0;
            var a = psx * l2, b = psy * l2, ta = Math.atan2(ty, tx);
            var aa = a * a, bb = b * b, ll = l1 * l1, dd = tx * tx + ty * ty;
            var c0 = bb * ll + aa * dd - aa * bb, c1 = -2 * bb * l1, c2 = bb - aa;
            var d = c1 * c1 - 4 * c2 * c0;
            if (d >= 0) {
                var q = Math.sqrt(d);
                if (c1 < 0) q = -q;
                q = -(c1 + q) / 2;
                var r0 = q / c2, r1 = c0 / q;
                var r = Math.abs(r0) < Math.abs(r1) ? r0 : r1;
                if (r * r <= dd) {
                    var y = Math.sqrt(dd - r * r) * bendDir;
                    a1 = ta - Math.atan2(y, r);
                    a2 = Math.atan2(y / psy, (r - l1) / psx);
                    break outer;
                }
            }
            var minAngle = 0, minDist = Infinity, minX = 0, minY = 0;
            var maxAngle = 0, maxDist = 0, maxX = 0, maxY = 0;
            var x = l1 + a, dist = x * x;
            if (dist > maxDist) {
                maxAngle = 0;
                maxDist = dist;
                maxX = x;
            }
            x = l1 - a;
            dist = x * x;
            if (dist < minDist) {
                minAngle = PI;
                minDist = dist;
                minX = x;
            }
            var angle = Math.acos(-a * l1 / (aa - bb));
            x = a * Math.cos(angle) + l1;
            var y = b * Math.sin(angle);
            dist = x * x + y * y;
            if (dist < minDist) {
                minAngle = angle;
                minDist = dist;
                minX = x;
                minY = y;
            }
            if (dist > maxDist) {
                maxAngle = angle;
                maxDist = dist;
                maxX = x;
                maxY = y;
            }
            if (dd <= (minDist + maxDist) / 2) {
                a1 = ta - Math.atan2(minY * bendDir, minX);
                a2 = minAngle * bendDir;
            } else {
                a1 = ta - Math.atan2(maxY * bendDir, maxX);
                a2 = maxAngle * bendDir;
            }
        }
    var offset = Math.atan2(cy, child.x) * sign2;
    a1 = (a1 - offset) * spine.radDeg + offset1;
    a2 = (a2 + offset) * spine.radDeg * sign2 + offset2;
    if (a1 > 180)
        a1 -= 360;
    else if (a1 < -180) a1 += 360;
    if (a2 > 180)
        a2 -= 360;
    else if (a2 < -180) a2 += 360;
    var rotation = parent.rotation;
    parent.rotationIK = rotation + (a1 - rotation) * alpha;
    rotation = child.rotation;
    child.rotationIK = rotation + (a2 - rotation) * alpha;
};
module.exports = spine.IkConstraint;

