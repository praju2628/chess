module.exports = io => {
    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;
        let isWhitePlayer = false;

        socket.on('move', function(move) {
            io.to(currentCode).emit('newMove', move);
        });

        socket.on('joinGame', function(data) {
            currentCode = data.code;
            socket.join(currentCode);

            if (!global.games[currentCode]) {
                global.games[currentCode] = {
                    whiteJoined: false,
                    blackJoined: false
                };
            }

            if (data.color === 'white') {
                global.games[currentCode].whiteJoined = true;
                isWhitePlayer = true;
            } else if (data.color === 'black') {
                global.games[currentCode].blackJoined = true;
            }

            if (global.games[currentCode].whiteJoined && global.games[currentCode].blackJoined) {
                io.to(currentCode).emit('startGame');
            }
        });

        socket.on('disconnect', function() {
            console.log('Socket disconnected');

            if (currentCode) {
                io.to(currentCode).emit('gameOverDisconnect');
                delete global.games[currentCode];
            }
        });
    });
};
