
let gameHasStarted = false;
var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
let gameOver = false;

function onDragStart (source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
    if (!gameHasStarted) return false;
    if (gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function onDrop (source, target) {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    };
    // see if the move is legal
    var move = game.move(theMove);


    // illegal move
    if (move === null) return 'snapback'

    socket.emit('move', theMove);

    updateStatus()
}

socket.on('newMove', function(move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
    board.position(game.fen())
}

function updateStatus () {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
    }

    else if (gameOver) {
        status = 'Opponent disconnected, you win!'
    }

    else if (!gameHasStarted) {
        status = 'Waiting for black to join'
    }

    // game still on
    else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }
        
    }

    $status.html(status)
    $pgn.html(game.pgn())
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
}
board = Chessboard('myBoard', config)
if (playerColor == 'black') {
    board.flip();
}

updateStatus()

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', {
        code: urlParams.get('code')
    });
}

socket.on('startGame', function() {
    gameHasStarted = true;
    updateStatus()
});

socket.on('gameOverDisconnect', function() {
    gameOver = true;
    updateStatus()
});
$(document).ready(function() {
    const gameTime = 10 * 60; // 10 minutes in seconds
    let whiteTime = gameTime;
    let blackTime = gameTime;
    let currentPlayer = 'white';
    let timerInterval;
    let bothPlayersReady = false;

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateTimers() {
        $('#whiteTimer').text(`White: ${formatTime(whiteTime)}`);
        $('#blackTimer').text(`Black: ${formatTime(blackTime)}`);
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (currentPlayer === 'white') {
                whiteTime--;
            } else {
                blackTime--;
            }
            updateTimers();
            if (whiteTime <= 0 || blackTime <= 0) {
                clearInterval(timerInterval);
                alert(`${currentPlayer === 'white' ? 'Black' : 'White'} wins on time!`);
                socket.emit('gameOver', `${currentPlayer === 'white' ? 'Black' : 'White'} wins on time!`);
            }
        }, 1000);
    }

    function switchPlayer() {
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        startTimer();
    }

    // Initialize timers
    updateTimers();

    // Listen for moves
    socket.on('newMove', function(move) {
        switchPlayer();
    });

    socket.on('startGame', function() {
        // Reset timers when the game starts
        whiteTime = gameTime;
        blackTime = gameTime;
        currentPlayer = 'white';
        updateTimers();
        bothPlayersReady = true;
        startTimer();
    });

    socket.on('gameOverDisconnect', function() {
        clearInterval(timerInterval);
        alert('Game over due to disconnect');
    });

    // Emit join game event
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    socket.emit('joinGame', { code: code, color: playerColor });
});
