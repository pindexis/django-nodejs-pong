var http = require('http');
var GameLogic = require('./gamelogic.js');
console.log(GameLogic);
var server = http.createServer().listen(4000);
var io = require('socket.io').listen(server);
var cookie_reader = require('cookie');
var querystring = require('querystring');


var CLIENTUPDATEINTERVALL = 1000;


// Maintain Dajngo Session Cookie in Socket.io Communication
io.configure(function () {
    io.set('authorization', function (data, accept) {
        if (data.headers.cookie) {
            data.cookie = cookie_reader.parse(data.headers.cookie);
            return accept(null, true);
        }
        return accept('No cookie transmitted.', false);
    });
    io.set('log level', 1);
});

var gameServerContext = new GameServerContext();

function GameServerContext() {

    var refreshClientsIntervalId;
	var refreshGameIntervalId;

    var client1;
    var client2;
    var game;

    this.clientJoined = function (clientusername, socket) {
        assert(client1 || !client2);
		if(clientusername == null)
			return false;
        else if (client1 != null && client2 != null) {
            socket.emit("connectionrefused", JSON.stringify({
                message: "Game is Full"
            }));
            return false;
		}
		else if (clientusername == client1 || clientusername == client2){
			 socket.emit("connectionrefused", JSON.stringify({
                message: "You're Already Playing! to test, login with another account in a new browser session, (CTRL + SHIFT + N) in chrome"
            }));
            return false;
        } else {
            if (!client1) {
                client1 = clientusername;
                socket.emit("wait");
            } else {
                client2 = clientusername;
                socket.emit('setid', 2);
                socket.broadcast.emit('setid', 1);
                startGame();
            }
            return true;
        }
    };

    this.clientQuit = function clientQuit(client) {

        if(client !== null && (client === client1 || client === client2))
		    if (client1 && !client2) {
		        client1 = null;
		    } else if (client1 && client2) {
		        assert(game != null);
		        gameOver((client === client1) ? 2 : 1, "other Player Disconnected");
		    }
    };

    this.clientMessaged = function (client, data, socket) {

        assert(client !== null && (client === client1 || client === client2));
				
		if(game == null || game.isOver())
			return;

        var player = (client === client1) ? game.getPlayer(1) : game.getPlayer(2);
		var clientsupdateneeded = false;
        if (data.upKey && player.DirectionUp())
            clientsupdateneeded = true;
        else if (data.downKey && player.DirectionDown())
            clientsupdateneeded = true;
		else if (data.keyReleased && player.DirectionClear())
			clientsupdateneeded = true;
		else{
			console.log("unrecognized Message from Client " + JSON.stringify(data) );
			return;
		}
		if(clientsupdateneeded){
			socket.broadcast.emit('opponentmoved',JSON.stringify(data));
			game.updateGameState();
		}
    };

    function startGame() {
        console.log("Game Started! " + client1 + " vs " + client2 );
        game = new GameLogic.Game(client1, client2);
		game.start();
		io.sockets.emit("startgame",JSON.stringify({client1 : client1, client2 : client2}));

        refreshClientsIntervalId = setInterval(updateClients, CLIENTUPDATEINTERVALL);
		refreshGameIntervalId = setInterval(game.updateGameState, GameLogic.UPDATEINTERVALL);
    }

    function updateClients() {
        if (game.isOver()) {
            gameOver(game.getWinnerId(), " ");
        } else {
            console.log("updating players");
            io.sockets.emit("gameupdate", JSON.stringify(game.getGameVars()));
        }
    }


    function gameOver(winnerid, message) {
        console.log("Game Over " + winnerid);

        io.sockets.emit("gameover", JSON.stringify({
            winnerid: winnerid,
            message: message
        }));

        makeRequestDjango({
            action: "gameover",
            winner: winnerid === 1 ? client1 : client2,
            looser: winnerid === 1 ? client2 : client1
        });
        releaseRessources();
    }

    function releaseRessources() {
        clearInterval(refreshClientsIntervalId);
		clearInterval(refreshGameIntervalId);
        client1 = null;
        client2 = null;
        game = null;
    }

}


io.sockets.on('connection', function (socket) {

    // connect to django to validate session and get username
    console.log("a client just connect");
    var clientsession = socket.handshake.cookie.sessionid;
    if (!clientsession){
         socket.emit("connectionrefused", JSON.stringify({
                message: "Invalid Session, Login First"
            }));
		 socket.disconnect();
            return;
	}
    makeRequestDjango({
        action: "validatesession",
        session: clientsession
    }, function (username) {
        if (!username || username == "INVALID") {
			console.log("invalid session");
            socket.emit("connectionrefused", JSON.stringify({
                message: "Invalid Session, Login First"
            }));
            socket.disconnect();
            return;
        } else {
            if (!gameServerContext.clientJoined(username, socket)) {
                socket.disconnect();
                return;
            }
            socket.on('message', function (message) {
                try {
                    var json = JSON.parse(message);
                    gameServerContext.clientMessaged(username, json, socket);
                } catch (e2) {
                    console.log('Invalid JSON: ' + message.utf8Data);
                    return;
                }

            });

            socket.on('disconnect', function (socket) {
                gameServerContext.clientQuit(username);
            });
        }

    });

});




function makeRequestDjango(data, callback) {

    var post_data = querystring.stringify(data);

    var post_options = {
        host: 'localhost',
        port: 3000,
        path: '/node_api/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };
    var post_req = http.request(post_options, function (res) {
        res.setEncoding('utf8');
        if (callback && typeof (callback) == "function") {
            res.on('data', function (mess) {
                callback(mess);
            });
        }
    });

    post_req.write(post_data);
    post_req.end();

}

/* merge two objects, from https://gist.github.com/svlasov-gists/2383751 */
function merge(target, source) {
    /* Merges two (or more) objects,
	giving the last one precedence */
    if (typeof target !== 'object') {
        target = {};
    }
    for (var property in source) {
        if (source.hasOwnProperty(property)) {
            var sourceProperty = source[property];
            if (typeof sourceProperty === 'object') {
                target[property] = merge(target[property], sourceProperty);
                continue;
            }
            target[property] = sourceProperty;
        }
    }
    for (var a = 2, l = arguments.length; a < l; a++) {
        merge(target, arguments[a]);
    }
    return target;
}

function assert(cond){
	if(cond === false)
		throw("exception in " + arguments.callee.caller.toString());
}
