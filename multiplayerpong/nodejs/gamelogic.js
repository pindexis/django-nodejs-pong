
var UPDATEINTERVALL = 30;

var WINNINGROUNDS = 11;

var COURTWIDTH = 600;
var COURTHEIGHT = 400;

var PADDLEWIDTH = 15;
var PADDLEHEIGHT = 100;
var PADDLESPEED = 8;

var BALLSPEED = 5;
var BALLRADIUS = 6;


function Player(_id, _pusername, _paddleX) {

    var id = _id;
    var username = _pusername;
    var paddleX = _paddleX;

    var score = 0;
    var paddleY;
    var paddleDirY;

    this.resetPaddle = function () {
        paddleY = (COURTWIDTH - PADDLEHEIGHT) / 2;
        paddleDirY = 0;
    };

    this.incrementScore = function (_score) {
        score++;
    };

    this.DirectionUp = function () {
        if (paddleDirY != -1) {
            paddleDirY = -1;
            return true;
        } else {
            return false;
        }
    };

    this.DirectionDown = function () {
        if (paddleDirY != 1) {
            paddleDirY = 1;
            return true;
        } else {
            return false;
        }
    };

    this.DirectionClear = function () {
        if (paddleDirY !== 0) {
            paddleDirY = 0;
            return true;
        } else {
            return false;
        }
    };

    this.regularUpdate = function (elapsed) {
		var newpaddley;
        if (paddleDirY == 1) {
            newpaddley = paddleY + PADDLESPEED * (elapsed / UPDATEINTERVALL);
            paddleY = (newpaddley + PADDLEHEIGHT < COURTHEIGHT) ? newpaddley : COURTHEIGHT - PADDLEHEIGHT;
        } else if (paddleDirY == -1) {
            newpaddley = paddleY - PADDLESPEED * (elapsed / UPDATEINTERVALL);
            paddleY = (newpaddley >= 0) ? newpaddley : 0;
        }
    };


    // only executed by clients for data calculated by server, no check is done cause we trust the server!!
    this.setPlayerVars = function (_score, _y, _dirY) {
        score = _score;
        paddleY = _y;
        paddleDirY = _dirY;
    };

    this.getPaddleX = function () {
        return paddleX;
    };
    this.getPaddleY = function () {
        return paddleY;
    };
    this.getPaddleDirY = function () {
        return paddleDirY;
    };
    this.getScore = function () {
        return score;
    };
	this.getUsername = function(){
		return username;
	};

	this.resetPaddle();
}

function Ball() {

    var x;
    var y;
    var dirX;
    var dirY;
    var speed;

    this.reset = function () {
        x = COURTWIDTH / 2;
        y = COURTHEIGHT / 2;
        dirX = 1;
        dirY = 1;
        speed = BALLSPEED;
    };

    this.regularUpdate = function (elapsed) {
        x = x + dirX * speed * (elapsed / UPDATEINTERVALL);
        y = y + dirY * speed * (elapsed / UPDATEINTERVALL);
		
    };
	
    //check collisions with objects (paddles)
    this.checkCollision = function (objX, objY, objW, objH) {

        if ((x <= objX + objW && x + (2 * BALLRADIUS) >= objX) &&
            (y <= (objY + objH) && y + (2 * BALLRADIUS) >= objY)){
            return true;
		}
        else{
            return false;
		}

    };

    this.bounceVertically = function () {
		dirX = dirX * -1;
		this.raiseSpeed();
    };

    this.bounceHorizentally = function () {
		dirY = dirY * -1;
		this.raiseSpeed();
    };

	// no used for the moment
    this.raiseSpeed = function () {
		if(speed < 10)
        	speed++;
    };

    this.setBallVars = function (_x, _y, _dirX, _dirY, _speed) {
        this.setX(_x);
        this.setY(_y);
        dirX = _dirX;
        dirY = _dirY;
        speed = _speed;
    };

    this.getX = function () {
        return x;
    };
	this.setX = function(_x) {
		if(x >= 0 && x <= COURTWIDTH)
			x = _x;
	};

    this.getY = function () {
        return y;
    };
	this.setY = function(_y) {
		if(y >= 0 && y <= COURTHEIGHT)
			y = _y;
	};

    this.getSpeed = function () {
        return speed;
    };
    this.getDirX = function () {
        return dirX;
    };
    this.getDirY = function () {
        return dirY;
    };


    this.reset();
}

var GameState = { NOTSTARTED : 1, ACTIVE : 2, OVER : 4 };	

function Game(player1username, player2username) {
    var ball = new Ball();
    var player1 = new Player(1, player1username, 0);
    var player2 = new Player(2, player2username, COURTWIDTH - PADDLEWIDTH);
	
	var gameState = GameState.NOTSTARTED;
	var lastUpdate;
	
	this.start = function(){
		assert(gameState === GameState.NOTSTARTED);
		gameState = GameState.ACTIVE;
		lastUpdate =  new Date().getTime();
	};


	this.getPlayer = function(playerid){
		return playerid === 1 ? player1 : player2;
	};

	this.getBall = function(){
		return ball;
	};

    this.getGameVars = function () {
		assert(gameState !== GameState.NOTSTARTED);
        return {
			gameState: gameState,			

            player1Score: player1.getScore(),
            player1PaddleY: player1.getPaddleY(),
            player1PaddleDirY: player1.getPaddleDirY(),

            player2Score: player2.getScore(),
            player2PaddleY: player2.getPaddleY(),
            player2PaddleDirY: player2.getPaddleDirY(),

            ballX: ball.getX(),
            ballY: ball.getY(),
            ballDirX: ball.getDirX(),
            ballDirY: ball.getDirY(),
            ballSpeed: ball.getSpeed()
        };
    };

	this.isOver = function(){
		return (gameState === GameState.OVER) ? true : false;
	};
	this.getWinnerId = function(){
		assert(player1.getScore() == 11 || player2.getScore() == 11);
		return player1.getScore() == 11 ? 1 : 2;
	};

	// update game variables from the server
    this.setGameVars = function (vars) {
		//assert(gameState === GameState.ACTIVE || gameState === GameState.PAUSED);
		//assert(vars.gameState === GameState.ACTIVE || vars.gameState === GameState.PAUSED);
		//gameState == vars.gameState
        player1.setPlayerVars(vars.player1Score, vars.player1PaddleY, vars.player1PaddleDirY);
        player2.setPlayerVars(vars.player2Score, vars.player2PaddleY, vars.player2PaddleDirY);
        ball.setBallVars(vars.ballX, vars.ballY, vars.ballDirX,vars.ballDirY, vars.ballSpeed);
    };

	function finishRound(winner) {
		assert(gameState === GameState.ACTIVE);
		ball.reset();
		winner.incrementScore();
		if(player1.getScore() == 11 || player2.getScore() ==11){ 
			gameState = GameState.OVER;
		}
	}
	
    this.updateGameState = function() {
		if(gameState !== GameState.ACTIVE)
			return;
		var	elapsed =  new Date().getTime() - lastUpdate;

		ball.regularUpdate(elapsed);
		player1.regularUpdate(elapsed);
        player2.regularUpdate(elapsed);

        if (ball.getX() <= 0)
            finishRound(player2);
        else if (ball.getX() + 2 * BALLRADIUS >= COURTWIDTH)
            finishRound(player1);
        else {

            if (ball.getY() <= 0){
                ball.bounceHorizentally();
				ball.setY(0);
			}else if (ball.getY() + 2 * BALLRADIUS >= COURTHEIGHT){
                ball.bounceHorizentally();
				ball.setY(COURTHEIGHT - 2 * BALLRADIUS);
			}

            if (ball.checkCollision(player1.getPaddleX(), player1.getPaddleY(), PADDLEWIDTH, PADDLEHEIGHT)){
				ball.bounceVertically();
				ball.setX(PADDLEWIDTH);
			}
            else if (ball.checkCollision(player2.getPaddleX(), player2.getPaddleY(), PADDLEWIDTH, PADDLEHEIGHT)){
                ball.bounceVertically();
				ball.setX(COURTWIDTH - PADDLEWIDTH - 2 * BALLRADIUS);
			}

            
        }

		lastUpdate = new Date().getTime();
    };
	

}

if (typeof exports !== 'undefined') {
    exports.Game = Game;
	exports.GameState = GameState;
	exports.UPDATEINTERVALL = UPDATEINTERVALL;
}


function assert(cond){
	if(cond === false)
		throw("exception in " + arguments.callee.caller.toString());
}
