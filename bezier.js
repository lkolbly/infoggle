
var sub2f = function(p1, p2) {
    return {x: p1.x-p2.x, y: p1.y-p2.y};
    }

    var mult2f = function(p, s) {
    return {x: p.x*s, y: p.y*s};
}

var add2f = function(p1, p2) {
    return {x: p1.x+p2.x, y: p1.y+p2.y};
}

var len2f = function(v) {
    return Math.sqrt(v.x*v.x+v.y*v.y);
}

var norm2f = function(v) {
    var l = Math.sqrt(v.x*v.x+v.y*v.y);
    return {x: v.x/l, y: v.y/l};
}

var dist2f = function(p1, p2) {
    var v = sub2f(p2, p1);
    return Math.sqrt(v.x*v.x+v.y*v.y);
}

var avg2f = function(p1, p2) {
    return mult2f(add2f(p1, p2), 0.5);
}

var angleToX = function(v) {
    var dot = norm2f(v);
    return Math.atan2(dot.y, dot.x);
}

var fuzzyQuad = function(v) {
    var a = angleToX(v);
    while (a < 0.0) {
        a += 2.0 * 3.14159265;
    }
    var pi_8 = 3.14159265/8.0 * 2.0;
    for (var i=0; i<8; i++) {
        var min = pi_8 * i - pi_8/2.0;
        var max = pi_8 * i + pi_8/2.0;
        if (min <= a && a <= max) {
            return i;
        }
    }
    return 0;
}

var bezier = {

    renderPath: function(path, ctx, width) {
        function RAD2DEG(v) {
            return v * 360.0 / 2.0 / 3.14159265;
        }

    var ENABLE_DEBUG = false;

    ctx.moveTo(path[0].x, path[0].y);
    var last_dir = norm2f(sub2f(path[0], path[1]));
    var last_perps = null;//jsBezier.perpendicularToCurveAt([path[0], ctrl1, ctrl2, path[i]], 0.0, width);
    var pnts_1 = [];
    var pnts_2 = [];
    for (var i=1; i<path.length; i++) {
        var dir;
        if (i+1 < path.length) {
            dir = norm2f(sub2f(path[i+1], path[i-1]));
        } else {
            dir = norm2f(sub2f(path[i], path[i-1]));
        }

        dir = mult2f(dir, 10.0);
        var ctrl1 = add2f(path[i-1], last_dir);
        var ctrl2 = sub2f(path[i], dir);
        if (ENABLE_DEBUG) {
            ctx.moveTo(path[i-1].x, path[i-1].y);
            ctx.bezierCurveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, path[i].x, path[i].y);
        }

        // Draw the perps
        //console.log(jsBezier.pointOnCurve([path[i-1], ctrl1, ctrl2, path[i]], 0.5));
        ctx.stroke();

        if (ENABLE_DEBUG) {
            ctx.beginPath();
            ctx.arc(path[i].x, path[i].y, 8, 0, 2.0*Math.PI);
            ctx.stroke();
        }

        if (last_perps === null)
        last_perps = jsBezier.perpendicularToCurveAt([path[i], ctrl2, ctrl1, path[i-1]], 0.0, width);
        for (var d=0.001; d<0.999; d+=0.1) {
            var perps = jsBezier.perpendicularToCurveAt([path[i], ctrl2, ctrl1, path[i-1]], d, width);

            // Should we swap the two perps?
            //console.log(perps);
            //console.log(last_perps);
            var d0 = dist2f(perps[0], last_perps[0]);
            var d1 = dist2f(perps[1], last_perps[1]);
            var d2 = dist2f(perps[1], last_perps[0]);
            var d3 = dist2f(perps[0], last_perps[1]);
            if (d1 > d2 && d0 > d3 && true) {
                var tmp = perps[0];
                perps[0] = perps[1];
                perps[1] = tmp;
                //console.log("Swap! "+d1+" "+d2+" "+d0+" "+d3);

                if (ENABLE_DEBUG && false) {
                ctx.beginPath();
                ctx.arc(perps[0].x, perps[0].y, 2, 0, 2.0*Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(perps[1].x, perps[1].y, 2, 0, 2.0*Math.PI);
                ctx.stroke();
                }
            } else {
               // console.log("NO swap! "+d1+" "+d2+" "+d0+" "+d3);
            }

            pnts_1.push(perps[0]);
            pnts_2.push(perps[1]);

            /*ctx.beginPath();
            ctx.moveTo(last_perps[0].x, last_perps[0].y);
            ctx.lineTo(perps[0].x, perps[0].y);
            ctx.moveTo(last_perps[1].x, last_perps[1].y);
            ctx.lineTo(perps[1].x, perps[1].y);
            ctx.stroke();*/
            last_perps = perps;

            if (ENABLE_DEBUG && true) {
                ctx.beginPath();
                ctx.arc(perps[0].x, perps[0].y, 1, 0, 2.0*Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(perps[1].x, perps[1].y, 1, 0, 2.0*Math.PI);
                ctx.stroke();
            }
        }

        ctx.beginPath();
        ctx.moveTo(path[i].x, path[i].y);

        //console.log(perps);

        /*console.log("Drew curve");
        console.log(last_dir);
        console.log(dir);
        console.log(ctrl1);
        console.log(ctrl2);*/
        last_dir = dir;
    }

        if (true) {

    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pnts_1[0].x, pnts_1[0].y);
    for (var i=1; i<pnts_1.length; i++) {
        ctx.lineTo(pnts_1[i].x, pnts_1[i].y);
        //console.log(pnts_1[i]);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pnts_2[0].x, pnts_2[0].y);
    for (var i=1; i<pnts_2.length; i++) {
        ctx.lineTo(pnts_2[i].x, pnts_2[i].y);
        //console.log(pnts_2[i]);
    }
    ctx.stroke();

            if (true) {
            var quad1 = fuzzyQuad(sub2f(pnts_1[0], pnts_1[1]));
            var quad2 = fuzzyQuad(sub2f(pnts_1[pnts_1.length-1], pnts_1[pnts_1.length-2]));

    // Render endcaps
    var p1 = pnts_1[0];
    var p2 = pnts_2[1];
                var v1 = mult2f(norm2f(sub2f(pnts_1[0], pnts_1[7])), 15.0);
                var v2 = mult2f(norm2f(sub2f(pnts_2[0], pnts_2[7])), 15.0);
                var da = angleToX(v1) - angleToX(v2);
                /*console.log(da);
                if (da > 3.14159265/2.0 || da < -3.14159265/2.0) {
                    v1 = sub2f({x:0,y:0,z:0}, v1);
                }

                da = quad1*3.14159265/4.0 - angleToX(v2);
                console.log(quad1+" "+da+" "+RAD2DEG(angleToX(v1)));
                if ((da > 3.14159265/2.0 || da < -3.14159265/2.0) && !(3.14159265*1.8 < da)) {
                    v1 = sub2f({x:0,y:0,z:0}, v1);
                    v2 = sub2f({x:0,y:0,z:0}, v2);
                }*/

    var ctrl1 = add2f(v1, p1);
    var ctrl2 = add2f(v2, p2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, p2.x, p2.y);
    //ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

                // Render the other endcap
                var l = pnts_1.length;
    p1 = pnts_1[l-1];
    p2 = pnts_2[l-1];
                v1 = mult2f(norm2f(sub2f(pnts_1[l-1], pnts_1[l-7])), 15.0);
                v2 = mult2f(norm2f(sub2f(pnts_2[l-1], pnts_2[l-7])), 15.0);

                /*da = angleToX(v1) - angleToX(v2);
                if (da > 3.14159265/2.0 || da < -3.14159265/2.0) {
                    v2 = sub2f({x:0,y:0,z:0}, v2);
                }

                da = quad2*3.14159265/4.0 - angleToX(v1);
                if ((da > 3.14159265/2.0 || da < -3.14159265/2.0) && !(3.14159265*1.5 < da)) {
                    v1 = sub2f({x:0,y:0,z:0}, v1);
                    v2 = sub2f({x:0,y:0,z:0}, v2);
                }*/

    ctrl1 = add2f(v1, p1);
    ctrl2 = add2f(v2, p2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, p2.x, p2.y);
    //ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
            }

            if (false) {
            // Figure out if either of the endcaps should be reversed
            var quad1 = fuzzyQuad(sub2f(pnts_1[0], pnts_1[1]));
            var quad2 = fuzzyQuad(sub2f(pnts_1[pnts_1.length-1], pnts_1[pnts_1.length-2]));
            var rev1=false, rev2=false;
            console.log(quad1+" "+quad2);
            var pi_4 = 3.14159265/4.0;
            var dirs1 = [0.0, pi_4, pi_4*2, pi_4*3,
                         pi_4*4, pi_4*5, pi_4*6+pi_4/2.0, pi_4*7];
            var dirs2 = [0.0, pi_4, pi_4*2, pi_4*3,
                         pi_4*4, pi_4*5, pi_4*6, pi_4*7];
            /*switch (quad1) {
            case 4:
            case 1:
                rev1 = true;
            }
            if (quad2 == 2 || quad2 == 7) {
                rev2 = true;
            }*/

            // Find the endcaps' centerpoints
            var cap1 = avg2f(pnts_1[0], pnts_2[0]);
            var dir = angleToX(sub2f(pnts_2[0], pnts_1[0]));
            if (rev1) dir = dir+3.14159265;
            dir = dirs1[quad1] - pi_4*2;
            //console.log(dir);
            ctx.beginPath();
            ctx.arc(cap1.x, cap1.y, len2f(sub2f(pnts_2[0], pnts_1[0]))/2.0, dir-0.1, 3.14159265+dir+0.1);
            ctx.stroke();

            var cap2 = avg2f(pnts_1[pnts_1.length-1],
                             pnts_2[pnts_2.length-1]);
            dir = angleToX(sub2f(pnts_1[pnts_1.length-1],
                                 pnts_2[pnts_2.length-1])) + 3.14159265;
            if (rev2) dir = -dir + 3.14159265;
            dir = dirs2[quad2] - pi_4*2;
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.arc(cap2.x, cap2.y, len2f(sub2f(pnts_1[pnts_1.length-1],
                                                pnts_2[pnts_2.length-1]))/2.0, dir-0.1, 3.14159265+dir+0.1);
            ctx.stroke();
            //ctx.lineWidth = 1;
            }
        }
}
/*
$(function() {
    return;

    //alert("hi");
    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
    ctx.scale(1,1);
    ctx.lineWidth=1;
    ctx.beginPath();
    //ctx.moveTo(32,32);
    //ctx.bezierCurveTo(20,100,200,100,200,20);
    //renderPath([{x:32,y:32}, {x:64,y:32}, {x:64,y:64}], ctx, 15);
    renderPath([{x:32,y:32}, {x:64,y:32}, {x:64,y:64}, {x:64,y:96},
                {x:96,y:128}, {x:96,y:96}],
               ctx, 16);
    ctx.stroke();

    //

    var bounds = {x:0, y:0, width:1024, height:1024};
    var quad = new QuadTree(bounds);
    for (var i=0; i<1000; i++) {
        quad.insert({x:i, y:i});
    }
    console.log(quad.retrieve({x: 11, y:20}));
});*/
};
