function Point(x, y) {
    if(!(this instanceof Point)) {
        return new Point(x, y);
    }

    switch (true) {
        case ((x instanceof Point) && (typeof y === 'undefined')):
            this.x = x.x;
            this.y = x.y;
            break;
        case ((typeof x === 'number') && (typeof y === 'number')):
            this.x = x;
            this.y = y;
            break;
        default:
            this.x = 0;
            this.y = 0;
    }
}

Point.prototype.getLength = function getLength() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point.prototype.getScalarMult = function getScalarMult(v2) {
    return this.x * v2.x + this.y * v2.y;
};

Point.prototype.normalize = function normalize() {
    var vectorLength = this.getLength();

    this.x /= vectorLength;
    this.y /= vectorLength;
};

function Edge(a, b, c, d) {
    if(!(this instanceof Edge)) {
        return new Edge(a, b, c, d);
    }

    if(arguments.length === 2) {
        this.p1 = a;
        this.p2 = b;
    }

    if(arguments.length === 4) {
        this.p1 = new Point(a, b);
        this.p2 = new Point(c, d);
    }
}

function CurveSegment(x, y) {
    if(( typeof x === 'undefined') || ( typeof y === 'undefined')) {
        this.C0 = new Point();
        this.C1 = new Point();
        this.C2 = new Point();
        this.C3 = new Point();
    } else {
        this.C0 = new Point(x, y);
        this.C1 = new Point(x, y);
        this.C2 = new Point(x, y);
        this.C3 = new Point(x, y);
    }
}
    
var ecf = (function() {
    var curve,
        vectorDistMap,
        MAX_ANGLE = Math.PI / 4,
        MAX_ERROR = 3,
        MAX_N_ITERATION = 4,
        BOX_SIZE = 40,
        INCREASE_K = 0.2,
        LINE_D = 50,
        N = 50,
        drawingFieldWidth, drawingFieldHeight,
        o,
        iterations = 0,
        breakFlag = false,
        rasterBorder = {
            minx: 0,
            miny: 0,
            maxx: 0,
            maxy: 0
        };
        
    function getVectorAngle(v1, v2) {
        var scalarMult = v1.getScalarMult(v2),
            d1 = v1.getLength(), d2 = v2.getLength();
        
        return Math.acos(scalarMult / (d1 * d2));
    }
    
    function testCorner(x, y, seg) {
        var angle = getVectorAngle(new Point(seg.C2.x - seg.C3.x, seg.C2.y - seg.C3.y), 
                                   new Point(x - seg.C3.x, y - seg.C3.y));
        
        console.log(angle + ' ' + MAX_ANGLE);
        if (angle < MAX_ANGLE) {
            return true;
        } else {
            return false;
        }
    }
    
    function drawPixel(p, ctx, pixels) {
        var index = p.y * pixels.width + p.x;
        
        pixels.data[index] = 1;
        pixels.data[index + 1] = 0;
        pixels.data[index + 2] = 0;
        pixels.data[index + 3] = 255;
    }
    
    function rasterize(edges) {
        var points = [],
            ymax = 0, ymin = drawingFieldHeight, temp,
            i, max_i,
            j, max_j,
            ET = [],
            index, edge,
            SLB = [],
            activeFlag = false,
            pixelIterator = 0,
            SLBIterator = 0;
        
        for (i = 0, max_i = edges.length; i < max_i; i += 1) {
            edge = edges[i];
            if (edge.p1.y > edge.p2.y) {
                temp = edge.p2;
                edge.p2 = edge.p1;
                edge.p1 = temp;
            }
            
            if (edge.p1.y < ymin) {
                ymin = edge.p1.y;
            }
            
            if (edge.p2.y > ymax) {
                ymax = edge.p2.y;
            }
            
            edge.startY = drawingFieldHeight - Math.floor(drawingFieldHeight - edge.p1.y);
            edge.k = (edge.p2.x - edge.p1.x) / (edge.p2.y - edge.p1.y);
            edge.startX = edge.p1.x + (edge.startY - edge.p1.y) * edge.k;
            
            edge.stopY = Math.floor(edge.p2.y);
            
            o.ctx.moveTo(edge.p1.x, edge.p1.y);
            o.ctx.lineTo(edge.p2.x, edge.p2.y);
            o.ctx.stroke();
        }
        
        for (i = edges.length - 1; i >= 0; i -= 1) {
            if (edges[i].p1.y === edges[i].p2.y) {
                edges.splice(i, 1);
            }
        }
        
        ymax = Math.floor(ymax);
        ymin = drawingFieldHeight - Math.floor(drawingFieldHeight - ymin);
        
        ET = new Array(ymax - ymin + 1);
        
        for (i = 0, max_i = edges.length; i < max_i; i += 1) {
            index = edges[i].startY - ymin;
            if (typeof ET[index] === 'undefined') {
                ET[index] = [];
            }
            ET[index].push(edges[i]);
        }
        
        for (i = ymin, max_i = ymax; i <= max_i; i += 1) {
            for (j = SLB.length - 1; j >= 0; j -= 1) {
                SLB[j].startX += SLB[j].k;
            }
            
            if ((typeof ET[i - ymin] !== 'undefined') && (ET[i - ymin].length > 0)) {
                SLB = SLB.concat(ET[i - ymin]);
                SLB.sort(function (a, b) {
                    if (a.startX - b.startX !== 0){
                        return a.startX - b.startX;
                    } else {
                        return a.p2.x - b.p2.x;
                    }
                });
            }
            
            for (j = SLB.length - 1; j >= 0; j -= 1) {
                if (SLB[j].stopY === i) {
                    SLB.splice(j, 1);
                }
            }
            
            if (SLB.length > 1) {
                pixelIterator = Math.round(SLB[0].startX);
                activeFlag = true;
                SLBIterator = 1;
                
                do {
                    if (activeFlag) {
                        points.push({x: pixelIterator, y: i});
                        if (pixelIterator > rasterBorder.maxx) {
                            rasterBorder.maxx = pixelIterator;
                        }
                        if (pixelIterator < rasterBorder.minx) {
                            rasterBorder.minx = pixelIterator;
                        }
                        if (i > rasterBorder.maxy) {
                            rasterBorder.maxy = i;
                        }
                        if (i < rasterBorder.miny) {
                            rasterBorder.miny = i;
                        }
                    }
                    pixelIterator++;
                    
                    if ((activeFlag) && (pixelIterator > Math.round(SLB[SLBIterator].startX)) ||
                       (!activeFlag) && (pixelIterator >= Math.round(SLB[SLBIterator].startX)))  {
                        SLBIterator++;
                        activeFlag = !activeFlag;
                    }
                } while (SLBIterator < SLB.length);
            }
        }
        return points;
    }
    
    function getDistanceVectorLine (n, p, xPrev, yPrev) {
        var distance,
            returnV;
        
        distance = n.getScalarMult(new Point(p.x - xPrev, p.y - yPrev));
        returnV = new Point(n.x * distance, n.y * distance);
        
        return returnV;
    }
    
    function normDerVector(v) {
        v.fx.normalize();
        v.fy.normalize();
    }
    
    function getDistanceDeffVectorLine (points, x, y, xPrev, yPrev, n) {
        var distance, dy, dx, i;
        
        if (points.length > 1) {
            distance = getDistanceVectorLine(n, points[0], xPrev, yPrev);
            dy = getDistanceVectorLine(n, new Point(points[0].x, points[0].y + 1), xPrev, yPrev);
            dx = getDistanceVectorLine(n, new Point(points[0].x + 1, points[0].y), xPrev, yPrev);
            
            return {
                fx: new Point(dx.x - distance.x, dy.x - distance.x),
                fy: new Point(dx.y - distance.y, dy.y - distance.y)
            };
        } else {
            return {
                fx: new Point(),
                fy: new Point()
            };
        }
    }
    
    function getDistanceVectorPoint (xPrev, yPrev, p) {
        var d = new Point(p.x - xPrev, p.y - yPrev);
        
        return d;
    }
    
    function getDistanceDeffVectorPoint (points, xPrev, yPrev) {
        var distance, dy, dx;
        
        if (points.length > 1) {
            distance = getDistanceVectorPoint(xPrev, yPrev, points[0]);
            dy = getDistanceVectorPoint(xPrev, yPrev, new Point(points[0].x, points[0].y + 1));
            dx = getDistanceVectorPoint(xPrev, yPrev, new Point(points[0].x + 1, points[0].y));
            
            return {
                fx: new Point(dx.x - distance.x, dy.x - distance.x),
                fy: new Point(dx.y - distance.y, dy.y - distance.y)
            };
        } else {
            return {
                fx: new Point(),
                fy: new Point()
            };
        }
    }
    
    function processPoints(points, dV, oV, vectorDistMap, n, xPrev, yPrev) {
        var i, max_i,
            v = new Point(),
            v2,
            l;
        
        for (i = 0, max_i = points.length - 1; i < max_i; i += 1) {
            v = new Point(oV.x + (points[i + 1].x - points[0].x) * dV.fx.x +
                                 (points[i + 1].y - points[0].y) * dV.fx.y, 
                          oV.y + (points[i + 1].x - points[0].x) * dV.fy.x +
                                 (points[i + 1].y - points[0].y) * dV.fy.y);
            
            try {
            if (vectorDistMap[points[i + 1].y][points[i + 1].x].nil === true) {
                vectorDistMap[points[i + 1].y][points[i + 1].x] = v;
                vectorDistMap[points[i + 1].y][points[i + 1].x].nil = false;
            } else {
                if (vectorDistMap[points[i + 1].y][points[i + 1].x].getLength() > v.getLength()) {
                    vectorDistMap[points[i + 1].y][points[i + 1].x] = v;
                }
            }
            } catch (e) {
                
            }
        }
    }
    
    function renderLineCell(xPrev, yPrev, x, y, fieldRadius, vectorDistMap) {
        var edges = [],
            n = new Point(y - yPrev, - (x - xPrev)),
            nF = new Point(),
            points, oV = new Point(),
            dV = new Point();
        
        n.normalize();
        nF = new Point(n.x * fieldRadius, n.y * fieldRadius);
        
        edges.push(new Edge(new Point(x + nF.x, y + nF.y), new Point(xPrev + nF.x, yPrev + nF.y)));
        edges.push(new Edge(new Point(xPrev + nF.x, yPrev + nF.y), new Point(xPrev - nF.x, yPrev - nF.y)));
        edges.push(new Edge(new Point(xPrev - nF.x, yPrev - nF.y), new Point(x - nF.x, y - nF.y)));
        edges.push(new Edge(new Point(x - nF.x, y - nF.y), new Point(x + nF.x, y + nF.y)));
        
        points = rasterize(edges);
        
        if (points.length > 0) {
            dV = getDistanceDeffVectorLine(points, x, y, xPrev, yPrev, n);
            oV = getDistanceVectorLine(n, points[0], xPrev, yPrev);
            processPoints(points, dV, oV, vectorDistMap, n, xPrev, yPrev);
        }
    }
    
    function renderPointCell(xPrev, yPrev, fieldRadius, vectorDistMap) {
        var edges = [],
            points, oV = new Point(),
            dV = new Point();
        
        edges.push(new Edge(new Point(xPrev - fieldRadius, yPrev + fieldRadius), new Point(xPrev + fieldRadius, yPrev + fieldRadius)));
        edges.push(new Edge(new Point(xPrev + fieldRadius, yPrev + fieldRadius), new Point(xPrev + fieldRadius, yPrev - fieldRadius)));
        edges.push(new Edge(new Point(xPrev + fieldRadius, yPrev - fieldRadius), new Point(xPrev - fieldRadius, yPrev - fieldRadius)));
        edges.push(new Edge(new Point(xPrev - fieldRadius, yPrev - fieldRadius), new Point(xPrev - fieldRadius, yPrev + fieldRadius)));
        
        points = rasterize(edges);
        
        if (points.length > 0) {
            dV = getDistanceDeffVectorPoint(points, xPrev, yPrev);
            oV = getDistanceVectorPoint(xPrev, yPrev, points[0]);
            processPoints(points, dV, oV, vectorDistMap, null, xPrev, yPrev);
        }
    }
    
    function drawArrow(s, f, c) {
        var v = new Point(f.x - s.x, f.y - s.y),
            n = new Point(v.y, -v.x),
            ARROW_HEIGHT = 10,
            ARROW_WIDTH = 5;
            
        v.normalize();
        v.x *= ARROW_HEIGHT;
        v.y *= ARROW_HEIGHT;
        
        n.normalize();
        n.x *= ARROW_WIDTH / 2;
        n.y *= ARROW_WIDTH / 2;
        
        c.beginPath();
        c.moveTo(f.x - v.x + n.x, f.y - v.y + n.y);
        c.lineTo(f.x, f.y);
        c.lineTo(f.x - v.x - n.x, f.y - v.y - n.y);
        c.closePath();
        
        c.lineWidth = 0.3;
        c.strokeStyle = 'black';
        c.stroke();
        c.fill();
        
        c.beginPath();
        c.moveTo(s.x, s.y);
        c.lineTo(f.x, f.y);
        c.closePath();
        
        c.lineWidth = 0.3;
        c.strokeStyle = 'black';
        c.stroke();
    }
    
    function drawCurve(o, seg, ctx, noClear) {
       
        var c;

        if( typeof ctx === 'undefined') {
            c = o.ctx;
        } else {
            c = ctx;
        }

        if (noClear !== true) {
            c.clearRect(0, 0, o.c.width(), o.c.height());
        }
        
        c.beginPath();
        c.moveTo(seg.C0.x, seg.C0.y);
        c.bezierCurveTo(seg.C1.x, seg.C1.y, seg.C2.x, seg.C2.y, seg.C3.x, seg.C3.y);
        c.lineWidth = 3;
        c.strokeStyle = 'green';
        c.stroke();
        c.closePath();
        
        drawArrow(seg.C0, seg.C1, c);
        drawArrow(seg.C3, seg.C2, c);

    }
    
    function updateCurveSegment(x, y, seg) {
        var prev = new Point(seg.C3),
            error = 0, nIteration = 0,
            f1, f2,
            i, max_i,
            p = new Point(),
            dp = new Point(),
            d,
            projection = 0,
            v = new Point((seg.C3.x - seg.C0.x) / 3, (seg.C3.y - seg.C0.y) / 3);
        
        
        if (testCorner(x, y, seg)) {
            return 'CORNER';
        }
        
        saveControlVertices(seg);
        
        seg.C3 = new Point(x, y);
        seg.C2 = new Point(seg.C2.x + (x - prev.x), seg.C2.y + (y - prev.y));
        
        if (v.getLength() < LINE_D) {
            seg.C2.x = seg.C3.x - v.x;
            seg.C2.y = seg.C3.y - v.y;
            
            if(seg.constrainted === true) {
                projection = seg.tan.getScalarMult(v);
                v = new Point(projection * seg.tan.x, projection * seg.tan.y);
            }
            
            seg.C1.x = seg.C0.x + v.x;
            seg.C1.y = seg.C0.y + v.y;
        }
        
        renderLineCell(prev.x, prev.y, x, y, BOX_SIZE, vectorDistMap);
        renderPointCell(prev.x, prev.y, BOX_SIZE, vectorDistMap);
        
        //drawCurve(o, seg);
        
        do {
            f1 = new Point(); f2 = new Point();
            error = 0;
            
            for (i = 0, max_i = N; i < max_i; i += 1) {
                p = calc(seg, ti[i]);
                dp = interpVectorDist(vectorDistMap, p.x, p.y);
                d = dp.getLength();
                
                
                if (d > error) {
                    error = d;
                }
               
                error += d;
                
                f1.x += 6 * ti[i] * (1 - ti[i]) * (1 - ti[i]) * d * dp.x / N;
                f1.y += 6 * ti[i] * (1 - ti[i]) * (1 - ti[i]) * d * dp.y / N;
                
                f2.x += 6 * ti[i] * ti[i] * (1 - ti[i]) * d * dp.x / N;
                f2.y += 6 * ti[i] * ti[i] * (1 - ti[i]) * d * dp.y / N;
            }
            
            error /= N;
            
            if (seg.constrainted === true) {
                projection = seg.tan.getScalarMult(f1);
                f1 = new Point( projection * seg.tan.x, projection * seg.tan.y);
            }
            
            seg.C1.x = seg.C1.x - INCREASE_K * f1.x;
            seg.C1.y = seg.C1.y - INCREASE_K * f1.y;
            
            seg.C2.x = seg.C2.x - INCREASE_K * f2.x;
            seg.C2.y = seg.C2.y - INCREASE_K * f2.y;
            
            //drawCurve(o, seg);
            
            nIteration++;
        } while ((nIteration < MAX_N_ITERATION));
        
        /*
        if (breakFlag) {
            breakFlag = false;
            resetControlVertices(seg);
            return 'FAILURE';
        }
        drawCurve(o, seg);
        breakFlag = false;
        return 'SUCCESS';*/
        
        if (error < MAX_ERROR) { 
            drawCurve(o, seg);
            breakFlag = false;
            return 'SUCCESS';
        } else {
            resetControlVertices(seg);
            return 'FAILURE';
        }
    }
    
    function saveControlVertices(seg) {
        if (typeof seg.save === 'undefined') {
            seg.save = {};
        }
        
        seg.save.C1 = seg.C1;
        seg.save.C2 = seg.C2;
        seg.save.C3 = seg.C3;
    }
    
    function resetControlVertices(seg) {
        if (typeof seg.save !== 'undefined') {
            seg.C1 = seg.save.C1;
            seg.C2 = seg.save.C2;
            seg.C3 = seg.save.C3;
        }
    }
    
    function clearVectorDistMap(w, h) {
        var i, max_i, j, max_j, newArr, nullPoint;
        
        w = Math.floor(w); h = Math.floor(h);
        
        max_i = h; max_j = w;
        vectorDistMap = [];

        for( i = 0; i < h; i += 1) {
            newArr = [];

            for( j = 0; j < w; j += 1) {
                nullPoint = new Point();
                nullPoint.nil = true;
                newArr.push(nullPoint);
            }

            vectorDistMap.push(newArr);
        }

        rasterBorder.minx = w;
        rasterBorder.maxx = 0;
        
        rasterBorder.miny = h;
        rasterBorder.maxy = 0;
    }
    
    function clearRaster (rasterBorder, vectorDistMap, o) {
        var i, j,
            max_i, max_j;
        
        for (i = rasterBorder.miny, max_i = rasterBorder.maxy; i < max_i; i += 1) {
            for (j = rasterBorder.minx, max_j = rasterBorder.maxx; j < max_j; j += 1) {
                vectorDistMap[i][j] = new Point();
                vectorDistMap[i][j].nil = true;
            }
        }
        
        rasterBorder.minx = o.c.width();
        rasterBorder.maxx = 0;
        
        rasterBorder.miny = o.c.height();
        rasterBorder.maxy = 0;
    }
    
    function initParametricCurve() {
        curve = {
            curveSeg: [new CurveSegment()]
        };
    }
    
    function initCurveSegment(x, y, seg, next_x, next_y) {
        seg.C0 = Point(x, y);
        seg.C1 = Point(x, y);
        seg.C2 = Point(x, y);
        seg.C3 = Point(x, y);
    }

    function initLocalVariables() {
        var i, max_i,
            TRASHOLD_K = 0,
            TRASHOLD_V = Math.floor(N * TRASHOLD_K);
        
        ti = [];
        
        for (i = 0, max_i = N; i < max_i; i += 1) {
            ti.push((i + 1 + TRASHOLD_V) / (N + 2 * TRASHOLD_V));
        }
    }
    
    function calc(seg, t) {
        var x, y;
        
        //t = Math.pow(t, 1 / 2);
        
        x = seg.C0.x * (1 - t) * (1 - t) * (1 - t) + 
        3 * seg.C1.x * t * (1 - t) * (1 - t) + 
        3 * seg.C2.x * t * t * (1 - t) + 
            seg.C3.x * t * t * t;
            
        y = seg.C0.y * (1 - t) * (1 - t) * (1 - t) + 
        3 * seg.C1.y * t * (1 - t) * (1 - t) + 
        3 * seg.C2.y * t * t * (1 - t) + 
            seg.C3.y * t * t * t;
            
        return new Point(x, y);
    }
    
    function drawAllCurves(o, curve, c) {
        var i, max_i;
        
        for (i = 0, max_i = curve.curveSeg.length; i < max_i; i += 1) {
            drawCurve(o, curve.curveSeg[i], c, true);
        }
    }
    
    function keyDownEventHandlerCreator (o) {
        return function (e) {
            switch(e.which) {
                case 81:
                    drawAllCurves(o, curve, o.ctx);
                    break;
                case 87:
                    breakFlag = true;
                    break;
                default:
            }
        };
    };

    function interpVectorDist(vectorDistMap, x, y) {
        var x1 = Math.floor(x), y1 = Math.floor(y),
            x2 = x1 + 1, y2 = y1 + 1,
            Q11 = vectorDistMap[y1][x1],
            Q21 = vectorDistMap[y1][x2],
            Q12 = vectorDistMap[y2][x1],
            Q22 = vectorDistMap[y2][x2];
            
        return new Point(Q11.x * (x2 - x) * (y2 - y) + 
               Q21.x * (x - x1) * (y2 - y) +
               Q12.x * (x2 - x) * (y - y1) +
               Q22.x * (x - x1) * (y - y1), 
               Q11.y * (x2 - x) * (y2 - y) + 
               Q21.y * (x - x1) * (y2 - y) +
               Q12.y * (x2 - x) * (y - y1) +
               Q22.y * (x - x1) * (y - y1));
    }
    
    function mouseMoveDistanceFieldHandlerCr (o) {
        return function mouseMoveDistanceFieldHandler (e) {
            var v = interpVectorDist(vectorDistMap, e.pageX, e.pageY);
            
            o.dctx.clearRect(0, 0, o.o.width(), o.o.height());
            drawArrow(new Point(e.pageX, e.pageY), new Point(e.pageX - v.x, e.pageY - v.y), o.dctx);
        };
    }
   
    return {
        mouseDownCallback: function(x, y, e) {
            //o.pctx.clearRect(0, 0, o.c.width(), o.c.height());
            //o.ctx.clearRect(0, 0, o.c.width(), o.c.height());
            //o.octx.clearRect(0, 0, o.c.width(), o.c.height());
            if ((typeof e === 'undefined') || (e.which === 1)) {
                initParametricCurve();
                initCurveSegment(x, y, curve.curveSeg[0]);
                clearVectorDistMap(drawingFieldWidth, drawingFieldHeight);
            } else {
                
                e.preventDefault();
                return false;
            }
        },
        
        mouseMoveCallback: function(x, y) {
            var currentSeg = curve.curveSeg[curve.curveSeg.length - 1],
                prev = new Point(currentSeg.C3),
                updateResult,
                nextSeg,
                tanLength;
            
            updateResult = updateCurveSegment(x, y, currentSeg);
            
            if (updateResult !== 'SUCCESS') {
                nextSeg = new CurveSegment();
                
                initCurveSegment(prev.x, prev.y, nextSeg, x, y);
                clearRaster(rasterBorder, vectorDistMap, o);
                
                o.pctx.clearRect (0, 0, o.c.width(), o.c.height());
                o.pctx.lineWidth = 3;
                o.pctx.moveTo(currentSeg.C0.x, currentSeg.C0.y);
                o.pctx.bezierCurveTo(currentSeg.C1.x, currentSeg.C1.y,
                                    currentSeg.C2.x, currentSeg.C2.y,
                                    currentSeg.C3.x, currentSeg.C3.y);
                o.pctx.stroke();
            
                if (updateResult === 'FAILURE') {
                    nextSeg.constrainted = true;
                    nextSeg.tan = new Point(currentSeg.C3.x - currentSeg.C2.x, currentSeg.C3.y - currentSeg.C2.y);
                    nextSeg.tan.normalize();
                    nextSeg.C2.x = nextSeg.C0.x - nextSeg.tan.x;
                    nextSeg.C2.y = nextSeg.C0.y - nextSeg.tan.y;
                    
                } else {
                    if (updateResult !== 'CORNER') {
                        nextSeg.constrained = false;
                    }
                }
                
                updateCurveSegment(x, y, nextSeg);
                curve.curveSeg.push(nextSeg);
            }
            
            /*
            o.ctx.clearRect (0, 0, o.c.width(), o.c.height());
            o.ctx.moveTo(currentSeg.C0.x, currentSeg.C0.y);
            o.ctx.bezierCurveTo(currentSeg.C1.x, currentSeg.C1.y,
                                currentSeg.C2.x, currentSeg.C2.y,
                                currentSeg.C3.x, currentSeg.C3.y);
            o.ctx.stroke();*/
            
            return currentSeg;
        },
        
        mouseUpCallback: function() {
            currentSeg = curve.curveSeg[curve.curveSeg.length - 1];
            //drawAllCurves(o, curve, o.pctx);
            //o.pctx.clearRect(0, 0, o.c.width(), o.c.height());
            o.pctx.clearRect (0, 0, o.c.width(), o.c.height());
                o.pctx.lineWidth = 3;
                o.pctx.moveTo(currentSeg.C0.x, currentSeg.C0.y);
                o.pctx.bezierCurveTo(currentSeg.C1.x, currentSeg.C1.y,
                                    currentSeg.C2.x, currentSeg.C2.y,
                                    currentSeg.C3.x, currentSeg.C3.y);
                o.pctx.stroke();
        },
        
        getCurve: function() {
            return curve;
        },
        
        init: function(w, h, o_) {
            drawingFieldWidth = w;
            drawingFieldHeight = h;
            clearVectorDistMap(drawingFieldWidth, drawingFieldHeight);
            initLocalVariables();
            o = o_;
            $(document).bind('keydown', keyDownEventHandlerCreator(o));
            $(document).bind('mousemove', mouseMoveDistanceFieldHandlerCr(o));
            
            /*o.c.bind('mousemove', function(e) {
                console.log(vectorDistMap[e.pageY][e.pageX].x + ' ' + vectorDistMap[e.pageY][e.pageX].y);
            })*/
        },
        
        rasterize: function(edges) {
            return rasterize(edges);
        }
    };
} ());

