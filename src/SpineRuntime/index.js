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
spine.WeightedMeshAttachment = require('./WeightedMeshAttachment');
spine.SlotData = require('./SlotData');
spine.Slot = require('./Slot');
spine.TrackEntry = require('./TrackEntry');
spine.TranslateTimeline = require('./TranslateTimeline');
module.exports = spine;
