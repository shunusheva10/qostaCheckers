// AI.JS
function evaluateBoard(board) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            
            if (piece === WHITE) {
                // Белая пешка
                score += 10;
                // Центральные клетки ценнее
                if ((row === 3 || row === 4) && (col >= 2 && col <= 5)) score += 2;
                // Защита края
                if (col === 0 || col === 7) score += 1;
            } 
            else if (piece === WHITE_KING) {
                // Белая дамка
                score += 30;
                // Дамка на открытом пространстве
                if (row > 0 && row < 7 && col > 0 && col < 7) score += 3;
            }
            else if (piece === RED) {
                // Красная пешка (игрок)
                score -= 10;
                if ((row === 3 || row === 4) && (col >= 2 && col <= 5)) score -= 2;
                if (col === 0 || col === 7) score -= 1;
            }
            else if (piece === RED_KING) {
                // Красная дамка
                score -= 30;
                if (row > 0 && row < 7 && col > 0 && col < 7) score -= 3;
            }
        }
    }
    
    return score;
}


function applyMoveToBoard(board, move) {
    const newBoard = board.map(row => [...row]);
    const { from, to, captured } = move;
    const piece = newBoard[from[0]][from[1]];
    
    newBoard[from[0]][from[1]] = EMPTY;
    captured.forEach(([cr, cc]) => {
        newBoard[cr][cc] = EMPTY;
    });
    
    // Превращение в дамку
    const isWhitePiece = (piece === WHITE || piece === WHITE_KING);
    if (isWhitePiece && to[0] === 7) {
        newBoard[to[0]][to[1]] = WHITE_KING;
    } else if (!isWhitePiece && to[0] === 0) {
        newBoard[to[0]][to[1]] = RED_KING;
    } else {
        newBoard[to[0]][to[1]] = piece;
    }
    
    return newBoard;
}


function minimax(board, depth, alpha, beta, isMaximizing) {
    // Базовый случай: достигнута глубина или нет ходов
    if (depth === 0) {
        return evaluateBoard(board);
    }
    
    const moves = getAllMovesForPlayer(board, isMaximizing ? 'white' : 'red');
    
    if (moves.length === 0) {
        // Нет ходов — проигрыш
        return isMaximizing ? -1000 : 1000;
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const newBoard = applyMoveToBoard(board, move);
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // β-отсечение
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const newBoard = applyMoveToBoard(board, move);
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break; 
        }
        return minEval;
    }
}

// лучший ход
function getBestMove(board, depth) {
    const moves = getAllMovesForPlayer(board, 'white');
    
    if (moves.length === 0) return null;
    
    // случайный ход
    if (depth === 1) {
        // Приоритет взятиям на Easy
        const captureMoves = moves.filter(m => m.captured.length > 0);
        if (captureMoves.length > 0 && Math.random() < 0.6) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of moves) {
        const newBoard = applyMoveToBoard(board, move);
        let score;
        
        if (depth === 2) {
            // Medium
            const nextMoves = getAllMovesForPlayer(newBoard, 'red');
            if (nextMoves.length === 0) {
                score = 1000; // Если противник не может ходить — отлично
            } else {
                let worstScore = Infinity;
                for (const nextMove of nextMoves) {
                    const nextBoard = applyMoveToBoard(newBoard, nextMove);
                    const evalScore = evaluateBoard(nextBoard);
                    worstScore = Math.min(worstScore, evalScore);
                }
                score = worstScore;
            }
        } else {
            // Hard
            score = minimax(newBoard, depth - 1, -Infinity, Infinity, false);
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// AI 
async function makeAIMove() {
    // Проверяем, что игра активна и очередь белых
    if (!gameActive || currentTurn !== 'white' || aiThinking) return;
    
    aiThinking = true;
    
    // Показываем индикатор мышления
    const thinkingBar = document.getElementById('thinking-bar');
    if (thinkingBar) thinkingBar.classList.add('active');
    
    // Задержка для естественного поведения
    const delayTime = aiDepth === 5 ? 800 : (aiDepth === 3 ? 500 : 300);
    
    setTimeout(() => {
        // Получаем лучший ход
        const bestMove = getBestMove(gameBoard, aiDepth);
        
        aiThinking = false;
        if (thinkingBar) thinkingBar.classList.remove('active');
        
        if (bestMove) {
            // Анимация перед ходом
            const fromElement = document.querySelector(`[data-row="${bestMove.from[0]}"][data-col="${bestMove.from[1]}"] .piece`);
            if (fromElement && window.utils) {
                window.utils.animatePiece(fromElement, () => {
                    executeMove(bestMove, 'white');
                });
            } else {
                executeMove(bestMove, 'white');
            }
        } else {
            // Нет ходов — проигрыш
            gameActive = false;
            showGameOver('red');
            if (window.utils) window.utils.playWinSound();
        }
    }, delayTime);
}


// Оценка качества хода
function evaluateMoveQuality(move, previousBoard) {
    const wasCapture = move.captured.length > 0;
    const promoted = (move.to[0] === 0);
    
    if (wasCapture && promoted) return 3; // Отлично: взятие + дамка
    if (wasCapture && move.captured.length >= 2) return 3; // Двойное взятие
    if (wasCapture) return 2; // Хорошо: взятие
    if (promoted) return 2; // Хорошо: дамка
    
    // Проверка, не подставили ли мы фигуру
    const tempBoard = applyMoveToBoard(previousBoard, move);
    const opponentMoves = getAllMovesForPlayer(tempBoard, 'white');
    const isDangerous = opponentMoves.some(m => m.captured.length > 0 && isRed(tempBoard[m.to[0]][m.to[1]]));
    
    if (isDangerous) return 0; // Плохо: подставились под взятие
    
    return 1; // Нормально
}


function analyzeAIMove(move) {
    const quality = evaluateMoveQuality(move, boardHistory[boardHistory.length - 1]);
    if (quality >= 2 && window.setCoachMsg) {
        const messages = {
            2: "🤖 AI made a capture! Be careful next turn.",
            3: "🤖 AI performed an excellent move (capture + promotion)! Watch out!"
        };
        window.setCoachMsg(messages[quality] || "AI made its move.", "");
    }
}


// Сохраняем оригинальную функцию (если уже существует)
const originalExecuteMove = window.executeMove || (typeof executeMove !== 'undefined' ? executeMove : null);

// Экспортируем функции
window.makeAIMove = makeAIMove;
window.getBestMove = getBestMove;
window.evaluateBoard = evaluateBoard;
window.aiDepth = () => aiDepth;

console.log('✅ ai.js loaded');