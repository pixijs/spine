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
var PIXI = require('pixi.js');

var spine = module.exports = {
    radDeg: 180 / Math.PI,
    degRad: Math.PI / 180,
    temp: [],
    Float32Array: (typeof(Float32Array) === 'undefined') ? Array : Float32Array,
    Uint16Array: (typeof(Uint16Array) === 'undefined') ? Array : Uint16Array,
    Animation: require('./Animation.js'),
    AnimationStateData: require('./AnimationStateData.js'),
    AnimationState: require('./AnimationState.js'),
    AtlasAttachmentParser: require('./AtlasAttachmentParser.js'),
    Atlas: require('./Atlas.js'),
    AtlasPage: require('./AtlasPage.js'),
    AtlasReader: require('./AtlasReader.js'),
    AtlasRegion: require('./AtlasRegion.js'),
    AttachmentTimeline: require('./AttachmentTimeline.js'),
    AttachmentType: require('./AttachmentType.js'),
    BoneData: require('./BoneData.js'),
    Bone: require('./Bone.js'),
    BoundingBoxAttachment: require('./BoundingBoxAttachment.js'),
    ColorTimeline: require('./ColorTimeline.js'),
    Curves: require('./Curves.js'),
    DrawOrderTimeline: require('./DrawOrderTimeline.js'),
    EventData: require('./EventData.js'),
    Event: require('./Event.js'),
    EventTimeline: require('./EventTimeline.js'),
    FfdTimeline: require('./FfdTimeline.js'),
    FlipXTimeline: require('./FlipXTimeline.js'),
    FlipYTimeline: require('./FlipYTimeline.js'),
    IkConstraintData: require('./IkConstraintData.js'),
    IkConstraint: require('./IkConstraint.js'),
    IkConstraintTimeline: require('./IkConstraintTimeline.js'),
    MeshAttachment: require('./MeshAttachment.js'),
    RegionAttachment: require('./RegionAttachment.js'),
    RotateTimeline: require('./RotateTimeline.js'),
    ScaleTimeline: require('./ScaleTimeline.js'),
    SkeletonBounds: require('./SkeletonBounds.js'),
    SkeletonData: require('./SkeletonData.js'),
    Skeleton: require('./Skeleton.js'),
    SkeletonJsonParser: require('./SkeletonJsonParser.js'),
    Skin: require('./Skin.js'),
    SkinnedMeshAttachment: require('./SkinnedMeshAttachment.js'),
    SlotData: require('./SlotData.js'),
    Slot: require('./Slot.js'),
    TrackEntry: require('./TrackEntry.js'),
    TranslateTimeline: require('./TranslateTimeline.js')
};

