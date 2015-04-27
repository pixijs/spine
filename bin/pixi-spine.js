(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @namespace PIXI.spine
 */
module.exports = PIXI.spine = {
    Spine:          require('./Spine'),
    SpineRuntime:   require('./SpineRuntime'),
    loaders:        require('./loaders')
};

},{"./Spine":43,"./SpineRuntime":41,"./loaders":46}],2:[function(require,module,exports){
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

},{"../SpineUtil":42,"./AtlasPage":7,"./AtlasReader":8,"./AtlasRegion":9}],6:[function(require,module,exports){
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
var spine = require('../SpineRuntime');

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

},{"../SpineRuntime":41}],44:[function(require,module,exports){
/**
 * @file        Spine resource loader
 * @author      Ivan Popelyshev <ivan.popelyshev@gmail.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI.loaders
 */

var atlasParser = require('./atlasParser');

PIXI.loaders.Loader.addPixiMiddleware(atlasParser);
PIXI.loader.use(atlasParser());

},{"./atlasParser":45}],45:[function(require,module,exports){
var Resource = PIXI.loaders.Resource,
    async = PIXI.utils.async,
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

},{"../SpineRuntime":41}],46:[function(require,module,exports){
module.exports = {
    atlasParser: require('./atlasParser'),
    Loader: require('./Loader')
};

},{"./Loader":44,"./atlasParser":45}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvbi5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQW5pbWF0aW9uU3RhdGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvblN0YXRlRGF0YS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXMuanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0bGFzQXR0YWNobWVudFBhcnNlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNQYWdlLmpzIiwic3JjL1NwaW5lUnVudGltZS9BdGxhc1JlYWRlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNSZWdpb24uanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0dGFjaG1lbnRUaW1lbGluZS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXR0YWNobWVudFR5cGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmVEYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Cb3VuZGluZ0JveEF0dGFjaG1lbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0NvbG9yVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0N1cnZlcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvRHJhd09yZGVyVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50LmpzIiwic3JjL1NwaW5lUnVudGltZS9FdmVudERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50VGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0ZmZFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ja0NvbnN0cmFpbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9NZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUmVnaW9uQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUm90YXRlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NjYWxlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NrZWxldG9uLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkJvdW5kcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2tlbGV0b25EYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkpzb25QYXJzZXIuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW4uanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW5uZWRNZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYWNrRW50cnkuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYW5zbGF0ZVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9pbmRleC5qcyIsInNyYy9TcGluZVV0aWwvaW5kZXguanMiLCJzcmMvU3BpbmUvaW5kZXguanMiLCJzcmMvbG9hZGVycy9Mb2FkZXIuanMiLCJzcmMvbG9hZGVycy9hdGxhc1BhcnNlci5qcyIsInNyYy9sb2FkZXJzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQG5hbWVzcGFjZSBQSVhJLnNwaW5lXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gUElYSS5zcGluZSA9IHtcbiAgICBTcGluZTogICAgICAgICAgcmVxdWlyZSgnLi9TcGluZScpLFxuICAgIFNwaW5lUnVudGltZTogICByZXF1aXJlKCcuL1NwaW5lUnVudGltZScpLFxuICAgIGxvYWRlcnM6ICAgICAgICByZXF1aXJlKCcuL2xvYWRlcnMnKVxufTtcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQW5pbWF0aW9uID0gZnVuY3Rpb24gKG5hbWUsIHRpbWVsaW5lcywgZHVyYXRpb24pXG57XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnRpbWVsaW5lcyA9IHRpbWVsaW5lcztcbiAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG59O1xuc3BpbmUuQW5pbWF0aW9uLnByb3RvdHlwZSA9IHtcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgbG9vcCwgZXZlbnRzKVxuICAgIHtcbiAgICAgICAgaWYgKGxvb3AgJiYgdGhpcy5kdXJhdGlvbiAhPSAwKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aW1lICU9IHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBsYXN0VGltZSAlPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lbGluZXMgPSB0aGlzLnRpbWVsaW5lcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aW1lbGluZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgdGltZWxpbmVzW2ldLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZXZlbnRzLCAxKTtcbiAgICB9LFxuICAgIG1peDogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgbG9vcCwgZXZlbnRzLCBhbHBoYSlcbiAgICB7XG4gICAgICAgIGlmIChsb29wICYmIHRoaXMuZHVyYXRpb24gIT0gMClcbiAgICAgICAge1xuICAgICAgICAgICAgdGltZSAlPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgbGFzdFRpbWUgJT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGltZWxpbmVzID0gdGhpcy50aW1lbGluZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGltZWxpbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHRpbWVsaW5lc1tpXS5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGV2ZW50cywgYWxwaGEpO1xuICAgIH1cbn07XG5zcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoID0gZnVuY3Rpb24gKHZhbHVlcywgdGFyZ2V0LCBzdGVwKVxue1xuICAgIHZhciBsb3cgPSAwO1xuICAgIHZhciBoaWdoID0gTWF0aC5mbG9vcih2YWx1ZXMubGVuZ3RoIC8gc3RlcCkgLSAyO1xuICAgIGlmICghaGlnaCkgcmV0dXJuIHN0ZXA7XG4gICAgdmFyIGN1cnJlbnQgPSBoaWdoID4+PiAxO1xuICAgIHdoaWxlICh0cnVlKVxuICAgIHtcbiAgICAgICAgaWYgKHZhbHVlc1soY3VycmVudCArIDEpICogc3RlcF0gPD0gdGFyZ2V0KVxuICAgICAgICAgICAgbG93ID0gY3VycmVudCArIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGhpZ2ggPSBjdXJyZW50O1xuICAgICAgICBpZiAobG93ID09IGhpZ2gpIHJldHVybiAobG93ICsgMSkgKiBzdGVwO1xuICAgICAgICBjdXJyZW50ID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgIH1cbn07XG5zcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoMSA9IGZ1bmN0aW9uICh2YWx1ZXMsIHRhcmdldClcbntcbiAgICB2YXIgbG93ID0gMDtcbiAgICB2YXIgaGlnaCA9IHZhbHVlcy5sZW5ndGggLSAyO1xuICAgIGlmICghaGlnaCkgcmV0dXJuIDE7XG4gICAgdmFyIGN1cnJlbnQgPSBoaWdoID4+PiAxO1xuICAgIHdoaWxlICh0cnVlKVxuICAgIHtcbiAgICAgICAgaWYgKHZhbHVlc1tjdXJyZW50ICsgMV0gPD0gdGFyZ2V0KVxuICAgICAgICAgICAgbG93ID0gY3VycmVudCArIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGhpZ2ggPSBjdXJyZW50O1xuICAgICAgICBpZiAobG93ID09IGhpZ2gpIHJldHVybiBsb3cgKyAxO1xuICAgICAgICBjdXJyZW50ID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgIH1cbn07XG5zcGluZS5BbmltYXRpb24ubGluZWFyU2VhcmNoID0gZnVuY3Rpb24gKHZhbHVlcywgdGFyZ2V0LCBzdGVwKVxue1xuICAgIGZvciAodmFyIGkgPSAwLCBsYXN0ID0gdmFsdWVzLmxlbmd0aCAtIHN0ZXA7IGkgPD0gbGFzdDsgaSArPSBzdGVwKVxuICAgICAgICBpZiAodmFsdWVzW2ldID4gdGFyZ2V0KSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BbmltYXRpb247XG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLlRyYWNrRW50cnkgPSByZXF1aXJlKCcuL1RyYWNrRW50cnknKTtcbnNwaW5lLkFuaW1hdGlvblN0YXRlID0gZnVuY3Rpb24gKHN0YXRlRGF0YSlcbntcbiAgICB0aGlzLmRhdGEgPSBzdGF0ZURhdGE7XG4gICAgdGhpcy50cmFja3MgPSBbXTtcbiAgICB0aGlzLmV2ZW50cyA9IFtdO1xufTtcbnNwaW5lLkFuaW1hdGlvblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBvblN0YXJ0OiBudWxsLFxuICAgIG9uRW5kOiBudWxsLFxuICAgIG9uQ29tcGxldGU6IG51bGwsXG4gICAgb25FdmVudDogbnVsbCxcbiAgICB0aW1lU2NhbGU6IDEsXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZGVsdGEpXG4gICAge1xuICAgICAgICBkZWx0YSAqPSB0aGlzLnRpbWVTY2FsZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyYWNrcy5sZW5ndGg7IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRyYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICghY3VycmVudCkgY29udGludWU7XG5cbiAgICAgICAgICAgIGN1cnJlbnQudGltZSArPSBkZWx0YSAqIGN1cnJlbnQudGltZVNjYWxlO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnQucHJldmlvdXMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzRGVsdGEgPSBkZWx0YSAqIGN1cnJlbnQucHJldmlvdXMudGltZVNjYWxlO1xuICAgICAgICAgICAgICAgIGN1cnJlbnQucHJldmlvdXMudGltZSArPSBwcmV2aW91c0RlbHRhO1xuICAgICAgICAgICAgICAgIGN1cnJlbnQubWl4VGltZSArPSBwcmV2aW91c0RlbHRhO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbmV4dCA9IGN1cnJlbnQubmV4dDtcbiAgICAgICAgICAgIGlmIChuZXh0KVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5leHQudGltZSA9IGN1cnJlbnQubGFzdFRpbWUgLSBuZXh0LmRlbGF5O1xuICAgICAgICAgICAgICAgIGlmIChuZXh0LnRpbWUgPj0gMCkgdGhpcy5zZXRDdXJyZW50KGksIG5leHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbmQgbm9uLWxvb3BpbmcgYW5pbWF0aW9uIHdoZW4gaXQgcmVhY2hlcyBpdHMgZW5kIHRpbWUgYW5kIHRoZXJlIGlzIG5vIG5leHQgZW50cnkuXG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50Lmxvb3AgJiYgY3VycmVudC5sYXN0VGltZSA+PSBjdXJyZW50LmVuZFRpbWUpIHRoaXMuY2xlYXJUcmFjayhpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbilcbiAgICB7XG4gICAgICAgIHNrZWxldG9uLnJlc2V0RHJhd09yZGVyKCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyYWNrcy5sZW5ndGg7IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRyYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICghY3VycmVudCkgY29udGludWU7XG5cbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgIHZhciB0aW1lID0gY3VycmVudC50aW1lO1xuICAgICAgICAgICAgdmFyIGxhc3RUaW1lID0gY3VycmVudC5sYXN0VGltZTtcbiAgICAgICAgICAgIHZhciBlbmRUaW1lID0gY3VycmVudC5lbmRUaW1lO1xuICAgICAgICAgICAgdmFyIGxvb3AgPSBjdXJyZW50Lmxvb3A7XG4gICAgICAgICAgICBpZiAoIWxvb3AgJiYgdGltZSA+IGVuZFRpbWUpIHRpbWUgPSBlbmRUaW1lO1xuXG4gICAgICAgICAgICB2YXIgcHJldmlvdXMgPSBjdXJyZW50LnByZXZpb3VzO1xuICAgICAgICAgICAgaWYgKCFwcmV2aW91cylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5taXggPT0gMSlcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudC5hbmltYXRpb24uYXBwbHkoc2tlbGV0b24sIGN1cnJlbnQubGFzdFRpbWUsIHRpbWUsIGxvb3AsIHRoaXMuZXZlbnRzKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQuYW5pbWF0aW9uLm1peChza2VsZXRvbiwgY3VycmVudC5sYXN0VGltZSwgdGltZSwgbG9vcCwgdGhpcy5ldmVudHMsIGN1cnJlbnQubWl4KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzVGltZSA9IHByZXZpb3VzLnRpbWU7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmV2aW91cy5sb29wICYmIHByZXZpb3VzVGltZSA+IHByZXZpb3VzLmVuZFRpbWUpIHByZXZpb3VzVGltZSA9IHByZXZpb3VzLmVuZFRpbWU7XG4gICAgICAgICAgICAgICAgcHJldmlvdXMuYW5pbWF0aW9uLmFwcGx5KHNrZWxldG9uLCBwcmV2aW91c1RpbWUsIHByZXZpb3VzVGltZSwgcHJldmlvdXMubG9vcCwgbnVsbCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYWxwaGEgPSBjdXJyZW50Lm1peFRpbWUgLyBjdXJyZW50Lm1peER1cmF0aW9uICogY3VycmVudC5taXg7XG4gICAgICAgICAgICAgICAgaWYgKGFscGhhID49IDEpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhbHBoYSA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQucHJldmlvdXMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJyZW50LmFuaW1hdGlvbi5taXgoc2tlbGV0b24sIGN1cnJlbnQubGFzdFRpbWUsIHRpbWUsIGxvb3AsIHRoaXMuZXZlbnRzLCBhbHBoYSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSB0aGlzLmV2ZW50cy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudHNbaWldO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Lm9uRXZlbnQpIGN1cnJlbnQub25FdmVudChpLCBldmVudCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25FdmVudCkgdGhpcy5vbkV2ZW50KGksIGV2ZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY29tcGxldGVkIHRoZSBhbmltYXRpb24gb3IgYSBsb29wIGl0ZXJhdGlvbi5cbiAgICAgICAgICAgIGlmIChsb29wID8gKGxhc3RUaW1lICUgZW5kVGltZSA+IHRpbWUgJSBlbmRUaW1lKSA6IChsYXN0VGltZSA8IGVuZFRpbWUgJiYgdGltZSA+PSBlbmRUaW1lKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgY291bnQgPSBNYXRoLmZsb29yKHRpbWUgLyBlbmRUaW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5vbkNvbXBsZXRlKSBjdXJyZW50Lm9uQ29tcGxldGUoaSwgY291bnQpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uQ29tcGxldGUpIHRoaXMub25Db21wbGV0ZShpLCBjb3VudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1cnJlbnQubGFzdFRpbWUgPSBjdXJyZW50LnRpbWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGNsZWFyVHJhY2tzOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLnRyYWNrcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICB0aGlzLmNsZWFyVHJhY2soaSk7XG4gICAgICAgIHRoaXMudHJhY2tzLmxlbmd0aCA9IDA7XG4gICAgfSxcbiAgICBjbGVhclRyYWNrOiBmdW5jdGlvbiAodHJhY2tJbmRleClcbiAgICB7XG4gICAgICAgIGlmICh0cmFja0luZGV4ID49IHRoaXMudHJhY2tzLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICB2YXIgY3VycmVudCA9IHRoaXMudHJhY2tzW3RyYWNrSW5kZXhdO1xuICAgICAgICBpZiAoIWN1cnJlbnQpIHJldHVybjtcblxuICAgICAgICBpZiAoY3VycmVudC5vbkVuZCkgY3VycmVudC5vbkVuZCh0cmFja0luZGV4KTtcbiAgICAgICAgaWYgKHRoaXMub25FbmQpIHRoaXMub25FbmQodHJhY2tJbmRleCk7XG5cbiAgICAgICAgdGhpcy50cmFja3NbdHJhY2tJbmRleF0gPSBudWxsO1xuICAgIH0sXG4gICAgX2V4cGFuZFRvSW5kZXg6IGZ1bmN0aW9uIChpbmRleClcbiAgICB7XG4gICAgICAgIGlmIChpbmRleCA8IHRoaXMudHJhY2tzLmxlbmd0aCkgcmV0dXJuIHRoaXMudHJhY2tzW2luZGV4XTtcbiAgICAgICAgd2hpbGUgKGluZGV4ID49IHRoaXMudHJhY2tzLmxlbmd0aClcbiAgICAgICAgICAgIHRoaXMudHJhY2tzLnB1c2gobnVsbCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudDogZnVuY3Rpb24gKGluZGV4LCBlbnRyeSlcbiAgICB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gdGhpcy5fZXhwYW5kVG9JbmRleChpbmRleCk7XG4gICAgICAgIGlmIChjdXJyZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcHJldmlvdXMgPSBjdXJyZW50LnByZXZpb3VzO1xuICAgICAgICAgICAgY3VycmVudC5wcmV2aW91cyA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50Lm9uRW5kKSBjdXJyZW50Lm9uRW5kKGluZGV4KTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9uRW5kKSB0aGlzLm9uRW5kKGluZGV4KTtcblxuICAgICAgICAgICAgZW50cnkubWl4RHVyYXRpb24gPSB0aGlzLmRhdGEuZ2V0TWl4KGN1cnJlbnQuYW5pbWF0aW9uLCBlbnRyeS5hbmltYXRpb24pO1xuICAgICAgICAgICAgaWYgKGVudHJ5Lm1peER1cmF0aW9uID4gMClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbnRyeS5taXhUaW1lID0gMDtcbiAgICAgICAgICAgICAgICAvLyBJZiBhIG1peCBpcyBpbiBwcm9ncmVzcywgbWl4IGZyb20gdGhlIGNsb3Nlc3QgYW5pbWF0aW9uLlxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91cyAmJiBjdXJyZW50Lm1peFRpbWUgLyBjdXJyZW50Lm1peER1cmF0aW9uIDwgMC41KVxuICAgICAgICAgICAgICAgICAgICBlbnRyeS5wcmV2aW91cyA9IHByZXZpb3VzO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgZW50cnkucHJldmlvdXMgPSBjdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmFja3NbaW5kZXhdID0gZW50cnk7XG5cbiAgICAgICAgaWYgKGVudHJ5Lm9uU3RhcnQpIGVudHJ5Lm9uU3RhcnQoaW5kZXgpO1xuICAgICAgICBpZiAodGhpcy5vblN0YXJ0KSB0aGlzLm9uU3RhcnQoaW5kZXgpO1xuICAgIH0sXG4gICAgc2V0QW5pbWF0aW9uQnlOYW1lOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uTmFtZSwgbG9vcClcbiAgICB7XG4gICAgICAgIHZhciBhbmltYXRpb24gPSB0aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYW5pbWF0aW9uTmFtZSk7XG4gICAgICAgIGlmICghYW5pbWF0aW9uKSB0aHJvdyBcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiICsgYW5pbWF0aW9uTmFtZTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QW5pbWF0aW9uKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcCk7XG4gICAgfSxcbiAgICAvKiogU2V0IHRoZSBjdXJyZW50IGFuaW1hdGlvbi4gQW55IHF1ZXVlZCBhbmltYXRpb25zIGFyZSBjbGVhcmVkLiAqL1xuICAgIHNldEFuaW1hdGlvbjogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcClcbiAgICB7XG4gICAgICAgIHZhciBlbnRyeSA9IG5ldyBzcGluZS5UcmFja0VudHJ5KCk7XG4gICAgICAgIGVudHJ5LmFuaW1hdGlvbiA9IGFuaW1hdGlvbjtcbiAgICAgICAgZW50cnkubG9vcCA9IGxvb3A7XG4gICAgICAgIGVudHJ5LmVuZFRpbWUgPSBhbmltYXRpb24uZHVyYXRpb247XG4gICAgICAgIHRoaXMuc2V0Q3VycmVudCh0cmFja0luZGV4LCBlbnRyeSk7XG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9LFxuICAgIGFkZEFuaW1hdGlvbkJ5TmFtZTogZnVuY3Rpb24gKHRyYWNrSW5kZXgsIGFuaW1hdGlvbk5hbWUsIGxvb3AsIGRlbGF5KVxuICAgIHtcbiAgICAgICAgdmFyIGFuaW1hdGlvbiA9IHRoaXMuZGF0YS5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhbmltYXRpb25OYW1lKTtcbiAgICAgICAgaWYgKCFhbmltYXRpb24pIHRocm93IFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyBhbmltYXRpb25OYW1lO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRBbmltYXRpb24odHJhY2tJbmRleCwgYW5pbWF0aW9uLCBsb29wLCBkZWxheSk7XG4gICAgfSxcbiAgICAvKiogQWRkcyBhbiBhbmltYXRpb24gdG8gYmUgcGxheWVkIGRlbGF5IHNlY29uZHMgYWZ0ZXIgdGhlIGN1cnJlbnQgb3IgbGFzdCBxdWV1ZWQgYW5pbWF0aW9uLlxuICAgICAqIEBwYXJhbSBkZWxheSBNYXkgYmUgPD0gMCB0byB1c2UgZHVyYXRpb24gb2YgcHJldmlvdXMgYW5pbWF0aW9uIG1pbnVzIGFueSBtaXggZHVyYXRpb24gcGx1cyB0aGUgbmVnYXRpdmUgZGVsYXkuICovXG4gICAgYWRkQW5pbWF0aW9uOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uLCBsb29wLCBkZWxheSlcbiAgICB7XG4gICAgICAgIHZhciBlbnRyeSA9IG5ldyBzcGluZS5UcmFja0VudHJ5KCk7XG4gICAgICAgIGVudHJ5LmFuaW1hdGlvbiA9IGFuaW1hdGlvbjtcbiAgICAgICAgZW50cnkubG9vcCA9IGxvb3A7XG4gICAgICAgIGVudHJ5LmVuZFRpbWUgPSBhbmltYXRpb24uZHVyYXRpb247XG5cbiAgICAgICAgdmFyIGxhc3QgPSB0aGlzLl9leHBhbmRUb0luZGV4KHRyYWNrSW5kZXgpO1xuICAgICAgICBpZiAobGFzdClcbiAgICAgICAge1xuICAgICAgICAgICAgd2hpbGUgKGxhc3QubmV4dClcbiAgICAgICAgICAgICAgICBsYXN0ID0gbGFzdC5uZXh0O1xuICAgICAgICAgICAgbGFzdC5uZXh0ID0gZW50cnk7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgdGhpcy50cmFja3NbdHJhY2tJbmRleF0gPSBlbnRyeTtcblxuICAgICAgICBpZiAoZGVsYXkgPD0gMClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGxhc3QpXG4gICAgICAgICAgICAgICAgZGVsYXkgKz0gbGFzdC5lbmRUaW1lIC0gdGhpcy5kYXRhLmdldE1peChsYXN0LmFuaW1hdGlvbiwgYW5pbWF0aW9uKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBkZWxheSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZW50cnkuZGVsYXkgPSBkZWxheTtcblxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgfSxcbiAgICAvKiogTWF5IGJlIG51bGwuICovXG4gICAgZ2V0Q3VycmVudDogZnVuY3Rpb24gKHRyYWNrSW5kZXgpXG4gICAge1xuICAgICAgICBpZiAodHJhY2tJbmRleCA+PSB0aGlzLnRyYWNrcy5sZW5ndGgpIHJldHVybiBudWxsO1xuICAgICAgICByZXR1cm4gdGhpcy50cmFja3NbdHJhY2tJbmRleF07XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQW5pbWF0aW9uU3RhdGU7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhID0gZnVuY3Rpb24gKHNrZWxldG9uRGF0YSlcbntcbiAgICB0aGlzLnNrZWxldG9uRGF0YSA9IHNrZWxldG9uRGF0YTtcbiAgICB0aGlzLmFuaW1hdGlvblRvTWl4VGltZSA9IHt9O1xufTtcbnNwaW5lLkFuaW1hdGlvblN0YXRlRGF0YS5wcm90b3R5cGUgPSB7XG4gICAgZGVmYXVsdE1peDogMCxcbiAgICBzZXRNaXhCeU5hbWU6IGZ1bmN0aW9uIChmcm9tTmFtZSwgdG9OYW1lLCBkdXJhdGlvbilcbiAgICB7XG4gICAgICAgIHZhciBmcm9tID0gdGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihmcm9tTmFtZSk7XG4gICAgICAgIGlmICghZnJvbSkgdGhyb3cgXCJBbmltYXRpb24gbm90IGZvdW5kOiBcIiArIGZyb21OYW1lO1xuICAgICAgICB2YXIgdG8gPSB0aGlzLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKHRvTmFtZSk7XG4gICAgICAgIGlmICghdG8pIHRocm93IFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyB0b05hbWU7XG4gICAgICAgIHRoaXMuc2V0TWl4KGZyb20sIHRvLCBkdXJhdGlvbik7XG4gICAgfSxcbiAgICBzZXRNaXg6IGZ1bmN0aW9uIChmcm9tLCB0bywgZHVyYXRpb24pXG4gICAge1xuICAgICAgICB0aGlzLmFuaW1hdGlvblRvTWl4VGltZVtmcm9tLm5hbWUgKyBcIjpcIiArIHRvLm5hbWVdID0gZHVyYXRpb247XG4gICAgfSxcbiAgICBnZXRNaXg6IGZ1bmN0aW9uIChmcm9tLCB0bylcbiAgICB7XG4gICAgICAgIHZhciBrZXkgPSBmcm9tLm5hbWUgKyBcIjpcIiArIHRvLm5hbWU7XG4gICAgICAgIHJldHVybiB0aGlzLmFuaW1hdGlvblRvTWl4VGltZS5oYXNPd25Qcm9wZXJ0eShrZXkpID8gdGhpcy5hbmltYXRpb25Ub01peFRpbWVba2V5XSA6IHRoaXMuZGVmYXVsdE1peDtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BbmltYXRpb25TdGF0ZURhdGE7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQXRsYXNSZWFkZXIgPSByZXF1aXJlKCcuL0F0bGFzUmVhZGVyJyk7XG5zcGluZS5BdGxhc1BhZ2UgPSByZXF1aXJlKCcuL0F0bGFzUGFnZScpO1xuc3BpbmUuQXRsYXNSZWdpb24gPSByZXF1aXJlKCcuL0F0bGFzUmVnaW9uJyk7XG5cbnNwaW5lLkF0bGFzID0gZnVuY3Rpb24gKGF0bGFzVGV4dCwgYmFzZVVybCwgY3Jvc3NPcmlnaW4pXG57XG4gICAgaWYgKGJhc2VVcmwgJiYgYmFzZVVybC5pbmRleE9mKCcvJykgIT09IGJhc2VVcmwubGVuZ3RoKVxuICAgIHtcbiAgICAgICAgYmFzZVVybCArPSAnLyc7XG4gICAgfVxuXG4gICAgdGhpcy5wYWdlcyA9IFtdO1xuICAgIHRoaXMucmVnaW9ucyA9IFtdO1xuXG4gICAgdGhpcy50ZXh0dXJlc0xvYWRpbmcgPSAwO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlYWRlciA9IG5ldyBzcGluZS5BdGxhc1JlYWRlcihhdGxhc1RleHQpO1xuICAgIHZhciB0dXBsZSA9IFtdO1xuICAgIHR1cGxlLmxlbmd0aCA9IDQ7XG4gICAgdmFyIHBhZ2UgPSBudWxsO1xuICAgIHdoaWxlICh0cnVlKVxuICAgIHtcbiAgICAgICAgdmFyIGxpbmUgPSByZWFkZXIucmVhZExpbmUoKTtcbiAgICAgICAgaWYgKGxpbmUgPT09IG51bGwpIGJyZWFrO1xuICAgICAgICBsaW5lID0gcmVhZGVyLnRyaW0obGluZSk7XG4gICAgICAgIGlmICghbGluZS5sZW5ndGgpXG4gICAgICAgICAgICBwYWdlID0gbnVsbDtcbiAgICAgICAgZWxzZSBpZiAoIXBhZ2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHBhZ2UgPSBuZXcgc3BpbmUuQXRsYXNQYWdlKCk7XG4gICAgICAgICAgICBwYWdlLm5hbWUgPSBsaW5lO1xuXG4gICAgICAgICAgICBpZiAocmVhZGVyLnJlYWRUdXBsZSh0dXBsZSkgPT0gMilcbiAgICAgICAgICAgIHsgLy8gc2l6ZSBpcyBvbmx5IG9wdGlvbmFsIGZvciBhbiBhdGxhcyBwYWNrZWQgd2l0aCBhbiBvbGQgVGV4dHVyZVBhY2tlci5cbiAgICAgICAgICAgICAgICBwYWdlLndpZHRoID0gcGFyc2VJbnQodHVwbGVbMF0pO1xuICAgICAgICAgICAgICAgIHBhZ2UuaGVpZ2h0ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFnZS5mb3JtYXQgPSBzcGluZS5BdGxhcy5Gb3JtYXRbdHVwbGVbMF1dO1xuXG4gICAgICAgICAgICByZWFkZXIucmVhZFR1cGxlKHR1cGxlKTtcbiAgICAgICAgICAgIHBhZ2UubWluRmlsdGVyID0gc3BpbmUuQXRsYXMuVGV4dHVyZUZpbHRlclt0dXBsZVswXV07XG4gICAgICAgICAgICBwYWdlLm1hZ0ZpbHRlciA9IHNwaW5lLkF0bGFzLlRleHR1cmVGaWx0ZXJbdHVwbGVbMV1dO1xuXG4gICAgICAgICAgICB2YXIgZGlyZWN0aW9uID0gcmVhZGVyLnJlYWRWYWx1ZSgpO1xuICAgICAgICAgICAgcGFnZS51V3JhcCA9IHNwaW5lLkF0bGFzLlRleHR1cmVXcmFwLmNsYW1wVG9FZGdlO1xuICAgICAgICAgICAgcGFnZS52V3JhcCA9IHNwaW5lLkF0bGFzLlRleHR1cmVXcmFwLmNsYW1wVG9FZGdlO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBcInhcIilcbiAgICAgICAgICAgICAgICBwYWdlLnVXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0O1xuICAgICAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IFwieVwiKVxuICAgICAgICAgICAgICAgIHBhZ2UudldyYXAgPSBzcGluZS5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ7XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gXCJ4eVwiKVxuICAgICAgICAgICAgICAgIHBhZ2UudVdyYXAgPSBwYWdlLnZXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0O1xuXG4gICAgICAgICAgICBwYWdlLnJlbmRlcmVyT2JqZWN0ID0gUElYSS5CYXNlVGV4dHVyZS5mcm9tSW1hZ2UoYmFzZVVybCArIGxpbmUsIGNyb3NzT3JpZ2luKTtcblxuICAgICAgICAgICAgdGhpcy5wYWdlcy5wdXNoKHBhZ2UpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gbmV3IHNwaW5lLkF0bGFzUmVnaW9uKCk7XG4gICAgICAgICAgICByZWdpb24ubmFtZSA9IGxpbmU7XG4gICAgICAgICAgICByZWdpb24ucGFnZSA9IHBhZ2U7XG5cbiAgICAgICAgICAgIHJlZ2lvbi5yb3RhdGUgPSByZWFkZXIucmVhZFZhbHVlKCkgPT0gXCJ0cnVlXCI7XG5cbiAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xuICAgICAgICAgICAgdmFyIHggPSBwYXJzZUludCh0dXBsZVswXSk7XG4gICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KHR1cGxlWzFdKTtcblxuICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBwYXJzZUludCh0dXBsZVswXSk7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xuXG4gICAgICAgICAgICByZWdpb24udSA9IHggLyBwYWdlLndpZHRoO1xuICAgICAgICAgICAgcmVnaW9uLnYgPSB5IC8gcGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICBpZiAocmVnaW9uLnJvdGF0ZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZWdpb24udTIgPSAoeCArIGhlaWdodCkgLyBwYWdlLndpZHRoO1xuICAgICAgICAgICAgICAgIHJlZ2lvbi52MiA9ICh5ICsgd2lkdGgpIC8gcGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9ICh4ICsgd2lkdGgpIC8gcGFnZS53aWR0aDtcbiAgICAgICAgICAgICAgICByZWdpb24udjIgPSAoeSArIGhlaWdodCkgLyBwYWdlLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZ2lvbi54ID0geDtcbiAgICAgICAgICAgIHJlZ2lvbi55ID0geTtcbiAgICAgICAgICAgIHJlZ2lvbi53aWR0aCA9IE1hdGguYWJzKHdpZHRoKTtcbiAgICAgICAgICAgIHJlZ2lvbi5oZWlnaHQgPSBNYXRoLmFicyhoZWlnaHQpO1xuXG4gICAgICAgICAgICBpZiAocmVhZGVyLnJlYWRUdXBsZSh0dXBsZSkgPT0gNClcbiAgICAgICAgICAgIHsgLy8gc3BsaXQgaXMgb3B0aW9uYWxcbiAgICAgICAgICAgICAgICByZWdpb24uc3BsaXRzID0gW3BhcnNlSW50KHR1cGxlWzBdKSwgcGFyc2VJbnQodHVwbGVbMV0pLCBwYXJzZUludCh0dXBsZVsyXSksIHBhcnNlSW50KHR1cGxlWzNdKV07XG5cbiAgICAgICAgICAgICAgICBpZiAocmVhZGVyLnJlYWRUdXBsZSh0dXBsZSkgPT0gNClcbiAgICAgICAgICAgICAgICB7IC8vIHBhZCBpcyBvcHRpb25hbCwgYnV0IG9ubHkgcHJlc2VudCB3aXRoIHNwbGl0c1xuICAgICAgICAgICAgICAgICAgICByZWdpb24ucGFkcyA9IFtwYXJzZUludCh0dXBsZVswXSksIHBhcnNlSW50KHR1cGxlWzFdKSwgcGFyc2VJbnQodHVwbGVbMl0pLCBwYXJzZUludCh0dXBsZVszXSldO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVnaW9uLm9yaWdpbmFsV2lkdGggPSBwYXJzZUludCh0dXBsZVswXSk7XG4gICAgICAgICAgICByZWdpb24ub3JpZ2luYWxIZWlnaHQgPSBwYXJzZUludCh0dXBsZVsxXSk7XG5cbiAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xuICAgICAgICAgICAgcmVnaW9uLm9mZnNldFggPSBwYXJzZUludCh0dXBsZVswXSk7XG4gICAgICAgICAgICByZWdpb24ub2Zmc2V0WSA9IHBhcnNlSW50KHR1cGxlWzFdKTtcblxuICAgICAgICAgICAgcmVnaW9uLmluZGV4ID0gcGFyc2VJbnQocmVhZGVyLnJlYWRWYWx1ZSgpKTtcblxuICAgICAgICAgICAgdGhpcy5yZWdpb25zLnB1c2gocmVnaW9uKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5zcGluZS5BdGxhcy5wcm90b3R5cGUgPSB7XG4gICAgZmluZFJlZ2lvbjogZnVuY3Rpb24gKG5hbWUpXG4gICAge1xuICAgICAgICB2YXIgcmVnaW9ucyA9IHRoaXMucmVnaW9ucztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSByZWdpb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChyZWdpb25zW2ldLm5hbWUgPT0gbmFtZSkgcmV0dXJuIHJlZ2lvbnNbaV07XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgZGlzcG9zZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciBwYWdlcyA9IHRoaXMucGFnZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gcGFnZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgcGFnZXNbaV0ucmVuZGVyZXJPYmplY3QuZGVzdHJveSh0cnVlKTtcbiAgICB9LFxuICAgIHVwZGF0ZVVWczogZnVuY3Rpb24gKHBhZ2UpXG4gICAge1xuICAgICAgICB2YXIgcmVnaW9ucyA9IHRoaXMucmVnaW9ucztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSByZWdpb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHJlZ2lvbiA9IHJlZ2lvbnNbaV07XG4gICAgICAgICAgICBpZiAocmVnaW9uLnBhZ2UgIT0gcGFnZSkgY29udGludWU7XG4gICAgICAgICAgICByZWdpb24udSA9IHJlZ2lvbi54IC8gcGFnZS53aWR0aDtcbiAgICAgICAgICAgIHJlZ2lvbi52ID0gcmVnaW9uLnkgLyBwYWdlLmhlaWdodDtcbiAgICAgICAgICAgIGlmIChyZWdpb24ucm90YXRlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9IChyZWdpb24ueCArIHJlZ2lvbi5oZWlnaHQpIC8gcGFnZS53aWR0aDtcbiAgICAgICAgICAgICAgICByZWdpb24udjIgPSAocmVnaW9uLnkgKyByZWdpb24ud2lkdGgpIC8gcGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9IChyZWdpb24ueCArIHJlZ2lvbi53aWR0aCkgLyBwYWdlLndpZHRoO1xuICAgICAgICAgICAgICAgIHJlZ2lvbi52MiA9IChyZWdpb24ueSArIHJlZ2lvbi5oZWlnaHQpIC8gcGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5zcGluZS5BdGxhcy5Gb3JtYXQgPSB7XG4gICAgYWxwaGE6IDAsXG4gICAgaW50ZW5zaXR5OiAxLFxuICAgIGx1bWluYW5jZUFscGhhOiAyLFxuICAgIHJnYjU2NTogMyxcbiAgICByZ2JhNDQ0NDogNCxcbiAgICByZ2I4ODg6IDUsXG4gICAgcmdiYTg4ODg6IDZcbn07XG5cbnNwaW5lLkF0bGFzLlRleHR1cmVGaWx0ZXIgPSB7XG4gICAgbmVhcmVzdDogMCxcbiAgICBsaW5lYXI6IDEsXG4gICAgbWlwTWFwOiAyLFxuICAgIG1pcE1hcE5lYXJlc3ROZWFyZXN0OiAzLFxuICAgIG1pcE1hcExpbmVhck5lYXJlc3Q6IDQsXG4gICAgbWlwTWFwTmVhcmVzdExpbmVhcjogNSxcbiAgICBtaXBNYXBMaW5lYXJMaW5lYXI6IDZcbn07XG5cbnNwaW5lLkF0bGFzLlRleHR1cmVXcmFwID0ge1xuICAgIG1pcnJvcmVkUmVwZWF0OiAwLFxuICAgIGNsYW1wVG9FZGdlOiAxLFxuICAgIHJlcGVhdDogMlxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXM7XG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL1JlZ2lvbkF0dGFjaG1lbnQnKTtcbnNwaW5lLk1lc2hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9NZXNoQXR0YWNobWVudCcpO1xuc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9Ta2lubmVkTWVzaEF0dGFjaG1lbnQnKTtcbnNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudCA9IHJlcXVpcmUoJy4vQm91bmRpbmdCb3hBdHRhY2htZW50Jyk7XG5zcGluZS5BdGxhc0F0dGFjaG1lbnRQYXJzZXIgPSBmdW5jdGlvbiAoYXRsYXMpXG57XG4gICAgdGhpcy5hdGxhcyA9IGF0bGFzO1xufTtcbnNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlci5wcm90b3R5cGUgPSB7XG4gICAgbmV3UmVnaW9uQXR0YWNobWVudDogZnVuY3Rpb24gKHNraW4sIG5hbWUsIHBhdGgpXG4gICAge1xuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdGxhcy5maW5kUmVnaW9uKHBhdGgpO1xuICAgICAgICBpZiAoIXJlZ2lvbikgdGhyb3cgXCJSZWdpb24gbm90IGZvdW5kIGluIGF0bGFzOiBcIiArIHBhdGggKyBcIiAocmVnaW9uIGF0dGFjaG1lbnQ6IFwiICsgbmFtZSArIFwiKVwiO1xuICAgICAgICB2YXIgYXR0YWNobWVudCA9IG5ldyBzcGluZS5SZWdpb25BdHRhY2htZW50KG5hbWUpO1xuICAgICAgICBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0ID0gcmVnaW9uO1xuICAgICAgICBhdHRhY2htZW50LnNldFVWcyhyZWdpb24udSwgcmVnaW9uLnYsIHJlZ2lvbi51MiwgcmVnaW9uLnYyLCByZWdpb24ucm90YXRlKTtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PZmZzZXRYID0gcmVnaW9uLm9mZnNldFg7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WSA9IHJlZ2lvbi5vZmZzZXRZO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbldpZHRoID0gcmVnaW9uLndpZHRoO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbkhlaWdodCA9IHJlZ2lvbi5oZWlnaHQ7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxXaWR0aCA9IHJlZ2lvbi5vcmlnaW5hbFdpZHRoO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ID0gcmVnaW9uLm9yaWdpbmFsSGVpZ2h0O1xuICAgICAgICByZXR1cm4gYXR0YWNobWVudDtcbiAgICB9LFxuICAgIG5ld01lc2hBdHRhY2htZW50OiBmdW5jdGlvbiAoc2tpbiwgbmFtZSwgcGF0aClcbiAgICB7XG4gICAgICAgIHZhciByZWdpb24gPSB0aGlzLmF0bGFzLmZpbmRSZWdpb24ocGF0aCk7XG4gICAgICAgIGlmICghcmVnaW9uKSB0aHJvdyBcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiICsgcGF0aCArIFwiIChtZXNoIGF0dGFjaG1lbnQ6IFwiICsgbmFtZSArIFwiKVwiO1xuICAgICAgICB2YXIgYXR0YWNobWVudCA9IG5ldyBzcGluZS5NZXNoQXR0YWNobWVudChuYW1lKTtcbiAgICAgICAgYXR0YWNobWVudC5yZW5kZXJlck9iamVjdCA9IHJlZ2lvbjtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25VID0gcmVnaW9uLnU7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uViA9IHJlZ2lvbi52O1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblUyID0gcmVnaW9uLnUyO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblYyID0gcmVnaW9uLnYyO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblJvdGF0ZSA9IHJlZ2lvbi5yb3RhdGU7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WCA9IHJlZ2lvbi5vZmZzZXRYO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFkgPSByZWdpb24ub2Zmc2V0WTtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25XaWR0aCA9IHJlZ2lvbi53aWR0aDtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25IZWlnaHQgPSByZWdpb24uaGVpZ2h0O1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsV2lkdGggPSByZWdpb24ub3JpZ2luYWxXaWR0aDtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PcmlnaW5hbEhlaWdodCA9IHJlZ2lvbi5vcmlnaW5hbEhlaWdodDtcbiAgICAgICAgcmV0dXJuIGF0dGFjaG1lbnQ7XG4gICAgfSxcbiAgICBuZXdTa2lubmVkTWVzaEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChza2luLCBuYW1lLCBwYXRoKVxuICAgIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuYXRsYXMuZmluZFJlZ2lvbihwYXRoKTtcbiAgICAgICAgaWYgKCFyZWdpb24pIHRocm93IFwiUmVnaW9uIG5vdCBmb3VuZCBpbiBhdGxhczogXCIgKyBwYXRoICsgXCIgKHNraW5uZWQgbWVzaCBhdHRhY2htZW50OiBcIiArIG5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBuZXcgc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50KG5hbWUpO1xuICAgICAgICBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0ID0gcmVnaW9uO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblUgPSByZWdpb24udTtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25WID0gcmVnaW9uLnY7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uVTIgPSByZWdpb24udTI7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uVjIgPSByZWdpb24udjI7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uUm90YXRlID0gcmVnaW9uLnJvdGF0ZTtcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25PZmZzZXRYID0gcmVnaW9uLm9mZnNldFg7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WSA9IHJlZ2lvbi5vZmZzZXRZO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbldpZHRoID0gcmVnaW9uLndpZHRoO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbkhlaWdodCA9IHJlZ2lvbi5oZWlnaHQ7XG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxXaWR0aCA9IHJlZ2lvbi5vcmlnaW5hbFdpZHRoO1xuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ID0gcmVnaW9uLm9yaWdpbmFsSGVpZ2h0O1xuICAgICAgICByZXR1cm4gYXR0YWNobWVudDtcbiAgICB9LFxuICAgIG5ld0JvdW5kaW5nQm94QXR0YWNobWVudDogZnVuY3Rpb24gKHNraW4sIG5hbWUpXG4gICAge1xuICAgICAgICByZXR1cm4gbmV3IHNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudChuYW1lKTtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdGxhc0F0dGFjaG1lbnRQYXJzZXI7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQXRsYXNQYWdlID0gZnVuY3Rpb24gKClcbnt9O1xuc3BpbmUuQXRsYXNQYWdlLnByb3RvdHlwZSA9IHtcbiAgICBuYW1lOiBudWxsLFxuICAgIGZvcm1hdDogbnVsbCxcbiAgICBtaW5GaWx0ZXI6IG51bGwsXG4gICAgbWFnRmlsdGVyOiBudWxsLFxuICAgIHVXcmFwOiBudWxsLFxuICAgIHZXcmFwOiBudWxsLFxuICAgIHJlbmRlcmVyT2JqZWN0OiBudWxsLFxuICAgIHdpZHRoOiAwLFxuICAgIGhlaWdodDogMFxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXNQYWdlO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkF0bGFzUmVhZGVyID0gZnVuY3Rpb24gKHRleHQpXG57XG4gICAgdGhpcy5saW5lcyA9IHRleHQuc3BsaXQoL1xcclxcbnxcXHJ8XFxuLyk7XG59O1xuc3BpbmUuQXRsYXNSZWFkZXIucHJvdG90eXBlID0ge1xuICAgIGluZGV4OiAwLFxuICAgIHRyaW06IGZ1bmN0aW9uICh2YWx1ZSlcbiAgICB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCBcIlwiKTtcbiAgICB9LFxuICAgIHJlYWRMaW5lOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5saW5lcy5sZW5ndGgpIHJldHVybiBudWxsO1xuICAgICAgICByZXR1cm4gdGhpcy5saW5lc1t0aGlzLmluZGV4KytdO1xuICAgIH0sXG4gICAgcmVhZFZhbHVlOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgdmFyIGxpbmUgPSB0aGlzLnJlYWRMaW5lKCk7XG4gICAgICAgIHZhciBjb2xvbiA9IGxpbmUuaW5kZXhPZihcIjpcIik7XG4gICAgICAgIGlmIChjb2xvbiA9PSAtMSkgdGhyb3cgXCJJbnZhbGlkIGxpbmU6IFwiICsgbGluZTtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJpbShsaW5lLnN1YnN0cmluZyhjb2xvbiArIDEpKTtcbiAgICB9LFxuICAgIC8qKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgdHVwbGUgdmFsdWVzIHJlYWQgKDEsIDIgb3IgNCkuICovXG4gICAgcmVhZFR1cGxlOiBmdW5jdGlvbiAodHVwbGUpXG4gICAge1xuICAgICAgICB2YXIgbGluZSA9IHRoaXMucmVhZExpbmUoKTtcbiAgICAgICAgdmFyIGNvbG9uID0gbGluZS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgaWYgKGNvbG9uID09IC0xKSB0aHJvdyBcIkludmFsaWQgbGluZTogXCIgKyBsaW5lO1xuICAgICAgICB2YXIgaSA9IDAsIGxhc3RNYXRjaCA9IGNvbG9uICsgMTtcbiAgICAgICAgZm9yICg7IGkgPCAzOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBjb21tYSA9IGxpbmUuaW5kZXhPZihcIixcIiwgbGFzdE1hdGNoKTtcbiAgICAgICAgICAgIGlmIChjb21tYSA9PSAtMSkgYnJlYWs7XG4gICAgICAgICAgICB0dXBsZVtpXSA9IHRoaXMudHJpbShsaW5lLnN1YnN0cihsYXN0TWF0Y2gsIGNvbW1hIC0gbGFzdE1hdGNoKSk7XG4gICAgICAgICAgICBsYXN0TWF0Y2ggPSBjb21tYSArIDE7XG4gICAgICAgIH1cbiAgICAgICAgdHVwbGVbaV0gPSB0aGlzLnRyaW0obGluZS5zdWJzdHJpbmcobGFzdE1hdGNoKSk7XG4gICAgICAgIHJldHVybiBpICsgMTtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdGxhc1JlYWRlcjtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5BdGxhc1JlZ2lvbiA9IGZ1bmN0aW9uICgpXG57fTtcbnNwaW5lLkF0bGFzUmVnaW9uLnByb3RvdHlwZSA9IHtcbiAgICBwYWdlOiBudWxsLFxuICAgIG5hbWU6IG51bGwsXG4gICAgeDogMCwgeTogMCxcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxuICAgIHU6IDAsIHY6IDAsIHUyOiAwLCB2MjogMCxcbiAgICBvZmZzZXRYOiAwLCBvZmZzZXRZOiAwLFxuICAgIG9yaWdpbmFsV2lkdGg6IDAsIG9yaWdpbmFsSGVpZ2h0OiAwLFxuICAgIGluZGV4OiAwLFxuICAgIHJvdGF0ZTogZmFsc2UsXG4gICAgc3BsaXRzOiBudWxsLFxuICAgIHBhZHM6IG51bGxcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzUmVnaW9uO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xuc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXG57XG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIC4uLlxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG4gICAgdGhpcy5hdHRhY2htZW50TmFtZXMgPSBbXTtcbiAgICB0aGlzLmF0dGFjaG1lbnROYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50O1xufTtcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZS5wcm90b3R5cGUgPSB7XG4gICAgc2xvdEluZGV4OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICAgIH0sXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBhdHRhY2htZW50TmFtZSlcbiAgICB7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcbiAgICAgICAgdGhpcy5hdHRhY2htZW50TmFtZXNbZnJhbWVJbmRleF0gPSBhdHRhY2htZW50TmFtZTtcbiAgICB9LFxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXG4gICAge1xuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobGFzdFRpbWUgPiB0aW1lKSB0aGlzLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgTnVtYmVyLk1BWF9WQUxVRSwgbnVsbCwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAobGFzdFRpbWUgPiB0aW1lKSAvL1xuICAgICAgICAgICAgbGFzdFRpbWUgPSAtMTtcblxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSA/IGZyYW1lcy5sZW5ndGggLSAxIDogc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaDEoZnJhbWVzLCB0aW1lKSAtIDE7XG4gICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleF0gPCBsYXN0VGltZSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciBhdHRhY2htZW50TmFtZSA9IHRoaXMuYXR0YWNobWVudE5hbWVzW2ZyYW1lSW5kZXhdO1xuICAgICAgICBza2VsZXRvbi5zbG90c1t0aGlzLnNsb3RJbmRleF0uc2V0QXR0YWNobWVudChcbiAgICAgICAgICAgICFhdHRhY2htZW50TmFtZSA/IG51bGwgOiBza2VsZXRvbi5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgodGhpcy5zbG90SW5kZXgsIGF0dGFjaG1lbnROYW1lKSk7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0ge1xuICAgIHJlZ2lvbjogMCxcbiAgICBib3VuZGluZ2JveDogMSxcbiAgICBtZXNoOiAyLFxuICAgIHNraW5uZWRtZXNoOiAzXG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdHRhY2htZW50VHlwZTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5Cb25lID0gZnVuY3Rpb24gKGJvbmVEYXRhLCBza2VsZXRvbiwgcGFyZW50KVxue1xuICAgIHRoaXMuZGF0YSA9IGJvbmVEYXRhO1xuICAgIHRoaXMuc2tlbGV0b24gPSBza2VsZXRvbjtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLnNldFRvU2V0dXBQb3NlKCk7XG59O1xuc3BpbmUuQm9uZS55RG93biA9IGZhbHNlO1xuc3BpbmUuQm9uZS5wcm90b3R5cGUgPSB7XG4gICAgeDogMCwgeTogMCxcbiAgICByb3RhdGlvbjogMCwgcm90YXRpb25JSzogMCxcbiAgICBzY2FsZVg6IDEsIHNjYWxlWTogMSxcbiAgICBmbGlwWDogZmFsc2UsIGZsaXBZOiBmYWxzZSxcbiAgICBtMDA6IDAsIG0wMTogMCwgd29ybGRYOiAwLCAvLyBhIGIgeFxuICAgIG0xMDogMCwgbTExOiAwLCB3b3JsZFk6IDAsIC8vIGMgZCB5XG4gICAgd29ybGRSb3RhdGlvbjogMCxcbiAgICB3b3JsZFNjYWxlWDogMSwgd29ybGRTY2FsZVk6IDEsXG4gICAgd29ybGRGbGlwWDogZmFsc2UsIHdvcmxkRmxpcFk6IGZhbHNlLFxuICAgIHVwZGF0ZVdvcmxkVHJhbnNmb3JtOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50O1xuICAgICAgICBpZiAocGFyZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLndvcmxkWCA9IHRoaXMueCAqIHBhcmVudC5tMDAgKyB0aGlzLnkgKiBwYXJlbnQubTAxICsgcGFyZW50LndvcmxkWDtcbiAgICAgICAgICAgIHRoaXMud29ybGRZID0gdGhpcy54ICogcGFyZW50Lm0xMCArIHRoaXMueSAqIHBhcmVudC5tMTEgKyBwYXJlbnQud29ybGRZO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YS5pbmhlcml0U2NhbGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWCA9IHBhcmVudC53b3JsZFNjYWxlWCAqIHRoaXMuc2NhbGVYO1xuICAgICAgICAgICAgICAgIHRoaXMud29ybGRTY2FsZVkgPSBwYXJlbnQud29ybGRTY2FsZVkgKiB0aGlzLnNjYWxlWTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWCA9IHRoaXMuc2NhbGVYO1xuICAgICAgICAgICAgICAgIHRoaXMud29ybGRTY2FsZVkgPSB0aGlzLnNjYWxlWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMud29ybGRSb3RhdGlvbiA9IHRoaXMuZGF0YS5pbmhlcml0Um90YXRpb24gPyAocGFyZW50LndvcmxkUm90YXRpb24gKyB0aGlzLnJvdGF0aW9uSUspIDogdGhpcy5yb3RhdGlvbklLO1xuICAgICAgICAgICAgdGhpcy53b3JsZEZsaXBYID0gcGFyZW50LndvcmxkRmxpcFggIT0gdGhpcy5mbGlwWDtcbiAgICAgICAgICAgIHRoaXMud29ybGRGbGlwWSA9IHBhcmVudC53b3JsZEZsaXBZICE9IHRoaXMuZmxpcFk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgc2tlbGV0b25GbGlwWCA9IHRoaXMuc2tlbGV0b24uZmxpcFgsIHNrZWxldG9uRmxpcFkgPSB0aGlzLnNrZWxldG9uLmZsaXBZO1xuICAgICAgICAgICAgdGhpcy53b3JsZFggPSBza2VsZXRvbkZsaXBYID8gLXRoaXMueCA6IHRoaXMueDtcbiAgICAgICAgICAgIHRoaXMud29ybGRZID0gKHNrZWxldG9uRmxpcFkgIT0gc3BpbmUuQm9uZS55RG93bikgPyAtdGhpcy55IDogdGhpcy55O1xuICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWCA9IHRoaXMuc2NhbGVYO1xuICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWSA9IHRoaXMuc2NhbGVZO1xuICAgICAgICAgICAgdGhpcy53b3JsZFJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbklLO1xuICAgICAgICAgICAgdGhpcy53b3JsZEZsaXBYID0gc2tlbGV0b25GbGlwWCAhPSB0aGlzLmZsaXBYO1xuICAgICAgICAgICAgdGhpcy53b3JsZEZsaXBZID0gc2tlbGV0b25GbGlwWSAhPSB0aGlzLmZsaXBZO1xuICAgICAgICB9XG4gICAgICAgIHZhciByYWRpYW5zID0gdGhpcy53b3JsZFJvdGF0aW9uICogc3BpbmUuZGVnUmFkO1xuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MocmFkaWFucyk7XG4gICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKTtcbiAgICAgICAgaWYgKHRoaXMud29ybGRGbGlwWClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5tMDAgPSAtY29zICogdGhpcy53b3JsZFNjYWxlWDtcbiAgICAgICAgICAgIHRoaXMubTAxID0gc2luICogdGhpcy53b3JsZFNjYWxlWTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubTAwID0gY29zICogdGhpcy53b3JsZFNjYWxlWDtcbiAgICAgICAgICAgIHRoaXMubTAxID0gLXNpbiAqIHRoaXMud29ybGRTY2FsZVk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMud29ybGRGbGlwWSAhPSBzcGluZS5Cb25lLnlEb3duKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLm0xMCA9IC1zaW4gKiB0aGlzLndvcmxkU2NhbGVYO1xuICAgICAgICAgICAgdGhpcy5tMTEgPSAtY29zICogdGhpcy53b3JsZFNjYWxlWTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubTEwID0gc2luICogdGhpcy53b3JsZFNjYWxlWDtcbiAgICAgICAgICAgIHRoaXMubTExID0gY29zICogdGhpcy53b3JsZFNjYWxlWTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0VG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgdGhpcy54ID0gZGF0YS54O1xuICAgICAgICB0aGlzLnkgPSBkYXRhLnk7XG4gICAgICAgIHRoaXMucm90YXRpb24gPSBkYXRhLnJvdGF0aW9uO1xuICAgICAgICB0aGlzLnJvdGF0aW9uSUsgPSB0aGlzLnJvdGF0aW9uO1xuICAgICAgICB0aGlzLnNjYWxlWCA9IGRhdGEuc2NhbGVYO1xuICAgICAgICB0aGlzLnNjYWxlWSA9IGRhdGEuc2NhbGVZO1xuICAgICAgICB0aGlzLmZsaXBYID0gZGF0YS5mbGlwWDtcbiAgICAgICAgdGhpcy5mbGlwWSA9IGRhdGEuZmxpcFk7XG4gICAgfSxcbiAgICB3b3JsZFRvTG9jYWw6IGZ1bmN0aW9uICh3b3JsZClcbiAgICB7XG4gICAgICAgIHZhciBkeCA9IHdvcmxkWzBdIC0gdGhpcy53b3JsZFgsIGR5ID0gd29ybGRbMV0gLSB0aGlzLndvcmxkWTtcbiAgICAgICAgdmFyIG0wMCA9IHRoaXMubTAwLCBtMTAgPSB0aGlzLm0xMCwgbTAxID0gdGhpcy5tMDEsIG0xMSA9IHRoaXMubTExO1xuICAgICAgICBpZiAodGhpcy53b3JsZEZsaXBYICE9ICh0aGlzLndvcmxkRmxpcFkgIT0gc3BpbmUuQm9uZS55RG93bikpXG4gICAgICAgIHtcbiAgICAgICAgICAgIG0wMCA9IC1tMDA7XG4gICAgICAgICAgICBtMTEgPSAtbTExO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnZEZXQgPSAxIC8gKG0wMCAqIG0xMSAtIG0wMSAqIG0xMCk7XG4gICAgICAgIHdvcmxkWzBdID0gZHggKiBtMDAgKiBpbnZEZXQgLSBkeSAqIG0wMSAqIGludkRldDtcbiAgICAgICAgd29ybGRbMV0gPSBkeSAqIG0xMSAqIGludkRldCAtIGR4ICogbTEwICogaW52RGV0O1xuICAgIH0sXG4gICAgbG9jYWxUb1dvcmxkOiBmdW5jdGlvbiAobG9jYWwpXG4gICAge1xuICAgICAgICB2YXIgbG9jYWxYID0gbG9jYWxbMF0sIGxvY2FsWSA9IGxvY2FsWzFdO1xuICAgICAgICBsb2NhbFswXSA9IGxvY2FsWCAqIHRoaXMubTAwICsgbG9jYWxZICogdGhpcy5tMDEgKyB0aGlzLndvcmxkWDtcbiAgICAgICAgbG9jYWxbMV0gPSBsb2NhbFggKiB0aGlzLm0xMCArIGxvY2FsWSAqIHRoaXMubTExICsgdGhpcy53b3JsZFk7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQm9uZTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5Cb25lRGF0YSA9IGZ1bmN0aW9uIChuYW1lLCBwYXJlbnQpXG57XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbn07XG5zcGluZS5Cb25lRGF0YS5wcm90b3R5cGUgPSB7XG4gICAgbGVuZ3RoOiAwLFxuICAgIHg6IDAsIHk6IDAsXG4gICAgcm90YXRpb246IDAsXG4gICAgc2NhbGVYOiAxLCBzY2FsZVk6IDEsXG4gICAgaW5oZXJpdFNjYWxlOiB0cnVlLFxuICAgIGluaGVyaXRSb3RhdGlvbjogdHJ1ZSxcbiAgICBmbGlwWDogZmFsc2UsIGZsaXBZOiBmYWxzZVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQm9uZURhdGE7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQXR0YWNobWVudFR5cGUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUeXBlJyk7XG5zcGluZS5Cb3VuZGluZ0JveEF0dGFjaG1lbnQgPSBmdW5jdGlvbiAobmFtZSlcbntcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMudmVydGljZXMgPSBbXTtcbn07XG5zcGluZS5Cb3VuZGluZ0JveEF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLmJvdW5kaW5nYm94LFxuICAgIGNvbXB1dGVXb3JsZFZlcnRpY2VzOiBmdW5jdGlvbiAoeCwgeSwgYm9uZSwgd29ybGRWZXJ0aWNlcylcbiAgICB7XG4gICAgICAgIHggKz0gYm9uZS53b3JsZFg7XG4gICAgICAgIHkgKz0gYm9uZS53b3JsZFk7XG4gICAgICAgIHZhciBtMDAgPSBib25lLm0wMCwgbTAxID0gYm9uZS5tMDEsIG0xMCA9IGJvbmUubTEwLCBtMTEgPSBib25lLm0xMTtcbiAgICAgICAgdmFyIHZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGkgPCBuOyBpICs9IDIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBweCA9IHZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgdmFyIHB5ID0gdmVydGljZXNbaSArIDFdO1xuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpXSA9IHB4ICogbTAwICsgcHkgKiBtMDEgKyB4O1xuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpICsgMV0gPSBweCAqIG0xMCArIHB5ICogbTExICsgeTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudDtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcbnNwaW5lLkNvbG9yVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcbntcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgciwgZywgYiwgYSwgLi4uXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDU7XG59O1xuc3BpbmUuQ29sb3JUaW1lbGluZS5wcm90b3R5cGUgPSB7XG4gICAgc2xvdEluZGV4OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gNTtcbiAgICB9LFxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgciwgZywgYiwgYSlcbiAgICB7XG4gICAgICAgIGZyYW1lSW5kZXggKj0gNTtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSByO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMl0gPSBnO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgM10gPSBiO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgNF0gPSBhO1xuICAgIH0sXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcbiAgICB7XG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXG5cbiAgICAgICAgdmFyIHIsIGcsIGIsIGE7XG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gNV0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cbiAgICAgICAgICAgIHZhciBpID0gZnJhbWVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICByID0gZnJhbWVzW2kgLSAzXTtcbiAgICAgICAgICAgIGcgPSBmcmFtZXNbaSAtIDJdO1xuICAgICAgICAgICAgYiA9IGZyYW1lc1tpIC0gMV07XG4gICAgICAgICAgICBhID0gZnJhbWVzW2ldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxuICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgNSk7XG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lUiA9IGZyYW1lc1tmcmFtZUluZGV4IC0gNF07XG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lRyA9IGZyYW1lc1tmcmFtZUluZGV4IC0gM107XG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lQiA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMl07XG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lQSA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMV07XG4gICAgICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAxIC0gKHRpbWUgLSBmcmFtZVRpbWUpIC8gKGZyYW1lc1tmcmFtZUluZGV4IC0gNS8qUFJFVl9GUkFNRV9USU1FKi9dIC0gZnJhbWVUaW1lKTtcbiAgICAgICAgICAgIHBlcmNlbnQgPSB0aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZnJhbWVJbmRleCAvIDUgLSAxLCBwZXJjZW50KTtcblxuICAgICAgICAgICAgciA9IHByZXZGcmFtZVIgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAxLypGUkFNRV9SKi9dIC0gcHJldkZyYW1lUikgKiBwZXJjZW50O1xuICAgICAgICAgICAgZyA9IHByZXZGcmFtZUcgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAyLypGUkFNRV9HKi9dIC0gcHJldkZyYW1lRykgKiBwZXJjZW50O1xuICAgICAgICAgICAgYiA9IHByZXZGcmFtZUIgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAzLypGUkFNRV9CKi9dIC0gcHJldkZyYW1lQikgKiBwZXJjZW50O1xuICAgICAgICAgICAgYSA9IHByZXZGcmFtZUEgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyA0LypGUkFNRV9BKi9dIC0gcHJldkZyYW1lQSkgKiBwZXJjZW50O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzbG90ID0gc2tlbGV0b24uc2xvdHNbdGhpcy5zbG90SW5kZXhdO1xuICAgICAgICBpZiAoYWxwaGEgPCAxKVxuICAgICAgICB7XG4gICAgICAgICAgICBzbG90LnIgKz0gKHIgLSBzbG90LnIpICogYWxwaGE7XG4gICAgICAgICAgICBzbG90LmcgKz0gKGcgLSBzbG90LmcpICogYWxwaGE7XG4gICAgICAgICAgICBzbG90LmIgKz0gKGIgLSBzbG90LmIpICogYWxwaGE7XG4gICAgICAgICAgICBzbG90LmEgKz0gKGEgLSBzbG90LmEpICogYWxwaGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzbG90LnIgPSByO1xuICAgICAgICAgICAgc2xvdC5nID0gZztcbiAgICAgICAgICAgIHNsb3QuYiA9IGI7XG4gICAgICAgICAgICBzbG90LmEgPSBhO1xuICAgICAgICB9XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQ29sb3JUaW1lbGluZTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5DdXJ2ZXMgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcbntcbiAgICB0aGlzLmN1cnZlcyA9IFtdOyAvLyB0eXBlLCB4LCB5LCAuLi5cbiAgICAvL3RoaXMuY3VydmVzLmxlbmd0aCA9IChmcmFtZUNvdW50IC0gMSkgKiAxOS8qQkVaSUVSX1NJWkUqLztcbn07XG5zcGluZS5DdXJ2ZXMucHJvdG90eXBlID0ge1xuICAgIHNldExpbmVhcjogZnVuY3Rpb24gKGZyYW1lSW5kZXgpXG4gICAge1xuICAgICAgICB0aGlzLmN1cnZlc1tmcmFtZUluZGV4ICogMTkvKkJFWklFUl9TSVpFKi9dID0gMC8qTElORUFSKi87XG4gICAgfSxcbiAgICBzZXRTdGVwcGVkOiBmdW5jdGlvbiAoZnJhbWVJbmRleClcbiAgICB7XG4gICAgICAgIHRoaXMuY3VydmVzW2ZyYW1lSW5kZXggKiAxOS8qQkVaSUVSX1NJWkUqL10gPSAxLypTVEVQUEVEKi87XG4gICAgfSxcbiAgICAvKiogU2V0cyB0aGUgY29udHJvbCBoYW5kbGUgcG9zaXRpb25zIGZvciBhbiBpbnRlcnBvbGF0aW9uIGJlemllciBjdXJ2ZSB1c2VkIHRvIHRyYW5zaXRpb24gZnJvbSB0aGlzIGtleWZyYW1lIHRvIHRoZSBuZXh0LlxuICAgICAqIGN4MSBhbmQgY3gyIGFyZSBmcm9tIDAgdG8gMSwgcmVwcmVzZW50aW5nIHRoZSBwZXJjZW50IG9mIHRpbWUgYmV0d2VlbiB0aGUgdHdvIGtleWZyYW1lcy4gY3kxIGFuZCBjeTIgYXJlIHRoZSBwZXJjZW50IG9mXG4gICAgICogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUga2V5ZnJhbWUncyB2YWx1ZXMuICovXG4gICAgc2V0Q3VydmU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCBjeDEsIGN5MSwgY3gyLCBjeTIpXG4gICAge1xuICAgICAgICB2YXIgc3ViZGl2MSA9IDEgLyAxMC8qQkVaSUVSX1NFR01FTlRTKi8sIHN1YmRpdjIgPSBzdWJkaXYxICogc3ViZGl2MSwgc3ViZGl2MyA9IHN1YmRpdjIgKiBzdWJkaXYxO1xuICAgICAgICB2YXIgcHJlMSA9IDMgKiBzdWJkaXYxLCBwcmUyID0gMyAqIHN1YmRpdjIsIHByZTQgPSA2ICogc3ViZGl2MiwgcHJlNSA9IDYgKiBzdWJkaXYzO1xuICAgICAgICB2YXIgdG1wMXggPSAtY3gxICogMiArIGN4MiwgdG1wMXkgPSAtY3kxICogMiArIGN5MiwgdG1wMnggPSAoY3gxIC0gY3gyKSAqIDMgKyAxLCB0bXAyeSA9IChjeTEgLSBjeTIpICogMyArIDE7XG4gICAgICAgIHZhciBkZnggPSBjeDEgKiBwcmUxICsgdG1wMXggKiBwcmUyICsgdG1wMnggKiBzdWJkaXYzLCBkZnkgPSBjeTEgKiBwcmUxICsgdG1wMXkgKiBwcmUyICsgdG1wMnkgKiBzdWJkaXYzO1xuICAgICAgICB2YXIgZGRmeCA9IHRtcDF4ICogcHJlNCArIHRtcDJ4ICogcHJlNSwgZGRmeSA9IHRtcDF5ICogcHJlNCArIHRtcDJ5ICogcHJlNTtcbiAgICAgICAgdmFyIGRkZGZ4ID0gdG1wMnggKiBwcmU1LCBkZGRmeSA9IHRtcDJ5ICogcHJlNTtcblxuICAgICAgICB2YXIgaSA9IGZyYW1lSW5kZXggKiAxOS8qQkVaSUVSX1NJWkUqLztcbiAgICAgICAgdmFyIGN1cnZlcyA9IHRoaXMuY3VydmVzO1xuICAgICAgICBjdXJ2ZXNbaSsrXSA9IDIvKkJFWklFUiovO1xuXG4gICAgICAgIHZhciB4ID0gZGZ4LCB5ID0gZGZ5O1xuICAgICAgICBmb3IgKHZhciBuID0gaSArIDE5LypCRVpJRVJfU0laRSovIC0gMTsgaSA8IG47IGkgKz0gMilcbiAgICAgICAge1xuICAgICAgICAgICAgY3VydmVzW2ldID0geDtcbiAgICAgICAgICAgIGN1cnZlc1tpICsgMV0gPSB5O1xuICAgICAgICAgICAgZGZ4ICs9IGRkZng7XG4gICAgICAgICAgICBkZnkgKz0gZGRmeTtcbiAgICAgICAgICAgIGRkZnggKz0gZGRkZng7XG4gICAgICAgICAgICBkZGZ5ICs9IGRkZGZ5O1xuICAgICAgICAgICAgeCArPSBkZng7XG4gICAgICAgICAgICB5ICs9IGRmeTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0Q3VydmVQZXJjZW50OiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgcGVyY2VudClcbiAgICB7XG4gICAgICAgIHBlcmNlbnQgPSBwZXJjZW50IDwgMCA/IDAgOiAocGVyY2VudCA+IDEgPyAxIDogcGVyY2VudCk7XG4gICAgICAgIHZhciBjdXJ2ZXMgPSB0aGlzLmN1cnZlcztcbiAgICAgICAgdmFyIGkgPSBmcmFtZUluZGV4ICogMTkvKkJFWklFUl9TSVpFKi87XG4gICAgICAgIHZhciB0eXBlID0gY3VydmVzW2ldO1xuICAgICAgICBpZiAodHlwZSA9PT0gMC8qTElORUFSKi8pIHJldHVybiBwZXJjZW50O1xuICAgICAgICBpZiAodHlwZSA9PSAxLypTVEVQUEVEKi8pIHJldHVybiAwO1xuICAgICAgICBpKys7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgc3RhcnQgPSBpLCBuID0gaSArIDE5LypCRVpJRVJfU0laRSovIC0gMTsgaSA8IG47IGkgKz0gMilcbiAgICAgICAge1xuICAgICAgICAgICAgeCA9IGN1cnZlc1tpXTtcbiAgICAgICAgICAgIGlmICh4ID49IHBlcmNlbnQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHByZXZYLCBwcmV2WTtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBzdGFydClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgcHJldlkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZYID0gY3VydmVzW2kgLSAyXTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlkgPSBjdXJ2ZXNbaSAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcHJldlkgKyAoY3VydmVzW2kgKyAxXSAtIHByZXZZKSAqIChwZXJjZW50IC0gcHJldlgpIC8gKHggLSBwcmV2WCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHkgPSBjdXJ2ZXNbaSAtIDFdO1xuICAgICAgICByZXR1cm4geSArICgxIC0geSkgKiAocGVyY2VudCAtIHgpIC8gKDEgLSB4KTsgLy8gTGFzdCBwb2ludCBpcyAxLDEuXG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQ3VydmVzO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XG5zcGluZS5EcmF3T3JkZXJUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxue1xuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIC4uLlxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG4gICAgdGhpcy5kcmF3T3JkZXJzID0gW107XG4gICAgdGhpcy5kcmF3T3JkZXJzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG59O1xuc3BpbmUuRHJhd09yZGVyVGltZWxpbmUucHJvdG90eXBlID0ge1xuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICAgIH0sXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBkcmF3T3JkZXIpXG4gICAge1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XG4gICAgICAgIHRoaXMuZHJhd09yZGVyc1tmcmFtZUluZGV4XSA9IGRyYXdPcmRlcjtcbiAgICB9LFxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXG4gICAge1xuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxuXG4gICAgICAgIHZhciBmcmFtZUluZGV4O1xuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdKSAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXG4gICAgICAgICAgICBmcmFtZUluZGV4ID0gZnJhbWVzLmxlbmd0aCAtIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoMShmcmFtZXMsIHRpbWUpIC0gMTtcblxuICAgICAgICB2YXIgZHJhd09yZGVyID0gc2tlbGV0b24uZHJhd09yZGVyO1xuICAgICAgICB2YXIgc2xvdHMgPSBza2VsZXRvbi5zbG90cztcbiAgICAgICAgdmFyIGRyYXdPcmRlclRvU2V0dXBJbmRleCA9IHRoaXMuZHJhd09yZGVyc1tmcmFtZUluZGV4XTtcbiAgICAgICAgaWYgKGRyYXdPcmRlclRvU2V0dXBJbmRleClcbiAgICAgICAge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBkcmF3T3JkZXJUb1NldHVwSW5kZXgubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGRyYXdPcmRlcltpXSA9IGRyYXdPcmRlclRvU2V0dXBJbmRleFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRHJhd09yZGVyVGltZWxpbmU7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuRXZlbnQgPSBmdW5jdGlvbiAoZGF0YSlcbntcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xufTtcbnNwaW5lLkV2ZW50LnByb3RvdHlwZSA9IHtcbiAgICBpbnRWYWx1ZTogMCxcbiAgICBmbG9hdFZhbHVlOiAwLFxuICAgIHN0cmluZ1ZhbHVlOiBudWxsXG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5FdmVudDtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5FdmVudERhdGEgPSBmdW5jdGlvbiAobmFtZSlcbntcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xufTtcbnNwaW5lLkV2ZW50RGF0YS5wcm90b3R5cGUgPSB7XG4gICAgaW50VmFsdWU6IDAsXG4gICAgZmxvYXRWYWx1ZTogMCxcbiAgICBzdHJpbmdWYWx1ZTogbnVsbFxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRXZlbnREYXRhO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XG5zcGluZS5FdmVudFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXG57XG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgLi4uXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudDtcbiAgICB0aGlzLmV2ZW50cyA9IFtdO1xuICAgIHRoaXMuZXZlbnRzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG59O1xuc3BpbmUuRXZlbnRUaW1lbGluZS5wcm90b3R5cGUgPSB7XG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGg7XG4gICAgfSxcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIGV2ZW50KVxuICAgIHtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xuICAgICAgICB0aGlzLmV2ZW50c1tmcmFtZUluZGV4XSA9IGV2ZW50O1xuICAgIH0sXG4gICAgLyoqIEZpcmVzIGV2ZW50cyBmb3IgZnJhbWVzID4gbGFzdFRpbWUgYW5kIDw9IHRpbWUuICovXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcbiAgICB7XG4gICAgICAgIGlmICghZmlyZWRFdmVudHMpIHJldHVybjtcblxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XG4gICAgICAgIHZhciBmcmFtZUNvdW50ID0gZnJhbWVzLmxlbmd0aDtcblxuICAgICAgICBpZiAobGFzdFRpbWUgPiB0aW1lKVxuICAgICAgICB7IC8vIEZpcmUgZXZlbnRzIGFmdGVyIGxhc3QgdGltZSBmb3IgbG9vcGVkIGFuaW1hdGlvbnMuXG4gICAgICAgICAgICB0aGlzLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgTnVtYmVyLk1BWF9WQUxVRSwgZmlyZWRFdmVudHMsIGFscGhhKTtcbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAobGFzdFRpbWUgPj0gZnJhbWVzW2ZyYW1lQ291bnQgLSAxXSkgLy8gTGFzdCB0aW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxuXG4gICAgICAgIHZhciBmcmFtZUluZGV4O1xuICAgICAgICBpZiAobGFzdFRpbWUgPCBmcmFtZXNbMF0pXG4gICAgICAgICAgICBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaDEoZnJhbWVzLCBsYXN0VGltZSk7XG4gICAgICAgICAgICB2YXIgZnJhbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XG4gICAgICAgICAgICB3aGlsZSAoZnJhbWVJbmRleCA+IDApXG4gICAgICAgICAgICB7IC8vIEZpcmUgbXVsdGlwbGUgZXZlbnRzIHdpdGggdGhlIHNhbWUgZnJhbWUuXG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lc1tmcmFtZUluZGV4IC0gMV0gIT0gZnJhbWUpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHM7XG4gICAgICAgIGZvciAoOyBmcmFtZUluZGV4IDwgZnJhbWVDb3VudCAmJiB0aW1lID49IGZyYW1lc1tmcmFtZUluZGV4XTsgZnJhbWVJbmRleCsrKVxuICAgICAgICAgICAgZmlyZWRFdmVudHMucHVzaChldmVudHNbZnJhbWVJbmRleF0pO1xuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkV2ZW50VGltZWxpbmU7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XG5zcGluZS5GZmRUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxue1xuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcbiAgICB0aGlzLmZyYW1lcyA9IFtdO1xuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG4gICAgdGhpcy5mcmFtZVZlcnRpY2VzID0gW107XG4gICAgdGhpcy5mcmFtZVZlcnRpY2VzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XG59O1xuc3BpbmUuRmZkVGltZWxpbmUucHJvdG90eXBlID0ge1xuICAgIHNsb3RJbmRleDogMCxcbiAgICBhdHRhY2htZW50OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICAgIH0sXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCB2ZXJ0aWNlcylcbiAgICB7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcbiAgICAgICAgdGhpcy5mcmFtZVZlcnRpY2VzW2ZyYW1lSW5kZXhdID0gdmVydGljZXM7XG4gICAgfSxcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxuICAgIHtcbiAgICAgICAgdmFyIHNsb3QgPSBza2VsZXRvbi5zbG90c1t0aGlzLnNsb3RJbmRleF07XG4gICAgICAgIGlmIChzbG90LmF0dGFjaG1lbnQgIT0gdGhpcy5hdHRhY2htZW50KSByZXR1cm47XG5cbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cblxuICAgICAgICB2YXIgZnJhbWVWZXJ0aWNlcyA9IHRoaXMuZnJhbWVWZXJ0aWNlcztcbiAgICAgICAgdmFyIHZlcnRleENvdW50ID0gZnJhbWVWZXJ0aWNlc1swXS5sZW5ndGg7XG5cbiAgICAgICAgdmFyIHZlcnRpY2VzID0gc2xvdC5hdHRhY2htZW50VmVydGljZXM7XG4gICAgICAgIGlmICh2ZXJ0aWNlcy5sZW5ndGggIT0gdmVydGV4Q291bnQpIGFscGhhID0gMTtcbiAgICAgICAgdmVydGljZXMubGVuZ3RoID0gdmVydGV4Q291bnQ7XG5cbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSlcbiAgICAgICAgeyAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXG4gICAgICAgICAgICB2YXIgbGFzdFZlcnRpY2VzID0gZnJhbWVWZXJ0aWNlc1tmcmFtZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAoYWxwaGEgPCAxKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGV4Q291bnQ7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaV0gKz0gKGxhc3RWZXJ0aWNlc1tpXSAtIHZlcnRpY2VzW2ldKSAqIGFscGhhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRleENvdW50OyBpKyspXG4gICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldID0gbGFzdFZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxKGZyYW1lcywgdGltZSk7XG4gICAgICAgIHZhciBmcmFtZVRpbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCAtIDFdIC0gZnJhbWVUaW1lKTtcbiAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC0gMSwgcGVyY2VudCA8IDAgPyAwIDogKHBlcmNlbnQgPiAxID8gMSA6IHBlcmNlbnQpKTtcblxuICAgICAgICB2YXIgcHJldlZlcnRpY2VzID0gZnJhbWVWZXJ0aWNlc1tmcmFtZUluZGV4IC0gMV07XG4gICAgICAgIHZhciBuZXh0VmVydGljZXMgPSBmcmFtZVZlcnRpY2VzW2ZyYW1lSW5kZXhdO1xuXG4gICAgICAgIGlmIChhbHBoYSA8IDEpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGV4Q291bnQ7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJldiA9IHByZXZWZXJ0aWNlc1tpXTtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpXSArPSAocHJldiArIChuZXh0VmVydGljZXNbaV0gLSBwcmV2KSAqIHBlcmNlbnQgLSB2ZXJ0aWNlc1tpXSkgKiBhbHBoYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGV4Q291bnQ7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJldiA9IHByZXZWZXJ0aWNlc1tpXTtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpXSA9IHByZXYgKyAobmV4dFZlcnRpY2VzW2ldIC0gcHJldikgKiBwZXJjZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRmZkVGltZWxpbmU7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XG5zcGluZS5GbGlwWFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXG57XG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIGZsaXAsIC4uLlxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAyO1xufTtcbnNwaW5lLkZsaXBYVGltZWxpbmUucHJvdG90eXBlID0ge1xuICAgIGJvbmVJbmRleDogMCxcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDI7XG4gICAgfSxcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIGZsaXApXG4gICAge1xuICAgICAgICBmcmFtZUluZGV4ICo9IDI7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDFdID0gZmxpcCA/IDEgOiAwO1xuICAgIH0sXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcbiAgICB7XG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChsYXN0VGltZSA+IHRpbWUpIHRoaXMuYXBwbHkoc2tlbGV0b24sIGxhc3RUaW1lLCBOdW1iZXIuTUFYX1ZBTFVFLCBudWxsLCAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0VGltZSA+IHRpbWUpIC8vXG4gICAgICAgICAgICBsYXN0VGltZSA9IC0xO1xuICAgICAgICB2YXIgZnJhbWVJbmRleCA9ICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0gPyBmcmFtZXMubGVuZ3RoIDogc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDIpKSAtIDI7XG4gICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleF0gPCBsYXN0VGltZSkgcmV0dXJuO1xuICAgICAgICBza2VsZXRvbi5ib25lc1t0aGlzLmJvbmVJbmRleF0uZmxpcFggPSBmcmFtZXNbZnJhbWVJbmRleCArIDFdICE9IDA7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRmxpcFhUaW1lbGluZTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcbnNwaW5lLkZsaXBZVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcbntcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgZmxpcCwgLi4uXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDI7XG59O1xuc3BpbmUuRmxpcFlUaW1lbGluZS5wcm90b3R5cGUgPSB7XG4gICAgYm9uZUluZGV4OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMjtcbiAgICB9LFxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgZmxpcClcbiAgICB7XG4gICAgICAgIGZyYW1lSW5kZXggKj0gMjtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSBmbGlwID8gMSA6IDA7XG4gICAgfSxcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxuICAgIHtcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSlcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGxhc3RUaW1lID4gdGltZSkgdGhpcy5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIE51bWJlci5NQVhfVkFMVUUsIG51bGwsIDApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKGxhc3RUaW1lID4gdGltZSkgLy9cbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSA/IGZyYW1lcy5sZW5ndGggOiBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgMikpIC0gMjtcbiAgICAgICAgaWYgKGZyYW1lc1tmcmFtZUluZGV4XSA8IGxhc3RUaW1lKSByZXR1cm47XG4gICAgICAgIHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XS5mbGlwWSA9IGZyYW1lc1tmcmFtZUluZGV4ICsgMV0gIT0gMDtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5GbGlwWVRpbWVsaW5lO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLklrQ29uc3RyYWludCA9IGZ1bmN0aW9uIChkYXRhLCBza2VsZXRvbilcbntcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIHRoaXMubWl4ID0gZGF0YS5taXg7XG4gICAgdGhpcy5iZW5kRGlyZWN0aW9uID0gZGF0YS5iZW5kRGlyZWN0aW9uO1xuXG4gICAgdGhpcy5ib25lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gZGF0YS5ib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgIHRoaXMuYm9uZXMucHVzaChza2VsZXRvbi5maW5kQm9uZShkYXRhLmJvbmVzW2ldLm5hbWUpKTtcbiAgICB0aGlzLnRhcmdldCA9IHNrZWxldG9uLmZpbmRCb25lKGRhdGEudGFyZ2V0Lm5hbWUpO1xufTtcbnNwaW5lLklrQ29uc3RyYWludC5wcm90b3R5cGUgPSB7XG4gICAgYXBwbHk6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XG4gICAgICAgIHN3aXRjaCAoYm9uZXMubGVuZ3RoKVxuICAgICAgICB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHNwaW5lLklrQ29uc3RyYWludC5hcHBseTEoYm9uZXNbMF0sIHRhcmdldC53b3JsZFgsIHRhcmdldC53b3JsZFksIHRoaXMubWl4KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBzcGluZS5Ja0NvbnN0cmFpbnQuYXBwbHkyKGJvbmVzWzBdLCBib25lc1sxXSwgdGFyZ2V0LndvcmxkWCwgdGFyZ2V0LndvcmxkWSwgdGhpcy5iZW5kRGlyZWN0aW9uLCB0aGlzLm1peCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn07XG4vKiogQWRqdXN0cyB0aGUgYm9uZSByb3RhdGlvbiBzbyB0aGUgdGlwIGlzIGFzIGNsb3NlIHRvIHRoZSB0YXJnZXQgcG9zaXRpb24gYXMgcG9zc2libGUuIFRoZSB0YXJnZXQgaXMgc3BlY2lmaWVkIGluIHRoZSB3b3JsZFxuICogY29vcmRpbmF0ZSBzeXN0ZW0uICovXG5zcGluZS5Ja0NvbnN0cmFpbnQuYXBwbHkxID0gZnVuY3Rpb24gKGJvbmUsIHRhcmdldFgsIHRhcmdldFksIGFscGhhKVxue1xuICAgIHZhciBwYXJlbnRSb3RhdGlvbiA9ICghYm9uZS5kYXRhLmluaGVyaXRSb3RhdGlvbiB8fCAhYm9uZS5wYXJlbnQpID8gMCA6IGJvbmUucGFyZW50LndvcmxkUm90YXRpb247XG4gICAgdmFyIHJvdGF0aW9uID0gYm9uZS5yb3RhdGlvbjtcbiAgICB2YXIgcm90YXRpb25JSyA9IE1hdGguYXRhbjIodGFyZ2V0WSAtIGJvbmUud29ybGRZLCB0YXJnZXRYIC0gYm9uZS53b3JsZFgpICogc3BpbmUucmFkRGVnIC0gcGFyZW50Um90YXRpb247XG4gICAgYm9uZS5yb3RhdGlvbklLID0gcm90YXRpb24gKyAocm90YXRpb25JSyAtIHJvdGF0aW9uKSAqIGFscGhhO1xufTtcbi8qKiBBZGp1c3RzIHRoZSBwYXJlbnQgYW5kIGNoaWxkIGJvbmUgcm90YXRpb25zIHNvIHRoZSB0aXAgb2YgdGhlIGNoaWxkIGlzIGFzIGNsb3NlIHRvIHRoZSB0YXJnZXQgcG9zaXRpb24gYXMgcG9zc2libGUuIFRoZVxuICogdGFyZ2V0IGlzIHNwZWNpZmllZCBpbiB0aGUgd29ybGQgY29vcmRpbmF0ZSBzeXN0ZW0uXG4gKiBAcGFyYW0gY2hpbGQgQW55IGRlc2NlbmRhbnQgYm9uZSBvZiB0aGUgcGFyZW50LiAqL1xuc3BpbmUuSWtDb25zdHJhaW50LmFwcGx5MiA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkLCB0YXJnZXRYLCB0YXJnZXRZLCBiZW5kRGlyZWN0aW9uLCBhbHBoYSlcbntcbiAgICB2YXIgY2hpbGRSb3RhdGlvbiA9IGNoaWxkLnJvdGF0aW9uLCBwYXJlbnRSb3RhdGlvbiA9IHBhcmVudC5yb3RhdGlvbjtcbiAgICBpZiAoIWFscGhhKVxuICAgIHtcbiAgICAgICAgY2hpbGQucm90YXRpb25JSyA9IGNoaWxkUm90YXRpb247XG4gICAgICAgIHBhcmVudC5yb3RhdGlvbklLID0gcGFyZW50Um90YXRpb247XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHBvc2l0aW9uWCwgcG9zaXRpb25ZLCB0ZW1wUG9zaXRpb24gPSBzcGluZS50ZW1wO1xuICAgIHZhciBwYXJlbnRQYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgIGlmIChwYXJlbnRQYXJlbnQpXG4gICAge1xuICAgICAgICB0ZW1wUG9zaXRpb25bMF0gPSB0YXJnZXRYO1xuICAgICAgICB0ZW1wUG9zaXRpb25bMV0gPSB0YXJnZXRZO1xuICAgICAgICBwYXJlbnRQYXJlbnQud29ybGRUb0xvY2FsKHRlbXBQb3NpdGlvbik7XG4gICAgICAgIHRhcmdldFggPSAodGVtcFBvc2l0aW9uWzBdIC0gcGFyZW50LngpICogcGFyZW50UGFyZW50LndvcmxkU2NhbGVYO1xuICAgICAgICB0YXJnZXRZID0gKHRlbXBQb3NpdGlvblsxXSAtIHBhcmVudC55KSAqIHBhcmVudFBhcmVudC53b3JsZFNjYWxlWTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRYIC09IHBhcmVudC54O1xuICAgICAgICB0YXJnZXRZIC09IHBhcmVudC55O1xuICAgIH1cbiAgICBpZiAoY2hpbGQucGFyZW50ID09IHBhcmVudClcbiAgICB7XG4gICAgICAgIHBvc2l0aW9uWCA9IGNoaWxkLng7XG4gICAgICAgIHBvc2l0aW9uWSA9IGNoaWxkLnk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGVtcFBvc2l0aW9uWzBdID0gY2hpbGQueDtcbiAgICAgICAgdGVtcFBvc2l0aW9uWzFdID0gY2hpbGQueTtcbiAgICAgICAgY2hpbGQucGFyZW50LmxvY2FsVG9Xb3JsZCh0ZW1wUG9zaXRpb24pO1xuICAgICAgICBwYXJlbnQud29ybGRUb0xvY2FsKHRlbXBQb3NpdGlvbik7XG4gICAgICAgIHBvc2l0aW9uWCA9IHRlbXBQb3NpdGlvblswXTtcbiAgICAgICAgcG9zaXRpb25ZID0gdGVtcFBvc2l0aW9uWzFdO1xuICAgIH1cbiAgICB2YXIgY2hpbGRYID0gcG9zaXRpb25YICogcGFyZW50LndvcmxkU2NhbGVYLCBjaGlsZFkgPSBwb3NpdGlvblkgKiBwYXJlbnQud29ybGRTY2FsZVk7XG4gICAgdmFyIG9mZnNldCA9IE1hdGguYXRhbjIoY2hpbGRZLCBjaGlsZFgpO1xuICAgIHZhciBsZW4xID0gTWF0aC5zcXJ0KGNoaWxkWCAqIGNoaWxkWCArIGNoaWxkWSAqIGNoaWxkWSksIGxlbjIgPSBjaGlsZC5kYXRhLmxlbmd0aCAqIGNoaWxkLndvcmxkU2NhbGVYO1xuICAgIC8vIEJhc2VkIG9uIGNvZGUgYnkgUnlhbiBKdWNrZXR0IHdpdGggcGVybWlzc2lvbjogQ29weXJpZ2h0IChjKSAyMDA4LTIwMDkgUnlhbiBKdWNrZXR0LCBodHRwOi8vd3d3LnJ5YW5qdWNrZXR0LmNvbS9cbiAgICB2YXIgY29zRGVub20gPSAyICogbGVuMSAqIGxlbjI7XG4gICAgaWYgKGNvc0Rlbm9tIDwgMC4wMDAxKVxuICAgIHtcbiAgICAgICAgY2hpbGQucm90YXRpb25JSyA9IGNoaWxkUm90YXRpb24gKyAoTWF0aC5hdGFuMih0YXJnZXRZLCB0YXJnZXRYKSAqIHNwaW5lLnJhZERlZyAtIHBhcmVudFJvdGF0aW9uIC0gY2hpbGRSb3RhdGlvbikgKiBhbHBoYTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgY29zID0gKHRhcmdldFggKiB0YXJnZXRYICsgdGFyZ2V0WSAqIHRhcmdldFkgLSBsZW4xICogbGVuMSAtIGxlbjIgKiBsZW4yKSAvIGNvc0Rlbm9tO1xuICAgIGlmIChjb3MgPCAtMSlcbiAgICAgICAgY29zID0gLTE7XG4gICAgZWxzZSBpZiAoY29zID4gMSlcbiAgICAgICAgY29zID0gMTtcbiAgICB2YXIgY2hpbGRBbmdsZSA9IE1hdGguYWNvcyhjb3MpICogYmVuZERpcmVjdGlvbjtcbiAgICB2YXIgYWRqYWNlbnQgPSBsZW4xICsgbGVuMiAqIGNvcywgb3Bwb3NpdGUgPSBsZW4yICogTWF0aC5zaW4oY2hpbGRBbmdsZSk7XG4gICAgdmFyIHBhcmVudEFuZ2xlID0gTWF0aC5hdGFuMih0YXJnZXRZICogYWRqYWNlbnQgLSB0YXJnZXRYICogb3Bwb3NpdGUsIHRhcmdldFggKiBhZGphY2VudCArIHRhcmdldFkgKiBvcHBvc2l0ZSk7XG4gICAgdmFyIHJvdGF0aW9uID0gKHBhcmVudEFuZ2xlIC0gb2Zmc2V0KSAqIHNwaW5lLnJhZERlZyAtIHBhcmVudFJvdGF0aW9uO1xuICAgIGlmIChyb3RhdGlvbiA+IDE4MClcbiAgICAgICAgcm90YXRpb24gLT0gMzYwO1xuICAgIGVsc2UgaWYgKHJvdGF0aW9uIDwgLTE4MCkgLy9cbiAgICAgICAgcm90YXRpb24gKz0gMzYwO1xuICAgIHBhcmVudC5yb3RhdGlvbklLID0gcGFyZW50Um90YXRpb24gKyByb3RhdGlvbiAqIGFscGhhO1xuICAgIHJvdGF0aW9uID0gKGNoaWxkQW5nbGUgKyBvZmZzZXQpICogc3BpbmUucmFkRGVnIC0gY2hpbGRSb3RhdGlvbjtcbiAgICBpZiAocm90YXRpb24gPiAxODApXG4gICAgICAgIHJvdGF0aW9uIC09IDM2MDtcbiAgICBlbHNlIGlmIChyb3RhdGlvbiA8IC0xODApIC8vXG4gICAgICAgIHJvdGF0aW9uICs9IDM2MDtcbiAgICBjaGlsZC5yb3RhdGlvbklLID0gY2hpbGRSb3RhdGlvbiArIChyb3RhdGlvbiArIHBhcmVudC53b3JsZFJvdGF0aW9uIC0gY2hpbGQucGFyZW50LndvcmxkUm90YXRpb24pICogYWxwaGE7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ja0NvbnN0cmFpbnQ7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpIHx8IHt9O1xuc3BpbmUuSWtDb25zdHJhaW50RGF0YSA9IGZ1bmN0aW9uIChuYW1lKVxue1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5ib25lcyA9IFtdO1xufTtcbnNwaW5lLklrQ29uc3RyYWludERhdGEucHJvdG90eXBlID0ge1xuICAgIHRhcmdldDogbnVsbCxcbiAgICBiZW5kRGlyZWN0aW9uOiAxLFxuICAgIG1peDogMVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuSWtDb25zdHJhaW50RGF0YTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJykgfHwge307XG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcbnNwaW5lLklrQ29uc3RyYWludFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXG57XG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIG1peCwgYmVuZERpcmVjdGlvbiwgLi4uXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDM7XG59O1xuc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUucHJvdG90eXBlID0ge1xuICAgIGlrQ29uc3RyYWludEluZGV4OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMztcbiAgICB9LFxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgbWl4LCBiZW5kRGlyZWN0aW9uKVxuICAgIHtcbiAgICAgICAgZnJhbWVJbmRleCAqPSAzO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IG1peDtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDJdID0gYmVuZERpcmVjdGlvbjtcbiAgICB9LFxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXG4gICAge1xuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxuXG4gICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBza2VsZXRvbi5pa0NvbnN0cmFpbnRzW3RoaXMuaWtDb25zdHJhaW50SW5kZXhdO1xuXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gM10pXG4gICAgICAgIHsgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxuICAgICAgICAgICAgaWtDb25zdHJhaW50Lm1peCArPSAoZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSAtIGlrQ29uc3RyYWludC5taXgpICogYWxwaGE7XG4gICAgICAgICAgICBpa0NvbnN0cmFpbnQuYmVuZERpcmVjdGlvbiA9IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDMpO1xuICAgICAgICB2YXIgcHJldkZyYW1lTWl4ID0gZnJhbWVzW2ZyYW1lSW5kZXggKyAtMi8qUFJFVl9GUkFNRV9NSVgqL107XG4gICAgICAgIHZhciBmcmFtZVRpbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCArIC0zLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyAzIC0gMSwgcGVyY2VudCk7XG5cbiAgICAgICAgdmFyIG1peCA9IHByZXZGcmFtZU1peCArIChmcmFtZXNbZnJhbWVJbmRleCArIDEvKkZSQU1FX01JWCovXSAtIHByZXZGcmFtZU1peCkgKiBwZXJjZW50O1xuICAgICAgICBpa0NvbnN0cmFpbnQubWl4ICs9IChtaXggLSBpa0NvbnN0cmFpbnQubWl4KSAqIGFscGhhO1xuICAgICAgICBpa0NvbnN0cmFpbnQuYmVuZERpcmVjdGlvbiA9IGZyYW1lc1tmcmFtZUluZGV4ICsgLTEvKlBSRVZfRlJBTUVfQkVORF9ESVJFQ1RJT04qL107XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmU7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpIHx8IHt9O1xuc3BpbmUuQXR0YWNobWVudFR5cGUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUeXBlJyk7XG5zcGluZS5NZXNoQXR0YWNobWVudCA9IGZ1bmN0aW9uIChuYW1lKVxue1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG59O1xuc3BpbmUuTWVzaEF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLm1lc2gsXG4gICAgdmVydGljZXM6IG51bGwsXG4gICAgdXZzOiBudWxsLFxuICAgIHJlZ2lvblVWczogbnVsbCxcbiAgICB0cmlhbmdsZXM6IG51bGwsXG4gICAgaHVsbExlbmd0aDogMCxcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxuICAgIHBhdGg6IG51bGwsXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXG4gICAgcmVnaW9uVTogMCwgcmVnaW9uVjogMCwgcmVnaW9uVTI6IDAsIHJlZ2lvblYyOiAwLCByZWdpb25Sb3RhdGU6IGZhbHNlLFxuICAgIHJlZ2lvbk9mZnNldFg6IDAsIHJlZ2lvbk9mZnNldFk6IDAsXG4gICAgcmVnaW9uV2lkdGg6IDAsIHJlZ2lvbkhlaWdodDogMCxcbiAgICByZWdpb25PcmlnaW5hbFdpZHRoOiAwLCByZWdpb25PcmlnaW5hbEhlaWdodDogMCxcbiAgICBlZGdlczogbnVsbCxcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxuICAgIHVwZGF0ZVVWczogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMucmVnaW9uVTIgLSB0aGlzLnJlZ2lvblUsIGhlaWdodCA9IHRoaXMucmVnaW9uVjIgLSB0aGlzLnJlZ2lvblY7XG4gICAgICAgIHZhciBuID0gdGhpcy5yZWdpb25VVnMubGVuZ3RoO1xuICAgICAgICBpZiAoIXRoaXMudXZzIHx8IHRoaXMudXZzLmxlbmd0aCAhPSBuKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLnV2cyA9IG5ldyBzcGluZS5GbG9hdDMyQXJyYXkobik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucmVnaW9uUm90YXRlKVxuICAgICAgICB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKz0gMilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpXSA9IHRoaXMucmVnaW9uVSArIHRoaXMucmVnaW9uVVZzW2kgKyAxXSAqIHdpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIGhlaWdodCAtIHRoaXMucmVnaW9uVVZzW2ldICogaGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICs9IDIpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaV0gPSB0aGlzLnJlZ2lvblUgKyB0aGlzLnJlZ2lvblVWc1tpXSAqIHdpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIHRoaXMucmVnaW9uVVZzW2kgKyAxXSAqIGhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgY29tcHV0ZVdvcmxkVmVydGljZXM6IGZ1bmN0aW9uICh4LCB5LCBzbG90LCB3b3JsZFZlcnRpY2VzKVxuICAgIHtcbiAgICAgICAgdmFyIGJvbmUgPSBzbG90LmJvbmU7XG4gICAgICAgIHggKz0gYm9uZS53b3JsZFg7XG4gICAgICAgIHkgKz0gYm9uZS53b3JsZFk7XG4gICAgICAgIHZhciBtMDAgPSBib25lLm0wMCwgbTAxID0gYm9uZS5tMDEsIG0xMCA9IGJvbmUubTEwLCBtMTEgPSBib25lLm0xMTtcbiAgICAgICAgdmFyIHZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlcztcbiAgICAgICAgdmFyIHZlcnRpY2VzQ291bnQgPSB2ZXJ0aWNlcy5sZW5ndGg7XG4gICAgICAgIGlmIChzbG90LmF0dGFjaG1lbnRWZXJ0aWNlcy5sZW5ndGggPT0gdmVydGljZXNDb3VudCkgdmVydGljZXMgPSBzbG90LmF0dGFjaG1lbnRWZXJ0aWNlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlc0NvdW50OyBpICs9IDIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2eCA9IHZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgdmFyIHZ5ID0gdmVydGljZXNbaSArIDFdO1xuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpXSA9IHZ4ICogbTAwICsgdnkgKiBtMDEgKyB4O1xuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpICsgMV0gPSB2eCAqIG0xMCArIHZ5ICogbTExICsgeTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLk1lc2hBdHRhY2htZW50O1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xuc3BpbmUuUmVnaW9uQXR0YWNobWVudCA9IGZ1bmN0aW9uIChuYW1lKVxue1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5vZmZzZXQgPSBbXTtcbiAgICB0aGlzLm9mZnNldC5sZW5ndGggPSA4O1xuICAgIHRoaXMudXZzID0gW107XG4gICAgdGhpcy51dnMubGVuZ3RoID0gODtcbn07XG5zcGluZS5SZWdpb25BdHRhY2htZW50LnByb3RvdHlwZSA9IHtcbiAgICB0eXBlOiBzcGluZS5BdHRhY2htZW50VHlwZS5yZWdpb24sXG4gICAgeDogMCwgeTogMCxcbiAgICByb3RhdGlvbjogMCxcbiAgICBzY2FsZVg6IDEsIHNjYWxlWTogMSxcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXG4gICAgcGF0aDogbnVsbCxcbiAgICByZW5kZXJlck9iamVjdDogbnVsbCxcbiAgICByZWdpb25PZmZzZXRYOiAwLCByZWdpb25PZmZzZXRZOiAwLFxuICAgIHJlZ2lvbldpZHRoOiAwLCByZWdpb25IZWlnaHQ6IDAsXG4gICAgcmVnaW9uT3JpZ2luYWxXaWR0aDogMCwgcmVnaW9uT3JpZ2luYWxIZWlnaHQ6IDAsXG4gICAgc2V0VVZzOiBmdW5jdGlvbiAodSwgdiwgdTIsIHYyLCByb3RhdGUpXG4gICAge1xuICAgICAgICB2YXIgdXZzID0gdGhpcy51dnM7XG4gICAgICAgIGlmIChyb3RhdGUpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHV2c1syLypYMiovXSA9IHU7XG4gICAgICAgICAgICB1dnNbMy8qWTIqL10gPSB2MjtcbiAgICAgICAgICAgIHV2c1s0LypYMyovXSA9IHU7XG4gICAgICAgICAgICB1dnNbNS8qWTMqL10gPSB2O1xuICAgICAgICAgICAgdXZzWzYvKlg0Ki9dID0gdTI7XG4gICAgICAgICAgICB1dnNbNy8qWTQqL10gPSB2O1xuICAgICAgICAgICAgdXZzWzAvKlgxKi9dID0gdTI7XG4gICAgICAgICAgICB1dnNbMS8qWTEqL10gPSB2MjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV2c1swLypYMSovXSA9IHU7XG4gICAgICAgICAgICB1dnNbMS8qWTEqL10gPSB2MjtcbiAgICAgICAgICAgIHV2c1syLypYMiovXSA9IHU7XG4gICAgICAgICAgICB1dnNbMy8qWTIqL10gPSB2O1xuICAgICAgICAgICAgdXZzWzQvKlgzKi9dID0gdTI7XG4gICAgICAgICAgICB1dnNbNS8qWTMqL10gPSB2O1xuICAgICAgICAgICAgdXZzWzYvKlg0Ki9dID0gdTI7XG4gICAgICAgICAgICB1dnNbNy8qWTQqL10gPSB2MjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgdXBkYXRlT2Zmc2V0OiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgdmFyIHJlZ2lvblNjYWxlWCA9IHRoaXMud2lkdGggLyB0aGlzLnJlZ2lvbk9yaWdpbmFsV2lkdGggKiB0aGlzLnNjYWxlWDtcbiAgICAgICAgdmFyIHJlZ2lvblNjYWxlWSA9IHRoaXMuaGVpZ2h0IC8gdGhpcy5yZWdpb25PcmlnaW5hbEhlaWdodCAqIHRoaXMuc2NhbGVZO1xuICAgICAgICB2YXIgbG9jYWxYID0gLXRoaXMud2lkdGggLyAyICogdGhpcy5zY2FsZVggKyB0aGlzLnJlZ2lvbk9mZnNldFggKiByZWdpb25TY2FsZVg7XG4gICAgICAgIHZhciBsb2NhbFkgPSAtdGhpcy5oZWlnaHQgLyAyICogdGhpcy5zY2FsZVkgKyB0aGlzLnJlZ2lvbk9mZnNldFkgKiByZWdpb25TY2FsZVk7XG4gICAgICAgIHZhciBsb2NhbFgyID0gbG9jYWxYICsgdGhpcy5yZWdpb25XaWR0aCAqIHJlZ2lvblNjYWxlWDtcbiAgICAgICAgdmFyIGxvY2FsWTIgPSBsb2NhbFkgKyB0aGlzLnJlZ2lvbkhlaWdodCAqIHJlZ2lvblNjYWxlWTtcbiAgICAgICAgdmFyIHJhZGlhbnMgPSB0aGlzLnJvdGF0aW9uICogc3BpbmUuZGVnUmFkO1xuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MocmFkaWFucyk7XG4gICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKTtcbiAgICAgICAgdmFyIGxvY2FsWENvcyA9IGxvY2FsWCAqIGNvcyArIHRoaXMueDtcbiAgICAgICAgdmFyIGxvY2FsWFNpbiA9IGxvY2FsWCAqIHNpbjtcbiAgICAgICAgdmFyIGxvY2FsWUNvcyA9IGxvY2FsWSAqIGNvcyArIHRoaXMueTtcbiAgICAgICAgdmFyIGxvY2FsWVNpbiA9IGxvY2FsWSAqIHNpbjtcbiAgICAgICAgdmFyIGxvY2FsWDJDb3MgPSBsb2NhbFgyICogY29zICsgdGhpcy54O1xuICAgICAgICB2YXIgbG9jYWxYMlNpbiA9IGxvY2FsWDIgKiBzaW47XG4gICAgICAgIHZhciBsb2NhbFkyQ29zID0gbG9jYWxZMiAqIGNvcyArIHRoaXMueTtcbiAgICAgICAgdmFyIGxvY2FsWTJTaW4gPSBsb2NhbFkyICogc2luO1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XG4gICAgICAgIG9mZnNldFswLypYMSovXSA9IGxvY2FsWENvcyAtIGxvY2FsWVNpbjtcbiAgICAgICAgb2Zmc2V0WzEvKlkxKi9dID0gbG9jYWxZQ29zICsgbG9jYWxYU2luO1xuICAgICAgICBvZmZzZXRbMi8qWDIqL10gPSBsb2NhbFhDb3MgLSBsb2NhbFkyU2luO1xuICAgICAgICBvZmZzZXRbMy8qWTIqL10gPSBsb2NhbFkyQ29zICsgbG9jYWxYU2luO1xuICAgICAgICBvZmZzZXRbNC8qWDMqL10gPSBsb2NhbFgyQ29zIC0gbG9jYWxZMlNpbjtcbiAgICAgICAgb2Zmc2V0WzUvKlkzKi9dID0gbG9jYWxZMkNvcyArIGxvY2FsWDJTaW47XG4gICAgICAgIG9mZnNldFs2LypYNCovXSA9IGxvY2FsWDJDb3MgLSBsb2NhbFlTaW47XG4gICAgICAgIG9mZnNldFs3LypZNCovXSA9IGxvY2FsWUNvcyArIGxvY2FsWDJTaW47XG4gICAgfSxcbiAgICBjb21wdXRlVmVydGljZXM6IGZ1bmN0aW9uICh4LCB5LCBib25lLCB2ZXJ0aWNlcylcbiAgICB7XG4gICAgICAgIHggKz0gYm9uZS53b3JsZFg7XG4gICAgICAgIHkgKz0gYm9uZS53b3JsZFk7XG4gICAgICAgIHZhciBtMDAgPSBib25lLm0wMCwgbTAxID0gYm9uZS5tMDEsIG0xMCA9IGJvbmUubTEwLCBtMTEgPSBib25lLm0xMTtcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMub2Zmc2V0O1xuICAgICAgICB2ZXJ0aWNlc1swLypYMSovXSA9IG9mZnNldFswLypYMSovXSAqIG0wMCArIG9mZnNldFsxLypZMSovXSAqIG0wMSArIHg7XG4gICAgICAgIHZlcnRpY2VzWzEvKlkxKi9dID0gb2Zmc2V0WzAvKlgxKi9dICogbTEwICsgb2Zmc2V0WzEvKlkxKi9dICogbTExICsgeTtcbiAgICAgICAgdmVydGljZXNbMi8qWDIqL10gPSBvZmZzZXRbMi8qWDIqL10gKiBtMDAgKyBvZmZzZXRbMy8qWTIqL10gKiBtMDEgKyB4O1xuICAgICAgICB2ZXJ0aWNlc1szLypZMiovXSA9IG9mZnNldFsyLypYMiovXSAqIG0xMCArIG9mZnNldFszLypZMiovXSAqIG0xMSArIHk7XG4gICAgICAgIHZlcnRpY2VzWzQvKlgzKi9dID0gb2Zmc2V0WzQvKlgzKi9dICogbTAwICsgb2Zmc2V0WzUvKlgzKi9dICogbTAxICsgeDtcbiAgICAgICAgdmVydGljZXNbNS8qWDMqL10gPSBvZmZzZXRbNC8qWDMqL10gKiBtMTAgKyBvZmZzZXRbNS8qWDMqL10gKiBtMTEgKyB5O1xuICAgICAgICB2ZXJ0aWNlc1s2LypYNCovXSA9IG9mZnNldFs2LypYNCovXSAqIG0wMCArIG9mZnNldFs3LypZNCovXSAqIG0wMSArIHg7XG4gICAgICAgIHZlcnRpY2VzWzcvKlk0Ki9dID0gb2Zmc2V0WzYvKlg0Ki9dICogbTEwICsgb2Zmc2V0WzcvKlk0Ki9dICogbTExICsgeTtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5SZWdpb25BdHRhY2htZW50O1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKSB8fCB7fTtcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xuc3BpbmUuUm90YXRlVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcbntcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgYW5nbGUsIC4uLlxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAyO1xufTtcbnNwaW5lLlJvdGF0ZVRpbWVsaW5lLnByb3RvdHlwZSA9IHtcbiAgICBib25lSW5kZXg6IDAsXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyAyO1xuICAgIH0sXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBhbmdsZSlcbiAgICB7XG4gICAgICAgIGZyYW1lSW5kZXggKj0gMjtcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSBhbmdsZTtcbiAgICB9LFxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXG4gICAge1xuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxuXG4gICAgICAgIHZhciBib25lID0gc2tlbGV0b24uYm9uZXNbdGhpcy5ib25lSW5kZXhdO1xuXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0pXG4gICAgICAgIHsgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxuICAgICAgICAgICAgdmFyIGFtb3VudCA9IGJvbmUuZGF0YS5yb3RhdGlvbiArIGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV0gLSBib25lLnJvdGF0aW9uO1xuICAgICAgICAgICAgd2hpbGUgKGFtb3VudCA+IDE4MClcbiAgICAgICAgICAgICAgICBhbW91bnQgLT0gMzYwO1xuICAgICAgICAgICAgd2hpbGUgKGFtb3VudCA8IC0xODApXG4gICAgICAgICAgICAgICAgYW1vdW50ICs9IDM2MDtcbiAgICAgICAgICAgIGJvbmUucm90YXRpb24gKz0gYW1vdW50ICogYWxwaGE7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDIpO1xuICAgICAgICB2YXIgcHJldkZyYW1lVmFsdWUgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDFdO1xuICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xuICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggLSAyLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyAyIC0gMSwgcGVyY2VudCk7XG5cbiAgICAgICAgdmFyIGFtb3VudCA9IGZyYW1lc1tmcmFtZUluZGV4ICsgMS8qRlJBTUVfVkFMVUUqL10gLSBwcmV2RnJhbWVWYWx1ZTtcbiAgICAgICAgd2hpbGUgKGFtb3VudCA+IDE4MClcbiAgICAgICAgICAgIGFtb3VudCAtPSAzNjA7XG4gICAgICAgIHdoaWxlIChhbW91bnQgPCAtMTgwKVxuICAgICAgICAgICAgYW1vdW50ICs9IDM2MDtcbiAgICAgICAgYW1vdW50ID0gYm9uZS5kYXRhLnJvdGF0aW9uICsgKHByZXZGcmFtZVZhbHVlICsgYW1vdW50ICogcGVyY2VudCkgLSBib25lLnJvdGF0aW9uO1xuICAgICAgICB3aGlsZSAoYW1vdW50ID4gMTgwKVxuICAgICAgICAgICAgYW1vdW50IC09IDM2MDtcbiAgICAgICAgd2hpbGUgKGFtb3VudCA8IC0xODApXG4gICAgICAgICAgICBhbW91bnQgKz0gMzYwO1xuICAgICAgICBib25lLnJvdGF0aW9uICs9IGFtb3VudCAqIGFscGhhO1xuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlJvdGF0ZVRpbWVsaW5lO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xuc3BpbmUuU2NhbGVUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxue1xuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCB4LCB5LCAuLi5cbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50ICogMztcbn07XG5zcGluZS5TY2FsZVRpbWVsaW5lLnByb3RvdHlwZSA9IHtcbiAgICBib25lSW5kZXg6IDAsXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyAzO1xuICAgIH0sXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCB4LCB5KVxuICAgIHtcbiAgICAgICAgZnJhbWVJbmRleCAqPSAzO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IHg7XG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAyXSA9IHk7XG4gICAgfSxcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxuICAgIHtcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cblxuICAgICAgICB2YXIgYm9uZSA9IHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtcblxuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDNdKVxuICAgICAgICB7IC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cbiAgICAgICAgICAgIGJvbmUuc2NhbGVYICs9IChib25lLmRhdGEuc2NhbGVYICogZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSAtIGJvbmUuc2NhbGVYKSAqIGFscGhhO1xuICAgICAgICAgICAgYm9uZS5zY2FsZVkgKz0gKGJvbmUuZGF0YS5zY2FsZVkgKiBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdIC0gYm9uZS5zY2FsZVkpICogYWxwaGE7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDMpO1xuICAgICAgICB2YXIgcHJldkZyYW1lWCA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMl07XG4gICAgICAgIHZhciBwcmV2RnJhbWVZID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAxXTtcbiAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcbiAgICAgICAgdmFyIHBlcmNlbnQgPSAxIC0gKHRpbWUgLSBmcmFtZVRpbWUpIC8gKGZyYW1lc1tmcmFtZUluZGV4ICsgLTMvKlBSRVZfRlJBTUVfVElNRSovXSAtIGZyYW1lVGltZSk7XG4gICAgICAgIHBlcmNlbnQgPSB0aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZnJhbWVJbmRleCAvIDMgLSAxLCBwZXJjZW50KTtcblxuICAgICAgICBib25lLnNjYWxlWCArPSAoYm9uZS5kYXRhLnNjYWxlWCAqIChwcmV2RnJhbWVYICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMS8qRlJBTUVfWCovXSAtIHByZXZGcmFtZVgpICogcGVyY2VudCkgLSBib25lLnNjYWxlWCkgKiBhbHBoYTtcbiAgICAgICAgYm9uZS5zY2FsZVkgKz0gKGJvbmUuZGF0YS5zY2FsZVkgKiAocHJldkZyYW1lWSArIChmcmFtZXNbZnJhbWVJbmRleCArIDIvKkZSQU1FX1kqL10gLSBwcmV2RnJhbWVZKSAqIHBlcmNlbnQpIC0gYm9uZS5zY2FsZVkpICogYWxwaGE7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2NhbGVUaW1lbGluZTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5Cb25lID0gcmVxdWlyZSgnLi9Cb25lJyk7XG5zcGluZS5TbG90ID0gcmVxdWlyZSgnLi9TbG90Jyk7XG5zcGluZS5Ja0NvbnN0cmFpbnQgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludCcpO1xuc3BpbmUuU2tlbGV0b24gPSBmdW5jdGlvbiAoc2tlbGV0b25EYXRhKVxue1xuICAgIHRoaXMuZGF0YSA9IHNrZWxldG9uRGF0YTtcblxuICAgIHRoaXMuYm9uZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNrZWxldG9uRGF0YS5ib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICB2YXIgYm9uZURhdGEgPSBza2VsZXRvbkRhdGEuYm9uZXNbaV07XG4gICAgICAgIHZhciBwYXJlbnQgPSAhYm9uZURhdGEucGFyZW50ID8gbnVsbCA6IHRoaXMuYm9uZXNbc2tlbGV0b25EYXRhLmJvbmVzLmluZGV4T2YoYm9uZURhdGEucGFyZW50KV07XG4gICAgICAgIHRoaXMuYm9uZXMucHVzaChuZXcgc3BpbmUuQm9uZShib25lRGF0YSwgdGhpcywgcGFyZW50KSk7XG4gICAgfVxuXG4gICAgdGhpcy5zbG90cyA9IFtdO1xuICAgIHRoaXMuZHJhd09yZGVyID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBza2VsZXRvbkRhdGEuc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgIHtcbiAgICAgICAgdmFyIHNsb3REYXRhID0gc2tlbGV0b25EYXRhLnNsb3RzW2ldO1xuICAgICAgICB2YXIgYm9uZSA9IHRoaXMuYm9uZXNbc2tlbGV0b25EYXRhLmJvbmVzLmluZGV4T2Yoc2xvdERhdGEuYm9uZURhdGEpXTtcbiAgICAgICAgdmFyIHNsb3QgPSBuZXcgc3BpbmUuU2xvdChzbG90RGF0YSwgYm9uZSk7XG4gICAgICAgIHRoaXMuc2xvdHMucHVzaChzbG90KTtcbiAgICAgICAgdGhpcy5kcmF3T3JkZXIucHVzaChpKTtcbiAgICB9XG5cbiAgICB0aGlzLmlrQ29uc3RyYWludHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNrZWxldG9uRGF0YS5pa0NvbnN0cmFpbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgdGhpcy5pa0NvbnN0cmFpbnRzLnB1c2gobmV3IHNwaW5lLklrQ29uc3RyYWludChza2VsZXRvbkRhdGEuaWtDb25zdHJhaW50c1tpXSwgdGhpcykpO1xuXG4gICAgdGhpcy5ib25lQ2FjaGUgPSBbXTtcbiAgICB0aGlzLnVwZGF0ZUNhY2hlKCk7XG59O1xuc3BpbmUuU2tlbGV0b24ucHJvdG90eXBlID0ge1xuICAgIHg6IDAsIHk6IDAsXG4gICAgc2tpbjogbnVsbCxcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxuICAgIHRpbWU6IDAsXG4gICAgZmxpcFg6IGZhbHNlLCBmbGlwWTogZmFsc2UsXG4gICAgLyoqIENhY2hlcyBpbmZvcm1hdGlvbiBhYm91dCBib25lcyBhbmQgSUsgY29uc3RyYWludHMuIE11c3QgYmUgY2FsbGVkIGlmIGJvbmVzIG9yIElLIGNvbnN0cmFpbnRzIGFyZSBhZGRlZCBvciByZW1vdmVkLiAqL1xuICAgIHVwZGF0ZUNhY2hlOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHMgPSB0aGlzLmlrQ29uc3RyYWludHM7XG4gICAgICAgIHZhciBpa0NvbnN0cmFpbnRzQ291bnQgPSBpa0NvbnN0cmFpbnRzLmxlbmd0aDtcblxuICAgICAgICB2YXIgYXJyYXlDb3VudCA9IGlrQ29uc3RyYWludHNDb3VudCArIDE7XG4gICAgICAgIHZhciBib25lQ2FjaGUgPSB0aGlzLmJvbmVDYWNoZTtcbiAgICAgICAgaWYgKGJvbmVDYWNoZS5sZW5ndGggPiBhcnJheUNvdW50KSBib25lQ2FjaGUubGVuZ3RoID0gYXJyYXlDb3VudDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lQ2FjaGUubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgYm9uZUNhY2hlW2ldLmxlbmd0aCA9IDA7XG4gICAgICAgIHdoaWxlIChib25lQ2FjaGUubGVuZ3RoIDwgYXJyYXlDb3VudClcbiAgICAgICAgICAgIGJvbmVDYWNoZVtib25lQ2FjaGUubGVuZ3RoXSA9IFtdO1xuXG4gICAgICAgIHZhciBub25Ja0JvbmVzID0gYm9uZUNhY2hlWzBdO1xuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xuXG4gICAgICAgIG91dGVyOlxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGJvbmUgPSBib25lc1tpXTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50ID0gYm9uZTtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaWtDb25zdHJhaW50c0NvdW50OyBpaSsrKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlrQ29uc3RyYWludCA9IGlrQ29uc3RyYWludHNbaWldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gaWtDb25zdHJhaW50LmJvbmVzWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGQ9IGlrQ29uc3RyYWludC5ib25lc1tpa0NvbnN0cmFpbnQuYm9uZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA9PSBjaGlsZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib25lQ2FjaGVbaWldLnB1c2goYm9uZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9uZUNhY2hlW2lpICsgMV0ucHVzaChib25lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZCA9PSBwYXJlbnQpIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICAgICAgfSB3aGlsZSAoY3VycmVudCk7XG4gICAgICAgICAgICBub25Ja0JvbmVzW25vbklrQm9uZXMubGVuZ3RoXSA9IGJvbmU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKiBVcGRhdGVzIHRoZSB3b3JsZCB0cmFuc2Zvcm0gZm9yIGVhY2ggYm9uZS4gKi9cbiAgICB1cGRhdGVXb3JsZFRyYW5zZm9ybTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgYm9uZSA9IGJvbmVzW2ldO1xuICAgICAgICAgICAgYm9uZS5yb3RhdGlvbklLID0gYm9uZS5yb3RhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaSA9IDAsIGxhc3QgPSB0aGlzLmJvbmVDYWNoZS5sZW5ndGggLSAxO1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGNhY2hlQm9uZXMgPSB0aGlzLmJvbmVDYWNoZVtpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSBjYWNoZUJvbmVzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcbiAgICAgICAgICAgICAgICBjYWNoZUJvbmVzW2lpXS51cGRhdGVXb3JsZFRyYW5zZm9ybSgpO1xuICAgICAgICAgICAgaWYgKGkgPT0gbGFzdCkgYnJlYWs7XG4gICAgICAgICAgICB0aGlzLmlrQ29uc3RyYWludHNbaV0uYXBwbHkoKTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqIFNldHMgdGhlIGJvbmVzIGFuZCBzbG90cyB0byB0aGVpciBzZXR1cCBwb3NlIHZhbHVlcy4gKi9cbiAgICBzZXRUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHRoaXMuc2V0Qm9uZXNUb1NldHVwUG9zZSgpO1xuICAgICAgICB0aGlzLnNldFNsb3RzVG9TZXR1cFBvc2UoKTtcbiAgICB9LFxuICAgIHNldEJvbmVzVG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGJvbmVzW2ldLnNldFRvU2V0dXBQb3NlKCk7XG5cbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHMgPSB0aGlzLmlrQ29uc3RyYWludHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gaWtDb25zdHJhaW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBpa0NvbnN0cmFpbnRzW2ldO1xuICAgICAgICAgICAgaWtDb25zdHJhaW50LmJlbmREaXJlY3Rpb24gPSBpa0NvbnN0cmFpbnQuZGF0YS5iZW5kRGlyZWN0aW9uO1xuICAgICAgICAgICAgaWtDb25zdHJhaW50Lm1peCA9IGlrQ29uc3RyYWludC5kYXRhLm1peDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0U2xvdHNUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICB7XG4gICAgICAgICAgICBzbG90c1tpXS5zZXRUb1NldHVwUG9zZShpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVzZXREcmF3T3JkZXIoKTtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIE1heSByZXR1cm4gbnVsbC4gKi9cbiAgICBnZXRSb290Qm9uZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmJvbmVzLmxlbmd0aCA/IHRoaXMuYm9uZXNbMF0gOiBudWxsO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXG4gICAgZmluZEJvbmU6IGZ1bmN0aW9uIChib25lTmFtZSlcbiAgICB7XG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgaWYgKGJvbmVzW2ldLmRhdGEubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGJvbmVzW2ldO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIC0xIGlmIHRoZSBib25lIHdhcyBub3QgZm91bmQuICovXG4gICAgZmluZEJvbmVJbmRleDogZnVuY3Rpb24gKGJvbmVOYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0uZGF0YS5uYW1lID09IGJvbmVOYW1lKSByZXR1cm4gaTtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXG4gICAgZmluZFNsb3Q6IGZ1bmN0aW9uIChzbG90TmFtZSlcbiAgICB7XG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgaWYgKHNsb3RzW2ldLmRhdGEubmFtZSA9PSBzbG90TmFtZSkgcmV0dXJuIHNsb3RzW2ldO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIC0xIGlmIHRoZSBib25lIHdhcyBub3QgZm91bmQuICovXG4gICAgZmluZFNsb3RJbmRleDogZnVuY3Rpb24gKHNsb3ROYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0uZGF0YS5uYW1lID09IHNsb3ROYW1lKSByZXR1cm4gaTtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH0sXG4gICAgc2V0U2tpbkJ5TmFtZTogZnVuY3Rpb24gKHNraW5OYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIHNraW4gPSB0aGlzLmRhdGEuZmluZFNraW4oc2tpbk5hbWUpO1xuICAgICAgICBpZiAoIXNraW4pIHRocm93IFwiU2tpbiBub3QgZm91bmQ6IFwiICsgc2tpbk5hbWU7XG4gICAgICAgIHRoaXMuc2V0U2tpbihza2luKTtcbiAgICB9LFxuICAgIC8qKiBTZXRzIHRoZSBza2luIHVzZWQgdG8gbG9vayB1cCBhdHRhY2htZW50cyBiZWZvcmUgbG9va2luZyBpbiB0aGUge0BsaW5rIFNrZWxldG9uRGF0YSNnZXREZWZhdWx0U2tpbigpIGRlZmF1bHQgc2tpbn0uXG4gICAgICogQXR0YWNobWVudHMgZnJvbSB0aGUgbmV3IHNraW4gYXJlIGF0dGFjaGVkIGlmIHRoZSBjb3JyZXNwb25kaW5nIGF0dGFjaG1lbnQgZnJvbSB0aGUgb2xkIHNraW4gd2FzIGF0dGFjaGVkLiBJZiB0aGVyZSB3YXNcbiAgICAgKiBubyBvbGQgc2tpbiwgZWFjaCBzbG90J3Mgc2V0dXAgbW9kZSBhdHRhY2htZW50IGlzIGF0dGFjaGVkIGZyb20gdGhlIG5ldyBza2luLlxuICAgICAqIEBwYXJhbSBuZXdTa2luIE1heSBiZSBudWxsLiAqL1xuICAgIHNldFNraW46IGZ1bmN0aW9uIChuZXdTa2luKVxuICAgIHtcbiAgICAgICAgaWYgKG5ld1NraW4pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNraW4pXG4gICAgICAgICAgICAgICAgbmV3U2tpbi5fYXR0YWNoQWxsKHRoaXMsIHRoaXMuc2tpbik7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gc2xvdC5kYXRhLmF0dGFjaG1lbnROYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBuZXdTa2luLmdldEF0dGFjaG1lbnQoaSwgbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0YWNobWVudCkgc2xvdC5zZXRBdHRhY2htZW50KGF0dGFjaG1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2tpbiA9IG5ld1NraW47XG4gICAgfSxcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cbiAgICBnZXRBdHRhY2htZW50QnlTbG90TmFtZTogZnVuY3Rpb24gKHNsb3ROYW1lLCBhdHRhY2htZW50TmFtZSlcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLmRhdGEuZmluZFNsb3RJbmRleChzbG90TmFtZSksIGF0dGFjaG1lbnROYW1lKTtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xuICAgIGdldEF0dGFjaG1lbnRCeVNsb3RJbmRleDogZnVuY3Rpb24gKHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUpXG4gICAge1xuICAgICAgICBpZiAodGhpcy5za2luKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuc2tpbi5nZXRBdHRhY2htZW50KHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUpO1xuICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQpIHJldHVybiBhdHRhY2htZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEuZGVmYXVsdFNraW4pIHJldHVybiB0aGlzLmRhdGEuZGVmYXVsdFNraW4uZ2V0QXR0YWNobWVudChzbG90SW5kZXgsIGF0dGFjaG1lbnROYW1lKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICAvKiogQHBhcmFtIGF0dGFjaG1lbnROYW1lIE1heSBiZSBudWxsLiAqL1xuICAgIHNldEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChzbG90TmFtZSwgYXR0YWNobWVudE5hbWUpXG4gICAge1xuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHNsb3QgPSBzbG90c1tpXTtcbiAgICAgICAgICAgIGlmIChzbG90LmRhdGEubmFtZSA9PSBzbG90TmFtZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnROYW1lKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNobWVudCA9IHRoaXMuZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KGksIGF0dGFjaG1lbnROYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRhY2htZW50KSB0aHJvdyBcIkF0dGFjaG1lbnQgbm90IGZvdW5kOiBcIiArIGF0dGFjaG1lbnROYW1lICsgXCIsIGZvciBzbG90OiBcIiArIHNsb3ROYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzbG90LnNldEF0dGFjaG1lbnQoYXR0YWNobWVudCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRocm93IFwiU2xvdCBub3QgZm91bmQ6IFwiICsgc2xvdE5hbWU7XG4gICAgfSxcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cbiAgICBmaW5kSWtDb25zdHJhaW50OiBmdW5jdGlvbiAoaWtDb25zdHJhaW50TmFtZSlcbiAgICB7XG4gICAgICAgIHZhciBpa0NvbnN0cmFpbnRzID0gdGhpcy5pa0NvbnN0cmFpbnRzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGlrQ29uc3RyYWludHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgaWYgKGlrQ29uc3RyYWludHNbaV0uZGF0YS5uYW1lID09IGlrQ29uc3RyYWludE5hbWUpIHJldHVybiBpa0NvbnN0cmFpbnRzW2ldO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGRlbHRhKVxuICAgIHtcbiAgICAgICAgdGhpcy50aW1lICs9IGRlbHRhO1xuICAgIH0sXG4gICAgcmVzZXREcmF3T3JkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLmRyYXdPcmRlci5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuZHJhd09yZGVyW2ldID0gaTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNrZWxldG9uO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVJ1bnRpbWUnKSB8fCB7fTtcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xuc3BpbmUuU2tlbGV0b25Cb3VuZHMgPSBmdW5jdGlvbiAoKVxue1xuICAgIHRoaXMucG9seWdvblBvb2wgPSBbXTtcbiAgICB0aGlzLnBvbHlnb25zID0gW107XG4gICAgdGhpcy5ib3VuZGluZ0JveGVzID0gW107XG59O1xuc3BpbmUuU2tlbGV0b25Cb3VuZHMucHJvdG90eXBlID0ge1xuICAgIG1pblg6IDAsIG1pblk6IDAsIG1heFg6IDAsIG1heFk6IDAsXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoc2tlbGV0b24sIHVwZGF0ZUFhYmIpXG4gICAge1xuICAgICAgICB2YXIgc2xvdHMgPSBza2VsZXRvbi5zbG90cztcbiAgICAgICAgdmFyIHNsb3RDb3VudCA9IHNsb3RzLmxlbmd0aDtcbiAgICAgICAgdmFyIHggPSBza2VsZXRvbi54LCB5ID0gc2tlbGV0b24ueTtcbiAgICAgICAgdmFyIGJvdW5kaW5nQm94ZXMgPSB0aGlzLmJvdW5kaW5nQm94ZXM7XG4gICAgICAgIHZhciBwb2x5Z29uUG9vbCA9IHRoaXMucG9seWdvblBvb2w7XG4gICAgICAgIHZhciBwb2x5Z29ucyA9IHRoaXMucG9seWdvbnM7XG5cbiAgICAgICAgYm91bmRpbmdCb3hlcy5sZW5ndGggPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHBvbHlnb25Qb29sLnB1c2gocG9seWdvbnNbaV0pO1xuICAgICAgICBwb2x5Z29ucy5sZW5ndGggPSAwO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xvdENvdW50OyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XG4gICAgICAgICAgICB2YXIgYm91bmRpbmdCb3ggPSBzbG90LmF0dGFjaG1lbnQ7XG4gICAgICAgICAgICBpZiAoYm91bmRpbmdCb3gudHlwZSAhPSBzcGluZS5BdHRhY2htZW50VHlwZS5ib3VuZGluZ2JveCkgY29udGludWU7XG4gICAgICAgICAgICBib3VuZGluZ0JveGVzLnB1c2goYm91bmRpbmdCb3gpO1xuXG4gICAgICAgICAgICB2YXIgcG9vbENvdW50ID0gcG9seWdvblBvb2wubGVuZ3RoLCBwb2x5Z29uO1xuICAgICAgICAgICAgaWYgKHBvb2xDb3VudCA+IDApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcG9seWdvbiA9IHBvbHlnb25Qb29sW3Bvb2xDb3VudCAtIDFdO1xuICAgICAgICAgICAgICAgIHBvbHlnb25Qb29sLnNwbGljZShwb29sQ291bnQgLSAxLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgIHBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgIHBvbHlnb25zLnB1c2gocG9seWdvbik7XG5cbiAgICAgICAgICAgIHBvbHlnb24ubGVuZ3RoID0gYm91bmRpbmdCb3gudmVydGljZXMubGVuZ3RoO1xuICAgICAgICAgICAgYm91bmRpbmdCb3guY29tcHV0ZVdvcmxkVmVydGljZXMoeCwgeSwgc2xvdC5ib25lLCBwb2x5Z29uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1cGRhdGVBYWJiKSB0aGlzLmFhYmJDb21wdXRlKCk7XG4gICAgfSxcbiAgICBhYWJiQ29tcHV0ZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciBwb2x5Z29ucyA9IHRoaXMucG9seWdvbnM7XG4gICAgICAgIHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRSwgbWluWSA9IE51bWJlci5NQVhfVkFMVUUsIG1heFggPSBOdW1iZXIuTUlOX1ZBTFVFLCBtYXhZID0gTnVtYmVyLk1JTl9WQUxVRTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBwb2x5Z29ucy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNlcyA9IHBvbHlnb25zW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IHZlcnRpY2VzLmxlbmd0aDsgaWkgPCBubjsgaWkgKz0gMilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHZlcnRpY2VzW2lpXTtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHZlcnRpY2VzW2lpICsgMV07XG4gICAgICAgICAgICAgICAgbWluWCA9IE1hdGgubWluKG1pblgsIHgpO1xuICAgICAgICAgICAgICAgIG1pblkgPSBNYXRoLm1pbihtaW5ZLCB5KTtcbiAgICAgICAgICAgICAgICBtYXhYID0gTWF0aC5tYXgobWF4WCwgeCk7XG4gICAgICAgICAgICAgICAgbWF4WSA9IE1hdGgubWF4KG1heFksIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubWluWCA9IG1pblg7XG4gICAgICAgIHRoaXMubWluWSA9IG1pblk7XG4gICAgICAgIHRoaXMubWF4WCA9IG1heFg7XG4gICAgICAgIHRoaXMubWF4WSA9IG1heFk7XG4gICAgfSxcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IGNvbnRhaW5zIHRoZSBwb2ludC4gKi9cbiAgICBhYWJiQ29udGFpbnNQb2ludDogZnVuY3Rpb24gKHgsIHkpXG4gICAge1xuICAgICAgICByZXR1cm4geCA+PSB0aGlzLm1pblggJiYgeCA8PSB0aGlzLm1heFggJiYgeSA+PSB0aGlzLm1pblkgJiYgeSA8PSB0aGlzLm1heFk7XG4gICAgfSxcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IGludGVyc2VjdHMgdGhlIGxpbmUgc2VnbWVudC4gKi9cbiAgICBhYWJiSW50ZXJzZWN0c1NlZ21lbnQ6IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5MilcbiAgICB7XG4gICAgICAgIHZhciBtaW5YID0gdGhpcy5taW5YLCBtaW5ZID0gdGhpcy5taW5ZLCBtYXhYID0gdGhpcy5tYXhYLCBtYXhZID0gdGhpcy5tYXhZO1xuICAgICAgICBpZiAoKHgxIDw9IG1pblggJiYgeDIgPD0gbWluWCkgfHwgKHkxIDw9IG1pblkgJiYgeTIgPD0gbWluWSkgfHwgKHgxID49IG1heFggJiYgeDIgPj0gbWF4WCkgfHwgKHkxID49IG1heFkgJiYgeTIgPj0gbWF4WSkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBtID0gKHkyIC0geTEpIC8gKHgyIC0geDEpO1xuICAgICAgICB2YXIgeSA9IG0gKiAobWluWCAtIHgxKSArIHkxO1xuICAgICAgICBpZiAoeSA+IG1pblkgJiYgeSA8IG1heFkpIHJldHVybiB0cnVlO1xuICAgICAgICB5ID0gbSAqIChtYXhYIC0geDEpICsgeTE7XG4gICAgICAgIGlmICh5ID4gbWluWSAmJiB5IDwgbWF4WSkgcmV0dXJuIHRydWU7XG4gICAgICAgIHZhciB4ID0gKG1pblkgLSB5MSkgLyBtICsgeDE7XG4gICAgICAgIGlmICh4ID4gbWluWCAmJiB4IDwgbWF4WCkgcmV0dXJuIHRydWU7XG4gICAgICAgIHggPSAobWF4WSAtIHkxKSAvIG0gKyB4MTtcbiAgICAgICAgaWYgKHggPiBtaW5YICYmIHggPCBtYXhYKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYXhpcyBhbGlnbmVkIGJvdW5kaW5nIGJveCBpbnRlcnNlY3RzIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IG9mIHRoZSBzcGVjaWZpZWQgYm91bmRzLiAqL1xuICAgIGFhYmJJbnRlcnNlY3RzU2tlbGV0b246IGZ1bmN0aW9uIChib3VuZHMpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5taW5YIDwgYm91bmRzLm1heFggJiYgdGhpcy5tYXhYID4gYm91bmRzLm1pblggJiYgdGhpcy5taW5ZIDwgYm91bmRzLm1heFkgJiYgdGhpcy5tYXhZID4gYm91bmRzLm1pblk7XG4gICAgfSxcbiAgICAvKiogUmV0dXJucyB0aGUgZmlyc3QgYm91bmRpbmcgYm94IGF0dGFjaG1lbnQgdGhhdCBjb250YWlucyB0aGUgcG9pbnQsIG9yIG51bGwuIFdoZW4gZG9pbmcgbWFueSBjaGVja3MsIGl0IGlzIHVzdWFsbHkgbW9yZVxuICAgICAqIGVmZmljaWVudCB0byBvbmx5IGNhbGwgdGhpcyBtZXRob2QgaWYge0BsaW5rICNhYWJiQ29udGFpbnNQb2ludChmbG9hdCwgZmxvYXQpfSByZXR1cm5zIHRydWUuICovXG4gICAgY29udGFpbnNQb2ludDogZnVuY3Rpb24gKHgsIHkpXG4gICAge1xuICAgICAgICB2YXIgcG9seWdvbnMgPSB0aGlzLnBvbHlnb25zO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmICh0aGlzLnBvbHlnb25Db250YWluc1BvaW50KHBvbHlnb25zW2ldLCB4LCB5KSkgcmV0dXJuIHRoaXMuYm91bmRpbmdCb3hlc1tpXTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICAvKiogUmV0dXJucyB0aGUgZmlyc3QgYm91bmRpbmcgYm94IGF0dGFjaG1lbnQgdGhhdCBjb250YWlucyB0aGUgbGluZSBzZWdtZW50LCBvciBudWxsLiBXaGVuIGRvaW5nIG1hbnkgY2hlY2tzLCBpdCBpcyB1c3VhbGx5XG4gICAgICogbW9yZSBlZmZpY2llbnQgdG8gb25seSBjYWxsIHRoaXMgbWV0aG9kIGlmIHtAbGluayAjYWFiYkludGVyc2VjdHNTZWdtZW50KGZsb2F0LCBmbG9hdCwgZmxvYXQsIGZsb2F0KX0gcmV0dXJucyB0cnVlLiAqL1xuICAgIGludGVyc2VjdHNTZWdtZW50OiBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpXG4gICAge1xuICAgICAgICB2YXIgcG9seWdvbnMgPSB0aGlzLnBvbHlnb25zO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChwb2x5Z29uc1tpXS5pbnRlcnNlY3RzU2VnbWVudCh4MSwgeTEsIHgyLCB5MikpIHJldHVybiB0aGlzLmJvdW5kaW5nQm94ZXNbaV07XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgcG9seWdvbiBjb250YWlucyB0aGUgcG9pbnQuICovXG4gICAgcG9seWdvbkNvbnRhaW5zUG9pbnQ6IGZ1bmN0aW9uIChwb2x5Z29uLCB4LCB5KVxuICAgIHtcbiAgICAgICAgdmFyIG5uID0gcG9seWdvbi5sZW5ndGg7XG4gICAgICAgIHZhciBwcmV2SW5kZXggPSBubiAtIDI7XG4gICAgICAgIHZhciBpbnNpZGUgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5uOyBpaSArPSAyKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmVydGV4WSA9IHBvbHlnb25baWkgKyAxXTtcbiAgICAgICAgICAgIHZhciBwcmV2WSA9IHBvbHlnb25bcHJldkluZGV4ICsgMV07XG4gICAgICAgICAgICBpZiAoKHZlcnRleFkgPCB5ICYmIHByZXZZID49IHkpIHx8IChwcmV2WSA8IHkgJiYgdmVydGV4WSA+PSB5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgdmVydGV4WCA9IHBvbHlnb25baWldO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJ0ZXhYICsgKHkgLSB2ZXJ0ZXhZKSAvIChwcmV2WSAtIHZlcnRleFkpICogKHBvbHlnb25bcHJldkluZGV4XSAtIHZlcnRleFgpIDwgeCkgaW5zaWRlID0gIWluc2lkZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByZXZJbmRleCA9IGlpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnNpZGU7XG4gICAgfSxcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBwb2x5Z29uIGNvbnRhaW5zIHRoZSBsaW5lIHNlZ21lbnQuICovXG4gICAgcG9seWdvbkludGVyc2VjdHNTZWdtZW50OiBmdW5jdGlvbiAocG9seWdvbiwgeDEsIHkxLCB4MiwgeTIpXG4gICAge1xuICAgICAgICB2YXIgbm4gPSBwb2x5Z29uLmxlbmd0aDtcbiAgICAgICAgdmFyIHdpZHRoMTIgPSB4MSAtIHgyLCBoZWlnaHQxMiA9IHkxIC0geTI7XG4gICAgICAgIHZhciBkZXQxID0geDEgKiB5MiAtIHkxICogeDI7XG4gICAgICAgIHZhciB4MyA9IHBvbHlnb25bbm4gLSAyXSwgeTMgPSBwb2x5Z29uW25uIC0gMV07XG4gICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBubjsgaWkgKz0gMilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHg0ID0gcG9seWdvbltpaV0sIHk0ID0gcG9seWdvbltpaSArIDFdO1xuICAgICAgICAgICAgdmFyIGRldDIgPSB4MyAqIHk0IC0geTMgKiB4NDtcbiAgICAgICAgICAgIHZhciB3aWR0aDM0ID0geDMgLSB4NCwgaGVpZ2h0MzQgPSB5MyAtIHk0O1xuICAgICAgICAgICAgdmFyIGRldDMgPSB3aWR0aDEyICogaGVpZ2h0MzQgLSBoZWlnaHQxMiAqIHdpZHRoMzQ7XG4gICAgICAgICAgICB2YXIgeCA9IChkZXQxICogd2lkdGgzNCAtIHdpZHRoMTIgKiBkZXQyKSAvIGRldDM7XG4gICAgICAgICAgICBpZiAoKCh4ID49IHgzICYmIHggPD0geDQpIHx8ICh4ID49IHg0ICYmIHggPD0geDMpKSAmJiAoKHggPj0geDEgJiYgeCA8PSB4MikgfHwgKHggPj0geDIgJiYgeCA8PSB4MSkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciB5ID0gKGRldDEgKiBoZWlnaHQzNCAtIGhlaWdodDEyICogZGV0MikgLyBkZXQzO1xuICAgICAgICAgICAgICAgIGlmICgoKHkgPj0geTMgJiYgeSA8PSB5NCkgfHwgKHkgPj0geTQgJiYgeSA8PSB5MykpICYmICgoeSA+PSB5MSAmJiB5IDw9IHkyKSB8fCAoeSA+PSB5MiAmJiB5IDw9IHkxKSkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeDMgPSB4NDtcbiAgICAgICAgICAgIHkzID0geTQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgZ2V0UG9seWdvbjogZnVuY3Rpb24gKGF0dGFjaG1lbnQpXG4gICAge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmJvdW5kaW5nQm94ZXMuaW5kZXhPZihhdHRhY2htZW50KTtcbiAgICAgICAgcmV0dXJuIGluZGV4ID09IC0xID8gbnVsbCA6IHRoaXMucG9seWdvbnNbaW5kZXhdO1xuICAgIH0sXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xuICAgIH0sXG4gICAgZ2V0SGVpZ2h0OiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4WSAtIHRoaXMubWluWTtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2VsZXRvbkJvdW5kcztcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5Ta2VsZXRvbkRhdGEgPSBmdW5jdGlvbiAoKVxue1xuICAgIHRoaXMuYm9uZXMgPSBbXTtcbiAgICB0aGlzLnNsb3RzID0gW107XG4gICAgdGhpcy5za2lucyA9IFtdO1xuICAgIHRoaXMuZXZlbnRzID0gW107XG4gICAgdGhpcy5hbmltYXRpb25zID0gW107XG4gICAgdGhpcy5pa0NvbnN0cmFpbnRzID0gW107XG59O1xuc3BpbmUuU2tlbGV0b25EYXRhLnByb3RvdHlwZSA9IHtcbiAgICBuYW1lOiBudWxsLFxuICAgIGRlZmF1bHRTa2luOiBudWxsLFxuICAgIHdpZHRoOiAwLCBoZWlnaHQ6IDAsXG4gICAgdmVyc2lvbjogbnVsbCwgaGFzaDogbnVsbCxcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cbiAgICBmaW5kQm9uZTogZnVuY3Rpb24gKGJvbmVOYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0ubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGJvbmVzW2ldO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIC0xIGlmIHRoZSBib25lIHdhcyBub3QgZm91bmQuICovXG4gICAgZmluZEJvbmVJbmRleDogZnVuY3Rpb24gKGJvbmVOYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0ubmFtZSA9PSBib25lTmFtZSkgcmV0dXJuIGk7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9LFxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xuICAgIGZpbmRTbG90OiBmdW5jdGlvbiAoc2xvdE5hbWUpXG4gICAge1xuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2ldLm5hbWUgPT0gc2xvdE5hbWUpIHJldHVybiBzbG90W2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gLTEgaWYgdGhlIGJvbmUgd2FzIG5vdCBmb3VuZC4gKi9cbiAgICBmaW5kU2xvdEluZGV4OiBmdW5jdGlvbiAoc2xvdE5hbWUpXG4gICAge1xuICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChzbG90c1tpXS5uYW1lID09IHNsb3ROYW1lKSByZXR1cm4gaTtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXG4gICAgZmluZFNraW46IGZ1bmN0aW9uIChza2luTmFtZSlcbiAgICB7XG4gICAgICAgIHZhciBza2lucyA9IHRoaXMuc2tpbnM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2tpbnMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgaWYgKHNraW5zW2ldLm5hbWUgPT0gc2tpbk5hbWUpIHJldHVybiBza2luc1tpXTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cbiAgICBmaW5kRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUpXG4gICAge1xuICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZXZlbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChldmVudHNbaV0ubmFtZSA9PSBldmVudE5hbWUpIHJldHVybiBldmVudHNbaV07XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXG4gICAgZmluZEFuaW1hdGlvbjogZnVuY3Rpb24gKGFuaW1hdGlvbk5hbWUpXG4gICAge1xuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMuYW5pbWF0aW9ucztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhbmltYXRpb25zLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25zW2ldLm5hbWUgPT0gYW5pbWF0aW9uTmFtZSkgcmV0dXJuIGFuaW1hdGlvbnNbaV07XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXG4gICAgZmluZElrQ29uc3RyYWludDogZnVuY3Rpb24gKGlrQ29uc3RyYWludE5hbWUpXG4gICAge1xuICAgICAgICB2YXIgaWtDb25zdHJhaW50cyA9IHRoaXMuaWtDb25zdHJhaW50cztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBpa0NvbnN0cmFpbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIGlmIChpa0NvbnN0cmFpbnRzW2ldLm5hbWUgPT0gaWtDb25zdHJhaW50TmFtZSkgcmV0dXJuIGlrQ29uc3RyYWludHNbaV07XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNrZWxldG9uRGF0YTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5Ta2VsZXRvbkRhdGEgPSByZXF1aXJlKCcuL1NrZWxldG9uRGF0YScpO1xuc3BpbmUuQm9uZURhdGEgPSByZXF1aXJlKCcuL0JvbmVEYXRhJyk7XG5zcGluZS5Ja0NvbnN0cmFpbnREYXRhID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnREYXRhJyk7XG5zcGluZS5TbG90RGF0YSA9IHJlcXVpcmUoJy4vU2xvdERhdGEnKTtcbnNwaW5lLlNraW4gPSByZXF1aXJlKCcuL1NraW4nKTtcbnNwaW5lLkV2ZW50RGF0YSA9IHJlcXVpcmUoJy4vRXZlbnREYXRhJyk7XG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcbnNwaW5lLkNvbG9yVGltZWxpbmUgPSByZXF1aXJlKCcuL0NvbG9yVGltZWxpbmUnKTtcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFRpbWVsaW5lJyk7XG5zcGluZS5Sb3RhdGVUaW1lbGluZSA9IHJlcXVpcmUoJy4vUm90YXRlVGltZWxpbmUnKTtcbnNwaW5lLlNjYWxlVGltZWxpbmUgPSByZXF1aXJlKCcuL1NjYWxlVGltZWxpbmUnKTtcbnNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9UcmFuc2xhdGVUaW1lbGluZScpO1xuc3BpbmUuRmxpcFhUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFhUaW1lbGluZScpO1xuc3BpbmUuRmxpcFlUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFlUaW1lbGluZScpO1xuc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludFRpbWVsaW5lJyk7XG5zcGluZS5GZmRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmZkVGltZWxpbmUnKTtcbnNwaW5lLkRyYXdPcmRlclRpbWVsaW5lID0gcmVxdWlyZSgnLi9EcmF3T3JkZXJUaW1lbGluZScpO1xuc3BpbmUuRXZlbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRXZlbnRUaW1lbGluZScpO1xuc3BpbmUuRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xuc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyID0gZnVuY3Rpb24gKGF0dGFjaG1lbnRMb2FkZXIpXG57XG4gICAgdGhpcy5hdHRhY2htZW50TG9hZGVyID0gYXR0YWNobWVudExvYWRlcjtcbn07XG5zcGluZS5Ta2VsZXRvbkpzb25QYXJzZXIucHJvdG90eXBlID0ge1xuICAgIHNjYWxlOiAxLFxuICAgIHJlYWRTa2VsZXRvbkRhdGE6IGZ1bmN0aW9uIChyb290LCBuYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIHNrZWxldG9uRGF0YSA9IG5ldyBzcGluZS5Ta2VsZXRvbkRhdGEoKTtcbiAgICAgICAgc2tlbGV0b25EYXRhLm5hbWUgPSBuYW1lO1xuXG4gICAgICAgIC8vIFNrZWxldG9uLlxuICAgICAgICB2YXIgc2tlbGV0b25NYXAgPSByb290W1wic2tlbGV0b25cIl07XG4gICAgICAgIGlmIChza2VsZXRvbk1hcClcbiAgICAgICAge1xuICAgICAgICAgICAgc2tlbGV0b25EYXRhLmhhc2ggPSBza2VsZXRvbk1hcFtcImhhc2hcIl07XG4gICAgICAgICAgICBza2VsZXRvbkRhdGEudmVyc2lvbiA9IHNrZWxldG9uTWFwW1wic3BpbmVcIl07XG4gICAgICAgICAgICBza2VsZXRvbkRhdGEud2lkdGggPSBza2VsZXRvbk1hcFtcIndpZHRoXCJdIHx8IDA7XG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuaGVpZ2h0ID0gc2tlbGV0b25NYXBbXCJoZWlnaHRcIl0gfHwgMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJvbmVzLlxuICAgICAgICB2YXIgYm9uZXMgPSByb290W1wiYm9uZXNcIl07XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgYm9uZU1hcCA9IGJvbmVzW2ldO1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoYm9uZU1hcFtcInBhcmVudFwiXSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBza2VsZXRvbkRhdGEuZmluZEJvbmUoYm9uZU1hcFtcInBhcmVudFwiXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJlbnQpIHRocm93IFwiUGFyZW50IGJvbmUgbm90IGZvdW5kOiBcIiArIGJvbmVNYXBbXCJwYXJlbnRcIl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYm9uZURhdGEgPSBuZXcgc3BpbmUuQm9uZURhdGEoYm9uZU1hcFtcIm5hbWVcIl0sIHBhcmVudCk7XG4gICAgICAgICAgICBib25lRGF0YS5sZW5ndGggPSAoYm9uZU1hcFtcImxlbmd0aFwiXSB8fCAwKSAqIHRoaXMuc2NhbGU7XG4gICAgICAgICAgICBib25lRGF0YS54ID0gKGJvbmVNYXBbXCJ4XCJdIHx8IDApICogdGhpcy5zY2FsZTtcbiAgICAgICAgICAgIGJvbmVEYXRhLnkgPSAoYm9uZU1hcFtcInlcIl0gfHwgMCkgKiB0aGlzLnNjYWxlO1xuICAgICAgICAgICAgYm9uZURhdGEucm90YXRpb24gPSAoYm9uZU1hcFtcInJvdGF0aW9uXCJdIHx8IDApO1xuICAgICAgICAgICAgYm9uZURhdGEuc2NhbGVYID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcInNjYWxlWFwiKSA/IGJvbmVNYXBbXCJzY2FsZVhcIl0gOiAxO1xuICAgICAgICAgICAgYm9uZURhdGEuc2NhbGVZID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcInNjYWxlWVwiKSA/IGJvbmVNYXBbXCJzY2FsZVlcIl0gOiAxO1xuICAgICAgICAgICAgYm9uZURhdGEuaW5oZXJpdFNjYWxlID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcImluaGVyaXRTY2FsZVwiKSA/IGJvbmVNYXBbXCJpbmhlcml0U2NhbGVcIl0gOiB0cnVlO1xuICAgICAgICAgICAgYm9uZURhdGEuaW5oZXJpdFJvdGF0aW9uID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcImluaGVyaXRSb3RhdGlvblwiKSA/IGJvbmVNYXBbXCJpbmhlcml0Um90YXRpb25cIl0gOiB0cnVlO1xuICAgICAgICAgICAgc2tlbGV0b25EYXRhLmJvbmVzLnB1c2goYm9uZURhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSUsgY29uc3RyYWludHMuXG4gICAgICAgIHZhciBpayA9IHJvb3RbXCJpa1wiXTtcbiAgICAgICAgaWYgKGlrKVxuICAgICAgICB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGlrLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgaWtNYXAgPSBpa1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgaWtDb25zdHJhaW50RGF0YSA9IG5ldyBzcGluZS5Ja0NvbnN0cmFpbnREYXRhKGlrTWFwW1wibmFtZVwiXSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYm9uZXMgPSBpa01hcFtcImJvbmVzXCJdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSBib25lcy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYm9uZSA9IHNrZWxldG9uRGF0YS5maW5kQm9uZShib25lc1tpaV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWJvbmUpIHRocm93IFwiSUsgYm9uZSBub3QgZm91bmQ6IFwiICsgYm9uZXNbaWldO1xuICAgICAgICAgICAgICAgICAgICBpa0NvbnN0cmFpbnREYXRhLmJvbmVzLnB1c2goYm9uZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWtDb25zdHJhaW50RGF0YS50YXJnZXQgPSBza2VsZXRvbkRhdGEuZmluZEJvbmUoaWtNYXBbXCJ0YXJnZXRcIl0pO1xuICAgICAgICAgICAgICAgIGlmICghaWtDb25zdHJhaW50RGF0YS50YXJnZXQpIHRocm93IFwiVGFyZ2V0IGJvbmUgbm90IGZvdW5kOiBcIiArIGlrTWFwW1widGFyZ2V0XCJdO1xuXG4gICAgICAgICAgICAgICAgaWtDb25zdHJhaW50RGF0YS5iZW5kRGlyZWN0aW9uID0gKCFpa01hcC5oYXNPd25Qcm9wZXJ0eShcImJlbmRQb3NpdGl2ZVwiKSB8fCBpa01hcFtcImJlbmRQb3NpdGl2ZVwiXSkgPyAxIDogLTE7XG4gICAgICAgICAgICAgICAgaWtDb25zdHJhaW50RGF0YS5taXggPSBpa01hcC5oYXNPd25Qcm9wZXJ0eShcIm1peFwiKSA/IGlrTWFwW1wibWl4XCJdIDogMTtcblxuICAgICAgICAgICAgICAgIHNrZWxldG9uRGF0YS5pa0NvbnN0cmFpbnRzLnB1c2goaWtDb25zdHJhaW50RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTbG90cy5cbiAgICAgICAgdmFyIHNsb3RzID0gcm9vdFtcInNsb3RzXCJdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHNsb3RNYXAgPSBzbG90c1tpXTtcbiAgICAgICAgICAgIHZhciBib25lRGF0YSA9IHNrZWxldG9uRGF0YS5maW5kQm9uZShzbG90TWFwW1wiYm9uZVwiXSk7XG4gICAgICAgICAgICBpZiAoIWJvbmVEYXRhKSB0aHJvdyBcIlNsb3QgYm9uZSBub3QgZm91bmQ6IFwiICsgc2xvdE1hcFtcImJvbmVcIl07XG4gICAgICAgICAgICB2YXIgc2xvdERhdGEgPSBuZXcgc3BpbmUuU2xvdERhdGEoc2xvdE1hcFtcIm5hbWVcIl0sIGJvbmVEYXRhKTtcblxuICAgICAgICAgICAgdmFyIGNvbG9yID0gc2xvdE1hcFtcImNvbG9yXCJdO1xuICAgICAgICAgICAgaWYgKGNvbG9yKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHNsb3REYXRhLnIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDApO1xuICAgICAgICAgICAgICAgIHNsb3REYXRhLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xuICAgICAgICAgICAgICAgIHNsb3REYXRhLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xuICAgICAgICAgICAgICAgIHNsb3REYXRhLmEgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzbG90RGF0YS5hdHRhY2htZW50TmFtZSA9IHNsb3RNYXBbXCJhdHRhY2htZW50XCJdO1xuICAgICAgICAgICAgc2xvdERhdGEuYWRkaXRpdmVCbGVuZGluZyA9IHNsb3RNYXBbXCJhZGRpdGl2ZVwiXSAmJiBzbG90TWFwW1wiYWRkaXRpdmVcIl0gPT0gXCJ0cnVlXCI7XG5cbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5zbG90cy5wdXNoKHNsb3REYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraW5zLlxuICAgICAgICB2YXIgc2tpbnMgPSByb290W1wic2tpbnNcIl07XG4gICAgICAgIGZvciAodmFyIHNraW5OYW1lIGluIHNraW5zKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIXNraW5zLmhhc093blByb3BlcnR5KHNraW5OYW1lKSkgY29udGludWU7XG4gICAgICAgICAgICB2YXIgc2tpbk1hcCA9IHNraW5zW3NraW5OYW1lXTtcbiAgICAgICAgICAgIHZhciBza2luID0gbmV3IHNwaW5lLlNraW4oc2tpbk5hbWUpO1xuICAgICAgICAgICAgZm9yICh2YXIgc2xvdE5hbWUgaW4gc2tpbk1hcClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNraW5NYXAuaGFzT3duUHJvcGVydHkoc2xvdE5hbWUpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB2YXIgc2xvdEluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRTbG90SW5kZXgoc2xvdE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciBzbG90RW50cnkgPSBza2luTWFwW3Nsb3ROYW1lXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRhY2htZW50TmFtZSBpbiBzbG90RW50cnkpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNsb3RFbnRyeS5oYXNPd25Qcm9wZXJ0eShhdHRhY2htZW50TmFtZSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMucmVhZEF0dGFjaG1lbnQoc2tpbiwgYXR0YWNobWVudE5hbWUsIHNsb3RFbnRyeVthdHRhY2htZW50TmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0YWNobWVudCkgc2tpbi5hZGRBdHRhY2htZW50KHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUsIGF0dGFjaG1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5za2lucy5wdXNoKHNraW4pO1xuICAgICAgICAgICAgaWYgKHNraW4ubmFtZSA9PSBcImRlZmF1bHRcIikgc2tlbGV0b25EYXRhLmRlZmF1bHRTa2luID0gc2tpbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV2ZW50cy5cbiAgICAgICAgdmFyIGV2ZW50cyA9IHJvb3RbXCJldmVudHNcIl07XG4gICAgICAgIGZvciAodmFyIGV2ZW50TmFtZSBpbiBldmVudHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghZXZlbnRzLmhhc093blByb3BlcnR5KGV2ZW50TmFtZSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIGV2ZW50TWFwID0gZXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICAgICAgICB2YXIgZXZlbnREYXRhID0gbmV3IHNwaW5lLkV2ZW50RGF0YShldmVudE5hbWUpO1xuICAgICAgICAgICAgZXZlbnREYXRhLmludFZhbHVlID0gZXZlbnRNYXBbXCJpbnRcIl0gfHwgMDtcbiAgICAgICAgICAgIGV2ZW50RGF0YS5mbG9hdFZhbHVlID0gZXZlbnRNYXBbXCJmbG9hdFwiXSB8fCAwO1xuICAgICAgICAgICAgZXZlbnREYXRhLnN0cmluZ1ZhbHVlID0gZXZlbnRNYXBbXCJzdHJpbmdcIl0gfHwgbnVsbDtcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5ldmVudHMucHVzaChldmVudERhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQW5pbWF0aW9ucy5cbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSByb290W1wiYW5pbWF0aW9uc1wiXTtcbiAgICAgICAgZm9yICh2YXIgYW5pbWF0aW9uTmFtZSBpbiBhbmltYXRpb25zKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWFuaW1hdGlvbnMuaGFzT3duUHJvcGVydHkoYW5pbWF0aW9uTmFtZSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGhpcy5yZWFkQW5pbWF0aW9uKGFuaW1hdGlvbk5hbWUsIGFuaW1hdGlvbnNbYW5pbWF0aW9uTmFtZV0sIHNrZWxldG9uRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2tlbGV0b25EYXRhO1xuICAgIH0sXG4gICAgcmVhZEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChza2luLCBuYW1lLCBtYXApXG4gICAge1xuICAgICAgICBuYW1lID0gbWFwW1wibmFtZVwiXSB8fCBuYW1lO1xuXG4gICAgICAgIHZhciB0eXBlID0gc3BpbmUuQXR0YWNobWVudFR5cGVbbWFwW1widHlwZVwiXSB8fCBcInJlZ2lvblwiXTtcbiAgICAgICAgdmFyIHBhdGggPSBtYXBbXCJwYXRoXCJdIHx8IG5hbWU7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgaWYgKHR5cGUgPT0gc3BpbmUuQXR0YWNobWVudFR5cGUucmVnaW9uKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdHRhY2htZW50TG9hZGVyLm5ld1JlZ2lvbkF0dGFjaG1lbnQoc2tpbiwgbmFtZSwgcGF0aCk7XG4gICAgICAgICAgICBpZiAoIXJlZ2lvbikgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZWdpb24ucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICByZWdpb24ueCA9IChtYXBbXCJ4XCJdIHx8IDApICogc2NhbGU7XG4gICAgICAgICAgICByZWdpb24ueSA9IChtYXBbXCJ5XCJdIHx8IDApICogc2NhbGU7XG4gICAgICAgICAgICByZWdpb24uc2NhbGVYID0gbWFwLmhhc093blByb3BlcnR5KFwic2NhbGVYXCIpID8gbWFwW1wic2NhbGVYXCJdIDogMTtcbiAgICAgICAgICAgIHJlZ2lvbi5zY2FsZVkgPSBtYXAuaGFzT3duUHJvcGVydHkoXCJzY2FsZVlcIikgPyBtYXBbXCJzY2FsZVlcIl0gOiAxO1xuICAgICAgICAgICAgcmVnaW9uLnJvdGF0aW9uID0gbWFwW1wicm90YXRpb25cIl0gfHwgMDtcbiAgICAgICAgICAgIHJlZ2lvbi53aWR0aCA9IChtYXBbXCJ3aWR0aFwiXSB8fCAwKSAqIHNjYWxlO1xuICAgICAgICAgICAgcmVnaW9uLmhlaWdodCA9IChtYXBbXCJoZWlnaHRcIl0gfHwgMCkgKiBzY2FsZTtcblxuICAgICAgICAgICAgdmFyIGNvbG9yID0gbWFwW1wiY29sb3JcIl07XG4gICAgICAgICAgICBpZiAoY29sb3IpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVnaW9uLnIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDApO1xuICAgICAgICAgICAgICAgIHJlZ2lvbi5nID0gdGhpcy50b0NvbG9yKGNvbG9yLCAxKTtcbiAgICAgICAgICAgICAgICByZWdpb24uYiA9IHRoaXMudG9Db2xvcihjb2xvciwgMik7XG4gICAgICAgICAgICAgICAgcmVnaW9uLmEgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWdpb24udXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVnaW9uO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gc3BpbmUuQXR0YWNobWVudFR5cGUubWVzaClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmF0dGFjaG1lbnRMb2FkZXIubmV3TWVzaEF0dGFjaG1lbnQoc2tpbiwgbmFtZSwgcGF0aCk7XG4gICAgICAgICAgICBpZiAoIW1lc2gpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbWVzaC5wYXRoID0gcGF0aDtcbiAgICAgICAgICAgIG1lc2gudmVydGljZXMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInZlcnRpY2VzXCIsIHNjYWxlKTtcbiAgICAgICAgICAgIG1lc2gudHJpYW5nbGVzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwidHJpYW5nbGVzXCIpO1xuICAgICAgICAgICAgbWVzaC5yZWdpb25VVnMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInV2c1wiLCAxKTtcbiAgICAgICAgICAgIG1lc2gudXBkYXRlVVZzKCk7XG5cbiAgICAgICAgICAgIGNvbG9yID0gbWFwW1wiY29sb3JcIl07XG4gICAgICAgICAgICBpZiAoY29sb3IpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbWVzaC5yID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcbiAgICAgICAgICAgICAgICBtZXNoLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xuICAgICAgICAgICAgICAgIG1lc2guYiA9IHRoaXMudG9Db2xvcihjb2xvciwgMik7XG4gICAgICAgICAgICAgICAgbWVzaC5hID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWVzaC5odWxsTGVuZ3RoID0gKG1hcFtcImh1bGxcIl0gfHwgMCkgKiAyO1xuICAgICAgICAgICAgaWYgKG1hcFtcImVkZ2VzXCJdKSBtZXNoLmVkZ2VzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwiZWRnZXNcIik7XG4gICAgICAgICAgICBtZXNoLndpZHRoID0gKG1hcFtcIndpZHRoXCJdIHx8IDApICogc2NhbGU7XG4gICAgICAgICAgICBtZXNoLmhlaWdodCA9IChtYXBbXCJoZWlnaHRcIl0gfHwgMCkgKiBzY2FsZTtcbiAgICAgICAgICAgIHJldHVybiBtZXNoO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gc3BpbmUuQXR0YWNobWVudFR5cGUuc2tpbm5lZG1lc2gpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBtZXNoID0gdGhpcy5hdHRhY2htZW50TG9hZGVyLm5ld1NraW5uZWRNZXNoQXR0YWNobWVudChza2luLCBuYW1lLCBwYXRoKTtcbiAgICAgICAgICAgIGlmICghbWVzaCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBtZXNoLnBhdGggPSBwYXRoO1xuXG4gICAgICAgICAgICB2YXIgdXZzID0gdGhpcy5nZXRGbG9hdEFycmF5KG1hcCwgXCJ1dnNcIiwgMSk7XG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInZlcnRpY2VzXCIsIDEpO1xuICAgICAgICAgICAgdmFyIHdlaWdodHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBib25lcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGkgPCBuOyApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGJvbmVDb3VudCA9IHZlcnRpY2VzW2krK10gfCAwO1xuICAgICAgICAgICAgICAgIGJvbmVzW2JvbmVzLmxlbmd0aF0gPSBib25lQ291bnQ7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbm4gPSBpICsgYm9uZUNvdW50ICogNDsgaSA8IG5uOyApXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBib25lc1tib25lcy5sZW5ndGhdID0gdmVydGljZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIHdlaWdodHNbd2VpZ2h0cy5sZW5ndGhdID0gdmVydGljZXNbaSArIDFdICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHdlaWdodHNbd2VpZ2h0cy5sZW5ndGhdID0gdmVydGljZXNbaSArIDJdICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHdlaWdodHNbd2VpZ2h0cy5sZW5ndGhdID0gdmVydGljZXNbaSArIDNdO1xuICAgICAgICAgICAgICAgICAgICBpICs9IDQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVzaC5ib25lcyA9IGJvbmVzO1xuICAgICAgICAgICAgbWVzaC53ZWlnaHRzID0gd2VpZ2h0cztcbiAgICAgICAgICAgIG1lc2gudHJpYW5nbGVzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwidHJpYW5nbGVzXCIpO1xuICAgICAgICAgICAgbWVzaC5yZWdpb25VVnMgPSB1dnM7XG4gICAgICAgICAgICBtZXNoLnVwZGF0ZVVWcygpO1xuXG4gICAgICAgICAgICBjb2xvciA9IG1hcFtcImNvbG9yXCJdO1xuICAgICAgICAgICAgaWYgKGNvbG9yKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG1lc2guciA9IHRoaXMudG9Db2xvcihjb2xvciwgMCk7XG4gICAgICAgICAgICAgICAgbWVzaC5nID0gdGhpcy50b0NvbG9yKGNvbG9yLCAxKTtcbiAgICAgICAgICAgICAgICBtZXNoLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xuICAgICAgICAgICAgICAgIG1lc2guYSA9IHRoaXMudG9Db2xvcihjb2xvciwgMyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1lc2guaHVsbExlbmd0aCA9IChtYXBbXCJodWxsXCJdIHx8IDApICogMjtcbiAgICAgICAgICAgIGlmIChtYXBbXCJlZGdlc1wiXSkgbWVzaC5lZGdlcyA9IHRoaXMuZ2V0SW50QXJyYXkobWFwLCBcImVkZ2VzXCIpO1xuICAgICAgICAgICAgbWVzaC53aWR0aCA9IChtYXBbXCJ3aWR0aFwiXSB8fCAwKSAqIHNjYWxlO1xuICAgICAgICAgICAgbWVzaC5oZWlnaHQgPSAobWFwW1wiaGVpZ2h0XCJdIHx8IDApICogc2NhbGU7XG4gICAgICAgICAgICByZXR1cm4gbWVzaDtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLmJvdW5kaW5nYm94KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuYXR0YWNobWVudExvYWRlci5uZXdCb3VuZGluZ0JveEF0dGFjaG1lbnQoc2tpbiwgbmFtZSk7XG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSBtYXBbXCJ2ZXJ0aWNlc1wiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmVydGljZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgICAgIGF0dGFjaG1lbnQudmVydGljZXMucHVzaCh2ZXJ0aWNlc1tpXSAqIHNjYWxlKTtcbiAgICAgICAgICAgIHJldHVybiBhdHRhY2htZW50O1xuICAgICAgICB9XG4gICAgICAgIHRocm93IFwiVW5rbm93biBhdHRhY2htZW50IHR5cGU6IFwiICsgdHlwZTtcbiAgICB9LFxuICAgIHJlYWRBbmltYXRpb246IGZ1bmN0aW9uIChuYW1lLCBtYXAsIHNrZWxldG9uRGF0YSlcbiAgICB7XG4gICAgICAgIHZhciB0aW1lbGluZXMgPSBbXTtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gMDtcblxuICAgICAgICB2YXIgc2xvdHMgPSBtYXBbXCJzbG90c1wiXTtcbiAgICAgICAgZm9yICh2YXIgc2xvdE5hbWUgaW4gc2xvdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghc2xvdHMuaGFzT3duUHJvcGVydHkoc2xvdE5hbWUpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBzbG90TWFwID0gc2xvdHNbc2xvdE5hbWVdO1xuICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHNrZWxldG9uRGF0YS5maW5kU2xvdEluZGV4KHNsb3ROYW1lKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgdGltZWxpbmVOYW1lIGluIHNsb3RNYXApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCFzbG90TWFwLmhhc093blByb3BlcnR5KHRpbWVsaW5lTmFtZSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBzbG90TWFwW3RpbWVsaW5lTmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVsaW5lTmFtZSA9PSBcImNvbG9yXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuQ29sb3JUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2xvdEluZGV4ID0gc2xvdEluZGV4O1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSB2YWx1ZU1hcFtcImNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCByLCBnLCBiLCBhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpICogNSAtIDVdKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZWxpbmVOYW1lID09IFwiYXR0YWNobWVudFwiKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2xvdEluZGV4ID0gc2xvdEluZGV4O1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4KyssIHZhbHVlTWFwW1widGltZVwiXSwgdmFsdWVNYXBbXCJuYW1lXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5nZXRGcmFtZUNvdW50KCkgLSAxXSk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJJbnZhbGlkIHRpbWVsaW5lIHR5cGUgZm9yIGEgc2xvdDogXCIgKyB0aW1lbGluZU5hbWUgKyBcIiAoXCIgKyBzbG90TmFtZSArIFwiKVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJvbmVzID0gbWFwW1wiYm9uZXNcIl07XG4gICAgICAgIGZvciAodmFyIGJvbmVOYW1lIGluIGJvbmVzKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWJvbmVzLmhhc093blByb3BlcnR5KGJvbmVOYW1lKSkgY29udGludWU7XG4gICAgICAgICAgICB2YXIgYm9uZUluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRCb25lSW5kZXgoYm9uZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGJvbmVJbmRleCA9PSAtMSkgdGhyb3cgXCJCb25lIG5vdCBmb3VuZDogXCIgKyBib25lTmFtZTtcbiAgICAgICAgICAgIHZhciBib25lTWFwID0gYm9uZXNbYm9uZU5hbWVdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciB0aW1lbGluZU5hbWUgaW4gYm9uZU1hcClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoIWJvbmVNYXAuaGFzT3duUHJvcGVydHkodGltZWxpbmVOYW1lKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGJvbmVNYXBbdGltZWxpbmVOYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAodGltZWxpbmVOYW1lID09IFwicm90YXRlXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuUm90YXRlVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLmJvbmVJbmRleCA9IGJvbmVJbmRleDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCB2YWx1ZU1hcFtcImFuZ2xlXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpICogMiAtIDJdKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZWxpbmVOYW1lID09IFwidHJhbnNsYXRlXCIgfHwgdGltZWxpbmVOYW1lID09IFwic2NhbGVcIilcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lbGluZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lU2NhbGUgPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZWxpbmVOYW1lID09IFwic2NhbGVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lID0gbmV3IHNwaW5lLlNjYWxlVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUgPSBuZXcgc3BpbmUuVHJhbnNsYXRlVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZVNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5ib25lSW5kZXggPSBib25lSW5kZXg7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4ID0gKHZhbHVlTWFwW1wieFwiXSB8fCAwKSAqIHRpbWVsaW5lU2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9ICh2YWx1ZU1hcFtcInlcIl0gfHwgMCkgKiB0aW1lbGluZVNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCB4LCB5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpICogMyAtIDNdKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZWxpbmVOYW1lID09IFwiZmxpcFhcIiB8fCB0aW1lbGluZU5hbWUgPT0gXCJmbGlwWVwiKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHggPSB0aW1lbGluZU5hbWUgPT0gXCJmbGlwWFwiO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSB4ID8gbmV3IHNwaW5lLkZsaXBYVGltZWxpbmUodmFsdWVzLmxlbmd0aCkgOiBuZXcgc3BpbmUuRmxpcFlUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuYm9uZUluZGV4ID0gYm9uZUluZGV4O1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IHggPyBcInhcIiA6IFwieVwiO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCB2YWx1ZU1hcFtmaWVsZF0gfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAqIDIgLSAyXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCB0aW1lbGluZSB0eXBlIGZvciBhIGJvbmU6IFwiICsgdGltZWxpbmVOYW1lICsgXCIgKFwiICsgYm9uZU5hbWUgKyBcIilcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpa01hcCA9IG1hcFtcImlrXCJdO1xuICAgICAgICBmb3IgKHZhciBpa0NvbnN0cmFpbnROYW1lIGluIGlrTWFwKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWlrTWFwLmhhc093blByb3BlcnR5KGlrQ29uc3RyYWludE5hbWUpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBza2VsZXRvbkRhdGEuZmluZElrQ29uc3RyYWludChpa0NvbnN0cmFpbnROYW1lKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBpa01hcFtpa0NvbnN0cmFpbnROYW1lXTtcbiAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIHRpbWVsaW5lLmlrQ29uc3RyYWludEluZGV4ID0gc2tlbGV0b25EYXRhLmlrQ29uc3RyYWludHMuaW5kZXhPZihpa0NvbnN0cmFpbnQpO1xuICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgbWl4ID0gdmFsdWVNYXAuaGFzT3duUHJvcGVydHkoXCJtaXhcIikgPyB2YWx1ZU1hcFtcIm1peFwiXSA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIGJlbmREaXJlY3Rpb24gPSAoIXZhbHVlTWFwLmhhc093blByb3BlcnR5KFwiYmVuZFBvc2l0aXZlXCIpIHx8IHZhbHVlTWFwW1wiYmVuZFBvc2l0aXZlXCJdKSA/IDEgOiAtMTtcbiAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4LCB2YWx1ZU1hcFtcInRpbWVcIl0sIG1peCwgYmVuZERpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWFkQ3VydmUodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKTtcbiAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZnJhbWVDb3VudCAqIDMgLSAzXSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmZkID0gbWFwW1wiZmZkXCJdO1xuICAgICAgICBmb3IgKHZhciBza2luTmFtZSBpbiBmZmQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBza2luID0gc2tlbGV0b25EYXRhLmZpbmRTa2luKHNraW5OYW1lKTtcbiAgICAgICAgICAgIHZhciBzbG90TWFwID0gZmZkW3NraW5OYW1lXTtcbiAgICAgICAgICAgIGZvciAoc2xvdE5hbWUgaW4gc2xvdE1hcClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgc2xvdEluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRTbG90SW5kZXgoc2xvdE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNoTWFwID0gc2xvdE1hcFtzbG90TmFtZV07XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbWVzaE5hbWUgaW4gbWVzaE1hcClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBtZXNoTWFwW21lc2hOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkZmZFRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHNraW4uZ2V0QXR0YWNobWVudChzbG90SW5kZXgsIG1lc2hOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRhY2htZW50KSB0aHJvdyBcIkZGRCBhdHRhY2htZW50IG5vdCBmb3VuZDogXCIgKyBtZXNoTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2xvdEluZGV4ID0gc2xvdEluZGV4O1xuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5hdHRhY2htZW50ID0gYXR0YWNobWVudDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNNZXNoID0gYXR0YWNobWVudC50eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLm1lc2g7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0ZXhDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTWVzaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleENvdW50ID0gYXR0YWNobWVudC52ZXJ0aWNlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleENvdW50ID0gYXR0YWNobWVudC53ZWlnaHRzLmxlbmd0aCAvIDMgKiAyO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmVydGljZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlTWFwW1widmVydGljZXNcIl0pXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTWVzaClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXMgPSBhdHRhY2htZW50LnZlcnRpY2VzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzLmxlbmd0aCA9IHZlcnRleENvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnRpY2VzVmFsdWUgPSB2YWx1ZU1hcFtcInZlcnRpY2VzXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0aWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzLmxlbmd0aCA9IHZlcnRleENvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdGFydCA9IHZhbHVlTWFwW1wib2Zmc2V0XCJdIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5uID0gdmVydGljZXNWYWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NhbGUgPT0gMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBubjsgaWkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2lpICsgc3RhcnRdID0gdmVydGljZXNWYWx1ZVtpaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5uOyBpaSsrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaWkgKyBzdGFydF0gPSB2ZXJ0aWNlc1ZhbHVlW2lpXSAqIHRoaXMuc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc01lc2gpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzaFZlcnRpY2VzID0gYXR0YWNobWVudC52ZXJ0aWNlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IHZlcnRpY2VzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzW2lpXSArPSBtZXNoVmVydGljZXNbaWldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCB2ZXJ0aWNlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWRDdXJ2ZSh0aW1lbGluZSwgZnJhbWVJbmRleCwgdmFsdWVNYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lc1t0aW1lbGluZXMubGVuZ3RoXSA9IHRpbWVsaW5lO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZnJhbWVDb3VudCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZHJhd09yZGVyVmFsdWVzID0gbWFwW1wiZHJhd09yZGVyXCJdO1xuICAgICAgICBpZiAoIWRyYXdPcmRlclZhbHVlcykgZHJhd09yZGVyVmFsdWVzID0gbWFwW1wiZHJhd29yZGVyXCJdO1xuICAgICAgICBpZiAoZHJhd09yZGVyVmFsdWVzKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuRHJhd09yZGVyVGltZWxpbmUoZHJhd09yZGVyVmFsdWVzLmxlbmd0aCk7XG4gICAgICAgICAgICB2YXIgc2xvdENvdW50ID0gc2tlbGV0b25EYXRhLnNsb3RzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZHJhd09yZGVyVmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgZHJhd09yZGVyTWFwID0gZHJhd09yZGVyVmFsdWVzW2ldO1xuICAgICAgICAgICAgICAgIHZhciBkcmF3T3JkZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChkcmF3T3JkZXJNYXBbXCJvZmZzZXRzXCJdKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZHJhd09yZGVyID0gW107XG4gICAgICAgICAgICAgICAgICAgIGRyYXdPcmRlci5sZW5ndGggPSBzbG90Q291bnQ7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gc2xvdENvdW50IC0gMTsgaWkgPj0gMDsgaWktLSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdPcmRlcltpaV0gPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldHMgPSBkcmF3T3JkZXJNYXBbXCJvZmZzZXRzXCJdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdW5jaGFuZ2VkID0gW107XG4gICAgICAgICAgICAgICAgICAgIHVuY2hhbmdlZC5sZW5ndGggPSBzbG90Q291bnQgLSBvZmZzZXRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsSW5kZXggPSAwLCB1bmNoYW5nZWRJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSBvZmZzZXRzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldE1hcCA9IG9mZnNldHNbaWldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHNrZWxldG9uRGF0YS5maW5kU2xvdEluZGV4KG9mZnNldE1hcFtcInNsb3RcIl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNsb3RJbmRleCA9PSAtMSkgdGhyb3cgXCJTbG90IG5vdCBmb3VuZDogXCIgKyBvZmZzZXRNYXBbXCJzbG90XCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29sbGVjdCB1bmNoYW5nZWQgaXRlbXMuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAob3JpZ2luYWxJbmRleCAhPSBzbG90SW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jaGFuZ2VkW3VuY2hhbmdlZEluZGV4KytdID0gb3JpZ2luYWxJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGNoYW5nZWQgaXRlbXMuXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmF3T3JkZXJbb3JpZ2luYWxJbmRleCArIG9mZnNldE1hcFtcIm9mZnNldFwiXV0gPSBvcmlnaW5hbEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQ29sbGVjdCByZW1haW5pbmcgdW5jaGFuZ2VkIGl0ZW1zLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAob3JpZ2luYWxJbmRleCA8IHNsb3RDb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuY2hhbmdlZFt1bmNoYW5nZWRJbmRleCsrXSA9IG9yaWdpbmFsSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsbCBpbiB1bmNoYW5nZWQgaXRlbXMuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gc2xvdENvdW50IC0gMTsgaWkgPj0gMDsgaWktLSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmF3T3JkZXJbaWldID09IC0xKSBkcmF3T3JkZXJbaWldID0gdW5jaGFuZ2VkWy0tdW5jaGFuZ2VkSW5kZXhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4KyssIGRyYXdPcmRlck1hcFtcInRpbWVcIl0sIGRyYXdPcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpIC0gMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV2ZW50cyA9IG1hcFtcImV2ZW50c1wiXTtcbiAgICAgICAgaWYgKGV2ZW50cylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkV2ZW50VGltZWxpbmUoZXZlbnRzLmxlbmd0aCk7XG4gICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50TWFwID0gZXZlbnRzW2ldO1xuICAgICAgICAgICAgICAgIHZhciBldmVudERhdGEgPSBza2VsZXRvbkRhdGEuZmluZEV2ZW50KGV2ZW50TWFwW1wibmFtZVwiXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFldmVudERhdGEpIHRocm93IFwiRXZlbnQgbm90IGZvdW5kOiBcIiArIGV2ZW50TWFwW1wibmFtZVwiXTtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgc3BpbmUuRXZlbnQoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBldmVudC5pbnRWYWx1ZSA9IGV2ZW50TWFwLmhhc093blByb3BlcnR5KFwiaW50XCIpID8gZXZlbnRNYXBbXCJpbnRcIl0gOiBldmVudERhdGEuaW50VmFsdWU7XG4gICAgICAgICAgICAgICAgZXZlbnQuZmxvYXRWYWx1ZSA9IGV2ZW50TWFwLmhhc093blByb3BlcnR5KFwiZmxvYXRcIikgPyBldmVudE1hcFtcImZsb2F0XCJdIDogZXZlbnREYXRhLmZsb2F0VmFsdWU7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RyaW5nVmFsdWUgPSBldmVudE1hcC5oYXNPd25Qcm9wZXJ0eShcInN0cmluZ1wiKSA/IGV2ZW50TWFwW1wic3RyaW5nXCJdIDogZXZlbnREYXRhLnN0cmluZ1ZhbHVlO1xuICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgrKywgZXZlbnRNYXBbXCJ0aW1lXCJdLCBldmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpIC0gMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgc2tlbGV0b25EYXRhLmFuaW1hdGlvbnMucHVzaChuZXcgc3BpbmUuQW5pbWF0aW9uKG5hbWUsIHRpbWVsaW5lcywgZHVyYXRpb24pKTtcbiAgICB9LFxuICAgIHJlYWRDdXJ2ZTogZnVuY3Rpb24gKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcClcbiAgICB7XG4gICAgICAgIHZhciBjdXJ2ZSA9IHZhbHVlTWFwW1wiY3VydmVcIl07XG4gICAgICAgIGlmICghY3VydmUpXG4gICAgICAgICAgICB0aW1lbGluZS5jdXJ2ZXMuc2V0TGluZWFyKGZyYW1lSW5kZXgpO1xuICAgICAgICBlbHNlIGlmIChjdXJ2ZSA9PSBcInN0ZXBwZWRcIilcbiAgICAgICAgICAgIHRpbWVsaW5lLmN1cnZlcy5zZXRTdGVwcGVkKGZyYW1lSW5kZXgpO1xuICAgICAgICBlbHNlIGlmIChjdXJ2ZSBpbnN0YW5jZW9mIEFycmF5KVxuICAgICAgICAgICAgdGltZWxpbmUuY3VydmVzLnNldEN1cnZlKGZyYW1lSW5kZXgsIGN1cnZlWzBdLCBjdXJ2ZVsxXSwgY3VydmVbMl0sIGN1cnZlWzNdKTtcbiAgICB9LFxuICAgIHRvQ29sb3I6IGZ1bmN0aW9uIChoZXhTdHJpbmcsIGNvbG9ySW5kZXgpXG4gICAge1xuICAgICAgICBpZiAoaGV4U3RyaW5nLmxlbmd0aCAhPSA4KSB0aHJvdyBcIkNvbG9yIGhleGlkZWNpbWFsIGxlbmd0aCBtdXN0IGJlIDgsIHJlY2lldmVkOiBcIiArIGhleFN0cmluZztcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KGhleFN0cmluZy5zdWJzdHJpbmcoY29sb3JJbmRleCAqIDIsIChjb2xvckluZGV4ICogMikgKyAyKSwgMTYpIC8gMjU1O1xuICAgIH0sXG4gICAgZ2V0RmxvYXRBcnJheTogZnVuY3Rpb24gKG1hcCwgbmFtZSwgc2NhbGUpXG4gICAge1xuICAgICAgICB2YXIgbGlzdCA9IG1hcFtuYW1lXTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IG5ldyBzcGluZS5GbG9hdDMyQXJyYXkobGlzdC5sZW5ndGgpO1xuICAgICAgICB2YXIgaSA9IDAsIG4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgaWYgKHNjYWxlID09IDEpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgICAgIHZhbHVlc1tpXSA9IGxpc3RbaV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0gPSBsaXN0W2ldICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9LFxuICAgIGdldEludEFycmF5OiBmdW5jdGlvbiAobWFwLCBuYW1lKVxuICAgIHtcbiAgICAgICAgdmFyIGxpc3QgPSBtYXBbbmFtZV07XG4gICAgICAgIHZhciB2YWx1ZXMgPSBuZXcgc3BpbmUuVWludDE2QXJyYXkobGlzdC5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgdmFsdWVzW2ldID0gbGlzdFtpXSB8IDA7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLlNraW4gPSBmdW5jdGlvbiAobmFtZSlcbntcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuYXR0YWNobWVudHMgPSB7fTtcbn07XG5zcGluZS5Ta2luLnByb3RvdHlwZSA9IHtcbiAgICBhZGRBdHRhY2htZW50OiBmdW5jdGlvbiAoc2xvdEluZGV4LCBuYW1lLCBhdHRhY2htZW50KVxuICAgIHtcbiAgICAgICAgdGhpcy5hdHRhY2htZW50c1tzbG90SW5kZXggKyBcIjpcIiArIG5hbWVdID0gYXR0YWNobWVudDtcbiAgICB9LFxuICAgIGdldEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChzbG90SW5kZXgsIG5hbWUpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2htZW50c1tzbG90SW5kZXggKyBcIjpcIiArIG5hbWVdO1xuICAgIH0sXG4gICAgX2F0dGFjaEFsbDogZnVuY3Rpb24gKHNrZWxldG9uLCBvbGRTa2luKVxuICAgIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9sZFNraW4uYXR0YWNobWVudHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBjb2xvbiA9IGtleS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICAgIHZhciBzbG90SW5kZXggPSBwYXJzZUludChrZXkuc3Vic3RyaW5nKDAsIGNvbG9uKSk7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGtleS5zdWJzdHJpbmcoY29sb24gKyAxKTtcbiAgICAgICAgICAgIHZhciBzbG90ID0gc2tlbGV0b24uc2xvdHNbc2xvdEluZGV4XTtcbiAgICAgICAgICAgIGlmIChzbG90LmF0dGFjaG1lbnQgJiYgc2xvdC5hdHRhY2htZW50Lm5hbWUgPT0gbmFtZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuZ2V0QXR0YWNobWVudChzbG90SW5kZXgsIG5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChhdHRhY2htZW50KSBzbG90LnNldEF0dGFjaG1lbnQoYXR0YWNobWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2luO1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKSB8fCB7fTtcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xuc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50ID0gZnVuY3Rpb24gKG5hbWUpXG57XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbn07XG5zcGluZS5Ta2lubmVkTWVzaEF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnNraW5uZWRtZXNoLFxuICAgIGJvbmVzOiBudWxsLFxuICAgIHdlaWdodHM6IG51bGwsXG4gICAgdXZzOiBudWxsLFxuICAgIHJlZ2lvblVWczogbnVsbCxcbiAgICB0cmlhbmdsZXM6IG51bGwsXG4gICAgaHVsbExlbmd0aDogMCxcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxuICAgIHBhdGg6IG51bGwsXG4gICAgcmVuZGVyZXJPYmplY3Q6IG51bGwsXG4gICAgcmVnaW9uVTogMCwgcmVnaW9uVjogMCwgcmVnaW9uVTI6IDAsIHJlZ2lvblYyOiAwLCByZWdpb25Sb3RhdGU6IGZhbHNlLFxuICAgIHJlZ2lvbk9mZnNldFg6IDAsIHJlZ2lvbk9mZnNldFk6IDAsXG4gICAgcmVnaW9uV2lkdGg6IDAsIHJlZ2lvbkhlaWdodDogMCxcbiAgICByZWdpb25PcmlnaW5hbFdpZHRoOiAwLCByZWdpb25PcmlnaW5hbEhlaWdodDogMCxcbiAgICBlZGdlczogbnVsbCxcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxuICAgIHVwZGF0ZVVWczogZnVuY3Rpb24gKHUsIHYsIHUyLCB2Miwgcm90YXRlKVxuICAgIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5yZWdpb25VMiAtIHRoaXMucmVnaW9uVSwgaGVpZ2h0ID0gdGhpcy5yZWdpb25WMiAtIHRoaXMucmVnaW9uVjtcbiAgICAgICAgdmFyIG4gPSB0aGlzLnJlZ2lvblVWcy5sZW5ndGg7XG4gICAgICAgIGlmICghdGhpcy51dnMgfHwgdGhpcy51dnMubGVuZ3RoICE9IG4pXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMudXZzID0gbmV3IHNwaW5lLkZsb2F0MzJBcnJheShuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yZWdpb25Sb3RhdGUpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArPSAyKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRoaXMudXZzW2ldID0gdGhpcy5yZWdpb25VICsgdGhpcy5yZWdpb25VVnNbaSArIDFdICogd2lkdGg7XG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaSArIDFdID0gdGhpcy5yZWdpb25WICsgaGVpZ2h0IC0gdGhpcy5yZWdpb25VVnNbaV0gKiBoZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKz0gMilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpXSA9IHRoaXMucmVnaW9uVSArIHRoaXMucmVnaW9uVVZzW2ldICogd2lkdGg7XG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaSArIDFdID0gdGhpcy5yZWdpb25WICsgdGhpcy5yZWdpb25VVnNbaSArIDFdICogaGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBjb21wdXRlV29ybGRWZXJ0aWNlczogZnVuY3Rpb24gKHgsIHksIHNsb3QsIHdvcmxkVmVydGljZXMpXG4gICAge1xuICAgICAgICB2YXIgc2tlbGV0b25Cb25lcyA9IHNsb3QuYm9uZS5za2VsZXRvbi5ib25lcztcbiAgICAgICAgdmFyIHdlaWdodHMgPSB0aGlzLndlaWdodHM7XG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XG5cbiAgICAgICAgdmFyIHcgPSAwLCB2ID0gMCwgYiA9IDAsIGYgPSAwLCBuID0gYm9uZXMubGVuZ3RoLCBubjtcbiAgICAgICAgdmFyIHd4LCB3eSwgYm9uZSwgdngsIHZ5LCB3ZWlnaHQ7XG4gICAgICAgIGlmICghc2xvdC5hdHRhY2htZW50VmVydGljZXMubGVuZ3RoKVxuICAgICAgICB7XG4gICAgICAgICAgICBmb3IgKDsgdiA8IG47IHcgKz0gMilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB3eCA9IDA7XG4gICAgICAgICAgICAgICAgd3kgPSAwO1xuICAgICAgICAgICAgICAgIG5uID0gYm9uZXNbdisrXSArIHY7XG4gICAgICAgICAgICAgICAgZm9yICg7IHYgPCBubjsgdisrLCBiICs9IDMpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBib25lID0gc2tlbGV0b25Cb25lc1tib25lc1t2XV07XG4gICAgICAgICAgICAgICAgICAgIHZ4ID0gd2VpZ2h0c1tiXTtcbiAgICAgICAgICAgICAgICAgICAgdnkgPSB3ZWlnaHRzW2IgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0c1tiICsgMl07XG4gICAgICAgICAgICAgICAgICAgIHd4ICs9ICh2eCAqIGJvbmUubTAwICsgdnkgKiBib25lLm0wMSArIGJvbmUud29ybGRYKSAqIHdlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgd3kgKz0gKHZ4ICogYm9uZS5tMTAgKyB2eSAqIGJvbmUubTExICsgYm9uZS53b3JsZFkpICogd2VpZ2h0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3ddID0gd3ggKyB4O1xuICAgICAgICAgICAgICAgIHdvcmxkVmVydGljZXNbdyArIDFdID0gd3kgKyB5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZmZCA9IHNsb3QuYXR0YWNobWVudFZlcnRpY2VzO1xuICAgICAgICAgICAgZm9yICg7IHYgPCBuOyB3ICs9IDIpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd3ggPSAwO1xuICAgICAgICAgICAgICAgIHd5ID0gMDtcbiAgICAgICAgICAgICAgICBubiA9IGJvbmVzW3YrK10gKyB2O1xuICAgICAgICAgICAgICAgIGZvciAoOyB2IDwgbm47IHYrKywgYiArPSAzLCBmICs9IDIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBib25lID0gc2tlbGV0b25Cb25lc1tib25lc1t2XV07XG4gICAgICAgICAgICAgICAgICAgIHZ4ID0gd2VpZ2h0c1tiXSArIGZmZFtmXTtcbiAgICAgICAgICAgICAgICAgICAgdnkgPSB3ZWlnaHRzW2IgKyAxXSArIGZmZFtmICsgMV07XG4gICAgICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodHNbYiArIDJdO1xuICAgICAgICAgICAgICAgICAgICB3eCArPSAodnggKiBib25lLm0wMCArIHZ5ICogYm9uZS5tMDEgKyBib25lLndvcmxkWCkgKiB3ZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIHd5ICs9ICh2eCAqIGJvbmUubTEwICsgdnkgKiBib25lLm0xMSArIGJvbmUud29ybGRZKSAqIHdlaWdodDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1t3XSA9IHd4ICsgeDtcbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3cgKyAxXSA9IHd5ICsgeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudDtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5TbG90ID0gZnVuY3Rpb24gKHNsb3REYXRhLCBib25lKVxue1xuICAgIHRoaXMuZGF0YSA9IHNsb3REYXRhO1xuICAgIHRoaXMuYm9uZSA9IGJvbmU7XG4gICAgdGhpcy5zZXRUb1NldHVwUG9zZSgpO1xufTtcbnNwaW5lLlNsb3QucHJvdG90eXBlID0ge1xuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXG4gICAgX2F0dGFjaG1lbnRUaW1lOiAwLFxuICAgIGF0dGFjaG1lbnQ6IG51bGwsXG4gICAgYXR0YWNobWVudFZlcnRpY2VzOiBbXSxcbiAgICBzZXRBdHRhY2htZW50OiBmdW5jdGlvbiAoYXR0YWNobWVudClcbiAgICB7XG4gICAgICAgIHRoaXMuYXR0YWNobWVudCA9IGF0dGFjaG1lbnQ7XG4gICAgICAgIHRoaXMuX2F0dGFjaG1lbnRUaW1lID0gdGhpcy5ib25lLnNrZWxldG9uLnRpbWU7XG4gICAgICAgIHRoaXMuYXR0YWNobWVudFZlcnRpY2VzLmxlbmd0aCA9IDA7XG4gICAgfSxcbiAgICBzZXRBdHRhY2htZW50VGltZTogZnVuY3Rpb24gKHRpbWUpXG4gICAge1xuICAgICAgICB0aGlzLl9hdHRhY2htZW50VGltZSA9IHRoaXMuYm9uZS5za2VsZXRvbi50aW1lIC0gdGltZTtcbiAgICB9LFxuICAgIGdldEF0dGFjaG1lbnRUaW1lOiBmdW5jdGlvbiAoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9uZS5za2VsZXRvbi50aW1lIC0gdGhpcy5fYXR0YWNobWVudFRpbWU7XG4gICAgfSxcbiAgICBzZXRUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcbiAgICB7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICB0aGlzLnIgPSBkYXRhLnI7XG4gICAgICAgIHRoaXMuZyA9IGRhdGEuZztcbiAgICAgICAgdGhpcy5iID0gZGF0YS5iO1xuICAgICAgICB0aGlzLmEgPSBkYXRhLmE7XG5cbiAgICAgICAgdmFyIHNsb3REYXRhcyA9IHRoaXMuYm9uZS5za2VsZXRvbi5kYXRhLnNsb3RzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3REYXRhcy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChzbG90RGF0YXNbaV0gPT0gZGF0YSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dGFjaG1lbnQoIWRhdGEuYXR0YWNobWVudE5hbWUgPyBudWxsIDogdGhpcy5ib25lLnNrZWxldG9uLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleChpLCBkYXRhLmF0dGFjaG1lbnROYW1lKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5TbG90O1xuXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLlNsb3REYXRhID0gZnVuY3Rpb24gKG5hbWUsIGJvbmVEYXRhKVxue1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5ib25lRGF0YSA9IGJvbmVEYXRhO1xufTtcbnNwaW5lLlNsb3REYXRhLnByb3RvdHlwZSA9IHtcbiAgICByOiAxLCBnOiAxLCBiOiAxLCBhOiAxLFxuICAgIGF0dGFjaG1lbnROYW1lOiBudWxsLFxuICAgIGFkZGl0aXZlQmxlbmRpbmc6IGZhbHNlXG59O1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5TbG90RGF0YTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XG5zcGluZS5UcmFja0VudHJ5ID0gZnVuY3Rpb24gKClcbnt9O1xuc3BpbmUuVHJhY2tFbnRyeS5wcm90b3R5cGUgPSB7XG4gICAgbmV4dDogbnVsbCwgcHJldmlvdXM6IG51bGwsXG4gICAgYW5pbWF0aW9uOiBudWxsLFxuICAgIGxvb3A6IGZhbHNlLFxuICAgIGRlbGF5OiAwLCB0aW1lOiAwLCBsYXN0VGltZTogLTEsIGVuZFRpbWU6IDAsXG4gICAgdGltZVNjYWxlOiAxLFxuICAgIG1peFRpbWU6IDAsIG1peER1cmF0aW9uOiAwLCBtaXg6IDEsXG4gICAgb25TdGFydDogbnVsbCwgb25FbmQ6IG51bGwsIG9uQ29tcGxldGU6IG51bGwsIG9uRXZlbnQ6IG51bGxcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlRyYWNrRW50cnk7XG5cbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XG5zcGluZS5UcmFuc2xhdGVUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxue1xuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCB4LCB5LCAuLi5cbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50ICogMztcbn07XG5zcGluZS5UcmFuc2xhdGVUaW1lbGluZS5wcm90b3R5cGUgPSB7XG4gICAgYm9uZUluZGV4OiAwLFxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMztcbiAgICB9LFxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgeCwgeSlcbiAgICB7XG4gICAgICAgIGZyYW1lSW5kZXggKj0gMztcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSB4O1xuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMl0gPSB5O1xuICAgIH0sXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcbiAgICB7XG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXG5cbiAgICAgICAgdmFyIGJvbmUgPSBza2VsZXRvbi5ib25lc1t0aGlzLmJvbmVJbmRleF07XG5cbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAzXSlcbiAgICAgICAgeyAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXG4gICAgICAgICAgICBib25lLnggKz0gKGJvbmUuZGF0YS54ICsgZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSAtIGJvbmUueCkgKiBhbHBoYTtcbiAgICAgICAgICAgIGJvbmUueSArPSAoYm9uZS5kYXRhLnkgKyBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdIC0gYm9uZS55KSAqIGFscGhhO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAzKTtcbiAgICAgICAgdmFyIHByZXZGcmFtZVggPSBmcmFtZXNbZnJhbWVJbmRleCAtIDJdO1xuICAgICAgICB2YXIgcHJldkZyYW1lWSA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMV07XG4gICAgICAgIHZhciBmcmFtZVRpbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCArIC0zLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyAzIC0gMSwgcGVyY2VudCk7XG5cbiAgICAgICAgYm9uZS54ICs9IChib25lLmRhdGEueCArIHByZXZGcmFtZVggKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAxLypGUkFNRV9YKi9dIC0gcHJldkZyYW1lWCkgKiBwZXJjZW50IC0gYm9uZS54KSAqIGFscGhhO1xuICAgICAgICBib25lLnkgKz0gKGJvbmUuZGF0YS55ICsgcHJldkZyYW1lWSArIChmcmFtZXNbZnJhbWVJbmRleCArIDIvKkZSQU1FX1kqL10gLSBwcmV2RnJhbWVZKSAqIHBlcmNlbnQgLSBib25lLnkpICogYWxwaGE7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuVHJhbnNsYXRlVGltZWxpbmU7XG5cbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIFNwaW5lIFJ1bnRpbWVzIFNvZnR3YXJlIExpY2Vuc2VcbiAqIFZlcnNpb24gMi4xXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLCBFc290ZXJpYyBTb2Z0d2FyZVxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBZb3UgYXJlIGdyYW50ZWQgYSBwZXJwZXR1YWwsIG5vbi1leGNsdXNpdmUsIG5vbi1zdWJsaWNlbnNhYmxlIGFuZFxuICogbm9uLXRyYW5zZmVyYWJsZSBsaWNlbnNlIHRvIGluc3RhbGwsIGV4ZWN1dGUgYW5kIHBlcmZvcm0gdGhlIFNwaW5lIFJ1bnRpbWVzXG4gKiBTb2Z0d2FyZSAodGhlIFwiU29mdHdhcmVcIikgc29sZWx5IGZvciBpbnRlcm5hbCB1c2UuIFdpdGhvdXQgdGhlIHdyaXR0ZW5cbiAqIHBlcm1pc3Npb24gb2YgRXNvdGVyaWMgU29mdHdhcmUgKHR5cGljYWxseSBncmFudGVkIGJ5IGxpY2Vuc2luZyBTcGluZSksIHlvdVxuICogbWF5IG5vdCAoYSkgbW9kaWZ5LCB0cmFuc2xhdGUsIGFkYXB0IG9yIG90aGVyd2lzZSBjcmVhdGUgZGVyaXZhdGl2ZSB3b3JrcyxcbiAqIGltcHJvdmVtZW50cyBvZiB0aGUgU29mdHdhcmUgb3IgZGV2ZWxvcCBuZXcgYXBwbGljYXRpb25zIHVzaW5nIHRoZSBTb2Z0d2FyZVxuICogb3IgKGIpIHJlbW92ZSwgZGVsZXRlLCBhbHRlciBvciBvYnNjdXJlIGFueSB0cmFkZW1hcmtzIG9yIGFueSBjb3B5cmlnaHQsXG4gKiB0cmFkZW1hcmssIHBhdGVudCBvciBvdGhlciBpbnRlbGxlY3R1YWwgcHJvcGVydHkgb3IgcHJvcHJpZXRhcnkgcmlnaHRzXG4gKiBub3RpY2VzIG9uIG9yIGluIHRoZSBTb2Z0d2FyZSwgaW5jbHVkaW5nIGFueSBjb3B5IHRoZXJlb2YuIFJlZGlzdHJpYnV0aW9uc1xuICogaW4gYmluYXJ5IG9yIHNvdXJjZSBmb3JtIG11c3QgaW5jbHVkZSB0aGlzIGxpY2Vuc2UgYW5kIHRlcm1zLlxuICpcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgRVNPVEVSSUMgU09GVFdBUkUgXCJBUyBJU1wiIEFORCBBTlkgRVhQUkVTUyBPUlxuICogSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRlxuICogTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk9cbiAqIEVWRU5UIFNIQUxMIEVTT1RFUklDIFNPRlRBUkUgQkUgTElBQkxFIEZPUiBBTlkgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCxcbiAqIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTyxcbiAqIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7IExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTO1xuICogT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkQgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksXG4gKiBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUlxuICogT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRlxuICogQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG52YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XG5zcGluZS5BbmltYXRpb25TdGF0ZURhdGEgPSByZXF1aXJlKCcuL0FuaW1hdGlvblN0YXRlRGF0YScpO1xuc3BpbmUuQW5pbWF0aW9uU3RhdGUgPSByZXF1aXJlKCcuL0FuaW1hdGlvblN0YXRlJyk7XG5zcGluZS5BdGxhc0F0dGFjaG1lbnRQYXJzZXIgPSByZXF1aXJlKCcuL0F0bGFzQXR0YWNobWVudFBhcnNlcicpO1xuc3BpbmUuQXRsYXMgPSByZXF1aXJlKCcuL0F0bGFzJyk7XG5zcGluZS5BdGxhc1BhZ2UgPSByZXF1aXJlKCcuL0F0bGFzUGFnZScpO1xuc3BpbmUuQXRsYXNSZWFkZXIgPSByZXF1aXJlKCcuL0F0bGFzUmVhZGVyJyk7XG5zcGluZS5BdGxhc1JlZ2lvbiA9IHJlcXVpcmUoJy4vQXRsYXNSZWdpb24nKTtcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFRpbWVsaW5lJyk7XG5zcGluZS5BdHRhY2htZW50VHlwZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFR5cGUnKTtcbnNwaW5lLkJvbmVEYXRhID0gcmVxdWlyZSgnLi9Cb25lRGF0YScpO1xuc3BpbmUuQm9uZSA9IHJlcXVpcmUoJy4vQm9uZScpO1xuc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9Cb3VuZGluZ0JveEF0dGFjaG1lbnQnKTtcbnNwaW5lLkNvbG9yVGltZWxpbmUgPSByZXF1aXJlKCcuL0NvbG9yVGltZWxpbmUnKTtcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XG5zcGluZS5EcmF3T3JkZXJUaW1lbGluZSA9IHJlcXVpcmUoJy4vRHJhd09yZGVyVGltZWxpbmUnKTtcbnNwaW5lLkV2ZW50RGF0YSA9IHJlcXVpcmUoJy4vRXZlbnREYXRhJyk7XG5zcGluZS5FdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcbnNwaW5lLkV2ZW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0V2ZW50VGltZWxpbmUnKTtcbnNwaW5lLkZmZFRpbWVsaW5lID0gcmVxdWlyZSgnLi9GZmRUaW1lbGluZScpO1xuc3BpbmUuRmxpcFhUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFhUaW1lbGluZScpO1xuc3BpbmUuRmxpcFlUaW1lbGluZSA9IHJlcXVpcmUoJy4vRmxpcFlUaW1lbGluZScpO1xuc3BpbmUuSWtDb25zdHJhaW50RGF0YSA9IHJlcXVpcmUoJy4vSWtDb25zdHJhaW50RGF0YScpO1xuc3BpbmUuSWtDb25zdHJhaW50ID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnQnKTtcbnNwaW5lLklrQ29uc3RyYWludFRpbWVsaW5lID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnRUaW1lbGluZScpO1xuc3BpbmUuTWVzaEF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL01lc2hBdHRhY2htZW50Jyk7XG5zcGluZS5SZWdpb25BdHRhY2htZW50ID0gcmVxdWlyZSgnLi9SZWdpb25BdHRhY2htZW50Jyk7XG5zcGluZS5Sb3RhdGVUaW1lbGluZSA9IHJlcXVpcmUoJy4vUm90YXRlVGltZWxpbmUnKTtcbnNwaW5lLlNjYWxlVGltZWxpbmUgPSByZXF1aXJlKCcuL1NjYWxlVGltZWxpbmUnKTtcbnNwaW5lLlNrZWxldG9uQm91bmRzID0gcmVxdWlyZSgnLi9Ta2VsZXRvbkJvdW5kcycpO1xuc3BpbmUuU2tlbGV0b25EYXRhID0gcmVxdWlyZSgnLi9Ta2VsZXRvbkRhdGEnKTtcbnNwaW5lLlNrZWxldG9uID0gcmVxdWlyZSgnLi9Ta2VsZXRvbicpO1xuc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyID0gcmVxdWlyZSgnLi9Ta2VsZXRvbkpzb25QYXJzZXInKTtcbnNwaW5lLlNraW4gPSByZXF1aXJlKCcuL1NraW4uanMnKTtcbnNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudCA9IHJlcXVpcmUoJy4vU2tpbm5lZE1lc2hBdHRhY2htZW50Jyk7XG5zcGluZS5TbG90RGF0YSA9IHJlcXVpcmUoJy4vU2xvdERhdGEnKTtcbnNwaW5lLlNsb3QgPSByZXF1aXJlKCcuL1Nsb3QnKTtcbnNwaW5lLlRyYWNrRW50cnkgPSByZXF1aXJlKCcuL1RyYWNrRW50cnknKTtcbnNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9UcmFuc2xhdGVUaW1lbGluZScpO1xubW9kdWxlLmV4cG9ydHMgPSBzcGluZTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHJhZERlZzogMTgwIC8gTWF0aC5QSSxcbiAgICBkZWdSYWQ6IE1hdGguUEkgLyAxODAsXG4gICAgdGVtcDogW10sXG4gICAgRmxvYXQzMkFycmF5OiAodHlwZW9mKEZsb2F0MzJBcnJheSkgPT09ICd1bmRlZmluZWQnKSA/IEFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgIFVpbnQxNkFycmF5OiAodHlwZW9mKFVpbnQxNkFycmF5KSA9PT0gJ3VuZGVmaW5lZCcpID8gQXJyYXkgOiBVaW50MTZBcnJheVxufTtcblxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVSdW50aW1lJyk7XG5cbi8qIEVzb3RlcmljIFNvZnR3YXJlIFNQSU5FIHdyYXBwZXIgZm9yIHBpeGkuanMgKi9cbnNwaW5lLkJvbmUueURvd24gPSB0cnVlO1xuXG4vKipcbiAqIEEgY2xhc3MgdGhhdCBlbmFibGVzIHRoZSB5b3UgdG8gaW1wb3J0IGFuZCBydW4geW91ciBzcGluZSBhbmltYXRpb25zIGluIHBpeGkuXG4gKiBUaGUgU3BpbmUgYW5pbWF0aW9uIGRhdGEgbmVlZHMgdG8gYmUgbG9hZGVkIHVzaW5nIGVpdGhlciB0aGUgTG9hZGVyIG9yIGEgU3BpbmVMb2FkZXIgYmVmb3JlIGl0IGNhbiBiZSB1c2VkIGJ5IHRoaXMgY2xhc3NcbiAqIFNlZSBleGFtcGxlIDEyIChodHRwOi8vd3d3Lmdvb2Rib3lkaWdpdGFsLmNvbS9waXhpanMvZXhhbXBsZXMvMTIvKSB0byBzZWUgYSB3b3JraW5nIGV4YW1wbGUgYW5kIGNoZWNrIG91dCB0aGUgc291cmNlXG4gKlxuICogYGBganNcbiAqIHZhciBzcGluZUFuaW1hdGlvbiA9IG5ldyBQSVhJLlNwaW5lKHNwaW5lRGF0YSk7XG4gKiBgYGBcbiAqXG4gKiBAY2xhc3NcbiAqIEBleHRlbmRzIENvbnRhaW5lclxuICogQG1lbWJlcm9mIFBJWEkuc3BpbmVcbiAqIEBwYXJhbSBzcGluZURhdGEge29iamVjdH0gVGhlIHNwaW5lIGRhdGEgbG9hZGVkIGZyb20gYSBzcGluZSBhdGxhcy5cbiAqL1xuZnVuY3Rpb24gU3BpbmUoc3BpbmVEYXRhKVxue1xuICAgIFBJWEkuQ29udGFpbmVyLmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXNwaW5lRGF0YSlcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHNwaW5lRGF0YSBwYXJhbSBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc3BpbmVEYXRhIG9iamVjdFxuICAgICAqXG4gICAgICogQG1lbWJlciB7b2JqZWN0fVxuICAgICAqL1xuICAgIHRoaXMuc3BpbmVEYXRhID0gc3BpbmVEYXRhO1xuXG4gICAgLyoqXG4gICAgICogQSBzcGluZSBTa2VsZXRvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEBtZW1iZXIge29iamVjdH1cbiAgICAgKi9cbiAgICB0aGlzLnNrZWxldG9uID0gbmV3IHNwaW5lLlNrZWxldG9uKHNwaW5lRGF0YSk7XG4gICAgdGhpcy5za2VsZXRvbi51cGRhdGVXb3JsZFRyYW5zZm9ybSgpO1xuXG4gICAgLyoqXG4gICAgICogQSBzcGluZSBBbmltYXRpb25TdGF0ZURhdGEgb2JqZWN0IGNyZWF0ZWQgZnJvbSB0aGUgc3BpbmUgZGF0YSBwYXNzZWQgaW4gdGhlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9XG4gICAgICovXG4gICAgdGhpcy5zdGF0ZURhdGEgPSBuZXcgc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhKHNwaW5lRGF0YSk7XG5cbiAgICAvKipcbiAgICAgKiBBIHNwaW5lIEFuaW1hdGlvblN0YXRlIG9iamVjdCBjcmVhdGVkIGZyb20gdGhlIHNwaW5lIEFuaW1hdGlvblN0YXRlRGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEBtZW1iZXIge29iamVjdH1cbiAgICAgKi9cbiAgICB0aGlzLnN0YXRlID0gbmV3IHNwaW5lLkFuaW1hdGlvblN0YXRlKHRoaXMuc3RhdGVEYXRhKTtcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIGNvbnRhaW5lcnNcbiAgICAgKlxuICAgICAqIEBtZW1iZXIge0NvbnRhaW5lcltdfVxuICAgICAqL1xuICAgIHRoaXMuc2xvdENvbnRhaW5lcnMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGhpcy5za2VsZXRvbi5zbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICB2YXIgc2xvdCA9IHRoaXMuc2tlbGV0b24uc2xvdHNbaV07XG4gICAgICAgIHZhciBhdHRhY2htZW50ID0gc2xvdC5hdHRhY2htZW50O1xuICAgICAgICB2YXIgc2xvdENvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLnNsb3RDb250YWluZXJzLnB1c2goc2xvdENvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuYWRkQ2hpbGQoc2xvdENvbnRhaW5lcik7XG5cbiAgICAgICAgaWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBzcGluZS5SZWdpb25BdHRhY2htZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgc3ByaXRlTmFtZSA9IGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QubmFtZTtcbiAgICAgICAgICAgIHZhciBzcHJpdGUgPSB0aGlzLmNyZWF0ZVNwcml0ZShzbG90LCBhdHRhY2htZW50KTtcbiAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZSA9IHNwcml0ZTtcbiAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZU5hbWUgPSBzcHJpdGVOYW1lO1xuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChzcHJpdGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBzcGluZS5NZXNoQXR0YWNobWVudClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmNyZWF0ZU1lc2goc2xvdCwgYXR0YWNobWVudCk7XG4gICAgICAgICAgICBzbG90LmN1cnJlbnRNZXNoID0gbWVzaDtcbiAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2hOYW1lID0gYXR0YWNobWVudC5uYW1lO1xuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChtZXNoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG91bGQgdGhlIFNwaW5lIG9iamVjdCB1cGRhdGUgaXRzIHRyYW5zZm9ybXNcbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5hdXRvVXBkYXRlID0gdHJ1ZTtcbn1cblxuU3BpbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkNvbnRhaW5lci5wcm90b3R5cGUpO1xuU3BpbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3BpbmU7XG5tb2R1bGUuZXhwb3J0cyA9IFNwaW5lO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTcGluZS5wcm90b3R5cGUsIHtcbiAgICAvKipcbiAgICAgKiBJZiB0aGlzIGZsYWcgaXMgc2V0IHRvIHRydWUsIHRoZSBzcGluZSBhbmltYXRpb24gd2lsbCBiZSBhdXRvdXBkYXRlZCBldmVyeSB0aW1lXG4gICAgICogdGhlIG9iamVjdCBpZCBkcmF3bi4gVGhlIGRvd24gc2lkZSBvZiB0aGlzIGFwcHJvYWNoIGlzIHRoYXQgdGhlIGRlbHRhIHRpbWUgaXNcbiAgICAgKiBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgYW5kIHlvdSBjb3VsZCBtaXNzIG91dCBvbiBjb29sIGVmZmVjdHMgbGlrZSBzbG93IG1vdGlvbixcbiAgICAgKiBwYXVzZSwgc2tpcCBhaGVhZCBhbmQgdGhlIHNvcnRzLiBNb3N0IG9mIHRoZXNlIGVmZmVjdHMgY2FuIGJlIGFjaGlldmVkIGV2ZW4gd2l0aFxuICAgICAqIGF1dG91cGRhdGUgZW5hYmxlZCBidXQgYXJlIGhhcmRlciB0byBhY2hpZXZlLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cbiAgICAgKiBAbWVtYmVyb2YgU3BpbmUjXG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuICAgIGF1dG9VcGRhdGU6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gKHRoaXMudXBkYXRlVHJhbnNmb3JtID09PSBTcGluZS5wcm90b3R5cGUuYXV0b1VwZGF0ZVRyYW5zZm9ybSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVHJhbnNmb3JtID0gdmFsdWUgPyBTcGluZS5wcm90b3R5cGUuYXV0b1VwZGF0ZVRyYW5zZm9ybSA6IFBJWEkuQ29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm07XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHNwaW5lIHNrZWxldG9uIGFuZCBpdHMgYW5pbWF0aW9ucyBieSBkZWx0YSB0aW1lIChkdClcbiAqXG4gKiBAcGFyYW0gZHQge251bWJlcn0gRGVsdGEgdGltZS4gVGltZSBieSB3aGljaCB0aGUgYW5pbWF0aW9uIHNob3VsZCBiZSB1cGRhdGVkXG4gKi9cblNwaW5lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZHQpXG57XG4gICAgdGhpcy5zdGF0ZS51cGRhdGUoZHQpO1xuICAgIHRoaXMuc3RhdGUuYXBwbHkodGhpcy5za2VsZXRvbik7XG4gICAgdGhpcy5za2VsZXRvbi51cGRhdGVXb3JsZFRyYW5zZm9ybSgpO1xuXG4gICAgdmFyIGRyYXdPcmRlciA9IHRoaXMuc2tlbGV0b24uZHJhd09yZGVyO1xuICAgIHZhciBzbG90cyA9IHRoaXMuc2tlbGV0b24uc2xvdHM7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGRyYXdPcmRlci5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICB0aGlzLmNoaWxkcmVuW2ldID0gdGhpcy5zbG90Q29udGFpbmVyc1tkcmF3T3JkZXJbaV1dO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICB2YXIgc2xvdCA9IHNsb3RzW2ldO1xuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHNsb3QuYXR0YWNobWVudDtcbiAgICAgICAgdmFyIHNsb3RDb250YWluZXIgPSB0aGlzLnNsb3RDb250YWluZXJzW2ldO1xuXG4gICAgICAgIGlmICghYXR0YWNobWVudClcbiAgICAgICAge1xuICAgICAgICAgICAgc2xvdENvbnRhaW5lci52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0eXBlID0gYXR0YWNobWVudC50eXBlO1xuICAgICAgICBpZiAodHlwZSA9PT0gc3BpbmUuQXR0YWNobWVudFR5cGUucmVnaW9uKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoYXR0YWNobWVudC5yZW5kZXJlck9iamVjdClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNsb3QuY3VycmVudFNwcml0ZU5hbWUgfHwgc2xvdC5jdXJyZW50U3ByaXRlTmFtZSAhPT0gYXR0YWNobWVudC5yZW5kZXJlck9iamVjdC5uYW1lKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwcml0ZU5hbWUgPSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzbG90LmN1cnJlbnRTcHJpdGUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzbG90LnNwcml0ZXMgPSBzbG90LnNwcml0ZXMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChzbG90LnNwcml0ZXNbc3ByaXRlTmFtZV0gIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5zcHJpdGVzW3Nwcml0ZU5hbWVdLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNwcml0ZSA9IHRoaXMuY3JlYXRlU3ByaXRlKHNsb3QsIGF0dGFjaG1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChzcHJpdGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZSA9IHNsb3Quc3ByaXRlc1tzcHJpdGVOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlTmFtZSA9IHNwcml0ZU5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgYm9uZSA9IHNsb3QuYm9uZTtcblxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5wb3NpdGlvbi54ID0gYm9uZS53b3JsZFggKyBhdHRhY2htZW50LnggKiBib25lLm0wMCArIGF0dGFjaG1lbnQueSAqIGJvbmUubTAxO1xuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5wb3NpdGlvbi55ID0gYm9uZS53b3JsZFkgKyBhdHRhY2htZW50LnggKiBib25lLm0xMCArIGF0dGFjaG1lbnQueSAqIGJvbmUubTExO1xuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5zY2FsZS54ID0gYm9uZS53b3JsZFNjYWxlWDtcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIuc2NhbGUueSA9IGJvbmUud29ybGRTY2FsZVk7XG5cbiAgICAgICAgICAgIHNsb3RDb250YWluZXIucm90YXRpb24gPSAtKHNsb3QuYm9uZS53b3JsZFJvdGF0aW9uICogc3BpbmUuZGVnUmFkKTtcblxuICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlLnRpbnQgPSBQSVhJLnV0aWxzLnJnYjJoZXgoW3Nsb3QucixzbG90Lmcsc2xvdC5iXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gc3BpbmUuQXR0YWNobWVudFR5cGUuc2tpbm5lZG1lc2gpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghc2xvdC5jdXJyZW50TWVzaE5hbWUgfHwgc2xvdC5jdXJyZW50TWVzaE5hbWUgIT09IGF0dGFjaG1lbnQubmFtZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgbWVzaE5hbWUgPSBhdHRhY2htZW50Lm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKHNsb3QuY3VycmVudE1lc2ggIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2gudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNsb3QubWVzaGVzID0gc2xvdC5tZXNoZXMgfHwge307XG5cbiAgICAgICAgICAgICAgICBpZiAoc2xvdC5tZXNoZXNbbWVzaE5hbWVdICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzbG90Lm1lc2hlc1ttZXNoTmFtZV0udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXNoID0gdGhpcy5jcmVhdGVNZXNoKHNsb3QsIGF0dGFjaG1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBzbG90Q29udGFpbmVyLmFkZENoaWxkKG1lc2gpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2ggPSBzbG90Lm1lc2hlc1ttZXNoTmFtZV07XG4gICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50TWVzaE5hbWUgPSBtZXNoTmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXR0YWNobWVudC5jb21wdXRlV29ybGRWZXJ0aWNlcyhzbG90LmJvbmUuc2tlbGV0b24ueCwgc2xvdC5ib25lLnNrZWxldG9uLnksIHNsb3QsIHNsb3QuY3VycmVudE1lc2gudmVydGljZXMpO1xuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHNsb3RDb250YWluZXIudmlzaWJsZSA9IHRydWU7XG5cbiAgICAgICAgc2xvdENvbnRhaW5lci5hbHBoYSA9IHNsb3QuYTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFdoZW4gYXV0b3VwZGF0ZSBpcyBzZXQgdG8geWVzIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCBhcyBwaXhpJ3MgdXBkYXRlVHJhbnNmb3JtIGZ1bmN0aW9uXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU3BpbmUucHJvdG90eXBlLmF1dG9VcGRhdGVUcmFuc2Zvcm0gPSBmdW5jdGlvbiAoKVxue1xuICAgIHRoaXMubGFzdFRpbWUgPSB0aGlzLmxhc3RUaW1lIHx8IERhdGUubm93KCk7XG4gICAgdmFyIHRpbWVEZWx0YSA9IChEYXRlLm5vdygpIC0gdGhpcy5sYXN0VGltZSkgKiAwLjAwMTtcbiAgICB0aGlzLmxhc3RUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIHRoaXMudXBkYXRlKHRpbWVEZWx0YSk7XG5cbiAgICBQSVhJLkNvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBzcHJpdGUgdG8gYmUgdXNlZCB3aXRoIHNwaW5lLlJlZ2lvbkF0dGFjaG1lbnRcbiAqXG4gKiBAcGFyYW0gc2xvdCB7c3BpbmUuU2xvdH0gVGhlIHNsb3QgdG8gd2hpY2ggdGhlIGF0dGFjaG1lbnQgaXMgcGFyZW50ZWRcbiAqIEBwYXJhbSBhdHRhY2htZW50IHtzcGluZS5SZWdpb25BdHRhY2htZW50fSBUaGUgYXR0YWNobWVudCB0aGF0IHRoZSBzcHJpdGUgd2lsbCByZXByZXNlbnRcbiAqIEBwcml2YXRlXG4gKi9cblNwaW5lLnByb3RvdHlwZS5jcmVhdGVTcHJpdGUgPSBmdW5jdGlvbiAoc2xvdCwgYXR0YWNobWVudClcbntcbiAgICB2YXIgZGVzY3JpcHRvciA9IGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3Q7XG4gICAgdmFyIGJhc2VUZXh0dXJlID0gZGVzY3JpcHRvci5wYWdlLnJlbmRlcmVyT2JqZWN0O1xuICAgIHZhciBzcHJpdGVSZWN0ID0gbmV3IFBJWEkubWF0aC5SZWN0YW5nbGUoZGVzY3JpcHRvci54LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3IueSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdG9yLnJvdGF0ZSA/IGRlc2NyaXB0b3IuaGVpZ2h0IDogZGVzY3JpcHRvci53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdG9yLnJvdGF0ZSA/IGRlc2NyaXB0b3Iud2lkdGggOiBkZXNjcmlwdG9yLmhlaWdodCk7XG4gICAgdmFyIHNwcml0ZVRleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKGJhc2VUZXh0dXJlLCBzcHJpdGVSZWN0KTtcbiAgICB2YXIgc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHNwcml0ZVRleHR1cmUpO1xuXG4gICAgdmFyIGJhc2VSb3RhdGlvbiA9IGRlc2NyaXB0b3Iucm90YXRlID8gTWF0aC5QSSAqIDAuNSA6IDAuMDtcbiAgICBzcHJpdGUuc2NhbGUueCA9IGRlc2NyaXB0b3Iud2lkdGggLyBkZXNjcmlwdG9yLm9yaWdpbmFsV2lkdGggKiBhdHRhY2htZW50LnNjYWxlWDtcbiAgICBzcHJpdGUuc2NhbGUueSA9IGRlc2NyaXB0b3IuaGVpZ2h0IC8gZGVzY3JpcHRvci5vcmlnaW5hbEhlaWdodCAqIGF0dGFjaG1lbnQuc2NhbGVZO1xuICAgIHNwcml0ZS5yb3RhdGlvbiA9IGJhc2VSb3RhdGlvbiAtIChhdHRhY2htZW50LnJvdGF0aW9uICogc3BpbmUuZGVnUmFkKTtcbiAgICBzcHJpdGUuYW5jaG9yLnggPSBzcHJpdGUuYW5jaG9yLnkgPSAwLjU7XG4gICAgc3ByaXRlLmFscGhhID0gYXR0YWNobWVudC5hO1xuXG4gICAgc2xvdC5zcHJpdGVzID0gc2xvdC5zcHJpdGVzIHx8IHt9O1xuICAgIHNsb3Quc3ByaXRlc1tkZXNjcmlwdG9yLm5hbWVdID0gc3ByaXRlO1xuICAgIHJldHVybiBzcHJpdGU7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBTdHJpcCBmcm9tIHRoZSBzcGluZSBkYXRhXG4gKiBAcGFyYW0gc2xvdCB7c3BpbmUuU2xvdH0gVGhlIHNsb3QgdG8gd2hpY2ggdGhlIGF0dGFjaG1lbnQgaXMgcGFyZW50ZWRcbiAqIEBwYXJhbSBhdHRhY2htZW50IHtzcGluZS5SZWdpb25BdHRhY2htZW50fSBUaGUgYXR0YWNobWVudCB0aGF0IHRoZSBzcHJpdGUgd2lsbCByZXByZXNlbnRcbiAqIEBwcml2YXRlXG4gKi9cblNwaW5lLnByb3RvdHlwZS5jcmVhdGVNZXNoID0gZnVuY3Rpb24gKHNsb3QsIGF0dGFjaG1lbnQpXG57XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0O1xuICAgIHZhciBiYXNlVGV4dHVyZSA9IGRlc2NyaXB0b3IucGFnZS5yZW5kZXJlck9iamVjdDtcbiAgICB2YXIgdGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoYmFzZVRleHR1cmUpO1xuXG4gICAgdmFyIHN0cmlwID0gbmV3IFBJWEkuU3RyaXAodGV4dHVyZSk7XG4gICAgc3RyaXAuZHJhd01vZGUgPSBQSVhJLlN0cmlwLkRSQVdfTU9ERVMuVFJJQU5HTEVTO1xuICAgIHN0cmlwLmNhbnZhc1BhZGRpbmcgPSAxLjU7XG5cbiAgICBzdHJpcC52ZXJ0aWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkoYXR0YWNobWVudC51dnMubGVuZ3RoKTtcbiAgICBzdHJpcC51dnMgPSBhdHRhY2htZW50LnV2cztcbiAgICBzdHJpcC5pbmRpY2VzID0gYXR0YWNobWVudC50cmlhbmdsZXM7XG4gICAgc3RyaXAuYWxwaGEgPSBhdHRhY2htZW50LmE7XG5cbiAgICBzbG90Lm1lc2hlcyA9IHNsb3QubWVzaGVzIHx8IHt9O1xuICAgIHNsb3QubWVzaGVzW2F0dGFjaG1lbnQubmFtZV0gPSBzdHJpcDtcblxuICAgIHJldHVybiBzdHJpcDtcbn07XG4iLCIvKipcbiAqIEBmaWxlICAgICAgICBTcGluZSByZXNvdXJjZSBsb2FkZXJcbiAqIEBhdXRob3IgICAgICBJdmFuIFBvcGVseXNoZXYgPGl2YW4ucG9wZWx5c2hldkBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE1IEdvb2RCb3lEaWdpdGFsXG4gKiBAbGljZW5zZSAgICAge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Hb29kQm95RGlnaXRhbC9waXhpLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0V8TUlUIExpY2Vuc2V9XG4gKi9cblxuLyoqXG4gKiBAbmFtZXNwYWNlIFBJWEkubG9hZGVyc1xuICovXG5cbnZhciBhdGxhc1BhcnNlciA9IHJlcXVpcmUoJy4vYXRsYXNQYXJzZXInKTtcblxuUElYSS5sb2FkZXJzLkxvYWRlci5hZGRQaXhpTWlkZGxld2FyZShhdGxhc1BhcnNlcik7XG5QSVhJLmxvYWRlci51c2UoYXRsYXNQYXJzZXIoKSk7XG4iLCJ2YXIgUmVzb3VyY2UgPSBQSVhJLmxvYWRlcnMuUmVzb3VyY2UsXG4gICAgYXN5bmMgPSBQSVhJLnV0aWxzLmFzeW5jLFxuICAgIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVSdW50aW1lJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAocmVzb3VyY2UsIG5leHQpIHtcbiAgICAgICAgLy8gc2tpcCBpZiBubyBkYXRhLCBpdHMgbm90IGpzb24sIG9yIGl0IGlzbid0IGF0bGFzIGRhdGFcbiAgICAgICAgaWYgKCFyZXNvdXJjZS5kYXRhIHx8ICFyZXNvdXJjZS5pc0pzb24gfHwgIXJlc291cmNlLmRhdGEuYm9uZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogdXNlIGEgYml0IG9mIGhhY2tlcnkgdG8gbG9hZCB0aGUgYXRsYXMgZmlsZSwgaGVyZSB3ZSBhc3N1bWUgdGhhdCB0aGUgLmpzb24sIC5hdGxhcyBhbmQgLnBuZyBmaWxlc1xuICAgICAgICAgKiB0aGF0IGNvcnJlc3BvbmQgdG8gdGhlIHNwaW5lIGZpbGUgYXJlIGluIHRoZSBzYW1lIGJhc2UgVVJMIGFuZCB0aGF0IHRoZSAuanNvbiBhbmQgLmF0bGFzIGZpbGVzXG4gICAgICAgICAqIGhhdmUgdGhlIHNhbWUgbmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGF0bGFzUGF0aCA9IHJlc291cmNlLnVybC5zdWJzdHIoMCwgcmVzb3VyY2UudXJsLmxhc3RJbmRleE9mKCcuJykpICsgJy5hdGxhcyc7XG4gICAgICAgIHZhciBhdGxhc09wdGlvbnMgPSB7XG4gICAgICAgICAgICBjcm9zc09yaWdpbjogcmVzb3VyY2UuY3Jvc3NPcmlnaW4sXG4gICAgICAgICAgICB4aHJUeXBlOiBSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRS5URVhUXG4gICAgICAgIH07XG4gICAgICAgIHZhciBiYXNlVXJsID0gcmVzb3VyY2UudXJsLnN1YnN0cigwLCByZXNvdXJjZS51cmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuXG5cbiAgICAgICAgdGhpcy5hZGQocmVzb3VyY2UubmFtZSArICdfYXRsYXMnLCBhdGxhc1BhdGgsIGF0bGFzT3B0aW9ucywgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgLy8gY3JlYXRlIGEgc3BpbmUgYXRsYXMgdXNpbmcgdGhlIGxvYWRlZCB0ZXh0XG4gICAgICAgICAgICB2YXIgc3BpbmVBdGxhcyA9IG5ldyBzcGluZS5BdGxhcyh0aGlzLnhoci5yZXNwb25zZVRleHQsIGJhc2VVcmwsIHJlcy5jcm9zc09yaWdpbik7XG5cbiAgICAgICAgICAgIC8vIHNwaW5lIGFuaW1hdGlvblxuICAgICAgICAgICAgdmFyIHNwaW5lSnNvblBhcnNlciA9IG5ldyBzcGluZS5Ta2VsZXRvbkpzb25QYXJzZXIobmV3IHNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlcihzcGluZUF0bGFzKSk7XG4gICAgICAgICAgICB2YXIgc2tlbGV0b25EYXRhID0gc3BpbmVKc29uUGFyc2VyLnJlYWRTa2VsZXRvbkRhdGEocmVzb3VyY2UuZGF0YSk7XG5cbiAgICAgICAgICAgIHJlc291cmNlLnNwaW5lRGF0YSA9IHNrZWxldG9uRGF0YTtcbiAgICAgICAgICAgIHJlc291cmNlLnNwaW5lQXRsYXMgPSBzcGluZUF0bGFzO1xuXG4gICAgICAgICAgICAvLyBHbyB0aHJvdWdoIGVhY2ggc3BpbmVBdGxhcy5wYWdlcyBhbmQgd2FpdCBmb3IgcGFnZS5yZW5kZXJlck9iamVjdCAoYSBiYXNlVGV4dHVyZSkgdG9cbiAgICAgICAgICAgIC8vIGxvYWQuIE9uY2UgYWxsIGxvYWRlZCwgdGhlbiBjYWxsIHRoZSBuZXh0IGZ1bmN0aW9uLlxuICAgICAgICAgICAgYXN5bmMuZWFjaChzcGluZUF0bGFzLnBhZ2VzLCBmdW5jdGlvbiAocGFnZSwgZG9uZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlLnJlbmRlcmVyT2JqZWN0Lmhhc0xvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYWdlLnJlbmRlcmVyT2JqZWN0Lm9uY2UoJ2xvYWRlZCcsIGRvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIG5leHQpO1xuICAgICAgICB9KTtcbiAgICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGF0bGFzUGFyc2VyOiByZXF1aXJlKCcuL2F0bGFzUGFyc2VyJyksXG4gICAgTG9hZGVyOiByZXF1aXJlKCcuL0xvYWRlcicpXG59O1xuIl19
