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

