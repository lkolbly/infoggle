/*
  var socket = io.connect('http://localhost:9015');
  socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', { my: 'data' });
  });
*/

// TODO: In-game chat
//       Variable letter frequencies across board
//       Change how words are shown
//       Identical words, i.e. "mean" and "mean", must use entirely seperate
//          letters.
var socket = io.connect("http://"+location.hostname+":9015");

var boardX = 0;
var boardY = 0;
var offsetX = 0;
var offsetY = 0;

// Cookie functions courtesy of w3schools
// http://www.w3schools.com/js/js_cookies.asp
function setCookie(c_name,value,exdays)
{
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;
}

function renderMenu(username, score, rank) {
    if (username === "anon") {
        $("#usernamebox").html("");
        $("#login-button").css("display", "block");
    } else {
        $("#usernamebox").html("Hi, <b>"+username+"</b>");
        $("#login-button").css("display", "none");
    }
}

function loadTile(x, y) {
    //return;
    //if (y !== 1) return;
    console.log("Loading "+x+" "+y);
    //x -= offsetX/256;
    //y += offsetY/256;
    var x_pos = x - offsetX / 256;
    var y_pos = y - offsetY / 256;
    var s = "<div id='tile_"+x+"x"+y+"' class='dragboard' style='width:256px;height:256px;margin-left:"+(256*x_pos)+"px;margin-top:"+(256*y_pos)+";background-color:blue;background-opacity:0.0;position:absolute;border:0px solid black;opacity:1.0;z-index:-3'>"+x+" "+y+"</div>";
    $("#board").append(s);

    socket.emit("gettile", {x: x, y: y}, function (data) {
        //console.log(data);
        //console.log(x+" "+y);
        var x = data.x;
        var y = data.y;
        //var s = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">';
        var s = "";
        for (var i=0; i<64; i++) {
            var shift = -(data.letters[i].charCodeAt(0) - "a".charCodeAt(0)) * 32;
            var x_pos = (i % 8) * 32;
            var y_pos = Math.floor(i / 8) * 32;
            //console.log(x_pos+" "+y_pos);
            shift = 0;
            var letterdata = "";
            for (var j=0; j<64; j++) {
                letterdata += data.letters[j];
            }
	    console.log("http://"+location.hostname+":9016/8/8/"+data.letters+"");
            s += "<div letters='"+letterdata+"' id='letter_"+(i%8)+"x"+(Math.floor(i/8))+"' style='position:absolute;display:block;margin-left:"+x_pos+"px;margin-top:"+y_pos+"px;width:256px;height:256px;background-image:url(http://"+location.hostname+":9016/8/8/"+data.letters+"); background-repeat: no-repeat; background-position: "+shift+"px 0px;z-index:-2;opacity:1.0'></div>";
            break;
        }
        //s += "</svg>";
        //console.log(s);
        //s += x+","+y;
        $("#tile_"+x+"x"+y).html(s);
    });
}

var loaded_Tiles = new Array();
loaded_Tiles.contains = function(x,y) {
    for (var i=0; i<this.length; i++) {
        if (this[i].x === x && this[i].y === y) {
            return true;
        }
    }
    return false;
};

function checkVisibleTiles() {
    var pageW = window.innerWidth;//$(window).width();
    var pageH = window.innerHeight;

    var viewX = boardX;//-parseInt($("#board").css("margin-left").replace("px", ""));
    var viewY = boardY;//-parseInt($("#board").css("margin-top").replace("px", ""));

    var tileXindex_min = Math.floor((viewX+offsetX) / 256);
    var tileYindex_min = Math.floor((viewY+offsetY) / 256);
    var tileXindex_max = Math.ceil(pageW/256) + tileXindex_min;
    var tileYindex_max = Math.ceil(pageH/256) + tileYindex_min;
    console.log(viewX+" "+tileXindex_min+" "+tileYindex_max+" "+tileYindex_min+" "+pageH);
    for (var i=tileXindex_min; i<tileXindex_max+1; i++) {
        for (var j=tileYindex_min; j<tileYindex_max+1; j++) {
            if (!loaded_Tiles.contains(i,j)) {
                loadTile(i,j);
                loaded_Tiles.push({"x": i, "y": j});
            }
        }
    }
    //loadTile();
    readjustBoard();
}

function readjustBoard() {
    if (loaded_Tiles.length === 0) return;
    //console.log("Running...");
    var minx = loaded_Tiles[0].x;
    var maxx = loaded_Tiles[0].x;
    var miny = loaded_Tiles[0].y;
    var maxy = loaded_Tiles[0].y;
    for (var i=1; i<loaded_Tiles.length; i++) {
        if (loaded_Tiles[i].x < minx) minx = loaded_Tiles[i].x;
        if (loaded_Tiles[i].x > maxx) maxx = loaded_Tiles[i].x;
        if (loaded_Tiles[i].y < miny) miny = loaded_Tiles[i].y;
        if (loaded_Tiles[i].y > maxy) maxy = loaded_Tiles[i].y;
    }
    //minx -= 1;
    //miny -= 1;
    maxx += 1;
    maxy += 1;

    minx *= 256;
    miny *= 256;
    maxx *= 256;
    maxy *= 256;

    var curx = boardX;//-parseInt($("#board").css("margin-left").replace("px", ""));
    var cury = boardY;//-parseInt($("#board").css("margin-top").replace("px", ""));
    //curx = 256;

    var dx = minx - boardX;
    //if (dx > 0) return;
    //if (dx < 0) { dx -= 256*256*8; minx -= 256*256*8; }

    var dy = miny - boardY;
    //if (dy > 0) return;
    //if (dy < 0) { dy -= 256*256*8; miny -= 256*256*8; }

    console.log("There is a "+dx+"px gap to cover "+curx+" "+minx);
    console.log(minx+" "+curx+" "+dx+" "+offsetX);
    $("#board").css("width",  (maxx-minx));
    //offsetX += dx;
    //$("#board").css("margin-left", "-="+(-dx));//"-="+(dx));
    //$(".dragboardpath").css("margin-left", "+="+(-dx));

    $("#board").css("height", (maxy-miny));
    //offsetY += dy;
    //$("#board").css("margin-top", "-="+(-dy));
    //$(".dragboardpath").css("margin-top", "+="+(-dy));
    //x$(".dragboard").css("background-color", "green");

    //boardX = boardX - dx;
    //boardY = boardY - dy;
    //$("#board").css("-webkit-transform", "translate("+(-boardX)+", "+(-boardY)+")");
    return;
}

function locationToLetter(pageX, pageY) {
    var curx = boardX;//-parseInt($("#board").css("margin-left").replace("px", ""));
    var clickx = pageX + curx + offsetX;
    var tilex = Math.floor(clickx / 256);
    var letterx = Math.floor((clickx % 256) / 32);
    if (letterx < 0) {
        letterx += 8;
    }

    var cury = boardY;//-parseInt($("#board").css("margin-top").replace("px", ""));
    var clicky = pageY + cury + offsetY;
    var tiley = Math.floor(clicky / 256);
    var lettery = Math.floor((clicky % 256) / 32);
    if (lettery < 0) {
        lettery += 8;
    }
    return {tilex: tilex, tiley: tiley, letterx: letterx, lettery: lettery};
}

function tilepos2letterpos(tile) {
    return {x: (tile.letterx + 8*tile.tilex),
            y: (tile.lettery + 8*tile.tiley)};
}

var canvas_count = 0;

function renderPath(tiles, c) {
    console.log(tiles);
    console.log(offsetX+","+offsetY);

    if (canvas_count < 10 || true) {
        //confirm(tiles.length+" "+window.canvas_count);
        //$.blockUI({message: tiles.length+" "+window.canvas_count});
        //while (1);
    var curve = [];
    var minx = 10000000;
    var maxx =-10000000;
    var miny = minx;
    var maxy = maxx;
    for (var i=0; i<tiles.length; i++) {
        var p = {x: tiles[i].x*32, y: tiles[i].y*32};//tilepos2letterpos(tiles[i]);
        console.log(p);
        if (p.x < minx) minx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.x > maxx) maxx = p.x;
        if (p.y > maxy) maxy = p.y;
        curve.push({x: p.x, y: p.y+i});
    }

    minx = minx - 32;
    miny = miny - 32;
    var w = maxx - minx + 32;
    var h = maxy - miny + 32;

        w = 512;
        h = 512;

        console.log("Curve before moving: "+minx+" "+miny);
        console.log(curve);
        for (var i=0; i<tiles.length; i++) {
            curve[i] = {x: curve[i].x-minx, y: curve[i].y-miny};
        }

        minx += 16;
        miny += 16;

        if (tiles.length > 1) {
    var s = "<canvas id='canvas_"+window.canvas_count+"' class='"+c+" dragboardpath draghandle' width='"+w+"' height='"+h+"' style='margin-left:"+minx+"px; margin-top:"+miny+"; position:absolute; z-index:5'></canvas>";
    $("#board").append(s);
    var canvas = document.getElementById("canvas_"+window.canvas_count);
    var ctx = canvas.getContext("2d");
        ctx.lineWidth = 1;
        ctx.setTransform(1,0,0,1,0,0);
        //ctx.scale(1358.0/655.0,1);
        //ctx.scale(100.0 / w, 100.0 / h);
        //ctx.scale(1,1);
        console.log(curve);
        //ctx.strokeRect(1.5,1.5,100,100);
        bezier.renderPath(curve, ctx, 20);
        ctx.stroke();
    canvas_count += 1;
        //alert(window.canvas_count);
    }
    }

    for (var i=0; i<tiles.length; i++) {
        if (c === "selected_path") {
            var p = tilepos2letterpos(tiles[i]);
            var x = p.x * 32;
            var y = p.y * 32;
            //var s = "<img class='selected_path dragboard draghandle' width='32' height='32' src='selected.png' style='margin-left:"+x+"px; margin-top:"+y+"px; position: absolute'/>";
            var s = "<div class='selected_path dragboardpath draghandle' style='width:32px;height:32px;background-image:url(selected.png); background-repeat: no-repeat; background-position: 0px 0px;margin-left:"+x+"px; margin-top:"+y+"; position:absolute'></div>";
            $("#board").append(s);
        }
    }
    for (var i=1; i<tiles.length; i++) {
        var p1, p2;
        if (tiles[i-1].hasOwnProperty("letterx")) {
            p1 = tilepos2letterpos(tiles[i-1]);
            p2 = tilepos2letterpos(tiles[i]);
        } else {
            p1 = tiles[i-1];
            p2 = tiles[i];
        }

        var img, w, h, x, y;

        if ((p2.x>p1.x && p2.y>p1.y) ||
            (p2.x<p1.x && p2.y<p1.y)) {
            // Diagonal upper-left to lower-right
            img = "line_diagonal_1.png";
            w = 64;
            h = 64;
            if (p1.x < p2.x) { x = p1.x; y = p1.y; }
            else { x = p2.x; y = p2.y; }
        } else if ((p2.x>p1.x && p2.y<p1.y) ||
                   (p2.x<p1.x && p2.y>p1.y)) {
            img = "line_diagonal_2.png";
            w = 64;
            h = 64;
            if (p1.y > p2.y) { x = p1.x; y = p2.y; }
            else { x = p2.x; y = p1.y; }
        } else if (p2.x === p1.x) {
            img = "line_vertical.png";
            w = 32;
            h = 64;
            if (p1.y > p2.y) {x = p1.x; y = p2.y; }
            else { x = p1.x; y = p1.y; }
        } else if (p2.y === p1.y) {
            img = "line_horizontal.png";
            w = 64;
            h = 32;
            if (p1.x > p2.x) {x = p2.x; y = p2.y; }
            else { x = p1.x; y = p2.y; }
        }
        //var curx =-parseInt($("#board").css("margin-left").replace("px", ""));
        //var cury = -parseInt($("#board").css("margin-top").replace("px", ""));
        x = x * 32 - offsetX;
        y = y * 32 - offsetY;
        var s = "<div class='"+c+" dragboardpath draghandle' style='width:"+w+"px;height:"+h+"px;background-image:url("+img+"); background-repeat: no-repeat; background-position: 0px 0px;margin-left:"+x+"px; margin-top:"+y+"; position:absolute'>";
        s += "<svg width='64' height='64'><circle cx='32' cy='32' r='4' fill='red'/></svg>";
        s += "</div>";
        //s += "<svg width='64' height='64' style='margin-left:'"+x+"; margin-top:"+y+";position:absolute'><circle cx='32' cy='32' r='4' fill='red'/></svg>";
        //var s = "<img class='"+c+" dragboard draghandle' width='"+w+"' height='"+h+"' src='"+img+"' style='margin-left:"+x+"px; margin-top:"+y+"px; position: absolute'/>";
        //$("#board").append(s);
    }
}

function getLetterAtPos(x,y) {
    var tilex = Math.floor(x / 8);
    var tiley = Math.floor(y / 8);
    var letterx = x%8;
    if (letterx < 0) letterx += 8;
    var lettery = y%8;
    if (lettery < 0) lettery += 8;
    console.log($("#tile_"+tilex+"x"+tiley));
    //var letter = $("#tile_"+tilex+"x"+tiley).children("#letter_"+(letterx)+"x"+(lettery)).attr("letter");
    var letter = $("#tile_"+tilex+"x"+tiley).children("#letter_0x0").attr("letters").charAt(letterx+lettery*8);
    console.log(x+" "+y+" "+tilex+" "+tiley+" "+letter);
    return letter;
}

function isNeighbor(p1,p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    console.log("Comparing:");
    console.log(p1);
    console.log(p2);
    console.log("Result: "+dx+" "+dy);
    if (dy*dy <= 1 && dx*dx <= 1) {
        return true;
    }
    return false;
}

// Courtesy of stack overflow
function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function showRanks() {
    socket.emit("getranks", {}, function(data) {
        var s = "<table style='font-size:11px'>";
        s += "<tr><td></td><td>user</td><td>score</td></tr>";
        for (var i=0; i<data.ranks.length; i++) {
            s += "<tr><td>"+(i+1)+"</td><td>"+data.ranks[i].username+"</td><td>"+data.ranks[i].score+"</td></tr>";
        }
        s += "</table>";
        $("#rank-box").html(s);
    });
}

function showRecent() {
    socket.emit("getrecent", {}, function(data) {
        var s = "<table style='font-size:11px'>";
        s += "<tr><td>user</td><td>word</td><td>score</td></tr>";
        for (var i=data.recent.length-1; i>=0; i--) {
            var d = data.recent[i];
            s += "<tr><td>"+d.user+"</td><td>"+d.word+"</td><td>"+d.score+"</td></tr>";
        }
        s += "</table>";
        $("#rank-box").html(s);
    });
}

/* User administration functions */

$(function() {
    // Create the login & register dialogs
    $("#loginform").dialog({
        autoOpen: false,
        height: 280,
        width: 300,
        modal: true,
        buttons: {
            "Login": function() {
                var username = $("#login-username").val();
                var password = $("#login-password").val();
                socket.emit("login", {username: username, password: password}, function(data) {
                    if (data.hasOwnProperty("error")) {
                        $("#login-error").html("Error!");
                        return;
                    }
                    renderMenu(username);
                    //$("#usernamebox").html("Welcome, "+username+"!");
                    $("#loginform").dialog("close");
                });
            },
            Cancel: function() {
                $(this).dialog("close");
            }
        }
    });
    $("#login-button").click(function() { $("#loginform").dialog("open"); });

    $("#registerform").dialog({
        autoOpen: false,
        height: 350,
        width: 350,
        modal: true,
        buttons: {
            "Register": function() {
                var username = $("#register-username").val();
                var password = $("#register-password").val();
                var confirm = $("#register-confirm").val();
                if (password === confirm) {
                    socket.emit("register", {username: username, password: password}, function(data) {
                        if (data.hasOwnProperty("error")) {
                            $("#login-error").html("Error!");
                            return;
                        }
                        socket.emit("login", {username: username, password: password}, function(data) {
                            console.log("Logged in as "+username);
                            $("#registerform").dialog("close");
                        });
                    });
                } else {
                    $("#register-error").html("Passwords must match");
                }
            },
            Cancel: function() {
                $(this).dialog("close");
            }
        }
    });
    $("#register-button").click(function() {
        $("#loginform").dialog("close");
        $("#registerform").dialog("open");
    });

    renderMenu("anon");

    document.body.style.overflow = 'hidden';
    //$("#board").css("margin-left", 512);

    var is_mouse_clicked = false;
    var is_dragging = false;
    var d = new Date();
    var mouse_click_time = d.getTime();
    var last_pageX = -1;
    var last_pageY = -1;

    var selected_tiles = new Array();

    function finish_drag(e) {
        is_mouse_clicked = false;
        is_dragging = false;
    };

    $("#board").mousedown(function(e) {
        console.log(e);
        last_pageX = e.pageX;
        last_pageY = e.pageY;
        mouse_click_time = d.getTime();
        is_mouse_clicked = true;
        d = new Date();
        mouse_click_time = d.getTime();
    });

    $("#board").mouseup(function(e) {
        if (!is_dragging) {
            //console.log("Loading tile");
            //loadTile(1,1);
            //checkVisibleTiles();

            // Figure out where they clicked (at the letter level)
            var o = locationToLetter(e.pageX, e.pageY);
            if (selected_tiles.length > 0) {
                // If we're clicking on a non-sequiter, clear everything
                if (!isNeighbor(tilepos2letterpos(o), tilepos2letterpos(selected_tiles[selected_tiles.length-1]))) {
                    selected_tiles = new Array(); // Clear it...
                }

                // If we're clicking on a tile again, reset it...
                for (var i=0; i<selected_tiles.length; i++) {
                    if (tilepos2letterpos(selected_tiles[i]).x === tilepos2letterpos(o).x &&
                        tilepos2letterpos(selected_tiles[i]).y === tilepos2letterpos(o).y) {
                        selected_tiles = new Array();
                        break;
                    }
                }
            }
            selected_tiles.push(o);
            $(".selected_path").remove();
            renderPath(selected_tiles, "selected_path");
            console.log("Click at:");
            console.log(o);
        } else {
            checkVisibleTiles();
        }
        finish_drag(e);
    });
    //$("#board").mouseout(finish_drag);

    $("#board").mousemove(function (e) {
        if (!is_mouse_clicked) {
            return;
        }

        var d = new Date();
        //console.log(e);//d.getTime()+" "+mouse_click_time);
        if (d.getTime() - mouse_click_time < 80) {
            return;
        }
        is_dragging = true;

        var dx = e.pageX - last_pageX;
        last_pageX = e.pageX;
        var dy = e.pageY - last_pageY;
        last_pageY = e.pageY;
        d = new Date();
        console.log("Dragged: "+dx+","+dy+" "+d.getTime());
        var curx = boardX;//-parseInt($("#board").css("margin-left").replace("px", ""));
        var cury = boardY;//-parseInt($("#board").css("margin-top").replace("px", ""));
        //$("#board").css("margin-left", -curx+dx);
        //$("#board").css("margin-top", -cury+dy);
        boardX = boardX - dx;
        boardY = boardY - dy;
        $("#board").css("-webkit-transform", "translate("+(-boardX)+"px, "+(-boardY)+"px)");
        $("#board").css("transform", "translate("+(-boardX)+"px, "+(-boardY)+"px)");
        var d2 = new Date();
        console.log("(finished drag: "+(d2.getTime()-d.getTime())+" : "+boardX+")");
        //checkVisibleTiles();
    });

    checkVisibleTiles();

    $("#submit_button").click(function(e) {
        console.log("Submitting."+getLetterAtPos(0,0));
        var s = "";
        for (var i=0; i<selected_tiles.length; i++) {
            var o = tilepos2letterpos(selected_tiles[i]);
            s += getLetterAtPos(o.x, o.y);
        }
        console.log(s);
        socket.emit("submitword", {tiles: selected_tiles, word: s}, function (data) {
            if (data.hasOwnProperty("error")) {
                console.log("Error: "+data.error);
                alert("Error: "+data.error);
            } else {
                console.log("Got points!");
                renderPath(selected_tiles, "foundwords");
            }
            $(".selected_path").remove();
            selected_tiles = new Array();
        });
    });

    $("#help_button").click(function(e) {
        $("#help_dialog").dialog({
            modal: true,
            width: 450,
            dialogClass: "no-close",
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
    });

    $("#show-recent").click(function(e) {
        $("#show-recent").css("border", "1px solid red");
        $("#show-ranks").css("border", "none");
        showRecent();
    });

    $("#show-ranks").click(function(e) {
        $("#show-ranks").css("border", "1px solid red");
        $("#show-recent").css("border", "none");
        showRanks();
    });
    showRanks();

    $("#chat-submit").click(function(e) {
        socket.emit("chat", {message: $("#chat-input").val()});
    });

    socket.on("wordfound", function(data) {
        console.log("Someone found a word!");
        console.log(data);
        renderPath(data.tiles, "foundwords");
    });
    socket.on("score", function(data) {
        console.log("Got score update");
        console.log(data);
        $("#scorebox").html(pad(data.score, 4));
        $("#rankbox").html(data.rank);
        $("#ranklist").html(data.ranklist);
        renderMenu(data.username);
    });
    socket.on("chat", function(data) {
        console.log(data.username+": "+data.message);
        data.message.replace('<', '&lt;');
        data.message.replace('>', '&gt;');
        $("#chat-box").append("<p style='margin:0;word-wrap:break-word'>"+data.username+": "+data.message+"</p>");
        $("#chat-box").animate({scrollTop:1000000000});
    });
    socket.on("disconnect", function() {
        console.log("Disconnected");
        $("#disconnected-dialog").dialog({
            modal: true
        });
    });
    socket.emit("ready");
});
