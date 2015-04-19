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
    Uint16Array: (typeof(Uint16Array) === 'undefined') ? Array : Uint16Array
};
spine.Animation = require('./Animation.js');
spine.AnimationStateData = require('./AnimationStateData.js');
spine.AnimationState = require('./AnimationState.js');
spine.AtlasAttachmentParser = require('./AtlasAttachmentParser.js');
spine.Atlas = require('./Atlas.js');
spine.AtlasPage = require('./AtlasPage.js');
spine.AtlasReader = require('./AtlasReader.js');
spine.AtlasRegion = require('./AtlasRegion.js');
spine.AttachmentTimeline = require('./AttachmentTimeline.js');
spine.AttachmentType = require('./AttachmentType.js');
spine.BoneData = require('./BoneData.js');
spine.Bone = require('./Bone.js');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment.js');
spine.ColorTimeline = require('./ColorTimeline.js');
spine.Curves = require('./Curves.js');
spine.DrawOrderTimeline = require('./DrawOrderTimeline.js');
spine.EventData = require('./EventData.js');
spine.Event = require('./Event.js');
spine.EventTimeline = require('./EventTimeline.js');
spine.FfdTimeline = require('./FfdTimeline.js');
spine.FlipXTimeline = require('./FlipXTimeline.js');
spine.FlipYTimeline = require('./FlipYTimeline.js');
spine.IkConstraintData = require('./IkConstraintData.js');
spine.IkConstraint = require('./IkConstraint.js');
spine.IkConstraintTimeline = require('./IkConstraintTimeline.js');
spine.MeshAttachment = require('./MeshAttachment.js');
spine.RegionAttachment = require('./RegionAttachment.js');
spine.RotateTimeline = require('./RotateTimeline.js');
spine.ScaleTimeline = require('./ScaleTimeline.js');
spine.SkeletonBounds = require('./SkeletonBounds.js');
spine.SkeletonData = require('./SkeletonData.js');
spine.Skeleton = require('./Skeleton.js');
spine.SkeletonJsonParser = require('./SkeletonJsonParser.js');
spine.Skin = require('./Skin.js');
spine.SkinnedMeshAttachment = require('./SkinnedMeshAttachment.js');
spine.SlotData = require('./SlotData.js');
spine.Slot = require('./Slot.js');
spine.TrackEntry = require('./TrackEntry.js');
spine.TranslateTimeline = require('./TranslateTimeline.js');
