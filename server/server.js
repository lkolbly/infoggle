var fs = require("fs");
var http = require("http");
var https = require("https");
var crypto = require("crypto");

//console.log(crypto.getHashes());
//while (true);

/* Database definitions */
var mongoose = require("mongoose");
mongoose.connect("mongodb://mongo/infoggle");

var tile_schema = mongoose.Schema({
    letters: Array,
    x: Number,
    y: Number
});

var tile_model = mongoose.model("tile", tile_schema);

var found_word_schema = mongoose.Schema({
    // Array of [x,y] coordinates
    tiles: Array,
    tags: Array,
    word: String
});

var found_word_model = mongoose.model("foundwords", found_word_schema);

var user_model = mongoose.model("users", mongoose.Schema({
    username: String,
    pw_hash: String,
    pw_salt: String,
    ws_connection: String,
    score: Number
}));

/*var legal_move_model = mongoose.model("legalmoves", mongoose.Schema({
    grid: Array,
    x: Number,
    y: Number
}));*/

/* Stuff for dealing with users */

function addScore(ws_connection, score) {
    user_model.find({ws_connection: ws_connection}, function(err, data) {
        if (data.length === 0) {
            data = new user_model();
            data.username = "anon";
            data.ws_connection = ws_connection;
            data.score = score;
            data.save();
            return;
        }
        data[0].score += score;
        data[0].save();
    });
}

/* Stuff for figuring out what are legal moves (defined by adjacency) */

function isNeighbor(p1,p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    /*console.log("Comparing:");
    console.log(p1);
    console.log(p2);
    console.log("Result: "+dx+" "+dy);*/
    if (dy*dy <= 1 && dx*dx <= 1) {
        return true;
    }
    return false;
}

var DISABLE_ADJANCANCY_CHECK = true;

function isLegalMove(tiles, cb) {
    if (DISABLE_ADJANCANCY_CHECK) {
        cb(true);
        return true;
    }

    var minx = tiles[0].x;
    var maxx = tiles[0].x;
    var miny = tiles[0].y;
    var maxy = tiles[0].y;
    for (var i=0; i<tiles.length; i++) {
        if (tiles[i].x < minx) minx = tiles[i].x;
        if (tiles[i].x > maxx) maxx = tiles[i].x;
        if (tiles[i].y < miny) miny = tiles[i].y;
        if (tiles[i].y > maxy) maxy = tiles[i].y;
    }
    minx -= 1;
    miny -= 1;
    maxx += 1;
    maxy += 1;

    found_word_model.find({"tiles.x": {$gte: minx, $lte: maxx}, "tiles.y": {$gte: miny, $lte: maxy}}, function (err, data) {
        //console.log(minx+" "+miny+" "+maxx+" "+maxy);
        //console.log(data);
        for (var i=0; i<tiles.length; i++) {
            for (var j=0; j<data.length; j++) {
                for (var k=0; k<data[j].tiles.length; k++) {
                            if (isNeighbor(tiles[i], data[j].tiles[k])) {
                                cb(true);
                                return;
                            }
                }
            }
        }
        cb(false);
    });
    return false;
}

isLegalMove([{x: -8, y: 0}], function (res) { console.log(res); });
isLegalMove([{x: -9, y: 0}], function (res) { console.log(res); });

/* Stuff for tracking found words */

function isFoundWord(word,tiles, cb) {
    found_word_model.find({word: word}, function(err, data) {
        cb(checkFoundWordCandidates(word,tiles,data));
    });
}

function checkFoundWordCandidates(word,tiles,candidates) {
    console.log(candidates);
    for (var i=0; i<candidates.length; i++) {
        if (candidates[i].tiles.length === tiles.length) {
            console.log(candidates[i]);
            console.log(tiles);
            for (var j=0; j<tiles.length; j++) {
                if (candidates[i].tiles[j].x === tiles[j].x ||
                    candidates[i].tiles[j].y === tiles[j].y) {
                    return true;
                    //break;
                }
            }
            /*if (j === tiles.length) {
                return true;
            }*/
        }
    }
    return false;
}

function addFoundWord(word,tiles) {
    var w = new found_word_model();
    w.tiles = tiles;
    w.word = word;

    var tags = [];
    var affected_quads = [];
    for (var i=0; i<tiles.length; i++) {
        var qx = Math.floor(tiles[i].x/8);
        var qy = Math.floor(tiles[i].y/8);
        for (var j=0; j<affected_quads.length; j++) {
            if (affected_quads[j].x == qx &&
                affected_quads[j].y == qy) {
                break;
            }
        }
        if (j === affected_quads.length) {
            affected_quads.push({x:qx, y:qy});
            //socket.broadcast.to("wordfound_"+qx+"_"+qy).emit("wordfound", {tiles: data.tiles});
        }
    }
    for (var i=0; i<affected_quads.length; i++) {
        var qx = affected_quads[i].x;
        var qy = affected_quads[i].y;
        tags.push("wordfound_"+qx+"_"+qy);
    }
    w.tags = tags;

    w.save();
}

// Converts a tile from tile<>,letter<> to x,y
function cvtTile(tile) {
    return {x: tile.tilex*8 + tile.letterx,
            y: tile.tiley*8 + tile.lettery};
}

function cvtTiles(tiles) {
    var a = new Array();
    for (var i=0; i<tiles.length; i++) {
        a.push(cvtTile(tiles[i]));
    }
    return a;
}

/* Stuff for seeding the database */
var ValidWordContainer = function(filedata) {
    this.TreeNode = function() {
        this.letter = "";
        this.endsWord = false;
        this.subletters = {};
        this.addWord = function(word) {
            if (!this.subletters.hasOwnProperty(word.charAt(0))) {
                this.subletters[word.charAt(0)] = new this.constructor();//word.slice(1);
                this.subletters[word.charAt(0)].letter = word.charAt(0);
            }
            if (word.length <= 1) {
                //console.log(word.charAt(0));
                this.subletters[word.charAt(0)].endsWord = true;
                return;
            }
            this.subletters[word.charAt(0)].addWord(word.slice(1));
        };

        this.isWord = function(word) {
            if (word.length === 0) {
                if (this.endsWord) {
                    return true;
                }
                //console.log(this.letter+" "+this.endsWord);
                return false;
            } else {
                if (!this.subletters.hasOwnProperty(word.charAt(0))) {
                    return false;
                }
                return this.subletters[word.charAt(0)].isWord(word.slice(1));
            }
        };

        this.isPartialWord = function(word) {
            if (word.length === 0) {
                return true;
            } else {
                if (!this.subletters.hasOwnProperty(word.charAt(0))) {
                    return false;
                }
                return this.subletters[word.charAt(0)].isPartialWord(word.slice(1));
            }
        };
    };
    this.root = new this.TreeNode();
    var words = filedata.split("\n");
    for (var i=0; i<words.length; i++) {
        this.root.addWord(words[i].trim());
	//console.log("Added "+words[i]);
    }
    console.log(this.root.subletters);
    return this;
}

var valid_Words = new ValidWordContainer(new String(fs.readFileSync("wordsEn.txt")));
console.log(valid_Words.root.isWord("the"));
console.log(valid_Words.root.isWord("th"));
console.log(valid_Words.root.isPartialWord("zebra"));
console.log(valid_Words.root.isWord("zebr"));

function findWordsFromLetter(x,y) {
}

/* Tile to difficulty conversion code */

var amps = [0.51922639,  1.29633609,  0.39139378, -0.29442388, -0.95215736, -2.53534710,
            0.92070874, -0.78725904,  1.37448406, -0.60115555,  0.45898871,  0.33748561,
            0.01109460,  0.37177003,  0.36075196,  1.27213033, -0.78238649,  0.42878295,
            1.31752264,  1.86485442, -0.20136165, -0.71926167, -1.01989812,  1.41407966,
            -0.63149076,  0.50303605, -0.62375239,  0.14400167, -1.46034003, -0.85730545,
            -0.87383600, -0.37127668,  0.32737723,  1.01651725, -1.38691483, -1.18920309,
            -0.42905799, -0.42408887,  0.01348806,  0.37286527,  0.88664923, -1.35421130,
            0.27621974,  1.03102902,  1.66598341, -1.41401425,  0.41922337,  0.15332104,
            -0.45005602, -1.17507182];
var periods = [-0.4781845, -0.9453984, -1.5933185, -0.7216712,  0.1228931, -1.7102783,
               0.4959667, -1.7422691, -0.9421853,  1.5360892,  0.7227891, -0.9420077,
               0.4509902,  0.2025715, -1.4821683,  0.7911012, -0.8139869, -0.4105973,
               2.4436520, -0.9311375, -0.6586660, -0.7736074,  3.6492029,  1.3300142,
               -0.4227437, -0.9275162,  0.3076193,  0.8633613, -0.2640722,  0.9981185,
               0.3313669,  2.5806043,  1.0573140, -0.7545401,  0.9753279,  1.0936551,
               1.1542595,  1.1300806, -0.3299101, -2.6995792, -0.8479058,  1.3628885,
               -0.7611987,  0.4464191,  0.5791665, -0.3154241, -0.1514115,  0.5406923,
               1.5438752,  0.3472652];
var phases = [-0.83100517,  0.50264949, -0.06493330, -0.39146694,  0.48410316, -0.76628508,
              0.97012675,  0.61576979,  1.35379717, -1.13640468, -1.31258449,  1.63444760,
              -0.39893105, -1.25632532, -0.70155367, -0.45768920, -0.37862944,  0.67300904,
              0.16185647,  1.41500743, -0.36953029, -2.88932463,  1.24272874, -0.47578631,
              1.18488373, -1.30358651, -0.75440803, -1.52779733,  0.52729005, -0.45214891,
              -0.24690291,  2.21967028, -1.18467949,  0.04380372,  2.19655451, -1.06537920,
              0.55172216, -0.21513803,  1.28687571,  0.45031694, -2.68272776, -0.15807526,
              0.64308624,  0.46385444,  0.04756166,  0.02078504, -0.80613049,  0.70695502,
              1.77999297,  0.52184893];

function generateTileDifficulty(x,y) {
    return 0.0;
    var diff = 0.0;
    for (var i=0; i<phases.length/2; i++) {
        diff += amps[i*2] * Math.sin(periods[i*2]*x + phases[i*2]) +
            amps[i*2+1] * Math.sin(periods[i*2+1]*y + phases[i*2+1]);
    }
    return diff;
}

/*var min=0.0,max=0.0;
for (var x=-64; x<64; x++) {
    for (var y=-64; y<64; y++) {
        var d = generateTileDifficulty(x,y);
        console.log(x+","+y+","+d);
        if (d>max) max = d;
        if (d<min) min = d;
    }
}
console.log(min+" "+max);*/
/*process.exit();*/

/* Database access */

// This mutex is to prevent creating multiple copies of a given tile
var tile_Mutex = false;

function generateLetter(difficulty) {
    var letter_freqs = [0.08167, 0.01492, 0.02782, 0.04253, 0.12902, 0.0228, 0.02015, 0.06094, 0.06966, 0.00153, 0.00772, 0.04025, 0.02406, 0.06749, 0.07507, 0.01929, 0.00095, 0.05987, 0.06327, 0.09056, 0.02758, 0.00987, 0.02360, 0.00150, 0.01974, 0.00074];

    // The frequencies we actually pick are linearly interpolated between this
    // frequency and flat (1/26th for each) based on the difficulty.
    // -20 difficulty => 100% this letter frequency.
    // 20 difficulty => 100% flat.
    var t = (difficulty+20.0) / 40.0;
    var v = Math.random();
    var i = 0;
    //console.log(v);

    // To test, find the sum of the probabilites
    var sum = 0.0;
    for (var j=0; j<letter_freqs.length; j++) {
        sum += letter_freqs[j]/1.0026 * t + 1.0/letter_freqs.length * (1.0 - t);
    }
    //console.log("Sum is "+sum);

    while (v > 0.0) {
        v -= letter_freqs[i]/1.0026 * t + 1.0/letter_freqs.length * (1.0 - t);
        i++;
        if (i >= 26) {
            i = 25;
            break;
        }
    }
    //console.log(i);
    return String.fromCharCode(i+97);
}

for (var d=-20.0; d<15.0; d+=1.0) {
    var s = "";
    for (var i=0; i<64; i++) {
        s += generateLetter(d);
    }
    console.log(s);
}
//process.exit();

function getTile(x,y, cb) {
    //console.log(tile_Mutex+" "+x+" "+y);
    function _cb(err, tiles) {
	console.log(tiles.length);
        tile_Mutex = false;
        if (tiles.length === 0) {
            var difficulty = generateTileDifficulty(x,y);
            tile = new tile_model();
            tile.x = x;
            tile.y = y;
            tile.letters = [];
            for (var i=0; i<64; i++) {
                //letters = "abcdefghijklmnopqrstuvwxyz";
                //tile.letters.push(letters.charAt(Math.floor(Math.random()*26)));
                tile.letters.push(generateLetter(difficulty));
            }
            tile.save();
            cb(tile);
        } else {
            cb(tiles[0]);
        }
        //console.log(tiles);
    };

    if (tile_Mutex) {
        /*process.nextTick(function() {
            getTile(x, y, cb);
        });*/
        setTimeout(function() {
            getTile(x, y, cb);
        }, 100);
    } else {
        tile_Mutex = true;
        tile_model.find({x: x, y: y}, _cb);
    }
}

/* Web server code */
var app = require('express')()
, server = require('http').createServer(app)
, io = require('socket.io').listen(server);

server.listen(9015);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/client/index.html');
});

app.use("/main.js", function (req, res) {
    res.sendfile("js/main.js.min");
});

app.use("/jsBezier-0.6.js", function (req, res) {
    res.sendfile("js/jsBezier-0.6.js.min");
});

app.use("/QuadTree.js", function (req, res) {
    res.sendfile("js/QuadTree.js.min");
});

app.use("/bezier.js", function (req, res) {
    res.sendfile("js/bezier.js.min");
});

app.use("/letters.png", function (req, res) {
    res.sendfile("letters.png");
});

app.use("/line_diagonal_1.png", function (req, res) {
    res.sendfile("line_diagonal_1.png");
});

app.use("/line_diagonal_2.png", function (req, res) {
    res.sendfile("line_diagonal_2.png");
});

app.use("/line_horizontal.png", function (req, res) {
    res.sendfile("line_horizontal.png");
});

app.use("/line_vertical.png", function (req, res) {
    res.sendfile("line_vertical.png");
});

app.use("/selected.png", function (req, res) {
    res.sendfile("selected.png");
});

function broadcastScoreAndRank(wsid, socket) {
    user_model.find({}).sort("-score").limit(10).exec(function(err, data) {
        var rank = 0;
        var ranklist = [];
        for (var i=0; i<data.length; i++) {
            if (data[i].ws_connection === wsid) {
                rank = i;
            }
            ranklist.push(data[i]);
        }
        user_model.find({ws_connection: wsid}, function(err, data) {
            if (data.length === 0) {
                socket.emit("score", { username: "anon", score: 0, rank: rank, ranklist: ranklist });
                return;
            }
            var score = data[0].score;
            socket.emit("score", { username: data[0].username, score: score, rank: rank, ranklist: ranklist });
        });
    });
}

var recent_Words = [];

function hashPassword(username, password, salt) {
    var hasher = crypto.createHash("sha256");
    hasher.update(username);
    hasher.update(password);
    hasher.update(salt);
    return hasher.digest("hex");
}

// Courtesy of stack overflow:
// http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
function makeSalt()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/* Web socket code */
io.sockets.on('connection', function (socket) {
    console.log(socket.id+" is connected");
    socket.join("all");
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
    socket.on("register", function (request, fn) {
        user_model.find({username: request.username}, function(err, existing_users) {
            if (existing_users.length > 0) {
                fn({error: "username exists"});
                return;
            }
            user_model.find({ws_connection: socket.id}, function(err, anon_user) {
                u = new user_model();
                u.username = request.username;
                u.pw_salt = makeSalt();
                u.pw_hash = hashPassword(u.username, request.password, u.pw_salt);
                u.ws_connection = socket.id;
                if (anon_user.length > 0) {
                    u.score = anon_user[0].score;
                } else {
                    u.score = 0;
                }
                u.save()
                fn({success: "registered"});
            });
        });
    });
    socket.on("login", function (data, fn) {
        //attemptAuth(socket, data);
        user_model.find({username: data.username}, function(err, mongo_data) {
            if (mongo_data.length === 0) {
                // No such user
                fn({error: "could not authenticate1"});
                return;
            }
            u = mongo_data[0];
            console.log(u);
            /*console.log(u.hasOwnProperty("pw_hash"));
            if (!(u.hasOwnProperty("pw_hash") && u.hasOwnProperty("pw_salt"))) {
                fn({error: "could not authenticate2"});
                return;
            }*/

            var hasher = crypto.createHash("sha256");
            hasher.update(u.username);
            hasher.update(data.password);
            hasher.update(u.pw_salt);
            var candidate = hashPassword(u.username, data.password, u.pw_salt);//hasher.digest("hex");
            if (candidate === u.pw_hash) {
                fn({success: "authenticated"});
                u.ws_connection = socket.id;
                u.save();

                // Go remove Anon. users on this websocket
                user_model.find({ws_connection: socket.id}, function(err, existing_users) {
                    for (var i=0; i<existing_users.length; i++) {
                        if (existing_users[i].username === "anon") {
                            existing_users[i].remove();
                        }
                    }
                    broadcastScoreAndRank(socket.id, socket);
                });
                return;
            }
            fn({error: "could not authenticate3"});
            return;
        });
    });
    socket.on("gettile", function (data, fn) {
        //fn({some: "data"});
        var qx = data.x;
        var qy = data.y;
        socket.join("wordfound_"+qx+"_"+qy);
        getTile(data.x, data.y, fn);
        console.log("Joined wordfound_"+qx+"_"+qy);

        found_word_model.find({tags:"wordfound_"+qx+"_"+qy}, function(err, data) {
            console.log("Sending out "+data.length+" words.");
            for (var i=0; i<data.length; i++) {
                socket.emit("wordfound", {tiles: data[i].tiles});
            }
        });
    });
    socket.on("ready", function (data) {
        /*found_word_model.find({tiles: {$exists: true}}, function(err, data) {
            console.log("Sending out "+data.length+" words.");
            for (var i=0; i<data.length; i++) {
                socket.emit("wordfound", {tiles: data[i].tiles});
            }
        });*/
        //socket.emit("score", { score: 0, rank: 50, ranklist: ["Asdf", "asdf"]});
        broadcastScoreAndRank(socket.id, socket);
    });
    socket.on("chat", function (data) {
        user_model.find({ws_connection: socket.id}, function (err, userdata) {
            var username = "anon";
            if (userdata.length > 0) {
                username = userdata[0].username;
                if (username == undefined) {
                    username = "anon";
                }
            }
            io.sockets.emit("chat", {username: username, message: data.message});
            //var d = new Date();
            //recent_Words.push({"user": username, "score": points, "word": data.word, "time": d.getTime()});
        });
        //console.log("Chat: "+data.message);
    });
    socket.on("getranks", function (data, fn) {

    user_model.find({}).sort("-score").limit(10).exec(function(err, data) {
        var rank = 0;
        var ranklist = [];
        for (var i=0; i<data.length; i++) {
            ranklist.push(data[i]);
        }
        fn({"ranks": ranklist});
        /*fn({"ranks": [{"username": "lkolbly", "score": 1234},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111},
                      {"username": "Anonymous", "score": 111}]});*/
    });
    });
    socket.on("getrecent", function (data, fn) {
        // Curate the recent_words to limit it to the top 20
        while (recent_Words.length > 20) {
            recent_Words.shift();
        }
        fn({"recent": recent_Words});
    });
    socket.on("submitword", function (data, fn) {
        for (var i=0; i<data.tiles.length; i++) {
            for (var j=0; j<data.tiles.length; j++) {
                if (i === j) continue;
                if (data.tiles[i].tilex === data.tiles[j].tilex &&
                    data.tiles[i].tiley === data.tiles[j].tiley &&
                    data.tiles[i].letterx === data.tiles[j].letterx &&
                    data.tiles[i].lettery === data.tiles[j].lettery) {
                    fn({error: "Tile reused"});
                    return;
                }
            }
        }
        if (valid_Words.root.isWord(data.word)) {
            if (data.word.length < 4) {
                fn({error: "Word is too short."});
                return;
            }
            isFoundWord(data.word,cvtTiles(data.tiles), function(res) {
                if (res) {
                    console.log("Word was already found.");
                    fn({error: "Already found"});
                } else {
                    isLegalMove(cvtTiles(data.tiles), function(res) {
                        if (res) {
                            addFoundWord(data.word, cvtTiles(data.tiles));

                            console.log("Valid word!");
                            var affected_quads = [];
                            for (var i=0; i<data.tiles.length; i++) {
                                var qx = data.tiles[i].tilex;
                                var qy = data.tiles[i].tiley;
                                for (var j=0; j<affected_quads.length; j++) {
                                    if (affected_quads[j].x == qx &&
                                        affected_quads[j].y == qy) {
                                        break;
                                    }
                                }
                                console.log(qx+" "+qy+" "+j+" "+affected_quads.length);
                                if (j === affected_quads.length) {
                                    affected_quads.push({x:qx, y:qy});
                                    io.sockets.in("wordfound_"+qx+"_"+qy).emit("wordfound", {tiles: cvtTiles(data.tiles)});
                                    console.log(io.sockets.clients("wordfound_"+qx+"_"+qy));
                                }
                            }
                            //socket.broadcast.emit("wordfound", {tiles: data.tiles});

                            var points = 1;
                            if (data.word.length === 4) {
                                points = 1;
                            } else if (data.word.length === 5) {
                                points = 2;
                            } else if (data.word.length === 6) {
                                points = 3;
                            } else {
                                // 7 letters:  5 pnts
                                // 8 letters:  8 pnts
                                // 9 letters:  14 pnts
                                // 10 letters: 21 pnts
                                points = (data.word.length-6)*(data.word.length-6) + 5;
                            }
                            fn({points: points});
                            addScore(socket.id, points);
                            broadcastScoreAndRank(socket.id, socket);

                            user_model.find({ws_connection: socket.id}, function (err, userdata) {
                                var username = "anon";
                                if (userdata.length > 0) {
                                    username = userdata[0].username;
                                    if (username == undefined) {
                                        username = "anon";
                                    }
                                }
                                var d = new Date();
                                recent_Words.push({"user": username, "score": points, "word": data.word, "time": d.getTime()});
                            });
                        } else {
                            console.log("Word is not adjacent to another word.");
                            fn({error: "Word is not adjacent to another word"});
                        }
                    });
                }
            });
            /*
            if (isFoundWord(data.word, data.tiles)) {
                console.log("Word was already found.");
                fn({error: "Already found"});
            } else {
                addFoundWord(data.word, cvtTiles(data.tiles));

                console.log("Valid word!");
                socket.broadcast.emit("wordfound", {tiles: data.tiles});
                fn({points: 1});
            }
            */
        } else {
            fn({error: "Not a word"});
        }
    });
});
