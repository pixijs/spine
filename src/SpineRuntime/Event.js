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

