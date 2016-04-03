module.exports = {
    radDeg: 180 / Math.PI,
    degRad: Math.PI / 180,
    temp: [],
    Float32Array: (typeof(Float32Array) === 'undefined') ? Array : Float32Array,
    Uint16Array: (typeof(Uint16Array) === 'undefined') ? Array : Uint16Array,
    signum: function(x) {
        if (x>0) return 1;
        if (x<0) return -1;
        return 0;
    }
};

