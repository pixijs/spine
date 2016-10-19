/*!
 * pixi-spine - v1.2.0
 * Compiled Wed Oct 19 2016 21:56:10 GMT+0300 (RTZ 2 (зима))
 *
 * pixi-spine is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.PIXI || (g.PIXI = {})).spine = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spine = require("./core");
var TransformBase = PIXI.TransformBase;
spine.Bone.yDown = true;
var tempRgb = [0, 0, 0];
var SpineSprite = (function (_super) {
    __extends(SpineSprite, _super);
    function SpineSprite(tex) {
        _super.call(this, tex);
    }
    return SpineSprite;
}(PIXI.Sprite));
exports.SpineSprite = SpineSprite;
var SpineMesh = (function (_super) {
    __extends(SpineMesh, _super);
    function SpineMesh(texture, vertices, uvs, indices, drawMode) {
        _super.call(this, texture, vertices, uvs, indices, drawMode);
    }
    return SpineMesh;
}(PIXI.mesh.Mesh));
exports.SpineMesh = SpineMesh;
var Spine = (function (_super) {
    __extends(Spine, _super);
    function Spine(spineData) {
        _super.call(this);
        this.hackTextureBySlotName = function (slotName, texture, size) {
            if (texture === void 0) { texture = null; }
            if (size === void 0) { size = null; }
            var index = this.skeleton.findSlotIndex(slotName);
            if (index == -1) {
                return false;
            }
            return this.hackTextureBySlotIndex(index, texture, size);
        };
        if (!spineData) {
            throw new Error('The spineData param is required.');
        }
        if ((typeof spineData) === "string") {
            throw new Error('spineData param cant be string. Please use PIXI.spine.Spine.fromAtlas("YOUR_RESOURCE_NAME") from now on.');
        }
        this.spineData = spineData;
        this.skeleton = new spine.Skeleton(spineData);
        this.skeleton.updateWorldTransform();
        this.stateData = new spine.AnimationStateData(spineData);
        this.state = new spine.AnimationState(this.stateData);
        this.slotContainers = [];
        for (var i = 0, n = this.skeleton.slots.length; i < n; i++) {
            var slot = this.skeleton.slots[i];
            var attachment = slot.attachment;
            var slotContainer = new PIXI.Container();
            this.slotContainers.push(slotContainer);
            this.addChild(slotContainer);
            if (attachment instanceof spine.RegionAttachment) {
                var spriteName = attachment.region.name;
                var sprite = this.createSprite(slot, attachment, spriteName);
                slot.currentSprite = sprite;
                slot.currentSpriteName = spriteName;
                slotContainer.addChild(sprite);
            }
            else if (attachment instanceof spine.MeshAttachment) {
                var mesh = this.createMesh(slot, attachment);
                slot.currentMesh = mesh;
                slot.currentMeshName = attachment.name;
                slotContainer.addChild(mesh);
            }
            else {
                continue;
            }
        }
        this.autoUpdate = true;
        this.tintRgb = new Float32Array([1, 1, 1]);
    }
    Object.defineProperty(Spine.prototype, "autoUpdate", {
        get: function () {
            return (this.updateTransform === Spine.prototype.autoUpdateTransform);
        },
        set: function (value) {
            this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Spine.prototype, "tint", {
        get: function () {
            return PIXI.utils.rgb2hex(this.tintRgb);
        },
        set: function (value) {
            this.tintRgb = PIXI.utils.hex2rgb(value, this.tintRgb);
        },
        enumerable: true,
        configurable: true
    });
    Spine.prototype.update = function (dt) {
        this.state.update(dt);
        this.state.apply(this.skeleton);
        this.skeleton.updateWorldTransform();
        var drawOrder = this.skeleton.drawOrder;
        var slots = this.skeleton.slots;
        for (var i = 0, n = drawOrder.length; i < n; i++) {
            this.children[i] = this.slotContainers[drawOrder[i].data.index];
        }
        var r0 = this.tintRgb[0];
        var g0 = this.tintRgb[1];
        var b0 = this.tintRgb[2];
        for (i = 0, n = slots.length; i < n; i++) {
            var slot = slots[i];
            var attachment = slot.attachment;
            var slotContainer = this.slotContainers[i];
            if (!attachment) {
                slotContainer.visible = false;
                continue;
            }
            var attColor = attachment.color;
            if (attachment instanceof spine.RegionAttachment) {
                var region = attachment.region;
                if (region) {
                    var ar = region;
                    if (!slot.currentSpriteName || slot.currentSpriteName !== ar.name) {
                        var spriteName = ar.name;
                        if (slot.currentSprite) {
                            slot.currentSprite.visible = false;
                        }
                        slot.sprites = slot.sprites || {};
                        if (slot.sprites[spriteName] !== undefined) {
                            slot.sprites[spriteName].visible = true;
                        }
                        else {
                            var sprite = this.createSprite(slot, attachment, spriteName);
                            slotContainer.addChild(sprite);
                        }
                        slot.currentSprite = slot.sprites[spriteName];
                        slot.currentSpriteName = spriteName;
                    }
                }
                if (slotContainer.transform) {
                    var transform = slotContainer.transform;
                    var lt_1 = void 0;
                    if (slotContainer.transform.matrix2d) {
                        lt_1 = transform.matrix2d;
                        transform._dirtyVersion++;
                        transform.version = transform._dirtyVersion;
                        transform.isStatic = true;
                        transform.operMode = 0;
                    }
                    else {
                        if (TransformBase) {
                            if (transform.position) {
                                transform = new PIXI.TransformBase();
                                slotContainer.transform = transform;
                            }
                            lt_1 = transform.localTransform;
                        }
                        else {
                            if (!transform._dirtyLocal) {
                                transform = new PIXI.TransformStatic();
                                slotContainer.transform = transform;
                            }
                            lt_1 = transform.localTransform;
                            transform._dirtyParentVersion = -1;
                            transform._dirtyLocal = 1;
                            transform._versionLocal = 1;
                        }
                    }
                    slot.bone.matrix.copy(lt_1);
                }
                else {
                    var lt = slotContainer.localTransform || new PIXI.Matrix();
                    slot.bone.matrix.copy(lt);
                    slotContainer.localTransform = lt;
                    slotContainer.displayObjectUpdateTransform = SlotContainerUpdateTransformV3;
                }
                tempRgb[0] = r0 * slot.color.r * attColor.r;
                tempRgb[1] = g0 * slot.color.g * attColor.g;
                tempRgb[2] = b0 * slot.color.b * attColor.b;
                slot.currentSprite.tint = PIXI.utils.rgb2hex(tempRgb);
                slot.currentSprite.blendMode = slot.blendMode;
            }
            else if (attachment instanceof spine.MeshAttachment) {
                if (!slot.currentMeshName || slot.currentMeshName !== attachment.name) {
                    var meshName = attachment.name;
                    if (slot.currentMesh) {
                        slot.currentMesh.visible = false;
                    }
                    slot.meshes = slot.meshes || {};
                    if (slot.meshes[meshName] !== undefined) {
                        slot.meshes[meshName].visible = true;
                    }
                    else {
                        var mesh = this.createMesh(slot, attachment);
                        slotContainer.addChild(mesh);
                    }
                    slot.currentMesh = slot.meshes[meshName];
                    slot.currentMeshName = meshName;
                }
                attachment.computeWorldVertices(slot, slot.currentMesh.vertices);
                if (PIXI.VERSION[0] !== '3') {
                    var tintRgb = slot.currentMesh.tintRgb;
                    tintRgb[0] = r0 * slot.color.r * attColor.r;
                    tintRgb[1] = g0 * slot.color.g * attColor.g;
                    tintRgb[2] = b0 * slot.color.b * attColor.b;
                }
                slot.currentMesh.blendMode = slot.blendMode;
            }
            else {
                slotContainer.visible = false;
                continue;
            }
            slotContainer.visible = true;
            slotContainer.alpha = slot.color.a;
        }
    };
    ;
    Spine.prototype.setSpriteRegion = function (attachment, sprite, region) {
        sprite.region = region;
        sprite.texture = region.texture;
        if (!region.size) {
            sprite.scale.x = attachment.scaleX * attachment.width / region.originalWidth;
            sprite.scale.y = -attachment.scaleY * attachment.height / region.originalHeight;
        }
        else {
            sprite.scale.x = region.size.width / region.originalWidth;
            sprite.scale.y = -region.size.height / region.originalHeight;
        }
    };
    Spine.prototype.setMeshRegion = function (attachment, mesh, region) {
        mesh.region = region;
        mesh.texture = region.texture;
        attachment.updateUVs(region, mesh.uvs);
        mesh.dirty++;
    };
    Spine.prototype.autoUpdateTransform = function () {
        if (Spine.globalAutoUpdate) {
            this.lastTime = this.lastTime || Date.now();
            var timeDelta = (Date.now() - this.lastTime) * 0.001;
            this.lastTime = Date.now();
            this.update(timeDelta);
        }
        else {
            this.lastTime = 0;
        }
        PIXI.Container.prototype.updateTransform.call(this);
    };
    ;
    Spine.prototype.createSprite = function (slot, attachment, defName) {
        var region = attachment.region;
        if (slot.tempAttachment === attachment) {
            region = slot.tempRegion;
            slot.tempAttachment = null;
            slot.tempRegion = null;
        }
        var texture = region.texture;
        var sprite = new SpineSprite(texture);
        sprite.rotation = attachment.rotation * spine.MathUtils.degRad;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.position.x = attachment.x;
        sprite.position.y = attachment.y;
        sprite.alpha = attachment.color.a;
        sprite.region = attachment.region;
        this.setSpriteRegion(attachment, sprite, attachment.region);
        slot.sprites = slot.sprites || {};
        slot.sprites[defName] = sprite;
        return sprite;
    };
    ;
    Spine.prototype.createMesh = function (slot, attachment) {
        var region = attachment.region;
        if (slot.tempAttachment === attachment) {
            region = slot.tempRegion;
            slot.tempAttachment = null;
            slot.tempRegion = null;
        }
        var strip = new SpineMesh(region.texture, new Float32Array(attachment.regionUVs.length), new Float32Array(attachment.regionUVs.length), new Uint16Array(attachment.triangles), PIXI.mesh.Mesh.DRAW_MODES.TRIANGLES);
        strip.canvasPadding = 1.5;
        strip.alpha = attachment.color.a;
        strip.region = attachment.region;
        this.setMeshRegion(attachment, strip, region);
        slot.meshes = slot.meshes || {};
        slot.meshes[attachment.name] = strip;
        return strip;
    };
    ;
    Spine.prototype.hackTextureBySlotIndex = function (slotIndex, texture, size) {
        if (texture === void 0) { texture = null; }
        if (size === void 0) { size = null; }
        var slot = this.skeleton.slots[slotIndex];
        if (!slot) {
            return false;
        }
        var attachment = slot.attachment;
        var region = attachment.region;
        if (texture) {
            region = new spine.TextureRegion();
            region.texture = texture;
            region.size = size;
        }
        if (slot.currentSprite && slot.currentSprite.region != region) {
            this.setSpriteRegion(attachment, slot.currentSprite, region);
            slot.currentSprite.region = region;
        }
        else if (slot.currentMesh && slot.currentMesh.region != region) {
            this.setMeshRegion(attachment, slot.currentMesh, region);
        }
        else {
            slot.tempRegion = region;
            slot.tempAttachment = attachment;
        }
        return true;
    };
    Spine.globalAutoUpdate = true;
    return Spine;
}(PIXI.Container));
exports.Spine = Spine;
function SlotContainerUpdateTransformV3() {
    var pt = this.parent.worldTransform;
    var wt = this.worldTransform;
    var lt = this.localTransform;
    wt.a = lt.a * pt.a + lt.b * pt.c;
    wt.b = lt.a * pt.b + lt.b * pt.d;
    wt.c = lt.c * pt.a + lt.d * pt.c;
    wt.d = lt.c * pt.b + lt.d * pt.d;
    wt.tx = lt.tx * pt.a + lt.ty * pt.c + pt.tx;
    wt.ty = lt.tx * pt.b + lt.ty * pt.d + pt.ty;
    this.worldAlpha = this.alpha * this.parent.worldAlpha;
    this._currentBounds = null;
}
},{"./core":34}],2:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Utils_1 = require("./Utils");
var attachments_1 = require("./attachments");
var Animation = (function () {
    function Animation(name, timelines, duration) {
        if (name == null)
            throw new Error("name cannot be null.");
        if (timelines == null)
            throw new Error("timelines cannot be null.");
        this.name = name;
        this.timelines = timelines;
        this.duration = duration;
    }
    Animation.prototype.apply = function (skeleton, lastTime, time, loop, events) {
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        if (loop && this.duration != 0) {
            time %= this.duration;
            if (lastTime > 0)
                lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, 1);
    };
    Animation.prototype.mix = function (skeleton, lastTime, time, loop, events, alpha) {
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        if (loop && this.duration != 0) {
            time %= this.duration;
            if (lastTime > 0)
                lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, alpha);
    };
    Animation.binarySearch = function (values, target, step) {
        if (step === void 0) { step = 1; }
        var low = 0;
        var high = values.length / step - 2;
        if (high == 0)
            return step;
        var current = high >>> 1;
        while (true) {
            if (values[(current + 1) * step] <= target)
                low = current + 1;
            else
                high = current;
            if (low == high)
                return (low + 1) * step;
            current = (low + high) >>> 1;
        }
    };
    Animation.linearSearch = function (values, target, step) {
        for (var i = 0, last = values.length - step; i <= last; i += step)
            if (values[i] > target)
                return i;
        return -1;
    };
    return Animation;
}());
exports.Animation = Animation;
var CurveTimeline = (function () {
    function CurveTimeline(frameCount) {
        if (frameCount <= 0)
            throw new Error("frameCount must be > 0: " + frameCount);
        this.curves = Utils_1.Utils.newFloatArray((frameCount - 1) * CurveTimeline.BEZIER_SIZE);
    }
    CurveTimeline.prototype.getFrameCount = function () {
        return this.curves.length / CurveTimeline.BEZIER_SIZE + 1;
    };
    CurveTimeline.prototype.setLinear = function (frameIndex) {
        this.curves[frameIndex * CurveTimeline.BEZIER_SIZE] = CurveTimeline.LINEAR;
    };
    CurveTimeline.prototype.setStepped = function (frameIndex) {
        this.curves[frameIndex * CurveTimeline.BEZIER_SIZE] = CurveTimeline.STEPPED;
    };
    CurveTimeline.prototype.getCurveType = function (frameIndex) {
        var index = frameIndex * CurveTimeline.BEZIER_SIZE;
        if (index == this.curves.length)
            return CurveTimeline.LINEAR;
        var type = this.curves[index];
        if (type == CurveTimeline.LINEAR)
            return CurveTimeline.LINEAR;
        if (type == CurveTimeline.STEPPED)
            return CurveTimeline.STEPPED;
        return CurveTimeline.BEZIER;
    };
    CurveTimeline.prototype.setCurve = function (frameIndex, cx1, cy1, cx2, cy2) {
        var tmpx = (-cx1 * 2 + cx2) * 0.03, tmpy = (-cy1 * 2 + cy2) * 0.03;
        var dddfx = ((cx1 - cx2) * 3 + 1) * 0.006, dddfy = ((cy1 - cy2) * 3 + 1) * 0.006;
        var ddfx = tmpx * 2 + dddfx, ddfy = tmpy * 2 + dddfy;
        var dfx = cx1 * 0.3 + tmpx + dddfx * 0.16666667, dfy = cy1 * 0.3 + tmpy + dddfy * 0.16666667;
        var i = frameIndex * CurveTimeline.BEZIER_SIZE;
        var curves = this.curves;
        curves[i++] = CurveTimeline.BEZIER;
        var x = dfx, y = dfy;
        for (var n = i + CurveTimeline.BEZIER_SIZE - 1; i < n; i += 2) {
            curves[i] = x;
            curves[i + 1] = y;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }
    };
    CurveTimeline.prototype.getCurvePercent = function (frameIndex, percent) {
        percent = Utils_1.MathUtils.clamp(percent, 0, 1);
        var curves = this.curves;
        var i = frameIndex * CurveTimeline.BEZIER_SIZE;
        var type = curves[i];
        if (type == CurveTimeline.LINEAR)
            return percent;
        if (type == CurveTimeline.STEPPED)
            return 0;
        i++;
        var x = 0;
        for (var start = i, n = i + CurveTimeline.BEZIER_SIZE - 1; i < n; i += 2) {
            x = curves[i];
            if (x >= percent) {
                var prevX = void 0, prevY = void 0;
                if (i == start) {
                    prevX = 0;
                    prevY = 0;
                }
                else {
                    prevX = curves[i - 2];
                    prevY = curves[i - 1];
                }
                return prevY + (curves[i + 1] - prevY) * (percent - prevX) / (x - prevX);
            }
        }
        var y = curves[i - 1];
        return y + (1 - y) * (percent - x) / (1 - x);
    };
    CurveTimeline.LINEAR = 0;
    CurveTimeline.STEPPED = 1;
    CurveTimeline.BEZIER = 2;
    CurveTimeline.BEZIER_SIZE = 10 * 2 - 1;
    return CurveTimeline;
}());
exports.CurveTimeline = CurveTimeline;
var RotateTimeline = (function (_super) {
    __extends(RotateTimeline, _super);
    function RotateTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount << 1);
    }
    RotateTimeline.prototype.setFrame = function (frameIndex, time, degrees) {
        frameIndex <<= 1;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + RotateTimeline.ROTATION] = degrees;
    };
    RotateTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var bone = skeleton.bones[this.boneIndex];
        if (time >= frames[frames.length - RotateTimeline.ENTRIES]) {
            var amount_1 = bone.data.rotation + frames[frames.length + RotateTimeline.PREV_ROTATION] - bone.rotation;
            while (amount_1 > 180)
                amount_1 -= 360;
            while (amount_1 < -180)
                amount_1 += 360;
            bone.rotation += amount_1 * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, RotateTimeline.ENTRIES);
        var prevRotation = frames[frame + RotateTimeline.PREV_ROTATION];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent((frame >> 1) - 1, 1 - (time - frameTime) / (frames[frame + RotateTimeline.PREV_TIME] - frameTime));
        var amount = frames[frame + RotateTimeline.ROTATION] - prevRotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        amount = bone.data.rotation + (prevRotation + amount * percent) - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
    };
    RotateTimeline.ENTRIES = 2;
    RotateTimeline.PREV_TIME = -2;
    RotateTimeline.PREV_ROTATION = -1;
    RotateTimeline.ROTATION = 1;
    return RotateTimeline;
}(CurveTimeline));
exports.RotateTimeline = RotateTimeline;
var TranslateTimeline = (function (_super) {
    __extends(TranslateTimeline, _super);
    function TranslateTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * TranslateTimeline.ENTRIES);
    }
    TranslateTimeline.prototype.setFrame = function (frameIndex, time, x, y) {
        frameIndex *= TranslateTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + TranslateTimeline.X] = x;
        this.frames[frameIndex + TranslateTimeline.Y] = y;
    };
    TranslateTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var bone = skeleton.bones[this.boneIndex];
        if (time >= frames[frames.length - TranslateTimeline.ENTRIES]) {
            bone.x += (bone.data.x + frames[frames.length + TranslateTimeline.PREV_X] - bone.x) * alpha;
            bone.y += (bone.data.y + frames[frames.length + TranslateTimeline.PREV_Y] - bone.y) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, TranslateTimeline.ENTRIES);
        var prevX = frames[frame + TranslateTimeline.PREV_X];
        var prevY = frames[frame + TranslateTimeline.PREV_Y];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / TranslateTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + TranslateTimeline.PREV_TIME] - frameTime));
        bone.x += (bone.data.x + prevX + (frames[frame + TranslateTimeline.X] - prevX) * percent - bone.x) * alpha;
        bone.y += (bone.data.y + prevY + (frames[frame + TranslateTimeline.Y] - prevY) * percent - bone.y) * alpha;
    };
    TranslateTimeline.ENTRIES = 3;
    TranslateTimeline.PREV_TIME = -3;
    TranslateTimeline.PREV_X = -2;
    TranslateTimeline.PREV_Y = -1;
    TranslateTimeline.X = 1;
    TranslateTimeline.Y = 2;
    return TranslateTimeline;
}(CurveTimeline));
exports.TranslateTimeline = TranslateTimeline;
var ScaleTimeline = (function (_super) {
    __extends(ScaleTimeline, _super);
    function ScaleTimeline(frameCount) {
        _super.call(this, frameCount);
    }
    ScaleTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var bone = skeleton.bones[this.boneIndex];
        if (time >= frames[frames.length - ScaleTimeline.ENTRIES]) {
            bone.scaleX += (bone.data.scaleX * frames[frames.length + ScaleTimeline.PREV_X] - bone.scaleX) * alpha;
            bone.scaleY += (bone.data.scaleY * frames[frames.length + ScaleTimeline.PREV_Y] - bone.scaleY) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, ScaleTimeline.ENTRIES);
        var prevX = frames[frame + ScaleTimeline.PREV_X];
        var prevY = frames[frame + ScaleTimeline.PREV_Y];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / ScaleTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + ScaleTimeline.PREV_TIME] - frameTime));
        bone.scaleX += (bone.data.scaleX * (prevX + (frames[frame + ScaleTimeline.X] - prevX) * percent) - bone.scaleX) * alpha;
        bone.scaleY += (bone.data.scaleY * (prevY + (frames[frame + ScaleTimeline.Y] - prevY) * percent) - bone.scaleY) * alpha;
    };
    return ScaleTimeline;
}(TranslateTimeline));
exports.ScaleTimeline = ScaleTimeline;
var ShearTimeline = (function (_super) {
    __extends(ShearTimeline, _super);
    function ShearTimeline(frameCount) {
        _super.call(this, frameCount);
    }
    ShearTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var bone = skeleton.bones[this.boneIndex];
        if (time >= frames[frames.length - ShearTimeline.ENTRIES]) {
            bone.shearX += (bone.data.shearX + frames[frames.length + ShearTimeline.PREV_X] - bone.shearX) * alpha;
            bone.shearY += (bone.data.shearY + frames[frames.length + ShearTimeline.PREV_Y] - bone.shearY) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, ShearTimeline.ENTRIES);
        var prevX = frames[frame + ShearTimeline.PREV_X];
        var prevY = frames[frame + ShearTimeline.PREV_Y];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / ShearTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + ShearTimeline.PREV_TIME] - frameTime));
        bone.shearX += (bone.data.shearX + (prevX + (frames[frame + ShearTimeline.X] - prevX) * percent) - bone.shearX) * alpha;
        bone.shearY += (bone.data.shearY + (prevY + (frames[frame + ShearTimeline.Y] - prevY) * percent) - bone.shearY) * alpha;
    };
    return ShearTimeline;
}(TranslateTimeline));
exports.ShearTimeline = ShearTimeline;
var ColorTimeline = (function (_super) {
    __extends(ColorTimeline, _super);
    function ColorTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * ColorTimeline.ENTRIES);
    }
    ColorTimeline.prototype.setFrame = function (frameIndex, time, r, g, b, a) {
        frameIndex *= ColorTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + ColorTimeline.R] = r;
        this.frames[frameIndex + ColorTimeline.G] = g;
        this.frames[frameIndex + ColorTimeline.B] = b;
        this.frames[frameIndex + ColorTimeline.A] = a;
    };
    ColorTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var r = 0, g = 0, b = 0, a = 0;
        if (time >= frames[frames.length - ColorTimeline.ENTRIES]) {
            var i = frames.length;
            r = frames[i + ColorTimeline.PREV_R];
            g = frames[i + ColorTimeline.PREV_G];
            b = frames[i + ColorTimeline.PREV_B];
            a = frames[i + ColorTimeline.PREV_A];
        }
        else {
            var frame = Animation.binarySearch(frames, time, ColorTimeline.ENTRIES);
            r = frames[frame + ColorTimeline.PREV_R];
            g = frames[frame + ColorTimeline.PREV_G];
            b = frames[frame + ColorTimeline.PREV_B];
            a = frames[frame + ColorTimeline.PREV_A];
            var frameTime = frames[frame];
            var percent = this.getCurvePercent(frame / ColorTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + ColorTimeline.PREV_TIME] - frameTime));
            r += (frames[frame + ColorTimeline.R] - r) * percent;
            g += (frames[frame + ColorTimeline.G] - g) * percent;
            b += (frames[frame + ColorTimeline.B] - b) * percent;
            a += (frames[frame + ColorTimeline.A] - a) * percent;
        }
        var color = skeleton.slots[this.slotIndex].color;
        if (alpha < 1)
            color.add((r - color.r) * alpha, (g - color.g) * alpha, (b - color.b) * alpha, (a - color.a) * alpha);
        else
            color.set(r, g, b, a);
    };
    ColorTimeline.ENTRIES = 5;
    ColorTimeline.PREV_TIME = -5;
    ColorTimeline.PREV_R = -4;
    ColorTimeline.PREV_G = -3;
    ColorTimeline.PREV_B = -2;
    ColorTimeline.PREV_A = -1;
    ColorTimeline.R = 1;
    ColorTimeline.G = 2;
    ColorTimeline.B = 3;
    ColorTimeline.A = 4;
    return ColorTimeline;
}(CurveTimeline));
exports.ColorTimeline = ColorTimeline;
var AttachmentTimeline = (function () {
    function AttachmentTimeline(frameCount) {
        this.frames = Utils_1.Utils.newFloatArray(frameCount);
        this.attachmentNames = new Array(frameCount);
    }
    AttachmentTimeline.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    AttachmentTimeline.prototype.setFrame = function (frameIndex, time, attachmentName) {
        this.frames[frameIndex] = time;
        this.attachmentNames[frameIndex] = attachmentName;
    };
    AttachmentTimeline.prototype.apply = function (skeleton, lastTime, time, events, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var frameIndex = 0;
        if (time >= frames[frames.length - 1])
            frameIndex = frames.length - 1;
        else
            frameIndex = Animation.binarySearch(frames, time, 1) - 1;
        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex]
            .setAttachment(attachmentName == null ? null : skeleton.getAttachment(this.slotIndex, attachmentName));
    };
    return AttachmentTimeline;
}());
exports.AttachmentTimeline = AttachmentTimeline;
var EventTimeline = (function () {
    function EventTimeline(frameCount) {
        this.frames = Utils_1.Utils.newFloatArray(frameCount);
        this.events = new Array(frameCount);
    }
    EventTimeline.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    EventTimeline.prototype.setFrame = function (frameIndex, event) {
        this.frames[frameIndex] = event.time;
        this.events[frameIndex] = event;
    };
    EventTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        if (firedEvents == null)
            return;
        var frames = this.frames;
        var frameCount = this.frames.length;
        if (lastTime > time) {
            this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha);
            lastTime = -1;
        }
        else if (lastTime >= frames[frameCount - 1])
            return;
        if (time < frames[0])
            return;
        var frame = 0;
        if (lastTime < frames[0])
            frame = 0;
        else {
            frame = Animation.binarySearch(frames, lastTime);
            var frameTime = frames[frame];
            while (frame > 0) {
                if (frames[frame - 1] != frameTime)
                    break;
                frame--;
            }
        }
        for (; frame < frameCount && time >= frames[frame]; frame++)
            firedEvents.push(this.events[frame]);
    };
    return EventTimeline;
}());
exports.EventTimeline = EventTimeline;
var DrawOrderTimeline = (function () {
    function DrawOrderTimeline(frameCount) {
        this.frames = Utils_1.Utils.newFloatArray(frameCount);
        this.drawOrders = new Array(frameCount);
    }
    DrawOrderTimeline.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    DrawOrderTimeline.prototype.setFrame = function (frameIndex, time, drawOrder) {
        this.frames[frameIndex] = time;
        this.drawOrders[frameIndex] = drawOrder;
    };
    DrawOrderTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var frame = 0;
        if (time >= frames[frames.length - 1])
            frame = frames.length - 1;
        else
            frame = Animation.binarySearch(frames, time) - 1;
        var drawOrder = skeleton.drawOrder;
        var slots = skeleton.slots;
        var drawOrderToSetupIndex = this.drawOrders[frame];
        if (drawOrderToSetupIndex == null)
            Utils_1.Utils.arrayCopy(slots, 0, drawOrder, 0, slots.length);
        else {
            for (var i = 0, n = drawOrderToSetupIndex.length; i < n; i++)
                drawOrder[i] = slots[drawOrderToSetupIndex[i]];
        }
    };
    return DrawOrderTimeline;
}());
exports.DrawOrderTimeline = DrawOrderTimeline;
var DeformTimeline = (function (_super) {
    __extends(DeformTimeline, _super);
    function DeformTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount);
        this.frameVertices = new Array(frameCount);
    }
    DeformTimeline.prototype.setFrame = function (frameIndex, time, vertices) {
        this.frames[frameIndex] = time;
        this.frameVertices[frameIndex] = vertices;
    };
    DeformTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var slot = skeleton.slots[this.slotIndex];
        var slotAttachment = slot.getAttachment();
        if (!(slotAttachment instanceof attachments_1.VertexAttachment) || !slotAttachment.applyDeform(this.attachment))
            return;
        var frames = this.frames;
        if (time < frames[0])
            return;
        var frameVertices = this.frameVertices;
        var vertexCount = frameVertices[0].length;
        var verticesArray = slot.attachmentVertices;
        if (verticesArray.length != vertexCount)
            alpha = 1;
        var vertices = Utils_1.Utils.setArraySize(verticesArray, vertexCount);
        if (time >= frames[frames.length - 1]) {
            var lastVertices = frameVertices[frames.length - 1];
            if (alpha < 1) {
                for (var i = 0; i < vertexCount; i++)
                    vertices[i] += (lastVertices[i] - vertices[i]) * alpha;
            }
            else
                Utils_1.Utils.arrayCopy(lastVertices, 0, vertices, 0, vertexCount);
            return;
        }
        var frame = Animation.binarySearch(frames, time);
        var prevVertices = frameVertices[frame - 1];
        var nextVertices = frameVertices[frame];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame - 1, 1 - (time - frameTime) / (frames[frame - 1] - frameTime));
        if (alpha < 1) {
            for (var i = 0; i < vertexCount; i++) {
                var prev = prevVertices[i];
                vertices[i] += (prev + (nextVertices[i] - prev) * percent - vertices[i]) * alpha;
            }
        }
        else {
            for (var i = 0; i < vertexCount; i++) {
                var prev = prevVertices[i];
                vertices[i] = prev + (nextVertices[i] - prev) * percent;
            }
        }
    };
    return DeformTimeline;
}(CurveTimeline));
exports.DeformTimeline = DeformTimeline;
var IkConstraintTimeline = (function (_super) {
    __extends(IkConstraintTimeline, _super);
    function IkConstraintTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * IkConstraintTimeline.ENTRIES);
    }
    IkConstraintTimeline.prototype.setFrame = function (frameIndex, time, mix, bendDirection) {
        frameIndex *= IkConstraintTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + IkConstraintTimeline.MIX] = mix;
        this.frames[frameIndex + IkConstraintTimeline.BEND_DIRECTION] = bendDirection;
    };
    IkConstraintTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var constraint = skeleton.ikConstraints[this.ikConstraintIndex];
        if (time >= frames[frames.length - IkConstraintTimeline.ENTRIES]) {
            constraint.mix += (frames[frames.length + IkConstraintTimeline.PREV_MIX] - constraint.mix) * alpha;
            constraint.bendDirection = Math.floor(frames[frames.length + IkConstraintTimeline.PREV_BEND_DIRECTION]);
            return;
        }
        var frame = Animation.binarySearch(frames, time, IkConstraintTimeline.ENTRIES);
        var mix = frames[frame + IkConstraintTimeline.PREV_MIX];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / IkConstraintTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + IkConstraintTimeline.PREV_TIME] - frameTime));
        constraint.mix += (mix + (frames[frame + IkConstraintTimeline.MIX] - mix) * percent - constraint.mix) * alpha;
        constraint.bendDirection = Math.floor(frames[frame + IkConstraintTimeline.PREV_BEND_DIRECTION]);
    };
    IkConstraintTimeline.ENTRIES = 3;
    IkConstraintTimeline.PREV_TIME = -3;
    IkConstraintTimeline.PREV_MIX = -2;
    IkConstraintTimeline.PREV_BEND_DIRECTION = -1;
    IkConstraintTimeline.MIX = 1;
    IkConstraintTimeline.BEND_DIRECTION = 2;
    return IkConstraintTimeline;
}(CurveTimeline));
exports.IkConstraintTimeline = IkConstraintTimeline;
var TransformConstraintTimeline = (function (_super) {
    __extends(TransformConstraintTimeline, _super);
    function TransformConstraintTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * TransformConstraintTimeline.ENTRIES);
    }
    TransformConstraintTimeline.prototype.setFrame = function (frameIndex, time, rotateMix, translateMix, scaleMix, shearMix) {
        frameIndex *= TransformConstraintTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + TransformConstraintTimeline.ROTATE] = rotateMix;
        this.frames[frameIndex + TransformConstraintTimeline.TRANSLATE] = translateMix;
        this.frames[frameIndex + TransformConstraintTimeline.SCALE] = scaleMix;
        this.frames[frameIndex + TransformConstraintTimeline.SHEAR] = shearMix;
    };
    TransformConstraintTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var constraint = skeleton.transformConstraints[this.transformConstraintIndex];
        if (time >= frames[frames.length - TransformConstraintTimeline.ENTRIES]) {
            var i = frames.length;
            constraint.rotateMix += (frames[i + TransformConstraintTimeline.PREV_ROTATE] - constraint.rotateMix) * alpha;
            constraint.translateMix += (frames[i + TransformConstraintTimeline.PREV_TRANSLATE] - constraint.translateMix) * alpha;
            constraint.scaleMix += (frames[i + TransformConstraintTimeline.PREV_SCALE] - constraint.scaleMix) * alpha;
            constraint.shearMix += (frames[i + TransformConstraintTimeline.PREV_SHEAR] - constraint.shearMix) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, TransformConstraintTimeline.ENTRIES);
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / TransformConstraintTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + TransformConstraintTimeline.PREV_TIME] - frameTime));
        var rotate = frames[frame + TransformConstraintTimeline.PREV_ROTATE];
        var translate = frames[frame + TransformConstraintTimeline.PREV_TRANSLATE];
        var scale = frames[frame + TransformConstraintTimeline.PREV_SCALE];
        var shear = frames[frame + TransformConstraintTimeline.PREV_SHEAR];
        constraint.rotateMix += (rotate + (frames[frame + TransformConstraintTimeline.ROTATE] - rotate) * percent - constraint.rotateMix) * alpha;
        constraint.translateMix += (translate + (frames[frame + TransformConstraintTimeline.TRANSLATE] - translate) * percent - constraint.translateMix)
            * alpha;
        constraint.scaleMix += (scale + (frames[frame + TransformConstraintTimeline.SCALE] - scale) * percent - constraint.scaleMix) * alpha;
        constraint.shearMix += (shear + (frames[frame + TransformConstraintTimeline.SHEAR] - shear) * percent - constraint.shearMix) * alpha;
    };
    TransformConstraintTimeline.ENTRIES = 5;
    TransformConstraintTimeline.PREV_TIME = -5;
    TransformConstraintTimeline.PREV_ROTATE = -4;
    TransformConstraintTimeline.PREV_TRANSLATE = -3;
    TransformConstraintTimeline.PREV_SCALE = -2;
    TransformConstraintTimeline.PREV_SHEAR = -1;
    TransformConstraintTimeline.ROTATE = 1;
    TransformConstraintTimeline.TRANSLATE = 2;
    TransformConstraintTimeline.SCALE = 3;
    TransformConstraintTimeline.SHEAR = 4;
    return TransformConstraintTimeline;
}(CurveTimeline));
exports.TransformConstraintTimeline = TransformConstraintTimeline;
var PathConstraintPositionTimeline = (function (_super) {
    __extends(PathConstraintPositionTimeline, _super);
    function PathConstraintPositionTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * PathConstraintPositionTimeline.ENTRIES);
    }
    PathConstraintPositionTimeline.prototype.setFrame = function (frameIndex, time, value) {
        frameIndex *= PathConstraintPositionTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + PathConstraintPositionTimeline.VALUE] = value;
    };
    PathConstraintPositionTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (time >= frames[frames.length - PathConstraintPositionTimeline.ENTRIES]) {
            var i = frames.length;
            constraint.position += (frames[i + PathConstraintPositionTimeline.PREV_VALUE] - constraint.position) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, PathConstraintPositionTimeline.ENTRIES);
        var position = frames[frame + PathConstraintPositionTimeline.PREV_VALUE];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / PathConstraintPositionTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + PathConstraintPositionTimeline.PREV_TIME] - frameTime));
        constraint.position += (position + (frames[frame + PathConstraintPositionTimeline.VALUE] - position) * percent - constraint.position) * alpha;
    };
    PathConstraintPositionTimeline.ENTRIES = 2;
    PathConstraintPositionTimeline.PREV_TIME = -2;
    PathConstraintPositionTimeline.PREV_VALUE = -1;
    PathConstraintPositionTimeline.VALUE = 1;
    return PathConstraintPositionTimeline;
}(CurveTimeline));
exports.PathConstraintPositionTimeline = PathConstraintPositionTimeline;
var PathConstraintSpacingTimeline = (function (_super) {
    __extends(PathConstraintSpacingTimeline, _super);
    function PathConstraintSpacingTimeline(frameCount) {
        _super.call(this, frameCount);
    }
    PathConstraintSpacingTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (time >= frames[frames.length - PathConstraintSpacingTimeline.ENTRIES]) {
            var i = frames.length;
            constraint.spacing += (frames[i + PathConstraintSpacingTimeline.PREV_VALUE] - constraint.spacing) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, PathConstraintSpacingTimeline.ENTRIES);
        var spacing = frames[frame + PathConstraintSpacingTimeline.PREV_VALUE];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / PathConstraintSpacingTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + PathConstraintSpacingTimeline.PREV_TIME] - frameTime));
        constraint.spacing += (spacing + (frames[frame + PathConstraintSpacingTimeline.VALUE] - spacing) * percent - constraint.spacing) * alpha;
    };
    return PathConstraintSpacingTimeline;
}(PathConstraintPositionTimeline));
exports.PathConstraintSpacingTimeline = PathConstraintSpacingTimeline;
var PathConstraintMixTimeline = (function (_super) {
    __extends(PathConstraintMixTimeline, _super);
    function PathConstraintMixTimeline(frameCount) {
        _super.call(this, frameCount);
        this.frames = Utils_1.Utils.newFloatArray(frameCount * PathConstraintMixTimeline.ENTRIES);
    }
    PathConstraintMixTimeline.prototype.setFrame = function (frameIndex, time, rotateMix, translateMix) {
        frameIndex *= PathConstraintMixTimeline.ENTRIES;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + PathConstraintMixTimeline.ROTATE] = rotateMix;
        this.frames[frameIndex + PathConstraintMixTimeline.TRANSLATE] = translateMix;
    };
    PathConstraintMixTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var frames = this.frames;
        if (time < frames[0])
            return;
        var constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (time >= frames[frames.length - PathConstraintMixTimeline.ENTRIES]) {
            var i = frames.length;
            constraint.rotateMix += (frames[i + PathConstraintMixTimeline.PREV_ROTATE] - constraint.rotateMix) * alpha;
            constraint.translateMix += (frames[i + PathConstraintMixTimeline.PREV_TRANSLATE] - constraint.translateMix) * alpha;
            return;
        }
        var frame = Animation.binarySearch(frames, time, PathConstraintMixTimeline.ENTRIES);
        var rotate = frames[frame + PathConstraintMixTimeline.PREV_ROTATE];
        var translate = frames[frame + PathConstraintMixTimeline.PREV_TRANSLATE];
        var frameTime = frames[frame];
        var percent = this.getCurvePercent(frame / PathConstraintMixTimeline.ENTRIES - 1, 1 - (time - frameTime) / (frames[frame + PathConstraintMixTimeline.PREV_TIME] - frameTime));
        constraint.rotateMix += (rotate + (frames[frame + PathConstraintMixTimeline.ROTATE] - rotate) * percent - constraint.rotateMix) * alpha;
        constraint.translateMix += (translate + (frames[frame + PathConstraintMixTimeline.TRANSLATE] - translate) * percent - constraint.translateMix)
            * alpha;
    };
    PathConstraintMixTimeline.ENTRIES = 3;
    PathConstraintMixTimeline.PREV_TIME = -3;
    PathConstraintMixTimeline.PREV_ROTATE = -2;
    PathConstraintMixTimeline.PREV_TRANSLATE = -1;
    PathConstraintMixTimeline.ROTATE = 1;
    PathConstraintMixTimeline.TRANSLATE = 2;
    return PathConstraintMixTimeline;
}(CurveTimeline));
exports.PathConstraintMixTimeline = PathConstraintMixTimeline;
},{"./Utils":26,"./attachments":33}],3:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var AnimationState = (function () {
    function AnimationState(data) {
        if (data === void 0) { data = null; }
        this.tracks = new Array();
        this.events = new Array();
        this.timeScale = 1;
        if (data == null)
            throw new Error("data cannot be null.");
        this.data = data;
    }
    AnimationState.prototype.update = function (delta) {
        delta *= this.timeScale;
        for (var i = 0; i < this.tracks.length; i++) {
            var current = this.tracks[i];
            if (current == null)
                continue;
            var next = current.next;
            if (next != null) {
                var nextTime = current.lastTime - next.delay;
                if (nextTime >= 0) {
                    var nextDelta = delta * next.timeScale;
                    next.time = nextTime + nextDelta;
                    current.time += delta * current.timeScale;
                    this.setCurrent(i, next);
                    next.time -= nextDelta;
                    current = next;
                }
            }
            else if (!current.loop && current.lastTime >= current.endTime) {
                this.clearTrack(i);
                continue;
            }
            current.time += delta * current.timeScale;
            if (current.previous != null) {
                var previousDelta = delta * current.previous.timeScale;
                current.previous.time += previousDelta;
                current.mixTime += previousDelta;
            }
        }
    };
    AnimationState.prototype.apply = function (skeleton) {
        var events = this.events;
        for (var i = 0; i < this.tracks.length; i++) {
            var current = this.tracks[i];
            if (current == null)
                continue;
            events.length = 0;
            var time = current.time;
            var lastTime = current.lastTime;
            var endTime = current.endTime;
            var loop = current.loop;
            if (!loop && time > endTime)
                time = endTime;
            var previous = current.previous;
            if (previous == null)
                current.animation.mix(skeleton, lastTime, time, loop, events, current.mix);
            else {
                var previousTime = previous.time;
                if (!previous.loop && previousTime > previous.endTime)
                    previousTime = previous.endTime;
                previous.animation.apply(skeleton, previousTime, previousTime, previous.loop, null);
                var alpha = current.mixTime / current.mixDuration * current.mix;
                if (alpha >= 1) {
                    alpha = 1;
                    current.previous = null;
                }
                current.animation.mix(skeleton, lastTime, time, loop, events, alpha);
            }
            for (var ii = 0, nn = events.length; ii < nn; ii++) {
                var event_1 = events[ii];
                if (current.onEvent)
                    current.onEvent(i, event_1);
                if (this.onEvent)
                    this.onEvent(i, event_1);
            }
            if (loop ? (lastTime % endTime > time % endTime) : (lastTime < endTime && time >= endTime)) {
                var count = Utils_1.MathUtils.toInt(time / endTime);
                if (current.onComplete)
                    current.onComplete(i, count);
                if (this.onComplete)
                    this.onComplete(i, count);
            }
            current.lastTime = current.time;
        }
    };
    AnimationState.prototype.clearTracks = function () {
        for (var i = 0, n = this.tracks.length; i < n; i++)
            this.clearTrack(i);
        this.tracks.length = 0;
    };
    AnimationState.prototype.clearTrack = function (trackIndex) {
        if (trackIndex >= this.tracks.length)
            return;
        var current = this.tracks[trackIndex];
        if (current == null)
            return;
        if (current.onEnd)
            current.onEnd(trackIndex);
        if (this.onEnd)
            this.onEnd(trackIndex);
        this.tracks[trackIndex] = null;
        this.freeAll(current);
    };
    AnimationState.prototype.freeAll = function (entry) {
        while (entry != null) {
            var next = entry.next;
            entry = next;
        }
    };
    AnimationState.prototype.expandToIndex = function (index) {
        if (index < this.tracks.length)
            return this.tracks[index];
        Utils_1.Utils.setArraySize(this.tracks, index - this.tracks.length + 1, null);
        this.tracks.length = index + 1;
        return null;
    };
    AnimationState.prototype.setCurrent = function (index, entry) {
        var current = this.expandToIndex(index);
        if (current != null) {
            var previous = current.previous;
            current.previous = null;
            if (entry.onEnd)
                entry.onEnd(index);
            if (this.onEnd)
                this.onEnd(index);
            entry.mixDuration = this.data.getMix(current.animation, entry.animation);
            if (entry.mixDuration > 0) {
                entry.mixTime = 0;
                if (previous != null && current.mixTime / current.mixDuration < 0.5) {
                    entry.previous = previous;
                    previous = current;
                }
                else
                    entry.previous = current;
            }
        }
        this.tracks[index] = entry;
        if (entry.onStart)
            entry.onStart(index);
        if (this.onStart)
            this.onStart(index);
    };
    AnimationState.prototype.setAnimation = function (trackIndex, animationName, loop) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (animation == null)
            throw new Error("Animation not found: " + animationName);
        return this.setAnimationWith(trackIndex, animation, loop);
    };
    AnimationState.prototype.setAnimationWith = function (trackIndex, animation, loop) {
        var current = this.expandToIndex(trackIndex);
        if (current != null)
            this.freeAll(current.next);
        var entry = new TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;
        this.setCurrent(trackIndex, entry);
        return entry;
    };
    AnimationState.prototype.addAnimation = function (trackIndex, animationName, loop, delay) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (animation == null)
            throw new Error("Animation not found: " + animationName);
        return this.addAnimationWith(trackIndex, animation, loop, delay);
    };
    AnimationState.prototype.hasAnimation = function (animationName) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        return animation !== null;
    };
    AnimationState.prototype.addAnimationWith = function (trackIndex, animation, loop, delay) {
        var entry = new TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;
        var last = this.expandToIndex(trackIndex);
        if (last != null) {
            while (last.next != null)
                last = last.next;
            last.next = entry;
        }
        else
            this.tracks[trackIndex] = entry;
        if (delay <= 0) {
            if (last != null)
                delay += last.endTime - this.data.getMix(last.animation, animation);
            else
                delay = 0;
        }
        entry.delay = delay;
        return entry;
    };
    AnimationState.prototype.getCurrent = function (trackIndex) {
        if (trackIndex >= this.tracks.length)
            return null;
        return this.tracks[trackIndex];
    };
    AnimationState.prototype.setAnimationByName = function (trackIndex, animationName, loop) {
        if (!AnimationState.deprecatedWarning1) {
            AnimationState.deprecatedWarning1 = true;
            console.warn("Deprecation Warning: AnimationState.setAnimationByName is deprecated, please use setAnimation from now on.");
        }
        this.setAnimation(trackIndex, animationName, loop);
    };
    AnimationState.prototype.addAnimationByName = function (trackIndex, animationName, loop, delay) {
        if (!AnimationState.deprecatedWarning2) {
            AnimationState.deprecatedWarning2 = true;
            console.warn("Deprecation Warning: AnimationState.addAnimationByName is deprecated, please use addAnimation from now on.");
        }
        this.addAnimation(trackIndex, animationName, loop, delay);
    };
    AnimationState.prototype.hasAnimationByName = function (animationName) {
        if (!AnimationState.deprecatedWarning3) {
            AnimationState.deprecatedWarning3 = true;
            console.warn("Deprecation Warning: AnimationState.hasAnimationByName is deprecated, please use hasAnimation from now on.");
        }
        var animation = this.data.skeletonData.findAnimation(animationName);
        return animation !== null;
    };
    AnimationState.deprecatedWarning1 = false;
    AnimationState.deprecatedWarning2 = false;
    AnimationState.deprecatedWarning3 = false;
    return AnimationState;
}());
exports.AnimationState = AnimationState;
var TrackEntry = (function () {
    function TrackEntry() {
        this.loop = false;
        this.delay = 0;
        this.time = 0;
        this.lastTime = -1;
        this.endTime = 0;
        this.timeScale = 1;
        this.mixTime = 0;
        this.mixDuration = 0;
        this.mix = 1;
    }
    TrackEntry.prototype.reset = function () {
        this.next = null;
        this.previous = null;
        this.animation = null;
        this.timeScale = 1;
        this.lastTime = -1;
        this.time = 0;
    };
    TrackEntry.prototype.isComplete = function () {
        return this.time >= this.endTime;
    };
    return TrackEntry;
}());
exports.TrackEntry = TrackEntry;
},{"./Utils":26}],4:[function(require,module,exports){
"use strict";
var AnimationStateData = (function () {
    function AnimationStateData(skeletonData) {
        this.animationToMixTime = {};
        this.defaultMix = 0;
        if (skeletonData == null)
            throw new Error("skeletonData cannot be null.");
        this.skeletonData = skeletonData;
    }
    AnimationStateData.prototype.setMix = function (fromName, toName, duration) {
        var from = this.skeletonData.findAnimation(fromName);
        if (from == null)
            throw new Error("Animation not found: " + fromName);
        var to = this.skeletonData.findAnimation(toName);
        if (to == null)
            throw new Error("Animation not found: " + toName);
        this.setMixWith(from, to, duration);
    };
    AnimationStateData.prototype.setMixByName = function (fromName, toName, duration) {
        if (!AnimationStateData.deprecatedWarning1) {
            AnimationStateData.deprecatedWarning1 = true;
            console.warn("Deprecation Warning: AnimationStateData.setMixByName is deprecated, please use setMix from now on.");
        }
        this.setMix(fromName, toName, duration);
    };
    AnimationStateData.prototype.setMixWith = function (from, to, duration) {
        if (from == null)
            throw new Error("from cannot be null.");
        if (to == null)
            throw new Error("to cannot be null.");
        var key = from.name + to.name;
        this.animationToMixTime[key] = duration;
    };
    AnimationStateData.prototype.getMix = function (from, to) {
        var key = from.name + to.name;
        var value = this.animationToMixTime[key];
        return value === undefined ? this.defaultMix : value;
    };
    AnimationStateData.deprecatedWarning1 = false;
    return AnimationStateData;
}());
exports.AnimationStateData = AnimationStateData;
},{}],5:[function(require,module,exports){
"use strict";
var attachments_1 = require("./attachments");
var AtlasAttachmentLoader = (function () {
    function AtlasAttachmentLoader(atlas) {
        this.atlas = atlas;
    }
    AtlasAttachmentLoader.prototype.newRegionAttachment = function (skin, name, path) {
        var region = this.atlas.findRegion(path);
        if (region == null)
            throw new Error("Region not found in atlas: " + path + " (region attachment: " + name + ")");
        var attachment = new attachments_1.RegionAttachment(name);
        attachment.region = region;
        return attachment;
    };
    AtlasAttachmentLoader.prototype.newMeshAttachment = function (skin, name, path) {
        var region = this.atlas.findRegion(path);
        if (region == null)
            throw new Error("Region not found in atlas: " + path + " (mesh attachment: " + name + ")");
        var attachment = new attachments_1.MeshAttachment(name);
        attachment.region = region;
        return attachment;
    };
    AtlasAttachmentLoader.prototype.newBoundingBoxAttachment = function (skin, name) {
        return new attachments_1.BoundingBoxAttachment(name);
    };
    AtlasAttachmentLoader.prototype.newPathAttachment = function (skin, name) {
        return new attachments_1.PathAttachment(name);
    };
    return AtlasAttachmentLoader;
}());
exports.AtlasAttachmentLoader = AtlasAttachmentLoader;
},{"./attachments":33}],6:[function(require,module,exports){
"use strict";
(function (BlendMode) {
    BlendMode[BlendMode["Normal"] = 0] = "Normal";
    BlendMode[BlendMode["Additive"] = 1] = "Additive";
    BlendMode[BlendMode["Multiply"] = 2] = "Multiply";
    BlendMode[BlendMode["Screen"] = 3] = "Screen";
})(exports.BlendMode || (exports.BlendMode = {}));
var BlendMode = exports.BlendMode;
},{}],7:[function(require,module,exports){
"use strict";
var BoneData_1 = require("./BoneData");
var Utils_1 = require("./Utils");
var Bone = (function () {
    function Bone(data, skeleton, parent) {
        this.matrix = new PIXI.Matrix();
        this.children = new Array();
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scaleX = 0;
        this.scaleY = 0;
        this.shearX = 0;
        this.shearY = 0;
        this.ax = 0;
        this.ay = 0;
        this.arotation = 0;
        this.ascaleX = 0;
        this.ascaleY = 0;
        this.ashearX = 0;
        this.ashearY = 0;
        this.appliedValid = false;
        this.sorted = false;
        if (data == null)
            throw new Error("data cannot be null.");
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        this.data = data;
        this.skeleton = skeleton;
        this.parent = parent;
        this.setToSetupPose();
    }
    Object.defineProperty(Bone.prototype, "worldX", {
        get: function () {
            return this.matrix.tx;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Bone.prototype, "worldY", {
        get: function () {
            return this.matrix.ty;
        },
        enumerable: true,
        configurable: true
    });
    Bone.prototype.update = function () {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    };
    Bone.prototype.updateWorldTransform = function () {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    };
    Bone.prototype.updateWorldTransformWith = function (x, y, rotation, scaleX, scaleY, shearX, shearY) {
        this.ax = x;
        this.ay = y;
        this.arotation = rotation;
        this.ascaleX = scaleX;
        this.ascaleY = scaleY;
        this.ashearX = shearX;
        this.ashearY = shearY;
        this.appliedValid = true;
        var parent = this.parent;
        var m = this.matrix;
        if (parent == null) {
            var rotationY = rotation + 90 + shearY;
            var la = Utils_1.MathUtils.cosDeg(rotation + shearX) * scaleX;
            var lb = Utils_1.MathUtils.cosDeg(rotationY) * scaleY;
            var lc = Utils_1.MathUtils.sinDeg(rotation + shearX) * scaleX;
            var ld = Utils_1.MathUtils.sinDeg(rotationY) * scaleY;
            var skeleton = this.skeleton;
            if (skeleton.flipX) {
                x = -x;
                la = -la;
                lb = -lb;
            }
            if (skeleton.flipY !== Bone.yDown) {
                y = -y;
                lc = -lc;
                ld = -ld;
            }
            m.a = la;
            m.c = lb;
            m.b = lc;
            m.d = ld;
            m.tx = x + skeleton.x;
            m.ty = y + skeleton.y;
            return;
        }
        var pa = parent.matrix.a, pb = parent.matrix.c, pc = parent.matrix.b, pd = parent.matrix.d;
        m.tx = pa * x + pb * y + parent.matrix.tx;
        m.ty = pc * x + pd * y + parent.matrix.ty;
        switch (this.data.transformMode) {
            case BoneData_1.TransformMode.Normal: {
                var rotationY = rotation + 90 + shearY;
                var la = Utils_1.MathUtils.cosDeg(rotation + shearX) * scaleX;
                var lb = Utils_1.MathUtils.cosDeg(rotationY) * scaleY;
                var lc = Utils_1.MathUtils.sinDeg(rotation + shearX) * scaleX;
                var ld = Utils_1.MathUtils.sinDeg(rotationY) * scaleY;
                m.a = pa * la + pb * lc;
                m.c = pa * lb + pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
                return;
            }
            case BoneData_1.TransformMode.OnlyTranslation: {
                var rotationY = rotation + 90 + shearY;
                m.a = Utils_1.MathUtils.cosDeg(rotation + shearX) * scaleX;
                m.c = Utils_1.MathUtils.cosDeg(rotationY) * scaleY;
                m.b = Utils_1.MathUtils.sinDeg(rotation + shearX) * scaleX;
                m.d = Utils_1.MathUtils.sinDeg(rotationY) * scaleY;
                break;
            }
            case BoneData_1.TransformMode.NoRotationOrReflection: {
                var s = pa * pa + pc * pc;
                var prx = 0;
                if (s > 0.0001) {
                    s = Math.abs(pa * pd - pb * pc) / s;
                    pb = pc * s;
                    pd = pa * s;
                    prx = Math.atan2(pc, pa) * Utils_1.MathUtils.radDeg;
                }
                else {
                    pa = 0;
                    pc = 0;
                    prx = 90 - Math.atan2(pd, pb) * Utils_1.MathUtils.radDeg;
                }
                var rx = rotation + shearX - prx;
                var ry = rotation + shearY - prx + 90;
                var la = Utils_1.MathUtils.cosDeg(rx) * scaleX;
                var lb = Utils_1.MathUtils.cosDeg(ry) * scaleY;
                var lc = Utils_1.MathUtils.sinDeg(rx) * scaleX;
                var ld = Utils_1.MathUtils.sinDeg(ry) * scaleY;
                m.a = pa * la - pb * lc;
                m.c = pa * lb - pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
                break;
            }
            case BoneData_1.TransformMode.NoScale:
            case BoneData_1.TransformMode.NoScaleOrReflection: {
                var cos = Utils_1.MathUtils.cosDeg(rotation);
                var sin = Utils_1.MathUtils.sinDeg(rotation);
                var za = pa * cos + pb * sin;
                var zc = pc * cos + pd * sin;
                var s = Math.sqrt(za * za + zc * zc);
                if (s > 0.00001)
                    s = 1 / s;
                za *= s;
                zc *= s;
                s = Math.sqrt(za * za + zc * zc);
                var r = Math.PI / 2 + Math.atan2(zc, za);
                var zb = Math.cos(r) * s;
                var zd = Math.sin(r) * s;
                var la = Utils_1.MathUtils.cosDeg(shearX) * scaleX;
                var lb = Utils_1.MathUtils.cosDeg(90 + shearY) * scaleY;
                var lc = Utils_1.MathUtils.sinDeg(shearX) * scaleX;
                var ld = Utils_1.MathUtils.sinDeg(90 + shearY) * scaleY;
                m.a = za * la + zb * lc;
                m.c = za * lb + zb * ld;
                m.b = zc * la + zd * lc;
                m.d = zc * lb + zd * ld;
                if (this.data.transformMode != BoneData_1.TransformMode.NoScaleOrReflection ? pa * pd - pb * pc < 0 : (this.skeleton.flipX != this.skeleton.flipY) != Bone.yDown) {
                    m.b = -m.b;
                    m.d = -m.d;
                }
                return;
            }
        }
        if (this.skeleton.flipX) {
            m.a = -m.a;
            m.c = -m.c;
        }
        if (this.skeleton.flipY != Bone.yDown) {
            m.b = -m.b;
            m.d = -m.d;
        }
    };
    Bone.prototype.setToSetupPose = function () {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.shearX = data.shearX;
        this.shearY = data.shearY;
    };
    Bone.prototype.getWorldRotationX = function () {
        return Math.atan2(this.matrix.b, this.matrix.a) * Utils_1.MathUtils.radDeg;
    };
    Bone.prototype.getWorldRotationY = function () {
        return Math.atan2(this.matrix.d, this.matrix.c) * Utils_1.MathUtils.radDeg;
    };
    Bone.prototype.getWorldScaleX = function () {
        var m = this.matrix;
        return Math.sqrt(m.a * m.a + m.c * m.c);
    };
    Bone.prototype.getWorldScaleY = function () {
        var m = this.matrix;
        return Math.sqrt(m.b * m.b + m.d * m.d);
    };
    Bone.prototype.worldToLocalRotationX = function () {
        var parent = this.parent;
        if (parent == null)
            return this.arotation;
        var pm = parent.matrix, m = this.matrix;
        return Math.atan2(pm.a * m.b - pm.b * m.a, pm.d * m.a - pm.c * m.b) * Utils_1.MathUtils.radDeg;
    };
    Bone.prototype.worldToLocalRotationY = function () {
        var parent = this.parent;
        if (parent == null)
            return this.arotation;
        var pm = parent.matrix, m = this.matrix;
        return Math.atan2(pm.a * m.d - pm.b * m.c, pm.d * m.c - pm.c * m.d) * Utils_1.MathUtils.radDeg;
    };
    Bone.prototype.rotateWorld = function (degrees) {
        var m = this.matrix;
        var a = this.matrix.a, b = m.c, c = m.b, d = m.d;
        var cos = Utils_1.MathUtils.cosDeg(degrees), sin = Utils_1.MathUtils.sinDeg(degrees);
        m.a = cos * a - sin * c;
        m.c = cos * b - sin * d;
        m.b = sin * a + cos * c;
        m.d = sin * b + cos * d;
        this.appliedValid = false;
    };
    Bone.prototype.updateAppliedTransform = function () {
        this.appliedValid = true;
        var parent = this.parent;
        var m = this.matrix;
        if (parent == null) {
            this.ax = m.tx;
            this.ay = m.ty;
            this.arotation = Math.atan2(m.b, m.a) * Utils_1.MathUtils.radDeg;
            this.ascaleX = Math.sqrt(m.a * m.a + m.b * m.b);
            this.ascaleY = Math.sqrt(m.c * m.c + m.d * m.d);
            this.ashearX = 0;
            this.ashearY = Math.atan2(m.a * m.c + m.b * m.d, m.a * m.d - m.b * m.c) * Utils_1.MathUtils.radDeg;
            return;
        }
        var pm = parent.matrix;
        var pid = 1 / (pm.a * pm.d - pm.b * pm.c);
        var dx = m.tx - pm.tx, dy = m.ty - pm.ty;
        this.ax = (dx * pm.d * pid - dy * pm.c * pid);
        this.ay = (dy * pm.a * pid - dx * pm.b * pid);
        var ia = pid * pm.d;
        var id = pid * pm.a;
        var ib = pid * pm.c;
        var ic = pid * pm.b;
        var ra = ia * m.a - ib * m.b;
        var rb = ia * m.c - ib * m.d;
        var rc = id * m.b - ic * m.a;
        var rd = id * m.d - ic * m.c;
        this.ashearX = 0;
        this.ascaleX = Math.sqrt(ra * ra + rc * rc);
        if (this.ascaleX > 0.0001) {
            var det = ra * rd - rb * rc;
            this.ascaleY = det / this.ascaleX;
            this.ashearY = Math.atan2(ra * rb + rc * rd, det) * Utils_1.MathUtils.radDeg;
            this.arotation = Math.atan2(rc, ra) * Utils_1.MathUtils.radDeg;
        }
        else {
            this.ascaleX = 0;
            this.ascaleY = Math.sqrt(rb * rb + rd * rd);
            this.ashearY = 0;
            this.arotation = 90 - Math.atan2(rd, rb) * Utils_1.MathUtils.radDeg;
        }
    };
    Bone.prototype.worldToLocal = function (world) {
        var m = this.matrix;
        var a = m.a, b = m.c, c = m.b, d = m.d;
        var invDet = 1 / (a * d - b * c);
        var x = world.x - m.tx, y = world.y - m.ty;
        world.x = (x * d * invDet - y * b * invDet);
        world.y = (y * a * invDet - x * c * invDet);
        return world;
    };
    Bone.prototype.localToWorld = function (local) {
        var m = this.matrix;
        var x = local.x, y = local.y;
        local.x = x * m.a + y * m.c + m.tx;
        local.y = x * m.b + y * m.d + m.ty;
        return local;
    };
    Bone.yDown = false;
    return Bone;
}());
exports.Bone = Bone;
},{"./BoneData":8,"./Utils":26}],8:[function(require,module,exports){
"use strict";
var BoneData = (function () {
    function BoneData(index, name, parent) {
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.shearX = 0;
        this.shearY = 0;
        this.transformMode = TransformMode.Normal;
        if (index < 0)
            throw new Error("index must be >= 0.");
        if (name == null)
            throw new Error("name cannot be null.");
        this.index = index;
        this.name = name;
        this.parent = parent;
    }
    return BoneData;
}());
exports.BoneData = BoneData;
(function (TransformMode) {
    TransformMode[TransformMode["Normal"] = 0] = "Normal";
    TransformMode[TransformMode["OnlyTranslation"] = 1] = "OnlyTranslation";
    TransformMode[TransformMode["NoRotationOrReflection"] = 2] = "NoRotationOrReflection";
    TransformMode[TransformMode["NoScale"] = 3] = "NoScale";
    TransformMode[TransformMode["NoScaleOrReflection"] = 4] = "NoScaleOrReflection";
})(exports.TransformMode || (exports.TransformMode = {}));
var TransformMode = exports.TransformMode;
},{}],9:[function(require,module,exports){
"use strict";
var Event = (function () {
    function Event(time, data) {
        if (data == null)
            throw new Error("data cannot be null.");
        this.time = time;
        this.data = data;
    }
    return Event;
}());
exports.Event = Event;
},{}],10:[function(require,module,exports){
"use strict";
var EventData = (function () {
    function EventData(name) {
        this.name = name;
    }
    return EventData;
}());
exports.EventData = EventData;
},{}],11:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var IkConstraint = (function () {
    function IkConstraint(data, skeleton) {
        this.mix = 1;
        this.bendDirection = 0;
        this.level = 0;
        if (data == null)
            throw new Error("data cannot be null.");
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        this.data = data;
        this.mix = data.mix;
        this.bendDirection = data.bendDirection;
        this.bones = new Array();
        for (var i = 0; i < data.bones.length; i++)
            this.bones.push(skeleton.findBone(data.bones[i].name));
        this.target = skeleton.findBone(data.target.name);
    }
    IkConstraint.prototype.getOrder = function () {
        return this.data.order;
    };
    IkConstraint.prototype.apply = function () {
        this.update();
    };
    IkConstraint.prototype.update = function () {
        var target = this.target;
        var bones = this.bones;
        switch (bones.length) {
            case 1:
                this.apply1(bones[0], target.worldX, target.worldY, this.mix);
                break;
            case 2:
                this.apply2(bones[0], bones[1], target.worldX, target.worldY, this.bendDirection, this.mix);
                break;
        }
    };
    IkConstraint.prototype.apply1 = function (bone, targetX, targetY, alpha) {
        if (!bone.appliedValid)
            bone.updateAppliedTransform();
        var pp = bone.parent.matrix;
        var id = 1 / (pp.a * pp.d - pp.b * pp.c);
        var x = targetX - pp.tx, y = targetY - pp.ty;
        var tx = (x * pp.d - y * pp.c) * id - bone.ax, ty = (y * pp.a - x * pp.b) * id - bone.ay;
        var rotationIK = Math.atan2(ty, tx) * Utils_1.MathUtils.radDeg - bone.ashearX - bone.arotation;
        if (bone.ascaleX < 0)
            rotationIK += 180;
        if (rotationIK > 180)
            rotationIK -= 360;
        else if (rotationIK < -180)
            rotationIK += 360;
        bone.updateWorldTransformWith(bone.ax, bone.ay, bone.arotation + rotationIK * alpha, bone.ascaleX, bone.ascaleY, bone.ashearX, bone.ashearY);
    };
    IkConstraint.prototype.apply2 = function (parent, child, targetX, targetY, bendDir, alpha) {
        if (alpha == 0) {
            child.updateWorldTransform();
            return;
        }
        if (!parent.appliedValid)
            parent.updateAppliedTransform();
        if (!child.appliedValid)
            child.updateAppliedTransform();
        var px = parent.ax, py = parent.ay, psx = parent.ascaleX, psy = parent.ascaleY, csx = child.ascaleX;
        var os1 = 0, os2 = 0, s2 = 0;
        if (psx < 0) {
            psx = -psx;
            os1 = 180;
            s2 = -1;
        }
        else {
            os1 = 0;
            s2 = 1;
        }
        if (psy < 0) {
            psy = -psy;
            s2 = -s2;
        }
        if (csx < 0) {
            csx = -csx;
            os2 = 180;
        }
        else
            os2 = 0;
        var pm = parent.matrix;
        var cx = child.ax, cy = 0, cwx = 0, cwy = 0, a = pm.a, b = pm.c, c = pm.b, d = pm.d;
        var u = Math.abs(psx - psy) <= 0.0001;
        if (!u) {
            cy = 0;
            cwx = a * cx + pm.tx;
            cwy = c * cx + pm.ty;
        }
        else {
            cy = child.ay;
            cwx = a * cx + b * cy + pm.tx;
            cwy = c * cx + d * cy + pm.ty;
        }
        var pp = parent.parent;
        var ppm = parent.parent.matrix;
        a = ppm.a;
        b = ppm.c;
        c = ppm.b;
        d = ppm.d;
        var id = 1 / (a * d - b * c), x = targetX - ppm.tx, y = targetY - ppm.ty;
        var tx = (x * d - y * b) * id - px, ty = (y * a - x * c) * id - py;
        x = cwx - ppm.tx;
        y = cwy - ppm.ty;
        var dx = (x * d - y * b) * id - px, dy = (y * a - x * c) * id - py;
        var l1 = Math.sqrt(dx * dx + dy * dy), l2 = child.data.length * csx, a1 = 0, a2 = 0;
        outer: if (u) {
            l2 *= psx;
            var cos = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
            if (cos < -1)
                cos = -1;
            else if (cos > 1)
                cos = 1;
            a2 = Math.acos(cos) * bendDir;
            a = l1 + l2 * cos;
            b = l2 * Math.sin(a2);
            a1 = Math.atan2(ty * a - tx * b, tx * a + ty * b);
        }
        else {
            a = psx * l2;
            b = psy * l2;
            var aa = a * a, bb = b * b, dd = tx * tx + ty * ty, ta = Math.atan2(ty, tx);
            c = bb * l1 * l1 + aa * dd - aa * bb;
            var c1 = -2 * bb * l1, c2 = bb - aa;
            d = c1 * c1 - 4 * c2 * c;
            if (d >= 0) {
                var q = Math.sqrt(d);
                if (c1 < 0)
                    q = -q;
                q = -(c1 + q) / 2;
                var r0 = q / c2, r1 = c / q;
                var r = Math.abs(r0) < Math.abs(r1) ? r0 : r1;
                if (r * r <= dd) {
                    y = Math.sqrt(dd - r * r) * bendDir;
                    a1 = ta - Math.atan2(y, r);
                    a2 = Math.atan2(y / psy, (r - l1) / psx);
                    break outer;
                }
            }
            var minAngle = 0, minDist = Number.MAX_VALUE, minX = 0, minY = 0;
            var maxAngle = 0, maxDist = 0, maxX = 0, maxY = 0;
            x = l1 + a;
            d = x * x;
            if (d > maxDist) {
                maxAngle = 0;
                maxDist = d;
                maxX = x;
            }
            x = l1 - a;
            d = x * x;
            if (d < minDist) {
                minAngle = Utils_1.MathUtils.PI;
                minDist = d;
                minX = x;
            }
            var angle = Math.acos(-a * l1 / (aa - bb));
            x = a * Math.cos(angle) + l1;
            y = b * Math.sin(angle);
            d = x * x + y * y;
            if (d < minDist) {
                minAngle = angle;
                minDist = d;
                minX = x;
                minY = y;
            }
            if (d > maxDist) {
                maxAngle = angle;
                maxDist = d;
                maxX = x;
                maxY = y;
            }
            if (dd <= (minDist + maxDist) / 2) {
                a1 = ta - Math.atan2(minY * bendDir, minX);
                a2 = minAngle * bendDir;
            }
            else {
                a1 = ta - Math.atan2(maxY * bendDir, maxX);
                a2 = maxAngle * bendDir;
            }
        }
        var os = Math.atan2(cy, cx) * s2;
        var rotation = parent.arotation;
        a1 = (a1 - os) * Utils_1.MathUtils.radDeg + os1 - rotation;
        if (a1 > 180)
            a1 -= 360;
        else if (a1 < -180)
            a1 += 360;
        parent.updateWorldTransformWith(px, py, rotation + a1 * alpha, parent.ascaleX, parent.ascaleY, 0, 0);
        rotation = child.arotation;
        a2 = ((a2 + os) * Utils_1.MathUtils.radDeg - child.ashearX) * s2 + os2 - rotation;
        if (a2 > 180)
            a2 -= 360;
        else if (a2 < -180)
            a2 += 360;
        child.updateWorldTransformWith(cx, cy, rotation + a2 * alpha, child.ascaleX, child.ascaleY, child.ashearX, child.ashearY);
    };
    return IkConstraint;
}());
exports.IkConstraint = IkConstraint;
},{"./Utils":26}],12:[function(require,module,exports){
"use strict";
var IkConstraintData = (function () {
    function IkConstraintData(name) {
        this.order = 0;
        this.bones = new Array();
        this.bendDirection = 1;
        this.mix = 1;
        this.name = name;
    }
    return IkConstraintData;
}());
exports.IkConstraintData = IkConstraintData;
},{}],13:[function(require,module,exports){
"use strict";
var PathConstraintData_1 = require("./PathConstraintData");
var attachments_1 = require("./attachments");
var Utils_1 = require("./Utils");
var PathConstraint = (function () {
    function PathConstraint(data, skeleton) {
        this.position = 0;
        this.spacing = 0;
        this.rotateMix = 0;
        this.translateMix = 0;
        this.spaces = new Array();
        this.positions = new Array();
        this.world = new Array();
        this.curves = new Array();
        this.lengths = new Array();
        this.segments = new Array();
        if (data == null)
            throw new Error("data cannot be null.");
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        this.data = data;
        this.bones = new Array();
        for (var i = 0, n = data.bones.length; i < n; i++)
            this.bones.push(skeleton.findBone(data.bones[i].name));
        this.target = skeleton.findSlot(data.target.name);
        this.position = data.position;
        this.spacing = data.spacing;
        this.rotateMix = data.rotateMix;
        this.translateMix = data.translateMix;
    }
    PathConstraint.prototype.apply = function () {
        this.update();
    };
    PathConstraint.prototype.update = function () {
        var attachment = this.target.getAttachment();
        if (!(attachment instanceof attachments_1.PathAttachment))
            return;
        var rotateMix = this.rotateMix, translateMix = this.translateMix;
        var translate = translateMix > 0, rotate = rotateMix > 0;
        if (!translate && !rotate)
            return;
        var data = this.data;
        var spacingMode = data.spacingMode;
        var lengthSpacing = spacingMode == PathConstraintData_1.SpacingMode.Length;
        var rotateMode = data.rotateMode;
        var tangents = rotateMode == PathConstraintData_1.RotateMode.Tangent, scale = rotateMode == PathConstraintData_1.RotateMode.ChainScale;
        var boneCount = this.bones.length, spacesCount = tangents ? boneCount : boneCount + 1;
        var bones = this.bones;
        var spaces = Utils_1.Utils.setArraySize(this.spaces, spacesCount), lengths = null;
        var spacing = this.spacing;
        if (scale || lengthSpacing) {
            if (scale)
                lengths = Utils_1.Utils.setArraySize(this.lengths, boneCount);
            for (var i = 0, n = spacesCount - 1; i < n;) {
                var bone = bones[i];
                var m = bone.matrix;
                var length_1 = bone.data.length, x = length_1 * m.a, y = length_1 * m.b;
                length_1 = Math.sqrt(x * x + y * y);
                if (scale)
                    lengths[i] = length_1;
                spaces[++i] = lengthSpacing ? Math.max(0, length_1 + spacing) : spacing;
            }
        }
        else {
            for (var i = 1; i < spacesCount; i++)
                spaces[i] = spacing;
        }
        var positions = this.computeWorldPositions(attachment, spacesCount, tangents, data.positionMode == PathConstraintData_1.PositionMode.Percent, spacingMode == PathConstraintData_1.SpacingMode.Percent);
        var boneX = positions[0], boneY = positions[1], offsetRotation = data.offsetRotation;
        var tip = rotateMode == PathConstraintData_1.RotateMode.Chain && offsetRotation == 0;
        for (var i = 0, p = 3; i < boneCount; i++, p += 3) {
            var bone = bones[i];
            var m = bone.matrix;
            m.tx += (boneX - m.tx) * translateMix;
            m.ty += (boneY - m.ty) * translateMix;
            var x = positions[p], y = positions[p + 1], dx = x - boneX, dy = y - boneY;
            if (scale) {
                var length_2 = lengths[i];
                if (length_2 != 0) {
                    var s = (Math.sqrt(dx * dx + dy * dy) / length_2 - 1) * rotateMix + 1;
                    m.a *= s;
                    m.b *= s;
                }
            }
            boneX = x;
            boneY = y;
            if (rotate) {
                var a = m.a, b = m.c, c = m.b, d = m.d, r = 0, cos = 0, sin = 0;
                if (tangents)
                    r = positions[p - 1];
                else if (spaces[i + 1] == 0)
                    r = positions[p + 2];
                else
                    r = Math.atan2(dy, dx);
                r -= Math.atan2(c, a) - offsetRotation * Utils_1.MathUtils.degRad;
                if (tip) {
                    cos = Math.cos(r);
                    sin = Math.sin(r);
                    var length_3 = bone.data.length;
                    boneX += (length_3 * (cos * a - sin * c) - dx) * rotateMix;
                    boneY += (length_3 * (sin * a + cos * c) - dy) * rotateMix;
                }
                if (r > Utils_1.MathUtils.PI)
                    r -= Utils_1.MathUtils.PI2;
                else if (r < -Utils_1.MathUtils.PI)
                    r += Utils_1.MathUtils.PI2;
                r *= rotateMix;
                cos = Math.cos(r);
                sin = Math.sin(r);
                m.a = cos * a - sin * c;
                m.c = cos * b - sin * d;
                m.b = sin * a + cos * c;
                m.d = sin * b + cos * d;
            }
            bone.appliedValid = false;
        }
    };
    PathConstraint.prototype.computeWorldPositions = function (path, spacesCount, tangents, percentPosition, percentSpacing) {
        var target = this.target;
        var position = this.position;
        var spaces = this.spaces, out = Utils_1.Utils.setArraySize(this.positions, spacesCount * 3 + 2), world = null;
        var closed = path.closed;
        var verticesLength = path.worldVerticesLength, curveCount = verticesLength / 6, prevCurve = PathConstraint.NONE;
        if (!path.constantSpeed) {
            var lengths = path.lengths;
            curveCount -= closed ? 1 : 2;
            var pathLength_1 = lengths[curveCount];
            if (percentPosition)
                position *= pathLength_1;
            if (percentSpacing) {
                for (var i = 0; i < spacesCount; i++)
                    spaces[i] *= pathLength_1;
            }
            world = Utils_1.Utils.setArraySize(this.world, 8);
            for (var i = 0, o = 0, curve = 0; i < spacesCount; i++, o += 3) {
                var space = spaces[i];
                position += space;
                var p = position;
                if (closed) {
                    p %= pathLength_1;
                    if (p < 0)
                        p += pathLength_1;
                    curve = 0;
                }
                else if (p < 0) {
                    if (prevCurve != PathConstraint.BEFORE) {
                        prevCurve = PathConstraint.BEFORE;
                        path.computeWorldVerticesWith(target, 2, 4, world, 0);
                    }
                    this.addBeforePosition(p, world, 0, out, o);
                    continue;
                }
                else if (p > pathLength_1) {
                    if (prevCurve != PathConstraint.AFTER) {
                        prevCurve = PathConstraint.AFTER;
                        path.computeWorldVerticesWith(target, verticesLength - 6, 4, world, 0);
                    }
                    this.addAfterPosition(p - pathLength_1, world, 0, out, o);
                    continue;
                }
                for (;; curve++) {
                    var length_4 = lengths[curve];
                    if (p > length_4)
                        continue;
                    if (curve == 0)
                        p /= length_4;
                    else {
                        var prev = lengths[curve - 1];
                        p = (p - prev) / (length_4 - prev);
                    }
                    break;
                }
                if (curve != prevCurve) {
                    prevCurve = curve;
                    if (closed && curve == curveCount) {
                        path.computeWorldVerticesWith(target, verticesLength - 4, 4, world, 0);
                        path.computeWorldVerticesWith(target, 0, 4, world, 4);
                    }
                    else
                        path.computeWorldVerticesWith(target, curve * 6 + 2, 8, world, 0);
                }
                this.addCurvePosition(p, world[0], world[1], world[2], world[3], world[4], world[5], world[6], world[7], out, o, tangents || (i > 0 && space == 0));
            }
            return out;
        }
        if (closed) {
            verticesLength += 2;
            world = Utils_1.Utils.setArraySize(this.world, verticesLength);
            path.computeWorldVerticesWith(target, 2, verticesLength - 4, world, 0);
            path.computeWorldVerticesWith(target, 0, 2, world, verticesLength - 4);
            world[verticesLength - 2] = world[0];
            world[verticesLength - 1] = world[1];
        }
        else {
            curveCount--;
            verticesLength -= 4;
            world = Utils_1.Utils.setArraySize(this.world, verticesLength);
            path.computeWorldVerticesWith(target, 2, verticesLength, world, 0);
        }
        var curves = Utils_1.Utils.setArraySize(this.curves, curveCount);
        var pathLength = 0;
        var x1 = world[0], y1 = world[1], cx1 = 0, cy1 = 0, cx2 = 0, cy2 = 0, x2 = 0, y2 = 0;
        var tmpx = 0, tmpy = 0, dddfx = 0, dddfy = 0, ddfx = 0, ddfy = 0, dfx = 0, dfy = 0;
        for (var i = 0, w = 2; i < curveCount; i++, w += 6) {
            cx1 = world[w];
            cy1 = world[w + 1];
            cx2 = world[w + 2];
            cy2 = world[w + 3];
            x2 = world[w + 4];
            y2 = world[w + 5];
            tmpx = (x1 - cx1 * 2 + cx2) * 0.1875;
            tmpy = (y1 - cy1 * 2 + cy2) * 0.1875;
            dddfx = ((cx1 - cx2) * 3 - x1 + x2) * 0.09375;
            dddfy = ((cy1 - cy2) * 3 - y1 + y2) * 0.09375;
            ddfx = tmpx * 2 + dddfx;
            ddfy = tmpy * 2 + dddfy;
            dfx = (cx1 - x1) * 0.75 + tmpx + dddfx * 0.16666667;
            dfy = (cy1 - y1) * 0.75 + tmpy + dddfy * 0.16666667;
            pathLength += Math.sqrt(dfx * dfx + dfy * dfy);
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            pathLength += Math.sqrt(dfx * dfx + dfy * dfy);
            dfx += ddfx;
            dfy += ddfy;
            pathLength += Math.sqrt(dfx * dfx + dfy * dfy);
            dfx += ddfx + dddfx;
            dfy += ddfy + dddfy;
            pathLength += Math.sqrt(dfx * dfx + dfy * dfy);
            curves[i] = pathLength;
            x1 = x2;
            y1 = y2;
        }
        if (percentPosition)
            position *= pathLength;
        if (percentSpacing) {
            for (var i = 0; i < spacesCount; i++)
                spaces[i] *= pathLength;
        }
        var segments = this.segments;
        var curveLength = 0;
        for (var i = 0, o = 0, curve = 0, segment = 0; i < spacesCount; i++, o += 3) {
            var space = spaces[i];
            position += space;
            var p = position;
            if (closed) {
                p %= pathLength;
                if (p < 0)
                    p += pathLength;
                curve = 0;
            }
            else if (p < 0) {
                this.addBeforePosition(p, world, 0, out, o);
                continue;
            }
            else if (p > pathLength) {
                this.addAfterPosition(p - pathLength, world, verticesLength - 4, out, o);
                continue;
            }
            for (;; curve++) {
                var length_5 = curves[curve];
                if (p > length_5)
                    continue;
                if (curve == 0)
                    p /= length_5;
                else {
                    var prev = curves[curve - 1];
                    p = (p - prev) / (length_5 - prev);
                }
                break;
            }
            if (curve != prevCurve) {
                prevCurve = curve;
                var ii = curve * 6;
                x1 = world[ii];
                y1 = world[ii + 1];
                cx1 = world[ii + 2];
                cy1 = world[ii + 3];
                cx2 = world[ii + 4];
                cy2 = world[ii + 5];
                x2 = world[ii + 6];
                y2 = world[ii + 7];
                tmpx = (x1 - cx1 * 2 + cx2) * 0.03;
                tmpy = (y1 - cy1 * 2 + cy2) * 0.03;
                dddfx = ((cx1 - cx2) * 3 - x1 + x2) * 0.006;
                dddfy = ((cy1 - cy2) * 3 - y1 + y2) * 0.006;
                ddfx = tmpx * 2 + dddfx;
                ddfy = tmpy * 2 + dddfy;
                dfx = (cx1 - x1) * 0.3 + tmpx + dddfx * 0.16666667;
                dfy = (cy1 - y1) * 0.3 + tmpy + dddfy * 0.16666667;
                curveLength = Math.sqrt(dfx * dfx + dfy * dfy);
                segments[0] = curveLength;
                for (ii = 1; ii < 8; ii++) {
                    dfx += ddfx;
                    dfy += ddfy;
                    ddfx += dddfx;
                    ddfy += dddfy;
                    curveLength += Math.sqrt(dfx * dfx + dfy * dfy);
                    segments[ii] = curveLength;
                }
                dfx += ddfx;
                dfy += ddfy;
                curveLength += Math.sqrt(dfx * dfx + dfy * dfy);
                segments[8] = curveLength;
                dfx += ddfx + dddfx;
                dfy += ddfy + dddfy;
                curveLength += Math.sqrt(dfx * dfx + dfy * dfy);
                segments[9] = curveLength;
                segment = 0;
            }
            p *= curveLength;
            for (;; segment++) {
                var length_6 = segments[segment];
                if (p > length_6)
                    continue;
                if (segment == 0)
                    p /= length_6;
                else {
                    var prev = segments[segment - 1];
                    p = segment + (p - prev) / (length_6 - prev);
                }
                break;
            }
            this.addCurvePosition(p * 0.1, x1, y1, cx1, cy1, cx2, cy2, x2, y2, out, o, tangents || (i > 0 && space == 0));
        }
        return out;
    };
    PathConstraint.prototype.addBeforePosition = function (p, temp, i, out, o) {
        var x1 = temp[i], y1 = temp[i + 1], dx = temp[i + 2] - x1, dy = temp[i + 3] - y1, r = Math.atan2(dy, dx);
        out[o] = x1 + p * Math.cos(r);
        out[o + 1] = y1 + p * Math.sin(r);
        out[o + 2] = r;
    };
    PathConstraint.prototype.addAfterPosition = function (p, temp, i, out, o) {
        var x1 = temp[i + 2], y1 = temp[i + 3], dx = x1 - temp[i], dy = y1 - temp[i + 1], r = Math.atan2(dy, dx);
        out[o] = x1 + p * Math.cos(r);
        out[o + 1] = y1 + p * Math.sin(r);
        out[o + 2] = r;
    };
    PathConstraint.prototype.addCurvePosition = function (p, x1, y1, cx1, cy1, cx2, cy2, x2, y2, out, o, tangents) {
        if (p == 0 || isNaN(p))
            p = 0.0001;
        var tt = p * p, ttt = tt * p, u = 1 - p, uu = u * u, uuu = uu * u;
        var ut = u * p, ut3 = ut * 3, uut3 = u * ut3, utt3 = ut3 * p;
        var x = x1 * uuu + cx1 * uut3 + cx2 * utt3 + x2 * ttt, y = y1 * uuu + cy1 * uut3 + cy2 * utt3 + y2 * ttt;
        out[o] = x;
        out[o + 1] = y;
        if (tangents)
            out[o + 2] = Math.atan2(y - (y1 * uu + cy1 * ut * 2 + cy2 * tt), x - (x1 * uu + cx1 * ut * 2 + cx2 * tt));
    };
    PathConstraint.prototype.getOrder = function () {
        return this.data.order;
    };
    PathConstraint.NONE = -1;
    PathConstraint.BEFORE = -2;
    PathConstraint.AFTER = -3;
    return PathConstraint;
}());
exports.PathConstraint = PathConstraint;
},{"./PathConstraintData":14,"./Utils":26,"./attachments":33}],14:[function(require,module,exports){
"use strict";
var PathConstraintData = (function () {
    function PathConstraintData(name) {
        this.order = 0;
        this.bones = new Array();
        this.name = name;
    }
    return PathConstraintData;
}());
exports.PathConstraintData = PathConstraintData;
(function (PositionMode) {
    PositionMode[PositionMode["Fixed"] = 0] = "Fixed";
    PositionMode[PositionMode["Percent"] = 1] = "Percent";
})(exports.PositionMode || (exports.PositionMode = {}));
var PositionMode = exports.PositionMode;
(function (SpacingMode) {
    SpacingMode[SpacingMode["Length"] = 0] = "Length";
    SpacingMode[SpacingMode["Fixed"] = 1] = "Fixed";
    SpacingMode[SpacingMode["Percent"] = 2] = "Percent";
})(exports.SpacingMode || (exports.SpacingMode = {}));
var SpacingMode = exports.SpacingMode;
(function (RotateMode) {
    RotateMode[RotateMode["Tangent"] = 0] = "Tangent";
    RotateMode[RotateMode["Chain"] = 1] = "Chain";
    RotateMode[RotateMode["ChainScale"] = 2] = "ChainScale";
})(exports.RotateMode || (exports.RotateMode = {}));
var RotateMode = exports.RotateMode;
},{}],15:[function(require,module,exports){
"use strict";
var Slot_1 = require("./Slot");
var Bone_1 = require("./Bone");
var IkConstraint_1 = require("./IkConstraint");
var TransformConstraint_1 = require("./TransformConstraint");
var PathConstraint_1 = require("./PathConstraint");
var Utils_1 = require("./Utils");
var attachments_1 = require("./attachments");
var Skeleton = (function () {
    function Skeleton(data) {
        this._updateCache = new Array();
        this.updateCacheReset = new Array();
        this.time = 0;
        this.flipX = false;
        this.flipY = false;
        this.x = 0;
        this.y = 0;
        if (data == null)
            throw new Error("data cannot be null.");
        this.data = data;
        this.bones = new Array();
        for (var i = 0; i < data.bones.length; i++) {
            var boneData = data.bones[i];
            var bone = void 0;
            if (boneData.parent == null)
                bone = new Bone_1.Bone(boneData, this, null);
            else {
                var parent_1 = this.bones[boneData.parent.index];
                bone = new Bone_1.Bone(boneData, this, parent_1);
                parent_1.children.push(bone);
            }
            this.bones.push(bone);
        }
        this.slots = new Array();
        this.drawOrder = new Array();
        for (var i = 0; i < data.slots.length; i++) {
            var slotData = data.slots[i];
            var bone = this.bones[slotData.boneData.index];
            var slot = new Slot_1.Slot(slotData, bone);
            this.slots.push(slot);
            this.drawOrder.push(slot);
        }
        this.ikConstraints = new Array();
        for (var i = 0; i < data.ikConstraints.length; i++) {
            var ikConstraintData = data.ikConstraints[i];
            this.ikConstraints.push(new IkConstraint_1.IkConstraint(ikConstraintData, this));
        }
        this.transformConstraints = new Array();
        for (var i = 0; i < data.transformConstraints.length; i++) {
            var transformConstraintData = data.transformConstraints[i];
            this.transformConstraints.push(new TransformConstraint_1.TransformConstraint(transformConstraintData, this));
        }
        this.pathConstraints = new Array();
        for (var i = 0; i < data.pathConstraints.length; i++) {
            var pathConstraintData = data.pathConstraints[i];
            this.pathConstraints.push(new PathConstraint_1.PathConstraint(pathConstraintData, this));
        }
        this.color = new Utils_1.Color(1, 1, 1, 1);
        this.updateCache();
    }
    Skeleton.prototype.updateCache = function () {
        var updateCache = this._updateCache;
        updateCache.length = 0;
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].sorted = false;
        var ikConstraints = this.ikConstraints;
        var transformConstraints = this.transformConstraints;
        var pathConstraints = this.pathConstraints;
        var ikCount = ikConstraints.length, transformCount = transformConstraints.length, pathCount = pathConstraints.length;
        var constraintCount = ikCount + transformCount + pathCount;
        outer: for (var i = 0; i < constraintCount; i++) {
            for (var ii = 0; ii < ikCount; ii++) {
                var constraint = ikConstraints[ii];
                if (constraint.data.order == i) {
                    this.sortIkConstraint(constraint);
                    continue outer;
                }
            }
            for (var ii = 0; ii < transformCount; ii++) {
                var constraint = transformConstraints[ii];
                if (constraint.data.order == i) {
                    this.sortTransformConstraint(constraint);
                    continue outer;
                }
            }
            for (var ii = 0; ii < pathCount; ii++) {
                var constraint = pathConstraints[ii];
                if (constraint.data.order == i) {
                    this.sortPathConstraint(constraint);
                    continue outer;
                }
            }
        }
        for (var i = 0, n = bones.length; i < n; i++)
            this.sortBone(bones[i]);
    };
    Skeleton.prototype.sortIkConstraint = function (constraint) {
        var target = constraint.target;
        this.sortBone(target);
        var constrained = constraint.bones;
        var parent = constrained[0];
        this.sortBone(parent);
        if (constrained.length > 1) {
            var child = constrained[constrained.length - 1];
            if (!(this._updateCache.indexOf(child) > -1))
                this.updateCacheReset.push(child);
        }
        this._updateCache.push(constraint);
        this.sortReset(parent.children);
        constrained[constrained.length - 1].sorted = true;
    };
    Skeleton.prototype.sortPathConstraint = function (constraint) {
        var slot = constraint.target;
        var slotIndex = slot.data.index;
        var slotBone = slot.bone;
        if (this.skin != null)
            this.sortPathConstraintAttachment(this.skin, slotIndex, slotBone);
        if (this.data.defaultSkin != null && this.data.defaultSkin != this.skin)
            this.sortPathConstraintAttachment(this.data.defaultSkin, slotIndex, slotBone);
        for (var ii = 0, nn = this.data.skins.length; ii < nn; ii++)
            this.sortPathConstraintAttachment(this.data.skins[ii], slotIndex, slotBone);
        var attachment = slot.getAttachment();
        if (attachment instanceof attachments_1.PathAttachment)
            this.sortPathConstraintAttachmentWith(attachment, slotBone);
        var constrained = constraint.bones;
        var boneCount = constrained.length;
        for (var ii = 0; ii < boneCount; ii++)
            this.sortBone(constrained[ii]);
        this._updateCache.push(constraint);
        for (var ii = 0; ii < boneCount; ii++)
            this.sortReset(constrained[ii].children);
        for (var ii = 0; ii < boneCount; ii++)
            constrained[ii].sorted = true;
    };
    Skeleton.prototype.sortTransformConstraint = function (constraint) {
        this.sortBone(constraint.target);
        var constrained = constraint.bones;
        var boneCount = constrained.length;
        for (var ii = 0; ii < boneCount; ii++)
            this.sortBone(constrained[ii]);
        this._updateCache.push(constraint);
        for (var ii = 0; ii < boneCount; ii++)
            this.sortReset(constrained[ii].children);
        for (var ii = 0; ii < boneCount; ii++)
            constrained[ii].sorted = true;
    };
    Skeleton.prototype.sortPathConstraintAttachment = function (skin, slotIndex, slotBone) {
        var attachments = skin.attachments[slotIndex];
        if (!attachments)
            return;
        for (var key in attachments) {
            this.sortPathConstraintAttachmentWith(attachments[key], slotBone);
        }
    };
    Skeleton.prototype.sortPathConstraintAttachmentWith = function (attachment, slotBone) {
        if (!(attachment instanceof attachments_1.PathAttachment))
            return;
        var pathBones = attachment.bones;
        if (pathBones == null)
            this.sortBone(slotBone);
        else {
            var bones = this.bones;
            var i = 0;
            while (i < pathBones.length) {
                var boneCount = pathBones[i++];
                for (var n = i + boneCount; i < n; i++) {
                    var boneIndex = pathBones[i];
                    this.sortBone(bones[boneIndex]);
                }
            }
        }
    };
    Skeleton.prototype.sortBone = function (bone) {
        if (bone.sorted)
            return;
        var parent = bone.parent;
        if (parent != null)
            this.sortBone(parent);
        bone.sorted = true;
        this._updateCache.push(bone);
    };
    Skeleton.prototype.sortReset = function (bones) {
        for (var i = 0, n = bones.length; i < n; i++) {
            var bone = bones[i];
            if (bone.sorted)
                this.sortReset(bone.children);
            bone.sorted = false;
        }
    };
    Skeleton.prototype.updateWorldTransform = function () {
        var updateCacheReset = this.updateCacheReset;
        for (var i = 0, n = updateCacheReset.length; i < n; i++) {
            var bone = updateCacheReset[i];
            bone.ax = bone.x;
            bone.ay = bone.y;
            bone.arotation = bone.rotation;
            bone.ascaleX = bone.scaleX;
            bone.ascaleY = bone.scaleY;
            bone.ashearX = bone.shearX;
            bone.ashearY = bone.shearY;
            bone.appliedValid = true;
        }
        var updateCache = this._updateCache;
        for (var i = 0, n = updateCache.length; i < n; i++)
            updateCache[i].update();
    };
    Skeleton.prototype.setToSetupPose = function () {
        this.setBonesToSetupPose();
        this.setSlotsToSetupPose();
    };
    Skeleton.prototype.setBonesToSetupPose = function () {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].setToSetupPose();
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++) {
            var constraint = ikConstraints[i];
            constraint.bendDirection = constraint.data.bendDirection;
            constraint.mix = constraint.data.mix;
        }
        var transformConstraints = this.transformConstraints;
        for (var i = 0, n = transformConstraints.length; i < n; i++) {
            var constraint = transformConstraints[i];
            var data = constraint.data;
            constraint.rotateMix = data.rotateMix;
            constraint.translateMix = data.translateMix;
            constraint.scaleMix = data.scaleMix;
            constraint.shearMix = data.shearMix;
        }
        var pathConstraints = this.pathConstraints;
        for (var i = 0, n = pathConstraints.length; i < n; i++) {
            var constraint = pathConstraints[i];
            var data = constraint.data;
            constraint.position = data.position;
            constraint.spacing = data.spacing;
            constraint.rotateMix = data.rotateMix;
            constraint.translateMix = data.translateMix;
        }
    };
    Skeleton.prototype.setSlotsToSetupPose = function () {
        var slots = this.slots;
        Utils_1.Utils.arrayCopy(slots, 0, this.drawOrder, 0, slots.length);
        for (var i = 0, n = slots.length; i < n; i++)
            slots[i].setToSetupPose();
    };
    Skeleton.prototype.getRootBone = function () {
        if (this.bones.length == 0)
            return null;
        return this.bones[0];
    };
    Skeleton.prototype.findBone = function (boneName) {
        if (boneName == null)
            throw new Error("boneName cannot be null.");
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++) {
            var bone = bones[i];
            if (bone.data.name == boneName)
                return bone;
        }
        return null;
    };
    Skeleton.prototype.findBoneIndex = function (boneName) {
        if (boneName == null)
            throw new Error("boneName cannot be null.");
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName)
                return i;
        return -1;
    };
    Skeleton.prototype.findSlot = function (slotName) {
        if (slotName == null)
            throw new Error("slotName cannot be null.");
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++) {
            var slot = slots[i];
            if (slot.data.name == slotName)
                return slot;
        }
        return null;
    };
    Skeleton.prototype.findSlotIndex = function (slotName) {
        if (slotName == null)
            throw new Error("slotName cannot be null.");
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName)
                return i;
        return -1;
    };
    Skeleton.prototype.setSkinByName = function (skinName) {
        var skin = this.data.findSkin(skinName);
        if (skin == null)
            throw new Error("Skin not found: " + skinName);
        this.setSkin(skin);
    };
    Skeleton.prototype.setSkin = function (newSkin) {
        if (newSkin != null) {
            if (this.skin != null)
                newSkin.attachAll(this, this.skin);
            else {
                var slots = this.slots;
                for (var i = 0, n = slots.length; i < n; i++) {
                    var slot = slots[i];
                    var name_1 = slot.data.attachmentName;
                    if (name_1 != null) {
                        var attachment = newSkin.getAttachment(i, name_1);
                        if (attachment != null)
                            slot.setAttachment(attachment);
                    }
                }
            }
        }
        this.skin = newSkin;
    };
    Skeleton.prototype.getAttachmentByName = function (slotName, attachmentName) {
        return this.getAttachment(this.data.findSlotIndex(slotName), attachmentName);
    };
    Skeleton.prototype.getAttachment = function (slotIndex, attachmentName) {
        if (attachmentName == null)
            throw new Error("attachmentName cannot be null.");
        if (this.skin != null) {
            var attachment = this.skin.getAttachment(slotIndex, attachmentName);
            if (attachment != null)
                return attachment;
        }
        if (this.data.defaultSkin != null)
            return this.data.defaultSkin.getAttachment(slotIndex, attachmentName);
        return null;
    };
    Skeleton.prototype.setAttachment = function (slotName, attachmentName) {
        if (slotName == null)
            throw new Error("slotName cannot be null.");
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++) {
            var slot = slots[i];
            if (slot.data.name == slotName) {
                var attachment = null;
                if (attachmentName != null) {
                    attachment = this.getAttachment(i, attachmentName);
                    if (attachment == null)
                        throw new Error("Attachment not found: " + attachmentName + ", for slot: " + slotName);
                }
                slot.setAttachment(attachment);
                return;
            }
        }
        throw new Error("Slot not found: " + slotName);
    };
    Skeleton.prototype.findIkConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++) {
            var ikConstraint = ikConstraints[i];
            if (ikConstraint.data.name == constraintName)
                return ikConstraint;
        }
        return null;
    };
    Skeleton.prototype.findTransformConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var transformConstraints = this.transformConstraints;
        for (var i = 0, n = transformConstraints.length; i < n; i++) {
            var constraint = transformConstraints[i];
            if (constraint.data.name == constraintName)
                return constraint;
        }
        return null;
    };
    Skeleton.prototype.findPathConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var pathConstraints = this.pathConstraints;
        for (var i = 0, n = pathConstraints.length; i < n; i++) {
            var constraint = pathConstraints[i];
            if (constraint.data.name == constraintName)
                return constraint;
        }
        return null;
    };
    Skeleton.prototype.getBounds = function (offset, size) {
        if (offset == null)
            throw new Error("offset cannot be null.");
        if (size == null)
            throw new Error("size cannot be null.");
        var drawOrder = this.drawOrder;
        var minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
        for (var i = 0, n = drawOrder.length; i < n; i++) {
            var slot = drawOrder[i];
            var vertices = null;
            var attachment = slot.getAttachment();
            if (attachment instanceof attachments_1.RegionAttachment)
                vertices = attachment.updateWorldVertices(slot, false);
            else if (attachment instanceof attachments_1.MeshAttachment)
                vertices = attachment.updateWorldVertices(slot, true);
            if (vertices != null) {
                for (var ii = 0, nn = vertices.length; ii < nn; ii += 8) {
                    var x = vertices[ii], y = vertices[ii + 1];
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        offset.set(minX, minY);
        size.set(maxX - minX, maxY - minY);
    };
    Skeleton.prototype.update = function (delta) {
        this.time += delta;
    };
    return Skeleton;
}());
exports.Skeleton = Skeleton;
},{"./Bone":7,"./IkConstraint":11,"./PathConstraint":13,"./Slot":20,"./TransformConstraint":24,"./Utils":26,"./attachments":33}],16:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var attachments_1 = require("./attachments");
var SkeletonBounds = (function () {
    function SkeletonBounds() {
        this.minX = 0;
        this.minY = 0;
        this.maxX = 0;
        this.maxY = 0;
        this.boundingBoxes = new Array();
        this.polygons = new Array();
        this.polygonPool = new Utils_1.Pool(function () {
            return Utils_1.Utils.newFloatArray(16);
        });
    }
    SkeletonBounds.prototype.update = function (skeleton, updateAabb) {
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        var boundingBoxes = this.boundingBoxes;
        var polygons = this.polygons;
        var polygonPool = this.polygonPool;
        var slots = skeleton.slots;
        var slotCount = slots.length;
        boundingBoxes.length = 0;
        polygonPool.freeAll(polygons);
        polygons.length = 0;
        for (var i = 0; i < slotCount; i++) {
            var slot = slots[i];
            var attachment = slot.getAttachment();
            if (attachment instanceof attachments_1.BoundingBoxAttachment) {
                var boundingBox = attachment;
                boundingBoxes.push(boundingBox);
                var polygon = polygonPool.obtain();
                if (polygon.length != boundingBox.worldVerticesLength) {
                    polygon = Utils_1.Utils.newFloatArray(boundingBox.worldVerticesLength);
                }
                polygons.push(polygon);
                boundingBox.computeWorldVertices(slot, polygon);
            }
        }
        if (updateAabb)
            this.aabbCompute();
    };
    SkeletonBounds.prototype.aabbCompute = function () {
        var minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++) {
            var polygon = polygons[i];
            var vertices = polygon;
            for (var ii = 0, nn = polygon.length; ii < nn; ii += 2) {
                var x = vertices[ii];
                var y = vertices[ii + 1];
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    };
    SkeletonBounds.prototype.aabbContainsPoint = function (x, y) {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    };
    SkeletonBounds.prototype.aabbIntersectsSegment = function (x1, y1, x2, y2) {
        var minX = this.minX;
        var minY = this.minY;
        var maxX = this.maxX;
        var maxY = this.maxY;
        if ((x1 <= minX && x2 <= minX) || (y1 <= minY && y2 <= minY) || (x1 >= maxX && x2 >= maxX) || (y1 >= maxY && y2 >= maxY))
            return false;
        var m = (y2 - y1) / (x2 - x1);
        var y = m * (minX - x1) + y1;
        if (y > minY && y < maxY)
            return true;
        y = m * (maxX - x1) + y1;
        if (y > minY && y < maxY)
            return true;
        var x = (minY - y1) / m + x1;
        if (x > minX && x < maxX)
            return true;
        x = (maxY - y1) / m + x1;
        if (x > minX && x < maxX)
            return true;
        return false;
    };
    SkeletonBounds.prototype.aabbIntersectsSkeleton = function (bounds) {
        return this.minX < bounds.maxX && this.maxX > bounds.minX && this.minY < bounds.maxY && this.maxY > bounds.minY;
    };
    SkeletonBounds.prototype.containsPoint = function (x, y) {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (this.containsPointPolygon(polygons[i], x, y))
                return this.boundingBoxes[i];
        return null;
    };
    SkeletonBounds.prototype.containsPointPolygon = function (polygon, x, y) {
        var vertices = polygon;
        var nn = polygon.length;
        var prevIndex = nn - 2;
        var inside = false;
        for (var ii = 0; ii < nn; ii += 2) {
            var vertexY = vertices[ii + 1];
            var prevY = vertices[prevIndex + 1];
            if ((vertexY < y && prevY >= y) || (prevY < y && vertexY >= y)) {
                var vertexX = vertices[ii];
                if (vertexX + (y - vertexY) / (prevY - vertexY) * (vertices[prevIndex] - vertexX) < x)
                    inside = !inside;
            }
            prevIndex = ii;
        }
        return inside;
    };
    SkeletonBounds.prototype.intersectsSegment = function (x1, y1, x2, y2) {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (this.intersectsSegmentPolygon(polygons[i], x1, y1, x2, y2))
                return this.boundingBoxes[i];
        return null;
    };
    SkeletonBounds.prototype.intersectsSegmentPolygon = function (polygon, x1, y1, x2, y2) {
        var vertices = polygon;
        var nn = polygon.length;
        var width12 = x1 - x2, height12 = y1 - y2;
        var det1 = x1 * y2 - y1 * x2;
        var x3 = vertices[nn - 2], y3 = vertices[nn - 1];
        for (var ii = 0; ii < nn; ii += 2) {
            var x4 = vertices[ii], y4 = vertices[ii + 1];
            var det2 = x3 * y4 - y3 * x4;
            var width34 = x3 - x4, height34 = y3 - y4;
            var det3 = width12 * height34 - height12 * width34;
            var x = (det1 * width34 - width12 * det2) / det3;
            if (((x >= x3 && x <= x4) || (x >= x4 && x <= x3)) && ((x >= x1 && x <= x2) || (x >= x2 && x <= x1))) {
                var y = (det1 * height34 - height12 * det2) / det3;
                if (((y >= y3 && y <= y4) || (y >= y4 && y <= y3)) && ((y >= y1 && y <= y2) || (y >= y2 && y <= y1)))
                    return true;
            }
            x3 = x4;
            y3 = y4;
        }
        return false;
    };
    SkeletonBounds.prototype.getPolygon = function (boundingBox) {
        if (boundingBox == null)
            throw new Error("boundingBox cannot be null.");
        var index = this.boundingBoxes.indexOf(boundingBox);
        return index == -1 ? null : this.polygons[index];
    };
    SkeletonBounds.prototype.getWidth = function () {
        return this.maxX - this.minX;
    };
    SkeletonBounds.prototype.getHeight = function () {
        return this.maxY - this.minY;
    };
    return SkeletonBounds;
}());
exports.SkeletonBounds = SkeletonBounds;
},{"./Utils":26,"./attachments":33}],17:[function(require,module,exports){
"use strict";
var SkeletonData = (function () {
    function SkeletonData() {
        this.bones = new Array();
        this.slots = new Array();
        this.skins = new Array();
        this.events = new Array();
        this.animations = new Array();
        this.ikConstraints = new Array();
        this.transformConstraints = new Array();
        this.pathConstraints = new Array();
        this.fps = 0;
    }
    SkeletonData.prototype.findBone = function (boneName) {
        if (boneName == null)
            throw new Error("boneName cannot be null.");
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++) {
            var bone = bones[i];
            if (bone.name == boneName)
                return bone;
        }
        return null;
    };
    SkeletonData.prototype.findBoneIndex = function (boneName) {
        if (boneName == null)
            throw new Error("boneName cannot be null.");
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName)
                return i;
        return -1;
    };
    SkeletonData.prototype.findSlot = function (slotName) {
        if (slotName == null)
            throw new Error("slotName cannot be null.");
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++) {
            var slot = slots[i];
            if (slot.name == slotName)
                return slot;
        }
        return null;
    };
    SkeletonData.prototype.findSlotIndex = function (slotName) {
        if (slotName == null)
            throw new Error("slotName cannot be null.");
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].name == slotName)
                return i;
        return -1;
    };
    SkeletonData.prototype.findSkin = function (skinName) {
        if (skinName == null)
            throw new Error("skinName cannot be null.");
        var skins = this.skins;
        for (var i = 0, n = skins.length; i < n; i++) {
            var skin = skins[i];
            if (skin.name == skinName)
                return skin;
        }
        return null;
    };
    SkeletonData.prototype.findEvent = function (eventDataName) {
        if (eventDataName == null)
            throw new Error("eventDataName cannot be null.");
        var events = this.events;
        for (var i = 0, n = events.length; i < n; i++) {
            var event_1 = events[i];
            if (event_1.name == eventDataName)
                return event_1;
        }
        return null;
    };
    SkeletonData.prototype.findAnimation = function (animationName) {
        if (animationName == null)
            throw new Error("animationName cannot be null.");
        var animations = this.animations;
        for (var i = 0, n = animations.length; i < n; i++) {
            var animation = animations[i];
            if (animation.name == animationName)
                return animation;
        }
        return null;
    };
    SkeletonData.prototype.findIkConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++) {
            var constraint = ikConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    };
    SkeletonData.prototype.findTransformConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var transformConstraints = this.transformConstraints;
        for (var i = 0, n = transformConstraints.length; i < n; i++) {
            var constraint = transformConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    };
    SkeletonData.prototype.findPathConstraint = function (constraintName) {
        if (constraintName == null)
            throw new Error("constraintName cannot be null.");
        var pathConstraints = this.pathConstraints;
        for (var i = 0, n = pathConstraints.length; i < n; i++) {
            var constraint = pathConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    };
    SkeletonData.prototype.findPathConstraintIndex = function (pathConstraintName) {
        if (pathConstraintName == null)
            throw new Error("pathConstraintName cannot be null.");
        var pathConstraints = this.pathConstraints;
        for (var i = 0, n = pathConstraints.length; i < n; i++)
            if (pathConstraints[i].name == pathConstraintName)
                return i;
        return -1;
    };
    return SkeletonData;
}());
exports.SkeletonData = SkeletonData;
},{}],18:[function(require,module,exports){
"use strict";
var SkeletonData_1 = require("./SkeletonData");
var BoneData_1 = require("./BoneData");
var SlotData_1 = require("./SlotData");
var Event_1 = require("./Event");
var IkConstraintData_1 = require("./IkConstraintData");
var TransformConstraintData_1 = require("./TransformConstraintData");
var PathConstraintData_1 = require("./PathConstraintData");
var Skin_1 = require("./Skin");
var EventData_1 = require("./EventData");
var Utils_1 = require("./Utils");
var Animation_1 = require("./Animation");
var SkeletonJson = (function () {
    function SkeletonJson(attachmentLoader) {
        this.scale = 1;
        this.linkedMeshes = new Array();
        this.attachmentLoader = attachmentLoader;
    }
    SkeletonJson.prototype.readSkeletonData = function (json) {
        var scale = this.scale;
        var skeletonData = new SkeletonData_1.SkeletonData();
        var root = typeof (json) === "string" ? JSON.parse(json) : json;
        var skeletonMap = root.skeleton;
        if (skeletonMap != null) {
            skeletonData.hash = skeletonMap.hash;
            skeletonData.version = skeletonMap.spine;
            skeletonData.width = skeletonMap.width;
            skeletonData.height = skeletonMap.height;
            skeletonData.fps = skeletonMap.fps;
            skeletonData.imagesPath = skeletonMap.images;
        }
        if (root.bones) {
            for (var i = 0; i < root.bones.length; i++) {
                var boneMap = root.bones[i];
                var parent_1 = null;
                var parentName = this.getValue(boneMap, "parent", null);
                if (parentName != null) {
                    parent_1 = skeletonData.findBone(parentName);
                    if (parent_1 == null)
                        throw new Error("Parent bone not found: " + parentName);
                }
                var data = new BoneData_1.BoneData(skeletonData.bones.length, boneMap.name, parent_1);
                data.length = this.getValue(boneMap, "length", 0) * scale;
                data.x = this.getValue(boneMap, "x", 0) * scale;
                data.y = this.getValue(boneMap, "y", 0) * scale;
                data.rotation = this.getValue(boneMap, "rotation", 0);
                data.scaleX = this.getValue(boneMap, "scaleX", 1);
                data.scaleY = this.getValue(boneMap, "scaleY", 1);
                data.shearX = this.getValue(boneMap, "shearX", 0);
                data.shearY = this.getValue(boneMap, "shearY", 0);
                if (boneMap.hasOwnProperty("inheritScale") || boneMap.hasOwnProperty("inheritRotation")) {
                    data.transformMode = SkeletonJson.transformModeLegacy(this.getValue(boneMap, "inheritRotation", true), this.getValue(boneMap, "inheritScale", true));
                }
                else {
                    data.transformMode = SkeletonJson.transformModeFromString(this.getValue(boneMap, "transform", "normal"));
                }
                skeletonData.bones.push(data);
            }
        }
        if (root.slots) {
            for (var i = 0; i < root.slots.length; i++) {
                var slotMap = root.slots[i];
                var slotName = slotMap.name;
                var boneName = slotMap.bone;
                var boneData = skeletonData.findBone(boneName);
                if (boneData == null)
                    throw new Error("Slot bone not found: " + boneName);
                var data = new SlotData_1.SlotData(skeletonData.slots.length, slotName, boneData);
                var color = this.getValue(slotMap, "color", null);
                if (color != null)
                    data.color.setFromString(color);
                data.attachmentName = this.getValue(slotMap, "attachment", null);
                data.blendMode = SkeletonJson.blendModeFromString(this.getValue(slotMap, "blend", "normal"));
                skeletonData.slots.push(data);
            }
        }
        if (root.ik) {
            for (var i = 0; i < root.ik.length; i++) {
                var constraintMap = root.ik[i];
                var data = new IkConstraintData_1.IkConstraintData(constraintMap.name);
                data.order = this.getValue(constraintMap, "order", 0);
                for (var j = 0; j < constraintMap.bones.length; j++) {
                    var boneName = constraintMap.bones[j];
                    var bone = skeletonData.findBone(boneName);
                    if (bone == null)
                        throw new Error("IK bone not found: " + boneName);
                    data.bones.push(bone);
                }
                var targetName = constraintMap.target;
                data.target = skeletonData.findBone(targetName);
                if (data.target == null)
                    throw new Error("IK target bone not found: " + targetName);
                data.bendDirection = this.getValue(constraintMap, "bendPositive", true) ? 1 : -1;
                data.mix = this.getValue(constraintMap, "mix", 1);
                skeletonData.ikConstraints.push(data);
            }
        }
        if (root.transform) {
            for (var i = 0; i < root.transform.length; i++) {
                var constraintMap = root.transform[i];
                var data = new TransformConstraintData_1.TransformConstraintData(constraintMap.name);
                data.order = this.getValue(constraintMap, "order", 0);
                for (var j = 0; j < constraintMap.bones.length; j++) {
                    var boneName = constraintMap.bones[j];
                    var bone = skeletonData.findBone(boneName);
                    if (bone == null)
                        throw new Error("Transform constraint bone not found: " + boneName);
                    data.bones.push(bone);
                }
                var targetName = constraintMap.target;
                data.target = skeletonData.findBone(targetName);
                if (data.target == null)
                    throw new Error("Transform constraint target bone not found: " + targetName);
                data.offsetRotation = this.getValue(constraintMap, "rotation", 0);
                data.offsetX = this.getValue(constraintMap, "x", 0) * scale;
                data.offsetY = this.getValue(constraintMap, "y", 0) * scale;
                data.offsetScaleX = this.getValue(constraintMap, "scaleX", 0);
                data.offsetScaleY = this.getValue(constraintMap, "scaleY", 0);
                data.offsetShearY = this.getValue(constraintMap, "shearY", 0);
                data.rotateMix = this.getValue(constraintMap, "rotateMix", 1);
                data.translateMix = this.getValue(constraintMap, "translateMix", 1);
                data.scaleMix = this.getValue(constraintMap, "scaleMix", 1);
                data.shearMix = this.getValue(constraintMap, "shearMix", 1);
                skeletonData.transformConstraints.push(data);
            }
        }
        if (root.path) {
            for (var i = 0; i < root.path.length; i++) {
                var constraintMap = root.path[i];
                var data = new PathConstraintData_1.PathConstraintData(constraintMap.name);
                data.order = this.getValue(constraintMap, "order", 0);
                for (var j = 0; j < constraintMap.bones.length; j++) {
                    var boneName = constraintMap.bones[j];
                    var bone = skeletonData.findBone(boneName);
                    if (bone == null)
                        throw new Error("Transform constraint bone not found: " + boneName);
                    data.bones.push(bone);
                }
                var targetName = constraintMap.target;
                data.target = skeletonData.findSlot(targetName);
                if (data.target == null)
                    throw new Error("Path target slot not found: " + targetName);
                data.positionMode = SkeletonJson.positionModeFromString(this.getValue(constraintMap, "positionMode", "percent"));
                data.spacingMode = SkeletonJson.spacingModeFromString(this.getValue(constraintMap, "spacingMode", "length"));
                data.rotateMode = SkeletonJson.rotateModeFromString(this.getValue(constraintMap, "rotateMode", "tangent"));
                data.offsetRotation = this.getValue(constraintMap, "rotation", 0);
                data.position = this.getValue(constraintMap, "position", 0);
                if (data.positionMode == PathConstraintData_1.PositionMode.Fixed)
                    data.position *= scale;
                data.spacing = this.getValue(constraintMap, "spacing", 0);
                if (data.spacingMode == PathConstraintData_1.SpacingMode.Length || data.spacingMode == PathConstraintData_1.SpacingMode.Fixed)
                    data.spacing *= scale;
                data.rotateMix = this.getValue(constraintMap, "rotateMix", 1);
                data.translateMix = this.getValue(constraintMap, "translateMix", 1);
                skeletonData.pathConstraints.push(data);
            }
        }
        if (root.skins) {
            for (var skinName in root.skins) {
                var skinMap = root.skins[skinName];
                var skin = new Skin_1.Skin(skinName);
                for (var slotName in skinMap) {
                    var slotIndex = skeletonData.findSlotIndex(slotName);
                    if (slotIndex == -1)
                        throw new Error("Slot not found: " + slotName);
                    var slotMap = skinMap[slotName];
                    for (var entryName in slotMap) {
                        var attachment = this.readAttachment(slotMap[entryName], skin, slotIndex, entryName);
                        if (attachment != null)
                            skin.addAttachment(slotIndex, entryName, attachment);
                    }
                }
                skeletonData.skins.push(skin);
                if (skin.name == "default")
                    skeletonData.defaultSkin = skin;
            }
        }
        for (var i = 0, n = this.linkedMeshes.length; i < n; i++) {
            var linkedMesh = this.linkedMeshes[i];
            var skin = linkedMesh.skin == null ? skeletonData.defaultSkin : skeletonData.findSkin(linkedMesh.skin);
            if (skin == null)
                throw new Error("Skin not found: " + linkedMesh.skin);
            var parent_2 = skin.getAttachment(linkedMesh.slotIndex, linkedMesh.parent);
            if (parent_2 == null)
                throw new Error("Parent mesh not found: " + linkedMesh.parent);
            linkedMesh.mesh.setParentMesh(parent_2);
        }
        this.linkedMeshes.length = 0;
        if (root.events) {
            for (var eventName in root.events) {
                var eventMap = root.events[eventName];
                var data = new EventData_1.EventData(eventName);
                data.intValue = this.getValue(eventMap, "int", 0);
                data.floatValue = this.getValue(eventMap, "float", 0);
                data.stringValue = this.getValue(eventMap, "string", null);
                skeletonData.events.push(data);
            }
        }
        if (root.animations) {
            for (var animationName in root.animations) {
                var animationMap = root.animations[animationName];
                this.readAnimation(animationMap, animationName, skeletonData);
            }
        }
        return skeletonData;
    };
    SkeletonJson.prototype.readAttachment = function (map, skin, slotIndex, name) {
        var scale = this.scale;
        name = this.getValue(map, "name", name);
        var type = this.getValue(map, "type", "region");
        switch (type) {
            case "region": {
                var path = this.getValue(map, "path", name);
                var region = this.attachmentLoader.newRegionAttachment(skin, name, path);
                if (region == null)
                    return null;
                region.path = path;
                region.x = this.getValue(map, "x", 0) * scale;
                region.y = this.getValue(map, "y", 0) * scale;
                region.scaleX = this.getValue(map, "scaleX", 1);
                region.scaleY = this.getValue(map, "scaleY", 1);
                region.rotation = this.getValue(map, "rotation", 0);
                region.width = map.width * scale;
                region.height = map.height * scale;
                var color = this.getValue(map, "color", null);
                if (color != null)
                    region.color.setFromString(color);
                return region;
            }
            case "boundingbox": {
                var box = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
                if (box == null)
                    return null;
                this.readVertices(map, box, map.vertexCount << 1);
                var color = this.getValue(map, "color", null);
                if (color != null)
                    box.color.setFromString(color);
                return box;
            }
            case "weightedmesh":
            case "skinnedmesh":
            case "mesh":
            case "linkedmesh": {
                var path = this.getValue(map, "path", name);
                var mesh = this.attachmentLoader.newMeshAttachment(skin, name, path);
                if (mesh == null)
                    return null;
                mesh.path = path;
                var color = this.getValue(map, "color", null);
                if (color != null)
                    mesh.color.setFromString(color);
                var parent_3 = this.getValue(map, "parent", null);
                if (parent_3 != null) {
                    mesh.inheritDeform = this.getValue(map, "deform", true);
                    this.linkedMeshes.push(new LinkedMesh(mesh, this.getValue(map, "skin", null), slotIndex, parent_3));
                    return mesh;
                }
                var uvs = map.uvs;
                this.readVertices(map, mesh, uvs.length);
                mesh.triangles = map.triangles;
                mesh.regionUVs = uvs;
                mesh.hullLength = this.getValue(map, "hull", 0) * 2;
                return mesh;
            }
            case "path": {
                var path = this.attachmentLoader.newPathAttachment(skin, name);
                if (path == null)
                    return null;
                path.closed = this.getValue(map, "closed", false);
                path.constantSpeed = this.getValue(map, "constantSpeed", true);
                var vertexCount = map.vertexCount;
                this.readVertices(map, path, vertexCount << 1);
                var lengths = Utils_1.Utils.newArray(vertexCount / 3, 0);
                for (var i = 0; i < map.lengths.length; i++)
                    lengths[i++] = map.lengths[i] * scale;
                path.lengths = lengths;
                var color = this.getValue(map, "color", null);
                if (color != null)
                    path.color.setFromString(color);
                return path;
            }
        }
        return null;
    };
    SkeletonJson.prototype.readVertices = function (map, attachment, verticesLength) {
        var scale = this.scale;
        attachment.worldVerticesLength = verticesLength;
        var vertices = map.vertices;
        if (verticesLength == vertices.length) {
            if (scale != 1) {
                for (var i = 0, n = vertices.length; i < n; i++)
                    vertices[i] *= scale;
            }
            attachment.vertices = Utils_1.Utils.toFloatArray(vertices);
            return;
        }
        var weights = new Array();
        var bones = new Array();
        for (var i = 0, n = vertices.length; i < n;) {
            var boneCount = vertices[i++];
            bones.push(boneCount);
            for (var nn = i + boneCount * 4; i < nn; i += 4) {
                bones.push(vertices[i]);
                weights.push(vertices[i + 1] * scale);
                weights.push(vertices[i + 2] * scale);
                weights.push(vertices[i + 3]);
            }
        }
        attachment.bones = bones;
        attachment.vertices = Utils_1.Utils.toFloatArray(weights);
    };
    SkeletonJson.prototype.readAnimation = function (map, name, skeletonData) {
        var scale = this.scale;
        var timelines = new Array();
        var duration = 0;
        if (map.slots) {
            for (var slotName in map.slots) {
                var slotMap = map.slots[slotName];
                var slotIndex = skeletonData.findSlotIndex(slotName);
                if (slotIndex == -1)
                    throw new Error("Slot not found: " + slotName);
                for (var timelineName in slotMap) {
                    var timelineMap = slotMap[timelineName];
                    if (timelineName == "color") {
                        var timeline = new Animation_1.ColorTimeline(timelineMap.length);
                        timeline.slotIndex = slotIndex;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            var color = new Utils_1.Color();
                            color.setFromString(valueMap.color);
                            timeline.setFrame(frameIndex, valueMap.time, color.r, color.g, color.b, color.a);
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.ColorTimeline.ENTRIES]);
                    }
                    else if (timelineName = "attachment") {
                        var timeline = new Animation_1.AttachmentTimeline(timelineMap.length);
                        timeline.slotIndex = slotIndex;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            timeline.setFrame(frameIndex++, valueMap.time, valueMap.name);
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
                    }
                    else
                        throw new Error("Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")");
                }
            }
        }
        if (map.bones) {
            for (var boneName in map.bones) {
                var boneMap = map.bones[boneName];
                var boneIndex = skeletonData.findBoneIndex(boneName);
                if (boneIndex == -1)
                    throw new Error("Bone not found: " + boneName);
                for (var timelineName in boneMap) {
                    var timelineMap = boneMap[timelineName];
                    if (timelineName === "rotate") {
                        var timeline = new Animation_1.RotateTimeline(timelineMap.length);
                        timeline.boneIndex = boneIndex;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            timeline.setFrame(frameIndex, valueMap.time, valueMap.angle);
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.RotateTimeline.ENTRIES]);
                    }
                    else if (timelineName === "translate" || timelineName === "scale" || timelineName === "shear") {
                        var timeline = null;
                        var timelineScale = 1;
                        if (timelineName === "scale")
                            timeline = new Animation_1.ScaleTimeline(timelineMap.length);
                        else if (timelineName === "shear")
                            timeline = new Animation_1.ShearTimeline(timelineMap.length);
                        else {
                            timeline = new Animation_1.TranslateTimeline(timelineMap.length);
                            timelineScale = scale;
                        }
                        timeline.boneIndex = boneIndex;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            var x = this.getValue(valueMap, "x", 0), y = this.getValue(valueMap, "y", 0);
                            timeline.setFrame(frameIndex, valueMap.time, x * timelineScale, y * timelineScale);
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.TranslateTimeline.ENTRIES]);
                    }
                    else
                        throw new Error("Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")");
                }
            }
        }
        if (map.ik) {
            for (var constraintName in map.ik) {
                var constraintMap = map.ik[constraintName];
                var constraint = skeletonData.findIkConstraint(constraintName);
                var timeline = new Animation_1.IkConstraintTimeline(constraintMap.length);
                timeline.ikConstraintIndex = skeletonData.ikConstraints.indexOf(constraint);
                var frameIndex = 0;
                for (var i = 0; i < constraintMap.length; i++) {
                    var valueMap = constraintMap[i];
                    timeline.setFrame(frameIndex, valueMap.time, this.getValue(valueMap, "mix", 1), this.getValue(valueMap, "bendPositive", true) ? 1 : -1);
                    this.readCurve(valueMap, timeline, frameIndex);
                    frameIndex++;
                }
                timelines.push(timeline);
                duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.IkConstraintTimeline.ENTRIES]);
            }
        }
        if (map.transform) {
            for (var constraintName in map.transform) {
                var constraintMap = map.transform[constraintName];
                var constraint = skeletonData.findTransformConstraint(constraintName);
                var timeline = new Animation_1.TransformConstraintTimeline(constraintMap.length);
                timeline.transformConstraintIndex = skeletonData.transformConstraints.indexOf(constraint);
                var frameIndex = 0;
                for (var i = 0; i < constraintMap.length; i++) {
                    var valueMap = constraintMap[i];
                    timeline.setFrame(frameIndex, valueMap.time, this.getValue(valueMap, "rotateMix", 1), this.getValue(valueMap, "translateMix", 1), this.getValue(valueMap, "scaleMix", 1), this.getValue(valueMap, "shearMix", 1));
                    this.readCurve(valueMap, timeline, frameIndex);
                    frameIndex++;
                }
                timelines.push(timeline);
                duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.TransformConstraintTimeline.ENTRIES]);
            }
        }
        if (map.paths) {
            for (var constraintName in map.paths) {
                var constraintMap = map.paths[constraintName];
                var index = skeletonData.findPathConstraintIndex(constraintName);
                if (index == -1)
                    throw new Error("Path constraint not found: " + constraintName);
                var data = skeletonData.pathConstraints[index];
                for (var timelineName in constraintMap) {
                    var timelineMap = constraintMap[timelineName];
                    if (timelineName === "position" || timelineName === "spacing") {
                        var timeline = null;
                        var timelineScale = 1;
                        if (timelineName === "spacing") {
                            timeline = new Animation_1.PathConstraintSpacingTimeline(timelineMap.length);
                            if (data.spacingMode == PathConstraintData_1.SpacingMode.Length || data.spacingMode == PathConstraintData_1.SpacingMode.Fixed)
                                timelineScale = scale;
                        }
                        else {
                            timeline = new Animation_1.PathConstraintPositionTimeline(timelineMap.length);
                            if (data.positionMode == PathConstraintData_1.PositionMode.Fixed)
                                timelineScale = scale;
                        }
                        timeline.pathConstraintIndex = index;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            timeline.setFrame(frameIndex, valueMap.time, this.getValue(valueMap, timelineName, 0) * timelineScale);
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.PathConstraintPositionTimeline.ENTRIES]);
                    }
                    else if (timelineName === "mix") {
                        var timeline = new Animation_1.PathConstraintMixTimeline(timelineMap.length);
                        timeline.pathConstraintIndex = index;
                        var frameIndex = 0;
                        for (var i = 0; i < timelineMap.length; i++) {
                            var valueMap = timelineMap[i];
                            timeline.setFrame(frameIndex, valueMap.time, this.getValue(valueMap, "rotateMix", 1), this.getValue(valueMap, "translateMix", 1));
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[(timeline.getFrameCount() - 1) * Animation_1.PathConstraintMixTimeline.ENTRIES]);
                    }
                }
            }
        }
        if (map.deform) {
            for (var deformName in map.deform) {
                var deformMap = map.deform[deformName];
                var skin = skeletonData.findSkin(deformName);
                if (skin == null)
                    throw new Error("Skin not found: " + deformName);
                for (var slotName in deformMap) {
                    var slotMap = deformMap[slotName];
                    var slotIndex = skeletonData.findSlotIndex(slotName);
                    if (slotIndex == -1)
                        throw new Error("Slot not found: " + slotMap.name);
                    for (var timelineName in slotMap) {
                        var timelineMap = slotMap[timelineName];
                        var attachment = skin.getAttachment(slotIndex, timelineName);
                        if (attachment == null)
                            throw new Error("Deform attachment not found: " + timelineMap.name);
                        var weighted = attachment.bones != null;
                        var vertices = attachment.vertices;
                        var deformLength = weighted ? vertices.length / 3 * 2 : vertices.length;
                        var timeline = new Animation_1.DeformTimeline(timelineMap.length);
                        timeline.slotIndex = slotIndex;
                        timeline.attachment = attachment;
                        var frameIndex = 0;
                        for (var j = 0; j < timelineMap.length; j++) {
                            var valueMap = timelineMap[j];
                            var deform = void 0;
                            var verticesValue = this.getValue(valueMap, "vertices", null);
                            if (verticesValue == null)
                                deform = weighted ? Utils_1.Utils.newFloatArray(deformLength) : vertices;
                            else {
                                deform = Utils_1.Utils.newFloatArray(deformLength);
                                var start = this.getValue(valueMap, "offset", 0);
                                Utils_1.Utils.arrayCopy(verticesValue, 0, deform, start, verticesValue.length);
                                if (scale != 1) {
                                    for (var i = start, n = i + verticesValue.length; i < n; i++)
                                        deform[i] *= scale;
                                }
                                if (!weighted) {
                                    for (var i = 0; i < deformLength; i++)
                                        deform[i] += vertices[i];
                                }
                            }
                            timeline.setFrame(frameIndex, valueMap.time, deform);
                            this.readCurve(valueMap, timeline, frameIndex);
                            frameIndex++;
                        }
                        timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
                    }
                }
            }
        }
        var drawOrderNode = map.drawOrder;
        if (drawOrderNode == null)
            drawOrderNode = map.draworder;
        if (drawOrderNode != null) {
            var timeline = new Animation_1.DrawOrderTimeline(drawOrderNode.length);
            var slotCount = skeletonData.slots.length;
            var frameIndex = 0;
            for (var j = 0; j < drawOrderNode.length; j++) {
                var drawOrderMap = drawOrderNode[j];
                var drawOrder = null;
                var offsets = this.getValue(drawOrderMap, "offsets", null);
                if (offsets != null) {
                    drawOrder = Utils_1.Utils.newArray(slotCount, -1);
                    var unchanged = Utils_1.Utils.newArray(slotCount - offsets.length, 0);
                    var originalIndex = 0, unchangedIndex = 0;
                    for (var i = 0; i < offsets.length; i++) {
                        var offsetMap = offsets[i];
                        var slotIndex = skeletonData.findSlotIndex(offsetMap.slot);
                        if (slotIndex == -1)
                            throw new Error("Slot not found: " + offsetMap.slot);
                        while (originalIndex != slotIndex)
                            unchanged[unchangedIndex++] = originalIndex++;
                        drawOrder[originalIndex + offsetMap.offset] = originalIndex++;
                    }
                    while (originalIndex < slotCount)
                        unchanged[unchangedIndex++] = originalIndex++;
                    for (var i = slotCount - 1; i >= 0; i--)
                        if (drawOrder[i] == -1)
                            drawOrder[i] = unchanged[--unchangedIndex];
                }
                timeline.setFrame(frameIndex++, drawOrderMap.time, drawOrder);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }
        if (map.events) {
            var timeline = new Animation_1.EventTimeline(map.events.length);
            var frameIndex = 0;
            for (var i = 0; i < map.events.length; i++) {
                var eventMap = map.events[i];
                var eventData = skeletonData.findEvent(eventMap.name);
                if (eventData == null)
                    throw new Error("Event not found: " + eventMap.name);
                var event_1 = new Event_1.Event(eventMap.time, eventData);
                event_1.intValue = this.getValue(eventMap, "int", eventData.intValue);
                event_1.floatValue = this.getValue(eventMap, "float", eventData.floatValue);
                event_1.stringValue = this.getValue(eventMap, "string", eventData.stringValue);
                timeline.setFrame(frameIndex++, event_1);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }
        if (isNaN(duration)) {
            throw new Error("Error while parsing animation, duration is NaN");
        }
        skeletonData.animations.push(new Animation_1.Animation(name, timelines, duration));
    };
    SkeletonJson.prototype.readCurve = function (map, timeline, frameIndex) {
        if (!map.curve)
            return;
        if (map.curve === "stepped")
            timeline.setStepped(frameIndex);
        else if (Object.prototype.toString.call(map.curve) === '[object Array]') {
            var curve = map.curve;
            timeline.setCurve(frameIndex, curve[0], curve[1], curve[2], curve[3]);
        }
    };
    SkeletonJson.prototype.getValue = function (map, prop, defaultValue) {
        return map[prop] !== undefined ? map[prop] : defaultValue;
    };
    SkeletonJson.blendModeFromString = function (str) {
        if (str === 'multiply')
            return PIXI.BLEND_MODES.MULTIPLY;
        if (str === 'additive')
            return PIXI.BLEND_MODES.ADD;
        if (str === 'screen')
            return PIXI.BLEND_MODES.SCREEN;
        if (str === 'normal')
            return PIXI.BLEND_MODES.NORMAL;
        throw new Error("Unknown blend mode: " + str);
    };
    SkeletonJson.positionModeFromString = function (str) {
        str = str.toLowerCase();
        if (str == "fixed")
            return PathConstraintData_1.PositionMode.Fixed;
        if (str == "percent")
            return PathConstraintData_1.PositionMode.Percent;
        throw new Error("Unknown position mode: " + str);
    };
    SkeletonJson.spacingModeFromString = function (str) {
        str = str.toLowerCase();
        if (str == "length")
            return PathConstraintData_1.SpacingMode.Length;
        if (str == "fixed")
            return PathConstraintData_1.SpacingMode.Fixed;
        if (str == "percent")
            return PathConstraintData_1.SpacingMode.Percent;
        throw new Error("Unknown position mode: " + str);
    };
    SkeletonJson.rotateModeFromString = function (str) {
        str = str.toLowerCase();
        if (str == "tangent")
            return PathConstraintData_1.RotateMode.Tangent;
        if (str == "chain")
            return PathConstraintData_1.RotateMode.Chain;
        if (str == "chainscale")
            return PathConstraintData_1.RotateMode.ChainScale;
        throw new Error("Unknown rotate mode: " + str);
    };
    SkeletonJson.transformModeFromString = function (str) {
        str = str.toLowerCase();
        if (str == "normal")
            return BoneData_1.TransformMode.Normal;
        if (str == "onlytranslation")
            return BoneData_1.TransformMode.OnlyTranslation;
        if (str == "norotationorreflection")
            return BoneData_1.TransformMode.NoRotationOrReflection;
        if (str == "noscale")
            return BoneData_1.TransformMode.NoScale;
        if (str == "noscaleorreflection")
            return BoneData_1.TransformMode.NoScaleOrReflection;
        throw new Error("Unknown transform mode: " + str);
    };
    SkeletonJson.transformModeLegacy = function (inheritRotation, inheritScale) {
        console.log("Deprecation Warning: re-export your model with spine 3.5, or downgrade to pixi-spine 1.1 branch. There were many breaking changes, place breakpoint here if you want to know which model is broken");
        if (inheritRotation && inheritScale) {
            return BoneData_1.TransformMode.Normal;
        }
        else if (inheritRotation) {
            return BoneData_1.TransformMode.NoScaleOrReflection;
        }
        else if (inheritScale) {
            return BoneData_1.TransformMode.NoRotationOrReflection;
        }
        else {
            return BoneData_1.TransformMode.OnlyTranslation;
        }
    };
    return SkeletonJson;
}());
exports.SkeletonJson = SkeletonJson;
var LinkedMesh = (function () {
    function LinkedMesh(mesh, skin, slotIndex, parent) {
        this.mesh = mesh;
        this.skin = skin;
        this.slotIndex = slotIndex;
        this.parent = parent;
    }
    return LinkedMesh;
}());
},{"./Animation":2,"./BoneData":8,"./Event":9,"./EventData":10,"./IkConstraintData":12,"./PathConstraintData":14,"./SkeletonData":17,"./Skin":19,"./SlotData":21,"./TransformConstraintData":25,"./Utils":26}],19:[function(require,module,exports){
"use strict";
var Skin = (function () {
    function Skin(name) {
        this.attachments = new Array();
        if (name == null)
            throw new Error("name cannot be null.");
        this.name = name;
    }
    Skin.prototype.addAttachment = function (slotIndex, name, attachment) {
        if (attachment == null)
            throw new Error("attachment cannot be null.");
        var attachments = this.attachments;
        if (slotIndex >= attachments.length)
            attachments.length = slotIndex + 1;
        if (!attachments[slotIndex])
            attachments[slotIndex] = {};
        attachments[slotIndex][name] = attachment;
    };
    Skin.prototype.getAttachment = function (slotIndex, name) {
        var dictionary = this.attachments[slotIndex];
        return dictionary ? dictionary[name] : null;
    };
    Skin.prototype.attachAll = function (skeleton, oldSkin) {
        var slotIndex = 0;
        for (var i = 0; i < skeleton.slots.length; i++) {
            var slot = skeleton.slots[i];
            var slotAttachment = slot.getAttachment();
            if (slotAttachment && slotIndex < oldSkin.attachments.length) {
                var dictionary = oldSkin.attachments[slotIndex];
                for (var key in dictionary) {
                    var skinAttachment = dictionary[key];
                    if (slotAttachment == skinAttachment) {
                        var attachment = this.getAttachment(slotIndex, name);
                        if (attachment != null)
                            slot.setAttachment(attachment);
                        break;
                    }
                }
            }
            slotIndex++;
        }
    };
    return Skin;
}());
exports.Skin = Skin;
},{}],20:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var Slot = (function () {
    function Slot(data, bone) {
        this.attachmentVertices = new Array();
        if (data == null)
            throw new Error("data cannot be null.");
        if (bone == null)
            throw new Error("bone cannot be null.");
        this.data = data;
        this.bone = bone;
        this.color = new Utils_1.Color();
        this.blendMode = data.blendMode;
        this.setToSetupPose();
    }
    Slot.prototype.getAttachment = function () {
        return this.attachment;
    };
    Slot.prototype.setAttachment = function (attachment) {
        if (this.attachment == attachment)
            return;
        this.attachment = attachment;
        this.attachmentTime = this.bone.skeleton.time;
        this.attachmentVertices.length = 0;
    };
    Slot.prototype.setAttachmentTime = function (time) {
        this.attachmentTime = this.bone.skeleton.time - time;
    };
    Slot.prototype.getAttachmentTime = function () {
        return this.bone.skeleton.time - this.attachmentTime;
    };
    Slot.prototype.setToSetupPose = function () {
        this.color.setFromColor(this.data.color);
        if (this.data.attachmentName == null)
            this.attachment = null;
        else {
            this.attachment = null;
            this.setAttachment(this.bone.skeleton.getAttachment(this.data.index, this.data.attachmentName));
        }
    };
    return Slot;
}());
exports.Slot = Slot;
},{"./Utils":26}],21:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var SlotData = (function () {
    function SlotData(index, name, boneData) {
        this.color = new Utils_1.Color(1, 1, 1, 1);
        if (index < 0)
            throw new Error("index must be >= 0.");
        if (name == null)
            throw new Error("name cannot be null.");
        if (boneData == null)
            throw new Error("boneData cannot be null.");
        this.index = index;
        this.name = name;
        this.boneData = boneData;
    }
    return SlotData;
}());
exports.SlotData = SlotData;
},{"./Utils":26}],22:[function(require,module,exports){
"use strict";
var Texture = (function () {
    function Texture(image) {
        this._image = image;
    }
    Texture.prototype.getImage = function () {
        return this._image;
    };
    Texture.filterFromString = function (text) {
        switch (text.toLowerCase()) {
            case "nearest": return TextureFilter.Nearest;
            case "linear": return TextureFilter.Linear;
            case "mipmap": return TextureFilter.MipMap;
            case "mipmapnearestnearest": return TextureFilter.MipMapNearestNearest;
            case "mipmaplinearnearest": return TextureFilter.MipMapLinearNearest;
            case "mipmapnearestlinear": return TextureFilter.MipMapNearestLinear;
            case "mipmaplinearlinear": return TextureFilter.MipMapLinearLinear;
            default: throw new Error("Unknown texture filter " + text);
        }
    };
    Texture.wrapFromString = function (text) {
        switch (text.toLowerCase()) {
            case "mirroredtepeat": return TextureWrap.MirroredRepeat;
            case "clamptoedge": return TextureWrap.ClampToEdge;
            case "repeat": return TextureWrap.Repeat;
            default: throw new Error("Unknown texture wrap " + text);
        }
    };
    return Texture;
}());
exports.Texture = Texture;
(function (TextureFilter) {
    TextureFilter[TextureFilter["Nearest"] = 9728] = "Nearest";
    TextureFilter[TextureFilter["Linear"] = 9729] = "Linear";
    TextureFilter[TextureFilter["MipMap"] = 9987] = "MipMap";
    TextureFilter[TextureFilter["MipMapNearestNearest"] = 9984] = "MipMapNearestNearest";
    TextureFilter[TextureFilter["MipMapLinearNearest"] = 9985] = "MipMapLinearNearest";
    TextureFilter[TextureFilter["MipMapNearestLinear"] = 9986] = "MipMapNearestLinear";
    TextureFilter[TextureFilter["MipMapLinearLinear"] = 9987] = "MipMapLinearLinear";
})(exports.TextureFilter || (exports.TextureFilter = {}));
var TextureFilter = exports.TextureFilter;
(function (TextureWrap) {
    TextureWrap[TextureWrap["MirroredRepeat"] = 33648] = "MirroredRepeat";
    TextureWrap[TextureWrap["ClampToEdge"] = 33071] = "ClampToEdge";
    TextureWrap[TextureWrap["Repeat"] = 10497] = "Repeat";
})(exports.TextureWrap || (exports.TextureWrap = {}));
var TextureWrap = exports.TextureWrap;
var TextureRegion = (function () {
    function TextureRegion() {
        this.size = null;
    }
    Object.defineProperty(TextureRegion.prototype, "width", {
        get: function () {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                return tex.crop.width;
            }
            if (tex.trim) {
                return tex.trim.width;
            }
            return tex.orig.width;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "height", {
        get: function () {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                return tex.crop.height;
            }
            if (tex.trim) {
                return tex.trim.height;
            }
            return tex.orig.height;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "u", {
        get: function () {
            return this.texture._uvs.x0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "v", {
        get: function () {
            return this.texture._uvs.y0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "u2", {
        get: function () {
            return this.texture._uvs.x2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "v2", {
        get: function () {
            return this.texture._uvs.y2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "offsetX", {
        get: function () {
            var tex = this.texture;
            return tex.trim ? tex.trim.x : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "offsetY", {
        get: function () {
            console.warn("Deprecation Warning: @Hackerham: I guess, if you are using PIXI-SPINE ATLAS region.offsetY, you want a texture, right? Use region.texture from now on.");
            return this.spineOffsetY;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "pixiOffsetY", {
        get: function () {
            var tex = this.texture;
            return tex.trim ? tex.trim.y : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "spineOffsetY", {
        get: function () {
            var tex = this.texture;
            return this.originalHeight - this.height - (tex.trim ? tex.trim.y : 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "originalWidth", {
        get: function () {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                if (tex.trim) {
                    return tex.trim.width;
                }
                return tex.crop.width;
            }
            return tex.orig.width;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "originalHeight", {
        get: function () {
            var tex = this.texture;
            if (PIXI.VERSION[0] == '3') {
                if (tex.trim) {
                    return tex.trim.height;
                }
                return tex.crop.height;
            }
            return tex.orig.height;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "x", {
        get: function () {
            return this.texture.frame.x;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "y", {
        get: function () {
            return this.texture.frame.y;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextureRegion.prototype, "rotate", {
        get: function () {
            return this.texture.rotate !== 0;
        },
        enumerable: true,
        configurable: true
    });
    return TextureRegion;
}());
exports.TextureRegion = TextureRegion;
},{}],23:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Texture_1 = require("./Texture");
var TextureAtlas = (function () {
    function TextureAtlas(atlasText, textureLoader, callback) {
        this.pages = new Array();
        this.regions = new Array();
        if (atlasText) {
            this.addSpineAtlas(atlasText, textureLoader, callback);
        }
    }
    TextureAtlas.prototype.addTexture = function (name, texture) {
        var pages = this.pages;
        var page = null;
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].baseTexture === texture.baseTexture) {
                page = pages[i];
                break;
            }
        }
        if (page === null) {
            page = new TextureAtlasPage();
            page.name = 'texturePage';
            var baseTexture = texture.baseTexture;
            page.width = baseTexture.realWidth;
            page.height = baseTexture.realHeight;
            page.baseTexture = baseTexture;
            page.minFilter = page.magFilter = Texture_1.TextureFilter.Nearest;
            page.uWrap = Texture_1.TextureWrap.ClampToEdge;
            page.vWrap = Texture_1.TextureWrap.ClampToEdge;
            pages.push(page);
        }
        var region = new TextureAtlasRegion();
        region.name = name;
        region.page = page;
        region.texture = texture;
        region.index = -1;
        this.regions.push(region);
        return region;
    };
    TextureAtlas.prototype.addTextureHash = function (textures, stripExtension) {
        for (var key in textures) {
            if (textures.hasOwnProperty(key)) {
                this.addTexture(stripExtension && key.indexOf('.') !== -1 ? key.substr(0, key.lastIndexOf('.')) : key, textures[key]);
            }
        }
    };
    TextureAtlas.prototype.addSpineAtlas = function (atlasText, textureLoader, callback) {
        return this.load(atlasText, textureLoader, callback);
    };
    TextureAtlas.prototype.load = function (atlasText, textureLoader, callback) {
        var _this = this;
        if (textureLoader == null)
            throw new Error("textureLoader cannot be null.");
        var reader = new TextureAtlasReader(atlasText);
        var tuple = new Array(4);
        var page = null;
        var iterateParser = function () {
            while (true) {
                var line = reader.readLine();
                if (line == null) {
                    return callback && callback(_this);
                }
                line = line.trim();
                if (line.length == 0)
                    page = null;
                else if (!page) {
                    page = new TextureAtlasPage();
                    page.name = line;
                    if (reader.readTuple(tuple) == 2) {
                        page.width = parseInt(tuple[0]);
                        page.height = parseInt(tuple[1]);
                        reader.readTuple(tuple);
                    }
                    reader.readTuple(tuple);
                    page.minFilter = Texture_1.Texture.filterFromString(tuple[0]);
                    page.magFilter = Texture_1.Texture.filterFromString(tuple[1]);
                    var direction = reader.readValue();
                    page.uWrap = Texture_1.TextureWrap.ClampToEdge;
                    page.vWrap = Texture_1.TextureWrap.ClampToEdge;
                    if (direction == "x")
                        page.uWrap = Texture_1.TextureWrap.Repeat;
                    else if (direction == "y")
                        page.vWrap = Texture_1.TextureWrap.Repeat;
                    else if (direction == "xy")
                        page.uWrap = page.vWrap = Texture_1.TextureWrap.Repeat;
                    textureLoader(line, function (texture) {
                        page.baseTexture = texture;
                        if (!texture.hasLoaded) {
                            texture.width = page.width;
                            texture.height = page.height;
                        }
                        _this.pages.push(page);
                        page.setFilters();
                        if (!page.width || !page.height) {
                            page.width = texture.realWidth;
                            page.height = texture.realHeight;
                            if (!page.width || !page.height) {
                                console.log("ERROR spine atlas page " + page.name + ": meshes wont work if you dont specify size in atlas (http://www.html5gamedevs.com/topic/18888-pixi-spines-and-meshes/?p=107121)");
                            }
                        }
                        iterateParser();
                    });
                    _this.pages.push(page);
                    break;
                }
                else {
                    var region = new TextureAtlasRegion();
                    region.name = line;
                    region.page = page;
                    var rotate = reader.readValue() == "true" ? 6 : 0;
                    reader.readTuple(tuple);
                    var x = parseInt(tuple[0]);
                    var y = parseInt(tuple[1]);
                    reader.readTuple(tuple);
                    var width = parseInt(tuple[0]);
                    var height = parseInt(tuple[1]);
                    var resolution = page.baseTexture.resolution;
                    x /= resolution;
                    y /= resolution;
                    width /= resolution;
                    height /= resolution;
                    var frame = new PIXI.Rectangle(x, y, rotate ? height : width, rotate ? width : height);
                    if (reader.readTuple(tuple) == 4) {
                        if (reader.readTuple(tuple) == 4) {
                            reader.readTuple(tuple);
                        }
                    }
                    var originalWidth = parseInt(tuple[0]) / resolution;
                    var originalHeight = parseInt(tuple[1]) / resolution;
                    reader.readTuple(tuple);
                    var offsetX = parseInt(tuple[0]) / resolution;
                    var offsetY = parseInt(tuple[1]) / resolution;
                    var orig = new PIXI.Rectangle(0, 0, originalWidth, originalHeight);
                    var trim = new PIXI.Rectangle(offsetX, originalHeight - height - offsetY, width, height);
                    if (PIXI.VERSION[0] == '4') {
                        region.texture = new PIXI.Texture(region.page.baseTexture, frame, orig, trim, rotate);
                    }
                    else {
                        var frame2 = new PIXI.Rectangle(x, y, width, height);
                        var crop = frame2.clone();
                        trim.width = originalWidth;
                        trim.height = originalHeight;
                        region.texture = new PIXI.Texture(region.page.baseTexture, frame2, crop, trim, rotate);
                    }
                    region.index = parseInt(reader.readValue());
                    region.texture._updateUvs();
                    _this.regions.push(region);
                }
            }
        };
        iterateParser();
    };
    TextureAtlas.prototype.findRegion = function (name) {
        for (var i = 0; i < this.regions.length; i++) {
            if (this.regions[i].name == name) {
                return this.regions[i];
            }
        }
        return null;
    };
    TextureAtlas.prototype.dispose = function () {
        for (var i = 0; i < this.pages.length; i++) {
            this.pages[i].baseTexture.dispose();
        }
    };
    return TextureAtlas;
}());
exports.TextureAtlas = TextureAtlas;
var TextureAtlasReader = (function () {
    function TextureAtlasReader(text) {
        this.index = 0;
        this.lines = text.split(/\r\n|\r|\n/);
    }
    TextureAtlasReader.prototype.readLine = function () {
        if (this.index >= this.lines.length)
            return null;
        return this.lines[this.index++];
    };
    TextureAtlasReader.prototype.readValue = function () {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1)
            throw new Error("Invalid line: " + line);
        return line.substring(colon + 1).trim();
    };
    TextureAtlasReader.prototype.readTuple = function (tuple) {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1)
            throw new Error("Invalid line: " + line);
        var i = 0, lastMatch = colon + 1;
        for (; i < 3; i++) {
            var comma = line.indexOf(",", lastMatch);
            if (comma == -1)
                break;
            tuple[i] = line.substr(lastMatch, comma - lastMatch).trim();
            lastMatch = comma + 1;
        }
        tuple[i] = line.substring(lastMatch).trim();
        return i + 1;
    };
    return TextureAtlasReader;
}());
var TextureAtlasPage = (function () {
    function TextureAtlasPage() {
    }
    TextureAtlasPage.prototype.setFilters = function () {
        var tex = this.baseTexture;
        var filter = this.minFilter;
        if (filter == Texture_1.TextureFilter.Linear) {
            tex.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        else if (this.minFilter == Texture_1.TextureFilter.Nearest) {
            tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
        }
        else {
            tex.mipmap = true;
            if (filter == Texture_1.TextureFilter.MipMapNearestNearest) {
                tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
            }
            else {
                tex.scaleMode = PIXI.SCALE_MODES.LINEAR;
            }
        }
    };
    return TextureAtlasPage;
}());
exports.TextureAtlasPage = TextureAtlasPage;
var TextureAtlasRegion = (function (_super) {
    __extends(TextureAtlasRegion, _super);
    function TextureAtlasRegion() {
        _super.apply(this, arguments);
    }
    return TextureAtlasRegion;
}(Texture_1.TextureRegion));
exports.TextureAtlasRegion = TextureAtlasRegion;
},{"./Texture":22}],24:[function(require,module,exports){
"use strict";
var Utils_1 = require("./Utils");
var TransformConstraint = (function () {
    function TransformConstraint(data, skeleton) {
        this.rotateMix = 0;
        this.translateMix = 0;
        this.scaleMix = 0;
        this.shearMix = 0;
        this.temp = new Utils_1.Vector2();
        if (data == null)
            throw new Error("data cannot be null.");
        if (skeleton == null)
            throw new Error("skeleton cannot be null.");
        this.data = data;
        this.rotateMix = data.rotateMix;
        this.translateMix = data.translateMix;
        this.scaleMix = data.scaleMix;
        this.shearMix = data.shearMix;
        this.bones = new Array();
        for (var i = 0; i < data.bones.length; i++)
            this.bones.push(skeleton.findBone(data.bones[i].name));
        this.target = skeleton.findBone(data.target.name);
    }
    TransformConstraint.prototype.apply = function () {
        this.update();
    };
    TransformConstraint.prototype.update = function () {
        var rotateMix = this.rotateMix, translateMix = this.translateMix, scaleMix = this.scaleMix, shearMix = this.shearMix;
        var target = this.target;
        var ta = target.matrix.a, tb = target.matrix.c, tc = target.matrix.b, td = target.matrix.d;
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++) {
            var bone = bones[i];
            var m = bone.matrix;
            var modified = false;
            if (rotateMix != 0) {
                var a = m.a, b = m.c, c = m.b, d = m.d;
                var r = Math.atan2(tc, ta) - Math.atan2(c, a) + this.data.offsetRotation * Utils_1.MathUtils.degRad;
                if (r > Utils_1.MathUtils.PI)
                    r -= Utils_1.MathUtils.PI2;
                else if (r < -Utils_1.MathUtils.PI)
                    r += Utils_1.MathUtils.PI2;
                r *= rotateMix;
                var cos = Math.cos(r), sin = Math.sin(r);
                m.a = cos * a - sin * c;
                m.c = cos * b - sin * d;
                m.b = sin * a + cos * c;
                m.d = sin * b + cos * d;
                modified = true;
            }
            if (translateMix != 0) {
                var temp = this.temp;
                target.localToWorld(temp.set(this.data.offsetX, this.data.offsetY));
                m.tx += (temp.x - m.tx) * translateMix;
                m.ty += (temp.y - m.ty) * translateMix;
                modified = true;
            }
            if (scaleMix > 0) {
                var s = Math.sqrt(m.a * m.a + m.b * m.b);
                var ts = Math.sqrt(ta * ta + tc * tc);
                if (s > 0.00001)
                    s = (s + (ts - s + this.data.offsetScaleX) * scaleMix) / s;
                m.a *= s;
                m.b *= s;
                s = Math.sqrt(m.c * m.c + m.d * m.d);
                ts = Math.sqrt(tb * tb + td * td);
                if (s > 0.00001)
                    s = (s + (ts - s + this.data.offsetScaleY) * scaleMix) / s;
                m.c *= s;
                m.d *= s;
                modified = true;
            }
            if (shearMix > 0) {
                var b = m.c, d = m.d;
                var by = Math.atan2(d, b);
                var r = Math.atan2(td, tb) - Math.atan2(tc, ta) - (by - Math.atan2(m.b, m.a));
                if (r > Utils_1.MathUtils.PI)
                    r -= Utils_1.MathUtils.PI2;
                else if (r < -Utils_1.MathUtils.PI)
                    r += Utils_1.MathUtils.PI2;
                r = by + (r + this.data.offsetShearY * Utils_1.MathUtils.degRad) * shearMix;
                var s = Math.sqrt(b * b + d * d);
                m.c = Math.cos(r) * s;
                m.d = Math.sin(r) * s;
                modified = true;
            }
            if (modified)
                bone.appliedValid = false;
        }
    };
    TransformConstraint.prototype.getOrder = function () {
        return this.data.order;
    };
    return TransformConstraint;
}());
exports.TransformConstraint = TransformConstraint;
},{"./Utils":26}],25:[function(require,module,exports){
"use strict";
var TransformConstraintData = (function () {
    function TransformConstraintData(name) {
        this.order = 0;
        this.bones = new Array();
        this.rotateMix = 0;
        this.translateMix = 0;
        this.scaleMix = 0;
        this.shearMix = 0;
        this.offsetRotation = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetScaleX = 0;
        this.offsetScaleY = 0;
        this.offsetShearY = 0;
        if (name == null)
            throw new Error("name cannot be null.");
        this.name = name;
    }
    return TransformConstraintData;
}());
exports.TransformConstraintData = TransformConstraintData;
},{}],26:[function(require,module,exports){
"use strict";
var Color = (function () {
    function Color(r, g, b, a) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        if (a === void 0) { a = 0; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    Color.prototype.set = function (r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.clamp();
        return this;
    };
    Color.prototype.setFromColor = function (c) {
        this.r = c.r;
        this.g = c.g;
        this.b = c.b;
        this.a = c.a;
        return this;
    };
    Color.prototype.setFromString = function (hex) {
        hex = hex.charAt(0) == '#' ? hex.substr(1) : hex;
        this.r = parseInt(hex.substr(0, 2), 16) / 255.0;
        this.g = parseInt(hex.substr(2, 2), 16) / 255.0;
        this.b = parseInt(hex.substr(4, 2), 16) / 255.0;
        this.a = (hex.length != 8 ? 255 : parseInt(hex.substr(6, 2), 16)) / 255.0;
        return this;
    };
    Color.prototype.add = function (r, g, b, a) {
        this.r += r;
        this.g += g;
        this.b += b;
        this.a += a;
        this.clamp();
        return this;
    };
    Color.prototype.clamp = function () {
        if (this.r < 0)
            this.r = 0;
        else if (this.r > 1)
            this.r = 1;
        if (this.g < 0)
            this.g = 0;
        else if (this.g > 1)
            this.g = 1;
        if (this.b < 0)
            this.b = 0;
        else if (this.b > 1)
            this.b = 1;
        if (this.a < 0)
            this.a = 0;
        else if (this.a > 1)
            this.a = 1;
        return this;
    };
    Color.WHITE = new Color(1, 1, 1, 1);
    Color.RED = new Color(1, 0, 0, 1);
    Color.GREEN = new Color(0, 1, 0, 1);
    Color.BLUE = new Color(0, 0, 1, 1);
    Color.MAGENTA = new Color(1, 0, 1, 1);
    return Color;
}());
exports.Color = Color;
var MathUtils = (function () {
    function MathUtils() {
    }
    MathUtils.clamp = function (value, min, max) {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    };
    MathUtils.cosDeg = function (degrees) {
        return Math.cos(degrees * MathUtils.degRad);
    };
    MathUtils.sinDeg = function (degrees) {
        return Math.sin(degrees * MathUtils.degRad);
    };
    MathUtils.signum = function (value) {
        return value >= 0 ? 1 : -1;
    };
    MathUtils.toInt = function (x) {
        return x > 0 ? Math.floor(x) : Math.ceil(x);
    };
    MathUtils.cbrt = function (x) {
        var y = Math.pow(Math.abs(x), 1 / 3);
        return x < 0 ? -y : y;
    };
    MathUtils.PI = 3.1415927;
    MathUtils.PI2 = MathUtils.PI * 2;
    MathUtils.radiansToDegrees = 180 / MathUtils.PI;
    MathUtils.radDeg = MathUtils.radiansToDegrees;
    MathUtils.degreesToRadians = MathUtils.PI / 180;
    MathUtils.degRad = MathUtils.degreesToRadians;
    return MathUtils;
}());
exports.MathUtils = MathUtils;
var Utils = (function () {
    function Utils() {
    }
    Utils.arrayCopy = function (source, sourceStart, dest, destStart, numElements) {
        for (var i = sourceStart, j = destStart; i < sourceStart + numElements; i++, j++) {
            dest[j] = source[i];
        }
    };
    Utils.setArraySize = function (array, size, value) {
        if (value === void 0) { value = 0; }
        var oldSize = array.length;
        if (oldSize == size)
            return array;
        array.length = size;
        if (oldSize < size) {
            for (var i = oldSize; i < size; i++)
                array[i] = value;
        }
        return array;
    };
    Utils.newArray = function (size, defaultValue) {
        var array = new Array(size);
        for (var i = 0; i < size; i++)
            array[i] = defaultValue;
        return array;
    };
    Utils.newFloatArray = function (size) {
        if (Utils.SUPPORTS_TYPED_ARRAYS) {
            return new Float32Array(size);
        }
        else {
            var array = new Array(size);
            for (var i = 0; i < array.length; i++)
                array[i] = 0;
            return array;
        }
    };
    Utils.toFloatArray = function (array) {
        return Utils.SUPPORTS_TYPED_ARRAYS ? new Float32Array(array) : array;
    };
    Utils.SUPPORTS_TYPED_ARRAYS = typeof (Float32Array) !== "undefined";
    return Utils;
}());
exports.Utils = Utils;
var DebugUtils = (function () {
    function DebugUtils() {
    }
    DebugUtils.logBones = function (skeleton) {
        for (var i = 0; i < skeleton.bones.length; i++) {
            var bone = skeleton.bones[i];
            var m = bone.matrix;
            console.log(bone.data.name + ", " + m.a + ", " + m.b + ", " + m.c + ", " + m.d + ", " + m.tx + ", " + m.ty);
        }
    };
    return DebugUtils;
}());
exports.DebugUtils = DebugUtils;
var Pool = (function () {
    function Pool(instantiator) {
        this.items = new Array();
        this.instantiator = instantiator;
    }
    Pool.prototype.obtain = function () {
        return this.items.length > 0 ? this.items.pop() : this.instantiator();
    };
    Pool.prototype.free = function (item) {
        this.items.push(item);
    };
    Pool.prototype.freeAll = function (items) {
        for (var i = 0; i < items.length; i++)
            this.items[i] = items[i];
    };
    Pool.prototype.clear = function () {
        this.items.length = 0;
    };
    return Pool;
}());
exports.Pool = Pool;
var Vector2 = (function () {
    function Vector2(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Vector2.prototype.set = function (x, y) {
        this.x = x;
        this.y = y;
        return this;
    };
    Vector2.prototype.length = function () {
        var x = this.x;
        var y = this.y;
        return Math.sqrt(x * x + y * y);
    };
    Vector2.prototype.normalize = function () {
        var len = this.length();
        if (len != 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    };
    return Vector2;
}());
exports.Vector2 = Vector2;
var TimeKeeper = (function () {
    function TimeKeeper() {
        this.maxDelta = 0.064;
        this.framesPerSecond = 0;
        this.delta = 0;
        this.totalTime = 0;
        this.lastTime = Date.now() / 1000;
        this.frameCount = 0;
        this.frameTime = 0;
    }
    TimeKeeper.prototype.update = function () {
        var now = Date.now() / 1000;
        this.delta = now - this.lastTime;
        this.frameTime += this.delta;
        this.totalTime += this.delta;
        if (this.delta > this.maxDelta)
            this.delta = this.maxDelta;
        this.lastTime = now;
        this.frameCount++;
        if (this.frameTime > 1) {
            this.framesPerSecond = this.frameCount / this.frameTime;
            this.frameTime = 0;
            this.frameCount = 0;
        }
    };
    return TimeKeeper;
}());
exports.TimeKeeper = TimeKeeper;
},{}],27:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attachment = (function () {
    function Attachment(name) {
        if (name == null)
            throw new Error("name cannot be null.");
        this.name = name;
    }
    return Attachment;
}());
exports.Attachment = Attachment;
var VertexAttachment = (function (_super) {
    __extends(VertexAttachment, _super);
    function VertexAttachment(name) {
        _super.call(this, name);
        this.worldVerticesLength = 0;
    }
    VertexAttachment.prototype.computeWorldVertices = function (slot, worldVertices) {
        this.computeWorldVerticesWith(slot, 0, this.worldVerticesLength, worldVertices, 0);
    };
    VertexAttachment.prototype.computeWorldVerticesWith = function (slot, start, count, worldVertices, offset) {
        count += offset;
        var skeleton = slot.bone.skeleton;
        var deformArray = slot.attachmentVertices;
        var vertices = this.vertices;
        var bones = this.bones;
        if (bones == null) {
            if (deformArray.length > 0)
                vertices = deformArray;
            var bone = slot.bone;
            var m = bone.matrix;
            var x = m.tx;
            var y = m.ty;
            var a = m.a, b = m.c, c = m.b, d = m.d;
            for (var v_1 = start, w = offset; w < count; v_1 += 2, w += 2) {
                var vx = vertices[v_1], vy = vertices[v_1 + 1];
                worldVertices[w] = vx * a + vy * b + x;
                worldVertices[w + 1] = vx * c + vy * d + y;
            }
            return;
        }
        var v = 0, skip = 0;
        for (var i = 0; i < start; i += 2) {
            var n = bones[v];
            v += n + 1;
            skip += n;
        }
        var skeletonBones = skeleton.bones;
        if (deformArray.length == 0) {
            for (var w = offset, b = skip * 3; w < count; w += 2) {
                var wx = 0, wy = 0;
                var n = bones[v++];
                n += v;
                for (; v < n; v++, b += 3) {
                    var bone = skeletonBones[bones[v]];
                    var m = bone.matrix;
                    var vx = vertices[b], vy = vertices[b + 1], weight = vertices[b + 2];
                    wx += (vx * m.a + vy * m.c + m.tx) * weight;
                    wy += (vx * m.b + vy * m.d + m.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        }
        else {
            var deform = deformArray;
            for (var w = offset, b = skip * 3, f = skip << 1; w < count; w += 2) {
                var wx = 0, wy = 0;
                var n = bones[v++];
                n += v;
                for (; v < n; v++, b += 3, f += 2) {
                    var bone = skeletonBones[bones[v]];
                    var m = bone.matrix;
                    var vx = vertices[b] + deform[f], vy = vertices[b + 1] + deform[f + 1], weight = vertices[b + 2];
                    wx += (vx * m.a + vy * m.c + m.tx) * weight;
                    wy += (vx * m.b + vy * m.d + m.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        }
    };
    VertexAttachment.prototype.applyDeform = function (sourceAttachment) {
        return this == sourceAttachment;
    };
    return VertexAttachment;
}(Attachment));
exports.VertexAttachment = VertexAttachment;
},{}],28:[function(require,module,exports){
"use strict";
(function (AttachmentType) {
    AttachmentType[AttachmentType["Region"] = 0] = "Region";
    AttachmentType[AttachmentType["BoundingBox"] = 1] = "BoundingBox";
    AttachmentType[AttachmentType["Mesh"] = 2] = "Mesh";
    AttachmentType[AttachmentType["LinkedMesh"] = 3] = "LinkedMesh";
    AttachmentType[AttachmentType["Path"] = 4] = "Path";
})(exports.AttachmentType || (exports.AttachmentType = {}));
var AttachmentType = exports.AttachmentType;
},{}],29:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attachment_1 = require("./Attachment");
var Utils_1 = require("../Utils");
var BoundingBoxAttachment = (function (_super) {
    __extends(BoundingBoxAttachment, _super);
    function BoundingBoxAttachment(name) {
        _super.call(this, name);
        this.color = new Utils_1.Color(1, 1, 1, 1);
    }
    return BoundingBoxAttachment;
}(Attachment_1.VertexAttachment));
exports.BoundingBoxAttachment = BoundingBoxAttachment;
},{"../Utils":26,"./Attachment":27}],30:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attachment_1 = require("./Attachment");
var Utils_1 = require("../Utils");
var MeshAttachment = (function (_super) {
    __extends(MeshAttachment, _super);
    function MeshAttachment(name) {
        _super.call(this, name);
        this.color = new Utils_1.Color(1, 1, 1, 1);
        this.inheritDeform = false;
        this.tempColor = new Utils_1.Color(0, 0, 0, 0);
    }
    MeshAttachment.prototype.updateWorldVertices = function (slot, premultipliedAlpha) {
        return [];
    };
    MeshAttachment.prototype.updateUVs = function (region, uvs) {
        var regionUVs = this.regionUVs;
        var n = regionUVs.length;
        if (!uvs || uvs.length != n) {
            uvs = Utils_1.Utils.newFloatArray(n);
        }
        if (region == null) {
            return;
        }
        var texture = region.texture;
        var r = texture._uvs;
        var w1 = region.width, h1 = region.height, w2 = region.originalWidth, h2 = region.originalHeight;
        var x = region.offsetX, y = region.pixiOffsetY;
        for (var i = 0; i < n; i += 2) {
            var u = this.regionUVs[i], v = this.regionUVs[i + 1];
            u = (u * w2 - x) / w1;
            v = (v * h2 - y) / h1;
            uvs[i] = (r.x0 * (1 - u) + r.x1 * u) * (1 - v) + (r.x3 * (1 - u) + r.x2 * u) * v;
            uvs[i + 1] = (r.y0 * (1 - u) + r.y1 * u) * (1 - v) + (r.y3 * (1 - u) + r.y2 * u) * v;
        }
        return uvs;
    };
    MeshAttachment.prototype.applyDeform = function (sourceAttachment) {
        return this == sourceAttachment || (this.inheritDeform && this.parentMesh == sourceAttachment);
    };
    MeshAttachment.prototype.getParentMesh = function () {
        return this.parentMesh;
    };
    MeshAttachment.prototype.setParentMesh = function (parentMesh) {
        this.parentMesh = parentMesh;
        if (parentMesh != null) {
            this.bones = parentMesh.bones;
            this.vertices = parentMesh.vertices;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
        }
    };
    return MeshAttachment;
}(Attachment_1.VertexAttachment));
exports.MeshAttachment = MeshAttachment;
},{"../Utils":26,"./Attachment":27}],31:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attachment_1 = require("./Attachment");
var Utils_1 = require("../Utils");
var PathAttachment = (function (_super) {
    __extends(PathAttachment, _super);
    function PathAttachment(name) {
        _super.call(this, name);
        this.closed = false;
        this.constantSpeed = false;
        this.color = new Utils_1.Color(1, 1, 1, 1);
    }
    return PathAttachment;
}(Attachment_1.VertexAttachment));
exports.PathAttachment = PathAttachment;
},{"../Utils":26,"./Attachment":27}],32:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attachment_1 = require("./Attachment");
var Utils_1 = require("../Utils");
var RegionAttachment = (function (_super) {
    __extends(RegionAttachment, _super);
    function RegionAttachment(name) {
        _super.call(this, name);
        this.x = 0;
        this.y = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.rotation = 0;
        this.width = 0;
        this.height = 0;
        this.color = new Utils_1.Color(1, 1, 1, 1);
    }
    RegionAttachment.prototype.updateWorldVertices = function (slot, premultipliedAlpha) {
        return [];
    };
    return RegionAttachment;
}(Attachment_1.Attachment));
exports.RegionAttachment = RegionAttachment;
},{"../Utils":26,"./Attachment":27}],33:[function(require,module,exports){
"use strict";
var Attachment_1 = require("./Attachment");
exports.Attachment = Attachment_1.Attachment;
exports.VertexAttachment = Attachment_1.VertexAttachment;
var AttachmentType_1 = require("./AttachmentType");
exports.AttachmentType = AttachmentType_1.AttachmentType;
var BoundingBoxAttachment_1 = require("./BoundingBoxAttachment");
exports.BoundingBoxAttachment = BoundingBoxAttachment_1.BoundingBoxAttachment;
var MeshAttachment_1 = require("./MeshAttachment");
exports.MeshAttachment = MeshAttachment_1.MeshAttachment;
var PathAttachment_1 = require("./PathAttachment");
exports.PathAttachment = PathAttachment_1.PathAttachment;
var RegionAttachment_1 = require("./RegionAttachment");
exports.RegionAttachment = RegionAttachment_1.RegionAttachment;
},{"./Attachment":27,"./AttachmentType":28,"./BoundingBoxAttachment":29,"./MeshAttachment":30,"./PathAttachment":31,"./RegionAttachment":32}],34:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require("./attachments"));
var Animation_1 = require("./Animation");
exports.ColorTimeline = Animation_1.ColorTimeline;
exports.AttachmentTimeline = Animation_1.AttachmentTimeline;
exports.RotateTimeline = Animation_1.RotateTimeline;
exports.TranslateTimeline = Animation_1.TranslateTimeline;
exports.ScaleTimeline = Animation_1.ScaleTimeline;
exports.ShearTimeline = Animation_1.ShearTimeline;
exports.IkConstraintTimeline = Animation_1.IkConstraintTimeline;
exports.TransformConstraintTimeline = Animation_1.TransformConstraintTimeline;
exports.PathConstraintPositionTimeline = Animation_1.PathConstraintPositionTimeline;
exports.PathConstraintSpacingTimeline = Animation_1.PathConstraintSpacingTimeline;
exports.PathConstraintMixTimeline = Animation_1.PathConstraintMixTimeline;
exports.DeformTimeline = Animation_1.DeformTimeline;
exports.DrawOrderTimeline = Animation_1.DrawOrderTimeline;
exports.EventTimeline = Animation_1.EventTimeline;
exports.Animation = Animation_1.Animation;
exports.CurveTimeline = Animation_1.CurveTimeline;
var AnimationState_1 = require("./AnimationState");
exports.AnimationState = AnimationState_1.AnimationState;
var AnimationStateData_1 = require("./AnimationStateData");
exports.AnimationStateData = AnimationStateData_1.AnimationStateData;
var BlendMode_1 = require("./BlendMode");
exports.BlendMode = BlendMode_1.BlendMode;
var Bone_1 = require("./Bone");
exports.Bone = Bone_1.Bone;
var BoneData_1 = require("./BoneData");
exports.BoneData = BoneData_1.BoneData;
exports.TransformMode = BoneData_1.TransformMode;
var Event_1 = require("./Event");
exports.Event = Event_1.Event;
var EventData_1 = require("./EventData");
exports.EventData = EventData_1.EventData;
var IkConstraint_1 = require("./IkConstraint");
exports.IkConstraint = IkConstraint_1.IkConstraint;
var IkConstraintData_1 = require("./IkConstraintData");
exports.IkConstraintData = IkConstraintData_1.IkConstraintData;
var PathConstraint_1 = require("./PathConstraint");
exports.PathConstraint = PathConstraint_1.PathConstraint;
var PathConstraintData_1 = require("./PathConstraintData");
exports.PathConstraintData = PathConstraintData_1.PathConstraintData;
exports.SpacingMode = PathConstraintData_1.SpacingMode;
exports.RotateMode = PathConstraintData_1.RotateMode;
exports.PositionMode = PathConstraintData_1.PositionMode;
var Skeleton_1 = require("./Skeleton");
exports.Skeleton = Skeleton_1.Skeleton;
var SkeletonBounds_1 = require("./SkeletonBounds");
exports.SkeletonBounds = SkeletonBounds_1.SkeletonBounds;
var SkeletonData_1 = require("./SkeletonData");
exports.SkeletonData = SkeletonData_1.SkeletonData;
var SkeletonJson_1 = require("./SkeletonJson");
exports.SkeletonJson = SkeletonJson_1.SkeletonJson;
var Skin_1 = require("./Skin");
exports.Skin = Skin_1.Skin;
var Slot_1 = require("./Slot");
exports.Slot = Slot_1.Slot;
var SlotData_1 = require("./SlotData");
exports.SlotData = SlotData_1.SlotData;
var Texture_1 = require("./Texture");
exports.Texture = Texture_1.Texture;
exports.TextureWrap = Texture_1.TextureWrap;
exports.TextureRegion = Texture_1.TextureRegion;
exports.TextureFilter = Texture_1.TextureFilter;
var TextureAtlas_1 = require("./TextureAtlas");
exports.TextureAtlas = TextureAtlas_1.TextureAtlas;
exports.TextureAtlasRegion = TextureAtlas_1.TextureAtlasRegion;
var AtlasAttachmentLoader_1 = require("./AtlasAttachmentLoader");
exports.AtlasAttachmentLoader = AtlasAttachmentLoader_1.AtlasAttachmentLoader;
var TransformConstraint_1 = require("./TransformConstraint");
exports.TransformConstraint = TransformConstraint_1.TransformConstraint;
var TransformConstraintData_1 = require("./TransformConstraintData");
exports.TransformConstraintData = TransformConstraintData_1.TransformConstraintData;
var Utils_1 = require("./Utils");
exports.Utils = Utils_1.Utils;
exports.Pool = Utils_1.Pool;
exports.MathUtils = Utils_1.MathUtils;
exports.Color = Utils_1.Color;
exports.Vector2 = Utils_1.Vector2;
},{"./Animation":2,"./AnimationState":3,"./AnimationStateData":4,"./AtlasAttachmentLoader":5,"./BlendMode":6,"./Bone":7,"./BoneData":8,"./Event":9,"./EventData":10,"./IkConstraint":11,"./IkConstraintData":12,"./PathConstraint":13,"./PathConstraintData":14,"./Skeleton":15,"./SkeletonBounds":16,"./SkeletonData":17,"./SkeletonJson":18,"./Skin":19,"./Slot":20,"./SlotData":21,"./Texture":22,"./TextureAtlas":23,"./TransformConstraint":24,"./TransformConstraintData":25,"./Utils":26,"./attachments":33}],35:[function(require,module,exports){
"use strict";
var spine = require("./core");
function atlasParser() {
    return function (resource, next) {
        if (!resource.data || !resource.isJson || !resource.data.bones) {
            return next();
        }
        var metadataAtlas = resource.metadata ? resource.metadata.spineAtlas : null;
        if (metadataAtlas === false) {
            return next();
        }
        if (metadataAtlas && metadataAtlas.pages) {
            var spineJsonParser = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(metadataAtlas));
            var skeletonData = spineJsonParser.readSkeletonData(resource.data);
            resource.spineData = skeletonData;
            resource.spineAtlas = metadataAtlas;
            return next();
        }
        var metadataAtlasSuffix = '.atlas';
        if (resource.metadata && resource.metadata.spineAtlasSuffix) {
            metadataAtlasSuffix = resource.metadata.spineAtlasSuffix;
        }
        var atlasPath = resource.url.substr(0, resource.url.lastIndexOf('.')) + metadataAtlasSuffix;
        atlasPath = atlasPath.replace(this.baseUrl, '');
        var atlasOptions = {
            crossOrigin: resource.crossOrigin,
            xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.TEXT,
            metadata: resource.metadata ? resource.metadata.spineMetadata : null
        };
        var imageOptions = {
            crossOrigin: resource.crossOrigin,
            metadata: resource.metadata ? resource.metadata.imageMetadata : null
        };
        var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);
        baseUrl = baseUrl.replace(this.baseUrl, '');
        var adapter = imageLoaderAdapter(this, resource.name + '_atlas_page_', baseUrl, imageOptions);
        this.add(resource.name + '_atlas', atlasPath, atlasOptions, function () {
            new spine.TextureAtlas(this.xhr.responseText, adapter, function (spineAtlas) {
                var spineJsonParser = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(spineAtlas));
                var skeletonData = spineJsonParser.readSkeletonData(resource.data);
                resource.spineData = skeletonData;
                resource.spineAtlas = spineAtlas;
                next();
            });
        });
    };
}
exports.atlasParser = atlasParser;
function imageLoaderAdapter(loader, namePrefix, baseUrl, imageOptions) {
    if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
        baseUrl += '/';
    }
    return function (line, callback) {
        var name = namePrefix + line;
        var url = baseUrl + line;
        loader.add(name, url, imageOptions, function (resource) {
            callback(resource.texture.baseTexture);
        });
    };
}
exports.imageLoaderAdapter = imageLoaderAdapter;
function syncImageLoaderAdapter(baseUrl, crossOrigin) {
    if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
        baseUrl += '/';
    }
    return function (line, callback) {
        callback(PIXI.BaseTexture.fromImage(line, crossOrigin));
    };
}
exports.syncImageLoaderAdapter = syncImageLoaderAdapter;
PIXI.loaders.Loader.addPixiMiddleware(atlasParser);
PIXI.loader.use(atlasParser());
},{"./core":34}],36:[function(require,module,exports){
"use strict";
var core = require("./core");
exports.core = core;
var loaders = require("./loaders");
exports.loaders = loaders;
var Spine_1 = require("./Spine");
exports.Spine = Spine_1.Spine;
exports.SpineMesh = Spine_1.SpineMesh;
exports.SpineSprite = Spine_1.SpineSprite;
},{"./Spine":1,"./core":34,"./loaders":35}]},{},[36])(36)
});


//# sourceMappingURL=pixi-spine.js.map
