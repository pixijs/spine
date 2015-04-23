(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @namespace PIXI.spine
 */
module.exports = require('pixi.js').spine = {
    Spine:          require('./Spine'),
    SpineRuntime:   require('./SpineRuntime'),
    loaders:        require('./loaders')
};

},{"./Spine":43,"./SpineRuntime":41,"./loaders":46,"pixi.js":"pixi.js"}],2:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = function (name, timelines, duration)
{
    this.name = name;
    this.timelines = timelines;
    this.duration = duration;
};
spine.Animation.prototype = {
    apply: function (skeleton, lastTime, time, loop, events)
    {
        if (loop && this.duration != 0)
        {
            time %= this.duration;
            lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, 1);
    },
    mix: function (skeleton, lastTime, time, loop, events, alpha)
    {
        if (loop && this.duration != 0)
        {
            time %= this.duration;
            lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, alpha);
    }
};
spine.Animation.binarySearch = function (values, target, step)
{
    var low = 0;
    var high = Math.floor(values.length / step) - 2;
    if (!high) return step;
    var current = high >>> 1;
    while (true)
    {
        if (values[(current + 1) * step] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return (low + 1) * step;
        current = (low + high) >>> 1;
    }
};
spine.Animation.binarySearch1 = function (values, target)
{
    var low = 0;
    var high = values.length - 2;
    if (!high) return 1;
    var current = high >>> 1;
    while (true)
    {
        if (values[current + 1] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return low + 1;
        current = (low + high) >>> 1;
    }
};
spine.Animation.linearSearch = function (values, target, step)
{
    for (var i = 0, last = values.length - step; i <= last; i += step)
        if (values[i] > target) return i;
    return -1;
};
module.exports = spine.Animation;

},{"../SpineUtil":42}],3:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.TrackEntry = require('./TrackEntry');
spine.AnimationState = function (stateData)
{
    this.data = stateData;
    this.tracks = [];
    this.events = [];
};
spine.AnimationState.prototype = {
    onStart: null,
    onEnd: null,
    onComplete: null,
    onEvent: null,
    timeScale: 1,
    update: function (delta)
    {
        delta *= this.timeScale;
        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            current.time += delta * current.timeScale;
            if (current.previous)
            {
                var previousDelta = delta * current.previous.timeScale;
                current.previous.time += previousDelta;
                current.mixTime += previousDelta;
            }

            var next = current.next;
            if (next)
            {
                next.time = current.lastTime - next.delay;
                if (next.time >= 0) this.setCurrent(i, next);
            } else {
                // End non-looping animation when it reaches its end time and there is no next entry.
                if (!current.loop && current.lastTime >= current.endTime) this.clearTrack(i);
            }
        }
    },
    apply: function (skeleton)
    {
        skeleton.resetDrawOrder();

        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            this.events.length = 0;

            var time = current.time;
            var lastTime = current.lastTime;
            var endTime = current.endTime;
            var loop = current.loop;
            if (!loop && time > endTime) time = endTime;

            var previous = current.previous;
            if (!previous)
            {
                if (current.mix == 1)
                    current.animation.apply(skeleton, current.lastTime, time, loop, this.events);
                else
                    current.animation.mix(skeleton, current.lastTime, time, loop, this.events, current.mix);
            } else {
                var previousTime = previous.time;
                if (!previous.loop && previousTime > previous.endTime) previousTime = previous.endTime;
                previous.animation.apply(skeleton, previousTime, previousTime, previous.loop, null);

                var alpha = current.mixTime / current.mixDuration * current.mix;
                if (alpha >= 1)
                {
                    alpha = 1;
                    current.previous = null;
                }
                current.animation.mix(skeleton, current.lastTime, time, loop, this.events, alpha);
            }

            for (var ii = 0, nn = this.events.length; ii < nn; ii++)
            {
                var event = this.events[ii];
                if (current.onEvent) current.onEvent(i, event);
                if (this.onEvent) this.onEvent(i, event);
            }

            // Check if completed the animation or a loop iteration.
            if (loop ? (lastTime % endTime > time % endTime) : (lastTime < endTime && time >= endTime))
            {
                var count = Math.floor(time / endTime);
                if (current.onComplete) current.onComplete(i, count);
                if (this.onComplete) this.onComplete(i, count);
            }

            current.lastTime = current.time;
        }
    },
    clearTracks: function ()
    {
        for (var i = 0, n = this.tracks.length; i < n; i++)
            this.clearTrack(i);
        this.tracks.length = 0;
    },
    clearTrack: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return;
        var current = this.tracks[trackIndex];
        if (!current) return;

        if (current.onEnd) current.onEnd(trackIndex);
        if (this.onEnd) this.onEnd(trackIndex);

        this.tracks[trackIndex] = null;
    },
    _expandToIndex: function (index)
    {
        if (index < this.tracks.length) return this.tracks[index];
        while (index >= this.tracks.length)
            this.tracks.push(null);
        return null;
    },
    setCurrent: function (index, entry)
    {
        var current = this._expandToIndex(index);
        if (current)
        {
            var previous = current.previous;
            current.previous = null;

            if (current.onEnd) current.onEnd(index);
            if (this.onEnd) this.onEnd(index);

            entry.mixDuration = this.data.getMix(current.animation, entry.animation);
            if (entry.mixDuration > 0)
            {
                entry.mixTime = 0;
                // If a mix is in progress, mix from the closest animation.
                if (previous && current.mixTime / current.mixDuration < 0.5)
                    entry.previous = previous;
                else
                    entry.previous = current;
            }
        }

        this.tracks[index] = entry;

        if (entry.onStart) entry.onStart(index);
        if (this.onStart) this.onStart(index);
    },
    setAnimationByName: function (trackIndex, animationName, loop)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.setAnimation(trackIndex, animation, loop);
    },
    /** Set the current animation. Any queued animations are cleared. */
    setAnimation: function (trackIndex, animation, loop)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;
        this.setCurrent(trackIndex, entry);
        return entry;
    },
    addAnimationByName: function (trackIndex, animationName, loop, delay)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.addAnimation(trackIndex, animation, loop, delay);
    },
    /** Adds an animation to be played delay seconds after the current or last queued animation.
     * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
    addAnimation: function (trackIndex, animation, loop, delay)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;

        var last = this._expandToIndex(trackIndex);
        if (last)
        {
            while (last.next)
                last = last.next;
            last.next = entry;
        } else
            this.tracks[trackIndex] = entry;

        if (delay <= 0)
        {
            if (last)
                delay += last.endTime - this.data.getMix(last.animation, animation);
            else
                delay = 0;
        }
        entry.delay = delay;

        return entry;
    },
    /** May be null. */
    getCurrent: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return null;
        return this.tracks[trackIndex];
    }
};
module.exports = spine.AnimationState;


},{"../SpineUtil":42,"./TrackEntry":39}],4:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AnimationStateData = function (skeletonData)
{
    this.skeletonData = skeletonData;
    this.animationToMixTime = {};
};
spine.AnimationStateData.prototype = {
    defaultMix: 0,
    setMixByName: function (fromName, toName, duration)
    {
        var from = this.skeletonData.findAnimation(fromName);
        if (!from) throw "Animation not found: " + fromName;
        var to = this.skeletonData.findAnimation(toName);
        if (!to) throw "Animation not found: " + toName;
        this.setMix(from, to, duration);
    },
    setMix: function (from, to, duration)
    {
        this.animationToMixTime[from.name + ":" + to.name] = duration;
    },
    getMix: function (from, to)
    {
        var key = from.name + ":" + to.name;
        return this.animationToMixTime.hasOwnProperty(key) ? this.animationToMixTime[key] : this.defaultMix;
    }
};
module.exports = spine.AnimationStateData;


},{"../SpineUtil":42}],5:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasReader = require('./AtlasReader');
spine.AtlasPage = require('./AtlasPage');
spine.AtlasRegion = require('./AtlasRegion');
var PIXI = require('pixi.js');
spine.Atlas = function (atlasText, baseUrl, crossOrigin)
{
    if (baseUrl && baseUrl.indexOf('/') !== baseUrl.length)
    {
        baseUrl += '/';
    }

    this.pages = [];
    this.regions = [];

    this.texturesLoading = 0;

    var self = this;

    var reader = new spine.AtlasReader(atlasText);
    var tuple = [];
    tuple.length = 4;
    var page = null;
    while (true)
    {
        var line = reader.readLine();
        if (line === null) break;
        line = reader.trim(line);
        if (!line.length)
            page = null;
        else if (!page)
        {
            page = new spine.AtlasPage();
            page.name = line;

            if (reader.readTuple(tuple) == 2)
            { // size is only optional for an atlas packed with an old TexturePacker.
                page.width = parseInt(tuple[0]);
                page.height = parseInt(tuple[1]);
                reader.readTuple(tuple);
            }
            page.format = spine.Atlas.Format[tuple[0]];

            reader.readTuple(tuple);
            page.minFilter = spine.Atlas.TextureFilter[tuple[0]];
            page.magFilter = spine.Atlas.TextureFilter[tuple[1]];

            var direction = reader.readValue();
            page.uWrap = spine.Atlas.TextureWrap.clampToEdge;
            page.vWrap = spine.Atlas.TextureWrap.clampToEdge;
            if (direction == "x")
                page.uWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "y")
                page.vWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "xy")
                page.uWrap = page.vWrap = spine.Atlas.TextureWrap.repeat;

            page.rendererObject = PIXI.BaseTexture.fromImage(baseUrl + line, crossOrigin);

            this.pages.push(page);

        } else {
            var region = new spine.AtlasRegion();
            region.name = line;
            region.page = page;

            region.rotate = reader.readValue() == "true";

            reader.readTuple(tuple);
            var x = parseInt(tuple[0]);
            var y = parseInt(tuple[1]);

            reader.readTuple(tuple);
            var width = parseInt(tuple[0]);
            var height = parseInt(tuple[1]);

            region.u = x / page.width;
            region.v = y / page.height;
            if (region.rotate)
            {
                region.u2 = (x + height) / page.width;
                region.v2 = (y + width) / page.height;
            } else {
                region.u2 = (x + width) / page.width;
                region.v2 = (y + height) / page.height;
            }
            region.x = x;
            region.y = y;
            region.width = Math.abs(width);
            region.height = Math.abs(height);

            if (reader.readTuple(tuple) == 4)
            { // split is optional
                region.splits = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                if (reader.readTuple(tuple) == 4)
                { // pad is optional, but only present with splits
                    region.pads = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                    reader.readTuple(tuple);
                }
            }

            region.originalWidth = parseInt(tuple[0]);
            region.originalHeight = parseInt(tuple[1]);

            reader.readTuple(tuple);
            region.offsetX = parseInt(tuple[0]);
            region.offsetY = parseInt(tuple[1]);

            region.index = parseInt(reader.readValue());

            this.regions.push(region);
        }
    }
};
spine.Atlas.prototype = {
    findRegion: function (name)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
            if (regions[i].name == name) return regions[i];
        return null;
    },
    dispose: function ()
    {
        var pages = this.pages;
        for (var i = 0, n = pages.length; i < n; i++)
            pages[i].rendererObject.destroy(true);
    },
    updateUVs: function (page)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
        {
            var region = regions[i];
            if (region.page != page) continue;
            region.u = region.x / page.width;
            region.v = region.y / page.height;
            if (region.rotate)
            {
                region.u2 = (region.x + region.height) / page.width;
                region.v2 = (region.y + region.width) / page.height;
            } else {
                region.u2 = (region.x + region.width) / page.width;
                region.v2 = (region.y + region.height) / page.height;
            }
        }
    }
};

spine.Atlas.Format = {
    alpha: 0,
    intensity: 1,
    luminanceAlpha: 2,
    rgb565: 3,
    rgba4444: 4,
    rgb888: 5,
    rgba8888: 6
};

spine.Atlas.TextureFilter = {
    nearest: 0,
    linear: 1,
    mipMap: 2,
    mipMapNearestNearest: 3,
    mipMapLinearNearest: 4,
    mipMapNearestLinear: 5,
    mipMapLinearLinear: 6
};

spine.Atlas.TextureWrap = {
    mirroredRepeat: 0,
    clampToEdge: 1,
    repeat: 2
};
module.exports = spine.Atlas;


},{"../SpineUtil":42,"./AtlasPage":7,"./AtlasReader":8,"./AtlasRegion":9,"pixi.js":"pixi.js"}],6:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.RegionAttachment = require('./RegionAttachment');
spine.MeshAttachment = require('./MeshAttachment');
spine.SkinnedMeshAttachment = require('./SkinnedMeshAttachment');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment');
spine.AtlasAttachmentParser = function (atlas)
{
    this.atlas = atlas;
};
spine.AtlasAttachmentParser.prototype = {
    newRegionAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (region attachment: " + name + ")";
        var attachment = new spine.RegionAttachment(name);
        attachment.rendererObject = region;
        attachment.setUVs(region.u, region.v, region.u2, region.v2, region.rotate);
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (mesh attachment: " + name + ")";
        var attachment = new spine.MeshAttachment(name);
        attachment.rendererObject = region;
        attachment.regionU = region.u;
        attachment.regionV = region.v;
        attachment.regionU2 = region.u2;
        attachment.regionV2 = region.v2;
        attachment.regionRotate = region.rotate;
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newSkinnedMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (skinned mesh attachment: " + name + ")";
        var attachment = new spine.SkinnedMeshAttachment(name);
        attachment.rendererObject = region;
        attachment.regionU = region.u;
        attachment.regionV = region.v;
        attachment.regionU2 = region.u2;
        attachment.regionV2 = region.v2;
        attachment.regionRotate = region.rotate;
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newBoundingBoxAttachment: function (skin, name)
    {
        return new spine.BoundingBoxAttachment(name);
    }
};
module.exports = spine.AtlasAttachmentParser;


},{"../SpineUtil":42,"./BoundingBoxAttachment":14,"./MeshAttachment":27,"./RegionAttachment":28,"./SkinnedMeshAttachment":36}],7:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasPage = function ()
{};
spine.AtlasPage.prototype = {
    name: null,
    format: null,
    minFilter: null,
    magFilter: null,
    uWrap: null,
    vWrap: null,
    rendererObject: null,
    width: 0,
    height: 0
};
module.exports = spine.AtlasPage;


},{"../SpineUtil":42}],8:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasReader = function (text)
{
    this.lines = text.split(/\r\n|\r|\n/);
};
spine.AtlasReader.prototype = {
    index: 0,
    trim: function (value)
    {
        return value.replace(/^\s+|\s+$/g, "");
    },
    readLine: function ()
    {
        if (this.index >= this.lines.length) return null;
        return this.lines[this.index++];
    },
    readValue: function ()
    {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        return this.trim(line.substring(colon + 1));
    },
    /** Returns the number of tuple values read (1, 2 or 4). */
    readTuple: function (tuple)
    {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        var i = 0, lastMatch = colon + 1;
        for (; i < 3; i++)
        {
            var comma = line.indexOf(",", lastMatch);
            if (comma == -1) break;
            tuple[i] = this.trim(line.substr(lastMatch, comma - lastMatch));
            lastMatch = comma + 1;
        }
        tuple[i] = this.trim(line.substring(lastMatch));
        return i + 1;
    }
};
module.exports = spine.AtlasReader;


},{"../SpineUtil":42}],9:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasRegion = function ()
{};
spine.AtlasRegion.prototype = {
    page: null,
    name: null,
    x: 0, y: 0,
    width: 0, height: 0,
    u: 0, v: 0, u2: 0, v2: 0,
    offsetX: 0, offsetY: 0,
    originalWidth: 0, originalHeight: 0,
    index: 0,
    rotate: false,
    splits: null,
    pads: null
};
module.exports = spine.AtlasRegion;


},{"../SpineUtil":42}],10:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Curves = require('./Curves');
spine.Animation = require('./Animation');
spine.AttachmentTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.attachmentNames = [];
    this.attachmentNames.length = frameCount;
};
spine.AttachmentTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, attachmentName)
    {
        this.frames[frameIndex] = time;
        this.attachmentNames[frameIndex] = attachmentName;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;

        var frameIndex = time >= frames[frames.length - 1] ? frames.length - 1 : spine.Animation.binarySearch1(frames, time) - 1;
        if (frames[frameIndex] < lastTime) return;

        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex].setAttachment(
            !attachmentName ? null : skeleton.getAttachmentBySlotIndex(this.slotIndex, attachmentName));
    }
};
module.exports = spine.AttachmentTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],11:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = {
    region: 0,
    boundingbox: 1,
    mesh: 2,
    skinnedmesh: 3
};
module.exports = spine.AttachmentType;


},{"../SpineUtil":42}],12:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Bone = function (boneData, skeleton, parent)
{
    this.data = boneData;
    this.skeleton = skeleton;
    this.parent = parent;
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0, rotationIK: 0,
    scaleX: 1, scaleY: 1,
    flipX: false, flipY: false,
    m00: 0, m01: 0, worldX: 0, // a b x
    m10: 0, m11: 0, worldY: 0, // c d y
    worldRotation: 0,
    worldScaleX: 1, worldScaleY: 1,
    worldFlipX: false, worldFlipY: false,
    updateWorldTransform: function ()
    {
        var parent = this.parent;
        if (parent)
        {
            this.worldX = this.x * parent.m00 + this.y * parent.m01 + parent.worldX;
            this.worldY = this.x * parent.m10 + this.y * parent.m11 + parent.worldY;
            if (this.data.inheritScale)
            {
                this.worldScaleX = parent.worldScaleX * this.scaleX;
                this.worldScaleY = parent.worldScaleY * this.scaleY;
            } else {
                this.worldScaleX = this.scaleX;
                this.worldScaleY = this.scaleY;
            }
            this.worldRotation = this.data.inheritRotation ? (parent.worldRotation + this.rotationIK) : this.rotationIK;
            this.worldFlipX = parent.worldFlipX != this.flipX;
            this.worldFlipY = parent.worldFlipY != this.flipY;
        } else {
            var skeletonFlipX = this.skeleton.flipX, skeletonFlipY = this.skeleton.flipY;
            this.worldX = skeletonFlipX ? -this.x : this.x;
            this.worldY = (skeletonFlipY != spine.Bone.yDown) ? -this.y : this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotationIK;
            this.worldFlipX = skeletonFlipX != this.flipX;
            this.worldFlipY = skeletonFlipY != this.flipY;
        }
        var radians = this.worldRotation * spine.degRad;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        if (this.worldFlipX)
        {
            this.m00 = -cos * this.worldScaleX;
            this.m01 = sin * this.worldScaleY;
        } else {
            this.m00 = cos * this.worldScaleX;
            this.m01 = -sin * this.worldScaleY;
        }
        if (this.worldFlipY != spine.Bone.yDown)
        {
            this.m10 = -sin * this.worldScaleX;
            this.m11 = -cos * this.worldScaleY;
        } else {
            this.m10 = sin * this.worldScaleX;
            this.m11 = cos * this.worldScaleY;
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
        var dx = world[0] - this.worldX, dy = world[1] - this.worldY;
        var m00 = this.m00, m10 = this.m10, m01 = this.m01, m11 = this.m11;
        if (this.worldFlipX != (this.worldFlipY != spine.Bone.yDown))
        {
            m00 = -m00;
            m11 = -m11;
        }
        var invDet = 1 / (m00 * m11 - m01 * m10);
        world[0] = dx * m00 * invDet - dy * m01 * invDet;
        world[1] = dy * m11 * invDet - dx * m10 * invDet;
    },
    localToWorld: function (local)
    {
        var localX = local[0], localY = local[1];
        local[0] = localX * this.m00 + localY * this.m01 + this.worldX;
        local[1] = localX * this.m10 + localY * this.m11 + this.worldY;
    }
};
module.exports = spine.Bone;


},{"../SpineUtil":42}],13:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.BoneData = function (name, parent)
{
    this.name = name;
    this.parent = parent;
};
spine.BoneData.prototype = {
    length: 0,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    inheritScale: true,
    inheritRotation: true,
    flipX: false, flipY: false
};
module.exports = spine.BoneData;


},{"../SpineUtil":42}],14:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = require('./AttachmentType');
spine.BoundingBoxAttachment = function (name)
{
    this.name = name;
    this.vertices = [];
};
spine.BoundingBoxAttachment.prototype = {
    type: spine.AttachmentType.boundingbox,
    computeWorldVertices: function (x, y, bone, worldVertices)
    {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var vertices = this.vertices;
        for (var i = 0, n = vertices.length; i < n; i += 2)
        {
            var px = vertices[i];
            var py = vertices[i + 1];
            worldVertices[i] = px * m00 + py * m01 + x;
            worldVertices[i + 1] = px * m10 + py * m11 + y;
        }
    }
};
module.exports = spine.BoundingBoxAttachment;


},{"../SpineUtil":42,"./AttachmentType":11}],15:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.ColorTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, r, g, b, a, ...
    this.frames.length = frameCount * 5;
};
spine.ColorTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 5;
    },
    setFrame: function (frameIndex, time, r, g, b, a)
    {
        frameIndex *= 5;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = r;
        this.frames[frameIndex + 2] = g;
        this.frames[frameIndex + 3] = b;
        this.frames[frameIndex + 4] = a;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var r, g, b, a;
        if (time >= frames[frames.length - 5])
        {
            // Time is after last frame.
            var i = frames.length - 1;
            r = frames[i - 3];
            g = frames[i - 2];
            b = frames[i - 1];
            a = frames[i];
        } else {
            // Interpolate between the previous frame and the current frame.
            var frameIndex = spine.Animation.binarySearch(frames, time, 5);
            var prevFrameR = frames[frameIndex - 4];
            var prevFrameG = frames[frameIndex - 3];
            var prevFrameB = frames[frameIndex - 2];
            var prevFrameA = frames[frameIndex - 1];
            var frameTime = frames[frameIndex];
            var percent = 1 - (time - frameTime) / (frames[frameIndex - 5/*PREV_FRAME_TIME*/] - frameTime);
            percent = this.curves.getCurvePercent(frameIndex / 5 - 1, percent);

            r = prevFrameR + (frames[frameIndex + 1/*FRAME_R*/] - prevFrameR) * percent;
            g = prevFrameG + (frames[frameIndex + 2/*FRAME_G*/] - prevFrameG) * percent;
            b = prevFrameB + (frames[frameIndex + 3/*FRAME_B*/] - prevFrameB) * percent;
            a = prevFrameA + (frames[frameIndex + 4/*FRAME_A*/] - prevFrameA) * percent;
        }
        var slot = skeleton.slots[this.slotIndex];
        if (alpha < 1)
        {
            slot.r += (r - slot.r) * alpha;
            slot.g += (g - slot.g) * alpha;
            slot.b += (b - slot.b) * alpha;
            slot.a += (a - slot.a) * alpha;
        } else {
            slot.r = r;
            slot.g = g;
            slot.b = b;
            slot.a = a;
        }
    }
};
module.exports = spine.ColorTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],16:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Curves = function (frameCount)
{
    this.curves = []; // type, x, y, ...
    //this.curves.length = (frameCount - 1) * 19/*BEZIER_SIZE*/;
};
spine.Curves.prototype = {
    setLinear: function (frameIndex)
    {
        this.curves[frameIndex * 19/*BEZIER_SIZE*/] = 0/*LINEAR*/;
    },
    setStepped: function (frameIndex)
    {
        this.curves[frameIndex * 19/*BEZIER_SIZE*/] = 1/*STEPPED*/;
    },
    /** Sets the control handle positions for an interpolation bezier curve used to transition from this keyframe to the next.
     * cx1 and cx2 are from 0 to 1, representing the percent of time between the two keyframes. cy1 and cy2 are the percent of
     * the difference between the keyframe's values. */
    setCurve: function (frameIndex, cx1, cy1, cx2, cy2)
    {
        var subdiv1 = 1 / 10/*BEZIER_SEGMENTS*/, subdiv2 = subdiv1 * subdiv1, subdiv3 = subdiv2 * subdiv1;
        var pre1 = 3 * subdiv1, pre2 = 3 * subdiv2, pre4 = 6 * subdiv2, pre5 = 6 * subdiv3;
        var tmp1x = -cx1 * 2 + cx2, tmp1y = -cy1 * 2 + cy2, tmp2x = (cx1 - cx2) * 3 + 1, tmp2y = (cy1 - cy2) * 3 + 1;
        var dfx = cx1 * pre1 + tmp1x * pre2 + tmp2x * subdiv3, dfy = cy1 * pre1 + tmp1y * pre2 + tmp2y * subdiv3;
        var ddfx = tmp1x * pre4 + tmp2x * pre5, ddfy = tmp1y * pre4 + tmp2y * pre5;
        var dddfx = tmp2x * pre5, dddfy = tmp2y * pre5;

        var i = frameIndex * 19/*BEZIER_SIZE*/;
        var curves = this.curves;
        curves[i++] = 2/*BEZIER*/;

        var x = dfx, y = dfy;
        for (var n = i + 19/*BEZIER_SIZE*/ - 1; i < n; i += 2)
        {
            curves[i] = x;
            curves[i + 1] = y;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }
    },
    getCurvePercent: function (frameIndex, percent)
    {
        percent = percent < 0 ? 0 : (percent > 1 ? 1 : percent);
        var curves = this.curves;
        var i = frameIndex * 19/*BEZIER_SIZE*/;
        var type = curves[i];
        if (type === 0/*LINEAR*/) return percent;
        if (type == 1/*STEPPED*/) return 0;
        i++;
        var x = 0;
        for (var start = i, n = i + 19/*BEZIER_SIZE*/ - 1; i < n; i += 2)
        {
            x = curves[i];
            if (x >= percent)
            {
                var prevX, prevY;
                if (i == start)
                {
                    prevX = 0;
                    prevY = 0;
                } else {
                    prevX = curves[i - 2];
                    prevY = curves[i - 1];
                }
                return prevY + (curves[i + 1] - prevY) * (percent - prevX) / (x - prevX);
            }
        }
        var y = curves[i - 1];
        return y + (1 - y) * (percent - x) / (1 - x); // Last point is 1,1.
    }
};
module.exports = spine.Curves;


},{"../SpineUtil":42}],17:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.DrawOrderTimeline = function (frameCount)
{
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.drawOrders = [];
    this.drawOrders.length = frameCount;
};
spine.DrawOrderTimeline.prototype = {
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, drawOrder)
    {
        this.frames[frameIndex] = time;
        this.drawOrders[frameIndex] = drawOrder;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (time >= frames[frames.length - 1]) // Time is after last frame.
            frameIndex = frames.length - 1;
        else
            frameIndex = spine.Animation.binarySearch1(frames, time) - 1;

        var drawOrder = skeleton.drawOrder;
        var slots = skeleton.slots;
        var drawOrderToSetupIndex = this.drawOrders[frameIndex];
        if (drawOrderToSetupIndex)
        {
            for (var i = 0, n = drawOrderToSetupIndex.length; i < n; i++)
            {
                drawOrder[i] = drawOrderToSetupIndex[i];
            }
        }

    }
};
module.exports = spine.DrawOrderTimeline;


},{"../SpineUtil":42,"./Animation":2}],18:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Event = function (data)
{
    this.data = data;
};
spine.Event.prototype = {
    intValue: 0,
    floatValue: 0,
    stringValue: null
};
module.exports = spine.Event;


},{"../SpineUtil":42}],19:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.EventData = function (name)
{
    this.name = name;
};
spine.EventData.prototype = {
    intValue: 0,
    floatValue: 0,
    stringValue: null
};
module.exports = spine.EventData;


},{"../SpineUtil":42}],20:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.EventTimeline = function (frameCount)
{
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.events = [];
    this.events.length = frameCount;
};
spine.EventTimeline.prototype = {
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, event)
    {
        this.frames[frameIndex] = time;
        this.events[frameIndex] = event;
    },
    /** Fires events for frames > lastTime and <= time. */
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        if (!firedEvents) return;

        var frames = this.frames;
        var frameCount = frames.length;

        if (lastTime > time)
        { // Fire events after last time for looped animations.
            this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha);
            lastTime = -1;
        } else if (lastTime >= frames[frameCount - 1]) // Last time is after last frame.
            return;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (lastTime < frames[0])
            frameIndex = 0;
        else
        {
            frameIndex = spine.Animation.binarySearch1(frames, lastTime);
            var frame = frames[frameIndex];
            while (frameIndex > 0)
            { // Fire multiple events with the same frame.
                if (frames[frameIndex - 1] != frame) break;
                frameIndex--;
            }
        }
        var events = this.events;
        for (; frameIndex < frameCount && time >= frames[frameIndex]; frameIndex++)
            firedEvents.push(events[frameIndex]);
    }
};
module.exports = spine.EventTimeline;


},{"../SpineUtil":42,"./Animation":2}],21:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FfdTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = [];
    this.frames.length = frameCount;
    this.frameVertices = [];
    this.frameVertices.length = frameCount;
};
spine.FfdTimeline.prototype = {
    slotIndex: 0,
    attachment: 0,
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, vertices)
    {
        this.frames[frameIndex] = time;
        this.frameVertices[frameIndex] = vertices;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var slot = skeleton.slots[this.slotIndex];
        if (slot.attachment != this.attachment) return;

        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameVertices = this.frameVertices;
        var vertexCount = frameVertices[0].length;

        var vertices = slot.attachmentVertices;
        if (vertices.length != vertexCount) alpha = 1;
        vertices.length = vertexCount;

        if (time >= frames[frames.length - 1])
        { // Time is after last frame.
            var lastVertices = frameVertices[frames.length - 1];
            if (alpha < 1)
            {
                for (var i = 0; i < vertexCount; i++)
                    vertices[i] += (lastVertices[i] - vertices[i]) * alpha;
            } else {
                for (var i = 0; i < vertexCount; i++)
                    vertices[i] = lastVertices[i];
            }
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch1(frames, time);
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 1] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex - 1, percent < 0 ? 0 : (percent > 1 ? 1 : percent));

        var prevVertices = frameVertices[frameIndex - 1];
        var nextVertices = frameVertices[frameIndex];

        if (alpha < 1)
        {
            for (var i = 0; i < vertexCount; i++)
            {
                var prev = prevVertices[i];
                vertices[i] += (prev + (nextVertices[i] - prev) * percent - vertices[i]) * alpha;
            }
        } else {
            for (var i = 0; i < vertexCount; i++)
            {
                var prev = prevVertices[i];
                vertices[i] = prev + (nextVertices[i] - prev) * percent;
            }
        }
    }
};
module.exports = spine.FfdTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],22:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FlipXTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, flip, ...
    this.frames.length = frameCount * 2;
};
spine.FlipXTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, flip)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = flip ? 1 : 0;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;
        var frameIndex = (time >= frames[frames.length - 2] ? frames.length : spine.Animation.binarySearch(frames, time, 2)) - 2;
        if (frames[frameIndex] < lastTime) return;
        skeleton.bones[this.boneIndex].flipX = frames[frameIndex + 1] != 0;
    }
};
module.exports = spine.FlipXTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],23:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FlipYTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, flip, ...
    this.frames.length = frameCount * 2;
};
spine.FlipYTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, flip)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = flip ? 1 : 0;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;
        var frameIndex = (time >= frames[frames.length - 2] ? frames.length : spine.Animation.binarySearch(frames, time, 2)) - 2;
        if (frames[frameIndex] < lastTime) return;
        skeleton.bones[this.boneIndex].flipY = frames[frameIndex + 1] != 0;
    }
};
module.exports = spine.FlipYTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],24:[function(require,module,exports){
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
    var parentRotation = (!bone.data.inheritRotation || !bone.parent) ? 0 : bone.parent.worldRotation;
    var rotation = bone.rotation;
    var rotationIK = Math.atan2(targetY - bone.worldY, targetX - bone.worldX) * spine.radDeg - parentRotation;
    bone.rotationIK = rotation + (rotationIK - rotation) * alpha;
};
/** Adjusts the parent and child bone rotations so the tip of the child is as close to the target position as possible. The
 * target is specified in the world coordinate system.
 * @param child Any descendant bone of the parent. */
spine.IkConstraint.apply2 = function (parent, child, targetX, targetY, bendDirection, alpha)
{
    var childRotation = child.rotation, parentRotation = parent.rotation;
    if (!alpha)
    {
        child.rotationIK = childRotation;
        parent.rotationIK = parentRotation;
        return;
    }
    var positionX, positionY, tempPosition = spine.temp;
    var parentParent = parent.parent;
    if (parentParent)
    {
        tempPosition[0] = targetX;
        tempPosition[1] = targetY;
        parentParent.worldToLocal(tempPosition);
        targetX = (tempPosition[0] - parent.x) * parentParent.worldScaleX;
        targetY = (tempPosition[1] - parent.y) * parentParent.worldScaleY;
    } else {
        targetX -= parent.x;
        targetY -= parent.y;
    }
    if (child.parent == parent)
    {
        positionX = child.x;
        positionY = child.y;
    } else {
        tempPosition[0] = child.x;
        tempPosition[1] = child.y;
        child.parent.localToWorld(tempPosition);
        parent.worldToLocal(tempPosition);
        positionX = tempPosition[0];
        positionY = tempPosition[1];
    }
    var childX = positionX * parent.worldScaleX, childY = positionY * parent.worldScaleY;
    var offset = Math.atan2(childY, childX);
    var len1 = Math.sqrt(childX * childX + childY * childY), len2 = child.data.length * child.worldScaleX;
    // Based on code by Ryan Juckett with permission: Copyright (c) 2008-2009 Ryan Juckett, http://www.ryanjuckett.com/
    var cosDenom = 2 * len1 * len2;
    if (cosDenom < 0.0001)
    {
        child.rotationIK = childRotation + (Math.atan2(targetY, targetX) * spine.radDeg - parentRotation - childRotation) * alpha;
        return;
    }
    var cos = (targetX * targetX + targetY * targetY - len1 * len1 - len2 * len2) / cosDenom;
    if (cos < -1)
        cos = -1;
    else if (cos > 1)
        cos = 1;
    var childAngle = Math.acos(cos) * bendDirection;
    var adjacent = len1 + len2 * cos, opposite = len2 * Math.sin(childAngle);
    var parentAngle = Math.atan2(targetY * adjacent - targetX * opposite, targetX * adjacent + targetY * opposite);
    var rotation = (parentAngle - offset) * spine.radDeg - parentRotation;
    if (rotation > 180)
        rotation -= 360;
    else if (rotation < -180) //
        rotation += 360;
    parent.rotationIK = parentRotation + rotation * alpha;
    rotation = (childAngle + offset) * spine.radDeg - childRotation;
    if (rotation > 180)
        rotation -= 360;
    else if (rotation < -180) //
        rotation += 360;
    child.rotationIK = childRotation + (rotation + parent.worldRotation - child.parent.worldRotation) * alpha;
};
module.exports = spine.IkConstraint;


},{"../SpineUtil":42}],25:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.IkConstraintData = function (name)
{
    this.name = name;
    this.bones = [];
};
spine.IkConstraintData.prototype = {
    target: null,
    bendDirection: 1,
    mix: 1
};
module.exports = spine.IkConstraintData;


},{"../SpineUtil":42}],26:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.IkConstraintTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, mix, bendDirection, ...
    this.frames.length = frameCount * 3;
};
spine.IkConstraintTimeline.prototype = {
    ikConstraintIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, mix, bendDirection)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = mix;
        this.frames[frameIndex + 2] = bendDirection;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var ikConstraint = skeleton.ikConstraints[this.ikConstraintIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            ikConstraint.mix += (frames[frames.length - 2] - ikConstraint.mix) * alpha;
            ikConstraint.bendDirection = frames[frames.length - 1];
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameMix = frames[frameIndex + -2/*PREV_FRAME_MIX*/];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        var mix = prevFrameMix + (frames[frameIndex + 1/*FRAME_MIX*/] - prevFrameMix) * percent;
        ikConstraint.mix += (mix - ikConstraint.mix) * alpha;
        ikConstraint.bendDirection = frames[frameIndex + -1/*PREV_FRAME_BEND_DIRECTION*/];
    }
};
module.exports = spine.IkConstraintTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],27:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.MeshAttachment = function (name)
{
    this.name = name;
};
spine.MeshAttachment.prototype = {
    type: spine.AttachmentType.mesh,
    vertices: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionU: 0, regionV: 0, regionU2: 0, regionV2: 0, regionRotate: false,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    edges: null,
    width: 0, height: 0,
    updateUVs: function ()
    {
        var width = this.regionU2 - this.regionU, height = this.regionV2 - this.regionV;
        var n = this.regionUVs.length;
        if (!this.uvs || this.uvs.length != n)
        {
            this.uvs = new spine.Float32Array(n);
        }
        if (this.regionRotate)
        {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i + 1] * width;
                this.uvs[i + 1] = this.regionV + height - this.regionUVs[i] * height;
            }
        } else {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i] * width;
                this.uvs[i + 1] = this.regionV + this.regionUVs[i + 1] * height;
            }
        }
    },
    computeWorldVertices: function (x, y, slot, worldVertices)
    {
        var bone = slot.bone;
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var vertices = this.vertices;
        var verticesCount = vertices.length;
        if (slot.attachmentVertices.length == verticesCount) vertices = slot.attachmentVertices;
        for (var i = 0; i < verticesCount; i += 2)
        {
            var vx = vertices[i];
            var vy = vertices[i + 1];
            worldVertices[i] = vx * m00 + vy * m01 + x;
            worldVertices[i + 1] = vx * m10 + vy * m11 + y;
        }
    }
};
module.exports = spine.MeshAttachment;


},{"../SpineUtil":42,"./AttachmentType":11}],28:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = require('./AttachmentType');
spine.RegionAttachment = function (name)
{
    this.name = name;
    this.offset = [];
    this.offset.length = 8;
    this.uvs = [];
    this.uvs.length = 8;
};
spine.RegionAttachment.prototype = {
    type: spine.AttachmentType.region,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    width: 0, height: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    setUVs: function (u, v, u2, v2, rotate)
    {
        var uvs = this.uvs;
        if (rotate)
        {
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v2;
            uvs[4/*X3*/] = u;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v;
            uvs[0/*X1*/] = u2;
            uvs[1/*Y1*/] = v2;
        } else {
            uvs[0/*X1*/] = u;
            uvs[1/*Y1*/] = v2;
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v;
            uvs[4/*X3*/] = u2;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v2;
        }
    },
    updateOffset: function ()
    {
        var regionScaleX = this.width / this.regionOriginalWidth * this.scaleX;
        var regionScaleY = this.height / this.regionOriginalHeight * this.scaleY;
        var localX = -this.width / 2 * this.scaleX + this.regionOffsetX * regionScaleX;
        var localY = -this.height / 2 * this.scaleY + this.regionOffsetY * regionScaleY;
        var localX2 = localX + this.regionWidth * regionScaleX;
        var localY2 = localY + this.regionHeight * regionScaleY;
        var radians = this.rotation * spine.degRad;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var localXCos = localX * cos + this.x;
        var localXSin = localX * sin;
        var localYCos = localY * cos + this.y;
        var localYSin = localY * sin;
        var localX2Cos = localX2 * cos + this.x;
        var localX2Sin = localX2 * sin;
        var localY2Cos = localY2 * cos + this.y;
        var localY2Sin = localY2 * sin;
        var offset = this.offset;
        offset[0/*X1*/] = localXCos - localYSin;
        offset[1/*Y1*/] = localYCos + localXSin;
        offset[2/*X2*/] = localXCos - localY2Sin;
        offset[3/*Y2*/] = localY2Cos + localXSin;
        offset[4/*X3*/] = localX2Cos - localY2Sin;
        offset[5/*Y3*/] = localY2Cos + localX2Sin;
        offset[6/*X4*/] = localX2Cos - localYSin;
        offset[7/*Y4*/] = localYCos + localX2Sin;
    },
    computeVertices: function (x, y, bone, vertices)
    {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var offset = this.offset;
        vertices[0/*X1*/] = offset[0/*X1*/] * m00 + offset[1/*Y1*/] * m01 + x;
        vertices[1/*Y1*/] = offset[0/*X1*/] * m10 + offset[1/*Y1*/] * m11 + y;
        vertices[2/*X2*/] = offset[2/*X2*/] * m00 + offset[3/*Y2*/] * m01 + x;
        vertices[3/*Y2*/] = offset[2/*X2*/] * m10 + offset[3/*Y2*/] * m11 + y;
        vertices[4/*X3*/] = offset[4/*X3*/] * m00 + offset[5/*X3*/] * m01 + x;
        vertices[5/*X3*/] = offset[4/*X3*/] * m10 + offset[5/*X3*/] * m11 + y;
        vertices[6/*X4*/] = offset[6/*X4*/] * m00 + offset[7/*Y4*/] * m01 + x;
        vertices[7/*Y4*/] = offset[6/*X4*/] * m10 + offset[7/*Y4*/] * m11 + y;
    }
};
module.exports = spine.RegionAttachment;


},{"../SpineUtil":42,"./AttachmentType":11}],29:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.RotateTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, angle, ...
    this.frames.length = frameCount * 2;
};
spine.RotateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, angle)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = angle;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 2])
        { // Time is after last frame.
            var amount = bone.data.rotation + frames[frames.length - 1] - bone.rotation;
            while (amount > 180)
                amount -= 360;
            while (amount < -180)
                amount += 360;
            bone.rotation += amount * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 2);
        var prevFrameValue = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 2/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 2 - 1, percent);

        var amount = frames[frameIndex + 1/*FRAME_VALUE*/] - prevFrameValue;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        amount = bone.data.rotation + (prevFrameValue + amount * percent) - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
    }
};
module.exports = spine.RotateTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],30:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.ScaleTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.ScaleTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            bone.scaleX += (bone.data.scaleX * frames[frames.length - 2] - bone.scaleX) * alpha;
            bone.scaleY += (bone.data.scaleY * frames[frames.length - 1] - bone.scaleY) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameX = frames[frameIndex - 2];
        var prevFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.scaleX += (bone.data.scaleX * (prevFrameX + (frames[frameIndex + 1/*FRAME_X*/] - prevFrameX) * percent) - bone.scaleX) * alpha;
        bone.scaleY += (bone.data.scaleY * (prevFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - prevFrameY) * percent) - bone.scaleY) * alpha;
    }
};
module.exports = spine.ScaleTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],31:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Bone = require('./Bone');
spine.Slot = require('./Slot');
spine.IkConstraint = require('./IkConstraint');
spine.Skeleton = function (skeletonData)
{
    this.data = skeletonData;

    this.bones = [];
    for (var i = 0, n = skeletonData.bones.length; i < n; i++)
    {
        var boneData = skeletonData.bones[i];
        var parent = !boneData.parent ? null : this.bones[skeletonData.bones.indexOf(boneData.parent)];
        this.bones.push(new spine.Bone(boneData, this, parent));
    }

    this.slots = [];
    this.drawOrder = [];
    for (var i = 0, n = skeletonData.slots.length; i < n; i++)
    {
        var slotData = skeletonData.slots[i];
        var bone = this.bones[skeletonData.bones.indexOf(slotData.boneData)];
        var slot = new spine.Slot(slotData, bone);
        this.slots.push(slot);
        this.drawOrder.push(i);
    }

    this.ikConstraints = [];
    for (var i = 0, n = skeletonData.ikConstraints.length; i < n; i++)
        this.ikConstraints.push(new spine.IkConstraint(skeletonData.ikConstraints[i], this));

    this.boneCache = [];
    this.updateCache();
};
spine.Skeleton.prototype = {
    x: 0, y: 0,
    skin: null,
    r: 1, g: 1, b: 1, a: 1,
    time: 0,
    flipX: false, flipY: false,
    /** Caches information about bones and IK constraints. Must be called if bones or IK constraints are added or removed. */
    updateCache: function ()
    {
        var ikConstraints = this.ikConstraints;
        var ikConstraintsCount = ikConstraints.length;

        var arrayCount = ikConstraintsCount + 1;
        var boneCache = this.boneCache;
        if (boneCache.length > arrayCount) boneCache.length = arrayCount;
        for (var i = 0, n = boneCache.length; i < n; i++)
            boneCache[i].length = 0;
        while (boneCache.length < arrayCount)
            boneCache[boneCache.length] = [];

        var nonIkBones = boneCache[0];
        var bones = this.bones;

        outer:
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var bone = bones[i];
            var current = bone;
            do {
                for (var ii = 0; ii < ikConstraintsCount; ii++)
                {
                    var ikConstraint = ikConstraints[ii];
                    var parent = ikConstraint.bones[0];
                    var child= ikConstraint.bones[ikConstraint.bones.length - 1];
                    while (true)
                    {
                        if (current == child)
                        {
                            boneCache[ii].push(bone);
                            boneCache[ii + 1].push(bone);
                            continue outer;
                        }
                        if (child == parent) break;
                        child = child.parent;
                    }
                }
                current = current.parent;
            } while (current);
            nonIkBones[nonIkBones.length] = bone;
        }
    },
    /** Updates the world transform for each bone. */
    updateWorldTransform: function ()
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var bone = bones[i];
            bone.rotationIK = bone.rotation;
        }
        var i = 0, last = this.boneCache.length - 1;
        while (true)
        {
            var cacheBones = this.boneCache[i];
            for (var ii = 0, nn = cacheBones.length; ii < nn; ii++)
                cacheBones[ii].updateWorldTransform();
            if (i == last) break;
            this.ikConstraints[i].apply();
            i++;
        }
    },
    /** Sets the bones and slots to their setup pose values. */
    setToSetupPose: function ()
    {
        this.setBonesToSetupPose();
        this.setSlotsToSetupPose();
    },
    setBonesToSetupPose: function ()
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].setToSetupPose();

        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
        {
            var ikConstraint = ikConstraints[i];
            ikConstraint.bendDirection = ikConstraint.data.bendDirection;
            ikConstraint.mix = ikConstraint.data.mix;
        }
    },
    setSlotsToSetupPose: function ()
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            slots[i].setToSetupPose(i);
        }

        this.resetDrawOrder();
    },
    /** @return May return null. */
    getRootBone: function ()
    {
        return this.bones.length ? this.bones[0] : null;
    },
    /** @return May be null. */
    findBone: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return slots[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return i;
        return -1;
    },
    setSkinByName: function (skinName)
    {
        var skin = this.data.findSkin(skinName);
        if (!skin) throw "Skin not found: " + skinName;
        this.setSkin(skin);
    },
    /** Sets the skin used to look up attachments before looking in the {@link SkeletonData#getDefaultSkin() default skin}.
     * Attachments from the new skin are attached if the corresponding attachment from the old skin was attached. If there was
     * no old skin, each slot's setup mode attachment is attached from the new skin.
     * @param newSkin May be null. */
    setSkin: function (newSkin)
    {
        if (newSkin)
        {
            if (this.skin)
                newSkin._attachAll(this, this.skin);
            else
            {
                var slots = this.slots;
                for (var i = 0, n = slots.length; i < n; i++)
                {
                    var slot = slots[i];
                    var name = slot.data.attachmentName;
                    if (name)
                    {
                        var attachment = newSkin.getAttachment(i, name);
                        if (attachment) slot.setAttachment(attachment);
                    }
                }
            }
        }
        this.skin = newSkin;
    },
    /** @return May be null. */
    getAttachmentBySlotName: function (slotName, attachmentName)
    {
        return this.getAttachmentBySlotIndex(this.data.findSlotIndex(slotName), attachmentName);
    },
    /** @return May be null. */
    getAttachmentBySlotIndex: function (slotIndex, attachmentName)
    {
        if (this.skin)
        {
            var attachment = this.skin.getAttachment(slotIndex, attachmentName);
            if (attachment) return attachment;
        }
        if (this.data.defaultSkin) return this.data.defaultSkin.getAttachment(slotIndex, attachmentName);
        return null;
    },
    /** @param attachmentName May be null. */
    setAttachment: function (slotName, attachmentName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            var slot = slots[i];
            if (slot.data.name == slotName)
            {
                var attachment = null;
                if (attachmentName)
                {
                    attachment = this.getAttachmentBySlotIndex(i, attachmentName);
                    if (!attachment) throw "Attachment not found: " + attachmentName + ", for slot: " + slotName;
                }
                slot.setAttachment(attachment);
                return;
            }
        }
        throw "Slot not found: " + slotName;
    },
    /** @return May be null. */
    findIkConstraint: function (ikConstraintName)
    {
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
            if (ikConstraints[i].data.name == ikConstraintName) return ikConstraints[i];
        return null;
    },
    update: function (delta)
    {
        this.time += delta;
    },
    resetDrawOrder: function () {
        for (var i = 0, n = this.drawOrder.length; i < n; i++)
        {
            this.drawOrder[i] = i;
        }
    }
};
module.exports = spine.Skeleton;


},{"../SpineUtil":42,"./Bone":12,"./IkConstraint":24,"./Slot":37}],32:[function(require,module,exports){
var spine = require('../SpineRuntime') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkeletonBounds = function ()
{
    this.polygonPool = [];
    this.polygons = [];
    this.boundingBoxes = [];
};
spine.SkeletonBounds.prototype = {
    minX: 0, minY: 0, maxX: 0, maxY: 0,
    update: function (skeleton, updateAabb)
    {
        var slots = skeleton.slots;
        var slotCount = slots.length;
        var x = skeleton.x, y = skeleton.y;
        var boundingBoxes = this.boundingBoxes;
        var polygonPool = this.polygonPool;
        var polygons = this.polygons;

        boundingBoxes.length = 0;
        for (var i = 0, n = polygons.length; i < n; i++)
            polygonPool.push(polygons[i]);
        polygons.length = 0;

        for (var i = 0; i < slotCount; i++)
        {
            var slot = slots[i];
            var boundingBox = slot.attachment;
            if (boundingBox.type != spine.AttachmentType.boundingbox) continue;
            boundingBoxes.push(boundingBox);

            var poolCount = polygonPool.length, polygon;
            if (poolCount > 0)
            {
                polygon = polygonPool[poolCount - 1];
                polygonPool.splice(poolCount - 1, 1);
            } else
                polygon = [];
            polygons.push(polygon);

            polygon.length = boundingBox.vertices.length;
            boundingBox.computeWorldVertices(x, y, slot.bone, polygon);
        }

        if (updateAabb) this.aabbCompute();
    },
    aabbCompute: function ()
    {
        var polygons = this.polygons;
        var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE;
        for (var i = 0, n = polygons.length; i < n; i++)
        {
            var vertices = polygons[i];
            for (var ii = 0, nn = vertices.length; ii < nn; ii += 2)
            {
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
    },
    /** Returns true if the axis aligned bounding box contains the point. */
    aabbContainsPoint: function (x, y)
    {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    },
    /** Returns true if the axis aligned bounding box intersects the line segment. */
    aabbIntersectsSegment: function (x1, y1, x2, y2)
    {
        var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;
        if ((x1 <= minX && x2 <= minX) || (y1 <= minY && y2 <= minY) || (x1 >= maxX && x2 >= maxX) || (y1 >= maxY && y2 >= maxY))
            return false;
        var m = (y2 - y1) / (x2 - x1);
        var y = m * (minX - x1) + y1;
        if (y > minY && y < maxY) return true;
        y = m * (maxX - x1) + y1;
        if (y > minY && y < maxY) return true;
        var x = (minY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        x = (maxY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        return false;
    },
    /** Returns true if the axis aligned bounding box intersects the axis aligned bounding box of the specified bounds. */
    aabbIntersectsSkeleton: function (bounds)
    {
        return this.minX < bounds.maxX && this.maxX > bounds.minX && this.minY < bounds.maxY && this.maxY > bounds.minY;
    },
    /** Returns the first bounding box attachment that contains the point, or null. When doing many checks, it is usually more
     * efficient to only call this method if {@link #aabbContainsPoint(float, float)} returns true. */
    containsPoint: function (x, y)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (this.polygonContainsPoint(polygons[i], x, y)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns the first bounding box attachment that contains the line segment, or null. When doing many checks, it is usually
     * more efficient to only call this method if {@link #aabbIntersectsSegment(float, float, float, float)} returns true. */
    intersectsSegment: function (x1, y1, x2, y2)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (polygons[i].intersectsSegment(x1, y1, x2, y2)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns true if the polygon contains the point. */
    polygonContainsPoint: function (polygon, x, y)
    {
        var nn = polygon.length;
        var prevIndex = nn - 2;
        var inside = false;
        for (var ii = 0; ii < nn; ii += 2)
        {
            var vertexY = polygon[ii + 1];
            var prevY = polygon[prevIndex + 1];
            if ((vertexY < y && prevY >= y) || (prevY < y && vertexY >= y))
            {
                var vertexX = polygon[ii];
                if (vertexX + (y - vertexY) / (prevY - vertexY) * (polygon[prevIndex] - vertexX) < x) inside = !inside;
            }
            prevIndex = ii;
        }
        return inside;
    },
    /** Returns true if the polygon contains the line segment. */
    polygonIntersectsSegment: function (polygon, x1, y1, x2, y2)
    {
        var nn = polygon.length;
        var width12 = x1 - x2, height12 = y1 - y2;
        var det1 = x1 * y2 - y1 * x2;
        var x3 = polygon[nn - 2], y3 = polygon[nn - 1];
        for (var ii = 0; ii < nn; ii += 2)
        {
            var x4 = polygon[ii], y4 = polygon[ii + 1];
            var det2 = x3 * y4 - y3 * x4;
            var width34 = x3 - x4, height34 = y3 - y4;
            var det3 = width12 * height34 - height12 * width34;
            var x = (det1 * width34 - width12 * det2) / det3;
            if (((x >= x3 && x <= x4) || (x >= x4 && x <= x3)) && ((x >= x1 && x <= x2) || (x >= x2 && x <= x1)))
            {
                var y = (det1 * height34 - height12 * det2) / det3;
                if (((y >= y3 && y <= y4) || (y >= y4 && y <= y3)) && ((y >= y1 && y <= y2) || (y >= y2 && y <= y1))) return true;
            }
            x3 = x4;
            y3 = y4;
        }
        return false;
    },
    getPolygon: function (attachment)
    {
        var index = this.boundingBoxes.indexOf(attachment);
        return index == -1 ? null : this.polygons[index];
    },
    getWidth: function ()
    {
        return this.maxX - this.minX;
    },
    getHeight: function ()
    {
        return this.maxY - this.minY;
    }
};
module.exports = spine.SkeletonBounds;


},{"../SpineRuntime":41,"./AttachmentType":11}],33:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SkeletonData = function ()
{
    this.bones = [];
    this.slots = [];
    this.skins = [];
    this.events = [];
    this.animations = [];
    this.ikConstraints = [];
};
spine.SkeletonData.prototype = {
    name: null,
    defaultSkin: null,
    width: 0, height: 0,
    version: null, hash: null,
    /** @return May be null. */
    findBone: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            if (slots[i].name == slotName) return slot[i];
        }
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].name == slotName) return i;
        return -1;
    },
    /** @return May be null. */
    findSkin: function (skinName)
    {
        var skins = this.skins;
        for (var i = 0, n = skins.length; i < n; i++)
            if (skins[i].name == skinName) return skins[i];
        return null;
    },
    /** @return May be null. */
    findEvent: function (eventName)
    {
        var events = this.events;
        for (var i = 0, n = events.length; i < n; i++)
            if (events[i].name == eventName) return events[i];
        return null;
    },
    /** @return May be null. */
    findAnimation: function (animationName)
    {
        var animations = this.animations;
        for (var i = 0, n = animations.length; i < n; i++)
            if (animations[i].name == animationName) return animations[i];
        return null;
    },
    /** @return May be null. */
    findIkConstraint: function (ikConstraintName)
    {
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
            if (ikConstraints[i].name == ikConstraintName) return ikConstraints[i];
        return null;
    }
};
module.exports = spine.SkeletonData;


},{"../SpineUtil":42}],34:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SkeletonData = require('./SkeletonData');
spine.BoneData = require('./BoneData');
spine.IkConstraintData = require('./IkConstraintData');
spine.SlotData = require('./SlotData');
spine.Skin = require('./Skin');
spine.EventData = require('./EventData');
spine.AttachmentType = require('./AttachmentType');
spine.ColorTimeline = require('./ColorTimeline');
spine.AttachmentTimeline = require('./AttachmentTimeline');
spine.RotateTimeline = require('./RotateTimeline');
spine.ScaleTimeline = require('./ScaleTimeline');
spine.TranslateTimeline = require('./TranslateTimeline');
spine.FlipXTimeline = require('./FlipXTimeline');
spine.FlipYTimeline = require('./FlipYTimeline');
spine.IkConstraintTimeline = require('./IkConstraintTimeline');
spine.FfdTimeline = require('./FfdTimeline');
spine.DrawOrderTimeline = require('./DrawOrderTimeline');
spine.EventTimeline = require('./EventTimeline');
spine.Event = require('./Event');
spine.Animation = require('./Animation');
spine.SkeletonJsonParser = function (attachmentLoader)
{
    this.attachmentLoader = attachmentLoader;
};
spine.SkeletonJsonParser.prototype = {
    scale: 1,
    readSkeletonData: function (root, name)
    {
        var skeletonData = new spine.SkeletonData();
        skeletonData.name = name;

        // Skeleton.
        var skeletonMap = root["skeleton"];
        if (skeletonMap)
        {
            skeletonData.hash = skeletonMap["hash"];
            skeletonData.version = skeletonMap["spine"];
            skeletonData.width = skeletonMap["width"] || 0;
            skeletonData.height = skeletonMap["height"] || 0;
        }

        // Bones.
        var bones = root["bones"];
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var boneMap = bones[i];
            var parent = null;
            if (boneMap["parent"])
            {
                parent = skeletonData.findBone(boneMap["parent"]);
                if (!parent) throw "Parent bone not found: " + boneMap["parent"];
            }
            var boneData = new spine.BoneData(boneMap["name"], parent);
            boneData.length = (boneMap["length"] || 0) * this.scale;
            boneData.x = (boneMap["x"] || 0) * this.scale;
            boneData.y = (boneMap["y"] || 0) * this.scale;
            boneData.rotation = (boneMap["rotation"] || 0);
            boneData.scaleX = boneMap.hasOwnProperty("scaleX") ? boneMap["scaleX"] : 1;
            boneData.scaleY = boneMap.hasOwnProperty("scaleY") ? boneMap["scaleY"] : 1;
            boneData.inheritScale = boneMap.hasOwnProperty("inheritScale") ? boneMap["inheritScale"] : true;
            boneData.inheritRotation = boneMap.hasOwnProperty("inheritRotation") ? boneMap["inheritRotation"] : true;
            skeletonData.bones.push(boneData);
        }

        // IK constraints.
        var ik = root["ik"];
        if (ik)
        {
            for (var i = 0, n = ik.length; i < n; i++)
            {
                var ikMap = ik[i];
                var ikConstraintData = new spine.IkConstraintData(ikMap["name"]);

                var bones = ikMap["bones"];
                for (var ii = 0, nn = bones.length; ii < nn; ii++)
                {
                    var bone = skeletonData.findBone(bones[ii]);
                    if (!bone) throw "IK bone not found: " + bones[ii];
                    ikConstraintData.bones.push(bone);
                }

                ikConstraintData.target = skeletonData.findBone(ikMap["target"]);
                if (!ikConstraintData.target) throw "Target bone not found: " + ikMap["target"];

                ikConstraintData.bendDirection = (!ikMap.hasOwnProperty("bendPositive") || ikMap["bendPositive"]) ? 1 : -1;
                ikConstraintData.mix = ikMap.hasOwnProperty("mix") ? ikMap["mix"] : 1;

                skeletonData.ikConstraints.push(ikConstraintData);
            }
        }

        // Slots.
        var slots = root["slots"];
        for (var i = 0, n = slots.length; i < n; i++)
        {
            var slotMap = slots[i];
            var boneData = skeletonData.findBone(slotMap["bone"]);
            if (!boneData) throw "Slot bone not found: " + slotMap["bone"];
            var slotData = new spine.SlotData(slotMap["name"], boneData);

            var color = slotMap["color"];
            if (color)
            {
                slotData.r = this.toColor(color, 0);
                slotData.g = this.toColor(color, 1);
                slotData.b = this.toColor(color, 2);
                slotData.a = this.toColor(color, 3);
            }

            slotData.attachmentName = slotMap["attachment"];
            slotData.additiveBlending = slotMap["additive"] && slotMap["additive"] == "true";

            skeletonData.slots.push(slotData);
        }

        // Skins.
        var skins = root["skins"];
        for (var skinName in skins)
        {
            if (!skins.hasOwnProperty(skinName)) continue;
            var skinMap = skins[skinName];
            var skin = new spine.Skin(skinName);
            for (var slotName in skinMap)
            {
                if (!skinMap.hasOwnProperty(slotName)) continue;
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var slotEntry = skinMap[slotName];
                for (var attachmentName in slotEntry)
                {
                    if (!slotEntry.hasOwnProperty(attachmentName)) continue;
                    var attachment = this.readAttachment(skin, attachmentName, slotEntry[attachmentName]);
                    if (attachment) skin.addAttachment(slotIndex, attachmentName, attachment);
                }
            }
            skeletonData.skins.push(skin);
            if (skin.name == "default") skeletonData.defaultSkin = skin;
        }

        // Events.
        var events = root["events"];
        for (var eventName in events)
        {
            if (!events.hasOwnProperty(eventName)) continue;
            var eventMap = events[eventName];
            var eventData = new spine.EventData(eventName);
            eventData.intValue = eventMap["int"] || 0;
            eventData.floatValue = eventMap["float"] || 0;
            eventData.stringValue = eventMap["string"] || null;
            skeletonData.events.push(eventData);
        }

        // Animations.
        var animations = root["animations"];
        for (var animationName in animations)
        {
            if (!animations.hasOwnProperty(animationName)) continue;
            this.readAnimation(animationName, animations[animationName], skeletonData);
        }

        return skeletonData;
    },
    readAttachment: function (skin, name, map)
    {
        name = map["name"] || name;

        var type = spine.AttachmentType[map["type"] || "region"];
        var path = map["path"] || name;

        var scale = this.scale;
        if (type == spine.AttachmentType.region)
        {
            var region = this.attachmentLoader.newRegionAttachment(skin, name, path);
            if (!region) return null;
            region.path = path;
            region.x = (map["x"] || 0) * scale;
            region.y = (map["y"] || 0) * scale;
            region.scaleX = map.hasOwnProperty("scaleX") ? map["scaleX"] : 1;
            region.scaleY = map.hasOwnProperty("scaleY") ? map["scaleY"] : 1;
            region.rotation = map["rotation"] || 0;
            region.width = (map["width"] || 0) * scale;
            region.height = (map["height"] || 0) * scale;

            var color = map["color"];
            if (color)
            {
                region.r = this.toColor(color, 0);
                region.g = this.toColor(color, 1);
                region.b = this.toColor(color, 2);
                region.a = this.toColor(color, 3);
            }

            region.updateOffset();
            return region;
        } else if (type == spine.AttachmentType.mesh)
        {
            var mesh = this.attachmentLoader.newMeshAttachment(skin, name, path);
            if (!mesh) return null;
            mesh.path = path;
            mesh.vertices = this.getFloatArray(map, "vertices", scale);
            mesh.triangles = this.getIntArray(map, "triangles");
            mesh.regionUVs = this.getFloatArray(map, "uvs", 1);
            mesh.updateUVs();

            color = map["color"];
            if (color)
            {
                mesh.r = this.toColor(color, 0);
                mesh.g = this.toColor(color, 1);
                mesh.b = this.toColor(color, 2);
                mesh.a = this.toColor(color, 3);
            }

            mesh.hullLength = (map["hull"] || 0) * 2;
            if (map["edges"]) mesh.edges = this.getIntArray(map, "edges");
            mesh.width = (map["width"] || 0) * scale;
            mesh.height = (map["height"] || 0) * scale;
            return mesh;
        } else if (type == spine.AttachmentType.skinnedmesh)
        {
            var mesh = this.attachmentLoader.newSkinnedMeshAttachment(skin, name, path);
            if (!mesh) return null;
            mesh.path = path;

            var uvs = this.getFloatArray(map, "uvs", 1);
            var vertices = this.getFloatArray(map, "vertices", 1);
            var weights = [];
            var bones = [];
            for (var i = 0, n = vertices.length; i < n; )
            {
                var boneCount = vertices[i++] | 0;
                bones[bones.length] = boneCount;
                for (var nn = i + boneCount * 4; i < nn; )
                {
                    bones[bones.length] = vertices[i];
                    weights[weights.length] = vertices[i + 1] * scale;
                    weights[weights.length] = vertices[i + 2] * scale;
                    weights[weights.length] = vertices[i + 3];
                    i += 4;
                }
            }
            mesh.bones = bones;
            mesh.weights = weights;
            mesh.triangles = this.getIntArray(map, "triangles");
            mesh.regionUVs = uvs;
            mesh.updateUVs();

            color = map["color"];
            if (color)
            {
                mesh.r = this.toColor(color, 0);
                mesh.g = this.toColor(color, 1);
                mesh.b = this.toColor(color, 2);
                mesh.a = this.toColor(color, 3);
            }

            mesh.hullLength = (map["hull"] || 0) * 2;
            if (map["edges"]) mesh.edges = this.getIntArray(map, "edges");
            mesh.width = (map["width"] || 0) * scale;
            mesh.height = (map["height"] || 0) * scale;
            return mesh;
        } else if (type == spine.AttachmentType.boundingbox)
        {
            var attachment = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
            var vertices = map["vertices"];
            for (var i = 0, n = vertices.length; i < n; i++)
                attachment.vertices.push(vertices[i] * scale);
            return attachment;
        }
        throw "Unknown attachment type: " + type;
    },
    readAnimation: function (name, map, skeletonData)
    {
        var timelines = [];
        var duration = 0;

        var slots = map["slots"];
        for (var slotName in slots)
        {
            if (!slots.hasOwnProperty(slotName)) continue;
            var slotMap = slots[slotName];
            var slotIndex = skeletonData.findSlotIndex(slotName);

            for (var timelineName in slotMap)
            {
                if (!slotMap.hasOwnProperty(timelineName)) continue;
                var values = slotMap[timelineName];
                if (timelineName == "color")
                {
                    var timeline = new spine.ColorTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var color = valueMap["color"];
                        var r = this.toColor(color, 0);
                        var g = this.toColor(color, 1);
                        var b = this.toColor(color, 2);
                        var a = this.toColor(color, 3);
                        timeline.setFrame(frameIndex, valueMap["time"], r, g, b, a);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 5 - 5]);

                } else if (timelineName == "attachment")
                {
                    var timeline = new spine.AttachmentTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex++, valueMap["time"], valueMap["name"]);
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);

                } else
                    throw "Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")";
            }
        }

        var bones = map["bones"];
        for (var boneName in bones)
        {
            if (!bones.hasOwnProperty(boneName)) continue;
            var boneIndex = skeletonData.findBoneIndex(boneName);
            if (boneIndex == -1) throw "Bone not found: " + boneName;
            var boneMap = bones[boneName];

            for (var timelineName in boneMap)
            {
                if (!boneMap.hasOwnProperty(timelineName)) continue;
                var values = boneMap[timelineName];
                if (timelineName == "rotate")
                {
                    var timeline = new spine.RotateTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap["angle"]);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);

                } else if (timelineName == "translate" || timelineName == "scale")
                {
                    var timeline;
                    var timelineScale = 1;
                    if (timelineName == "scale")
                        timeline = new spine.ScaleTimeline(values.length);
                    else
                    {
                        timeline = new spine.TranslateTimeline(values.length);
                        timelineScale = this.scale;
                    }
                    timeline.boneIndex = boneIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var x = (valueMap["x"] || 0) * timelineScale;
                        var y = (valueMap["y"] || 0) * timelineScale;
                        timeline.setFrame(frameIndex, valueMap["time"], x, y);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 3 - 3]);

                } else if (timelineName == "flipX" || timelineName == "flipY")
                {
                    var x = timelineName == "flipX";
                    var timeline = x ? new spine.FlipXTimeline(values.length) : new spine.FlipYTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    var field = x ? "x" : "y";
                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap[field] || false);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);
                } else
                    throw "Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")";
            }
        }

        var ikMap = map["ik"];
        for (var ikConstraintName in ikMap)
        {
            if (!ikMap.hasOwnProperty(ikConstraintName)) continue;
            var ikConstraint = skeletonData.findIkConstraint(ikConstraintName);
            var values = ikMap[ikConstraintName];
            var timeline = new spine.IkConstraintTimeline(values.length);
            timeline.ikConstraintIndex = skeletonData.ikConstraints.indexOf(ikConstraint);
            var frameIndex = 0;
            for (var i = 0, n = values.length; i < n; i++)
            {
                var valueMap = values[i];
                var mix = valueMap.hasOwnProperty("mix") ? valueMap["mix"] : 1;
                var bendDirection = (!valueMap.hasOwnProperty("bendPositive") || valueMap["bendPositive"]) ? 1 : -1;
                timeline.setFrame(frameIndex, valueMap["time"], mix, bendDirection);
                this.readCurve(timeline, frameIndex, valueMap);
                frameIndex++;
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.frameCount * 3 - 3]);
        }

        var ffd = map["ffd"];
        for (var skinName in ffd)
        {
            var skin = skeletonData.findSkin(skinName);
            var slotMap = ffd[skinName];
            for (slotName in slotMap)
            {
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var meshMap = slotMap[slotName];
                for (var meshName in meshMap)
                {
                    var values = meshMap[meshName];
                    var timeline = new spine.FfdTimeline(values.length);
                    var attachment = skin.getAttachment(slotIndex, meshName);
                    if (!attachment) throw "FFD attachment not found: " + meshName;
                    timeline.slotIndex = slotIndex;
                    timeline.attachment = attachment;

                    var isMesh = attachment.type == spine.AttachmentType.mesh;
                    var vertexCount;
                    if (isMesh)
                        vertexCount = attachment.vertices.length;
                    else
                        vertexCount = attachment.weights.length / 3 * 2;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var vertices;
                        if (!valueMap["vertices"])
                        {
                            if (isMesh)
                                vertices = attachment.vertices;
                            else
                            {
                                vertices = [];
                                vertices.length = vertexCount;
                            }
                        } else {
                            var verticesValue = valueMap["vertices"];
                            var vertices = [];
                            vertices.length = vertexCount;
                            var start = valueMap["offset"] || 0;
                            var nn = verticesValue.length;
                            if (this.scale == 1)
                            {
                                for (var ii = 0; ii < nn; ii++)
                                    vertices[ii + start] = verticesValue[ii];
                            } else {
                                for (var ii = 0; ii < nn; ii++)
                                    vertices[ii + start] = verticesValue[ii] * this.scale;
                            }
                            if (isMesh)
                            {
                                var meshVertices = attachment.vertices;
                                for (var ii = 0, nn = vertices.length; ii < nn; ii++)
                                    vertices[ii] += meshVertices[ii];
                            }
                        }

                        timeline.setFrame(frameIndex, valueMap["time"], vertices);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines[timelines.length] = timeline;
                    duration = Math.max(duration, timeline.frames[timeline.frameCount - 1]);
                }
            }
        }

        var drawOrderValues = map["drawOrder"];
        if (!drawOrderValues) drawOrderValues = map["draworder"];
        if (drawOrderValues)
        {
            var timeline = new spine.DrawOrderTimeline(drawOrderValues.length);
            var slotCount = skeletonData.slots.length;
            var frameIndex = 0;
            for (var i = 0, n = drawOrderValues.length; i < n; i++)
            {
                var drawOrderMap = drawOrderValues[i];
                var drawOrder = null;
                if (drawOrderMap["offsets"])
                {
                    drawOrder = [];
                    drawOrder.length = slotCount;
                    for (var ii = slotCount - 1; ii >= 0; ii--)
                        drawOrder[ii] = -1;
                    var offsets = drawOrderMap["offsets"];
                    var unchanged = [];
                    unchanged.length = slotCount - offsets.length;
                    var originalIndex = 0, unchangedIndex = 0;
                    for (var ii = 0, nn = offsets.length; ii < nn; ii++)
                    {
                        var offsetMap = offsets[ii];
                        var slotIndex = skeletonData.findSlotIndex(offsetMap["slot"]);
                        if (slotIndex == -1) throw "Slot not found: " + offsetMap["slot"];
                        // Collect unchanged items.
                        while (originalIndex != slotIndex)
                            unchanged[unchangedIndex++] = originalIndex++;
                        // Set changed items.
                        drawOrder[originalIndex + offsetMap["offset"]] = originalIndex++;
                    }
                    // Collect remaining unchanged items.
                    while (originalIndex < slotCount)
                        unchanged[unchangedIndex++] = originalIndex++;
                    // Fill in unchanged items.
                    for (var ii = slotCount - 1; ii >= 0; ii--)
                        if (drawOrder[ii] == -1) drawOrder[ii] = unchanged[--unchangedIndex];
                }
                timeline.setFrame(frameIndex++, drawOrderMap["time"], drawOrder);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }

        var events = map["events"];
        if (events)
        {
            var timeline = new spine.EventTimeline(events.length);
            var frameIndex = 0;
            for (var i = 0, n = events.length; i < n; i++)
            {
                var eventMap = events[i];
                var eventData = skeletonData.findEvent(eventMap["name"]);
                if (!eventData) throw "Event not found: " + eventMap["name"];
                var event = new spine.Event(eventData);
                event.intValue = eventMap.hasOwnProperty("int") ? eventMap["int"] : eventData.intValue;
                event.floatValue = eventMap.hasOwnProperty("float") ? eventMap["float"] : eventData.floatValue;
                event.stringValue = eventMap.hasOwnProperty("string") ? eventMap["string"] : eventData.stringValue;
                timeline.setFrame(frameIndex++, eventMap["time"], event);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }

        skeletonData.animations.push(new spine.Animation(name, timelines, duration));
    },
    readCurve: function (timeline, frameIndex, valueMap)
    {
        var curve = valueMap["curve"];
        if (!curve)
            timeline.curves.setLinear(frameIndex);
        else if (curve == "stepped")
            timeline.curves.setStepped(frameIndex);
        else if (curve instanceof Array)
            timeline.curves.setCurve(frameIndex, curve[0], curve[1], curve[2], curve[3]);
    },
    toColor: function (hexString, colorIndex)
    {
        if (hexString.length != 8) throw "Color hexidecimal length must be 8, recieved: " + hexString;
        return parseInt(hexString.substring(colorIndex * 2, (colorIndex * 2) + 2), 16) / 255;
    },
    getFloatArray: function (map, name, scale)
    {
        var list = map[name];
        var values = new spine.Float32Array(list.length);
        var i = 0, n = list.length;
        if (scale == 1)
        {
            for (; i < n; i++)
                values[i] = list[i];
        } else {
            for (; i < n; i++)
                values[i] = list[i] * scale;
        }
        return values;
    },
    getIntArray: function (map, name)
    {
        var list = map[name];
        var values = new spine.Uint16Array(list.length);
        for (var i = 0, n = list.length; i < n; i++)
            values[i] = list[i] | 0;
        return values;
    }
};
module.exports = spine.SkeletonJsonParser;


},{"../SpineUtil":42,"./Animation":2,"./AttachmentTimeline":10,"./AttachmentType":11,"./BoneData":13,"./ColorTimeline":15,"./DrawOrderTimeline":17,"./Event":18,"./EventData":19,"./EventTimeline":20,"./FfdTimeline":21,"./FlipXTimeline":22,"./FlipYTimeline":23,"./IkConstraintData":25,"./IkConstraintTimeline":26,"./RotateTimeline":29,"./ScaleTimeline":30,"./SkeletonData":33,"./Skin":35,"./SlotData":38,"./TranslateTimeline":40}],35:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Skin = function (name)
{
    this.name = name;
    this.attachments = {};
};
spine.Skin.prototype = {
    addAttachment: function (slotIndex, name, attachment)
    {
        this.attachments[slotIndex + ":" + name] = attachment;
    },
    getAttachment: function (slotIndex, name)
    {
        return this.attachments[slotIndex + ":" + name];
    },
    _attachAll: function (skeleton, oldSkin)
    {
        for (var key in oldSkin.attachments)
        {
            var colon = key.indexOf(":");
            var slotIndex = parseInt(key.substring(0, colon));
            var name = key.substring(colon + 1);
            var slot = skeleton.slots[slotIndex];
            if (slot.attachment && slot.attachment.name == name)
            {
                var attachment = this.getAttachment(slotIndex, name);
                if (attachment) slot.setAttachment(attachment);
            }
        }
    }
};
module.exports = spine.Skin;


},{"../SpineUtil":42}],36:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkinnedMeshAttachment = function (name)
{
    this.name = name;
};
spine.SkinnedMeshAttachment.prototype = {
    type: spine.AttachmentType.skinnedmesh,
    bones: null,
    weights: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionU: 0, regionV: 0, regionU2: 0, regionV2: 0, regionRotate: false,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    edges: null,
    width: 0, height: 0,
    updateUVs: function (u, v, u2, v2, rotate)
    {
        var width = this.regionU2 - this.regionU, height = this.regionV2 - this.regionV;
        var n = this.regionUVs.length;
        if (!this.uvs || this.uvs.length != n)
        {
            this.uvs = new spine.Float32Array(n);
        }
        if (this.regionRotate)
        {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i + 1] * width;
                this.uvs[i + 1] = this.regionV + height - this.regionUVs[i] * height;
            }
        } else {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i] * width;
                this.uvs[i + 1] = this.regionV + this.regionUVs[i + 1] * height;
            }
        }
    },
    computeWorldVertices: function (x, y, slot, worldVertices)
    {
        var skeletonBones = slot.bone.skeleton.bones;
        var weights = this.weights;
        var bones = this.bones;

        var w = 0, v = 0, b = 0, f = 0, n = bones.length, nn;
        var wx, wy, bone, vx, vy, weight;
        if (!slot.attachmentVertices.length)
        {
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3)
                {
                    bone = skeletonBones[bones[v]];
                    vx = weights[b];
                    vy = weights[b + 1];
                    weight = weights[b + 2];
                    wx += (vx * bone.m00 + vy * bone.m01 + bone.worldX) * weight;
                    wy += (vx * bone.m10 + vy * bone.m11 + bone.worldY) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        } else {
            var ffd = slot.attachmentVertices;
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3, f += 2)
                {
                    bone = skeletonBones[bones[v]];
                    vx = weights[b] + ffd[f];
                    vy = weights[b + 1] + ffd[f + 1];
                    weight = weights[b + 2];
                    wx += (vx * bone.m00 + vy * bone.m01 + bone.worldX) * weight;
                    wy += (vx * bone.m10 + vy * bone.m11 + bone.worldY) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        }
    }
};
module.exports = spine.SkinnedMeshAttachment;


},{"../SpineUtil":42,"./AttachmentType":11}],37:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Slot = function (slotData, bone)
{
    this.data = slotData;
    this.bone = bone;
    this.setToSetupPose();
};
spine.Slot.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    _attachmentTime: 0,
    attachment: null,
    attachmentVertices: [],
    setAttachment: function (attachment)
    {
        this.attachment = attachment;
        this._attachmentTime = this.bone.skeleton.time;
        this.attachmentVertices.length = 0;
    },
    setAttachmentTime: function (time)
    {
        this._attachmentTime = this.bone.skeleton.time - time;
    },
    getAttachmentTime: function ()
    {
        return this.bone.skeleton.time - this._attachmentTime;
    },
    setToSetupPose: function ()
    {
        var data = this.data;
        this.r = data.r;
        this.g = data.g;
        this.b = data.b;
        this.a = data.a;

        var slotDatas = this.bone.skeleton.data.slots;
        for (var i = 0, n = slotDatas.length; i < n; i++)
        {
            if (slotDatas[i] == data)
            {
                this.setAttachment(!data.attachmentName ? null : this.bone.skeleton.getAttachmentBySlotIndex(i, data.attachmentName));
                break;
            }
        }
    }
};
module.exports = spine.Slot;


},{"../SpineUtil":42}],38:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SlotData = function (name, boneData)
{
    this.name = name;
    this.boneData = boneData;
};
spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null,
    additiveBlending: false
};
module.exports = spine.SlotData;


},{"../SpineUtil":42}],39:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.TrackEntry = function ()
{};
spine.TrackEntry.prototype = {
    next: null, previous: null,
    animation: null,
    loop: false,
    delay: 0, time: 0, lastTime: -1, endTime: 0,
    timeScale: 1,
    mixTime: 0, mixDuration: 0, mix: 1,
    onStart: null, onEnd: null, onComplete: null, onEvent: null
};
module.exports = spine.TrackEntry;


},{"../SpineUtil":42}],40:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.TranslateTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.TranslateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            bone.x += (bone.data.x + frames[frames.length - 2] - bone.x) * alpha;
            bone.y += (bone.data.y + frames[frames.length - 1] - bone.y) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameX = frames[frameIndex - 2];
        var prevFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.x += (bone.data.x + prevFrameX + (frames[frameIndex + 1/*FRAME_X*/] - prevFrameX) * percent - bone.x) * alpha;
        bone.y += (bone.data.y + prevFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - prevFrameY) * percent - bone.y) * alpha;
    }
};
module.exports = spine.TranslateTimeline;


},{"../SpineUtil":42,"./Animation":2,"./Curves":16}],41:[function(require,module,exports){
/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.1
 *
 * Copyright (c) 2013, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable and
 * non-transferable license to install, execute and perform the Spine Runtimes
 * Software (the "Software") solely for internal use. Without the written
 * permission of Esoteric Software (typically granted by licensing Spine), you
 * may not (a) modify, translate, adapt or otherwise create derivative works,
 * improvements of the Software or develop new applications using the Software
 * or (b) remove, delete, alter or obscure any trademarks or any copyright,
 * trademark, patent or other intellectual property or proprietary rights
 * notices on or in the Software, including any copy thereof. Redistributions
 * in binary or source form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.AnimationStateData = require('./AnimationStateData');
spine.AnimationState = require('./AnimationState');
spine.AtlasAttachmentParser = require('./AtlasAttachmentParser');
spine.Atlas = require('./Atlas');
spine.AtlasPage = require('./AtlasPage');
spine.AtlasReader = require('./AtlasReader');
spine.AtlasRegion = require('./AtlasRegion');
spine.AttachmentTimeline = require('./AttachmentTimeline');
spine.AttachmentType = require('./AttachmentType');
spine.BoneData = require('./BoneData');
spine.Bone = require('./Bone');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment');
spine.ColorTimeline = require('./ColorTimeline');
spine.Curves = require('./Curves');
spine.DrawOrderTimeline = require('./DrawOrderTimeline');
spine.EventData = require('./EventData');
spine.Event = require('./Event');
spine.EventTimeline = require('./EventTimeline');
spine.FfdTimeline = require('./FfdTimeline');
spine.FlipXTimeline = require('./FlipXTimeline');
spine.FlipYTimeline = require('./FlipYTimeline');
spine.IkConstraintData = require('./IkConstraintData');
spine.IkConstraint = require('./IkConstraint');
spine.IkConstraintTimeline = require('./IkConstraintTimeline');
spine.MeshAttachment = require('./MeshAttachment');
spine.RegionAttachment = require('./RegionAttachment');
spine.RotateTimeline = require('./RotateTimeline');
spine.ScaleTimeline = require('./ScaleTimeline');
spine.SkeletonBounds = require('./SkeletonBounds');
spine.SkeletonData = require('./SkeletonData');
spine.Skeleton = require('./Skeleton');
spine.SkeletonJsonParser = require('./SkeletonJsonParser');
spine.Skin = require('./Skin.js');
spine.SkinnedMeshAttachment = require('./SkinnedMeshAttachment');
spine.SlotData = require('./SlotData');
spine.Slot = require('./Slot');
spine.TrackEntry = require('./TrackEntry');
spine.TranslateTimeline = require('./TranslateTimeline');
module.exports = spine;

},{"../SpineUtil":42,"./Animation":2,"./AnimationState":3,"./AnimationStateData":4,"./Atlas":5,"./AtlasAttachmentParser":6,"./AtlasPage":7,"./AtlasReader":8,"./AtlasRegion":9,"./AttachmentTimeline":10,"./AttachmentType":11,"./Bone":12,"./BoneData":13,"./BoundingBoxAttachment":14,"./ColorTimeline":15,"./Curves":16,"./DrawOrderTimeline":17,"./Event":18,"./EventData":19,"./EventTimeline":20,"./FfdTimeline":21,"./FlipXTimeline":22,"./FlipYTimeline":23,"./IkConstraint":24,"./IkConstraintData":25,"./IkConstraintTimeline":26,"./MeshAttachment":27,"./RegionAttachment":28,"./RotateTimeline":29,"./ScaleTimeline":30,"./Skeleton":31,"./SkeletonBounds":32,"./SkeletonData":33,"./SkeletonJsonParser":34,"./Skin.js":35,"./SkinnedMeshAttachment":36,"./Slot":37,"./SlotData":38,"./TrackEntry":39,"./TranslateTimeline":40}],42:[function(require,module,exports){
module.exports = {
    radDeg: 180 / Math.PI,
    degRad: Math.PI / 180,
    temp: [],
    Float32Array: (typeof(Float32Array) === 'undefined') ? Array : Float32Array,
    Uint16Array: (typeof(Uint16Array) === 'undefined') ? Array : Uint16Array
};


},{}],43:[function(require,module,exports){
var PIXI = require('pixi.js'),
    spine = require('../SpineRuntime');
/* Esoteric Software SPINE wrapper for pixi.js */
spine.Bone.yDown = true;
/**
 * A class that enables the you to import and run your spine animations in pixi.
 * The Spine animation data needs to be loaded using either the Loader or a SpineLoader before it can be used by this class
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 *
 * ```js
 * var spineAnimation = new PIXI.Spine(spineData);
 * ```
 *
 * @class
 * @extends Container
 * @memberof PIXI.spine
 * @param spineData {object} The spine data loaded from a spine atlas.
 */
function Spine(spineData)
{
    PIXI.Container.call(this);

    if (!spineData)
    {
        throw new Error('The spineData param is required.');
    }

    /**
     * The spineData object
     *
     * @member {object}
     */
    this.spineData = spineData;

    /**
     * A spine Skeleton object
     *
     * @member {object}
     */
    this.skeleton = new spine.Skeleton(spineData);
    this.skeleton.updateWorldTransform();

    /**
     * A spine AnimationStateData object created from the spine data passed in the constructor
     *
     * @member {object}
     */
    this.stateData = new spine.AnimationStateData(spineData);

    /**
     * A spine AnimationState object created from the spine AnimationStateData object
     *
     * @member {object}
     */
    this.state = new spine.AnimationState(this.stateData);

    /**
     * An array of containers
     *
     * @member {Container[]}
     */
    this.slotContainers = [];

    for (var i = 0, n = this.skeleton.slots.length; i < n; i++)
    {
        var slot = this.skeleton.slots[i];
        var attachment = slot.attachment;
        var slotContainer = new PIXI.Container();
        this.slotContainers.push(slotContainer);
        this.addChild(slotContainer);

        if (attachment instanceof spine.RegionAttachment)
        {
            var spriteName = attachment.rendererObject.name;
            var sprite = this.createSprite(slot, attachment);
            slot.currentSprite = sprite;
            slot.currentSpriteName = spriteName;
            slotContainer.addChild(sprite);
        }
        else if (attachment instanceof spine.MeshAttachment)
        {
            var mesh = this.createMesh(slot, attachment);
            slot.currentMesh = mesh;
            slot.currentMeshName = attachment.name;
            slotContainer.addChild(mesh);
        }
        else
        {
            continue;
        }

    }

    /**
     * Should the Spine object update its transforms
     *
     * @member {boolean}
     */
    this.autoUpdate = true;
}

Spine.prototype = Object.create(PIXI.Container.prototype);
Spine.prototype.constructor = Spine;
module.exports = Spine;

Object.defineProperties(Spine.prototype, {
    /**
     * If this flag is set to true, the spine animation will be autoupdated every time
     * the object id drawn. The down side of this approach is that the delta time is
     * automatically calculated and you could miss out on cool effects like slow motion,
     * pause, skip ahead and the sorts. Most of these effects can be achieved even with
     * autoupdate enabled but are harder to achieve.
     *
     * @member {boolean}
     * @memberof Spine#
     * @default true
     */
    autoUpdate: {
        get: function ()
        {
            return (this.updateTransform === Spine.prototype.autoUpdateTransform);
        },

        set: function (value)
        {
            this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
        }
    }
});

/**
 * Update the spine skeleton and its animations by delta time (dt)
 *
 * @param dt {number} Delta time. Time by which the animation should be updated
 */
Spine.prototype.update = function (dt)
{
    this.state.update(dt);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    var drawOrder = this.skeleton.drawOrder;
    var slots = this.skeleton.slots;

    for (var i = 0, n = drawOrder.length; i < n; i++)
    {
        this.children[i] = this.slotContainers[drawOrder[i]];
    }

    for (i = 0, n = slots.length; i < n; i++)
    {
        var slot = slots[i];
        var attachment = slot.attachment;
        var slotContainer = this.slotContainers[i];

        if (!attachment)
        {
            slotContainer.visible = false;
            continue;
        }

        var type = attachment.type;
        if (type === spine.AttachmentType.region)
        {
            if (attachment.rendererObject)
            {
                if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.rendererObject.name)
                {
                    var spriteName = attachment.rendererObject.name;
                    if (slot.currentSprite !== undefined)
                    {
                        slot.currentSprite.visible = false;
                    }
                    slot.sprites = slot.sprites || {};
                    if (slot.sprites[spriteName] !== undefined)
                    {
                        slot.sprites[spriteName].visible = true;
                    }
                    else
                    {
                        var sprite = this.createSprite(slot, attachment);
                        slotContainer.addChild(sprite);
                    }
                    slot.currentSprite = slot.sprites[spriteName];
                    slot.currentSpriteName = spriteName;
                }
            }

            var bone = slot.bone;

            slotContainer.position.x = bone.worldX + attachment.x * bone.m00 + attachment.y * bone.m01;
            slotContainer.position.y = bone.worldY + attachment.x * bone.m10 + attachment.y * bone.m11;
            slotContainer.scale.x = bone.worldScaleX;
            slotContainer.scale.y = bone.worldScaleY;

            slotContainer.rotation = -(slot.bone.worldRotation * spine.degRad);

            slot.currentSprite.tint = PIXI.utils.rgb2hex([slot.r,slot.g,slot.b]);
        }
        else if (type === spine.AttachmentType.skinnedmesh)
        {
            if (!slot.currentMeshName || slot.currentMeshName !== attachment.name)
            {
                var meshName = attachment.name;
                if (slot.currentMesh !== undefined)
                {
                    slot.currentMesh.visible = false;
                }

                slot.meshes = slot.meshes || {};

                if (slot.meshes[meshName] !== undefined)
                {
                    slot.meshes[meshName].visible = true;
                }
                else
                {
                    var mesh = this.createMesh(slot, attachment);
                    slotContainer.addChild(mesh);
                }

                slot.currentMesh = slot.meshes[meshName];
                slot.currentMeshName = meshName;
            }

            attachment.computeWorldVertices(slot.bone.skeleton.x, slot.bone.skeleton.y, slot, slot.currentMesh.vertices);

        }
        else
        {
            slotContainer.visible = false;
            continue;
        }
        slotContainer.visible = true;

        slotContainer.alpha = slot.a;
    }
};

/**
 * When autoupdate is set to yes this function is used as pixi's updateTransform function
 *
 * @private
 */
Spine.prototype.autoUpdateTransform = function ()
{
    this.lastTime = this.lastTime || Date.now();
    var timeDelta = (Date.now() - this.lastTime) * 0.001;
    this.lastTime = Date.now();

    this.update(timeDelta);

    PIXI.Container.prototype.updateTransform.call(this);
};

/**
 * Create a new sprite to be used with spine.RegionAttachment
 *
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createSprite = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var baseTexture = descriptor.page.rendererObject;
    var spriteRect = new PIXI.math.Rectangle(descriptor.x,
                                        descriptor.y,
                                        descriptor.rotate ? descriptor.height : descriptor.width,
                                        descriptor.rotate ? descriptor.width : descriptor.height);
    var spriteTexture = new PIXI.Texture(baseTexture, spriteRect);
    var sprite = new PIXI.Sprite(spriteTexture);

    var baseRotation = descriptor.rotate ? Math.PI * 0.5 : 0.0;
    sprite.scale.x = descriptor.width / descriptor.originalWidth * attachment.scaleX;
    sprite.scale.y = descriptor.height / descriptor.originalHeight * attachment.scaleY;
    sprite.rotation = baseRotation - (attachment.rotation * spine.degRad);
    sprite.anchor.x = sprite.anchor.y = 0.5;
    sprite.alpha = attachment.a;

    slot.sprites = slot.sprites || {};
    slot.sprites[descriptor.name] = sprite;
    return sprite;
};

/**
 * Creates a Strip from the spine data
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createMesh = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var baseTexture = descriptor.page.rendererObject;
    var texture = new PIXI.Texture(baseTexture);

    var strip = new PIXI.Strip(texture);
    strip.drawMode = PIXI.Strip.DRAW_MODES.TRIANGLES;
    strip.canvasPadding = 1.5;

    strip.vertices = new Float32Array(attachment.uvs.length);
    strip.uvs = attachment.uvs;
    strip.indices = attachment.triangles;
    strip.alpha = attachment.a;

    slot.meshes = slot.meshes || {};
    slot.meshes[attachment.name] = strip;

    return strip;
};

},{"../SpineRuntime":41,"pixi.js":"pixi.js"}],44:[function(require,module,exports){
/**
 * @file        Spine resource loader
 * @author      Ivan Popelyshev <ivan.popelyshev@gmail.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI.loaders
 */

var atlasParser = require('./atlasParser'),
    PIXI = require('pixi.js');

function Loader(baseUrl, concurrency)
{
    PIXI.loaders.Loader.call(this, baseUrl, concurrency);

    // parse any spine data into a spine object
    this.use(atlasParser());
}

Loader.prototype = Object.create(PIXI.loaders.Loader.prototype);
Loader.prototype.constructor = Loader;

module.exports = Loader;

},{"./atlasParser":45,"pixi.js":"pixi.js"}],45:[function(require,module,exports){
var Resource = require('pixi.js').loaders.Resource,
    async = require('pixi.js').utils.async,
    spine = require('../SpineRuntime');

module.exports = function () {
    return function (resource, next) {
        // skip if no data, its not json, or it isn't atlas data
        if (!resource.data || !resource.isJson || !resource.data.bones) {
            return next();
        }

        /**
         * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
         * that correspond to the spine file are in the same base URL and that the .json and .atlas files
         * have the same name
         */
        var atlasPath = resource.url.substr(0, resource.url.lastIndexOf('.')) + '.atlas';
        var atlasOptions = {
            crossOrigin: resource.crossOrigin,
            xhrType: Resource.XHR_RESPONSE_TYPE.TEXT
        };
        var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);


        this.add(resource.name + '_atlas', atlasPath, atlasOptions, function (res) {
            // create a spine atlas using the loaded text
            var spineAtlas = new spine.Atlas(this.xhr.responseText, baseUrl, res.crossOrigin);

            // spine animation
            var spineJsonParser = new spine.SkeletonJsonParser(new spine.AtlasAttachmentParser(spineAtlas));
            var skeletonData = spineJsonParser.readSkeletonData(resource.data);

            resource.spineData = skeletonData;
            resource.spineAtlas = spineAtlas;

            // Go through each spineAtlas.pages and wait for page.rendererObject (a baseTexture) to
            // load. Once all loaded, then call the next function.
            async.each(spineAtlas.pages, function (page, done) {
                if (page.rendererObject.hasLoaded) {
                    done();
                }
                else {
                    page.rendererObject.once('loaded', done);
                }
            }, next);
        });
    };
};

},{"../SpineRuntime":41,"pixi.js":"pixi.js"}],46:[function(require,module,exports){
module.exports = {
    atlasParser: require('./atlasParser'),
    Loader: require('./Loader')
};

},{"./Loader":44,"./atlasParser":45}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvbi5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQW5pbWF0aW9uU3RhdGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvblN0YXRlRGF0YS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXMuanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0bGFzQXR0YWNobWVudFBhcnNlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNQYWdlLmpzIiwic3JjL1NwaW5lUnVudGltZS9BdGxhc1JlYWRlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNSZWdpb24uanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0dGFjaG1lbnRUaW1lbGluZS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXR0YWNobWVudFR5cGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmVEYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Cb3VuZGluZ0JveEF0dGFjaG1lbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0NvbG9yVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0N1cnZlcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvRHJhd09yZGVyVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50LmpzIiwic3JjL1NwaW5lUnVudGltZS9FdmVudERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50VGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0ZmZFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ja0NvbnN0cmFpbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9NZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUmVnaW9uQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUm90YXRlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NjYWxlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NrZWxldG9uLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkJvdW5kcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2tlbGV0b25EYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkpzb25QYXJzZXIuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW4uanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW5uZWRNZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYWNrRW50cnkuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYW5zbGF0ZVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9pbmRleC5qcyIsInNyYy9TcGluZVV0aWwvaW5kZXguanMiLCJzcmMvU3BpbmUvaW5kZXguanMiLCJzcmMvbG9hZGVycy9Mb2FkZXIuanMiLCJzcmMvbG9hZGVycy9hdGxhc1BhcnNlci5qcyIsInNyYy9sb2FkZXJzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZXNwYWNlIFBJWEkuc3BpbmVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdwaXhpLmpzJykuc3BpbmUgPSB7XG4gICAgU3BpbmU6ICAgICAgICAgIHJlcXVpcmUoJy4vU3BpbmUnKSxcbiAgICBTcGluZVJ1bnRpbWU6ICAgcmVxdWlyZSgnLi9TcGluZVJ1bnRpbWUnKSxcbiAgICBsb2FkZXJzOiAgICAgICAgcmVxdWlyZSgnLi9sb2FkZXJzJylcbn07XG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gZnVuY3Rpb24gKG5hbWUsIHRpbWVsaW5lcywgZHVyYXRpb24pXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLnRpbWVsaW5lcyA9IHRpbWVsaW5lcztcclxuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcclxufTtcclxuc3BpbmUuQW5pbWF0aW9uLnByb3RvdHlwZSA9IHtcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBsb29wLCBldmVudHMpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKGxvb3AgJiYgdGhpcy5kdXJhdGlvbiAhPSAwKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGltZSAlPSB0aGlzLmR1cmF0aW9uO1xyXG4gICAgICAgICAgICBsYXN0VGltZSAlPSB0aGlzLmR1cmF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGltZWxpbmVzID0gdGhpcy50aW1lbGluZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aW1lbGluZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICB0aW1lbGluZXNbaV0uYXBwbHkoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBldmVudHMsIDEpO1xyXG4gICAgfSxcclxuICAgIG1peDogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgbG9vcCwgZXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICBpZiAobG9vcCAmJiB0aGlzLmR1cmF0aW9uICE9IDApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aW1lICU9IHRoaXMuZHVyYXRpb247XHJcbiAgICAgICAgICAgIGxhc3RUaW1lICU9IHRoaXMuZHVyYXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB0aW1lbGluZXMgPSB0aGlzLnRpbWVsaW5lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHRpbWVsaW5lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHRpbWVsaW5lc1tpXS5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGV2ZW50cywgYWxwaGEpO1xyXG4gICAgfVxyXG59O1xyXG5zcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoID0gZnVuY3Rpb24gKHZhbHVlcywgdGFyZ2V0LCBzdGVwKVxyXG57XHJcbiAgICB2YXIgbG93ID0gMDtcclxuICAgIHZhciBoaWdoID0gTWF0aC5mbG9vcih2YWx1ZXMubGVuZ3RoIC8gc3RlcCkgLSAyO1xyXG4gICAgaWYgKCFoaWdoKSByZXR1cm4gc3RlcDtcclxuICAgIHZhciBjdXJyZW50ID0gaGlnaCA+Pj4gMTtcclxuICAgIHdoaWxlICh0cnVlKVxyXG4gICAge1xyXG4gICAgICAgIGlmICh2YWx1ZXNbKGN1cnJlbnQgKyAxKSAqIHN0ZXBdIDw9IHRhcmdldClcclxuICAgICAgICAgICAgbG93ID0gY3VycmVudCArIDE7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBoaWdoID0gY3VycmVudDtcclxuICAgICAgICBpZiAobG93ID09IGhpZ2gpIHJldHVybiAobG93ICsgMSkgKiBzdGVwO1xyXG4gICAgICAgIGN1cnJlbnQgPSAobG93ICsgaGlnaCkgPj4+IDE7XHJcbiAgICB9XHJcbn07XHJcbnNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxID0gZnVuY3Rpb24gKHZhbHVlcywgdGFyZ2V0KVxyXG57XHJcbiAgICB2YXIgbG93ID0gMDtcclxuICAgIHZhciBoaWdoID0gdmFsdWVzLmxlbmd0aCAtIDI7XHJcbiAgICBpZiAoIWhpZ2gpIHJldHVybiAxO1xyXG4gICAgdmFyIGN1cnJlbnQgPSBoaWdoID4+PiAxO1xyXG4gICAgd2hpbGUgKHRydWUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHZhbHVlc1tjdXJyZW50ICsgMV0gPD0gdGFyZ2V0KVxyXG4gICAgICAgICAgICBsb3cgPSBjdXJyZW50ICsgMTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGhpZ2ggPSBjdXJyZW50O1xyXG4gICAgICAgIGlmIChsb3cgPT0gaGlnaCkgcmV0dXJuIGxvdyArIDE7XHJcbiAgICAgICAgY3VycmVudCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcclxuICAgIH1cclxufTtcclxuc3BpbmUuQW5pbWF0aW9uLmxpbmVhclNlYXJjaCA9IGZ1bmN0aW9uICh2YWx1ZXMsIHRhcmdldCwgc3RlcClcclxue1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGxhc3QgPSB2YWx1ZXMubGVuZ3RoIC0gc3RlcDsgaSA8PSBsYXN0OyBpICs9IHN0ZXApXHJcbiAgICAgICAgaWYgKHZhbHVlc1tpXSA+IHRhcmdldCkgcmV0dXJuIGk7XHJcbiAgICByZXR1cm4gLTE7XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQW5pbWF0aW9uO1xyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuVHJhY2tFbnRyeSA9IHJlcXVpcmUoJy4vVHJhY2tFbnRyeScpO1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZURhdGEpXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IHN0YXRlRGF0YTtcclxuICAgIHRoaXMudHJhY2tzID0gW107XHJcbiAgICB0aGlzLmV2ZW50cyA9IFtdO1xyXG59O1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZS5wcm90b3R5cGUgPSB7XHJcbiAgICBvblN0YXJ0OiBudWxsLFxyXG4gICAgb25FbmQ6IG51bGwsXHJcbiAgICBvbkNvbXBsZXRlOiBudWxsLFxyXG4gICAgb25FdmVudDogbnVsbCxcclxuICAgIHRpbWVTY2FsZTogMSxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGRlbHRhKVxyXG4gICAge1xyXG4gICAgICAgIGRlbHRhICo9IHRoaXMudGltZVNjYWxlO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmFja3MubGVuZ3RoOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgY3VycmVudCA9IHRoaXMudHJhY2tzW2ldO1xyXG4gICAgICAgICAgICBpZiAoIWN1cnJlbnQpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudC50aW1lICs9IGRlbHRhICogY3VycmVudC50aW1lU2NhbGU7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50LnByZXZpb3VzKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNEZWx0YSA9IGRlbHRhICogY3VycmVudC5wcmV2aW91cy50aW1lU2NhbGU7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50LnByZXZpb3VzLnRpbWUgKz0gcHJldmlvdXNEZWx0YTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQubWl4VGltZSArPSBwcmV2aW91c0RlbHRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgbmV4dCA9IGN1cnJlbnQubmV4dDtcclxuICAgICAgICAgICAgaWYgKG5leHQpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5leHQudGltZSA9IGN1cnJlbnQubGFzdFRpbWUgLSBuZXh0LmRlbGF5O1xyXG4gICAgICAgICAgICAgICAgaWYgKG5leHQudGltZSA+PSAwKSB0aGlzLnNldEN1cnJlbnQoaSwgbmV4dCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBFbmQgbm9uLWxvb3BpbmcgYW5pbWF0aW9uIHdoZW4gaXQgcmVhY2hlcyBpdHMgZW5kIHRpbWUgYW5kIHRoZXJlIGlzIG5vIG5leHQgZW50cnkuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnQubG9vcCAmJiBjdXJyZW50Lmxhc3RUaW1lID49IGN1cnJlbnQuZW5kVGltZSkgdGhpcy5jbGVhclRyYWNrKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24pXHJcbiAgICB7XHJcbiAgICAgICAgc2tlbGV0b24ucmVzZXREcmF3T3JkZXIoKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyYWNrcy5sZW5ndGg7IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50ID0gdGhpcy50cmFja3NbaV07XHJcbiAgICAgICAgICAgIGlmICghY3VycmVudCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICAgICAgdmFyIHRpbWUgPSBjdXJyZW50LnRpbWU7XHJcbiAgICAgICAgICAgIHZhciBsYXN0VGltZSA9IGN1cnJlbnQubGFzdFRpbWU7XHJcbiAgICAgICAgICAgIHZhciBlbmRUaW1lID0gY3VycmVudC5lbmRUaW1lO1xyXG4gICAgICAgICAgICB2YXIgbG9vcCA9IGN1cnJlbnQubG9vcDtcclxuICAgICAgICAgICAgaWYgKCFsb29wICYmIHRpbWUgPiBlbmRUaW1lKSB0aW1lID0gZW5kVGltZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwcmV2aW91cyA9IGN1cnJlbnQucHJldmlvdXM7XHJcbiAgICAgICAgICAgIGlmICghcHJldmlvdXMpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Lm1peCA9PSAxKVxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQuYW5pbWF0aW9uLmFwcGx5KHNrZWxldG9uLCBjdXJyZW50Lmxhc3RUaW1lLCB0aW1lLCBsb29wLCB0aGlzLmV2ZW50cyk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudC5hbmltYXRpb24ubWl4KHNrZWxldG9uLCBjdXJyZW50Lmxhc3RUaW1lLCB0aW1lLCBsb29wLCB0aGlzLmV2ZW50cywgY3VycmVudC5taXgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzVGltZSA9IHByZXZpb3VzLnRpbWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXByZXZpb3VzLmxvb3AgJiYgcHJldmlvdXNUaW1lID4gcHJldmlvdXMuZW5kVGltZSkgcHJldmlvdXNUaW1lID0gcHJldmlvdXMuZW5kVGltZTtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzLmFuaW1hdGlvbi5hcHBseShza2VsZXRvbiwgcHJldmlvdXNUaW1lLCBwcmV2aW91c1RpbWUsIHByZXZpb3VzLmxvb3AsIG51bGwpO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBhbHBoYSA9IGN1cnJlbnQubWl4VGltZSAvIGN1cnJlbnQubWl4RHVyYXRpb24gKiBjdXJyZW50Lm1peDtcclxuICAgICAgICAgICAgICAgIGlmIChhbHBoYSA+PSAxKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGFscGhhID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50LnByZXZpb3VzID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGN1cnJlbnQuYW5pbWF0aW9uLm1peChza2VsZXRvbiwgY3VycmVudC5sYXN0VGltZSwgdGltZSwgbG9vcCwgdGhpcy5ldmVudHMsIGFscGhhKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IHRoaXMuZXZlbnRzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudHNbaWldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQub25FdmVudCkgY3VycmVudC5vbkV2ZW50KGksIGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uRXZlbnQpIHRoaXMub25FdmVudChpLCBldmVudCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNvbXBsZXRlZCB0aGUgYW5pbWF0aW9uIG9yIGEgbG9vcCBpdGVyYXRpb24uXHJcbiAgICAgICAgICAgIGlmIChsb29wID8gKGxhc3RUaW1lICUgZW5kVGltZSA+IHRpbWUgJSBlbmRUaW1lKSA6IChsYXN0VGltZSA8IGVuZFRpbWUgJiYgdGltZSA+PSBlbmRUaW1lKSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gTWF0aC5mbG9vcih0aW1lIC8gZW5kVGltZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5vbkNvbXBsZXRlKSBjdXJyZW50Lm9uQ29tcGxldGUoaSwgY291bnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25Db21wbGV0ZSkgdGhpcy5vbkNvbXBsZXRlKGksIGNvdW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY3VycmVudC5sYXN0VGltZSA9IGN1cnJlbnQudGltZTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgY2xlYXJUcmFja3M6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLnRyYWNrcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJUcmFjayhpKTtcclxuICAgICAgICB0aGlzLnRyYWNrcy5sZW5ndGggPSAwO1xyXG4gICAgfSxcclxuICAgIGNsZWFyVHJhY2s6IGZ1bmN0aW9uICh0cmFja0luZGV4KVxyXG4gICAge1xyXG4gICAgICAgIGlmICh0cmFja0luZGV4ID49IHRoaXMudHJhY2tzLmxlbmd0aCkgcmV0dXJuO1xyXG4gICAgICAgIHZhciBjdXJyZW50ID0gdGhpcy50cmFja3NbdHJhY2tJbmRleF07XHJcbiAgICAgICAgaWYgKCFjdXJyZW50KSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChjdXJyZW50Lm9uRW5kKSBjdXJyZW50Lm9uRW5kKHRyYWNrSW5kZXgpO1xyXG4gICAgICAgIGlmICh0aGlzLm9uRW5kKSB0aGlzLm9uRW5kKHRyYWNrSW5kZXgpO1xyXG5cclxuICAgICAgICB0aGlzLnRyYWNrc1t0cmFja0luZGV4XSA9IG51bGw7XHJcbiAgICB9LFxyXG4gICAgX2V4cGFuZFRvSW5kZXg6IGZ1bmN0aW9uIChpbmRleClcclxuICAgIHtcclxuICAgICAgICBpZiAoaW5kZXggPCB0aGlzLnRyYWNrcy5sZW5ndGgpIHJldHVybiB0aGlzLnRyYWNrc1tpbmRleF07XHJcbiAgICAgICAgd2hpbGUgKGluZGV4ID49IHRoaXMudHJhY2tzLmxlbmd0aClcclxuICAgICAgICAgICAgdGhpcy50cmFja3MucHVzaChudWxsKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICBzZXRDdXJyZW50OiBmdW5jdGlvbiAoaW5kZXgsIGVudHJ5KVxyXG4gICAge1xyXG4gICAgICAgIHZhciBjdXJyZW50ID0gdGhpcy5fZXhwYW5kVG9JbmRleChpbmRleCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgcHJldmlvdXMgPSBjdXJyZW50LnByZXZpb3VzO1xyXG4gICAgICAgICAgICBjdXJyZW50LnByZXZpb3VzID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50Lm9uRW5kKSBjdXJyZW50Lm9uRW5kKGluZGV4KTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub25FbmQpIHRoaXMub25FbmQoaW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgZW50cnkubWl4RHVyYXRpb24gPSB0aGlzLmRhdGEuZ2V0TWl4KGN1cnJlbnQuYW5pbWF0aW9uLCBlbnRyeS5hbmltYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAoZW50cnkubWl4RHVyYXRpb24gPiAwKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBlbnRyeS5taXhUaW1lID0gMDtcclxuICAgICAgICAgICAgICAgIC8vIElmIGEgbWl4IGlzIGluIHByb2dyZXNzLCBtaXggZnJvbSB0aGUgY2xvc2VzdCBhbmltYXRpb24uXHJcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXMgJiYgY3VycmVudC5taXhUaW1lIC8gY3VycmVudC5taXhEdXJhdGlvbiA8IDAuNSlcclxuICAgICAgICAgICAgICAgICAgICBlbnRyeS5wcmV2aW91cyA9IHByZXZpb3VzO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LnByZXZpb3VzID0gY3VycmVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmFja3NbaW5kZXhdID0gZW50cnk7XHJcblxyXG4gICAgICAgIGlmIChlbnRyeS5vblN0YXJ0KSBlbnRyeS5vblN0YXJ0KGluZGV4KTtcclxuICAgICAgICBpZiAodGhpcy5vblN0YXJ0KSB0aGlzLm9uU3RhcnQoaW5kZXgpO1xyXG4gICAgfSxcclxuICAgIHNldEFuaW1hdGlvbkJ5TmFtZTogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbk5hbWUsIGxvb3ApXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGFuaW1hdGlvbiA9IHRoaXMuZGF0YS5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhbmltYXRpb25OYW1lKTtcclxuICAgICAgICBpZiAoIWFuaW1hdGlvbikgdGhyb3cgXCJBbmltYXRpb24gbm90IGZvdW5kOiBcIiArIGFuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QW5pbWF0aW9uKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcCk7XHJcbiAgICB9LFxyXG4gICAgLyoqIFNldCB0aGUgY3VycmVudCBhbmltYXRpb24uIEFueSBxdWV1ZWQgYW5pbWF0aW9ucyBhcmUgY2xlYXJlZC4gKi9cclxuICAgIHNldEFuaW1hdGlvbjogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcClcclxuICAgIHtcclxuICAgICAgICB2YXIgZW50cnkgPSBuZXcgc3BpbmUuVHJhY2tFbnRyeSgpO1xyXG4gICAgICAgIGVudHJ5LmFuaW1hdGlvbiA9IGFuaW1hdGlvbjtcclxuICAgICAgICBlbnRyeS5sb29wID0gbG9vcDtcclxuICAgICAgICBlbnRyeS5lbmRUaW1lID0gYW5pbWF0aW9uLmR1cmF0aW9uO1xyXG4gICAgICAgIHRoaXMuc2V0Q3VycmVudCh0cmFja0luZGV4LCBlbnRyeSk7XHJcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xyXG4gICAgfSxcclxuICAgIGFkZEFuaW1hdGlvbkJ5TmFtZTogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbk5hbWUsIGxvb3AsIGRlbGF5KVxyXG4gICAge1xyXG4gICAgICAgIHZhciBhbmltYXRpb24gPSB0aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYW5pbWF0aW9uTmFtZSk7XHJcbiAgICAgICAgaWYgKCFhbmltYXRpb24pIHRocm93IFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyBhbmltYXRpb25OYW1lO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZEFuaW1hdGlvbih0cmFja0luZGV4LCBhbmltYXRpb24sIGxvb3AsIGRlbGF5KTtcclxuICAgIH0sXHJcbiAgICAvKiogQWRkcyBhbiBhbmltYXRpb24gdG8gYmUgcGxheWVkIGRlbGF5IHNlY29uZHMgYWZ0ZXIgdGhlIGN1cnJlbnQgb3IgbGFzdCBxdWV1ZWQgYW5pbWF0aW9uLlxyXG4gICAgICogQHBhcmFtIGRlbGF5IE1heSBiZSA8PSAwIHRvIHVzZSBkdXJhdGlvbiBvZiBwcmV2aW91cyBhbmltYXRpb24gbWludXMgYW55IG1peCBkdXJhdGlvbiBwbHVzIHRoZSBuZWdhdGl2ZSBkZWxheS4gKi9cclxuICAgIGFkZEFuaW1hdGlvbjogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcCwgZGVsYXkpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gbmV3IHNwaW5lLlRyYWNrRW50cnkoKTtcclxuICAgICAgICBlbnRyeS5hbmltYXRpb24gPSBhbmltYXRpb247XHJcbiAgICAgICAgZW50cnkubG9vcCA9IGxvb3A7XHJcbiAgICAgICAgZW50cnkuZW5kVGltZSA9IGFuaW1hdGlvbi5kdXJhdGlvbjtcclxuXHJcbiAgICAgICAgdmFyIGxhc3QgPSB0aGlzLl9leHBhbmRUb0luZGV4KHRyYWNrSW5kZXgpO1xyXG4gICAgICAgIGlmIChsYXN0KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgd2hpbGUgKGxhc3QubmV4dClcclxuICAgICAgICAgICAgICAgIGxhc3QgPSBsYXN0Lm5leHQ7XHJcbiAgICAgICAgICAgIGxhc3QubmV4dCA9IGVudHJ5O1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICB0aGlzLnRyYWNrc1t0cmFja0luZGV4XSA9IGVudHJ5O1xyXG5cclxuICAgICAgICBpZiAoZGVsYXkgPD0gMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmIChsYXN0KVxyXG4gICAgICAgICAgICAgICAgZGVsYXkgKz0gbGFzdC5lbmRUaW1lIC0gdGhpcy5kYXRhLmdldE1peChsYXN0LmFuaW1hdGlvbiwgYW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgZGVsYXkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeS5kZWxheSA9IGRlbGF5O1xyXG5cclxuICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICB9LFxyXG4gICAgLyoqIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZ2V0Q3VycmVudDogZnVuY3Rpb24gKHRyYWNrSW5kZXgpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRyYWNrSW5kZXggPj0gdGhpcy50cmFja3MubGVuZ3RoKSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gdGhpcy50cmFja3NbdHJhY2tJbmRleF07XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQW5pbWF0aW9uU3RhdGU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhID0gZnVuY3Rpb24gKHNrZWxldG9uRGF0YSlcclxue1xyXG4gICAgdGhpcy5za2VsZXRvbkRhdGEgPSBza2VsZXRvbkRhdGE7XHJcbiAgICB0aGlzLmFuaW1hdGlvblRvTWl4VGltZSA9IHt9O1xyXG59O1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZURhdGEucHJvdG90eXBlID0ge1xyXG4gICAgZGVmYXVsdE1peDogMCxcclxuICAgIHNldE1peEJ5TmFtZTogZnVuY3Rpb24gKGZyb21OYW1lLCB0b05hbWUsIGR1cmF0aW9uKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcm9tID0gdGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihmcm9tTmFtZSk7XHJcbiAgICAgICAgaWYgKCFmcm9tKSB0aHJvdyBcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiICsgZnJvbU5hbWU7XHJcbiAgICAgICAgdmFyIHRvID0gdGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbih0b05hbWUpO1xyXG4gICAgICAgIGlmICghdG8pIHRocm93IFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyB0b05hbWU7XHJcbiAgICAgICAgdGhpcy5zZXRNaXgoZnJvbSwgdG8sIGR1cmF0aW9uKTtcclxuICAgIH0sXHJcbiAgICBzZXRNaXg6IGZ1bmN0aW9uIChmcm9tLCB0bywgZHVyYXRpb24pXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5hbmltYXRpb25Ub01peFRpbWVbZnJvbS5uYW1lICsgXCI6XCIgKyB0by5uYW1lXSA9IGR1cmF0aW9uO1xyXG4gICAgfSxcclxuICAgIGdldE1peDogZnVuY3Rpb24gKGZyb20sIHRvKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBrZXkgPSBmcm9tLm5hbWUgKyBcIjpcIiArIHRvLm5hbWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lLmhhc093blByb3BlcnR5KGtleSkgPyB0aGlzLmFuaW1hdGlvblRvTWl4VGltZVtrZXldIDogdGhpcy5kZWZhdWx0TWl4O1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkFuaW1hdGlvblN0YXRlRGF0YTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BdGxhc1JlYWRlciA9IHJlcXVpcmUoJy4vQXRsYXNSZWFkZXInKTtcclxuc3BpbmUuQXRsYXNQYWdlID0gcmVxdWlyZSgnLi9BdGxhc1BhZ2UnKTtcclxuc3BpbmUuQXRsYXNSZWdpb24gPSByZXF1aXJlKCcuL0F0bGFzUmVnaW9uJyk7XHJcbnZhciBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xyXG5zcGluZS5BdGxhcyA9IGZ1bmN0aW9uIChhdGxhc1RleHQsIGJhc2VVcmwsIGNyb3NzT3JpZ2luKVxyXG57XHJcbiAgICBpZiAoYmFzZVVybCAmJiBiYXNlVXJsLmluZGV4T2YoJy8nKSAhPT0gYmFzZVVybC5sZW5ndGgpXHJcbiAgICB7XHJcbiAgICAgICAgYmFzZVVybCArPSAnLyc7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wYWdlcyA9IFtdO1xyXG4gICAgdGhpcy5yZWdpb25zID0gW107XHJcblxyXG4gICAgdGhpcy50ZXh0dXJlc0xvYWRpbmcgPSAwO1xyXG5cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IHNwaW5lLkF0bGFzUmVhZGVyKGF0bGFzVGV4dCk7XHJcbiAgICB2YXIgdHVwbGUgPSBbXTtcclxuICAgIHR1cGxlLmxlbmd0aCA9IDQ7XHJcbiAgICB2YXIgcGFnZSA9IG51bGw7XHJcbiAgICB3aGlsZSAodHJ1ZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgbGluZSA9IHJlYWRlci5yZWFkTGluZSgpO1xyXG4gICAgICAgIGlmIChsaW5lID09PSBudWxsKSBicmVhaztcclxuICAgICAgICBsaW5lID0gcmVhZGVyLnRyaW0obGluZSk7XHJcbiAgICAgICAgaWYgKCFsaW5lLmxlbmd0aClcclxuICAgICAgICAgICAgcGFnZSA9IG51bGw7XHJcbiAgICAgICAgZWxzZSBpZiAoIXBhZ2UpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBwYWdlID0gbmV3IHNwaW5lLkF0bGFzUGFnZSgpO1xyXG4gICAgICAgICAgICBwYWdlLm5hbWUgPSBsaW5lO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlYWRlci5yZWFkVHVwbGUodHVwbGUpID09IDIpXHJcbiAgICAgICAgICAgIHsgLy8gc2l6ZSBpcyBvbmx5IG9wdGlvbmFsIGZvciBhbiBhdGxhcyBwYWNrZWQgd2l0aCBhbiBvbGQgVGV4dHVyZVBhY2tlci5cclxuICAgICAgICAgICAgICAgIHBhZ2Uud2lkdGggPSBwYXJzZUludCh0dXBsZVswXSk7XHJcbiAgICAgICAgICAgICAgICBwYWdlLmhlaWdodCA9IHBhcnNlSW50KHR1cGxlWzFdKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBhZ2UuZm9ybWF0ID0gc3BpbmUuQXRsYXMuRm9ybWF0W3R1cGxlWzBdXTtcclxuXHJcbiAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xyXG4gICAgICAgICAgICBwYWdlLm1pbkZpbHRlciA9IHNwaW5lLkF0bGFzLlRleHR1cmVGaWx0ZXJbdHVwbGVbMF1dO1xyXG4gICAgICAgICAgICBwYWdlLm1hZ0ZpbHRlciA9IHNwaW5lLkF0bGFzLlRleHR1cmVGaWx0ZXJbdHVwbGVbMV1dO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHJlYWRlci5yZWFkVmFsdWUoKTtcclxuICAgICAgICAgICAgcGFnZS51V3JhcCA9IHNwaW5lLkF0bGFzLlRleHR1cmVXcmFwLmNsYW1wVG9FZGdlO1xyXG4gICAgICAgICAgICBwYWdlLnZXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAuY2xhbXBUb0VkZ2U7XHJcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT0gXCJ4XCIpXHJcbiAgICAgICAgICAgICAgICBwYWdlLnVXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0O1xyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gXCJ5XCIpXHJcbiAgICAgICAgICAgICAgICBwYWdlLnZXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0O1xyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gXCJ4eVwiKVxyXG4gICAgICAgICAgICAgICAgcGFnZS51V3JhcCA9IHBhZ2UudldyYXAgPSBzcGluZS5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ7XHJcblxyXG4gICAgICAgICAgICBwYWdlLnJlbmRlcmVyT2JqZWN0ID0gUElYSS5CYXNlVGV4dHVyZS5mcm9tSW1hZ2UoYmFzZVVybCArIGxpbmUsIGNyb3NzT3JpZ2luKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFnZXMucHVzaChwYWdlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHJlZ2lvbiA9IG5ldyBzcGluZS5BdGxhc1JlZ2lvbigpO1xyXG4gICAgICAgICAgICByZWdpb24ubmFtZSA9IGxpbmU7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5wYWdlID0gcGFnZTtcclxuXHJcbiAgICAgICAgICAgIHJlZ2lvbi5yb3RhdGUgPSByZWFkZXIucmVhZFZhbHVlKCkgPT0gXCJ0cnVlXCI7XHJcblxyXG4gICAgICAgICAgICByZWFkZXIucmVhZFR1cGxlKHR1cGxlKTtcclxuICAgICAgICAgICAgdmFyIHggPSBwYXJzZUludCh0dXBsZVswXSk7XHJcbiAgICAgICAgICAgIHZhciB5ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xyXG5cclxuICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XHJcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IHBhcnNlSW50KHR1cGxlWzBdKTtcclxuICAgICAgICAgICAgdmFyIGhlaWdodCA9IHBhcnNlSW50KHR1cGxlWzFdKTtcclxuXHJcbiAgICAgICAgICAgIHJlZ2lvbi51ID0geCAvIHBhZ2Uud2lkdGg7XHJcbiAgICAgICAgICAgIHJlZ2lvbi52ID0geSAvIHBhZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICBpZiAocmVnaW9uLnJvdGF0ZSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnUyID0gKHggKyBoZWlnaHQpIC8gcGFnZS53aWR0aDtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi52MiA9ICh5ICsgd2lkdGgpIC8gcGFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZWdpb24udTIgPSAoeCArIHdpZHRoKSAvIHBhZ2Uud2lkdGg7XHJcbiAgICAgICAgICAgICAgICByZWdpb24udjIgPSAoeSArIGhlaWdodCkgLyBwYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZWdpb24ueCA9IHg7XHJcbiAgICAgICAgICAgIHJlZ2lvbi55ID0geTtcclxuICAgICAgICAgICAgcmVnaW9uLndpZHRoID0gTWF0aC5hYnMod2lkdGgpO1xyXG4gICAgICAgICAgICByZWdpb24uaGVpZ2h0ID0gTWF0aC5hYnMoaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZWFkZXIucmVhZFR1cGxlKHR1cGxlKSA9PSA0KVxyXG4gICAgICAgICAgICB7IC8vIHNwbGl0IGlzIG9wdGlvbmFsXHJcbiAgICAgICAgICAgICAgICByZWdpb24uc3BsaXRzID0gW3BhcnNlSW50KHR1cGxlWzBdKSwgcGFyc2VJbnQodHVwbGVbMV0pLCBwYXJzZUludCh0dXBsZVsyXSksIHBhcnNlSW50KHR1cGxlWzNdKV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlYWRlci5yZWFkVHVwbGUodHVwbGUpID09IDQpXHJcbiAgICAgICAgICAgICAgICB7IC8vIHBhZCBpcyBvcHRpb25hbCwgYnV0IG9ubHkgcHJlc2VudCB3aXRoIHNwbGl0c1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZ2lvbi5wYWRzID0gW3BhcnNlSW50KHR1cGxlWzBdKSwgcGFyc2VJbnQodHVwbGVbMV0pLCBwYXJzZUludCh0dXBsZVsyXSksIHBhcnNlSW50KHR1cGxlWzNdKV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZWdpb24ub3JpZ2luYWxXaWR0aCA9IHBhcnNlSW50KHR1cGxlWzBdKTtcclxuICAgICAgICAgICAgcmVnaW9uLm9yaWdpbmFsSGVpZ2h0ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xyXG5cclxuICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5vZmZzZXRYID0gcGFyc2VJbnQodHVwbGVbMF0pO1xyXG4gICAgICAgICAgICByZWdpb24ub2Zmc2V0WSA9IHBhcnNlSW50KHR1cGxlWzFdKTtcclxuXHJcbiAgICAgICAgICAgIHJlZ2lvbi5pbmRleCA9IHBhcnNlSW50KHJlYWRlci5yZWFkVmFsdWUoKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJlZ2lvbnMucHVzaChyZWdpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuc3BpbmUuQXRsYXMucHJvdG90eXBlID0ge1xyXG4gICAgZmluZFJlZ2lvbjogZnVuY3Rpb24gKG5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHJlZ2lvbnMgPSB0aGlzLnJlZ2lvbnM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSByZWdpb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKHJlZ2lvbnNbaV0ubmFtZSA9PSBuYW1lKSByZXR1cm4gcmVnaW9uc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICBkaXNwb3NlOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBwYWdlcyA9IHRoaXMucGFnZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBwYWdlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHBhZ2VzW2ldLnJlbmRlcmVyT2JqZWN0LmRlc3Ryb3kodHJ1ZSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlVVZzOiBmdW5jdGlvbiAocGFnZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgcmVnaW9ucyA9IHRoaXMucmVnaW9ucztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHJlZ2lvbnMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHJlZ2lvbiA9IHJlZ2lvbnNbaV07XHJcbiAgICAgICAgICAgIGlmIChyZWdpb24ucGFnZSAhPSBwYWdlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgcmVnaW9uLnUgPSByZWdpb24ueCAvIHBhZ2Uud2lkdGg7XHJcbiAgICAgICAgICAgIHJlZ2lvbi52ID0gcmVnaW9uLnkgLyBwYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgaWYgKHJlZ2lvbi5yb3RhdGUpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9IChyZWdpb24ueCArIHJlZ2lvbi5oZWlnaHQpIC8gcGFnZS53aWR0aDtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi52MiA9IChyZWdpb24ueSArIHJlZ2lvbi53aWR0aCkgLyBwYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9IChyZWdpb24ueCArIHJlZ2lvbi53aWR0aCkgLyBwYWdlLndpZHRoO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnYyID0gKHJlZ2lvbi55ICsgcmVnaW9uLmhlaWdodCkgLyBwYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbnNwaW5lLkF0bGFzLkZvcm1hdCA9IHtcclxuICAgIGFscGhhOiAwLFxyXG4gICAgaW50ZW5zaXR5OiAxLFxyXG4gICAgbHVtaW5hbmNlQWxwaGE6IDIsXHJcbiAgICByZ2I1NjU6IDMsXHJcbiAgICByZ2JhNDQ0NDogNCxcclxuICAgIHJnYjg4ODogNSxcclxuICAgIHJnYmE4ODg4OiA2XHJcbn07XHJcblxyXG5zcGluZS5BdGxhcy5UZXh0dXJlRmlsdGVyID0ge1xyXG4gICAgbmVhcmVzdDogMCxcclxuICAgIGxpbmVhcjogMSxcclxuICAgIG1pcE1hcDogMixcclxuICAgIG1pcE1hcE5lYXJlc3ROZWFyZXN0OiAzLFxyXG4gICAgbWlwTWFwTGluZWFyTmVhcmVzdDogNCxcclxuICAgIG1pcE1hcE5lYXJlc3RMaW5lYXI6IDUsXHJcbiAgICBtaXBNYXBMaW5lYXJMaW5lYXI6IDZcclxufTtcclxuXHJcbnNwaW5lLkF0bGFzLlRleHR1cmVXcmFwID0ge1xyXG4gICAgbWlycm9yZWRSZXBlYXQ6IDAsXHJcbiAgICBjbGFtcFRvRWRnZTogMSxcclxuICAgIHJlcGVhdDogMlxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL1JlZ2lvbkF0dGFjaG1lbnQnKTtcclxuc3BpbmUuTWVzaEF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL01lc2hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudCA9IHJlcXVpcmUoJy4vU2tpbm5lZE1lc2hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudCA9IHJlcXVpcmUoJy4vQm91bmRpbmdCb3hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlciA9IGZ1bmN0aW9uIChhdGxhcylcclxue1xyXG4gICAgdGhpcy5hdGxhcyA9IGF0bGFzO1xyXG59O1xyXG5zcGluZS5BdGxhc0F0dGFjaG1lbnRQYXJzZXIucHJvdG90eXBlID0ge1xyXG4gICAgbmV3UmVnaW9uQXR0YWNobWVudDogZnVuY3Rpb24gKHNraW4sIG5hbWUsIHBhdGgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuYXRsYXMuZmluZFJlZ2lvbihwYXRoKTtcclxuICAgICAgICBpZiAoIXJlZ2lvbikgdGhyb3cgXCJSZWdpb24gbm90IGZvdW5kIGluIGF0bGFzOiBcIiArIHBhdGggKyBcIiAocmVnaW9uIGF0dGFjaG1lbnQ6IFwiICsgbmFtZSArIFwiKVwiO1xyXG4gICAgICAgIHZhciBhdHRhY2htZW50ID0gbmV3IHNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQobmFtZSk7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZW5kZXJlck9iamVjdCA9IHJlZ2lvbjtcclxuICAgICAgICBhdHRhY2htZW50LnNldFVWcyhyZWdpb24udSwgcmVnaW9uLnYsIHJlZ2lvbi51MiwgcmVnaW9uLnYyLCByZWdpb24ucm90YXRlKTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFggPSByZWdpb24ub2Zmc2V0WDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFkgPSByZWdpb24ub2Zmc2V0WTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbldpZHRoID0gcmVnaW9uLndpZHRoO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uSGVpZ2h0ID0gcmVnaW9uLmhlaWdodDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsV2lkdGggPSByZWdpb24ub3JpZ2luYWxXaWR0aDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ID0gcmVnaW9uLm9yaWdpbmFsSGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiBhdHRhY2htZW50O1xyXG4gICAgfSxcclxuICAgIG5ld01lc2hBdHRhY2htZW50OiBmdW5jdGlvbiAoc2tpbiwgbmFtZSwgcGF0aClcclxuICAgIHtcclxuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdGxhcy5maW5kUmVnaW9uKHBhdGgpO1xyXG4gICAgICAgIGlmICghcmVnaW9uKSB0aHJvdyBcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiICsgcGF0aCArIFwiIChtZXNoIGF0dGFjaG1lbnQ6IFwiICsgbmFtZSArIFwiKVwiO1xyXG4gICAgICAgIHZhciBhdHRhY2htZW50ID0gbmV3IHNwaW5lLk1lc2hBdHRhY2htZW50KG5hbWUpO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QgPSByZWdpb247XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25VID0gcmVnaW9uLnU7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25WID0gcmVnaW9uLnY7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25VMiA9IHJlZ2lvbi51MjtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblYyID0gcmVnaW9uLnYyO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uUm90YXRlID0gcmVnaW9uLnJvdGF0ZTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFggPSByZWdpb24ub2Zmc2V0WDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFkgPSByZWdpb24ub2Zmc2V0WTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbldpZHRoID0gcmVnaW9uLndpZHRoO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uSGVpZ2h0ID0gcmVnaW9uLmhlaWdodDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsV2lkdGggPSByZWdpb24ub3JpZ2luYWxXaWR0aDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ID0gcmVnaW9uLm9yaWdpbmFsSGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiBhdHRhY2htZW50O1xyXG4gICAgfSxcclxuICAgIG5ld1NraW5uZWRNZXNoQXR0YWNobWVudDogZnVuY3Rpb24gKHNraW4sIG5hbWUsIHBhdGgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuYXRsYXMuZmluZFJlZ2lvbihwYXRoKTtcclxuICAgICAgICBpZiAoIXJlZ2lvbikgdGhyb3cgXCJSZWdpb24gbm90IGZvdW5kIGluIGF0bGFzOiBcIiArIHBhdGggKyBcIiAoc2tpbm5lZCBtZXNoIGF0dGFjaG1lbnQ6IFwiICsgbmFtZSArIFwiKVwiO1xyXG4gICAgICAgIHZhciBhdHRhY2htZW50ID0gbmV3IHNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudChuYW1lKTtcclxuICAgICAgICBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0ID0gcmVnaW9uO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uVSA9IHJlZ2lvbi51O1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uViA9IHJlZ2lvbi52O1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uVTIgPSByZWdpb24udTI7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25WMiA9IHJlZ2lvbi52MjtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblJvdGF0ZSA9IHJlZ2lvbi5yb3RhdGU7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PZmZzZXRYID0gcmVnaW9uLm9mZnNldFg7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PZmZzZXRZID0gcmVnaW9uLm9mZnNldFk7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25XaWR0aCA9IHJlZ2lvbi53aWR0aDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbkhlaWdodCA9IHJlZ2lvbi5oZWlnaHQ7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PcmlnaW5hbFdpZHRoID0gcmVnaW9uLm9yaWdpbmFsV2lkdGg7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PcmlnaW5hbEhlaWdodCA9IHJlZ2lvbi5vcmlnaW5hbEhlaWdodDtcclxuICAgICAgICByZXR1cm4gYXR0YWNobWVudDtcclxuICAgIH0sXHJcbiAgICBuZXdCb3VuZGluZ0JveEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChza2luLCBuYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiBuZXcgc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50KG5hbWUpO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlcjtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BdGxhc1BhZ2UgPSBmdW5jdGlvbiAoKVxyXG57fTtcclxuc3BpbmUuQXRsYXNQYWdlLnByb3RvdHlwZSA9IHtcclxuICAgIG5hbWU6IG51bGwsXHJcbiAgICBmb3JtYXQ6IG51bGwsXHJcbiAgICBtaW5GaWx0ZXI6IG51bGwsXHJcbiAgICBtYWdGaWx0ZXI6IG51bGwsXHJcbiAgICB1V3JhcDogbnVsbCxcclxuICAgIHZXcmFwOiBudWxsLFxyXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXHJcbiAgICB3aWR0aDogMCxcclxuICAgIGhlaWdodDogMFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzUGFnZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BdGxhc1JlYWRlciA9IGZ1bmN0aW9uICh0ZXh0KVxyXG57XHJcbiAgICB0aGlzLmxpbmVzID0gdGV4dC5zcGxpdCgvXFxyXFxufFxccnxcXG4vKTtcclxufTtcclxuc3BpbmUuQXRsYXNSZWFkZXIucHJvdG90eXBlID0ge1xyXG4gICAgaW5kZXg6IDAsXHJcbiAgICB0cmltOiBmdW5jdGlvbiAodmFsdWUpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csIFwiXCIpO1xyXG4gICAgfSxcclxuICAgIHJlYWRMaW5lOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMubGluZXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gdGhpcy5saW5lc1t0aGlzLmluZGV4KytdO1xyXG4gICAgfSxcclxuICAgIHJlYWRWYWx1ZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB2YXIgbGluZSA9IHRoaXMucmVhZExpbmUoKTtcclxuICAgICAgICB2YXIgY29sb24gPSBsaW5lLmluZGV4T2YoXCI6XCIpO1xyXG4gICAgICAgIGlmIChjb2xvbiA9PSAtMSkgdGhyb3cgXCJJbnZhbGlkIGxpbmU6IFwiICsgbGluZTtcclxuICAgICAgICByZXR1cm4gdGhpcy50cmltKGxpbmUuc3Vic3RyaW5nKGNvbG9uICsgMSkpO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgdHVwbGUgdmFsdWVzIHJlYWQgKDEsIDIgb3IgNCkuICovXHJcbiAgICByZWFkVHVwbGU6IGZ1bmN0aW9uICh0dXBsZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgbGluZSA9IHRoaXMucmVhZExpbmUoKTtcclxuICAgICAgICB2YXIgY29sb24gPSBsaW5lLmluZGV4T2YoXCI6XCIpO1xyXG4gICAgICAgIGlmIChjb2xvbiA9PSAtMSkgdGhyb3cgXCJJbnZhbGlkIGxpbmU6IFwiICsgbGluZTtcclxuICAgICAgICB2YXIgaSA9IDAsIGxhc3RNYXRjaCA9IGNvbG9uICsgMTtcclxuICAgICAgICBmb3IgKDsgaSA8IDM7IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBjb21tYSA9IGxpbmUuaW5kZXhPZihcIixcIiwgbGFzdE1hdGNoKTtcclxuICAgICAgICAgICAgaWYgKGNvbW1hID09IC0xKSBicmVhaztcclxuICAgICAgICAgICAgdHVwbGVbaV0gPSB0aGlzLnRyaW0obGluZS5zdWJzdHIobGFzdE1hdGNoLCBjb21tYSAtIGxhc3RNYXRjaCkpO1xyXG4gICAgICAgICAgICBsYXN0TWF0Y2ggPSBjb21tYSArIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHR1cGxlW2ldID0gdGhpcy50cmltKGxpbmUuc3Vic3RyaW5nKGxhc3RNYXRjaCkpO1xyXG4gICAgICAgIHJldHVybiBpICsgMTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdGxhc1JlYWRlcjtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BdGxhc1JlZ2lvbiA9IGZ1bmN0aW9uICgpXHJcbnt9O1xyXG5zcGluZS5BdGxhc1JlZ2lvbi5wcm90b3R5cGUgPSB7XHJcbiAgICBwYWdlOiBudWxsLFxyXG4gICAgbmFtZTogbnVsbCxcclxuICAgIHg6IDAsIHk6IDAsXHJcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxyXG4gICAgdTogMCwgdjogMCwgdTI6IDAsIHYyOiAwLFxyXG4gICAgb2Zmc2V0WDogMCwgb2Zmc2V0WTogMCxcclxuICAgIG9yaWdpbmFsV2lkdGg6IDAsIG9yaWdpbmFsSGVpZ2h0OiAwLFxyXG4gICAgaW5kZXg6IDAsXHJcbiAgICByb3RhdGU6IGZhbHNlLFxyXG4gICAgc3BsaXRzOiBudWxsLFxyXG4gICAgcGFkczogbnVsbFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzUmVnaW9uO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XHJcbiAgICB0aGlzLmF0dGFjaG1lbnROYW1lcyA9IFtdO1xyXG4gICAgdGhpcy5hdHRhY2htZW50TmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxufTtcclxuc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIHNsb3RJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aDtcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIGF0dGFjaG1lbnROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmF0dGFjaG1lbnROYW1lc1tmcmFtZUluZGV4XSA9IGF0dGFjaG1lbnROYW1lO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGxhc3RUaW1lID4gdGltZSkgdGhpcy5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIE51bWJlci5NQVhfVkFMVUUsIG51bGwsIDApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0VGltZSA+IHRpbWUpIC8vXHJcbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XHJcblxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gdGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdID8gZnJhbWVzLmxlbmd0aCAtIDEgOiBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoMShmcmFtZXMsIHRpbWUpIC0gMTtcclxuICAgICAgICBpZiAoZnJhbWVzW2ZyYW1lSW5kZXhdIDwgbGFzdFRpbWUpIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnROYW1lID0gdGhpcy5hdHRhY2htZW50TmFtZXNbZnJhbWVJbmRleF07XHJcbiAgICAgICAgc2tlbGV0b24uc2xvdHNbdGhpcy5zbG90SW5kZXhdLnNldEF0dGFjaG1lbnQoXHJcbiAgICAgICAgICAgICFhdHRhY2htZW50TmFtZSA/IG51bGwgOiBza2VsZXRvbi5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgodGhpcy5zbG90SW5kZXgsIGF0dGFjaG1lbnROYW1lKSk7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0ge1xyXG4gICAgcmVnaW9uOiAwLFxyXG4gICAgYm91bmRpbmdib3g6IDEsXHJcbiAgICBtZXNoOiAyLFxyXG4gICAgc2tpbm5lZG1lc2g6IDNcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdHRhY2htZW50VHlwZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Cb25lID0gZnVuY3Rpb24gKGJvbmVEYXRhLCBza2VsZXRvbiwgcGFyZW50KVxyXG57XHJcbiAgICB0aGlzLmRhdGEgPSBib25lRGF0YTtcclxuICAgIHRoaXMuc2tlbGV0b24gPSBza2VsZXRvbjtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5zZXRUb1NldHVwUG9zZSgpO1xyXG59O1xyXG5zcGluZS5Cb25lLnlEb3duID0gZmFsc2U7XHJcbnNwaW5lLkJvbmUucHJvdG90eXBlID0ge1xyXG4gICAgeDogMCwgeTogMCxcclxuICAgIHJvdGF0aW9uOiAwLCByb3RhdGlvbklLOiAwLFxyXG4gICAgc2NhbGVYOiAxLCBzY2FsZVk6IDEsXHJcbiAgICBmbGlwWDogZmFsc2UsIGZsaXBZOiBmYWxzZSxcclxuICAgIG0wMDogMCwgbTAxOiAwLCB3b3JsZFg6IDAsIC8vIGEgYiB4XHJcbiAgICBtMTA6IDAsIG0xMTogMCwgd29ybGRZOiAwLCAvLyBjIGQgeVxyXG4gICAgd29ybGRSb3RhdGlvbjogMCxcclxuICAgIHdvcmxkU2NhbGVYOiAxLCB3b3JsZFNjYWxlWTogMSxcclxuICAgIHdvcmxkRmxpcFg6IGZhbHNlLCB3b3JsZEZsaXBZOiBmYWxzZSxcclxuICAgIHVwZGF0ZVdvcmxkVHJhbnNmb3JtOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudDtcclxuICAgICAgICBpZiAocGFyZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFggPSB0aGlzLnggKiBwYXJlbnQubTAwICsgdGhpcy55ICogcGFyZW50Lm0wMSArIHBhcmVudC53b3JsZFg7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRZID0gdGhpcy54ICogcGFyZW50Lm0xMCArIHRoaXMueSAqIHBhcmVudC5tMTEgKyBwYXJlbnQud29ybGRZO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhLmluaGVyaXRTY2FsZSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWCA9IHBhcmVudC53b3JsZFNjYWxlWCAqIHRoaXMuc2NhbGVYO1xyXG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWSA9IHBhcmVudC53b3JsZFNjYWxlWSAqIHRoaXMuc2NhbGVZO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWCA9IHRoaXMuc2NhbGVYO1xyXG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWSA9IHRoaXMuc2NhbGVZO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRSb3RhdGlvbiA9IHRoaXMuZGF0YS5pbmhlcml0Um90YXRpb24gPyAocGFyZW50LndvcmxkUm90YXRpb24gKyB0aGlzLnJvdGF0aW9uSUspIDogdGhpcy5yb3RhdGlvbklLO1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkRmxpcFggPSBwYXJlbnQud29ybGRGbGlwWCAhPSB0aGlzLmZsaXBYO1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkRmxpcFkgPSBwYXJlbnQud29ybGRGbGlwWSAhPSB0aGlzLmZsaXBZO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBza2VsZXRvbkZsaXBYID0gdGhpcy5za2VsZXRvbi5mbGlwWCwgc2tlbGV0b25GbGlwWSA9IHRoaXMuc2tlbGV0b24uZmxpcFk7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRYID0gc2tlbGV0b25GbGlwWCA/IC10aGlzLnggOiB0aGlzLng7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRZID0gKHNrZWxldG9uRmxpcFkgIT0gc3BpbmUuQm9uZS55RG93bikgPyAtdGhpcy55IDogdGhpcy55O1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkU2NhbGVYID0gdGhpcy5zY2FsZVg7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRTY2FsZVkgPSB0aGlzLnNjYWxlWTtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbklLO1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkRmxpcFggPSBza2VsZXRvbkZsaXBYICE9IHRoaXMuZmxpcFg7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRGbGlwWSA9IHNrZWxldG9uRmxpcFkgIT0gdGhpcy5mbGlwWTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJhZGlhbnMgPSB0aGlzLndvcmxkUm90YXRpb24gKiBzcGluZS5kZWdSYWQ7XHJcbiAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKHJhZGlhbnMpO1xyXG4gICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKTtcclxuICAgICAgICBpZiAodGhpcy53b3JsZEZsaXBYKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5tMDAgPSAtY29zICogdGhpcy53b3JsZFNjYWxlWDtcclxuICAgICAgICAgICAgdGhpcy5tMDEgPSBzaW4gKiB0aGlzLndvcmxkU2NhbGVZO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubTAwID0gY29zICogdGhpcy53b3JsZFNjYWxlWDtcclxuICAgICAgICAgICAgdGhpcy5tMDEgPSAtc2luICogdGhpcy53b3JsZFNjYWxlWTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMud29ybGRGbGlwWSAhPSBzcGluZS5Cb25lLnlEb3duKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5tMTAgPSAtc2luICogdGhpcy53b3JsZFNjYWxlWDtcclxuICAgICAgICAgICAgdGhpcy5tMTEgPSAtY29zICogdGhpcy53b3JsZFNjYWxlWTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm0xMCA9IHNpbiAqIHRoaXMud29ybGRTY2FsZVg7XHJcbiAgICAgICAgICAgIHRoaXMubTExID0gY29zICogdGhpcy53b3JsZFNjYWxlWTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgc2V0VG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XHJcbiAgICAgICAgdGhpcy54ID0gZGF0YS54O1xyXG4gICAgICAgIHRoaXMueSA9IGRhdGEueTtcclxuICAgICAgICB0aGlzLnJvdGF0aW9uID0gZGF0YS5yb3RhdGlvbjtcclxuICAgICAgICB0aGlzLnJvdGF0aW9uSUsgPSB0aGlzLnJvdGF0aW9uO1xyXG4gICAgICAgIHRoaXMuc2NhbGVYID0gZGF0YS5zY2FsZVg7XHJcbiAgICAgICAgdGhpcy5zY2FsZVkgPSBkYXRhLnNjYWxlWTtcclxuICAgICAgICB0aGlzLmZsaXBYID0gZGF0YS5mbGlwWDtcclxuICAgICAgICB0aGlzLmZsaXBZID0gZGF0YS5mbGlwWTtcclxuICAgIH0sXHJcbiAgICB3b3JsZFRvTG9jYWw6IGZ1bmN0aW9uICh3b3JsZClcclxuICAgIHtcclxuICAgICAgICB2YXIgZHggPSB3b3JsZFswXSAtIHRoaXMud29ybGRYLCBkeSA9IHdvcmxkWzFdIC0gdGhpcy53b3JsZFk7XHJcbiAgICAgICAgdmFyIG0wMCA9IHRoaXMubTAwLCBtMTAgPSB0aGlzLm0xMCwgbTAxID0gdGhpcy5tMDEsIG0xMSA9IHRoaXMubTExO1xyXG4gICAgICAgIGlmICh0aGlzLndvcmxkRmxpcFggIT0gKHRoaXMud29ybGRGbGlwWSAhPSBzcGluZS5Cb25lLnlEb3duKSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIG0wMCA9IC1tMDA7XHJcbiAgICAgICAgICAgIG0xMSA9IC1tMTE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbnZEZXQgPSAxIC8gKG0wMCAqIG0xMSAtIG0wMSAqIG0xMCk7XHJcbiAgICAgICAgd29ybGRbMF0gPSBkeCAqIG0wMCAqIGludkRldCAtIGR5ICogbTAxICogaW52RGV0O1xyXG4gICAgICAgIHdvcmxkWzFdID0gZHkgKiBtMTEgKiBpbnZEZXQgLSBkeCAqIG0xMCAqIGludkRldDtcclxuICAgIH0sXHJcbiAgICBsb2NhbFRvV29ybGQ6IGZ1bmN0aW9uIChsb2NhbClcclxuICAgIHtcclxuICAgICAgICB2YXIgbG9jYWxYID0gbG9jYWxbMF0sIGxvY2FsWSA9IGxvY2FsWzFdO1xyXG4gICAgICAgIGxvY2FsWzBdID0gbG9jYWxYICogdGhpcy5tMDAgKyBsb2NhbFkgKiB0aGlzLm0wMSArIHRoaXMud29ybGRYO1xyXG4gICAgICAgIGxvY2FsWzFdID0gbG9jYWxYICogdGhpcy5tMTAgKyBsb2NhbFkgKiB0aGlzLm0xMSArIHRoaXMud29ybGRZO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkJvbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQm9uZURhdGEgPSBmdW5jdGlvbiAobmFtZSwgcGFyZW50KVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbn07XHJcbnNwaW5lLkJvbmVEYXRhLnByb3RvdHlwZSA9IHtcclxuICAgIGxlbmd0aDogMCxcclxuICAgIHg6IDAsIHk6IDAsXHJcbiAgICByb3RhdGlvbjogMCxcclxuICAgIHNjYWxlWDogMSwgc2NhbGVZOiAxLFxyXG4gICAgaW5oZXJpdFNjYWxlOiB0cnVlLFxyXG4gICAgaW5oZXJpdFJvdGF0aW9uOiB0cnVlLFxyXG4gICAgZmxpcFg6IGZhbHNlLCBmbGlwWTogZmFsc2VcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Cb25lRGF0YTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcclxuc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50ID0gZnVuY3Rpb24gKG5hbWUpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLnZlcnRpY2VzID0gW107XHJcbn07XHJcbnNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudC5wcm90b3R5cGUgPSB7XHJcbiAgICB0eXBlOiBzcGluZS5BdHRhY2htZW50VHlwZS5ib3VuZGluZ2JveCxcclxuICAgIGNvbXB1dGVXb3JsZFZlcnRpY2VzOiBmdW5jdGlvbiAoeCwgeSwgYm9uZSwgd29ybGRWZXJ0aWNlcylcclxuICAgIHtcclxuICAgICAgICB4ICs9IGJvbmUud29ybGRYO1xyXG4gICAgICAgIHkgKz0gYm9uZS53b3JsZFk7XHJcbiAgICAgICAgdmFyIG0wMCA9IGJvbmUubTAwLCBtMDEgPSBib25lLm0wMSwgbTEwID0gYm9uZS5tMTAsIG0xMSA9IGJvbmUubTExO1xyXG4gICAgICAgIHZhciB2ZXJ0aWNlcyA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGkgPCBuOyBpICs9IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgcHggPSB2ZXJ0aWNlc1tpXTtcclxuICAgICAgICAgICAgdmFyIHB5ID0gdmVydGljZXNbaSArIDFdO1xyXG4gICAgICAgICAgICB3b3JsZFZlcnRpY2VzW2ldID0gcHggKiBtMDAgKyBweSAqIG0wMSArIHg7XHJcbiAgICAgICAgICAgIHdvcmxkVmVydGljZXNbaSArIDFdID0gcHggKiBtMTAgKyBweSAqIG0xMSArIHk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudDtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xyXG5zcGluZS5Db2xvclRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIHIsIGcsIGIsIGEsIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDU7XHJcbn07XHJcbnNwaW5lLkNvbG9yVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgc2xvdEluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gNTtcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIHIsIGcsIGIsIGEpXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSA1O1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSByO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAyXSA9IGc7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDNdID0gYjtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgNF0gPSBhO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgciwgZywgYiwgYTtcclxuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDVdKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICB2YXIgaSA9IGZyYW1lcy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICByID0gZnJhbWVzW2kgLSAzXTtcclxuICAgICAgICAgICAgZyA9IGZyYW1lc1tpIC0gMl07XHJcbiAgICAgICAgICAgIGIgPSBmcmFtZXNbaSAtIDFdO1xyXG4gICAgICAgICAgICBhID0gZnJhbWVzW2ldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIEludGVycG9sYXRlIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIGFuZCB0aGUgY3VycmVudCBmcmFtZS5cclxuICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgNSk7XHJcbiAgICAgICAgICAgIHZhciBwcmV2RnJhbWVSID0gZnJhbWVzW2ZyYW1lSW5kZXggLSA0XTtcclxuICAgICAgICAgICAgdmFyIHByZXZGcmFtZUcgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDNdO1xyXG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lQiA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMl07XHJcbiAgICAgICAgICAgIHZhciBwcmV2RnJhbWVBID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAxXTtcclxuICAgICAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAxIC0gKHRpbWUgLSBmcmFtZVRpbWUpIC8gKGZyYW1lc1tmcmFtZUluZGV4IC0gNS8qUFJFVl9GUkFNRV9USU1FKi9dIC0gZnJhbWVUaW1lKTtcclxuICAgICAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC8gNSAtIDEsIHBlcmNlbnQpO1xyXG5cclxuICAgICAgICAgICAgciA9IHByZXZGcmFtZVIgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAxLypGUkFNRV9SKi9dIC0gcHJldkZyYW1lUikgKiBwZXJjZW50O1xyXG4gICAgICAgICAgICBnID0gcHJldkZyYW1lRyArIChmcmFtZXNbZnJhbWVJbmRleCArIDIvKkZSQU1FX0cqL10gLSBwcmV2RnJhbWVHKSAqIHBlcmNlbnQ7XHJcbiAgICAgICAgICAgIGIgPSBwcmV2RnJhbWVCICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMy8qRlJBTUVfQiovXSAtIHByZXZGcmFtZUIpICogcGVyY2VudDtcclxuICAgICAgICAgICAgYSA9IHByZXZGcmFtZUEgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyA0LypGUkFNRV9BKi9dIC0gcHJldkZyYW1lQSkgKiBwZXJjZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc2xvdCA9IHNrZWxldG9uLnNsb3RzW3RoaXMuc2xvdEluZGV4XTtcclxuICAgICAgICBpZiAoYWxwaGEgPCAxKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc2xvdC5yICs9IChyIC0gc2xvdC5yKSAqIGFscGhhO1xyXG4gICAgICAgICAgICBzbG90LmcgKz0gKGcgLSBzbG90LmcpICogYWxwaGE7XHJcbiAgICAgICAgICAgIHNsb3QuYiArPSAoYiAtIHNsb3QuYikgKiBhbHBoYTtcclxuICAgICAgICAgICAgc2xvdC5hICs9IChhIC0gc2xvdC5hKSAqIGFscGhhO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNsb3QuciA9IHI7XHJcbiAgICAgICAgICAgIHNsb3QuZyA9IGc7XHJcbiAgICAgICAgICAgIHNsb3QuYiA9IGI7XHJcbiAgICAgICAgICAgIHNsb3QuYSA9IGE7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkNvbG9yVGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQ3VydmVzID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gW107IC8vIHR5cGUsIHgsIHksIC4uLlxyXG4gICAgLy90aGlzLmN1cnZlcy5sZW5ndGggPSAoZnJhbWVDb3VudCAtIDEpICogMTkvKkJFWklFUl9TSVpFKi87XHJcbn07XHJcbnNwaW5lLkN1cnZlcy5wcm90b3R5cGUgPSB7XHJcbiAgICBzZXRMaW5lYXI6IGZ1bmN0aW9uIChmcmFtZUluZGV4KVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuY3VydmVzW2ZyYW1lSW5kZXggKiAxOS8qQkVaSUVSX1NJWkUqL10gPSAwLypMSU5FQVIqLztcclxuICAgIH0sXHJcbiAgICBzZXRTdGVwcGVkOiBmdW5jdGlvbiAoZnJhbWVJbmRleClcclxuICAgIHtcclxuICAgICAgICB0aGlzLmN1cnZlc1tmcmFtZUluZGV4ICogMTkvKkJFWklFUl9TSVpFKi9dID0gMS8qU1RFUFBFRCovO1xyXG4gICAgfSxcclxuICAgIC8qKiBTZXRzIHRoZSBjb250cm9sIGhhbmRsZSBwb3NpdGlvbnMgZm9yIGFuIGludGVycG9sYXRpb24gYmV6aWVyIGN1cnZlIHVzZWQgdG8gdHJhbnNpdGlvbiBmcm9tIHRoaXMga2V5ZnJhbWUgdG8gdGhlIG5leHQuXHJcbiAgICAgKiBjeDEgYW5kIGN4MiBhcmUgZnJvbSAwIHRvIDEsIHJlcHJlc2VudGluZyB0aGUgcGVyY2VudCBvZiB0aW1lIGJldHdlZW4gdGhlIHR3byBrZXlmcmFtZXMuIGN5MSBhbmQgY3kyIGFyZSB0aGUgcGVyY2VudCBvZlxyXG4gICAgICogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUga2V5ZnJhbWUncyB2YWx1ZXMuICovXHJcbiAgICBzZXRDdXJ2ZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIGN4MSwgY3kxLCBjeDIsIGN5MilcclxuICAgIHtcclxuICAgICAgICB2YXIgc3ViZGl2MSA9IDEgLyAxMC8qQkVaSUVSX1NFR01FTlRTKi8sIHN1YmRpdjIgPSBzdWJkaXYxICogc3ViZGl2MSwgc3ViZGl2MyA9IHN1YmRpdjIgKiBzdWJkaXYxO1xyXG4gICAgICAgIHZhciBwcmUxID0gMyAqIHN1YmRpdjEsIHByZTIgPSAzICogc3ViZGl2MiwgcHJlNCA9IDYgKiBzdWJkaXYyLCBwcmU1ID0gNiAqIHN1YmRpdjM7XHJcbiAgICAgICAgdmFyIHRtcDF4ID0gLWN4MSAqIDIgKyBjeDIsIHRtcDF5ID0gLWN5MSAqIDIgKyBjeTIsIHRtcDJ4ID0gKGN4MSAtIGN4MikgKiAzICsgMSwgdG1wMnkgPSAoY3kxIC0gY3kyKSAqIDMgKyAxO1xyXG4gICAgICAgIHZhciBkZnggPSBjeDEgKiBwcmUxICsgdG1wMXggKiBwcmUyICsgdG1wMnggKiBzdWJkaXYzLCBkZnkgPSBjeTEgKiBwcmUxICsgdG1wMXkgKiBwcmUyICsgdG1wMnkgKiBzdWJkaXYzO1xyXG4gICAgICAgIHZhciBkZGZ4ID0gdG1wMXggKiBwcmU0ICsgdG1wMnggKiBwcmU1LCBkZGZ5ID0gdG1wMXkgKiBwcmU0ICsgdG1wMnkgKiBwcmU1O1xyXG4gICAgICAgIHZhciBkZGRmeCA9IHRtcDJ4ICogcHJlNSwgZGRkZnkgPSB0bXAyeSAqIHByZTU7XHJcblxyXG4gICAgICAgIHZhciBpID0gZnJhbWVJbmRleCAqIDE5LypCRVpJRVJfU0laRSovO1xyXG4gICAgICAgIHZhciBjdXJ2ZXMgPSB0aGlzLmN1cnZlcztcclxuICAgICAgICBjdXJ2ZXNbaSsrXSA9IDIvKkJFWklFUiovO1xyXG5cclxuICAgICAgICB2YXIgeCA9IGRmeCwgeSA9IGRmeTtcclxuICAgICAgICBmb3IgKHZhciBuID0gaSArIDE5LypCRVpJRVJfU0laRSovIC0gMTsgaSA8IG47IGkgKz0gMilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGN1cnZlc1tpXSA9IHg7XHJcbiAgICAgICAgICAgIGN1cnZlc1tpICsgMV0gPSB5O1xyXG4gICAgICAgICAgICBkZnggKz0gZGRmeDtcclxuICAgICAgICAgICAgZGZ5ICs9IGRkZnk7XHJcbiAgICAgICAgICAgIGRkZnggKz0gZGRkZng7XHJcbiAgICAgICAgICAgIGRkZnkgKz0gZGRkZnk7XHJcbiAgICAgICAgICAgIHggKz0gZGZ4O1xyXG4gICAgICAgICAgICB5ICs9IGRmeTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgZ2V0Q3VydmVQZXJjZW50OiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgcGVyY2VudClcclxuICAgIHtcclxuICAgICAgICBwZXJjZW50ID0gcGVyY2VudCA8IDAgPyAwIDogKHBlcmNlbnQgPiAxID8gMSA6IHBlcmNlbnQpO1xyXG4gICAgICAgIHZhciBjdXJ2ZXMgPSB0aGlzLmN1cnZlcztcclxuICAgICAgICB2YXIgaSA9IGZyYW1lSW5kZXggKiAxOS8qQkVaSUVSX1NJWkUqLztcclxuICAgICAgICB2YXIgdHlwZSA9IGN1cnZlc1tpXTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gMC8qTElORUFSKi8pIHJldHVybiBwZXJjZW50O1xyXG4gICAgICAgIGlmICh0eXBlID09IDEvKlNURVBQRUQqLykgcmV0dXJuIDA7XHJcbiAgICAgICAgaSsrO1xyXG4gICAgICAgIHZhciB4ID0gMDtcclxuICAgICAgICBmb3IgKHZhciBzdGFydCA9IGksIG4gPSBpICsgMTkvKkJFWklFUl9TSVpFKi8gLSAxOyBpIDwgbjsgaSArPSAyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgeCA9IGN1cnZlc1tpXTtcclxuICAgICAgICAgICAgaWYgKHggPj0gcGVyY2VudClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByZXZYLCBwcmV2WTtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IHN0YXJ0KVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZYID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBwcmV2WSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZYID0gY3VydmVzW2kgLSAyXTtcclxuICAgICAgICAgICAgICAgICAgICBwcmV2WSA9IGN1cnZlc1tpIC0gMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJldlkgKyAoY3VydmVzW2kgKyAxXSAtIHByZXZZKSAqIChwZXJjZW50IC0gcHJldlgpIC8gKHggLSBwcmV2WCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHkgPSBjdXJ2ZXNbaSAtIDFdO1xyXG4gICAgICAgIHJldHVybiB5ICsgKDEgLSB5KSAqIChwZXJjZW50IC0geCkgLyAoMSAtIHgpOyAvLyBMYXN0IHBvaW50IGlzIDEsMS5cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5DdXJ2ZXM7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuRHJhd09yZGVyVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgLi4uXHJcbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG4gICAgdGhpcy5kcmF3T3JkZXJzID0gW107XHJcbiAgICB0aGlzLmRyYXdPcmRlcnMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxufTtcclxuc3BpbmUuRHJhd09yZGVyVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgZHJhd09yZGVyKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmRyYXdPcmRlcnNbZnJhbWVJbmRleF0gPSBkcmF3T3JkZXI7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXHJcblxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4O1xyXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV0pIC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgZnJhbWVJbmRleCA9IGZyYW1lcy5sZW5ndGggLSAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxKGZyYW1lcywgdGltZSkgLSAxO1xyXG5cclxuICAgICAgICB2YXIgZHJhd09yZGVyID0gc2tlbGV0b24uZHJhd09yZGVyO1xyXG4gICAgICAgIHZhciBzbG90cyA9IHNrZWxldG9uLnNsb3RzO1xyXG4gICAgICAgIHZhciBkcmF3T3JkZXJUb1NldHVwSW5kZXggPSB0aGlzLmRyYXdPcmRlcnNbZnJhbWVJbmRleF07XHJcbiAgICAgICAgaWYgKGRyYXdPcmRlclRvU2V0dXBJbmRleClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZHJhd09yZGVyVG9TZXR1cEluZGV4Lmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZHJhd09yZGVyW2ldID0gZHJhd09yZGVyVG9TZXR1cEluZGV4W2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5EcmF3T3JkZXJUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5FdmVudCA9IGZ1bmN0aW9uIChkYXRhKVxyXG57XHJcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG59O1xyXG5zcGluZS5FdmVudC5wcm90b3R5cGUgPSB7XHJcbiAgICBpbnRWYWx1ZTogMCxcclxuICAgIGZsb2F0VmFsdWU6IDAsXHJcbiAgICBzdHJpbmdWYWx1ZTogbnVsbFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkV2ZW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkV2ZW50RGF0YSA9IGZ1bmN0aW9uIChuYW1lKVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG59O1xyXG5zcGluZS5FdmVudERhdGEucHJvdG90eXBlID0ge1xyXG4gICAgaW50VmFsdWU6IDAsXHJcbiAgICBmbG9hdFZhbHVlOiAwLFxyXG4gICAgc3RyaW5nVmFsdWU6IG51bGxcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5FdmVudERhdGE7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuRXZlbnRUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XHJcbiAgICB0aGlzLmV2ZW50cyA9IFtdO1xyXG4gICAgdGhpcy5ldmVudHMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxufTtcclxuc3BpbmUuRXZlbnRUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGg7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBldmVudClcclxuICAgIHtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XHJcbiAgICAgICAgdGhpcy5ldmVudHNbZnJhbWVJbmRleF0gPSBldmVudDtcclxuICAgIH0sXHJcbiAgICAvKiogRmlyZXMgZXZlbnRzIGZvciBmcmFtZXMgPiBsYXN0VGltZSBhbmQgPD0gdGltZS4gKi9cclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKCFmaXJlZEV2ZW50cykgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgdmFyIGZyYW1lQ291bnQgPSBmcmFtZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICBpZiAobGFzdFRpbWUgPiB0aW1lKVxyXG4gICAgICAgIHsgLy8gRmlyZSBldmVudHMgYWZ0ZXIgbGFzdCB0aW1lIGZvciBsb29wZWQgYW5pbWF0aW9ucy5cclxuICAgICAgICAgICAgdGhpcy5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIE51bWJlci5NQVhfVkFMVUUsIGZpcmVkRXZlbnRzLCBhbHBoYSk7XHJcbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XHJcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0VGltZSA+PSBmcmFtZXNbZnJhbWVDb3VudCAtIDFdKSAvLyBMYXN0IHRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgZnJhbWVJbmRleDtcclxuICAgICAgICBpZiAobGFzdFRpbWUgPCBmcmFtZXNbMF0pXHJcbiAgICAgICAgICAgIGZyYW1lSW5kZXggPSAwO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoMShmcmFtZXMsIGxhc3RUaW1lKTtcclxuICAgICAgICAgICAgdmFyIGZyYW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgICAgICB3aGlsZSAoZnJhbWVJbmRleCA+IDApXHJcbiAgICAgICAgICAgIHsgLy8gRmlyZSBtdWx0aXBsZSBldmVudHMgd2l0aCB0aGUgc2FtZSBmcmFtZS5cclxuICAgICAgICAgICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleCAtIDFdICE9IGZyYW1lKSBicmVhaztcclxuICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHM7XHJcbiAgICAgICAgZm9yICg7IGZyYW1lSW5kZXggPCBmcmFtZUNvdW50ICYmIHRpbWUgPj0gZnJhbWVzW2ZyYW1lSW5kZXhdOyBmcmFtZUluZGV4KyspXHJcbiAgICAgICAgICAgIGZpcmVkRXZlbnRzLnB1c2goZXZlbnRzW2ZyYW1lSW5kZXhdKTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5FdmVudFRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLkZmZFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107XHJcbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG4gICAgdGhpcy5mcmFtZVZlcnRpY2VzID0gW107XHJcbiAgICB0aGlzLmZyYW1lVmVydGljZXMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxufTtcclxuc3BpbmUuRmZkVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgc2xvdEluZGV4OiAwLFxyXG4gICAgYXR0YWNobWVudDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aDtcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIHZlcnRpY2VzKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lVmVydGljZXNbZnJhbWVJbmRleF0gPSB2ZXJ0aWNlcztcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90ID0gc2tlbGV0b24uc2xvdHNbdGhpcy5zbG90SW5kZXhdO1xyXG4gICAgICAgIGlmIChzbG90LmF0dGFjaG1lbnQgIT0gdGhpcy5hdHRhY2htZW50KSByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cclxuXHJcbiAgICAgICAgdmFyIGZyYW1lVmVydGljZXMgPSB0aGlzLmZyYW1lVmVydGljZXM7XHJcbiAgICAgICAgdmFyIHZlcnRleENvdW50ID0gZnJhbWVWZXJ0aWNlc1swXS5sZW5ndGg7XHJcblxyXG4gICAgICAgIHZhciB2ZXJ0aWNlcyA9IHNsb3QuYXR0YWNobWVudFZlcnRpY2VzO1xyXG4gICAgICAgIGlmICh2ZXJ0aWNlcy5sZW5ndGggIT0gdmVydGV4Q291bnQpIGFscGhhID0gMTtcclxuICAgICAgICB2ZXJ0aWNlcy5sZW5ndGggPSB2ZXJ0ZXhDb3VudDtcclxuXHJcbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSlcclxuICAgICAgICB7IC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgdmFyIGxhc3RWZXJ0aWNlcyA9IGZyYW1lVmVydGljZXNbZnJhbWVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAoYWxwaGEgPCAxKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRleENvdW50OyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaV0gKz0gKGxhc3RWZXJ0aWNlc1tpXSAtIHZlcnRpY2VzW2ldKSAqIGFscGhhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0ZXhDb3VudDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldID0gbGFzdFZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEludGVycG9sYXRlIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIGFuZCB0aGUgY3VycmVudCBmcmFtZS5cclxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxKGZyYW1lcywgdGltZSk7XHJcbiAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggLSAxXSAtIGZyYW1lVGltZSk7XHJcbiAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC0gMSwgcGVyY2VudCA8IDAgPyAwIDogKHBlcmNlbnQgPiAxID8gMSA6IHBlcmNlbnQpKTtcclxuXHJcbiAgICAgICAgdmFyIHByZXZWZXJ0aWNlcyA9IGZyYW1lVmVydGljZXNbZnJhbWVJbmRleCAtIDFdO1xyXG4gICAgICAgIHZhciBuZXh0VmVydGljZXMgPSBmcmFtZVZlcnRpY2VzW2ZyYW1lSW5kZXhdO1xyXG5cclxuICAgICAgICBpZiAoYWxwaGEgPCAxKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0ZXhDb3VudDsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJldiA9IHByZXZWZXJ0aWNlc1tpXTtcclxuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldICs9IChwcmV2ICsgKG5leHRWZXJ0aWNlc1tpXSAtIHByZXYpICogcGVyY2VudCAtIHZlcnRpY2VzW2ldKSAqIGFscGhhO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0ZXhDb3VudDsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJldiA9IHByZXZWZXJ0aWNlc1tpXTtcclxuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldID0gcHJldiArIChuZXh0VmVydGljZXNbaV0gLSBwcmV2KSAqIHBlcmNlbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRmZkVGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuRmxpcFhUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCBmbGlwLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAyO1xyXG59O1xyXG5zcGluZS5GbGlwWFRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGJvbmVJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDI7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBmbGlwKVxyXG4gICAge1xyXG4gICAgICAgIGZyYW1lSW5kZXggKj0gMjtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDFdID0gZmxpcCA/IDEgOiAwO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGxhc3RUaW1lID4gdGltZSkgdGhpcy5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIE51bWJlci5NQVhfVkFMVUUsIG51bGwsIDApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0VGltZSA+IHRpbWUpIC8vXHJcbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDJdID8gZnJhbWVzLmxlbmd0aCA6IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAyKSkgLSAyO1xyXG4gICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleF0gPCBsYXN0VGltZSkgcmV0dXJuO1xyXG4gICAgICAgIHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XS5mbGlwWCA9IGZyYW1lc1tmcmFtZUluZGV4ICsgMV0gIT0gMDtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5GbGlwWFRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLkZsaXBZVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgZmxpcCwgLi4uXHJcbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50ICogMjtcclxufTtcclxuc3BpbmUuRmxpcFlUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBib25lSW5kZXg6IDAsXHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyAyO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgZmxpcClcclxuICAgIHtcclxuICAgICAgICBmcmFtZUluZGV4ICo9IDI7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IGZsaXAgPyAxIDogMDtcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmIChsYXN0VGltZSA+IHRpbWUpIHRoaXMuYXBwbHkoc2tlbGV0b24sIGxhc3RUaW1lLCBOdW1iZXIuTUFYX1ZBTFVFLCBudWxsLCAwKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobGFzdFRpbWUgPiB0aW1lKSAvL1xyXG4gICAgICAgICAgICBsYXN0VGltZSA9IC0xO1xyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSA/IGZyYW1lcy5sZW5ndGggOiBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgMikpIC0gMjtcclxuICAgICAgICBpZiAoZnJhbWVzW2ZyYW1lSW5kZXhdIDwgbGFzdFRpbWUpIHJldHVybjtcclxuICAgICAgICBza2VsZXRvbi5ib25lc1t0aGlzLmJvbmVJbmRleF0uZmxpcFkgPSBmcmFtZXNbZnJhbWVJbmRleCArIDFdICE9IDA7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRmxpcFlUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnQgPSBmdW5jdGlvbiAoZGF0YSwgc2tlbGV0b24pXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB0aGlzLm1peCA9IGRhdGEubWl4O1xyXG4gICAgdGhpcy5iZW5kRGlyZWN0aW9uID0gZGF0YS5iZW5kRGlyZWN0aW9uO1xyXG5cclxuICAgIHRoaXMuYm9uZXMgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gZGF0YS5ib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgdGhpcy5ib25lcy5wdXNoKHNrZWxldG9uLmZpbmRCb25lKGRhdGEuYm9uZXNbaV0ubmFtZSkpO1xyXG4gICAgdGhpcy50YXJnZXQgPSBza2VsZXRvbi5maW5kQm9uZShkYXRhLnRhcmdldC5uYW1lKTtcclxufTtcclxuc3BpbmUuSWtDb25zdHJhaW50LnByb3RvdHlwZSA9IHtcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG4gICAgICAgIHN3aXRjaCAoYm9uZXMubGVuZ3RoKVxyXG4gICAgICAgIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHNwaW5lLklrQ29uc3RyYWludC5hcHBseTEoYm9uZXNbMF0sIHRhcmdldC53b3JsZFgsIHRhcmdldC53b3JsZFksIHRoaXMubWl4KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICBzcGluZS5Ja0NvbnN0cmFpbnQuYXBwbHkyKGJvbmVzWzBdLCBib25lc1sxXSwgdGFyZ2V0LndvcmxkWCwgdGFyZ2V0LndvcmxkWSwgdGhpcy5iZW5kRGlyZWN0aW9uLCB0aGlzLm1peCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLyoqIEFkanVzdHMgdGhlIGJvbmUgcm90YXRpb24gc28gdGhlIHRpcCBpcyBhcyBjbG9zZSB0byB0aGUgdGFyZ2V0IHBvc2l0aW9uIGFzIHBvc3NpYmxlLiBUaGUgdGFyZ2V0IGlzIHNwZWNpZmllZCBpbiB0aGUgd29ybGRcclxuICogY29vcmRpbmF0ZSBzeXN0ZW0uICovXHJcbnNwaW5lLklrQ29uc3RyYWludC5hcHBseTEgPSBmdW5jdGlvbiAoYm9uZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgYWxwaGEpXHJcbntcclxuICAgIHZhciBwYXJlbnRSb3RhdGlvbiA9ICghYm9uZS5kYXRhLmluaGVyaXRSb3RhdGlvbiB8fCAhYm9uZS5wYXJlbnQpID8gMCA6IGJvbmUucGFyZW50LndvcmxkUm90YXRpb247XHJcbiAgICB2YXIgcm90YXRpb24gPSBib25lLnJvdGF0aW9uO1xyXG4gICAgdmFyIHJvdGF0aW9uSUsgPSBNYXRoLmF0YW4yKHRhcmdldFkgLSBib25lLndvcmxkWSwgdGFyZ2V0WCAtIGJvbmUud29ybGRYKSAqIHNwaW5lLnJhZERlZyAtIHBhcmVudFJvdGF0aW9uO1xyXG4gICAgYm9uZS5yb3RhdGlvbklLID0gcm90YXRpb24gKyAocm90YXRpb25JSyAtIHJvdGF0aW9uKSAqIGFscGhhO1xyXG59O1xyXG4vKiogQWRqdXN0cyB0aGUgcGFyZW50IGFuZCBjaGlsZCBib25lIHJvdGF0aW9ucyBzbyB0aGUgdGlwIG9mIHRoZSBjaGlsZCBpcyBhcyBjbG9zZSB0byB0aGUgdGFyZ2V0IHBvc2l0aW9uIGFzIHBvc3NpYmxlLiBUaGVcclxuICogdGFyZ2V0IGlzIHNwZWNpZmllZCBpbiB0aGUgd29ybGQgY29vcmRpbmF0ZSBzeXN0ZW0uXHJcbiAqIEBwYXJhbSBjaGlsZCBBbnkgZGVzY2VuZGFudCBib25lIG9mIHRoZSBwYXJlbnQuICovXHJcbnNwaW5lLklrQ29uc3RyYWludC5hcHBseTIgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZCwgdGFyZ2V0WCwgdGFyZ2V0WSwgYmVuZERpcmVjdGlvbiwgYWxwaGEpXHJcbntcclxuICAgIHZhciBjaGlsZFJvdGF0aW9uID0gY2hpbGQucm90YXRpb24sIHBhcmVudFJvdGF0aW9uID0gcGFyZW50LnJvdGF0aW9uO1xyXG4gICAgaWYgKCFhbHBoYSlcclxuICAgIHtcclxuICAgICAgICBjaGlsZC5yb3RhdGlvbklLID0gY2hpbGRSb3RhdGlvbjtcclxuICAgICAgICBwYXJlbnQucm90YXRpb25JSyA9IHBhcmVudFJvdGF0aW9uO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBwb3NpdGlvblgsIHBvc2l0aW9uWSwgdGVtcFBvc2l0aW9uID0gc3BpbmUudGVtcDtcclxuICAgIHZhciBwYXJlbnRQYXJlbnQgPSBwYXJlbnQucGFyZW50O1xyXG4gICAgaWYgKHBhcmVudFBhcmVudClcclxuICAgIHtcclxuICAgICAgICB0ZW1wUG9zaXRpb25bMF0gPSB0YXJnZXRYO1xyXG4gICAgICAgIHRlbXBQb3NpdGlvblsxXSA9IHRhcmdldFk7XHJcbiAgICAgICAgcGFyZW50UGFyZW50LndvcmxkVG9Mb2NhbCh0ZW1wUG9zaXRpb24pO1xyXG4gICAgICAgIHRhcmdldFggPSAodGVtcFBvc2l0aW9uWzBdIC0gcGFyZW50LngpICogcGFyZW50UGFyZW50LndvcmxkU2NhbGVYO1xyXG4gICAgICAgIHRhcmdldFkgPSAodGVtcFBvc2l0aW9uWzFdIC0gcGFyZW50LnkpICogcGFyZW50UGFyZW50LndvcmxkU2NhbGVZO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0YXJnZXRYIC09IHBhcmVudC54O1xyXG4gICAgICAgIHRhcmdldFkgLT0gcGFyZW50Lnk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2hpbGQucGFyZW50ID09IHBhcmVudClcclxuICAgIHtcclxuICAgICAgICBwb3NpdGlvblggPSBjaGlsZC54O1xyXG4gICAgICAgIHBvc2l0aW9uWSA9IGNoaWxkLnk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRlbXBQb3NpdGlvblswXSA9IGNoaWxkLng7XHJcbiAgICAgICAgdGVtcFBvc2l0aW9uWzFdID0gY2hpbGQueTtcclxuICAgICAgICBjaGlsZC5wYXJlbnQubG9jYWxUb1dvcmxkKHRlbXBQb3NpdGlvbik7XHJcbiAgICAgICAgcGFyZW50LndvcmxkVG9Mb2NhbCh0ZW1wUG9zaXRpb24pO1xyXG4gICAgICAgIHBvc2l0aW9uWCA9IHRlbXBQb3NpdGlvblswXTtcclxuICAgICAgICBwb3NpdGlvblkgPSB0ZW1wUG9zaXRpb25bMV07XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGRYID0gcG9zaXRpb25YICogcGFyZW50LndvcmxkU2NhbGVYLCBjaGlsZFkgPSBwb3NpdGlvblkgKiBwYXJlbnQud29ybGRTY2FsZVk7XHJcbiAgICB2YXIgb2Zmc2V0ID0gTWF0aC5hdGFuMihjaGlsZFksIGNoaWxkWCk7XHJcbiAgICB2YXIgbGVuMSA9IE1hdGguc3FydChjaGlsZFggKiBjaGlsZFggKyBjaGlsZFkgKiBjaGlsZFkpLCBsZW4yID0gY2hpbGQuZGF0YS5sZW5ndGggKiBjaGlsZC53b3JsZFNjYWxlWDtcclxuICAgIC8vIEJhc2VkIG9uIGNvZGUgYnkgUnlhbiBKdWNrZXR0IHdpdGggcGVybWlzc2lvbjogQ29weXJpZ2h0IChjKSAyMDA4LTIwMDkgUnlhbiBKdWNrZXR0LCBodHRwOi8vd3d3LnJ5YW5qdWNrZXR0LmNvbS9cclxuICAgIHZhciBjb3NEZW5vbSA9IDIgKiBsZW4xICogbGVuMjtcclxuICAgIGlmIChjb3NEZW5vbSA8IDAuMDAwMSlcclxuICAgIHtcclxuICAgICAgICBjaGlsZC5yb3RhdGlvbklLID0gY2hpbGRSb3RhdGlvbiArIChNYXRoLmF0YW4yKHRhcmdldFksIHRhcmdldFgpICogc3BpbmUucmFkRGVnIC0gcGFyZW50Um90YXRpb24gLSBjaGlsZFJvdGF0aW9uKSAqIGFscGhhO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBjb3MgPSAodGFyZ2V0WCAqIHRhcmdldFggKyB0YXJnZXRZICogdGFyZ2V0WSAtIGxlbjEgKiBsZW4xIC0gbGVuMiAqIGxlbjIpIC8gY29zRGVub207XHJcbiAgICBpZiAoY29zIDwgLTEpXHJcbiAgICAgICAgY29zID0gLTE7XHJcbiAgICBlbHNlIGlmIChjb3MgPiAxKVxyXG4gICAgICAgIGNvcyA9IDE7XHJcbiAgICB2YXIgY2hpbGRBbmdsZSA9IE1hdGguYWNvcyhjb3MpICogYmVuZERpcmVjdGlvbjtcclxuICAgIHZhciBhZGphY2VudCA9IGxlbjEgKyBsZW4yICogY29zLCBvcHBvc2l0ZSA9IGxlbjIgKiBNYXRoLnNpbihjaGlsZEFuZ2xlKTtcclxuICAgIHZhciBwYXJlbnRBbmdsZSA9IE1hdGguYXRhbjIodGFyZ2V0WSAqIGFkamFjZW50IC0gdGFyZ2V0WCAqIG9wcG9zaXRlLCB0YXJnZXRYICogYWRqYWNlbnQgKyB0YXJnZXRZICogb3Bwb3NpdGUpO1xyXG4gICAgdmFyIHJvdGF0aW9uID0gKHBhcmVudEFuZ2xlIC0gb2Zmc2V0KSAqIHNwaW5lLnJhZERlZyAtIHBhcmVudFJvdGF0aW9uO1xyXG4gICAgaWYgKHJvdGF0aW9uID4gMTgwKVxyXG4gICAgICAgIHJvdGF0aW9uIC09IDM2MDtcclxuICAgIGVsc2UgaWYgKHJvdGF0aW9uIDwgLTE4MCkgLy9cclxuICAgICAgICByb3RhdGlvbiArPSAzNjA7XHJcbiAgICBwYXJlbnQucm90YXRpb25JSyA9IHBhcmVudFJvdGF0aW9uICsgcm90YXRpb24gKiBhbHBoYTtcclxuICAgIHJvdGF0aW9uID0gKGNoaWxkQW5nbGUgKyBvZmZzZXQpICogc3BpbmUucmFkRGVnIC0gY2hpbGRSb3RhdGlvbjtcclxuICAgIGlmIChyb3RhdGlvbiA+IDE4MClcclxuICAgICAgICByb3RhdGlvbiAtPSAzNjA7XHJcbiAgICBlbHNlIGlmIChyb3RhdGlvbiA8IC0xODApIC8vXHJcbiAgICAgICAgcm90YXRpb24gKz0gMzYwO1xyXG4gICAgY2hpbGQucm90YXRpb25JSyA9IGNoaWxkUm90YXRpb24gKyAocm90YXRpb24gKyBwYXJlbnQud29ybGRSb3RhdGlvbiAtIGNoaWxkLnBhcmVudC53b3JsZFJvdGF0aW9uKSAqIGFscGhhO1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLklrQ29uc3RyYWludDtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpIHx8IHt9O1xyXG5zcGluZS5Ja0NvbnN0cmFpbnREYXRhID0gZnVuY3Rpb24gKG5hbWUpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLmJvbmVzID0gW107XHJcbn07XHJcbnNwaW5lLklrQ29uc3RyYWludERhdGEucHJvdG90eXBlID0ge1xyXG4gICAgdGFyZ2V0OiBudWxsLFxyXG4gICAgYmVuZERpcmVjdGlvbjogMSxcclxuICAgIG1peDogMVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLklrQ29uc3RyYWludERhdGE7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKSB8fCB7fTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgbWl4LCBiZW5kRGlyZWN0aW9uLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAzO1xyXG59O1xyXG5zcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBpa0NvbnN0cmFpbnRJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDM7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBtaXgsIGJlbmREaXJlY3Rpb24pXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSAzO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSBtaXg7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDJdID0gYmVuZERpcmVjdGlvbjtcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cclxuXHJcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludCA9IHNrZWxldG9uLmlrQ29uc3RyYWludHNbdGhpcy5pa0NvbnN0cmFpbnRJbmRleF07XHJcblxyXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gM10pXHJcbiAgICAgICAgeyAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXHJcbiAgICAgICAgICAgIGlrQ29uc3RyYWludC5taXggKz0gKGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0gLSBpa0NvbnN0cmFpbnQubWl4KSAqIGFscGhhO1xyXG4gICAgICAgICAgICBpa0NvbnN0cmFpbnQuYmVuZERpcmVjdGlvbiA9IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEludGVycG9sYXRlIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIGFuZCB0aGUgY3VycmVudCBmcmFtZS5cclxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAzKTtcclxuICAgICAgICB2YXIgcHJldkZyYW1lTWl4ID0gZnJhbWVzW2ZyYW1lSW5kZXggKyAtMi8qUFJFVl9GUkFNRV9NSVgqL107XHJcbiAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAtMy8qUFJFVl9GUkFNRV9USU1FKi9dIC0gZnJhbWVUaW1lKTtcclxuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyAzIC0gMSwgcGVyY2VudCk7XHJcblxyXG4gICAgICAgIHZhciBtaXggPSBwcmV2RnJhbWVNaXggKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAxLypGUkFNRV9NSVgqL10gLSBwcmV2RnJhbWVNaXgpICogcGVyY2VudDtcclxuICAgICAgICBpa0NvbnN0cmFpbnQubWl4ICs9IChtaXggLSBpa0NvbnN0cmFpbnQubWl4KSAqIGFscGhhO1xyXG4gICAgICAgIGlrQ29uc3RyYWludC5iZW5kRGlyZWN0aW9uID0gZnJhbWVzW2ZyYW1lSW5kZXggKyAtMS8qUFJFVl9GUkFNRV9CRU5EX0RJUkVDVElPTiovXTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpIHx8IHt9O1xyXG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcclxuc3BpbmUuTWVzaEF0dGFjaG1lbnQgPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxufTtcclxuc3BpbmUuTWVzaEF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xyXG4gICAgdHlwZTogc3BpbmUuQXR0YWNobWVudFR5cGUubWVzaCxcclxuICAgIHZlcnRpY2VzOiBudWxsLFxyXG4gICAgdXZzOiBudWxsLFxyXG4gICAgcmVnaW9uVVZzOiBudWxsLFxyXG4gICAgdHJpYW5nbGVzOiBudWxsLFxyXG4gICAgaHVsbExlbmd0aDogMCxcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICBwYXRoOiBudWxsLFxyXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXHJcbiAgICByZWdpb25VOiAwLCByZWdpb25WOiAwLCByZWdpb25VMjogMCwgcmVnaW9uVjI6IDAsIHJlZ2lvblJvdGF0ZTogZmFsc2UsXHJcbiAgICByZWdpb25PZmZzZXRYOiAwLCByZWdpb25PZmZzZXRZOiAwLFxyXG4gICAgcmVnaW9uV2lkdGg6IDAsIHJlZ2lvbkhlaWdodDogMCxcclxuICAgIHJlZ2lvbk9yaWdpbmFsV2lkdGg6IDAsIHJlZ2lvbk9yaWdpbmFsSGVpZ2h0OiAwLFxyXG4gICAgZWRnZXM6IG51bGwsXHJcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxyXG4gICAgdXBkYXRlVVZzOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMucmVnaW9uVTIgLSB0aGlzLnJlZ2lvblUsIGhlaWdodCA9IHRoaXMucmVnaW9uVjIgLSB0aGlzLnJlZ2lvblY7XHJcbiAgICAgICAgdmFyIG4gPSB0aGlzLnJlZ2lvblVWcy5sZW5ndGg7XHJcbiAgICAgICAgaWYgKCF0aGlzLnV2cyB8fCB0aGlzLnV2cy5sZW5ndGggIT0gbilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMudXZzID0gbmV3IHNwaW5lLkZsb2F0MzJBcnJheShuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMucmVnaW9uUm90YXRlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICs9IDIpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2ldID0gdGhpcy5yZWdpb25VICsgdGhpcy5yZWdpb25VVnNbaSArIDFdICogd2lkdGg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpICsgMV0gPSB0aGlzLnJlZ2lvblYgKyBoZWlnaHQgLSB0aGlzLnJlZ2lvblVWc1tpXSAqIGhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArPSAyKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpXSA9IHRoaXMucmVnaW9uVSArIHRoaXMucmVnaW9uVVZzW2ldICogd2lkdGg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpICsgMV0gPSB0aGlzLnJlZ2lvblYgKyB0aGlzLnJlZ2lvblVWc1tpICsgMV0gKiBoZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgY29tcHV0ZVdvcmxkVmVydGljZXM6IGZ1bmN0aW9uICh4LCB5LCBzbG90LCB3b3JsZFZlcnRpY2VzKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lID0gc2xvdC5ib25lO1xyXG4gICAgICAgIHggKz0gYm9uZS53b3JsZFg7XHJcbiAgICAgICAgeSArPSBib25lLndvcmxkWTtcclxuICAgICAgICB2YXIgbTAwID0gYm9uZS5tMDAsIG0wMSA9IGJvbmUubTAxLCBtMTAgPSBib25lLm0xMCwgbTExID0gYm9uZS5tMTE7XHJcbiAgICAgICAgdmFyIHZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICB2YXIgdmVydGljZXNDb3VudCA9IHZlcnRpY2VzLmxlbmd0aDtcclxuICAgICAgICBpZiAoc2xvdC5hdHRhY2htZW50VmVydGljZXMubGVuZ3RoID09IHZlcnRpY2VzQ291bnQpIHZlcnRpY2VzID0gc2xvdC5hdHRhY2htZW50VmVydGljZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlc0NvdW50OyBpICs9IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdnggPSB2ZXJ0aWNlc1tpXTtcclxuICAgICAgICAgICAgdmFyIHZ5ID0gdmVydGljZXNbaSArIDFdO1xyXG4gICAgICAgICAgICB3b3JsZFZlcnRpY2VzW2ldID0gdnggKiBtMDAgKyB2eSAqIG0wMSArIHg7XHJcbiAgICAgICAgICAgIHdvcmxkVmVydGljZXNbaSArIDFdID0gdnggKiBtMTAgKyB2eSAqIG0xMSArIHk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLk1lc2hBdHRhY2htZW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5SZWdpb25BdHRhY2htZW50ID0gZnVuY3Rpb24gKG5hbWUpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLm9mZnNldCA9IFtdO1xyXG4gICAgdGhpcy5vZmZzZXQubGVuZ3RoID0gODtcclxuICAgIHRoaXMudXZzID0gW107XHJcbiAgICB0aGlzLnV2cy5sZW5ndGggPSA4O1xyXG59O1xyXG5zcGluZS5SZWdpb25BdHRhY2htZW50LnByb3RvdHlwZSA9IHtcclxuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnJlZ2lvbixcclxuICAgIHg6IDAsIHk6IDAsXHJcbiAgICByb3RhdGlvbjogMCxcclxuICAgIHNjYWxlWDogMSwgc2NhbGVZOiAxLFxyXG4gICAgd2lkdGg6IDAsIGhlaWdodDogMCxcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICBwYXRoOiBudWxsLFxyXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXHJcbiAgICByZWdpb25PZmZzZXRYOiAwLCByZWdpb25PZmZzZXRZOiAwLFxyXG4gICAgcmVnaW9uV2lkdGg6IDAsIHJlZ2lvbkhlaWdodDogMCxcclxuICAgIHJlZ2lvbk9yaWdpbmFsV2lkdGg6IDAsIHJlZ2lvbk9yaWdpbmFsSGVpZ2h0OiAwLFxyXG4gICAgc2V0VVZzOiBmdW5jdGlvbiAodSwgdiwgdTIsIHYyLCByb3RhdGUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHV2cyA9IHRoaXMudXZzO1xyXG4gICAgICAgIGlmIChyb3RhdGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1dnNbMi8qWDIqL10gPSB1O1xyXG4gICAgICAgICAgICB1dnNbMy8qWTIqL10gPSB2MjtcclxuICAgICAgICAgICAgdXZzWzQvKlgzKi9dID0gdTtcclxuICAgICAgICAgICAgdXZzWzUvKlkzKi9dID0gdjtcclxuICAgICAgICAgICAgdXZzWzYvKlg0Ki9dID0gdTI7XHJcbiAgICAgICAgICAgIHV2c1s3LypZNCovXSA9IHY7XHJcbiAgICAgICAgICAgIHV2c1swLypYMSovXSA9IHUyO1xyXG4gICAgICAgICAgICB1dnNbMS8qWTEqL10gPSB2MjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB1dnNbMC8qWDEqL10gPSB1O1xyXG4gICAgICAgICAgICB1dnNbMS8qWTEqL10gPSB2MjtcclxuICAgICAgICAgICAgdXZzWzIvKlgyKi9dID0gdTtcclxuICAgICAgICAgICAgdXZzWzMvKlkyKi9dID0gdjtcclxuICAgICAgICAgICAgdXZzWzQvKlgzKi9dID0gdTI7XHJcbiAgICAgICAgICAgIHV2c1s1LypZMyovXSA9IHY7XHJcbiAgICAgICAgICAgIHV2c1s2LypYNCovXSA9IHUyO1xyXG4gICAgICAgICAgICB1dnNbNy8qWTQqL10gPSB2MjtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlT2Zmc2V0OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciByZWdpb25TY2FsZVggPSB0aGlzLndpZHRoIC8gdGhpcy5yZWdpb25PcmlnaW5hbFdpZHRoICogdGhpcy5zY2FsZVg7XHJcbiAgICAgICAgdmFyIHJlZ2lvblNjYWxlWSA9IHRoaXMuaGVpZ2h0IC8gdGhpcy5yZWdpb25PcmlnaW5hbEhlaWdodCAqIHRoaXMuc2NhbGVZO1xyXG4gICAgICAgIHZhciBsb2NhbFggPSAtdGhpcy53aWR0aCAvIDIgKiB0aGlzLnNjYWxlWCArIHRoaXMucmVnaW9uT2Zmc2V0WCAqIHJlZ2lvblNjYWxlWDtcclxuICAgICAgICB2YXIgbG9jYWxZID0gLXRoaXMuaGVpZ2h0IC8gMiAqIHRoaXMuc2NhbGVZICsgdGhpcy5yZWdpb25PZmZzZXRZICogcmVnaW9uU2NhbGVZO1xyXG4gICAgICAgIHZhciBsb2NhbFgyID0gbG9jYWxYICsgdGhpcy5yZWdpb25XaWR0aCAqIHJlZ2lvblNjYWxlWDtcclxuICAgICAgICB2YXIgbG9jYWxZMiA9IGxvY2FsWSArIHRoaXMucmVnaW9uSGVpZ2h0ICogcmVnaW9uU2NhbGVZO1xyXG4gICAgICAgIHZhciByYWRpYW5zID0gdGhpcy5yb3RhdGlvbiAqIHNwaW5lLmRlZ1JhZDtcclxuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MocmFkaWFucyk7XHJcbiAgICAgICAgdmFyIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpO1xyXG4gICAgICAgIHZhciBsb2NhbFhDb3MgPSBsb2NhbFggKiBjb3MgKyB0aGlzLng7XHJcbiAgICAgICAgdmFyIGxvY2FsWFNpbiA9IGxvY2FsWCAqIHNpbjtcclxuICAgICAgICB2YXIgbG9jYWxZQ29zID0gbG9jYWxZICogY29zICsgdGhpcy55O1xyXG4gICAgICAgIHZhciBsb2NhbFlTaW4gPSBsb2NhbFkgKiBzaW47XHJcbiAgICAgICAgdmFyIGxvY2FsWDJDb3MgPSBsb2NhbFgyICogY29zICsgdGhpcy54O1xyXG4gICAgICAgIHZhciBsb2NhbFgyU2luID0gbG9jYWxYMiAqIHNpbjtcclxuICAgICAgICB2YXIgbG9jYWxZMkNvcyA9IGxvY2FsWTIgKiBjb3MgKyB0aGlzLnk7XHJcbiAgICAgICAgdmFyIGxvY2FsWTJTaW4gPSBsb2NhbFkyICogc2luO1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLm9mZnNldDtcclxuICAgICAgICBvZmZzZXRbMC8qWDEqL10gPSBsb2NhbFhDb3MgLSBsb2NhbFlTaW47XHJcbiAgICAgICAgb2Zmc2V0WzEvKlkxKi9dID0gbG9jYWxZQ29zICsgbG9jYWxYU2luO1xyXG4gICAgICAgIG9mZnNldFsyLypYMiovXSA9IGxvY2FsWENvcyAtIGxvY2FsWTJTaW47XHJcbiAgICAgICAgb2Zmc2V0WzMvKlkyKi9dID0gbG9jYWxZMkNvcyArIGxvY2FsWFNpbjtcclxuICAgICAgICBvZmZzZXRbNC8qWDMqL10gPSBsb2NhbFgyQ29zIC0gbG9jYWxZMlNpbjtcclxuICAgICAgICBvZmZzZXRbNS8qWTMqL10gPSBsb2NhbFkyQ29zICsgbG9jYWxYMlNpbjtcclxuICAgICAgICBvZmZzZXRbNi8qWDQqL10gPSBsb2NhbFgyQ29zIC0gbG9jYWxZU2luO1xyXG4gICAgICAgIG9mZnNldFs3LypZNCovXSA9IGxvY2FsWUNvcyArIGxvY2FsWDJTaW47XHJcbiAgICB9LFxyXG4gICAgY29tcHV0ZVZlcnRpY2VzOiBmdW5jdGlvbiAoeCwgeSwgYm9uZSwgdmVydGljZXMpXHJcbiAgICB7XHJcbiAgICAgICAgeCArPSBib25lLndvcmxkWDtcclxuICAgICAgICB5ICs9IGJvbmUud29ybGRZO1xyXG4gICAgICAgIHZhciBtMDAgPSBib25lLm0wMCwgbTAxID0gYm9uZS5tMDEsIG0xMCA9IGJvbmUubTEwLCBtMTEgPSBib25lLm0xMTtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XHJcbiAgICAgICAgdmVydGljZXNbMC8qWDEqL10gPSBvZmZzZXRbMC8qWDEqL10gKiBtMDAgKyBvZmZzZXRbMS8qWTEqL10gKiBtMDEgKyB4O1xyXG4gICAgICAgIHZlcnRpY2VzWzEvKlkxKi9dID0gb2Zmc2V0WzAvKlgxKi9dICogbTEwICsgb2Zmc2V0WzEvKlkxKi9dICogbTExICsgeTtcclxuICAgICAgICB2ZXJ0aWNlc1syLypYMiovXSA9IG9mZnNldFsyLypYMiovXSAqIG0wMCArIG9mZnNldFszLypZMiovXSAqIG0wMSArIHg7XHJcbiAgICAgICAgdmVydGljZXNbMy8qWTIqL10gPSBvZmZzZXRbMi8qWDIqL10gKiBtMTAgKyBvZmZzZXRbMy8qWTIqL10gKiBtMTEgKyB5O1xyXG4gICAgICAgIHZlcnRpY2VzWzQvKlgzKi9dID0gb2Zmc2V0WzQvKlgzKi9dICogbTAwICsgb2Zmc2V0WzUvKlgzKi9dICogbTAxICsgeDtcclxuICAgICAgICB2ZXJ0aWNlc1s1LypYMyovXSA9IG9mZnNldFs0LypYMyovXSAqIG0xMCArIG9mZnNldFs1LypYMyovXSAqIG0xMSArIHk7XHJcbiAgICAgICAgdmVydGljZXNbNi8qWDQqL10gPSBvZmZzZXRbNi8qWDQqL10gKiBtMDAgKyBvZmZzZXRbNy8qWTQqL10gKiBtMDEgKyB4O1xyXG4gICAgICAgIHZlcnRpY2VzWzcvKlk0Ki9dID0gb2Zmc2V0WzYvKlg0Ki9dICogbTEwICsgb2Zmc2V0WzcvKlk0Ki9dICogbTExICsgeTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5SZWdpb25BdHRhY2htZW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJykgfHwge307XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLlJvdGF0ZVRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIGFuZ2xlLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAyO1xyXG59O1xyXG5zcGluZS5Sb3RhdGVUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBib25lSW5kZXg6IDAsXHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyAyO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgYW5nbGUpXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSAyO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSBhbmdsZTtcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cclxuXHJcbiAgICAgICAgdmFyIGJvbmUgPSBza2VsZXRvbi5ib25lc1t0aGlzLmJvbmVJbmRleF07XHJcblxyXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0pXHJcbiAgICAgICAgeyAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXHJcbiAgICAgICAgICAgIHZhciBhbW91bnQgPSBib25lLmRhdGEucm90YXRpb24gKyBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdIC0gYm9uZS5yb3RhdGlvbjtcclxuICAgICAgICAgICAgd2hpbGUgKGFtb3VudCA+IDE4MClcclxuICAgICAgICAgICAgICAgIGFtb3VudCAtPSAzNjA7XHJcbiAgICAgICAgICAgIHdoaWxlIChhbW91bnQgPCAtMTgwKVxyXG4gICAgICAgICAgICAgICAgYW1vdW50ICs9IDM2MDtcclxuICAgICAgICAgICAgYm9uZS5yb3RhdGlvbiArPSBhbW91bnQgKiBhbHBoYTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDIpO1xyXG4gICAgICAgIHZhciBwcmV2RnJhbWVWYWx1ZSA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMV07XHJcbiAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggLSAyLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xyXG4gICAgICAgIHBlcmNlbnQgPSB0aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZnJhbWVJbmRleCAvIDIgLSAxLCBwZXJjZW50KTtcclxuXHJcbiAgICAgICAgdmFyIGFtb3VudCA9IGZyYW1lc1tmcmFtZUluZGV4ICsgMS8qRlJBTUVfVkFMVUUqL10gLSBwcmV2RnJhbWVWYWx1ZTtcclxuICAgICAgICB3aGlsZSAoYW1vdW50ID4gMTgwKVxyXG4gICAgICAgICAgICBhbW91bnQgLT0gMzYwO1xyXG4gICAgICAgIHdoaWxlIChhbW91bnQgPCAtMTgwKVxyXG4gICAgICAgICAgICBhbW91bnQgKz0gMzYwO1xyXG4gICAgICAgIGFtb3VudCA9IGJvbmUuZGF0YS5yb3RhdGlvbiArIChwcmV2RnJhbWVWYWx1ZSArIGFtb3VudCAqIHBlcmNlbnQpIC0gYm9uZS5yb3RhdGlvbjtcclxuICAgICAgICB3aGlsZSAoYW1vdW50ID4gMTgwKVxyXG4gICAgICAgICAgICBhbW91bnQgLT0gMzYwO1xyXG4gICAgICAgIHdoaWxlIChhbW91bnQgPCAtMTgwKVxyXG4gICAgICAgICAgICBhbW91bnQgKz0gMzYwO1xyXG4gICAgICAgIGJvbmUucm90YXRpb24gKz0gYW1vdW50ICogYWxwaGE7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuUm90YXRlVGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuU2NhbGVUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCB4LCB5LCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAzO1xyXG59O1xyXG5zcGluZS5TY2FsZVRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGJvbmVJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDM7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCB4LCB5KVxyXG4gICAge1xyXG4gICAgICAgIGZyYW1lSW5kZXggKj0gMztcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDFdID0geDtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMl0gPSB5O1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgYm9uZSA9IHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtcclxuXHJcbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAzXSlcclxuICAgICAgICB7IC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgYm9uZS5zY2FsZVggKz0gKGJvbmUuZGF0YS5zY2FsZVggKiBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDJdIC0gYm9uZS5zY2FsZVgpICogYWxwaGE7XHJcbiAgICAgICAgICAgIGJvbmUuc2NhbGVZICs9IChib25lLmRhdGEuc2NhbGVZICogZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSAtIGJvbmUuc2NhbGVZKSAqIGFscGhhO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgMyk7XHJcbiAgICAgICAgdmFyIHByZXZGcmFtZVggPSBmcmFtZXNbZnJhbWVJbmRleCAtIDJdO1xyXG4gICAgICAgIHZhciBwcmV2RnJhbWVZID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAxXTtcclxuICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCArIC0zLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xyXG4gICAgICAgIHBlcmNlbnQgPSB0aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZnJhbWVJbmRleCAvIDMgLSAxLCBwZXJjZW50KTtcclxuXHJcbiAgICAgICAgYm9uZS5zY2FsZVggKz0gKGJvbmUuZGF0YS5zY2FsZVggKiAocHJldkZyYW1lWCArIChmcmFtZXNbZnJhbWVJbmRleCArIDEvKkZSQU1FX1gqL10gLSBwcmV2RnJhbWVYKSAqIHBlcmNlbnQpIC0gYm9uZS5zY2FsZVgpICogYWxwaGE7XHJcbiAgICAgICAgYm9uZS5zY2FsZVkgKz0gKGJvbmUuZGF0YS5zY2FsZVkgKiAocHJldkZyYW1lWSArIChmcmFtZXNbZnJhbWVJbmRleCArIDIvKkZSQU1FX1kqL10gLSBwcmV2RnJhbWVZKSAqIHBlcmNlbnQpIC0gYm9uZS5zY2FsZVkpICogYWxwaGE7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2NhbGVUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Cb25lID0gcmVxdWlyZSgnLi9Cb25lJyk7XHJcbnNwaW5lLlNsb3QgPSByZXF1aXJlKCcuL1Nsb3QnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50ID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnQnKTtcclxuc3BpbmUuU2tlbGV0b24gPSBmdW5jdGlvbiAoc2tlbGV0b25EYXRhKVxyXG57XHJcbiAgICB0aGlzLmRhdGEgPSBza2VsZXRvbkRhdGE7XHJcblxyXG4gICAgdGhpcy5ib25lcyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBza2VsZXRvbkRhdGEuYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lRGF0YSA9IHNrZWxldG9uRGF0YS5ib25lc1tpXTtcclxuICAgICAgICB2YXIgcGFyZW50ID0gIWJvbmVEYXRhLnBhcmVudCA/IG51bGwgOiB0aGlzLmJvbmVzW3NrZWxldG9uRGF0YS5ib25lcy5pbmRleE9mKGJvbmVEYXRhLnBhcmVudCldO1xyXG4gICAgICAgIHRoaXMuYm9uZXMucHVzaChuZXcgc3BpbmUuQm9uZShib25lRGF0YSwgdGhpcywgcGFyZW50KSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zbG90cyA9IFtdO1xyXG4gICAgdGhpcy5kcmF3T3JkZXIgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2tlbGV0b25EYXRhLnNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgIHtcclxuICAgICAgICB2YXIgc2xvdERhdGEgPSBza2VsZXRvbkRhdGEuc2xvdHNbaV07XHJcbiAgICAgICAgdmFyIGJvbmUgPSB0aGlzLmJvbmVzW3NrZWxldG9uRGF0YS5ib25lcy5pbmRleE9mKHNsb3REYXRhLmJvbmVEYXRhKV07XHJcbiAgICAgICAgdmFyIHNsb3QgPSBuZXcgc3BpbmUuU2xvdChzbG90RGF0YSwgYm9uZSk7XHJcbiAgICAgICAgdGhpcy5zbG90cy5wdXNoKHNsb3QpO1xyXG4gICAgICAgIHRoaXMuZHJhd09yZGVyLnB1c2goaSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pa0NvbnN0cmFpbnRzID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNrZWxldG9uRGF0YS5pa0NvbnN0cmFpbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB0aGlzLmlrQ29uc3RyYWludHMucHVzaChuZXcgc3BpbmUuSWtDb25zdHJhaW50KHNrZWxldG9uRGF0YS5pa0NvbnN0cmFpbnRzW2ldLCB0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5ib25lQ2FjaGUgPSBbXTtcclxuICAgIHRoaXMudXBkYXRlQ2FjaGUoKTtcclxufTtcclxuc3BpbmUuU2tlbGV0b24ucHJvdG90eXBlID0ge1xyXG4gICAgeDogMCwgeTogMCxcclxuICAgIHNraW46IG51bGwsXHJcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxyXG4gICAgdGltZTogMCxcclxuICAgIGZsaXBYOiBmYWxzZSwgZmxpcFk6IGZhbHNlLFxyXG4gICAgLyoqIENhY2hlcyBpbmZvcm1hdGlvbiBhYm91dCBib25lcyBhbmQgSUsgY29uc3RyYWludHMuIE11c3QgYmUgY2FsbGVkIGlmIGJvbmVzIG9yIElLIGNvbnN0cmFpbnRzIGFyZSBhZGRlZCBvciByZW1vdmVkLiAqL1xyXG4gICAgdXBkYXRlQ2FjaGU6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHMgPSB0aGlzLmlrQ29uc3RyYWludHM7XHJcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHNDb3VudCA9IGlrQ29uc3RyYWludHMubGVuZ3RoO1xyXG5cclxuICAgICAgICB2YXIgYXJyYXlDb3VudCA9IGlrQ29uc3RyYWludHNDb3VudCArIDE7XHJcbiAgICAgICAgdmFyIGJvbmVDYWNoZSA9IHRoaXMuYm9uZUNhY2hlO1xyXG4gICAgICAgIGlmIChib25lQ2FjaGUubGVuZ3RoID4gYXJyYXlDb3VudCkgYm9uZUNhY2hlLmxlbmd0aCA9IGFycmF5Q291bnQ7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lQ2FjaGUubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBib25lQ2FjaGVbaV0ubGVuZ3RoID0gMDtcclxuICAgICAgICB3aGlsZSAoYm9uZUNhY2hlLmxlbmd0aCA8IGFycmF5Q291bnQpXHJcbiAgICAgICAgICAgIGJvbmVDYWNoZVtib25lQ2FjaGUubGVuZ3RoXSA9IFtdO1xyXG5cclxuICAgICAgICB2YXIgbm9uSWtCb25lcyA9IGJvbmVDYWNoZVswXTtcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG5cclxuICAgICAgICBvdXRlcjpcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBib25lID0gYm9uZXNbaV07XHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50ID0gYm9uZTtcclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlrQ29uc3RyYWludHNDb3VudDsgaWkrKylcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaWtDb25zdHJhaW50ID0gaWtDb25zdHJhaW50c1tpaV07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IGlrQ29uc3RyYWludC5ib25lc1swXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGQ9IGlrQ29uc3RyYWludC5ib25lc1tpa0NvbnN0cmFpbnQuYm9uZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA9PSBjaGlsZClcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9uZUNhY2hlW2lpXS5wdXNoKGJvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9uZUNhY2hlW2lpICsgMV0ucHVzaChib25lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZCA9PSBwYXJlbnQpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZCA9IGNoaWxkLnBhcmVudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQ7XHJcbiAgICAgICAgICAgIH0gd2hpbGUgKGN1cnJlbnQpO1xyXG4gICAgICAgICAgICBub25Ja0JvbmVzW25vbklrQm9uZXMubGVuZ3RoXSA9IGJvbmU7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIC8qKiBVcGRhdGVzIHRoZSB3b3JsZCB0cmFuc2Zvcm0gZm9yIGVhY2ggYm9uZS4gKi9cclxuICAgIHVwZGF0ZVdvcmxkVHJhbnNmb3JtOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgYm9uZSA9IGJvbmVzW2ldO1xyXG4gICAgICAgICAgICBib25lLnJvdGF0aW9uSUsgPSBib25lLnJvdGF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaSA9IDAsIGxhc3QgPSB0aGlzLmJvbmVDYWNoZS5sZW5ndGggLSAxO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGNhY2hlQm9uZXMgPSB0aGlzLmJvbmVDYWNoZVtpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IGNhY2hlQm9uZXMubGVuZ3RoOyBpaSA8IG5uOyBpaSsrKVxyXG4gICAgICAgICAgICAgICAgY2FjaGVCb25lc1tpaV0udXBkYXRlV29ybGRUcmFuc2Zvcm0oKTtcclxuICAgICAgICAgICAgaWYgKGkgPT0gbGFzdCkgYnJlYWs7XHJcbiAgICAgICAgICAgIHRoaXMuaWtDb25zdHJhaW50c1tpXS5hcHBseSgpO1xyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIC8qKiBTZXRzIHRoZSBib25lcyBhbmQgc2xvdHMgdG8gdGhlaXIgc2V0dXAgcG9zZSB2YWx1ZXMuICovXHJcbiAgICBzZXRUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB0aGlzLnNldEJvbmVzVG9TZXR1cFBvc2UoKTtcclxuICAgICAgICB0aGlzLnNldFNsb3RzVG9TZXR1cFBvc2UoKTtcclxuICAgIH0sXHJcbiAgICBzZXRCb25lc1RvU2V0dXBQb3NlOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGJvbmVzW2ldLnNldFRvU2V0dXBQb3NlKCk7XHJcblxyXG4gICAgICAgIHZhciBpa0NvbnN0cmFpbnRzID0gdGhpcy5pa0NvbnN0cmFpbnRzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gaWtDb25zdHJhaW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgaWtDb25zdHJhaW50ID0gaWtDb25zdHJhaW50c1tpXTtcclxuICAgICAgICAgICAgaWtDb25zdHJhaW50LmJlbmREaXJlY3Rpb24gPSBpa0NvbnN0cmFpbnQuZGF0YS5iZW5kRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpa0NvbnN0cmFpbnQubWl4ID0gaWtDb25zdHJhaW50LmRhdGEubWl4O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBzZXRTbG90c1RvU2V0dXBQb3NlOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzbG90c1tpXS5zZXRUb1NldHVwUG9zZShpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVzZXREcmF3T3JkZXIoKTtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgcmV0dXJuIG51bGwuICovXHJcbiAgICBnZXRSb290Qm9uZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib25lcy5sZW5ndGggPyB0aGlzLmJvbmVzWzBdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRCb25lOiBmdW5jdGlvbiAoYm9uZU5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGJvbmVzW2ldLmRhdGEubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGJvbmVzW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIC0xIGlmIHRoZSBib25lIHdhcyBub3QgZm91bmQuICovXHJcbiAgICBmaW5kQm9uZUluZGV4OiBmdW5jdGlvbiAoYm9uZU5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGJvbmVzW2ldLmRhdGEubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGk7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZmluZFNsb3Q6IGZ1bmN0aW9uIChzbG90TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0uZGF0YS5uYW1lID09IHNsb3ROYW1lKSByZXR1cm4gc2xvdHNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gLTEgaWYgdGhlIGJvbmUgd2FzIG5vdCBmb3VuZC4gKi9cclxuICAgIGZpbmRTbG90SW5kZXg6IGZ1bmN0aW9uIChzbG90TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0uZGF0YS5uYW1lID09IHNsb3ROYW1lKSByZXR1cm4gaTtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9LFxyXG4gICAgc2V0U2tpbkJ5TmFtZTogZnVuY3Rpb24gKHNraW5OYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBza2luID0gdGhpcy5kYXRhLmZpbmRTa2luKHNraW5OYW1lKTtcclxuICAgICAgICBpZiAoIXNraW4pIHRocm93IFwiU2tpbiBub3QgZm91bmQ6IFwiICsgc2tpbk5hbWU7XHJcbiAgICAgICAgdGhpcy5zZXRTa2luKHNraW4pO1xyXG4gICAgfSxcclxuICAgIC8qKiBTZXRzIHRoZSBza2luIHVzZWQgdG8gbG9vayB1cCBhdHRhY2htZW50cyBiZWZvcmUgbG9va2luZyBpbiB0aGUge0BsaW5rIFNrZWxldG9uRGF0YSNnZXREZWZhdWx0U2tpbigpIGRlZmF1bHQgc2tpbn0uXHJcbiAgICAgKiBBdHRhY2htZW50cyBmcm9tIHRoZSBuZXcgc2tpbiBhcmUgYXR0YWNoZWQgaWYgdGhlIGNvcnJlc3BvbmRpbmcgYXR0YWNobWVudCBmcm9tIHRoZSBvbGQgc2tpbiB3YXMgYXR0YWNoZWQuIElmIHRoZXJlIHdhc1xyXG4gICAgICogbm8gb2xkIHNraW4sIGVhY2ggc2xvdCdzIHNldHVwIG1vZGUgYXR0YWNobWVudCBpcyBhdHRhY2hlZCBmcm9tIHRoZSBuZXcgc2tpbi5cclxuICAgICAqIEBwYXJhbSBuZXdTa2luIE1heSBiZSBudWxsLiAqL1xyXG4gICAgc2V0U2tpbjogZnVuY3Rpb24gKG5ld1NraW4pXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKG5ld1NraW4pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5za2luKVxyXG4gICAgICAgICAgICAgICAgbmV3U2tpbi5fYXR0YWNoQWxsKHRoaXMsIHRoaXMuc2tpbik7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBzbG90LmRhdGEuYXR0YWNobWVudE5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IG5ld1NraW4uZ2V0QXR0YWNobWVudChpLCBuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQpIHNsb3Quc2V0QXR0YWNobWVudChhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5za2luID0gbmV3U2tpbjtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGdldEF0dGFjaG1lbnRCeVNsb3ROYW1lOiBmdW5jdGlvbiAoc2xvdE5hbWUsIGF0dGFjaG1lbnROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLmRhdGEuZmluZFNsb3RJbmRleChzbG90TmFtZSksIGF0dGFjaG1lbnROYW1lKTtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGdldEF0dGFjaG1lbnRCeVNsb3RJbmRleDogZnVuY3Rpb24gKHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2tpbilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gdGhpcy5za2luLmdldEF0dGFjaG1lbnQoc2xvdEluZGV4LCBhdHRhY2htZW50TmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChhdHRhY2htZW50KSByZXR1cm4gYXR0YWNobWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5kZWZhdWx0U2tpbikgcmV0dXJuIHRoaXMuZGF0YS5kZWZhdWx0U2tpbi5nZXRBdHRhY2htZW50KHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUpO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcGFyYW0gYXR0YWNobWVudE5hbWUgTWF5IGJlIG51bGwuICovXHJcbiAgICBzZXRBdHRhY2htZW50OiBmdW5jdGlvbiAoc2xvdE5hbWUsIGF0dGFjaG1lbnROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgc2xvdCA9IHNsb3RzW2ldO1xyXG4gICAgICAgICAgICBpZiAoc2xvdC5kYXRhLm5hbWUgPT0gc2xvdE5hbWUpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGlmIChhdHRhY2htZW50TmFtZSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRhY2htZW50ID0gdGhpcy5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgoaSwgYXR0YWNobWVudE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXR0YWNobWVudCkgdGhyb3cgXCJBdHRhY2htZW50IG5vdCBmb3VuZDogXCIgKyBhdHRhY2htZW50TmFtZSArIFwiLCBmb3Igc2xvdDogXCIgKyBzbG90TmFtZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNsb3Quc2V0QXR0YWNobWVudChhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBcIlNsb3Qgbm90IGZvdW5kOiBcIiArIHNsb3ROYW1lO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZmluZElrQ29uc3RyYWludDogZnVuY3Rpb24gKGlrQ29uc3RyYWludE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHMgPSB0aGlzLmlrQ29uc3RyYWludHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBpa0NvbnN0cmFpbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGlrQ29uc3RyYWludHNbaV0uZGF0YS5uYW1lID09IGlrQ29uc3RyYWludE5hbWUpIHJldHVybiBpa0NvbnN0cmFpbnRzW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGRlbHRhKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMudGltZSArPSBkZWx0YTtcclxuICAgIH0sXHJcbiAgICByZXNldERyYXdPcmRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGhpcy5kcmF3T3JkZXIubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3T3JkZXJbaV0gPSBpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2VsZXRvbjtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lUnVudGltZScpIHx8IHt9O1xyXG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcclxuc3BpbmUuU2tlbGV0b25Cb3VuZHMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgICB0aGlzLnBvbHlnb25Qb29sID0gW107XHJcbiAgICB0aGlzLnBvbHlnb25zID0gW107XHJcbiAgICB0aGlzLmJvdW5kaW5nQm94ZXMgPSBbXTtcclxufTtcclxuc3BpbmUuU2tlbGV0b25Cb3VuZHMucHJvdG90eXBlID0ge1xyXG4gICAgbWluWDogMCwgbWluWTogMCwgbWF4WDogMCwgbWF4WTogMCxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHNrZWxldG9uLCB1cGRhdGVBYWJiKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHNrZWxldG9uLnNsb3RzO1xyXG4gICAgICAgIHZhciBzbG90Q291bnQgPSBzbG90cy5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHggPSBza2VsZXRvbi54LCB5ID0gc2tlbGV0b24ueTtcclxuICAgICAgICB2YXIgYm91bmRpbmdCb3hlcyA9IHRoaXMuYm91bmRpbmdCb3hlcztcclxuICAgICAgICB2YXIgcG9seWdvblBvb2wgPSB0aGlzLnBvbHlnb25Qb29sO1xyXG4gICAgICAgIHZhciBwb2x5Z29ucyA9IHRoaXMucG9seWdvbnM7XHJcblxyXG4gICAgICAgIGJvdW5kaW5nQm94ZXMubGVuZ3RoID0gMDtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgcG9seWdvblBvb2wucHVzaChwb2x5Z29uc1tpXSk7XHJcbiAgICAgICAgcG9seWdvbnMubGVuZ3RoID0gMDtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbG90Q291bnQ7IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XHJcbiAgICAgICAgICAgIHZhciBib3VuZGluZ0JveCA9IHNsb3QuYXR0YWNobWVudDtcclxuICAgICAgICAgICAgaWYgKGJvdW5kaW5nQm94LnR5cGUgIT0gc3BpbmUuQXR0YWNobWVudFR5cGUuYm91bmRpbmdib3gpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBib3VuZGluZ0JveGVzLnB1c2goYm91bmRpbmdCb3gpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHBvb2xDb3VudCA9IHBvbHlnb25Qb29sLmxlbmd0aCwgcG9seWdvbjtcclxuICAgICAgICAgICAgaWYgKHBvb2xDb3VudCA+IDApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHBvbHlnb24gPSBwb2x5Z29uUG9vbFtwb29sQ291bnQgLSAxXTtcclxuICAgICAgICAgICAgICAgIHBvbHlnb25Qb29sLnNwbGljZShwb29sQ291bnQgLSAxLCAxKTtcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICBwb2x5Z29uID0gW107XHJcbiAgICAgICAgICAgIHBvbHlnb25zLnB1c2gocG9seWdvbik7XHJcblxyXG4gICAgICAgICAgICBwb2x5Z29uLmxlbmd0aCA9IGJvdW5kaW5nQm94LnZlcnRpY2VzLmxlbmd0aDtcclxuICAgICAgICAgICAgYm91bmRpbmdCb3guY29tcHV0ZVdvcmxkVmVydGljZXMoeCwgeSwgc2xvdC5ib25lLCBwb2x5Z29uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh1cGRhdGVBYWJiKSB0aGlzLmFhYmJDb21wdXRlKCk7XHJcbiAgICB9LFxyXG4gICAgYWFiYkNvbXB1dGU6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHBvbHlnb25zID0gdGhpcy5wb2x5Z29ucztcclxuICAgICAgICB2YXIgbWluWCA9IE51bWJlci5NQVhfVkFMVUUsIG1pblkgPSBOdW1iZXIuTUFYX1ZBTFVFLCBtYXhYID0gTnVtYmVyLk1JTl9WQUxVRSwgbWF4WSA9IE51bWJlci5NSU5fVkFMVUU7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBwb2x5Z29ucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSBwb2x5Z29uc1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IHZlcnRpY2VzLmxlbmd0aDsgaWkgPCBubjsgaWkgKz0gMilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIHggPSB2ZXJ0aWNlc1tpaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHZlcnRpY2VzW2lpICsgMV07XHJcbiAgICAgICAgICAgICAgICBtaW5YID0gTWF0aC5taW4obWluWCwgeCk7XHJcbiAgICAgICAgICAgICAgICBtaW5ZID0gTWF0aC5taW4obWluWSwgeSk7XHJcbiAgICAgICAgICAgICAgICBtYXhYID0gTWF0aC5tYXgobWF4WCwgeCk7XHJcbiAgICAgICAgICAgICAgICBtYXhZID0gTWF0aC5tYXgobWF4WSwgeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5taW5YID0gbWluWDtcclxuICAgICAgICB0aGlzLm1pblkgPSBtaW5ZO1xyXG4gICAgICAgIHRoaXMubWF4WCA9IG1heFg7XHJcbiAgICAgICAgdGhpcy5tYXhZID0gbWF4WTtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IGNvbnRhaW5zIHRoZSBwb2ludC4gKi9cclxuICAgIGFhYmJDb250YWluc1BvaW50OiBmdW5jdGlvbiAoeCwgeSlcclxuICAgIHtcclxuICAgICAgICByZXR1cm4geCA+PSB0aGlzLm1pblggJiYgeCA8PSB0aGlzLm1heFggJiYgeSA+PSB0aGlzLm1pblkgJiYgeSA8PSB0aGlzLm1heFk7XHJcbiAgICB9LFxyXG4gICAgLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYXhpcyBhbGlnbmVkIGJvdW5kaW5nIGJveCBpbnRlcnNlY3RzIHRoZSBsaW5lIHNlZ21lbnQuICovXHJcbiAgICBhYWJiSW50ZXJzZWN0c1NlZ21lbnQ6IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5MilcclxuICAgIHtcclxuICAgICAgICB2YXIgbWluWCA9IHRoaXMubWluWCwgbWluWSA9IHRoaXMubWluWSwgbWF4WCA9IHRoaXMubWF4WCwgbWF4WSA9IHRoaXMubWF4WTtcclxuICAgICAgICBpZiAoKHgxIDw9IG1pblggJiYgeDIgPD0gbWluWCkgfHwgKHkxIDw9IG1pblkgJiYgeTIgPD0gbWluWSkgfHwgKHgxID49IG1heFggJiYgeDIgPj0gbWF4WCkgfHwgKHkxID49IG1heFkgJiYgeTIgPj0gbWF4WSkpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB2YXIgbSA9ICh5MiAtIHkxKSAvICh4MiAtIHgxKTtcclxuICAgICAgICB2YXIgeSA9IG0gKiAobWluWCAtIHgxKSArIHkxO1xyXG4gICAgICAgIGlmICh5ID4gbWluWSAmJiB5IDwgbWF4WSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgeSA9IG0gKiAobWF4WCAtIHgxKSArIHkxO1xyXG4gICAgICAgIGlmICh5ID4gbWluWSAmJiB5IDwgbWF4WSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgdmFyIHggPSAobWluWSAtIHkxKSAvIG0gKyB4MTtcclxuICAgICAgICBpZiAoeCA+IG1pblggJiYgeCA8IG1heFgpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIHggPSAobWF4WSAtIHkxKSAvIG0gKyB4MTtcclxuICAgICAgICBpZiAoeCA+IG1pblggJiYgeCA8IG1heFgpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IGludGVyc2VjdHMgdGhlIGF4aXMgYWxpZ25lZCBib3VuZGluZyBib3ggb2YgdGhlIHNwZWNpZmllZCBib3VuZHMuICovXHJcbiAgICBhYWJiSW50ZXJzZWN0c1NrZWxldG9uOiBmdW5jdGlvbiAoYm91bmRzKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1pblggPCBib3VuZHMubWF4WCAmJiB0aGlzLm1heFggPiBib3VuZHMubWluWCAmJiB0aGlzLm1pblkgPCBib3VuZHMubWF4WSAmJiB0aGlzLm1heFkgPiBib3VuZHMubWluWTtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0aGUgZmlyc3QgYm91bmRpbmcgYm94IGF0dGFjaG1lbnQgdGhhdCBjb250YWlucyB0aGUgcG9pbnQsIG9yIG51bGwuIFdoZW4gZG9pbmcgbWFueSBjaGVja3MsIGl0IGlzIHVzdWFsbHkgbW9yZVxyXG4gICAgICogZWZmaWNpZW50IHRvIG9ubHkgY2FsbCB0aGlzIG1ldGhvZCBpZiB7QGxpbmsgI2FhYmJDb250YWluc1BvaW50KGZsb2F0LCBmbG9hdCl9IHJldHVybnMgdHJ1ZS4gKi9cclxuICAgIGNvbnRhaW5zUG9pbnQ6IGZ1bmN0aW9uICh4LCB5KVxyXG4gICAge1xyXG4gICAgICAgIHZhciBwb2x5Z29ucyA9IHRoaXMucG9seWdvbnM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBwb2x5Z29ucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvbHlnb25Db250YWluc1BvaW50KHBvbHlnb25zW2ldLCB4LCB5KSkgcmV0dXJuIHRoaXMuYm91bmRpbmdCb3hlc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0aGUgZmlyc3QgYm91bmRpbmcgYm94IGF0dGFjaG1lbnQgdGhhdCBjb250YWlucyB0aGUgbGluZSBzZWdtZW50LCBvciBudWxsLiBXaGVuIGRvaW5nIG1hbnkgY2hlY2tzLCBpdCBpcyB1c3VhbGx5XHJcbiAgICAgKiBtb3JlIGVmZmljaWVudCB0byBvbmx5IGNhbGwgdGhpcyBtZXRob2QgaWYge0BsaW5rICNhYWJiSW50ZXJzZWN0c1NlZ21lbnQoZmxvYXQsIGZsb2F0LCBmbG9hdCwgZmxvYXQpfSByZXR1cm5zIHRydWUuICovXHJcbiAgICBpbnRlcnNlY3RzU2VnbWVudDogZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBwb2x5Z29ucyA9IHRoaXMucG9seWdvbnM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBwb2x5Z29ucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChwb2x5Z29uc1tpXS5pbnRlcnNlY3RzU2VnbWVudCh4MSwgeTEsIHgyLCB5MikpIHJldHVybiB0aGlzLmJvdW5kaW5nQm94ZXNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgcG9seWdvbiBjb250YWlucyB0aGUgcG9pbnQuICovXHJcbiAgICBwb2x5Z29uQ29udGFpbnNQb2ludDogZnVuY3Rpb24gKHBvbHlnb24sIHgsIHkpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIG5uID0gcG9seWdvbi5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHByZXZJbmRleCA9IG5uIC0gMjtcclxuICAgICAgICB2YXIgaW5zaWRlID0gZmFsc2U7XHJcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5uOyBpaSArPSAyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHZlcnRleFkgPSBwb2x5Z29uW2lpICsgMV07XHJcbiAgICAgICAgICAgIHZhciBwcmV2WSA9IHBvbHlnb25bcHJldkluZGV4ICsgMV07XHJcbiAgICAgICAgICAgIGlmICgodmVydGV4WSA8IHkgJiYgcHJldlkgPj0geSkgfHwgKHByZXZZIDwgeSAmJiB2ZXJ0ZXhZID49IHkpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmVydGV4WCA9IHBvbHlnb25baWldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZlcnRleFggKyAoeSAtIHZlcnRleFkpIC8gKHByZXZZIC0gdmVydGV4WSkgKiAocG9seWdvbltwcmV2SW5kZXhdIC0gdmVydGV4WCkgPCB4KSBpbnNpZGUgPSAhaW5zaWRlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByZXZJbmRleCA9IGlpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zaWRlO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIHBvbHlnb24gY29udGFpbnMgdGhlIGxpbmUgc2VnbWVudC4gKi9cclxuICAgIHBvbHlnb25JbnRlcnNlY3RzU2VnbWVudDogZnVuY3Rpb24gKHBvbHlnb24sIHgxLCB5MSwgeDIsIHkyKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBubiA9IHBvbHlnb24ubGVuZ3RoO1xyXG4gICAgICAgIHZhciB3aWR0aDEyID0geDEgLSB4MiwgaGVpZ2h0MTIgPSB5MSAtIHkyO1xyXG4gICAgICAgIHZhciBkZXQxID0geDEgKiB5MiAtIHkxICogeDI7XHJcbiAgICAgICAgdmFyIHgzID0gcG9seWdvbltubiAtIDJdLCB5MyA9IHBvbHlnb25bbm4gLSAxXTtcclxuICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbm47IGlpICs9IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgeDQgPSBwb2x5Z29uW2lpXSwgeTQgPSBwb2x5Z29uW2lpICsgMV07XHJcbiAgICAgICAgICAgIHZhciBkZXQyID0geDMgKiB5NCAtIHkzICogeDQ7XHJcbiAgICAgICAgICAgIHZhciB3aWR0aDM0ID0geDMgLSB4NCwgaGVpZ2h0MzQgPSB5MyAtIHk0O1xyXG4gICAgICAgICAgICB2YXIgZGV0MyA9IHdpZHRoMTIgKiBoZWlnaHQzNCAtIGhlaWdodDEyICogd2lkdGgzNDtcclxuICAgICAgICAgICAgdmFyIHggPSAoZGV0MSAqIHdpZHRoMzQgLSB3aWR0aDEyICogZGV0MikgLyBkZXQzO1xyXG4gICAgICAgICAgICBpZiAoKCh4ID49IHgzICYmIHggPD0geDQpIHx8ICh4ID49IHg0ICYmIHggPD0geDMpKSAmJiAoKHggPj0geDEgJiYgeCA8PSB4MikgfHwgKHggPj0geDIgJiYgeCA8PSB4MSkpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgeSA9IChkZXQxICogaGVpZ2h0MzQgLSBoZWlnaHQxMiAqIGRldDIpIC8gZGV0MztcclxuICAgICAgICAgICAgICAgIGlmICgoKHkgPj0geTMgJiYgeSA8PSB5NCkgfHwgKHkgPj0geTQgJiYgeSA8PSB5MykpICYmICgoeSA+PSB5MSAmJiB5IDw9IHkyKSB8fCAoeSA+PSB5MiAmJiB5IDw9IHkxKSkpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHgzID0geDQ7XHJcbiAgICAgICAgICAgIHkzID0geTQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICBnZXRQb2x5Z29uOiBmdW5jdGlvbiAoYXR0YWNobWVudClcclxuICAgIHtcclxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmJvdW5kaW5nQm94ZXMuaW5kZXhPZihhdHRhY2htZW50KTtcclxuICAgICAgICByZXR1cm4gaW5kZXggPT0gLTEgPyBudWxsIDogdGhpcy5wb2x5Z29uc1tpbmRleF07XHJcbiAgICB9LFxyXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4WCAtIHRoaXMubWluWDtcclxuICAgIH0sXHJcbiAgICBnZXRIZWlnaHQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4WSAtIHRoaXMubWluWTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2VsZXRvbkJvdW5kcztcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Ta2VsZXRvbkRhdGEgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgICB0aGlzLmJvbmVzID0gW107XHJcbiAgICB0aGlzLnNsb3RzID0gW107XHJcbiAgICB0aGlzLnNraW5zID0gW107XHJcbiAgICB0aGlzLmV2ZW50cyA9IFtdO1xyXG4gICAgdGhpcy5hbmltYXRpb25zID0gW107XHJcbiAgICB0aGlzLmlrQ29uc3RyYWludHMgPSBbXTtcclxufTtcclxuc3BpbmUuU2tlbGV0b25EYXRhLnByb3RvdHlwZSA9IHtcclxuICAgIG5hbWU6IG51bGwsXHJcbiAgICBkZWZhdWx0U2tpbjogbnVsbCxcclxuICAgIHdpZHRoOiAwLCBoZWlnaHQ6IDAsXHJcbiAgICB2ZXJzaW9uOiBudWxsLCBoYXNoOiBudWxsLFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kQm9uZTogZnVuY3Rpb24gKGJvbmVOYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChib25lc1tpXS5uYW1lID09IGJvbmVOYW1lKSByZXR1cm4gYm9uZXNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gLTEgaWYgdGhlIGJvbmUgd2FzIG5vdCBmb3VuZC4gKi9cclxuICAgIGZpbmRCb25lSW5kZXg6IGZ1bmN0aW9uIChib25lTmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0ubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGk7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZmluZFNsb3Q6IGZ1bmN0aW9uIChzbG90TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKHNsb3RzW2ldLm5hbWUgPT0gc2xvdE5hbWUpIHJldHVybiBzbG90W2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiAtMSBpZiB0aGUgYm9uZSB3YXMgbm90IGZvdW5kLiAqL1xyXG4gICAgZmluZFNsb3RJbmRleDogZnVuY3Rpb24gKHNsb3ROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChzbG90c1tpXS5uYW1lID09IHNsb3ROYW1lKSByZXR1cm4gaTtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kU2tpbjogZnVuY3Rpb24gKHNraW5OYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBza2lucyA9IHRoaXMuc2tpbnM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBza2lucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChza2luc1tpXS5uYW1lID09IHNraW5OYW1lKSByZXR1cm4gc2tpbnNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuZXZlbnRzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZXZlbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGV2ZW50c1tpXS5uYW1lID09IGV2ZW50TmFtZSkgcmV0dXJuIGV2ZW50c1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRBbmltYXRpb246IGZ1bmN0aW9uIChhbmltYXRpb25OYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBhbmltYXRpb25zID0gdGhpcy5hbmltYXRpb25zO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYW5pbWF0aW9ucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25zW2ldLm5hbWUgPT0gYW5pbWF0aW9uTmFtZSkgcmV0dXJuIGFuaW1hdGlvbnNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kSWtDb25zdHJhaW50OiBmdW5jdGlvbiAoaWtDb25zdHJhaW50TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgaWtDb25zdHJhaW50cyA9IHRoaXMuaWtDb25zdHJhaW50cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGlrQ29uc3RyYWludHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoaWtDb25zdHJhaW50c1tpXS5uYW1lID09IGlrQ29uc3RyYWludE5hbWUpIHJldHVybiBpa0NvbnN0cmFpbnRzW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNrZWxldG9uRGF0YTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Ta2VsZXRvbkRhdGEgPSByZXF1aXJlKCcuL1NrZWxldG9uRGF0YScpO1xyXG5zcGluZS5Cb25lRGF0YSA9IHJlcXVpcmUoJy4vQm9uZURhdGEnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50RGF0YSA9IHJlcXVpcmUoJy4vSWtDb25zdHJhaW50RGF0YScpO1xyXG5zcGluZS5TbG90RGF0YSA9IHJlcXVpcmUoJy4vU2xvdERhdGEnKTtcclxuc3BpbmUuU2tpbiA9IHJlcXVpcmUoJy4vU2tpbicpO1xyXG5zcGluZS5FdmVudERhdGEgPSByZXF1aXJlKCcuL0V2ZW50RGF0YScpO1xyXG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcclxuc3BpbmUuQ29sb3JUaW1lbGluZSA9IHJlcXVpcmUoJy4vQ29sb3JUaW1lbGluZScpO1xyXG5zcGluZS5BdHRhY2htZW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUaW1lbGluZScpO1xyXG5zcGluZS5Sb3RhdGVUaW1lbGluZSA9IHJlcXVpcmUoJy4vUm90YXRlVGltZWxpbmUnKTtcclxuc3BpbmUuU2NhbGVUaW1lbGluZSA9IHJlcXVpcmUoJy4vU2NhbGVUaW1lbGluZScpO1xyXG5zcGluZS5UcmFuc2xhdGVUaW1lbGluZSA9IHJlcXVpcmUoJy4vVHJhbnNsYXRlVGltZWxpbmUnKTtcclxuc3BpbmUuRmxpcFhUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFhUaW1lbGluZScpO1xyXG5zcGluZS5GbGlwWVRpbWVsaW5lID0gcmVxdWlyZSgnLi9GbGlwWVRpbWVsaW5lJyk7XHJcbnNwaW5lLklrQ29uc3RyYWludFRpbWVsaW5lID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnRUaW1lbGluZScpO1xyXG5zcGluZS5GZmRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmZkVGltZWxpbmUnKTtcclxuc3BpbmUuRHJhd09yZGVyVGltZWxpbmUgPSByZXF1aXJlKCcuL0RyYXdPcmRlclRpbWVsaW5lJyk7XHJcbnNwaW5lLkV2ZW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0V2ZW50VGltZWxpbmUnKTtcclxuc3BpbmUuRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLlNrZWxldG9uSnNvblBhcnNlciA9IGZ1bmN0aW9uIChhdHRhY2htZW50TG9hZGVyKVxyXG57XHJcbiAgICB0aGlzLmF0dGFjaG1lbnRMb2FkZXIgPSBhdHRhY2htZW50TG9hZGVyO1xyXG59O1xyXG5zcGluZS5Ta2VsZXRvbkpzb25QYXJzZXIucHJvdG90eXBlID0ge1xyXG4gICAgc2NhbGU6IDEsXHJcbiAgICByZWFkU2tlbGV0b25EYXRhOiBmdW5jdGlvbiAocm9vdCwgbmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgc2tlbGV0b25EYXRhID0gbmV3IHNwaW5lLlNrZWxldG9uRGF0YSgpO1xyXG4gICAgICAgIHNrZWxldG9uRGF0YS5uYW1lID0gbmFtZTtcclxuXHJcbiAgICAgICAgLy8gU2tlbGV0b24uXHJcbiAgICAgICAgdmFyIHNrZWxldG9uTWFwID0gcm9vdFtcInNrZWxldG9uXCJdO1xyXG4gICAgICAgIGlmIChza2VsZXRvbk1hcClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5oYXNoID0gc2tlbGV0b25NYXBbXCJoYXNoXCJdO1xyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEudmVyc2lvbiA9IHNrZWxldG9uTWFwW1wic3BpbmVcIl07XHJcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS53aWR0aCA9IHNrZWxldG9uTWFwW1wid2lkdGhcIl0gfHwgMDtcclxuICAgICAgICAgICAgc2tlbGV0b25EYXRhLmhlaWdodCA9IHNrZWxldG9uTWFwW1wiaGVpZ2h0XCJdIHx8IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBCb25lcy5cclxuICAgICAgICB2YXIgYm9uZXMgPSByb290W1wiYm9uZXNcIl07XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgYm9uZU1hcCA9IGJvbmVzW2ldO1xyXG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGJvbmVNYXBbXCJwYXJlbnRcIl0pXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudCA9IHNrZWxldG9uRGF0YS5maW5kQm9uZShib25lTWFwW1wicGFyZW50XCJdKTtcclxuICAgICAgICAgICAgICAgIGlmICghcGFyZW50KSB0aHJvdyBcIlBhcmVudCBib25lIG5vdCBmb3VuZDogXCIgKyBib25lTWFwW1wicGFyZW50XCJdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBib25lRGF0YSA9IG5ldyBzcGluZS5Cb25lRGF0YShib25lTWFwW1wibmFtZVwiXSwgcGFyZW50KTtcclxuICAgICAgICAgICAgYm9uZURhdGEubGVuZ3RoID0gKGJvbmVNYXBbXCJsZW5ndGhcIl0gfHwgMCkgKiB0aGlzLnNjYWxlO1xyXG4gICAgICAgICAgICBib25lRGF0YS54ID0gKGJvbmVNYXBbXCJ4XCJdIHx8IDApICogdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgYm9uZURhdGEueSA9IChib25lTWFwW1wieVwiXSB8fCAwKSAqIHRoaXMuc2NhbGU7XHJcbiAgICAgICAgICAgIGJvbmVEYXRhLnJvdGF0aW9uID0gKGJvbmVNYXBbXCJyb3RhdGlvblwiXSB8fCAwKTtcclxuICAgICAgICAgICAgYm9uZURhdGEuc2NhbGVYID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcInNjYWxlWFwiKSA/IGJvbmVNYXBbXCJzY2FsZVhcIl0gOiAxO1xyXG4gICAgICAgICAgICBib25lRGF0YS5zY2FsZVkgPSBib25lTWFwLmhhc093blByb3BlcnR5KFwic2NhbGVZXCIpID8gYm9uZU1hcFtcInNjYWxlWVwiXSA6IDE7XHJcbiAgICAgICAgICAgIGJvbmVEYXRhLmluaGVyaXRTY2FsZSA9IGJvbmVNYXAuaGFzT3duUHJvcGVydHkoXCJpbmhlcml0U2NhbGVcIikgPyBib25lTWFwW1wiaW5oZXJpdFNjYWxlXCJdIDogdHJ1ZTtcclxuICAgICAgICAgICAgYm9uZURhdGEuaW5oZXJpdFJvdGF0aW9uID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcImluaGVyaXRSb3RhdGlvblwiKSA/IGJvbmVNYXBbXCJpbmhlcml0Um90YXRpb25cIl0gOiB0cnVlO1xyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuYm9uZXMucHVzaChib25lRGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJSyBjb25zdHJhaW50cy5cclxuICAgICAgICB2YXIgaWsgPSByb290W1wiaWtcIl07XHJcbiAgICAgICAgaWYgKGlrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBpay5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBpa01hcCA9IGlrW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIGlrQ29uc3RyYWludERhdGEgPSBuZXcgc3BpbmUuSWtDb25zdHJhaW50RGF0YShpa01hcFtcIm5hbWVcIl0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBib25lcyA9IGlrTWFwW1wiYm9uZXNcIl07XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IDAsIG5uID0gYm9uZXMubGVuZ3RoOyBpaSA8IG5uOyBpaSsrKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBib25lID0gc2tlbGV0b25EYXRhLmZpbmRCb25lKGJvbmVzW2lpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFib25lKSB0aHJvdyBcIklLIGJvbmUgbm90IGZvdW5kOiBcIiArIGJvbmVzW2lpXTtcclxuICAgICAgICAgICAgICAgICAgICBpa0NvbnN0cmFpbnREYXRhLmJvbmVzLnB1c2goYm9uZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWtDb25zdHJhaW50RGF0YS50YXJnZXQgPSBza2VsZXRvbkRhdGEuZmluZEJvbmUoaWtNYXBbXCJ0YXJnZXRcIl0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpa0NvbnN0cmFpbnREYXRhLnRhcmdldCkgdGhyb3cgXCJUYXJnZXQgYm9uZSBub3QgZm91bmQ6IFwiICsgaWtNYXBbXCJ0YXJnZXRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWtDb25zdHJhaW50RGF0YS5iZW5kRGlyZWN0aW9uID0gKCFpa01hcC5oYXNPd25Qcm9wZXJ0eShcImJlbmRQb3NpdGl2ZVwiKSB8fCBpa01hcFtcImJlbmRQb3NpdGl2ZVwiXSkgPyAxIDogLTE7XHJcbiAgICAgICAgICAgICAgICBpa0NvbnN0cmFpbnREYXRhLm1peCA9IGlrTWFwLmhhc093blByb3BlcnR5KFwibWl4XCIpID8gaWtNYXBbXCJtaXhcIl0gOiAxO1xyXG5cclxuICAgICAgICAgICAgICAgIHNrZWxldG9uRGF0YS5pa0NvbnN0cmFpbnRzLnB1c2goaWtDb25zdHJhaW50RGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNsb3RzLlxyXG4gICAgICAgIHZhciBzbG90cyA9IHJvb3RbXCJzbG90c1wiXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBzbG90TWFwID0gc2xvdHNbaV07XHJcbiAgICAgICAgICAgIHZhciBib25lRGF0YSA9IHNrZWxldG9uRGF0YS5maW5kQm9uZShzbG90TWFwW1wiYm9uZVwiXSk7XHJcbiAgICAgICAgICAgIGlmICghYm9uZURhdGEpIHRocm93IFwiU2xvdCBib25lIG5vdCBmb3VuZDogXCIgKyBzbG90TWFwW1wiYm9uZVwiXTtcclxuICAgICAgICAgICAgdmFyIHNsb3REYXRhID0gbmV3IHNwaW5lLlNsb3REYXRhKHNsb3RNYXBbXCJuYW1lXCJdLCBib25lRGF0YSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY29sb3IgPSBzbG90TWFwW1wiY29sb3JcIl07XHJcbiAgICAgICAgICAgIGlmIChjb2xvcilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgc2xvdERhdGEuciA9IHRoaXMudG9Db2xvcihjb2xvciwgMCk7XHJcbiAgICAgICAgICAgICAgICBzbG90RGF0YS5nID0gdGhpcy50b0NvbG9yKGNvbG9yLCAxKTtcclxuICAgICAgICAgICAgICAgIHNsb3REYXRhLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xyXG4gICAgICAgICAgICAgICAgc2xvdERhdGEuYSA9IHRoaXMudG9Db2xvcihjb2xvciwgMyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNsb3REYXRhLmF0dGFjaG1lbnROYW1lID0gc2xvdE1hcFtcImF0dGFjaG1lbnRcIl07XHJcbiAgICAgICAgICAgIHNsb3REYXRhLmFkZGl0aXZlQmxlbmRpbmcgPSBzbG90TWFwW1wiYWRkaXRpdmVcIl0gJiYgc2xvdE1hcFtcImFkZGl0aXZlXCJdID09IFwidHJ1ZVwiO1xyXG5cclxuICAgICAgICAgICAgc2tlbGV0b25EYXRhLnNsb3RzLnB1c2goc2xvdERhdGEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2tpbnMuXHJcbiAgICAgICAgdmFyIHNraW5zID0gcm9vdFtcInNraW5zXCJdO1xyXG4gICAgICAgIGZvciAodmFyIHNraW5OYW1lIGluIHNraW5zKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFza2lucy5oYXNPd25Qcm9wZXJ0eShza2luTmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB2YXIgc2tpbk1hcCA9IHNraW5zW3NraW5OYW1lXTtcclxuICAgICAgICAgICAgdmFyIHNraW4gPSBuZXcgc3BpbmUuU2tpbihza2luTmFtZSk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHNsb3ROYW1lIGluIHNraW5NYXApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmICghc2tpbk1hcC5oYXNPd25Qcm9wZXJ0eShzbG90TmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHNrZWxldG9uRGF0YS5maW5kU2xvdEluZGV4KHNsb3ROYW1lKTtcclxuICAgICAgICAgICAgICAgIHZhciBzbG90RW50cnkgPSBza2luTWFwW3Nsb3ROYW1lXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dGFjaG1lbnROYW1lIGluIHNsb3RFbnRyeSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNsb3RFbnRyeS5oYXNPd25Qcm9wZXJ0eShhdHRhY2htZW50TmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gdGhpcy5yZWFkQXR0YWNobWVudChza2luLCBhdHRhY2htZW50TmFtZSwgc2xvdEVudHJ5W2F0dGFjaG1lbnROYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQpIHNraW4uYWRkQXR0YWNobWVudChzbG90SW5kZXgsIGF0dGFjaG1lbnROYW1lLCBhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuc2tpbnMucHVzaChza2luKTtcclxuICAgICAgICAgICAgaWYgKHNraW4ubmFtZSA9PSBcImRlZmF1bHRcIikgc2tlbGV0b25EYXRhLmRlZmF1bHRTa2luID0gc2tpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV2ZW50cy5cclxuICAgICAgICB2YXIgZXZlbnRzID0gcm9vdFtcImV2ZW50c1wiXTtcclxuICAgICAgICBmb3IgKHZhciBldmVudE5hbWUgaW4gZXZlbnRzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFldmVudHMuaGFzT3duUHJvcGVydHkoZXZlbnROYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHZhciBldmVudE1hcCA9IGV2ZW50c1tldmVudE5hbWVdO1xyXG4gICAgICAgICAgICB2YXIgZXZlbnREYXRhID0gbmV3IHNwaW5lLkV2ZW50RGF0YShldmVudE5hbWUpO1xyXG4gICAgICAgICAgICBldmVudERhdGEuaW50VmFsdWUgPSBldmVudE1hcFtcImludFwiXSB8fCAwO1xyXG4gICAgICAgICAgICBldmVudERhdGEuZmxvYXRWYWx1ZSA9IGV2ZW50TWFwW1wiZmxvYXRcIl0gfHwgMDtcclxuICAgICAgICAgICAgZXZlbnREYXRhLnN0cmluZ1ZhbHVlID0gZXZlbnRNYXBbXCJzdHJpbmdcIl0gfHwgbnVsbDtcclxuICAgICAgICAgICAgc2tlbGV0b25EYXRhLmV2ZW50cy5wdXNoKGV2ZW50RGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBBbmltYXRpb25zLlxyXG4gICAgICAgIHZhciBhbmltYXRpb25zID0gcm9vdFtcImFuaW1hdGlvbnNcIl07XHJcbiAgICAgICAgZm9yICh2YXIgYW5pbWF0aW9uTmFtZSBpbiBhbmltYXRpb25zKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFhbmltYXRpb25zLmhhc093blByb3BlcnR5KGFuaW1hdGlvbk5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgdGhpcy5yZWFkQW5pbWF0aW9uKGFuaW1hdGlvbk5hbWUsIGFuaW1hdGlvbnNbYW5pbWF0aW9uTmFtZV0sIHNrZWxldG9uRGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc2tlbGV0b25EYXRhO1xyXG4gICAgfSxcclxuICAgIHJlYWRBdHRhY2htZW50OiBmdW5jdGlvbiAoc2tpbiwgbmFtZSwgbWFwKVxyXG4gICAge1xyXG4gICAgICAgIG5hbWUgPSBtYXBbXCJuYW1lXCJdIHx8IG5hbWU7XHJcblxyXG4gICAgICAgIHZhciB0eXBlID0gc3BpbmUuQXR0YWNobWVudFR5cGVbbWFwW1widHlwZVwiXSB8fCBcInJlZ2lvblwiXTtcclxuICAgICAgICB2YXIgcGF0aCA9IG1hcFtcInBhdGhcIl0gfHwgbmFtZTtcclxuXHJcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5zY2FsZTtcclxuICAgICAgICBpZiAodHlwZSA9PSBzcGluZS5BdHRhY2htZW50VHlwZS5yZWdpb24pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdHRhY2htZW50TG9hZGVyLm5ld1JlZ2lvbkF0dGFjaG1lbnQoc2tpbiwgbmFtZSwgcGF0aCk7XHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmVnaW9uLnBhdGggPSBwYXRoO1xyXG4gICAgICAgICAgICByZWdpb24ueCA9IChtYXBbXCJ4XCJdIHx8IDApICogc2NhbGU7XHJcbiAgICAgICAgICAgIHJlZ2lvbi55ID0gKG1hcFtcInlcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgcmVnaW9uLnNjYWxlWCA9IG1hcC5oYXNPd25Qcm9wZXJ0eShcInNjYWxlWFwiKSA/IG1hcFtcInNjYWxlWFwiXSA6IDE7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5zY2FsZVkgPSBtYXAuaGFzT3duUHJvcGVydHkoXCJzY2FsZVlcIikgPyBtYXBbXCJzY2FsZVlcIl0gOiAxO1xyXG4gICAgICAgICAgICByZWdpb24ucm90YXRpb24gPSBtYXBbXCJyb3RhdGlvblwiXSB8fCAwO1xyXG4gICAgICAgICAgICByZWdpb24ud2lkdGggPSAobWFwW1wid2lkdGhcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgcmVnaW9uLmhlaWdodCA9IChtYXBbXCJoZWlnaHRcIl0gfHwgMCkgKiBzY2FsZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjb2xvciA9IG1hcFtcImNvbG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoY29sb3IpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi5yID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi5nID0gdGhpcy50b0NvbG9yKGNvbG9yLCAxKTtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi5iID0gdGhpcy50b0NvbG9yKGNvbG9yLCAyKTtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi5hID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVnaW9uLnVwZGF0ZU9mZnNldCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVnaW9uO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PSBzcGluZS5BdHRhY2htZW50VHlwZS5tZXNoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmF0dGFjaG1lbnRMb2FkZXIubmV3TWVzaEF0dGFjaG1lbnQoc2tpbiwgbmFtZSwgcGF0aCk7XHJcbiAgICAgICAgICAgIGlmICghbWVzaCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIG1lc2gucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgIG1lc2gudmVydGljZXMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInZlcnRpY2VzXCIsIHNjYWxlKTtcclxuICAgICAgICAgICAgbWVzaC50cmlhbmdsZXMgPSB0aGlzLmdldEludEFycmF5KG1hcCwgXCJ0cmlhbmdsZXNcIik7XHJcbiAgICAgICAgICAgIG1lc2gucmVnaW9uVVZzID0gdGhpcy5nZXRGbG9hdEFycmF5KG1hcCwgXCJ1dnNcIiwgMSk7XHJcbiAgICAgICAgICAgIG1lc2gudXBkYXRlVVZzKCk7XHJcblxyXG4gICAgICAgICAgICBjb2xvciA9IG1hcFtcImNvbG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoY29sb3IpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG1lc2guciA9IHRoaXMudG9Db2xvcihjb2xvciwgMCk7XHJcbiAgICAgICAgICAgICAgICBtZXNoLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xyXG4gICAgICAgICAgICAgICAgbWVzaC5iID0gdGhpcy50b0NvbG9yKGNvbG9yLCAyKTtcclxuICAgICAgICAgICAgICAgIG1lc2guYSA9IHRoaXMudG9Db2xvcihjb2xvciwgMyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG1lc2guaHVsbExlbmd0aCA9IChtYXBbXCJodWxsXCJdIHx8IDApICogMjtcclxuICAgICAgICAgICAgaWYgKG1hcFtcImVkZ2VzXCJdKSBtZXNoLmVkZ2VzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwiZWRnZXNcIik7XHJcbiAgICAgICAgICAgIG1lc2gud2lkdGggPSAobWFwW1wid2lkdGhcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgbWVzaC5oZWlnaHQgPSAobWFwW1wiaGVpZ2h0XCJdIHx8IDApICogc2NhbGU7XHJcbiAgICAgICAgICAgIHJldHVybiBtZXNoO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PSBzcGluZS5BdHRhY2htZW50VHlwZS5za2lubmVkbWVzaClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBtZXNoID0gdGhpcy5hdHRhY2htZW50TG9hZGVyLm5ld1NraW5uZWRNZXNoQXR0YWNobWVudChza2luLCBuYW1lLCBwYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFtZXNoKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgbWVzaC5wYXRoID0gcGF0aDtcclxuXHJcbiAgICAgICAgICAgIHZhciB1dnMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInV2c1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHZlcnRpY2VzID0gdGhpcy5nZXRGbG9hdEFycmF5KG1hcCwgXCJ2ZXJ0aWNlc1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHdlaWdodHMgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGJvbmVzID0gW107XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmVydGljZXMubGVuZ3RoOyBpIDwgbjsgKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYm9uZUNvdW50ID0gdmVydGljZXNbaSsrXSB8IDA7XHJcbiAgICAgICAgICAgICAgICBib25lc1tib25lcy5sZW5ndGhdID0gYm9uZUNvdW50O1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbm4gPSBpICsgYm9uZUNvdW50ICogNDsgaSA8IG5uOyApXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYm9uZXNbYm9uZXMubGVuZ3RoXSA9IHZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIHdlaWdodHNbd2VpZ2h0cy5sZW5ndGhdID0gdmVydGljZXNbaSArIDFdICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgd2VpZ2h0c1t3ZWlnaHRzLmxlbmd0aF0gPSB2ZXJ0aWNlc1tpICsgMl0gKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICB3ZWlnaHRzW3dlaWdodHMubGVuZ3RoXSA9IHZlcnRpY2VzW2kgKyAzXTtcclxuICAgICAgICAgICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWVzaC5ib25lcyA9IGJvbmVzO1xyXG4gICAgICAgICAgICBtZXNoLndlaWdodHMgPSB3ZWlnaHRzO1xyXG4gICAgICAgICAgICBtZXNoLnRyaWFuZ2xlcyA9IHRoaXMuZ2V0SW50QXJyYXkobWFwLCBcInRyaWFuZ2xlc1wiKTtcclxuICAgICAgICAgICAgbWVzaC5yZWdpb25VVnMgPSB1dnM7XHJcbiAgICAgICAgICAgIG1lc2gudXBkYXRlVVZzKCk7XHJcblxyXG4gICAgICAgICAgICBjb2xvciA9IG1hcFtcImNvbG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoY29sb3IpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG1lc2guciA9IHRoaXMudG9Db2xvcihjb2xvciwgMCk7XHJcbiAgICAgICAgICAgICAgICBtZXNoLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xyXG4gICAgICAgICAgICAgICAgbWVzaC5iID0gdGhpcy50b0NvbG9yKGNvbG9yLCAyKTtcclxuICAgICAgICAgICAgICAgIG1lc2guYSA9IHRoaXMudG9Db2xvcihjb2xvciwgMyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG1lc2guaHVsbExlbmd0aCA9IChtYXBbXCJodWxsXCJdIHx8IDApICogMjtcclxuICAgICAgICAgICAgaWYgKG1hcFtcImVkZ2VzXCJdKSBtZXNoLmVkZ2VzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwiZWRnZXNcIik7XHJcbiAgICAgICAgICAgIG1lc2gud2lkdGggPSAobWFwW1wid2lkdGhcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgbWVzaC5oZWlnaHQgPSAobWFwW1wiaGVpZ2h0XCJdIHx8IDApICogc2NhbGU7XHJcbiAgICAgICAgICAgIHJldHVybiBtZXNoO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PSBzcGluZS5BdHRhY2htZW50VHlwZS5ib3VuZGluZ2JveClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gdGhpcy5hdHRhY2htZW50TG9hZGVyLm5ld0JvdW5kaW5nQm94QXR0YWNobWVudChza2luLCBuYW1lKTtcclxuICAgICAgICAgICAgdmFyIHZlcnRpY2VzID0gbWFwW1widmVydGljZXNcIl07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmVydGljZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgYXR0YWNobWVudC52ZXJ0aWNlcy5wdXNoKHZlcnRpY2VzW2ldICogc2NhbGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXR0YWNobWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgXCJVbmtub3duIGF0dGFjaG1lbnQgdHlwZTogXCIgKyB0eXBlO1xyXG4gICAgfSxcclxuICAgIHJlYWRBbmltYXRpb246IGZ1bmN0aW9uIChuYW1lLCBtYXAsIHNrZWxldG9uRGF0YSlcclxuICAgIHtcclxuICAgICAgICB2YXIgdGltZWxpbmVzID0gW107XHJcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gMDtcclxuXHJcbiAgICAgICAgdmFyIHNsb3RzID0gbWFwW1wic2xvdHNcIl07XHJcbiAgICAgICAgZm9yICh2YXIgc2xvdE5hbWUgaW4gc2xvdHMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIXNsb3RzLmhhc093blByb3BlcnR5KHNsb3ROYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHZhciBzbG90TWFwID0gc2xvdHNbc2xvdE5hbWVdO1xyXG4gICAgICAgICAgICB2YXIgc2xvdEluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRTbG90SW5kZXgoc2xvdE5hbWUpO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgdGltZWxpbmVOYW1lIGluIHNsb3RNYXApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmICghc2xvdE1hcC5oYXNPd25Qcm9wZXJ0eSh0aW1lbGluZU5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBzbG90TWFwW3RpbWVsaW5lTmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZiAodGltZWxpbmVOYW1lID09IFwiY29sb3JcIilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuQ29sb3JUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zbG90SW5kZXggPSBzbG90SW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IHZhbHVlTWFwW1wiY29sb3JcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMudG9Db2xvcihjb2xvciwgMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCByLCBnLCBiLCBhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkQ3VydmUodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAqIDUgLSA1XSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aW1lbGluZU5hbWUgPT0gXCJhdHRhY2htZW50XCIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zbG90SW5kZXggPSBzbG90SW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgrKywgdmFsdWVNYXBbXCJ0aW1lXCJdLCB2YWx1ZU1hcFtcIm5hbWVcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAtIDFdKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIkludmFsaWQgdGltZWxpbmUgdHlwZSBmb3IgYSBzbG90OiBcIiArIHRpbWVsaW5lTmFtZSArIFwiIChcIiArIHNsb3ROYW1lICsgXCIpXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBib25lcyA9IG1hcFtcImJvbmVzXCJdO1xyXG4gICAgICAgIGZvciAodmFyIGJvbmVOYW1lIGluIGJvbmVzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFib25lcy5oYXNPd25Qcm9wZXJ0eShib25lTmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB2YXIgYm9uZUluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRCb25lSW5kZXgoYm9uZU5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoYm9uZUluZGV4ID09IC0xKSB0aHJvdyBcIkJvbmUgbm90IGZvdW5kOiBcIiArIGJvbmVOYW1lO1xyXG4gICAgICAgICAgICB2YXIgYm9uZU1hcCA9IGJvbmVzW2JvbmVOYW1lXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIHRpbWVsaW5lTmFtZSBpbiBib25lTWFwKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWJvbmVNYXAuaGFzT3duUHJvcGVydHkodGltZWxpbmVOYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gYm9uZU1hcFt0aW1lbGluZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVsaW5lTmFtZSA9PSBcInJvdGF0ZVwiKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5Sb3RhdGVUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5ib25lSW5kZXggPSBib25lSW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgsIHZhbHVlTWFwW1widGltZVwiXSwgdmFsdWVNYXBbXCJhbmdsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5nZXRGcmFtZUNvdW50KCkgKiAyIC0gMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZWxpbmVOYW1lID09IFwidHJhbnNsYXRlXCIgfHwgdGltZWxpbmVOYW1lID09IFwic2NhbGVcIilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lbGluZU5hbWUgPT0gXCJzY2FsZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZSA9IG5ldyBzcGluZS5TY2FsZVRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lID0gbmV3IHNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZVNjYWxlID0gdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuYm9uZUluZGV4ID0gYm9uZUluZGV4O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeCA9ICh2YWx1ZU1hcFtcInhcIl0gfHwgMCkgKiB0aW1lbGluZVNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9ICh2YWx1ZU1hcFtcInlcIl0gfHwgMCkgKiB0aW1lbGluZVNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4LCB2YWx1ZU1hcFtcInRpbWVcIl0sIHgsIHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWRDdXJ2ZSh0aW1lbGluZSwgZnJhbWVJbmRleCwgdmFsdWVNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpICogMyAtIDNdKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWVsaW5lTmFtZSA9PSBcImZsaXBYXCIgfHwgdGltZWxpbmVOYW1lID09IFwiZmxpcFlcIilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHRpbWVsaW5lTmFtZSA9PSBcImZsaXBYXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0geCA/IG5ldyBzcGluZS5GbGlwWFRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpIDogbmV3IHNwaW5lLkZsaXBZVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuYm9uZUluZGV4ID0gYm9uZUluZGV4O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSB4ID8gXCJ4XCIgOiBcInlcIjtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4LCB2YWx1ZU1hcFtcInRpbWVcIl0sIHZhbHVlTWFwW2ZpZWxkXSB8fCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5nZXRGcmFtZUNvdW50KCkgKiAyIC0gMl0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJJbnZhbGlkIHRpbWVsaW5lIHR5cGUgZm9yIGEgYm9uZTogXCIgKyB0aW1lbGluZU5hbWUgKyBcIiAoXCIgKyBib25lTmFtZSArIFwiKVwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgaWtNYXAgPSBtYXBbXCJpa1wiXTtcclxuICAgICAgICBmb3IgKHZhciBpa0NvbnN0cmFpbnROYW1lIGluIGlrTWFwKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFpa01hcC5oYXNPd25Qcm9wZXJ0eShpa0NvbnN0cmFpbnROYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBza2VsZXRvbkRhdGEuZmluZElrQ29uc3RyYWludChpa0NvbnN0cmFpbnROYW1lKTtcclxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGlrTWFwW2lrQ29uc3RyYWludE5hbWVdO1xyXG4gICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHRpbWVsaW5lLmlrQ29uc3RyYWludEluZGV4ID0gc2tlbGV0b25EYXRhLmlrQ29uc3RyYWludHMuaW5kZXhPZihpa0NvbnN0cmFpbnQpO1xyXG4gICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1peCA9IHZhbHVlTWFwLmhhc093blByb3BlcnR5KFwibWl4XCIpID8gdmFsdWVNYXBbXCJtaXhcIl0gOiAxO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJlbmREaXJlY3Rpb24gPSAoIXZhbHVlTWFwLmhhc093blByb3BlcnR5KFwiYmVuZFBvc2l0aXZlXCIpIHx8IHZhbHVlTWFwW1wiYmVuZFBvc2l0aXZlXCJdKSA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgsIHZhbHVlTWFwW1widGltZVwiXSwgbWl4LCBiZW5kRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XHJcbiAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZnJhbWVDb3VudCAqIDMgLSAzXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZmZkID0gbWFwW1wiZmZkXCJdO1xyXG4gICAgICAgIGZvciAodmFyIHNraW5OYW1lIGluIGZmZClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBza2luID0gc2tlbGV0b25EYXRhLmZpbmRTa2luKHNraW5OYW1lKTtcclxuICAgICAgICAgICAgdmFyIHNsb3RNYXAgPSBmZmRbc2tpbk5hbWVdO1xyXG4gICAgICAgICAgICBmb3IgKHNsb3ROYW1lIGluIHNsb3RNYXApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBzbG90SW5kZXggPSBza2VsZXRvbkRhdGEuZmluZFNsb3RJbmRleChzbG90TmFtZSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWVzaE1hcCA9IHNsb3RNYXBbc2xvdE5hbWVdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbWVzaE5hbWUgaW4gbWVzaE1hcClcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gbWVzaE1hcFttZXNoTmFtZV07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkZmZFRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gc2tpbi5nZXRBdHRhY2htZW50KHNsb3RJbmRleCwgbWVzaE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXR0YWNobWVudCkgdGhyb3cgXCJGRkQgYXR0YWNobWVudCBub3QgZm91bmQ6IFwiICsgbWVzaE5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2xvdEluZGV4ID0gc2xvdEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLmF0dGFjaG1lbnQgPSBhdHRhY2htZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNNZXNoID0gYXR0YWNobWVudC50eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLm1lc2g7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnRleENvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc01lc2gpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleENvdW50ID0gYXR0YWNobWVudC52ZXJ0aWNlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXhDb3VudCA9IGF0dGFjaG1lbnQud2VpZ2h0cy5sZW5ndGggLyAzICogMjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnRpY2VzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlTWFwW1widmVydGljZXNcIl0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc01lc2gpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXMgPSBhdHRhY2htZW50LnZlcnRpY2VzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXMubGVuZ3RoID0gdmVydGV4Q291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmVydGljZXNWYWx1ZSA9IHZhbHVlTWFwW1widmVydGljZXNcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmVydGljZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzLmxlbmd0aCA9IHZlcnRleENvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gdmFsdWVNYXBbXCJvZmZzZXRcIl0gfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBubiA9IHZlcnRpY2VzVmFsdWUubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NhbGUgPT0gMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbm47IGlpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2lpICsgc3RhcnRdID0gdmVydGljZXNWYWx1ZVtpaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBubjsgaWkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaWkgKyBzdGFydF0gPSB2ZXJ0aWNlc1ZhbHVlW2lpXSAqIHRoaXMuc2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNNZXNoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNoVmVydGljZXMgPSBhdHRhY2htZW50LnZlcnRpY2VzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2lpXSArPSBtZXNoVmVydGljZXNbaWldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4LCB2YWx1ZU1hcFtcInRpbWVcIl0sIHZlcnRpY2VzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkQ3VydmUodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXNbdGltZWxpbmVzLmxlbmd0aF0gPSB0aW1lbGluZTtcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZnJhbWVDb3VudCAtIDFdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGRyYXdPcmRlclZhbHVlcyA9IG1hcFtcImRyYXdPcmRlclwiXTtcclxuICAgICAgICBpZiAoIWRyYXdPcmRlclZhbHVlcykgZHJhd09yZGVyVmFsdWVzID0gbWFwW1wiZHJhd29yZGVyXCJdO1xyXG4gICAgICAgIGlmIChkcmF3T3JkZXJWYWx1ZXMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuRHJhd09yZGVyVGltZWxpbmUoZHJhd09yZGVyVmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHZhciBzbG90Q291bnQgPSBza2VsZXRvbkRhdGEuc2xvdHMubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZHJhd09yZGVyVmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRyYXdPcmRlck1hcCA9IGRyYXdPcmRlclZhbHVlc1tpXTtcclxuICAgICAgICAgICAgICAgIHZhciBkcmF3T3JkZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRyYXdPcmRlck1hcFtcIm9mZnNldHNcIl0pXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhd09yZGVyID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhd09yZGVyLmxlbmd0aCA9IHNsb3RDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IHNsb3RDb3VudCAtIDE7IGlpID49IDA7IGlpLS0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdPcmRlcltpaV0gPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0cyA9IGRyYXdPcmRlck1hcFtcIm9mZnNldHNcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVuY2hhbmdlZCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHVuY2hhbmdlZC5sZW5ndGggPSBzbG90Q291bnQgLSBvZmZzZXRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxJbmRleCA9IDAsIHVuY2hhbmdlZEluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IDAsIG5uID0gb2Zmc2V0cy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0TWFwID0gb2Zmc2V0c1tpaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzbG90SW5kZXggPSBza2VsZXRvbkRhdGEuZmluZFNsb3RJbmRleChvZmZzZXRNYXBbXCJzbG90XCJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNsb3RJbmRleCA9PSAtMSkgdGhyb3cgXCJTbG90IG5vdCBmb3VuZDogXCIgKyBvZmZzZXRNYXBbXCJzbG90XCJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb2xsZWN0IHVuY2hhbmdlZCBpdGVtcy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG9yaWdpbmFsSW5kZXggIT0gc2xvdEluZGV4KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jaGFuZ2VkW3VuY2hhbmdlZEluZGV4KytdID0gb3JpZ2luYWxJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgY2hhbmdlZCBpdGVtcy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhd09yZGVyW29yaWdpbmFsSW5kZXggKyBvZmZzZXRNYXBbXCJvZmZzZXRcIl1dID0gb3JpZ2luYWxJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBDb2xsZWN0IHJlbWFpbmluZyB1bmNoYW5nZWQgaXRlbXMuXHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG9yaWdpbmFsSW5kZXggPCBzbG90Q291bnQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuY2hhbmdlZFt1bmNoYW5nZWRJbmRleCsrXSA9IG9yaWdpbmFsSW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICAvLyBGaWxsIGluIHVuY2hhbmdlZCBpdGVtcy5cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IHNsb3RDb3VudCAtIDE7IGlpID49IDA7IGlpLS0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmF3T3JkZXJbaWldID09IC0xKSBkcmF3T3JkZXJbaWldID0gdW5jaGFuZ2VkWy0tdW5jaGFuZ2VkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCsrLCBkcmF3T3JkZXJNYXBbXCJ0aW1lXCJdLCBkcmF3T3JkZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcclxuICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAtIDFdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBldmVudHMgPSBtYXBbXCJldmVudHNcIl07XHJcbiAgICAgICAgaWYgKGV2ZW50cylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5FdmVudFRpbWVsaW5lKGV2ZW50cy5sZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZXZlbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50TWFwID0gZXZlbnRzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50RGF0YSA9IHNrZWxldG9uRGF0YS5maW5kRXZlbnQoZXZlbnRNYXBbXCJuYW1lXCJdKTtcclxuICAgICAgICAgICAgICAgIGlmICghZXZlbnREYXRhKSB0aHJvdyBcIkV2ZW50IG5vdCBmb3VuZDogXCIgKyBldmVudE1hcFtcIm5hbWVcIl07XHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgc3BpbmUuRXZlbnQoZXZlbnREYXRhKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LmludFZhbHVlID0gZXZlbnRNYXAuaGFzT3duUHJvcGVydHkoXCJpbnRcIikgPyBldmVudE1hcFtcImludFwiXSA6IGV2ZW50RGF0YS5pbnRWYWx1ZTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LmZsb2F0VmFsdWUgPSBldmVudE1hcC5oYXNPd25Qcm9wZXJ0eShcImZsb2F0XCIpID8gZXZlbnRNYXBbXCJmbG9hdFwiXSA6IGV2ZW50RGF0YS5mbG9hdFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuc3RyaW5nVmFsdWUgPSBldmVudE1hcC5oYXNPd25Qcm9wZXJ0eShcInN0cmluZ1wiKSA/IGV2ZW50TWFwW1wic3RyaW5nXCJdIDogZXZlbnREYXRhLnN0cmluZ1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCsrLCBldmVudE1hcFtcInRpbWVcIl0sIGV2ZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5nZXRGcmFtZUNvdW50KCkgLSAxXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBza2VsZXRvbkRhdGEuYW5pbWF0aW9ucy5wdXNoKG5ldyBzcGluZS5BbmltYXRpb24obmFtZSwgdGltZWxpbmVzLCBkdXJhdGlvbikpO1xyXG4gICAgfSxcclxuICAgIHJlYWRDdXJ2ZTogZnVuY3Rpb24gKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcClcclxuICAgIHtcclxuICAgICAgICB2YXIgY3VydmUgPSB2YWx1ZU1hcFtcImN1cnZlXCJdO1xyXG4gICAgICAgIGlmICghY3VydmUpXHJcbiAgICAgICAgICAgIHRpbWVsaW5lLmN1cnZlcy5zZXRMaW5lYXIoZnJhbWVJbmRleCk7XHJcbiAgICAgICAgZWxzZSBpZiAoY3VydmUgPT0gXCJzdGVwcGVkXCIpXHJcbiAgICAgICAgICAgIHRpbWVsaW5lLmN1cnZlcy5zZXRTdGVwcGVkKGZyYW1lSW5kZXgpO1xyXG4gICAgICAgIGVsc2UgaWYgKGN1cnZlIGluc3RhbmNlb2YgQXJyYXkpXHJcbiAgICAgICAgICAgIHRpbWVsaW5lLmN1cnZlcy5zZXRDdXJ2ZShmcmFtZUluZGV4LCBjdXJ2ZVswXSwgY3VydmVbMV0sIGN1cnZlWzJdLCBjdXJ2ZVszXSk7XHJcbiAgICB9LFxyXG4gICAgdG9Db2xvcjogZnVuY3Rpb24gKGhleFN0cmluZywgY29sb3JJbmRleClcclxuICAgIHtcclxuICAgICAgICBpZiAoaGV4U3RyaW5nLmxlbmd0aCAhPSA4KSB0aHJvdyBcIkNvbG9yIGhleGlkZWNpbWFsIGxlbmd0aCBtdXN0IGJlIDgsIHJlY2lldmVkOiBcIiArIGhleFN0cmluZztcclxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoaGV4U3RyaW5nLnN1YnN0cmluZyhjb2xvckluZGV4ICogMiwgKGNvbG9ySW5kZXggKiAyKSArIDIpLCAxNikgLyAyNTU7XHJcbiAgICB9LFxyXG4gICAgZ2V0RmxvYXRBcnJheTogZnVuY3Rpb24gKG1hcCwgbmFtZSwgc2NhbGUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBtYXBbbmFtZV07XHJcbiAgICAgICAgdmFyIHZhbHVlcyA9IG5ldyBzcGluZS5GbG9hdDMyQXJyYXkobGlzdC5sZW5ndGgpO1xyXG4gICAgICAgIHZhciBpID0gMCwgbiA9IGxpc3QubGVuZ3RoO1xyXG4gICAgICAgIGlmIChzY2FsZSA9PSAxKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0gPSBsaXN0W2ldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgdmFsdWVzW2ldID0gbGlzdFtpXSAqIHNjYWxlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWVzO1xyXG4gICAgfSxcclxuICAgIGdldEludEFycmF5OiBmdW5jdGlvbiAobWFwLCBuYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBsaXN0ID0gbWFwW25hbWVdO1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSBuZXcgc3BpbmUuVWludDE2QXJyYXkobGlzdC5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gbGlzdC5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHZhbHVlc1tpXSA9IGxpc3RbaV0gfCAwO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlNraW4gPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMuYXR0YWNobWVudHMgPSB7fTtcclxufTtcclxuc3BpbmUuU2tpbi5wcm90b3R5cGUgPSB7XHJcbiAgICBhZGRBdHRhY2htZW50OiBmdW5jdGlvbiAoc2xvdEluZGV4LCBuYW1lLCBhdHRhY2htZW50KVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuYXR0YWNobWVudHNbc2xvdEluZGV4ICsgXCI6XCIgKyBuYW1lXSA9IGF0dGFjaG1lbnQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0QXR0YWNobWVudDogZnVuY3Rpb24gKHNsb3RJbmRleCwgbmFtZSlcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2htZW50c1tzbG90SW5kZXggKyBcIjpcIiArIG5hbWVdO1xyXG4gICAgfSxcclxuICAgIF9hdHRhY2hBbGw6IGZ1bmN0aW9uIChza2VsZXRvbiwgb2xkU2tpbilcclxuICAgIHtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2xkU2tpbi5hdHRhY2htZW50cylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBjb2xvbiA9IGtleS5pbmRleE9mKFwiOlwiKTtcclxuICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHBhcnNlSW50KGtleS5zdWJzdHJpbmcoMCwgY29sb24pKTtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBrZXkuc3Vic3RyaW5nKGNvbG9uICsgMSk7XHJcbiAgICAgICAgICAgIHZhciBzbG90ID0gc2tlbGV0b24uc2xvdHNbc2xvdEluZGV4XTtcclxuICAgICAgICAgICAgaWYgKHNsb3QuYXR0YWNobWVudCAmJiBzbG90LmF0dGFjaG1lbnQubmFtZSA9PSBuYW1lKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuZ2V0QXR0YWNobWVudChzbG90SW5kZXgsIG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQpIHNsb3Quc2V0QXR0YWNobWVudChhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2luO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJykgfHwge307XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5Ta2lubmVkTWVzaEF0dGFjaG1lbnQgPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxufTtcclxuc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50LnByb3RvdHlwZSA9IHtcclxuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnNraW5uZWRtZXNoLFxyXG4gICAgYm9uZXM6IG51bGwsXHJcbiAgICB3ZWlnaHRzOiBudWxsLFxyXG4gICAgdXZzOiBudWxsLFxyXG4gICAgcmVnaW9uVVZzOiBudWxsLFxyXG4gICAgdHJpYW5nbGVzOiBudWxsLFxyXG4gICAgaHVsbExlbmd0aDogMCxcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICBwYXRoOiBudWxsLFxyXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXHJcbiAgICByZWdpb25VOiAwLCByZWdpb25WOiAwLCByZWdpb25VMjogMCwgcmVnaW9uVjI6IDAsIHJlZ2lvblJvdGF0ZTogZmFsc2UsXHJcbiAgICByZWdpb25PZmZzZXRYOiAwLCByZWdpb25PZmZzZXRZOiAwLFxyXG4gICAgcmVnaW9uV2lkdGg6IDAsIHJlZ2lvbkhlaWdodDogMCxcclxuICAgIHJlZ2lvbk9yaWdpbmFsV2lkdGg6IDAsIHJlZ2lvbk9yaWdpbmFsSGVpZ2h0OiAwLFxyXG4gICAgZWRnZXM6IG51bGwsXHJcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxyXG4gICAgdXBkYXRlVVZzOiBmdW5jdGlvbiAodSwgdiwgdTIsIHYyLCByb3RhdGUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5yZWdpb25VMiAtIHRoaXMucmVnaW9uVSwgaGVpZ2h0ID0gdGhpcy5yZWdpb25WMiAtIHRoaXMucmVnaW9uVjtcclxuICAgICAgICB2YXIgbiA9IHRoaXMucmVnaW9uVVZzLmxlbmd0aDtcclxuICAgICAgICBpZiAoIXRoaXMudXZzIHx8IHRoaXMudXZzLmxlbmd0aCAhPSBuKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy51dnMgPSBuZXcgc3BpbmUuRmxvYXQzMkFycmF5KG4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5yZWdpb25Sb3RhdGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKz0gMilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaV0gPSB0aGlzLnJlZ2lvblUgKyB0aGlzLnJlZ2lvblVWc1tpICsgMV0gKiB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIGhlaWdodCAtIHRoaXMucmVnaW9uVVZzW2ldICogaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICs9IDIpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2ldID0gdGhpcy5yZWdpb25VICsgdGhpcy5yZWdpb25VVnNbaV0gKiB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIHRoaXMucmVnaW9uVVZzW2kgKyAxXSAqIGhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjb21wdXRlV29ybGRWZXJ0aWNlczogZnVuY3Rpb24gKHgsIHksIHNsb3QsIHdvcmxkVmVydGljZXMpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNrZWxldG9uQm9uZXMgPSBzbG90LmJvbmUuc2tlbGV0b24uYm9uZXM7XHJcbiAgICAgICAgdmFyIHdlaWdodHMgPSB0aGlzLndlaWdodHM7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuXHJcbiAgICAgICAgdmFyIHcgPSAwLCB2ID0gMCwgYiA9IDAsIGYgPSAwLCBuID0gYm9uZXMubGVuZ3RoLCBubjtcclxuICAgICAgICB2YXIgd3gsIHd5LCBib25lLCB2eCwgdnksIHdlaWdodDtcclxuICAgICAgICBpZiAoIXNsb3QuYXR0YWNobWVudFZlcnRpY2VzLmxlbmd0aClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGZvciAoOyB2IDwgbjsgdyArPSAyKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB3eCA9IDA7XHJcbiAgICAgICAgICAgICAgICB3eSA9IDA7XHJcbiAgICAgICAgICAgICAgICBubiA9IGJvbmVzW3YrK10gKyB2O1xyXG4gICAgICAgICAgICAgICAgZm9yICg7IHYgPCBubjsgdisrLCBiICs9IDMpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYm9uZSA9IHNrZWxldG9uQm9uZXNbYm9uZXNbdl1dO1xyXG4gICAgICAgICAgICAgICAgICAgIHZ4ID0gd2VpZ2h0c1tiXTtcclxuICAgICAgICAgICAgICAgICAgICB2eSA9IHdlaWdodHNbYiArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodHNbYiArIDJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHd4ICs9ICh2eCAqIGJvbmUubTAwICsgdnkgKiBib25lLm0wMSArIGJvbmUud29ybGRYKSAqIHdlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB3eSArPSAodnggKiBib25lLm0xMCArIHZ5ICogYm9uZS5tMTEgKyBib25lLndvcmxkWSkgKiB3ZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3ddID0gd3ggKyB4O1xyXG4gICAgICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1t3ICsgMV0gPSB3eSArIHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgZmZkID0gc2xvdC5hdHRhY2htZW50VmVydGljZXM7XHJcbiAgICAgICAgICAgIGZvciAoOyB2IDwgbjsgdyArPSAyKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB3eCA9IDA7XHJcbiAgICAgICAgICAgICAgICB3eSA9IDA7XHJcbiAgICAgICAgICAgICAgICBubiA9IGJvbmVzW3YrK10gKyB2O1xyXG4gICAgICAgICAgICAgICAgZm9yICg7IHYgPCBubjsgdisrLCBiICs9IDMsIGYgKz0gMilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBib25lID0gc2tlbGV0b25Cb25lc1tib25lc1t2XV07XHJcbiAgICAgICAgICAgICAgICAgICAgdnggPSB3ZWlnaHRzW2JdICsgZmZkW2ZdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZ5ID0gd2VpZ2h0c1tiICsgMV0gKyBmZmRbZiArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodHNbYiArIDJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHd4ICs9ICh2eCAqIGJvbmUubTAwICsgdnkgKiBib25lLm0wMSArIGJvbmUud29ybGRYKSAqIHdlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB3eSArPSAodnggKiBib25lLm0xMCArIHZ5ICogYm9uZS5tMTEgKyBib25lLndvcmxkWSkgKiB3ZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3ddID0gd3ggKyB4O1xyXG4gICAgICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1t3ICsgMV0gPSB3eSArIHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlNsb3QgPSBmdW5jdGlvbiAoc2xvdERhdGEsIGJvbmUpXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IHNsb3REYXRhO1xyXG4gICAgdGhpcy5ib25lID0gYm9uZTtcclxuICAgIHRoaXMuc2V0VG9TZXR1cFBvc2UoKTtcclxufTtcclxuc3BpbmUuU2xvdC5wcm90b3R5cGUgPSB7XHJcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxyXG4gICAgX2F0dGFjaG1lbnRUaW1lOiAwLFxyXG4gICAgYXR0YWNobWVudDogbnVsbCxcclxuICAgIGF0dGFjaG1lbnRWZXJ0aWNlczogW10sXHJcbiAgICBzZXRBdHRhY2htZW50OiBmdW5jdGlvbiAoYXR0YWNobWVudClcclxuICAgIHtcclxuICAgICAgICB0aGlzLmF0dGFjaG1lbnQgPSBhdHRhY2htZW50O1xyXG4gICAgICAgIHRoaXMuX2F0dGFjaG1lbnRUaW1lID0gdGhpcy5ib25lLnNrZWxldG9uLnRpbWU7XHJcbiAgICAgICAgdGhpcy5hdHRhY2htZW50VmVydGljZXMubGVuZ3RoID0gMDtcclxuICAgIH0sXHJcbiAgICBzZXRBdHRhY2htZW50VGltZTogZnVuY3Rpb24gKHRpbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5fYXR0YWNobWVudFRpbWUgPSB0aGlzLmJvbmUuc2tlbGV0b24udGltZSAtIHRpbWU7XHJcbiAgICB9LFxyXG4gICAgZ2V0QXR0YWNobWVudFRpbWU6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9uZS5za2VsZXRvbi50aW1lIC0gdGhpcy5fYXR0YWNobWVudFRpbWU7XHJcbiAgICB9LFxyXG4gICAgc2V0VG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XHJcbiAgICAgICAgdGhpcy5yID0gZGF0YS5yO1xyXG4gICAgICAgIHRoaXMuZyA9IGRhdGEuZztcclxuICAgICAgICB0aGlzLmIgPSBkYXRhLmI7XHJcbiAgICAgICAgdGhpcy5hID0gZGF0YS5hO1xyXG5cclxuICAgICAgICB2YXIgc2xvdERhdGFzID0gdGhpcy5ib25lLnNrZWxldG9uLmRhdGEuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90RGF0YXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKHNsb3REYXRhc1tpXSA9PSBkYXRhKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dGFjaG1lbnQoIWRhdGEuYXR0YWNobWVudE5hbWUgPyBudWxsIDogdGhpcy5ib25lLnNrZWxldG9uLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleChpLCBkYXRhLmF0dGFjaG1lbnROYW1lKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5TbG90O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlNsb3REYXRhID0gZnVuY3Rpb24gKG5hbWUsIGJvbmVEYXRhKVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgdGhpcy5ib25lRGF0YSA9IGJvbmVEYXRhO1xyXG59O1xyXG5zcGluZS5TbG90RGF0YS5wcm90b3R5cGUgPSB7XHJcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxyXG4gICAgYXR0YWNobWVudE5hbWU6IG51bGwsXHJcbiAgICBhZGRpdGl2ZUJsZW5kaW5nOiBmYWxzZVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNsb3REYXRhO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlRyYWNrRW50cnkgPSBmdW5jdGlvbiAoKVxyXG57fTtcclxuc3BpbmUuVHJhY2tFbnRyeS5wcm90b3R5cGUgPSB7XHJcbiAgICBuZXh0OiBudWxsLCBwcmV2aW91czogbnVsbCxcclxuICAgIGFuaW1hdGlvbjogbnVsbCxcclxuICAgIGxvb3A6IGZhbHNlLFxyXG4gICAgZGVsYXk6IDAsIHRpbWU6IDAsIGxhc3RUaW1lOiAtMSwgZW5kVGltZTogMCxcclxuICAgIHRpbWVTY2FsZTogMSxcclxuICAgIG1peFRpbWU6IDAsIG1peER1cmF0aW9uOiAwLCBtaXg6IDEsXHJcbiAgICBvblN0YXJ0OiBudWxsLCBvbkVuZDogbnVsbCwgb25Db21wbGV0ZTogbnVsbCwgb25FdmVudDogbnVsbFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlRyYWNrRW50cnk7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuVHJhbnNsYXRlVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgeCwgeSwgLi4uXHJcbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50ICogMztcclxufTtcclxuc3BpbmUuVHJhbnNsYXRlVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgYm9uZUluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMztcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIHgsIHkpXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSAzO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSB4O1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAyXSA9IHk7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXHJcblxyXG4gICAgICAgIHZhciBib25lID0gc2tlbGV0b24uYm9uZXNbdGhpcy5ib25lSW5kZXhdO1xyXG5cclxuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDNdKVxyXG4gICAgICAgIHsgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICBib25lLnggKz0gKGJvbmUuZGF0YS54ICsgZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSAtIGJvbmUueCkgKiBhbHBoYTtcclxuICAgICAgICAgICAgYm9uZS55ICs9IChib25lLmRhdGEueSArIGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV0gLSBib25lLnkpICogYWxwaGE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEludGVycG9sYXRlIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIGFuZCB0aGUgY3VycmVudCBmcmFtZS5cclxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAzKTtcclxuICAgICAgICB2YXIgcHJldkZyYW1lWCA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMl07XHJcbiAgICAgICAgdmFyIHByZXZGcmFtZVkgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDFdO1xyXG4gICAgICAgIHZhciBmcmFtZVRpbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XHJcbiAgICAgICAgdmFyIHBlcmNlbnQgPSAxIC0gKHRpbWUgLSBmcmFtZVRpbWUpIC8gKGZyYW1lc1tmcmFtZUluZGV4ICsgLTMvKlBSRVZfRlJBTUVfVElNRSovXSAtIGZyYW1lVGltZSk7XHJcbiAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC8gMyAtIDEsIHBlcmNlbnQpO1xyXG5cclxuICAgICAgICBib25lLnggKz0gKGJvbmUuZGF0YS54ICsgcHJldkZyYW1lWCArIChmcmFtZXNbZnJhbWVJbmRleCArIDEvKkZSQU1FX1gqL10gLSBwcmV2RnJhbWVYKSAqIHBlcmNlbnQgLSBib25lLngpICogYWxwaGE7XHJcbiAgICAgICAgYm9uZS55ICs9IChib25lLmRhdGEueSArIHByZXZGcmFtZVkgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAyLypGUkFNRV9ZKi9dIC0gcHJldkZyYW1lWSkgKiBwZXJjZW50IC0gYm9uZS55KSAqIGFscGhhO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lO1xyXG5cclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gKiBTcGluZSBSdW50aW1lcyBTb2Z0d2FyZSBMaWNlbnNlXHJcbiAqIFZlcnNpb24gMi4xXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxMywgRXNvdGVyaWMgU29mdHdhcmVcclxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuICpcclxuICogWW91IGFyZSBncmFudGVkIGEgcGVycGV0dWFsLCBub24tZXhjbHVzaXZlLCBub24tc3VibGljZW5zYWJsZSBhbmRcclxuICogbm9uLXRyYW5zZmVyYWJsZSBsaWNlbnNlIHRvIGluc3RhbGwsIGV4ZWN1dGUgYW5kIHBlcmZvcm0gdGhlIFNwaW5lIFJ1bnRpbWVzXHJcbiAqIFNvZnR3YXJlICh0aGUgXCJTb2Z0d2FyZVwiKSBzb2xlbHkgZm9yIGludGVybmFsIHVzZS4gV2l0aG91dCB0aGUgd3JpdHRlblxyXG4gKiBwZXJtaXNzaW9uIG9mIEVzb3RlcmljIFNvZnR3YXJlICh0eXBpY2FsbHkgZ3JhbnRlZCBieSBsaWNlbnNpbmcgU3BpbmUpLCB5b3VcclxuICogbWF5IG5vdCAoYSkgbW9kaWZ5LCB0cmFuc2xhdGUsIGFkYXB0IG9yIG90aGVyd2lzZSBjcmVhdGUgZGVyaXZhdGl2ZSB3b3JrcyxcclxuICogaW1wcm92ZW1lbnRzIG9mIHRoZSBTb2Z0d2FyZSBvciBkZXZlbG9wIG5ldyBhcHBsaWNhdGlvbnMgdXNpbmcgdGhlIFNvZnR3YXJlXHJcbiAqIG9yIChiKSByZW1vdmUsIGRlbGV0ZSwgYWx0ZXIgb3Igb2JzY3VyZSBhbnkgdHJhZGVtYXJrcyBvciBhbnkgY29weXJpZ2h0LFxyXG4gKiB0cmFkZW1hcmssIHBhdGVudCBvciBvdGhlciBpbnRlbGxlY3R1YWwgcHJvcGVydHkgb3IgcHJvcHJpZXRhcnkgcmlnaHRzXHJcbiAqIG5vdGljZXMgb24gb3IgaW4gdGhlIFNvZnR3YXJlLCBpbmNsdWRpbmcgYW55IGNvcHkgdGhlcmVvZi4gUmVkaXN0cmlidXRpb25zXHJcbiAqIGluIGJpbmFyeSBvciBzb3VyY2UgZm9ybSBtdXN0IGluY2x1ZGUgdGhpcyBsaWNlbnNlIGFuZCB0ZXJtcy5cclxuICpcclxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBFU09URVJJQyBTT0ZUV0FSRSBcIkFTIElTXCIgQU5EIEFOWSBFWFBSRVNTIE9SXHJcbiAqIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0ZcclxuICogTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk9cclxuICogRVZFTlQgU0hBTEwgRVNPVEVSSUMgU09GVEFSRSBCRSBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLFxyXG4gKiBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sXHJcbiAqIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7IExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTO1xyXG4gKiBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSxcclxuICogV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1JcclxuICogT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRlxyXG4gKiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG52YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhID0gcmVxdWlyZSgnLi9BbmltYXRpb25TdGF0ZURhdGEnKTtcclxuc3BpbmUuQW5pbWF0aW9uU3RhdGUgPSByZXF1aXJlKCcuL0FuaW1hdGlvblN0YXRlJyk7XHJcbnNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlciA9IHJlcXVpcmUoJy4vQXRsYXNBdHRhY2htZW50UGFyc2VyJyk7XHJcbnNwaW5lLkF0bGFzID0gcmVxdWlyZSgnLi9BdGxhcycpO1xyXG5zcGluZS5BdGxhc1BhZ2UgPSByZXF1aXJlKCcuL0F0bGFzUGFnZScpO1xyXG5zcGluZS5BdGxhc1JlYWRlciA9IHJlcXVpcmUoJy4vQXRsYXNSZWFkZXInKTtcclxuc3BpbmUuQXRsYXNSZWdpb24gPSByZXF1aXJlKCcuL0F0bGFzUmVnaW9uJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFRpbWVsaW5lJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5Cb25lRGF0YSA9IHJlcXVpcmUoJy4vQm9uZURhdGEnKTtcclxuc3BpbmUuQm9uZSA9IHJlcXVpcmUoJy4vQm9uZScpO1xyXG5zcGluZS5Cb3VuZGluZ0JveEF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL0JvdW5kaW5nQm94QXR0YWNobWVudCcpO1xyXG5zcGluZS5Db2xvclRpbWVsaW5lID0gcmVxdWlyZSgnLi9Db2xvclRpbWVsaW5lJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLkRyYXdPcmRlclRpbWVsaW5lID0gcmVxdWlyZSgnLi9EcmF3T3JkZXJUaW1lbGluZScpO1xyXG5zcGluZS5FdmVudERhdGEgPSByZXF1aXJlKCcuL0V2ZW50RGF0YScpO1xyXG5zcGluZS5FdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcclxuc3BpbmUuRXZlbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRXZlbnRUaW1lbGluZScpO1xyXG5zcGluZS5GZmRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmZkVGltZWxpbmUnKTtcclxuc3BpbmUuRmxpcFhUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFhUaW1lbGluZScpO1xyXG5zcGluZS5GbGlwWVRpbWVsaW5lID0gcmVxdWlyZSgnLi9GbGlwWVRpbWVsaW5lJyk7XHJcbnNwaW5lLklrQ29uc3RyYWludERhdGEgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludERhdGEnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50ID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnQnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludFRpbWVsaW5lJyk7XHJcbnNwaW5lLk1lc2hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9NZXNoQXR0YWNobWVudCcpO1xyXG5zcGluZS5SZWdpb25BdHRhY2htZW50ID0gcmVxdWlyZSgnLi9SZWdpb25BdHRhY2htZW50Jyk7XHJcbnNwaW5lLlJvdGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9Sb3RhdGVUaW1lbGluZScpO1xyXG5zcGluZS5TY2FsZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9TY2FsZVRpbWVsaW5lJyk7XHJcbnNwaW5lLlNrZWxldG9uQm91bmRzID0gcmVxdWlyZSgnLi9Ta2VsZXRvbkJvdW5kcycpO1xyXG5zcGluZS5Ta2VsZXRvbkRhdGEgPSByZXF1aXJlKCcuL1NrZWxldG9uRGF0YScpO1xyXG5zcGluZS5Ta2VsZXRvbiA9IHJlcXVpcmUoJy4vU2tlbGV0b24nKTtcclxuc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyID0gcmVxdWlyZSgnLi9Ta2VsZXRvbkpzb25QYXJzZXInKTtcclxuc3BpbmUuU2tpbiA9IHJlcXVpcmUoJy4vU2tpbi5qcycpO1xyXG5zcGluZS5Ta2lubmVkTWVzaEF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL1NraW5uZWRNZXNoQXR0YWNobWVudCcpO1xyXG5zcGluZS5TbG90RGF0YSA9IHJlcXVpcmUoJy4vU2xvdERhdGEnKTtcclxuc3BpbmUuU2xvdCA9IHJlcXVpcmUoJy4vU2xvdCcpO1xyXG5zcGluZS5UcmFja0VudHJ5ID0gcmVxdWlyZSgnLi9UcmFja0VudHJ5Jyk7XHJcbnNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9UcmFuc2xhdGVUaW1lbGluZScpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIHJhZERlZzogMTgwIC8gTWF0aC5QSSxcclxuICAgIGRlZ1JhZDogTWF0aC5QSSAvIDE4MCxcclxuICAgIHRlbXA6IFtdLFxyXG4gICAgRmxvYXQzMkFycmF5OiAodHlwZW9mKEZsb2F0MzJBcnJheSkgPT09ICd1bmRlZmluZWQnKSA/IEFycmF5IDogRmxvYXQzMkFycmF5LFxyXG4gICAgVWludDE2QXJyYXk6ICh0eXBlb2YoVWludDE2QXJyYXkpID09PSAndW5kZWZpbmVkJykgPyBBcnJheSA6IFVpbnQxNkFycmF5XHJcbn07XHJcblxyXG4iLCJ2YXIgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKSxcclxuICAgIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVSdW50aW1lJyk7XHJcbi8qIEVzb3RlcmljIFNvZnR3YXJlIFNQSU5FIHdyYXBwZXIgZm9yIHBpeGkuanMgKi9cclxuc3BpbmUuQm9uZS55RG93biA9IHRydWU7XHJcbi8qKlxyXG4gKiBBIGNsYXNzIHRoYXQgZW5hYmxlcyB0aGUgeW91IHRvIGltcG9ydCBhbmQgcnVuIHlvdXIgc3BpbmUgYW5pbWF0aW9ucyBpbiBwaXhpLlxyXG4gKiBUaGUgU3BpbmUgYW5pbWF0aW9uIGRhdGEgbmVlZHMgdG8gYmUgbG9hZGVkIHVzaW5nIGVpdGhlciB0aGUgTG9hZGVyIG9yIGEgU3BpbmVMb2FkZXIgYmVmb3JlIGl0IGNhbiBiZSB1c2VkIGJ5IHRoaXMgY2xhc3NcclxuICogU2VlIGV4YW1wbGUgMTIgKGh0dHA6Ly93d3cuZ29vZGJveWRpZ2l0YWwuY29tL3BpeGlqcy9leGFtcGxlcy8xMi8pIHRvIHNlZSBhIHdvcmtpbmcgZXhhbXBsZSBhbmQgY2hlY2sgb3V0IHRoZSBzb3VyY2VcclxuICpcclxuICogYGBganNcclxuICogdmFyIHNwaW5lQW5pbWF0aW9uID0gbmV3IFBJWEkuU3BpbmUoc3BpbmVEYXRhKTtcclxuICogYGBgXHJcbiAqXHJcbiAqIEBjbGFzc1xyXG4gKiBAZXh0ZW5kcyBDb250YWluZXJcclxuICogQG1lbWJlcm9mIFBJWEkuc3BpbmVcclxuICogQHBhcmFtIHNwaW5lRGF0YSB7b2JqZWN0fSBUaGUgc3BpbmUgZGF0YSBsb2FkZWQgZnJvbSBhIHNwaW5lIGF0bGFzLlxyXG4gKi9cclxuZnVuY3Rpb24gU3BpbmUoc3BpbmVEYXRhKVxyXG57XHJcbiAgICBQSVhJLkNvbnRhaW5lci5jYWxsKHRoaXMpO1xyXG5cclxuICAgIGlmICghc3BpbmVEYXRhKVxyXG4gICAge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHNwaW5lRGF0YSBwYXJhbSBpcyByZXF1aXJlZC4nKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBzcGluZURhdGEgb2JqZWN0XHJcbiAgICAgKlxyXG4gICAgICogQG1lbWJlciB7b2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnNwaW5lRGF0YSA9IHNwaW5lRGF0YTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEEgc3BpbmUgU2tlbGV0b24gb2JqZWN0XHJcbiAgICAgKlxyXG4gICAgICogQG1lbWJlciB7b2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnNrZWxldG9uID0gbmV3IHNwaW5lLlNrZWxldG9uKHNwaW5lRGF0YSk7XHJcbiAgICB0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBIHNwaW5lIEFuaW1hdGlvblN0YXRlRGF0YSBvYmplY3QgY3JlYXRlZCBmcm9tIHRoZSBzcGluZSBkYXRhIHBhc3NlZCBpbiB0aGUgY29uc3RydWN0b3JcclxuICAgICAqXHJcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuc3RhdGVEYXRhID0gbmV3IHNwaW5lLkFuaW1hdGlvblN0YXRlRGF0YShzcGluZURhdGEpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQSBzcGluZSBBbmltYXRpb25TdGF0ZSBvYmplY3QgY3JlYXRlZCBmcm9tIHRoZSBzcGluZSBBbmltYXRpb25TdGF0ZURhdGEgb2JqZWN0XHJcbiAgICAgKlxyXG4gICAgICogQG1lbWJlciB7b2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnN0YXRlID0gbmV3IHNwaW5lLkFuaW1hdGlvblN0YXRlKHRoaXMuc3RhdGVEYXRhKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFuIGFycmF5IG9mIGNvbnRhaW5lcnNcclxuICAgICAqXHJcbiAgICAgKiBAbWVtYmVyIHtDb250YWluZXJbXX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5zbG90Q29udGFpbmVycyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGhpcy5za2VsZXRvbi5zbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3QgPSB0aGlzLnNrZWxldG9uLnNsb3RzW2ldO1xyXG4gICAgICAgIHZhciBhdHRhY2htZW50ID0gc2xvdC5hdHRhY2htZW50O1xyXG4gICAgICAgIHZhciBzbG90Q29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XHJcbiAgICAgICAgdGhpcy5zbG90Q29udGFpbmVycy5wdXNoKHNsb3RDb250YWluZXIpO1xyXG4gICAgICAgIHRoaXMuYWRkQ2hpbGQoc2xvdENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgIGlmIChhdHRhY2htZW50IGluc3RhbmNlb2Ygc3BpbmUuUmVnaW9uQXR0YWNobWVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBzcHJpdGVOYW1lID0gYXR0YWNobWVudC5yZW5kZXJlck9iamVjdC5uYW1lO1xyXG4gICAgICAgICAgICB2YXIgc3ByaXRlID0gdGhpcy5jcmVhdGVTcHJpdGUoc2xvdCwgYXR0YWNobWVudCk7XHJcbiAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZSA9IHNwcml0ZTtcclxuICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlTmFtZSA9IHNwcml0ZU5hbWU7XHJcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYXR0YWNobWVudCBpbnN0YW5jZW9mIHNwaW5lLk1lc2hBdHRhY2htZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmNyZWF0ZU1lc2goc2xvdCwgYXR0YWNobWVudCk7XHJcbiAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2ggPSBtZXNoO1xyXG4gICAgICAgICAgICBzbG90LmN1cnJlbnRNZXNoTmFtZSA9IGF0dGFjaG1lbnQubmFtZTtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChtZXNoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNob3VsZCB0aGUgU3BpbmUgb2JqZWN0IHVwZGF0ZSBpdHMgdHJhbnNmb3Jtc1xyXG4gICAgICpcclxuICAgICAqIEBtZW1iZXIge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMuYXV0b1VwZGF0ZSA9IHRydWU7XHJcbn1cclxuXHJcblNwaW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUElYSS5Db250YWluZXIucHJvdG90eXBlKTtcclxuU3BpbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3BpbmU7XHJcbm1vZHVsZS5leHBvcnRzID0gU3BpbmU7XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTcGluZS5wcm90b3R5cGUsIHtcclxuICAgIC8qKlxyXG4gICAgICogSWYgdGhpcyBmbGFnIGlzIHNldCB0byB0cnVlLCB0aGUgc3BpbmUgYW5pbWF0aW9uIHdpbGwgYmUgYXV0b3VwZGF0ZWQgZXZlcnkgdGltZVxyXG4gICAgICogdGhlIG9iamVjdCBpZCBkcmF3bi4gVGhlIGRvd24gc2lkZSBvZiB0aGlzIGFwcHJvYWNoIGlzIHRoYXQgdGhlIGRlbHRhIHRpbWUgaXNcclxuICAgICAqIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBhbmQgeW91IGNvdWxkIG1pc3Mgb3V0IG9uIGNvb2wgZWZmZWN0cyBsaWtlIHNsb3cgbW90aW9uLFxyXG4gICAgICogcGF1c2UsIHNraXAgYWhlYWQgYW5kIHRoZSBzb3J0cy4gTW9zdCBvZiB0aGVzZSBlZmZlY3RzIGNhbiBiZSBhY2hpZXZlZCBldmVuIHdpdGhcclxuICAgICAqIGF1dG91cGRhdGUgZW5hYmxlZCBidXQgYXJlIGhhcmRlciB0byBhY2hpZXZlLlxyXG4gICAgICpcclxuICAgICAqIEBtZW1iZXIge2Jvb2xlYW59XHJcbiAgICAgKiBAbWVtYmVyb2YgU3BpbmUjXHJcbiAgICAgKiBAZGVmYXVsdCB0cnVlXHJcbiAgICAgKi9cclxuICAgIGF1dG9VcGRhdGU6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMudXBkYXRlVHJhbnNmb3JtID09PSBTcGluZS5wcm90b3R5cGUuYXV0b1VwZGF0ZVRyYW5zZm9ybSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSA9IHZhbHVlID8gU3BpbmUucHJvdG90eXBlLmF1dG9VcGRhdGVUcmFuc2Zvcm0gOiBQSVhJLkNvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG4vKipcclxuICogVXBkYXRlIHRoZSBzcGluZSBza2VsZXRvbiBhbmQgaXRzIGFuaW1hdGlvbnMgYnkgZGVsdGEgdGltZSAoZHQpXHJcbiAqXHJcbiAqIEBwYXJhbSBkdCB7bnVtYmVyfSBEZWx0YSB0aW1lLiBUaW1lIGJ5IHdoaWNoIHRoZSBhbmltYXRpb24gc2hvdWxkIGJlIHVwZGF0ZWRcclxuICovXHJcblNwaW5lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZHQpXHJcbntcclxuICAgIHRoaXMuc3RhdGUudXBkYXRlKGR0KTtcclxuICAgIHRoaXMuc3RhdGUuYXBwbHkodGhpcy5za2VsZXRvbik7XHJcbiAgICB0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgdmFyIGRyYXdPcmRlciA9IHRoaXMuc2tlbGV0b24uZHJhd09yZGVyO1xyXG4gICAgdmFyIHNsb3RzID0gdGhpcy5za2VsZXRvbi5zbG90cztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGRyYXdPcmRlci5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5jaGlsZHJlbltpXSA9IHRoaXMuc2xvdENvbnRhaW5lcnNbZHJhd09yZGVyW2ldXTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBzbG90LmF0dGFjaG1lbnQ7XHJcbiAgICAgICAgdmFyIHNsb3RDb250YWluZXIgPSB0aGlzLnNsb3RDb250YWluZXJzW2ldO1xyXG5cclxuICAgICAgICBpZiAoIWF0dGFjaG1lbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdHlwZSA9IGF0dGFjaG1lbnQudHlwZTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gc3BpbmUuQXR0YWNobWVudFR5cGUucmVnaW9uKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmICghc2xvdC5jdXJyZW50U3ByaXRlTmFtZSB8fCBzbG90LmN1cnJlbnRTcHJpdGVOYW1lICE9PSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0Lm5hbWUpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwcml0ZU5hbWUgPSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNsb3QuY3VycmVudFNwcml0ZSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2xvdC5zcHJpdGVzID0gc2xvdC5zcHJpdGVzIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzbG90LnNwcml0ZXNbc3ByaXRlTmFtZV0gIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsb3Quc3ByaXRlc1tzcHJpdGVOYW1lXS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNwcml0ZSA9IHRoaXMuY3JlYXRlU3ByaXRlKHNsb3QsIGF0dGFjaG1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzbG90Q29udGFpbmVyLmFkZENoaWxkKHNwcml0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZSA9IHNsb3Quc3ByaXRlc1tzcHJpdGVOYW1lXTtcclxuICAgICAgICAgICAgICAgICAgICBzbG90LmN1cnJlbnRTcHJpdGVOYW1lID0gc3ByaXRlTmFtZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGJvbmUgPSBzbG90LmJvbmU7XHJcblxyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnBvc2l0aW9uLnggPSBib25lLndvcmxkWCArIGF0dGFjaG1lbnQueCAqIGJvbmUubTAwICsgYXR0YWNobWVudC55ICogYm9uZS5tMDE7XHJcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIucG9zaXRpb24ueSA9IGJvbmUud29ybGRZICsgYXR0YWNobWVudC54ICogYm9uZS5tMTAgKyBhdHRhY2htZW50LnkgKiBib25lLm0xMTtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5zY2FsZS54ID0gYm9uZS53b3JsZFNjYWxlWDtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5zY2FsZS55ID0gYm9uZS53b3JsZFNjYWxlWTtcclxuXHJcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIucm90YXRpb24gPSAtKHNsb3QuYm9uZS53b3JsZFJvdGF0aW9uICogc3BpbmUuZGVnUmFkKTtcclxuXHJcbiAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZS50aW50ID0gUElYSS51dGlscy5yZ2IyaGV4KFtzbG90LnIsc2xvdC5nLHNsb3QuYl0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBzcGluZS5BdHRhY2htZW50VHlwZS5za2lubmVkbWVzaClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICghc2xvdC5jdXJyZW50TWVzaE5hbWUgfHwgc2xvdC5jdXJyZW50TWVzaE5hbWUgIT09IGF0dGFjaG1lbnQubmFtZSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIG1lc2hOYW1lID0gYXR0YWNobWVudC5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNsb3QuY3VycmVudE1lc2ggIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBzbG90LmN1cnJlbnRNZXNoLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzbG90Lm1lc2hlcyA9IHNsb3QubWVzaGVzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzbG90Lm1lc2hlc1ttZXNoTmFtZV0gIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBzbG90Lm1lc2hlc1ttZXNoTmFtZV0udmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmNyZWF0ZU1lc2goc2xvdCwgYXR0YWNobWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChtZXNoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzbG90LmN1cnJlbnRNZXNoID0gc2xvdC5tZXNoZXNbbWVzaE5hbWVdO1xyXG4gICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50TWVzaE5hbWUgPSBtZXNoTmFtZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYXR0YWNobWVudC5jb21wdXRlV29ybGRWZXJ0aWNlcyhzbG90LmJvbmUuc2tlbGV0b24ueCwgc2xvdC5ib25lLnNrZWxldG9uLnksIHNsb3QsIHNsb3QuY3VycmVudE1lc2gudmVydGljZXMpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzbG90Q29udGFpbmVyLnZpc2libGUgPSB0cnVlO1xyXG5cclxuICAgICAgICBzbG90Q29udGFpbmVyLmFscGhhID0gc2xvdC5hO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdoZW4gYXV0b3VwZGF0ZSBpcyBzZXQgdG8geWVzIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCBhcyBwaXhpJ3MgdXBkYXRlVHJhbnNmb3JtIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5TcGluZS5wcm90b3R5cGUuYXV0b1VwZGF0ZVRyYW5zZm9ybSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICAgIHRoaXMubGFzdFRpbWUgPSB0aGlzLmxhc3RUaW1lIHx8IERhdGUubm93KCk7XHJcbiAgICB2YXIgdGltZURlbHRhID0gKERhdGUubm93KCkgLSB0aGlzLmxhc3RUaW1lKSAqIDAuMDAxO1xyXG4gICAgdGhpcy5sYXN0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdGhpcy51cGRhdGUodGltZURlbHRhKTtcclxuXHJcbiAgICBQSVhJLkNvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgbmV3IHNwcml0ZSB0byBiZSB1c2VkIHdpdGggc3BpbmUuUmVnaW9uQXR0YWNobWVudFxyXG4gKlxyXG4gKiBAcGFyYW0gc2xvdCB7c3BpbmUuU2xvdH0gVGhlIHNsb3QgdG8gd2hpY2ggdGhlIGF0dGFjaG1lbnQgaXMgcGFyZW50ZWRcclxuICogQHBhcmFtIGF0dGFjaG1lbnQge3NwaW5lLlJlZ2lvbkF0dGFjaG1lbnR9IFRoZSBhdHRhY2htZW50IHRoYXQgdGhlIHNwcml0ZSB3aWxsIHJlcHJlc2VudFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuU3BpbmUucHJvdG90eXBlLmNyZWF0ZVNwcml0ZSA9IGZ1bmN0aW9uIChzbG90LCBhdHRhY2htZW50KVxyXG57XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3Q7XHJcbiAgICB2YXIgYmFzZVRleHR1cmUgPSBkZXNjcmlwdG9yLnBhZ2UucmVuZGVyZXJPYmplY3Q7XHJcbiAgICB2YXIgc3ByaXRlUmVjdCA9IG5ldyBQSVhJLm1hdGguUmVjdGFuZ2xlKGRlc2NyaXB0b3IueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3IueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3Iucm90YXRlID8gZGVzY3JpcHRvci5oZWlnaHQgOiBkZXNjcmlwdG9yLndpZHRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRvci5yb3RhdGUgPyBkZXNjcmlwdG9yLndpZHRoIDogZGVzY3JpcHRvci5oZWlnaHQpO1xyXG4gICAgdmFyIHNwcml0ZVRleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKGJhc2VUZXh0dXJlLCBzcHJpdGVSZWN0KTtcclxuICAgIHZhciBzcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoc3ByaXRlVGV4dHVyZSk7XHJcblxyXG4gICAgdmFyIGJhc2VSb3RhdGlvbiA9IGRlc2NyaXB0b3Iucm90YXRlID8gTWF0aC5QSSAqIDAuNSA6IDAuMDtcclxuICAgIHNwcml0ZS5zY2FsZS54ID0gZGVzY3JpcHRvci53aWR0aCAvIGRlc2NyaXB0b3Iub3JpZ2luYWxXaWR0aCAqIGF0dGFjaG1lbnQuc2NhbGVYO1xyXG4gICAgc3ByaXRlLnNjYWxlLnkgPSBkZXNjcmlwdG9yLmhlaWdodCAvIGRlc2NyaXB0b3Iub3JpZ2luYWxIZWlnaHQgKiBhdHRhY2htZW50LnNjYWxlWTtcclxuICAgIHNwcml0ZS5yb3RhdGlvbiA9IGJhc2VSb3RhdGlvbiAtIChhdHRhY2htZW50LnJvdGF0aW9uICogc3BpbmUuZGVnUmFkKTtcclxuICAgIHNwcml0ZS5hbmNob3IueCA9IHNwcml0ZS5hbmNob3IueSA9IDAuNTtcclxuICAgIHNwcml0ZS5hbHBoYSA9IGF0dGFjaG1lbnQuYTtcclxuXHJcbiAgICBzbG90LnNwcml0ZXMgPSBzbG90LnNwcml0ZXMgfHwge307XHJcbiAgICBzbG90LnNwcml0ZXNbZGVzY3JpcHRvci5uYW1lXSA9IHNwcml0ZTtcclxuICAgIHJldHVybiBzcHJpdGU7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIFN0cmlwIGZyb20gdGhlIHNwaW5lIGRhdGFcclxuICogQHBhcmFtIHNsb3Qge3NwaW5lLlNsb3R9IFRoZSBzbG90IHRvIHdoaWNoIHRoZSBhdHRhY2htZW50IGlzIHBhcmVudGVkXHJcbiAqIEBwYXJhbSBhdHRhY2htZW50IHtzcGluZS5SZWdpb25BdHRhY2htZW50fSBUaGUgYXR0YWNobWVudCB0aGF0IHRoZSBzcHJpdGUgd2lsbCByZXByZXNlbnRcclxuICogQHByaXZhdGVcclxuICovXHJcblNwaW5lLnByb3RvdHlwZS5jcmVhdGVNZXNoID0gZnVuY3Rpb24gKHNsb3QsIGF0dGFjaG1lbnQpXHJcbntcclxuICAgIHZhciBkZXNjcmlwdG9yID0gYXR0YWNobWVudC5yZW5kZXJlck9iamVjdDtcclxuICAgIHZhciBiYXNlVGV4dHVyZSA9IGRlc2NyaXB0b3IucGFnZS5yZW5kZXJlck9iamVjdDtcclxuICAgIHZhciB0ZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZShiYXNlVGV4dHVyZSk7XHJcblxyXG4gICAgdmFyIHN0cmlwID0gbmV3IFBJWEkuU3RyaXAodGV4dHVyZSk7XHJcbiAgICBzdHJpcC5kcmF3TW9kZSA9IFBJWEkuU3RyaXAuRFJBV19NT0RFUy5UUklBTkdMRVM7XHJcbiAgICBzdHJpcC5jYW52YXNQYWRkaW5nID0gMS41O1xyXG5cclxuICAgIHN0cmlwLnZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheShhdHRhY2htZW50LnV2cy5sZW5ndGgpO1xyXG4gICAgc3RyaXAudXZzID0gYXR0YWNobWVudC51dnM7XHJcbiAgICBzdHJpcC5pbmRpY2VzID0gYXR0YWNobWVudC50cmlhbmdsZXM7XHJcbiAgICBzdHJpcC5hbHBoYSA9IGF0dGFjaG1lbnQuYTtcclxuXHJcbiAgICBzbG90Lm1lc2hlcyA9IHNsb3QubWVzaGVzIHx8IHt9O1xyXG4gICAgc2xvdC5tZXNoZXNbYXR0YWNobWVudC5uYW1lXSA9IHN0cmlwO1xyXG5cclxuICAgIHJldHVybiBzdHJpcDtcclxufTtcclxuIiwiLyoqXG4gKiBAZmlsZSAgICAgICAgU3BpbmUgcmVzb3VyY2UgbG9hZGVyXG4gKiBAYXV0aG9yICAgICAgSXZhbiBQb3BlbHlzaGV2IDxpdmFuLnBvcGVseXNoZXZAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgIDIwMTMtMjAxNSBHb29kQm95RGlnaXRhbFxuICogQGxpY2Vuc2UgICAgIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vR29vZEJveURpZ2l0YWwvcGl4aS5qcy9ibG9iL21hc3Rlci9MSUNFTlNFfE1JVCBMaWNlbnNlfVxuICovXG5cbi8qKlxuICogQG5hbWVzcGFjZSBQSVhJLmxvYWRlcnNcbiAqL1xuXG52YXIgYXRsYXNQYXJzZXIgPSByZXF1aXJlKCcuL2F0bGFzUGFyc2VyJyksXG4gICAgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKGJhc2VVcmwsIGNvbmN1cnJlbmN5KVxue1xuICAgIFBJWEkubG9hZGVycy5Mb2FkZXIuY2FsbCh0aGlzLCBiYXNlVXJsLCBjb25jdXJyZW5jeSk7XG5cbiAgICAvLyBwYXJzZSBhbnkgc3BpbmUgZGF0YSBpbnRvIGEgc3BpbmUgb2JqZWN0XG4gICAgdGhpcy51c2UoYXRsYXNQYXJzZXIoKSk7XG59XG5cbkxvYWRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBJWEkubG9hZGVycy5Mb2FkZXIucHJvdG90eXBlKTtcbkxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBMb2FkZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyO1xuIiwidmFyIFJlc291cmNlID0gcmVxdWlyZSgncGl4aS5qcycpLmxvYWRlcnMuUmVzb3VyY2UsXG4gICAgYXN5bmMgPSByZXF1aXJlKCdwaXhpLmpzJykudXRpbHMuYXN5bmMsXG4gICAgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVJ1bnRpbWUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZXNvdXJjZSwgbmV4dCkge1xuICAgICAgICAvLyBza2lwIGlmIG5vIGRhdGEsIGl0cyBub3QganNvbiwgb3IgaXQgaXNuJ3QgYXRsYXMgZGF0YVxuICAgICAgICBpZiAoIXJlc291cmNlLmRhdGEgfHwgIXJlc291cmNlLmlzSnNvbiB8fCAhcmVzb3VyY2UuZGF0YS5ib25lcykge1xuICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB1c2UgYSBiaXQgb2YgaGFja2VyeSB0byBsb2FkIHRoZSBhdGxhcyBmaWxlLCBoZXJlIHdlIGFzc3VtZSB0aGF0IHRoZSAuanNvbiwgLmF0bGFzIGFuZCAucG5nIGZpbGVzXG4gICAgICAgICAqIHRoYXQgY29ycmVzcG9uZCB0byB0aGUgc3BpbmUgZmlsZSBhcmUgaW4gdGhlIHNhbWUgYmFzZSBVUkwgYW5kIHRoYXQgdGhlIC5qc29uIGFuZCAuYXRsYXMgZmlsZXNcbiAgICAgICAgICogaGF2ZSB0aGUgc2FtZSBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgYXRsYXNQYXRoID0gcmVzb3VyY2UudXJsLnN1YnN0cigwLCByZXNvdXJjZS51cmwubGFzdEluZGV4T2YoJy4nKSkgKyAnLmF0bGFzJztcbiAgICAgICAgdmFyIGF0bGFzT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNyb3NzT3JpZ2luOiByZXNvdXJjZS5jcm9zc09yaWdpbixcbiAgICAgICAgICAgIHhoclR5cGU6IFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLlRFWFRcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGJhc2VVcmwgPSByZXNvdXJjZS51cmwuc3Vic3RyKDAsIHJlc291cmNlLnVybC5sYXN0SW5kZXhPZignLycpICsgMSk7XG5cblxuICAgICAgICB0aGlzLmFkZChyZXNvdXJjZS5uYW1lICsgJ19hdGxhcycsIGF0bGFzUGF0aCwgYXRsYXNPcHRpb25zLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBzcGluZSBhdGxhcyB1c2luZyB0aGUgbG9hZGVkIHRleHRcbiAgICAgICAgICAgIHZhciBzcGluZUF0bGFzID0gbmV3IHNwaW5lLkF0bGFzKHRoaXMueGhyLnJlc3BvbnNlVGV4dCwgYmFzZVVybCwgcmVzLmNyb3NzT3JpZ2luKTtcblxuICAgICAgICAgICAgLy8gc3BpbmUgYW5pbWF0aW9uXG4gICAgICAgICAgICB2YXIgc3BpbmVKc29uUGFyc2VyID0gbmV3IHNwaW5lLlNrZWxldG9uSnNvblBhcnNlcihuZXcgc3BpbmUuQXRsYXNBdHRhY2htZW50UGFyc2VyKHNwaW5lQXRsYXMpKTtcbiAgICAgICAgICAgIHZhciBza2VsZXRvbkRhdGEgPSBzcGluZUpzb25QYXJzZXIucmVhZFNrZWxldG9uRGF0YShyZXNvdXJjZS5kYXRhKTtcblxuICAgICAgICAgICAgcmVzb3VyY2Uuc3BpbmVEYXRhID0gc2tlbGV0b25EYXRhO1xuICAgICAgICAgICAgcmVzb3VyY2Uuc3BpbmVBdGxhcyA9IHNwaW5lQXRsYXM7XG5cbiAgICAgICAgICAgIC8vIEdvIHRocm91Z2ggZWFjaCBzcGluZUF0bGFzLnBhZ2VzIGFuZCB3YWl0IGZvciBwYWdlLnJlbmRlcmVyT2JqZWN0IChhIGJhc2VUZXh0dXJlKSB0b1xuICAgICAgICAgICAgLy8gbG9hZC4gT25jZSBhbGwgbG9hZGVkLCB0aGVuIGNhbGwgdGhlIG5leHQgZnVuY3Rpb24uXG4gICAgICAgICAgICBhc3luYy5lYWNoKHNwaW5lQXRsYXMucGFnZXMsIGZ1bmN0aW9uIChwYWdlLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2UucmVuZGVyZXJPYmplY3QuaGFzTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2UucmVuZGVyZXJPYmplY3Qub25jZSgnbG9hZGVkJywgZG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgbmV4dCk7XG4gICAgICAgIH0pO1xuICAgIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYXRsYXNQYXJzZXI6IHJlcXVpcmUoJy4vYXRsYXNQYXJzZXInKSxcbiAgICBMb2FkZXI6IHJlcXVpcmUoJy4vTG9hZGVyJylcbn07XG4iXX0=
