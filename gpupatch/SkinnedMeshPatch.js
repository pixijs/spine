/**
 * @author Ivan Popelyshev
 *
 * This thing computates SkinnedMesh on shader-side
 */

function patchPixiSpine(options) {

    var core = PIXI;
    var spine = core.spine.SpineRuntime;

    function SkinnedMeshShader(shaderManager) {
        var gl = shaderManager.renderer.gl;
        var nVertexUniforms = gl.getParameter( gl.MAX_VERTEX_UNIFORM_VECTORS );
        this.maxBones = Math.min(128, ((nVertexUniforms-10) / 3) | 0);
        core.Shader.call(this,
            shaderManager,
            // vertex shader
            [
                'precision lowp float;',
                'attribute vec2 aTextureCoord;',
                'attribute vec4 aSkin0, aSkin1, aSkin2, aSkin3;',
                'attribute vec4 aFfd11, aFfd12, aFfd21, aFfd22, aFfd31, aFfd32, aFfd41, aFfd42;',
                'uniform mat3 projectionMatrix;',
                'uniform mat3 boneGlobalMatrices[' + this.maxBones + '];',
                'uniform vec4 ffdAlpha;',
                'varying vec2 vTextureCoord;',

                'void main(void){',
                '   vec2 ffd[4];',
                '   ffd[0] = aFfd11.xy * ffdAlpha[0] + aFfd21.xy * ffdAlpha[1] + aFfd31.xy * ffdAlpha[2] + aFfd41.xy * ffdAlpha[3];',
                '   ffd[1] = aFfd11.zw * ffdAlpha[0] + aFfd21.zw * ffdAlpha[1] + aFfd31.zw * ffdAlpha[2] + aFfd41.zw * ffdAlpha[3];',
                '   ffd[2] = aFfd12.xy * ffdAlpha[0] + aFfd22.xy * ffdAlpha[1] + aFfd32.xy * ffdAlpha[2] + aFfd42.xy * ffdAlpha[3];',
                '   ffd[3] = aFfd12.zw * ffdAlpha[0] + aFfd22.zw * ffdAlpha[1] + aFfd32.zw * ffdAlpha[2] + aFfd42.zw * ffdAlpha[3];',
                '   vec3 skinned = vec3( 0 );',
                '   skinned += boneGlobalMatrices[ int(aSkin0[0]) ] * vec3(aSkin0[1] + ffd[0].x, aSkin0[2] + ffd[0].y, 1.0) * aSkin0[3]; ',
                '   skinned += boneGlobalMatrices[ int(aSkin1[0]) ] * vec3(aSkin1[1] + ffd[1].x, aSkin1[2] + ffd[1].y, 1.0) * aSkin1[3]; ',
                '   skinned += boneGlobalMatrices[ int(aSkin2[0]) ] * vec3(aSkin2[1] + ffd[2].x, aSkin2[2] + ffd[2].y, 1.0) * aSkin2[3]; ',
                '   skinned += boneGlobalMatrices[ int(aSkin3[0]) ] * vec3(aSkin3[1] + ffd[3].x, aSkin3[2] + ffd[3].y, 1.0) * aSkin3[3]; ',
                '   gl_Position = vec4(projectionMatrix * skinned, 1.0);',
                '   vTextureCoord = aTextureCoord;',
                '}'
            ].join('\n'),
            [
                'precision lowp float;',

                'varying vec2 vTextureCoord;',
                'uniform vec4 tintAlpha;',

                'uniform sampler2D uSampler;',

                'void main(void){',
                '   gl_FragColor = texture2D(uSampler, vTextureCoord) * tintAlpha;',
                '}'
            ].join('\n'),
            {
                tintAlpha: {type: '4f', value: [1, 1, 1, 1]},
                uSampler: {type: 'sampler2D', value: 0},
                ffdAlpha: {type: '4fv', value: new Float32Array(4)},
                projectionMatrix: {type: 'mat3', value: new Float32Array(9)},
                boneGlobalMatrices: {type: 'mat3', value: new Float32Array(9)}
            },
            {
                aTextureCoord: 0,
                aSkin0: 0,
                aSkin1: 0,
                aSkin2: 0,
                aSkin3: 0,
                aFfd11: 0,
                aFfd12: 0,
                aFfd21: 0,
                aFfd22: 0,
                aFfd31: 0,
                aFfd32: 0,
                aFfd41: 0,
                aFfd42: 0,
            }
        );
        this.ffdAttrName = ["aFfd11", "aFfd12", "aFfd21", "aFfd22", "aFfd31", "aFfd32", "aFfd41", "aFfd42"];
        this.ffdAttr = [];
        for (var i = 0; i < this.ffdAttrName.length; i++)
            this.ffdAttr.push(this.attributes[this.ffdAttrName[i]]);
    }

    SkinnedMeshShader.prototype = Object.create(core.Shader.prototype);
    SkinnedMeshShader.prototype.constructor = SkinnedMeshShader;

    core.ShaderManager.registerPlugin('skinnedMeshShader', SkinnedMeshShader);

    function SpineMeshRenderer(renderer) {
        core.ObjectRenderer.call(this, renderer);
        this.maxWeights = 4;
        this.boneSize = 9;
    }

    SpineMeshRenderer.prototype = Object.create(core.ObjectRenderer.prototype);
    SpineMeshRenderer.prototype.constructor = SpineMeshRenderer;

    SpineMeshRenderer.autoincrementMeshId = 0;

    core.WebGLRenderer.registerPlugin('spineMesh', SpineMeshRenderer);

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     * @param gl {WebGLRenderingContext} the current WebGL drawing context
     */
    SpineMeshRenderer.prototype.onContextChange = function () {
        this._buffers = {};
    };

    /**
     * Renders the sprite object.
     *
     * @param mesh {PIXI.mesh.Mesh} the mesh to render
     */
    SpineMeshRenderer.prototype.render = function (spineObj) {
        var skeleton = spineObj.skeleton;
        var spineData = spineObj.spineData;
        var b = this._buffers[spineData.skinnedMeshId];
        if (!b) {
            this._initSkinWebGL(spineObj);
            b = this._buffers[spineData.skinnedMeshId];
        }
        var b2 = this._buffers[spineData.skinnedMeshAnimId];
        if (!b2) {
            this._initAnimWebGL(spineData);
            b2 = this._buffers[spineData.skinnedMeshAnimId];
        }

        var gl = this.renderer.gl;
        var shader = this.renderer.shaderManager.plugins.skinnedMeshShader;
        if (this._prevSkeleton !== spineData) {
            gl.bindBuffer(gl.ARRAY_BUFFER, b.uv);
            gl.vertexAttribPointer(shader.attributes.aTextureCoord, 2, gl.FLOAT, false, 8, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, b.skin);
            gl.vertexAttribPointer(shader.attributes.aSkin0, 4, gl.FLOAT, false, 64, 0);
            gl.vertexAttribPointer(shader.attributes.aSkin1, 4, gl.FLOAT, false, 64, 16);
            gl.vertexAttribPointer(shader.attributes.aSkin2, 4, gl.FLOAT, false, 64, 32);
            gl.vertexAttribPointer(shader.attributes.aSkin3, 4, gl.FLOAT, false, 64, 48);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.ib);
            gl.bindBuffer(gl.ARRAY_BUFFER, b2.vb);
            this._ffdSet = false;
        }
        var ffdSet = this._ffdSet;
        //gl.vertexAttribPointer(shader.attributes.aFfd, 2, gl.FLOAT, false, 0, 0);
        var renderer = this.renderer,
            gl = renderer.gl,
            shader = renderer.shaderManager.plugins.skinnedMeshShader,
            bones = skeleton.bones,
            bonesArr = b.bonesArr;
        var drawMode = gl.TRIANGLES;
        var bonesMode = spineData.skinnedMeshBonesMode;

        if (!bonesMode) {
            var sz = 0;
            for (var i = 0; i < bones.length; i++) {
                var bone = bones[i];
                bonesArr[sz++] = bone.m00;
                bonesArr[sz++] = bone.m10;
                bonesArr[sz++] = 0;
                bonesArr[sz++] = bone.m01;
                bonesArr[sz++] = bone.m11;
                bonesArr[sz++] = 0;
                bonesArr[sz++] = bone.worldX;
                bonesArr[sz++] = bone.worldY;
                bonesArr[sz++] = 1;
            }
        }

        var tm = shader.uniforms.projectionMatrix;
        //TODO: dont create new array, please
        this._globalMat = this._globalMat || new PIXI.Matrix();
        renderer.currentRenderTarget.projectionMatrix.copy(this._globalMat).append(spineObj.worldTransform);
        tm.value = this._globalMat.toArray(true);
        shader.uniforms.boneGlobalMatrices.value = bonesArr;
        shader.syncUniforms();
        var uTint = shader.uniforms.tintAlpha;

        var batchStart = 0, batchFinish = -1;
        var tint = new Float32Array(4);

        var slots = skeleton.slots;
        var drawOrder = skeleton.drawOrder;
        var ffdStride = maxWeights * 8;
        for (var i = 0; i < slots.length; i++) {
            var ind = drawOrder[i];
            var slot = slots[ind];
            var attachment = slot.attachment;
            if (!attachment || typeof attachment.skinnedMeshIndex === "undefined") continue;

            var texture = attachment.rendererObject.page.rendererObject;
            var tintChanged = uTint.value[3] != slot.a ||
                uTint.value[0] != slot.r * slot.a ||
                uTint.value[1] != slot.g * slot.a ||
                uTint.value[2] != slot.b * slot.a;
            //handle the batch
            var batchEnd = bonesMode || batchFinish < 0 || batchFinish != attachment.skinnedMeshIndex
                || texture !== this._prevTexture || tintChanged;

            if (slot.ffdMix) {
                for (var j = 0; j < 8; j += 2) {
                    if (slot.ffdMix[j]) {
                        ffdSet = false;
                        break;
                    }
                }
            }
            batchEnd |= !ffdSet;
            if (batchFinish >= 0) {
                if (batchEnd) {
                    gl.drawElements(drawMode, batchFinish - batchStart, gl.UNSIGNED_SHORT, batchStart * 2);
                } else {
                    batchFinish += attachment.skinnedMeshIndexSize;
                    continue;
                }
            }
            batchStart = attachment.skinnedMeshIndex;
            batchFinish = batchStart + attachment.skinnedMeshIndexSize;

            //change everything that we need
            //TODO: what if texture is not loaded yet?
            if (this._prevTexture !== texture) {
                if (!texture._glTextures[gl.id]) {
                    this.renderer.updateTexture(texture);
                }
                else {
                    gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
                }
                this._prevTexture = texture;
            }
            if (tintChanged) {
                uTint.value[3] = slot.a;
                uTint.value[0] = slot.r * slot.a;
                uTint.value[1] = slot.g * slot.a;
                uTint.value[2] = slot.b * slot.a;
                gl.uniform4fv(uTint._location, uTint.value);
            }
            if (!ffdSet) {
                var ffdAlpha = shader.uniforms.ffdAlpha;
                ffdAlpha.value[0] = 0;
                ffdAlpha.value[1] = 0;
                ffdAlpha.value[2] = 0;
                ffdAlpha.value[3] = 0;
                ffdSet = true;
                for (var j = 0; j < 8; j += 2) {
                    if (slot.ffdMix && slot.ffdMix[j]) {
                        gl.vertexAttribPointer(shader.ffdAttr[j], 4, gl.FLOAT, false, ffdStride, slot.ffdMix[j] * 4);
                        gl.vertexAttribPointer(shader.ffdAttr[j + 1], 4, gl.FLOAT, false, ffdStride, (slot.ffdMix[j] + 2) * 4);
                        ffdAlpha.value[j / 2] = slot.ffdMix[j + 1];
                        ffdSet = false;
                    } else {
                        gl.vertexAttribPointer(shader.ffdAttr[j], 4, gl.FLOAT, false, ffdStride, 0);
                        gl.vertexAttribPointer(shader.ffdAttr[j + 1], 4, gl.FLOAT, false, ffdStride, 0);
                    }
                }
                gl.uniform4fv(ffdAlpha._location, ffdAlpha.value);
            }
            //BONES MODE
            if (bonesMode) {
                var bonesIndices = attachment.bonesIndices;
                var sz = 0;
                for (var j = 0; j < bonesIndices.length; j++) {
                    var bone = bones[bonesIndices[j]];
                    bonesArr[sz++] = bone.m00;
                    bonesArr[sz++] = bone.m10;
                    bonesArr[sz++] = 0;
                    bonesArr[sz++] = bone.m01;
                    bonesArr[sz++] = bone.m11;
                    bonesArr[sz++] = 0;
                    bonesArr[sz++] = bone.worldX;
                    bonesArr[sz++] = bone.worldY;
                    bonesArr[sz++] = 1;
                }
                shader.uniforms.boneGlobalMatrices.value = bonesArr;
                gl.uniformMatrix3fv(shader.uniforms.boneGlobalMatrices._location, false, bonesArr);
            }
        }
        if (batchFinish >= 0) {
            gl.drawElements(drawMode, batchFinish - batchStart, gl.UNSIGNED_SHORT, batchStart * 2);
        }
        this._ffdSet = ffdSet;
    };

    SpineMeshRenderer.prototype._initSkinWebGL = function (spineObj) {
        // build the strip!
        var skeleton = spineObj.skeleton;
        var spineData = spineObj.spineData;
        var gl = this.renderer.gl;
        var buf = this._buffers[spineData.skinnedMeshId = ++SpineMeshRenderer.autoincrementMeshId] = {
            uv: gl.createBuffer(),
            skin: gl.createBuffer(),
            ib: gl.createBuffer(),
            data: []
        };

        var maxBones = spineData.bones.length;
        var shader = renderer.shaderManager.plugins.skinnedMeshShader;
        var bonesMode = spineData.skinnedMeshBonesMode = (maxBones > shader.maxBones)?1:0;
        if (bonesMode) {
            maxBones = 1;
        }


        else {
            bonesArr = new Float32Array(spineData.bones.length * this.boneSize);
        }


        var attachments = [];
        for (var i = 0; i < spineData.skins.length; i++) {
            var att = spineData.skins[i].attachments;
            for (var key in att) {
                var a = att[key];
                if (a.type == spine.AttachmentType.boundingbox) continue;
                a.meshOrder = 1000;
                a.meshSlot = +key.split(":")[0];
                attachments.push(a);
            }
        }
        for (var i = 0; i < skeleton.slots.length; i++) {
            var slot = skeleton.slots[i];
            if (slot.attachment)
                slot.attachment.meshOrder = i;
        }
        attachments.sort(function (a, b) {
            return a.meshOrder - b.meshOrder;
        });

        //TODO: what if attachments were changed? :(
        var vertexCount = 0;
        var indexCount = 0;
        var slots = skeleton.slots;
        for (var i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            if (attachment.type == spine.AttachmentType.skinnedmesh ||
                attachment.type == spine.AttachmentType.mesh) {
                vertexCount += attachment.uvs.length / 2;
                indexCount += attachment.triangles.length;
            } else {
                vertexCount += 4;
                indexCount += 6;
            }
        }
        spineData.vertexCount = vertexCount;
        var uv = new Float32Array(2 * vertexCount),
            skin = new Float32Array(16 * vertexCount);
        var indices = new Uint16Array(indexCount);
        buf.vertexCount = vertexCount;

        var vsize = 0, isize = 0, ssize = 0;
        for (var i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            var boneId = spineData.bones.indexOf(spineData.slots[attachment.meshSlot].boneData);
            var v0 = vsize, i0 = isize, s0 = ssize;
            if (attachment.type == spine.AttachmentType.skinnedmesh) {
                var mesh = attachment;
                var si = mesh.skinIndices;
                if (!si) {
                    si = mesh.skinIndices = [];
                    fillWeight(mesh.bones, mesh.weights, si);
                }
                var uvs = mesh.uvs;
                var k = 0;
                for (var j = 0; j < uvs.length; j += 2) {
                    for (var s = 0; s < maxWeights; s++, k += 3) {
                        skin[ssize++] = si[k];
                        if (si[k + 2] >= 0) {
                            skin[ssize++] = mesh.weights[si[k + 2] - 2];
                            skin[ssize++] = mesh.weights[si[k + 2] - 1];
                        } else
                            ssize += 2;
                        skin[ssize++] = si[k + 1];
                    }
                    uv[vsize++] = uvs[j];
                    uv[vsize++] = uvs[j + 1];
                }
                var triangles = mesh.triangles;
                for (var j = 0; j < triangles.length; j++) {
                    indices[isize++] = triangles[j] + v0 / 2;
                }
                if (bonesMode) {
                    var bonesSet = {};
                    var bonesIndices = attachment.bonesIndices = [];
                    var bonesNum = 0;
                    for (var s1 = s0; s1<ssize;s1+=4) {
                        var ss = skin[s1];
                        if (bonesMode && !bonesSet[ss]) {
                            bonesIndices.push(ss);
                            bonesSet[ss] = ++bonesNum;
                        }
                        skin[s1] = bonesSet[ss]-1;
                    }
                    maxBones = Math.max(maxBones, bonesNum);
                    if (bonesNum > shader.maxBones) {
                        console.log("SkinnedMeshRenderer at slot "+ a.meshSlot+" : It seems that your attachment '" + attachment.name
                            + "' depends on too many bones, more than " + shader.maxBones + ". I'm terribly sorry, but it will look like shit.");
                    }
                }
            } else if (attachment.type == spine.AttachmentType.mesh) {
                var mesh = attachment;
                var uvs = mesh.uvs;
                for (var j = 0; j < uvs.length; j += 2) {
                    skin[ssize++] = boneId;
                    skin[ssize++] = mesh.vertices[j];
                    skin[ssize++] = mesh.vertices[j + 1];
                    skin[ssize++] = 1;
                    ssize += 4 * (maxWeights - 1);
                    uv[vsize++] = uvs[j];
                    uv[vsize++] = uvs[j + 1];
                }
                var triangles = mesh.triangles;
                for (var j = 0; j < triangles.length; j++) {
                    indices[isize++] = triangles[j] + v0 / 2;
                }
                if (bonesMode) {
                    attachment.bonesIndices = [boneId];
                }
            } else {
                //sprite
                var region = attachment;
                region.updateOffset();
                for (var j = 0; j < 8; j += 2) {
                    skin[ssize++] = boneId;
                    skin[ssize++] = region.offset[j];
                    skin[ssize++] = region.offset[j + 1];
                    skin[ssize++] = 1;
                    ssize += 4 * (maxWeights - 1);
                    uv[vsize++] = region.uvs[j];
                    uv[vsize++] = region.uvs[j + 1];
                }
                indices[isize++] = v0 / 2 + 0;
                indices[isize++] = v0 / 2 + 1;
                indices[isize++] = v0 / 2 + 2;
                indices[isize++] = v0 / 2 + 2;
                indices[isize++] = v0 / 2 + 3;
                indices[isize++] = v0 / 2 + 0;
                if (bonesMode) {
                    attachment.bonesIndices = [boneId];
                }
            }
            attachment.skinnedMeshSkinOffset = s0;
            attachment.skinnedMeshSkinSize = ssize - s0;
            attachment.skinnedMeshIndex = i0;
            attachment.skinnedMeshIndexSize = isize - i0;
        }
        buf.bonesArr = new Float32Array(9 * maxBones);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv);
        gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.skin);
        gl.bufferData(gl.ARRAY_BUFFER, skin, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    };

    //@hackerham: SOMEONE WAS VERY BAD BOY WRITING THAT FFD SHIT, NOW I NEED THIS COMPLETELY OBFUSCATED FUNCTION
    var was = [];
    var maxWeights = 4;
    var s = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];

    function fillWeight(bones, weights, skinIndices) {
        //take only maximum weights. ignore small
        var weightsOffset = 0;
        var n = 0;
        for (var bonesOffset = 0; bonesOffset < bones.length;) {
            was.length = 0;
            var ww = 0;
            var bonesCount = bones[bonesOffset];
            var v = skinIndices.length;
            var of = weightsOffset + 2;
            //selection sort
            for (var i = 0; i < maxWeights; i++) {
                var ind = -1;
                var ind2 = -1;
                for (var j = 0; j < bonesCount; j++) {
                    if (!was[j] && (ind == -1 ||
                        weights[j * 3 + of] >
                        weights[ind2])) {
                        ind = j;
                        ind2 = j * 3 + of;
                    }
                }
                if (ind == -1) {
                    break;
                }
                was[ind] = true;
                var w = weights[ind2];
                var b = bones[ind + bonesOffset + 1];
                skinIndices.push(b);
                skinIndices.push(weights[ind2]);
                skinIndices.push(ind2);
                ww += w;
            }
            for (var i = v + 1; i < skinIndices.length; i += 3) {
                skinIndices[i] /= ww;
            }
            while (v + 3 * maxWeights > skinIndices.length) {
                skinIndices.push(0);
                skinIndices.push(0);
                skinIndices.push(-1);
            }
            weightsOffset += 3 * bonesCount;
            bonesOffset += 1 + bonesCount;
        }
    };

    SpineMeshRenderer.prototype._initAnimWebGL = function (spineData) {
        var gl = this.renderer.gl;
        var buf = this._buffers[spineData.skinnedMeshAnimId = ++SpineMeshRenderer.autoincrementMeshId] = {
            vb: gl.createBuffer()
        };
        var padding = spineData.vertexCount * maxWeights * 2;

        var size = padding;
        var anims = spineData.animations;
        for (var key in anims) {
            var timelines = anims[key].timelines;
            for (var j = 0; j < timelines.length; j++) {
                var timeline = timelines[j];
                if (timeline instanceof spine.FfdTimeline) {
                    var mesh = timeline.attachment;
                    timeline.skinnedMeshSkinOffset = size;
                    size += mesh.skinnedMeshSkinSize / 2 * timeline.getFrameCount();
                }
            }
        }
        if (size != padding)
            size += padding;
        var vertices = new Float32Array(size);
        if (size != padding) {
            //found anims!
            size = padding;
            for (var i = 0; i < anims.length; i++) {
                var timelines = anims[i].timelines;
                for (var j = 0; j < timelines.length; j++) {
                    var timeline = timelines[j];
                    if (timeline instanceof spine.FfdTimeline) {
                        var mesh = timeline.attachment;
                        var si = mesh.skinIndices;
                        timeline.skinnedMeshSkinOffset = size - mesh.skinnedMeshSkinOffset / 2;
                        for (var t = 0; t < timeline.getFrameCount(); t++) {
                            for (var s = 0; s < si.length; s += 3) {
                                var offset = si[s + 2];
                                if (offset > 0) {
                                    offset = (offset - 2) / 3 * 2;
                                    vertices[size++] = timeline.frameVertices[t][offset];
                                    vertices[size++] = timeline.frameVertices[t][offset + 1];
                                } else {
                                    size += 2;
                                }
                            }
                        }
                    }
                }
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.vb);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    };

    /**
     * Starts a new mesh renderer.
     *
     */
    SpineMeshRenderer.prototype.start = function () {
        var shader = this.renderer.shaderManager.plugins.skinnedMeshShader;

        this.renderer.shaderManager.setShader(shader);

        var gl = this.renderer.gl;

        gl.activeTexture(gl.TEXTURE0);

        this.renderer.blendModeManager.setBlendMode(PIXI.BLEND_MODES.NORMAL);

        this._prevTexture = null;
        this._prevSkeleton = null;
    };

    /**
     * Empties the current batch.
     *
     */
    SpineMeshRenderer.prototype.flush = function () {
        this._prevTexture = null;
        this._prevSkeleton = null;
    };

    /**
     * Destroys the Mesh renderer
     *
     */
    SpineMeshRenderer.prototype.destroy = function () {
        core.ObjectRenderer.prototype.destroy.call(this);
    };

    var proto = spine.FfdTimeline.prototype.apply;
    spine.FfdTimeline.prototype.apply = function (skeleton, lastTime, time, firedEvents, alpha) {
        var offset = this.skinnedMeshSkinOffset;
        if (typeof offset === "undefined")
            return proto.call(this, skeleton, lastTime, time, firedEvents, alpha);
        var slot = skeleton.slots[this.slotIndex];
        if (slot.attachment != this.attachment) return;
        var siLen = this.attachment.skinnedMeshSkinSize / 2;
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.
        if (!slot.ffdMix) slot.ffdMix = [];
        if (alpha == 1) slot.ffdMix.length = 0;
        if (time >= frames[frames.length - 1]) {
            slot.ffdMix.push(offset + (frames.length - 1) * siLen);
            slot.ffdMix.push(alpha);
            return;
        }
        var frameIndex = spine.Animation.binarySearch1(frames, time);
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 1] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex - 1, percent < 0 ? 0 : (percent > 1 ? 1 : percent));
        slot.ffdMix.push(offset + (frameIndex - 1) * siLen);
        slot.ffdMix.push(alpha * (1 - percent));
        slot.ffdMix.push(offset + frameIndex * siLen);
        slot.ffdMix.push(alpha * percent);
    };

    //TODO: add new interaction check

    core.spine.Spine.prototype.hideSlots = function() {
        for (var i=0;i<this.slotContainers.length;i++) {
            this.slotContainers[i].visible = false;
        }
    }

    core.spine.Spine.prototype._renderWebGL = function (renderer) {
        this.hideSlots();
        var plugin = renderer.plugins.spineMesh;
        renderer.setObjectRenderer(plugin);
        plugin.render(this);
    };

    var boundaryCacheLag = options.boundaryCacheLag;

    var up = core.spine.Spine.prototype.update;
    core.spine.Spine.prototype.update = function (dt) {
        if (!this.spineData.skinnedMeshId) {
            //update? why?
            return up.call(this, dt);
        }
        this.state.update(dt);
        this.state.apply(this.skeleton);
        this.skeleton.updateWorldTransform();
    };

    core.spine.Spine.prototype.getLocalBounds = function() {
        if (!this.spineData.skinnedMeshId)
            return PIXI.Container.prototype.getLocalBounds.call(this);
        for (var i=0;i<this.slotContainers.length;i++)
            if (this.slotContainers[i].visible) {
                return PIXI.Container.prototype.getLocalBounds.call(this);
            }
        up.call(this, 0);
        var bounds = PIXI.Container.prototype.getLocalBounds.call(this);
        this.hideSlots();
        return bounds;
    };

    core.spine.Spine.prototype.getBounds = function() {
        if (!this.spineData.skinnedMeshId || !this.parent)
            return core.Container.prototype.getBounds.call(this);
        var now = Date.now();
        var old = now - boundaryCacheLag;
        var hasFilter = this._mask || this._filters && this._filters.length;
        if (hasFilter || !this._boundsCache || this._boundsCacheTime < old || this._boundsCacheTime > now) {
            up.call(this, 0);
            PIXI.Container.prototype.updateTransform.call(this);
            this._boundsCache = core.Container.prototype.getBounds.call(this);
            this._boundsCacheTime = now;
            this.hideSlots();
        }
        return this._boundsCache;
    };

    core.spine.Spine.prototype.containsPoint = function(point) {
        if (!this.getBounds().contains(point.x, point.y))
            return false;
        var skeleton = this.skeleton;
        var boundsUpdated = !this.spineData.skinnedMeshId;
        for (var i=0;i<skeleton.slots.length;i++) {
            var slot = skeleton.slots[i];
            if (slot.attachment) {
                var ch = slot.currentSprite || slot.currentMesh;
                if (ch) {
                    if (ch.visible && !ch._currentBounds) {
                        //update bounds in this tick!
                        if (!boundsUpdated) {
                            this._boundsCache = null;
                            this.getBounds();
                            boundsUpdated = true;
                        }
                    }
                    if (ch.containsPoint(point)) return true;
                }
            }
        }
        return false;
    };
}; // end patch pixi spine

patchPixiSpine( {
    boundaryCacheLag: 200 //getBounds() cache lag in millis
});
