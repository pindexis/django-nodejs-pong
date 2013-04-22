$(document).ready(function () {


	var socket;
	var gameContext;

    var start = function () {
        socket = io.connect('127.0.0.1', {
            port: 4000
        });

        socket.on('connect', function () {
            console.log("connect");
        });

        socket.on("connectionrefused", function (obj) {
            var data = jQuery.parseJSON(obj);
            alert(data.message);
            socket.disconnect();
        });

        socket.on("wait", function () {
            waitOpponent();
        });

        socket.on("setid", function (id) {
            gameContext = new ClientGameContext();
            gameContext.setPlayerId(id);
        });

        socket.on("startgame", function (obj) {
            console.log(obj);
            var data = jQuery.parseJSON(obj);
            gameContext.startGame(data);
        });

        socket.on("gameupdate", function (obj) {
            var data = jQuery.parseJSON(obj);
            gameContext.updateGameFromServer(data);
        });

        socket.on("opponentmoved", function (obj) {
            var data = jQuery.parseJSON(obj);
            gameContext.opponentMoved(data);
        });

        socket.on("gameover", function (obj) {
            var data = jQuery.parseJSON(obj);
            gameContext.gameOver(data);
        });
    };


    function ClientGameContext() {

        var refreshGameIntervalId;
        var game;
        var playerId;

        this.setPlayerId = function (id) {
            assert(playerId == null);
            playerId = id;
        };
		
		this.playerUp = function(){
			if(game.getPlayer(playerId).DirectionUp())
				socket.emit( 'message',JSON.stringify({upKey:true}) );
			
		}
		
		this.playerDown = function(){
			if(game.getPlayer(playerId).DirectionDown())
				socket.emit('message', JSON.stringify({downKey:true}) );
			
		}

		this.playerKeyRelease = function(){
			if(game.getPlayer(playerId).DirectionClear())
				socket.emit('message', JSON.stringify({keyReleased:true}) );
			
		}
		this.opponentMoved = function(data){
			var opponent = game.getPlayer((playerId === 1) ? 2 : 1);
			if (data.upKey)
            	opponent.DirectionUp();
			else if (data.downKey)
            	opponent.DirectionDown();
			else if (data.keyReleased)
				opponent.DirectionClear();
			else{
				console.log("unrecognized Message from Client " + JSON.stringify(data) );
				return;
			}
			game.updateGameState();
		};
		

        this.startGame = function (initialState) {
            assert(playerId != null);
            console.log("Game Started!!!");
            game = new Game(initialState.client1, initialState.client2);
			game.setGameVars(initialState.gvars);
            game.start();
            refreshGameIntervalId = setInterval(this.updateLocalGame, UPDATEINTERVALL);

            var gvars = game.getGameVars();
            initializeGraphics(game.getPlayer(1).getUsername(), game.getPlayer(2).getUsername());
            updateGraphics(gvars.player1Score, gvars.player2Score, gvars.ballX, gvars.ballY, gvars.player1PaddleY, gvars.player2PaddleY);
        };


        this.updateLocalGame = function () {		
			var roundOver = game.updateGameState();
			var gvars = game.getGameVars();
            updateGraphics(gvars.player1Score, gvars.player2Score, gvars.ballX, gvars.ballY, gvars.player1PaddleY, gvars.player2PaddleY);
			if(roundOver){
				game.pause();
				clearInterval(refreshGameIntervalId);
			}	
        };

        this.updateGameFromServer = function (gvars) {
            //console.log("game updated, Data Recieved: ", JSON.stringify(gvars));
			//console.log("locals are:                  ", JSON.stringify(game.getGameVars()));
			localvars = game.getGameVars();

			// hack, need to change this
			if(playerId == 1){
				gvars.player1PaddleY = localvars.player1PaddleY;
				gvars.player1PaddleDirY = localvars.player1PaddleDirY
			}else{
				gvars.player2PaddleY = localvars.player2PaddleY;
				gvars.player2PaddleDirY = localvars.player2PaddleDirY
			}
            game.setGameVars(gvars);
            updateGraphics(gvars.player1Score, gvars.player2Score, gvars.ballX, gvars.ballY, gvars.player1PaddleY, gvars.player2PaddleY);
			if(game.getGameState() === GameState.PAUSED){
				game.resume();
				refreshGameIntervalId = setInterval(this.updateLocalGame, UPDATEINTERVALL);
			}	
        };


        this.gameOver = function (data) {
            console.log("game over, Data Recieved: ", JSON.stringify(data));
            clearInterval(refreshGameIntervalId);
            won = data.winnerid == playerId ? true : false;
            message = data.message;
            if (won) {
                alert("you won, " + message);
            } else {
                alert("you lost " + message);
            }
            $("#clientstate").text("Game Over");
        };
		this.getPlayerId = function(){
			return playerId;
		};
    }


    function waitOpponent() {
        console.log("Waiting for opponent");
        $("#clientstate").text("Waiting for Opponent");
        $("#game").hide();
    }

 

	function assert(cond){
		if(cond === false)
			throw("exception in " + arguments.callee.caller.toString());
	}

	$("body").keydown(function(e) {
		if ( e.which == 38) {
			gameContext.playerUp();
		} else if ( e.which == 40) {
			gameContext.playerDown();
		} 
	});

	$("body").keyup(function(e) {
		if ( e.which == 38 || e.which == 40) {
			gameContext.playerKeyRelease();
    	}
	});



    function initializeGraphics(player1Username, player2Username) {
        $("#game").show();
		//$("body").css("overflow", "hidden");
        $("#clientstate").text("Game Active");
        $("#game-field").css("width", COURTWIDTH);
        $("#game-field").css("height", COURTHEIGHT);
        $(".paddle").css("height", PADDLEHEIGHT);
        $(".paddle").css("width", PADDLEWIDTH);
        $("#ball").css({
            "width": BALLRADIUS * 2,
            "height": BALLRADIUS * 2,
        });


        $("#left-paddle").css({
            "float": "left"
        });
        $("#right-paddle").css({
            "float": "right"
        });
        $("#ball").css({
            "background-color": "#FFFFFF",
            "position": "relative"
        });
		
        $("#player1-username").text(((gameContext.getPlayerId() == 1 ) ? "you ( " : "Oponnent ( ") + player1Username +" )");
        $("#player2-username").text(((gameContext.getPlayerId() == 2 ) ? "you ( " : "Oponnent ( ") + player2Username +" )");

    }

    function updateGraphics(player1score, player2score, ballx, bally, player1paddley, player2paddley) {
        $("#player1-score").text(player1score);
        $("#player2-score").text(player2score);
        $("#ball").css({
            "top": (COURTHEIGHT - 2 * BALLRADIUS - bally) + "px",
            "left": ballx + "px"
        });
        $("#left-paddle").css({
            "top": COURTHEIGHT - PADDLEHEIGHT - player1paddley + "px"
        });
        $("#right-paddle").css({
            "top": COURTHEIGHT - PADDLEHEIGHT - player2paddley + "px"
        });
    }


    start();

});
