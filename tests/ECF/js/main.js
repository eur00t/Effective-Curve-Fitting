(function () {
    var o = {
        c: null,
        ctx: null,
        inputArray: [],
        square: [],
        edges: [],
        m: new Point(),
        prevx: 0,
        prevy: 0
    },
    seg = new CurveSegment();
    
    function calc(seg, t) {
        var x, y;
        
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
    
    function initCanvas(o) {
        o.ctx = $('#mainCanvas')[0].getContext('2d');
        o.pctx = $('#pCanvas')[0].getContext('2d');
        o.octx = $('#oCanvas')[0].getContext('2d');
        o.dctx = $('#dCanvas')[0].getContext('2d');
        
        o.c = $('#mainCanvas');
        o.p = $('#pCanvas');
        o.o = $('#oCanvas');
        o.d = $('#dCanvas');
        
        o.c.attr({
            width: o.c.width(),
            height: o.c.height()
        });
        o.p.attr({
            width: o.c.width(),
            height: o.c.height()
        });
        o.o.attr({
            width: o.c.width(),
            height: o.c.height()
        });
        o.d.attr({
            width: o.c.width(),
            height: o.c.height()
        });
    }
    
    function processPoint(o, x, y) {
        draw(o, x, y);
    }
    
    function clearDrawingState(o) {
        o.inputArray = [];
    }
    
    function initDrawing(o, x, y) {
        o.prevx = x;
        o.prevy = y;
    }
    
    function draw(o, x, y) {
        o.octx.beginPath();
        o.octx.moveTo(o.prevx, o.prevy );
        o.octx.lineTo(x, y);
        o.octx.closePath();
        
        o.octx.strokeStyle = 'red';
        o.octx.lineWidth = 0.2;
        o.octx.stroke();
        
        o.prevx = x;
        o.prevy = y;
    }
    
    function drawPixel(p, ctx, pixels) {
        var index = p.y * pixels.width + p.x;
        
        ctx.strokeStyle = "black";
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 1, p.y + 1);
        ctx.stroke();
        
        pixels.data[index] = 0;
        pixels.data[index + 1] = 0;
        pixels.data[index + 2] = 0;
        pixels.data[index + 3] = 255;
    }
    
    function mouseDownEventHandler(e) {
        var edges, points, i, max_i, pixels, index,
         time;
        
        initDrawing(o, e.pageX, e.pageY);
        processPoint(o, e.pageX, e.pageY);
        o.c.bind('mousemove', mouseMoveEventHandler)
    }

    function mouseUpEventHandler(e) {
        clearDrawingState(o);
        o.c.unbind('mousemove', mouseMoveEventHandler)
    }
    
    function mouseMoveEventHandler(e) {
        processPoint(o, e.pageX, e.pageY);
    }
    
    function mouseDownEventHandlerEcf (e) {
        o.c.bind('mousemove', mouseMoveEventHandlerEcf);
        ecf.mouseDownCallback(e.pageX, e.pageY, e);
        o.m = new Point(e.pageX, e.pageY);
    }
    
    function mouseUpEventHandlerEcf (e) {
        o.c.unbind('mousemove', mouseMoveEventHandlerEcf);
        ecf.mouseUpCallback(e.pageX, e.pageY);
    }
    
    function mouseMoveEventHandlerEcf (e) {
        var testLength = (new Point(e.pageX - o.m.x, e.pageY - o.m.y)).getLength();
        
        //if (testLength > 1) {
            ecf.mouseMoveCallback(e.pageX, e.pageY);
            o.m.x = e.pageX;
            o.m.y = e.pageY;
        //}
    }

    function attachHandlers(o) {
        o.c.bind('mousedown', mouseDownEventHandlerEcf)
        .bind('mouseup', mouseUpEventHandlerEcf);
        
        o.c.bind('mousedown', mouseDownEventHandler)
        .bind('mouseup', mouseUpEventHandler);
    }
    
    $(function () {
        var num = 20, i, max_i, point, currentSeg;
        
        initCanvas(o);
        attachHandlers(o);
        ecf.init(o.c.width(), o.c.height(), o);
        
        /*
        seg.C0 = new Point(100, 100);
        seg.C3 = new Point(500, 100);
        seg.C1 = new Point(200, 300);
        seg.C2 = new Point(400, 300);
        
        ecf.mouseDownCallback(100, 100);
        for (i = 1, max_i = num; i < max_i; i += 1) {
            point = calc(seg, (i + 1) / num);
            currentSeg = ecf.mouseMoveCallback(point.x, point.y);
        }
        
        o.ctx.clearRect (0, 0, o.c.width(), o.c.height());
            o.ctx.moveTo(currentSeg.C0.x, currentSeg.C0.y);
            o.ctx.bezierCurveTo(currentSeg.C1.x, currentSeg.C1.y,
                                currentSeg.C2.x, currentSeg.C2.y,
                                currentSeg.C3.x, currentSeg.C3.y);
            o.ctx.stroke();*/
    });
} ());