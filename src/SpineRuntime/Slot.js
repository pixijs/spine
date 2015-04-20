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

