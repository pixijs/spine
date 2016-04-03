var spine = require('../SpineUtil');
spine.AttachmentType = {
    region: 0,
    boundingbox: 1,
    mesh: 2,
    weightedmesh : 3,
    skinnedmesh: 3,
    linkedmesh: 4,
    weightedlinkedmesh: 5
};
module.exports = spine.AttachmentType;

