

// constants
const EMPTY = 0;
const RED = 1;
const RED_KING = 2;
const WHITE = 3;
const WHITE_KING = 4;

// additionals
const isRed = (piece) => piece === RED || piece === RED_KING;
const isWhite = (piece) => piece === WHITE || piece === WHITE_KING;
const isKing = (piece) => piece === RED_KING || piece === WHITE_KING;
const isEmpty = (piece) => piece === EMPTY;

// globals
let gameBoard = [];
let currentTurn = 'red';
let selectedPiece = null;
let gameActive = true;
let moveHistory = [];
let boardHistory = [];
let turnHistory = [];

window.moveCount = 0;
window.captureCount = 0;
window.kingsCount = 0;
window.missedCaptures = 0;
window.goodMoves = 0;
window.totalMoves = 0;

let aiDepth = 3;
let hintsOn = true;
let dangerOn = false;
let coachOn = true;
let aiThinking = false;

// init
function initBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(EMPTY));
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                if (row < 3) board[row][col] = WHITE;
                else if (row > 4) board[row][col] = RED;
            }
        }
    }
    return board;
}


function getNormalMoves(board, row, col, piece) {
    const moves = [];
    const isRedPiece = isRed(piece);
    const isKingPiece = isKing(piece);

    let directions = [];
    if (isRedPiece) directions = [[-1, -1], [-1, 1]];
    if (isWhite(piece)) directions = [[1, -1], [1, 1]];
    if (isKingPiece) directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            if (isEmpty(board[newRow][newCol])) {
                moves.push({ from: [row, col], to: [newRow, newCol], captured: [] });
            }
        }
    }
    return moves;
}

// damka
function getKingMoves(board, row, col, piece) {
    const moves = [];
    const isRedPiece = isRed(piece);
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        for (let step = 1; step <= 7; step++) {
            const newRow = row + dr * step;
            const newCol = col + dc * step;
            if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;

            const target = board[newRow][newCol];
            if (isEmpty(target)) {
                moves.push({ from: [row, col], to: [newRow, newCol], captured: [] });
            } else {
                const isEnemy = (isRedPiece && isWhite(target)) || (!isRedPiece && isRed(target));
                if (isEnemy) {
                    const captureRow = newRow + dr;
                    const captureCol = newCol + dc;
                    if (captureRow >= 0 && captureRow < 8 && captureCol >= 0 && captureCol < 8) {
                        if (isEmpty(board[captureRow][captureCol])) {
                            moves.push({ from: [row, col], to: [captureRow, captureCol], captured: [[newRow, newCol]] });
                        }
                    }
                }
                break;
            }
        }
    }
    return moves;
}

// possible takes
function getCaptureMoves(board, row, col, piece, alreadyCaptured = []) {
    const captures = [];
    const isRedPiece = isRed(piece);
    const isKingPiece = isKing(piece);

    let directions = [];
    if (isRedPiece && !isKingPiece) directions = [[-1, -1], [-1, 1]];
    else if (isWhite(piece) && !isKingPiece) directions = [[1, -1], [1, 1]];
    else directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        const midRow = row + dr;
        const midCol = col + dc;
        const captureRow = row + dr * 2;
        const captureCol = col + dc * 2;

        if (captureRow >= 0 && captureRow < 8 && captureCol >= 0 && captureCol < 8) {
            const midPiece = board[midRow][midCol];
            const targetPiece = board[captureRow][captureCol];
            const isEnemy = (isRedPiece && isWhite(midPiece)) || (!isRedPiece && isRed(midPiece));
            const midKey = `${midRow},${midCol}`;

            if (isEnemy && isEmpty(targetPiece) && !alreadyCaptured.includes(midKey)) {
                captures.push({ from: [row, col], to: [captureRow, captureCol], captured: [[midRow, midCol]] });
            }
        }
    }
    return captures;
}

// all moves
function getAllValidMoves(board, row, col, alreadyCaptured = []) {
    const piece = board[row][col];
    if (isEmpty(piece)) return [];

    let captures = getCaptureMoves(board, row, col, piece, alreadyCaptured);

    if (captures.length > 0) {
        const multiCaptures = [];
        for (const cap of captures) {
            const tempBoard = board.map(r => [...r]);
            tempBoard[row][col] = EMPTY;
            tempBoard[cap.captured[0][0]][cap.captured[0][1]] = EMPTY;

            const promoted = (isRed(piece) && cap.to[0] === 0) || (isWhite(piece) && cap.to[0] === 7);
            if (promoted) { multiCaptures.push(cap); continue; }

            tempBoard[cap.to[0]][cap.to[1]] = piece;
            const newCaptures = getAllValidMoves(tempBoard, cap.to[0], cap.to[1], [...alreadyCaptured, `${cap.captured[0][0]},${cap.captured[0][1]}`]);
            const furtherCaptures = newCaptures.filter(m => m.captured.length > 0);

            if (furtherCaptures.length > 0) {
                for (const further of furtherCaptures) {
                    multiCaptures.push({ from: [row, col], to: further.to, captured: [...cap.captured, ...further.captured] });
                }
            } else {
                multiCaptures.push(cap);
            }
        }
        return multiCaptures;
    }

    return isKing(piece) ? getKingMoves(board, row, col, piece) : getNormalMoves(board, row, col, piece);
}

// mandatory takes
function getAllMandatoryCaptures(board, player) {
    const allCaptures = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!isEmpty(piece)) {
                const isRedPiece = isRed(piece);
                if ((player === 'red' && isRedPiece) || (player === 'white' && !isRedPiece)) {
                    const moves = getAllValidMoves(board, row, col, []);
                    allCaptures.push(...moves.filter(m => m.captured.length > 0));
                }
            }
        }
    }
    return allCaptures;
}

// all moves
function getAllMovesForPlayer(board, player) {
    const allMoves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!isEmpty(piece)) {
                const isRedPiece = isRed(piece);
                if ((player === 'red' && isRedPiece) || (player === 'white' && !isRedPiece)) {
                    allMoves.push(...getAllValidMoves(board, row, col, []));
                }
            }
        }
    }
    const captures = allMoves.filter(m => m.captured.length > 0);
    return captures.length > 0 ? captures : allMoves;
}

// move
function executeMove(move, player) {
    boardHistory.push(gameBoard.map(row => [...row]));
    turnHistory.push(currentTurn);

    const { from, to, captured } = move;
    const piece = gameBoard[from[0]][from[1]];

    gameBoard[from[0]][from[1]] = EMPTY;
    captured.forEach(([cr, cc]) => { gameBoard[cr][cc] = EMPTY; });

    let promoted = false;
    if (player === 'red' && to[0] === 0) {
        gameBoard[to[0]][to[1]] = RED_KING;
        promoted = true;
    } else if (player === 'white' && to[0] === 7) {
        gameBoard[to[0]][to[1]] = WHITE_KING;
        promoted = true;
    } else {
        gameBoard[to[0]][to[1]] = piece;
    }

    addToMoveLog(from, to, captured, promoted, player);

    // red move
    if (player === 'red') {
        window.moveCount++;
        document.getElementById('stat-moves').textContent = window.moveCount;

        if (captured.length > 0) {
            window.captureCount += captured.length;
            document.getElementById('stat-cap').textContent = window.captureCount;
            if (window.utils) window.utils.playCaptureSound();
        }
        if (promoted) {
            window.kingsCount++;
            document.getElementById('stat-kings').textContent = window.kingsCount;
            if (window.utils) window.utils.playKingSound();
        } else if (captured.length === 0) {
            if (window.utils) window.utils.playMoveSound();
        }

        if (window.analyzeMove && coachOn) window.analyzeMove(move, player);

        selectedPiece = null;

        // Съели все фигуры AI?
        const whitePiecesLeft = gameBoard.flat().filter(p => isWhite(p)).length;
        if (whitePiecesLeft === 0) {
            gameActive = false;
            currentTurn = 'red';
            renderBoard();
            if (window.utils) window.utils.playWinSound();
            showGameOver('red');
            return;
        }

        currentTurn = 'white';
        renderBoard();
        updateStatusMessage();

        if (gameActive && !window.multiplayerMode) {
            setTimeout(() => {
                if (typeof window.makeAIMove === 'function') window.makeAIMove();
            }, 300);
        }
        return;
    }

    // ai move
    if (player === 'white') {
        selectedPiece = null;

        // Съели все красные фигуры?
        const redPiecesLeft = gameBoard.flat().filter(p => isRed(p)).length;
        if (redPiecesLeft === 0) {
            gameActive = false;
            renderBoard();
            if (window.utils) window.utils.playLoseSound();
            showGameOver('white');
            return;
        }

        currentTurn = 'red';
        renderBoard();
        updateStatusMessage();

        // Игрок заблокирован?
        if (getAllMovesForPlayer(gameBoard, 'red').length === 0) {
            gameActive = false;
            if (window.utils) window.utils.playLoseSound();
            showGameOver('white');
            return;
        }

        // AI заблокирован на следующем ходу?
        if (getAllMovesForPlayer(gameBoard, 'white').length === 0) {
            gameActive = false;
            if (window.utils) window.utils.playWinSound();
            showGameOver('red');
            return;
        }

        console.log('✅ AI move completed, waiting for player');
    }
}

// moves' log
function addToMoveLog(from, to, captured, promoted, player) {
    const log = document.getElementById('move-log');
    if (!log) return;

    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let moveText = `${files[from[1]]}${8 - from[0]} → ${files[to[1]]}${8 - to[0]}`;
    if (promoted) moveText += ' 👑';
    if (captured.length > 0) moveText += ` ×${captured.length}`;

    const item = document.createElement('div');
    item.className = `move-item ${captured.length > 0 ? 'capture' : ''} ${player === 'white' ? 'ai' : ''}`;
    item.innerHTML = `
        <span class="move-num">${moveHistory.length + 1}</span>
        <span class="move-icon">${player === 'red' ? '🔴' : '⚪'}</span>
        <span class="move-text">${moveText}</span>
    `;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
    moveHistory.push({ from, to, captured, promoted, player });
}

// win
function showGameOver(winner, resigned = false) {
    const accuracy = window.totalMoves > 0 ? Math.round((window.goodMoves / window.totalMoves) * 100) : 0;

    // In multiplayer, win = winner matches my colour; in solo, win = red wins
    const myCol = window.multiplayerMode ? (window.myColor || 'red') : 'red';
    const isWin = winner === myCol;
    const isMultiplayer = !!window.multiplayerMode;

    console.log('🎮 Game over! Winner:', winner, '| My color:', myCol, resigned ? '(resigned)' : '');

    if (window.analyzeFullGame) window.analyzeFullGame();
    if (window.saveGameToSupabase) window.saveGameToSupabase(winner, window.moveCount, window.captureCount);

    const oldOverlay = document.getElementById('game-over-overlay');
    if (oldOverlay) oldOverlay.remove();

    let title, subtitle, icon;
    if (resigned) {
        icon = '🏳️';
        title = 'You Resigned';
        subtitle = isMultiplayer ? 'Your opponent wins the match.' : 'Better luck next time. Study the position before giving up!';
    } else if (isWin) {
        icon = '🏆';
        title = 'You Win!';
        subtitle = isMultiplayer
            ? `Excellent! You defeated your opponent playing as ${myCol === 'red' ? '🔴 Red' : '⚪ White'}.`
            : 'Outstanding play! You outsmarted the AI.';
    } else {
        icon = '💀';
        title = 'You Lose';
        subtitle = isMultiplayer
            ? `Your opponent won playing as ${winner === 'red' ? '🔴 Red' : '⚪ White'}. Rematch?`
            : 'The AI found the winning line. Try again!';
    }

    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.id = 'game-over-overlay';
    overlay.innerHTML = `
        <div class="game-over-card">
            <div class="game-over-icon">${icon}</div>
            <div class="game-over-title">${title}</div>
            <div class="game-over-sub">${subtitle}</div>
            <div class="game-over-stats">
                <div class="go-stat"><div class="v">${window.moveCount}</div><div class="l">Moves</div></div>
                <div class="go-stat"><div class="v">${window.captureCount}</div><div class="l">Captures</div></div>
                <div class="go-stat"><div class="v">${accuracy}%</div><div class="l">Accuracy</div></div>
            </div>
            ${isMultiplayer
                ? `<div style="display:flex;gap:8px;margin-top:8px">
                       <button class="btn-main" id="play-again-btn" style="flex:1">🔄 Rematch</button>
                       <button class="btn-secondary" id="leave-mp-btn" style="flex:1">🚪 Leave</button>
                   </div>`
                : `<button class="btn-main" id="play-again-btn">Play Again</button>`
            }
        </div>
    `;

    document.body.appendChild(overlay);

    if (isMultiplayer) {
        document.getElementById('play-again-btn').addEventListener('click', () => {
            overlay.remove();
            // Reset and restart with same room/colour
            window.leaveMultiplayer ? window.leaveMultiplayer() : startGame();
        });
        document.getElementById('leave-mp-btn').addEventListener('click', () => {
            overlay.remove();
            if (window.leaveMultiplayer) window.leaveMultiplayer();
        });
    } else {
        document.getElementById('play-again-btn').addEventListener('click', () => startGame());
    }
}

// resign
function resignGame() {
    if (!gameActive) {
        showToast('No active game to resign!', 1500);
        return;
    }

    // Подтверждение чтобы не нажать случайно
    const confirmed = confirm('Are you sure you want to resign? This counts as a loss.');
    if (!confirmed) return;

    gameActive = false;
    aiThinking = false;
    if (window.utils) window.utils.playLoseSound();
    showGameOver('white', true); // winner = white (AI), resigned = true
    showToast('You resigned. Better luck next time!', 2000);
}

// render of the board
function renderBoard() {
    const container = document.getElementById('board');
    if (!container) return;

    container.innerHTML = '';

    const colLabels = document.getElementById('col-labels');
    colLabels.innerHTML = '<div style="width:0px"></div>';
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(l => {
        const d = document.createElement('div');
        d.className = 'col-label';
        d.textContent = l;
        colLabels.appendChild(d);
    });

    const rowLabels = document.getElementById('row-labels');
    rowLabels.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        const d = document.createElement('div');
        d.className = 'row-label';
        d.textContent = 8 - r;
        rowLabels.appendChild(d);
    }

    let hints = [];
    if (selectedPiece && gameActive) {
        hints = getAllValidMoves(gameBoard, selectedPiece.row, selectedPiece.col, []);
    }

    const mandatoryCaptures = getAllMandatoryCaptures(gameBoard, 'red');
    const hasMandatory = mandatoryCaptures.length > 0;

    const dangerCells = {};
    if (dangerOn) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (isWhite(gameBoard[r][c])) {
                    getAllValidMoves(gameBoard, r, c, []).forEach(m => {
                        if (m.captured.length > 0) dangerCells[`${m.captured[0][0]},${m.captured[0][1]}`] = true;
                    });
                }
            }
        }
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isDark = (row + col) % 2 === 1;
            const cell = document.createElement('div');
            cell.className = `cell ${isDark ? 'dark' : 'light'}`;

            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) cell.classList.add('selected');
            if (isDark && hintsOn && hints.some(h => h.to[0] === row && h.to[1] === col) && gameActive) cell.classList.add('hinted');
            if (isDark && dangerOn && dangerCells[`${row},${col}`] && gameActive) cell.classList.add('danger-hint');

            cell.dataset.row = row;
            cell.dataset.col = col;

            const piece = gameBoard[row][col];
            if (!isEmpty(piece)) {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = `piece ${isRed(piece) ? 'red' : 'white'} ${isKing(piece) ? 'king' : ''}`;

                if (hasMandatory && currentTurn === 'red' && isRed(piece)) {
                    const canCapture = getAllValidMoves(gameBoard, row, col, []).some(m => m.captured.length > 0);
                    if (canCapture) pieceDiv.style.animation = 'pulse 1s infinite';
                }

                pieceDiv.addEventListener('click', (e) => { e.stopPropagation(); handleCellClick(row, col); });
                cell.appendChild(pieceDiv);
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            container.appendChild(cell);
        }
    }

    const redCount = gameBoard.flat().filter(p => isRed(p)).length;
    const whiteCount = gameBoard.flat().filter(p => isWhite(p)).length;
    document.getElementById('p1count').textContent = redCount;
    document.getElementById('p2count').textContent = whiteCount;
    document.getElementById('p1card').className = `player-card ${currentTurn === 'red' ? 'active' : ''}`;
    document.getElementById('p2card').className = `player-card ${currentTurn === 'white' ? 'active' : ''}`;

    updateStatusMessage();
}

// clicks
function handleCellClick(row, col) {
    if (!gameActive) return;

    // In multiplayer each player moves their own colour; in solo only red (human)
    if (window.multiplayerMode) {
        const myCol = window.myColor || 'red';
        if (currentTurn !== myCol) { showToast('Wait for opponent...', 1000); return; }
    } else {
        if (currentTurn !== 'red') { showToast('Wait for AI move...', 1000); return; }
    }

    const activeColor = window.multiplayerMode ? (window.myColor || 'red') : 'red';
    const piece = gameBoard[row][col];
    const mandatoryCaptures = getAllMandatoryCaptures(gameBoard, activeColor);
    const hasMandatory = mandatoryCaptures.length > 0;
    const isMyPiece = activeColor === 'red' ? isRed(piece) : isWhite(piece);

    if (selectedPiece === null && !isEmpty(piece) && isMyPiece) {
        if (hasMandatory) {
            const canCapture = getAllValidMoves(gameBoard, row, col, []).some(m => m.captured.length > 0);
            if (!canCapture) { showToast('You must capture! Choose a piece that can capture.', 1500); return; }
        }
        selectedPiece = { row, col };
        renderBoard();
        updateStatusMessage();
        return;
    }

    if (selectedPiece !== null) {
        const moves = getAllValidMoves(gameBoard, selectedPiece.row, selectedPiece.col, []);
        const move = moves.find(m => m.to[0] === row && m.to[1] === col);
        if (move) {
            executeMove(move, activeColor);
        } else {
            showToast('Invalid move!', 1000);
            selectedPiece = null;
            renderBoard();
        }
    }
}

// status
function updateStatusMessage() {
    const dot = document.getElementById('turn-dot');
    const msg = document.getElementById('status-msg');
    const right = document.getElementById('status-right');

    if (!gameActive) { msg.textContent = 'Game Over'; right.textContent = ''; return; }

    const myCol = window.multiplayerMode ? (window.myColor || 'red') : 'red';
    const isMyTurn = currentTurn === myCol;

    if (currentTurn === 'red') {
        dot.className = 'turn-dot red';
        if (window.multiplayerMode) {
            msg.textContent = isMyTurn ? 'Your turn (Red)' : "Opponent's turn...";
            right.textContent = isMyTurn ? (getAllMandatoryCaptures(gameBoard, 'red').length > 0 ? 'Capture mandatory!' : 'select a piece') : '';
        } else {
            msg.textContent = 'Your turn';
            const mandatory = getAllMandatoryCaptures(gameBoard, 'red');
            right.textContent = mandatory.length > 0 ? `${mandatory.length} capture(s) mandatory!` : selectedPiece ? 'choose destination' : 'select a piece';
        }
    } else {
        dot.className = 'turn-dot white';
        if (window.multiplayerMode) {
            msg.textContent = isMyTurn ? 'Your turn (White)' : "Opponent's turn...";
            right.textContent = isMyTurn ? (getAllMandatoryCaptures(gameBoard, 'white').length > 0 ? 'Capture mandatory!' : 'select a piece') : '';
        } else {
            msg.textContent = 'AI thinking...';
            right.textContent = '';
        }
    }
}

// new game
function startGame() {
    gameBoard = initBoard();
    currentTurn = 'red';
    selectedPiece = null;
    gameActive = true;
    aiThinking = false;
    moveHistory = [];
    boardHistory = [];
    turnHistory = [];

    window.moveCount = 0;
    window.captureCount = 0;
    window.kingsCount = 0;
    window.missedCaptures = 0;
    window.goodMoves = 0;
    window.totalMoves = 0;

    const moveLog = document.getElementById('move-log');
    if (moveLog) moveLog.innerHTML = '';

    document.getElementById('stat-moves').textContent = '0';
    document.getElementById('stat-cap').textContent = '0';
    document.getElementById('stat-kings').textContent = '0';
    document.getElementById('stat-miss').textContent = '0';
    document.getElementById('acc-val').textContent = '—';
    document.getElementById('acc-fill').style.width = '0%';

    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.remove();

    renderBoard();
    updateStatusMessage();

    if (window.setCoachMsg) window.setCoachMsg('New game! You play red. Remember: captures are mandatory!', '');
    showToast('New game started!', 1500);
}

// undo
function undoMove() {
    if (!gameActive) { showToast('Game is over, start a new game first!', 1500); return; }
    if (boardHistory.length < 2) { showToast('Not enough moves to undo!', 1000); return; }

    boardHistory.pop();
    const lastBoard = boardHistory.pop();
    if (lastBoard) gameBoard = lastBoard.map(row => [...row]);

    const lastTurn = turnHistory.pop();
    if (lastTurn) currentTurn = lastTurn;

    const log = document.getElementById('move-log');
    if (log.lastChild) log.removeChild(log.lastChild);
    if (log.lastChild) log.removeChild(log.lastChild);
    moveHistory.pop();
    moveHistory.pop();

    selectedPiece = null;
    renderBoard();
    updateStatusMessage();
    showToast('Move undone!', 1000);
    if (window.setCoachMsg) window.setCoachMsg('Move undone. Try a different strategy!', '');
}

// toast
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// theme
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('light-theme');
    
    if (isDark) {
        body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        document.getElementById('theme-icon').textContent = '🌙';
        document.getElementById('theme-text').textContent = 'Dark Theme';
    } else {
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('theme-icon').textContent = '☀️';
        document.getElementById('theme-text').textContent = 'Light Theme';
    }
}

// saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (document.getElementById('theme-icon')) {
            document.getElementById('theme-icon').textContent = '☀️';
            document.getElementById('theme-text').textContent = 'Light Theme';
        }
    } else {
        document.body.classList.remove('light-theme');
        if (document.getElementById('theme-icon')) {
            document.getElementById('theme-icon').textContent = '🌙';
            document.getElementById('theme-text').textContent = 'Dark Theme';
        }
    }
}

// Экспорт
window.toggleTheme = toggleTheme;

// Подключение кнопки после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
});

// export
window.startGame = startGame;
window.undoMove = undoMove;
window.resignGame = resignGame;
window.gameBoard = () => gameBoard;
window.getCurrentTurn = () => currentTurn;
window.isGameActive = () => gameActive;
window.getAllMovesForPlayer = getAllMovesForPlayer;
window.getAllValidMoves = getAllValidMoves;
window.getAllMandatoryCaptures = getAllMandatoryCaptures;
window.executeMove = executeMove;
window.renderBoard = renderBoard;
window.showToast = showToast;

// init
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');

    gameBoard = initBoard();
    currentTurn = 'red';
    selectedPiece = null;
    gameActive = true;
    aiThinking = false;
    moveHistory = [];
    boardHistory = [];
    turnHistory = [];

    window.moveCount = 0;
    window.captureCount = 0;
    window.kingsCount = 0;
    window.missedCaptures = 0;
    window.goodMoves = 0;
    window.totalMoves = 0;

    const moveLog = document.getElementById('move-log');
    if (moveLog) moveLog.innerHTML = '';

    ['stat-moves', 'stat-cap', 'stat-kings', 'stat-miss'].forEach(id => {
        document.getElementById(id).textContent = '0';
    });
    document.getElementById('acc-val').textContent = '—';
    document.getElementById('acc-fill').style.width = '0%';

    renderBoard();
    updateStatusMessage();

    // Кнопки
    document.getElementById('new-game-btn')?.addEventListener('click', startGame);
    document.getElementById('undo-btn')?.addEventListener('click', undoMove);
    document.getElementById('resign-btn')?.addEventListener('click', resignGame);

    // Сложность
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            aiDepth = parseInt(btn.dataset.diff);
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const labels = { 1: 'Easy', 3: 'Medium', 5: 'Hard' };
            const aiLabel = document.getElementById('ai-diff-label');
            if (aiLabel) aiLabel.textContent = `${labels[aiDepth]} difficulty`;
            if (window.setCoachMsg) window.setCoachMsg(`Difficulty changed to ${labels[aiDepth]}. Start a new game!`, '');
        });
    });

    // toggle
    document.getElementById('hint-toggle-btn')?.addEventListener('click', () => {
        hintsOn = !hintsOn;
        document.getElementById('hint-toggle')?.classList.toggle('on', hintsOn);
        renderBoard();
    });

    document.getElementById('danger-toggle-btn')?.addEventListener('click', () => {
        dangerOn = !dangerOn;
        document.getElementById('danger-toggle')?.classList.toggle('on', dangerOn);
        renderBoard();
    });

    document.getElementById('coach-toggle-btn')?.addEventListener('click', () => {
        coachOn = !coachOn;
        document.getElementById('coach-toggle')?.classList.toggle('on', coachOn);
        if (!coachOn && window.setCoachMsg) window.setCoachMsg('Coach feedback disabled', '');
    });

    console.log('✅ Game fully initialized');
});

console.log('✅ game.js loaded');