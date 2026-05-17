// ==================== COACH.JS ====================
// AI Coach — анализирует ходы и даёт советы

let lastAnalysis = null;

// main analysis
function analyzeMove(move, player) {
    if (!coachOn) return;
    if (player !== 'red') return;
    const { from, to, captured } = move;
    const promoted = (to[0] === 0);
    const isCapture = captured.length > 0;
    
    let quality = 'normal';
    let advice = '';
    let badge = '';
    
    // 1. Проверка на пропущенное взятие до хода
    const missedCapture = checkMissedCaptureBeforeMove();
    if (missedCapture) {
        quality = 'bad';
        advice = `⚠️ You missed a capture! You could have taken ${missedCapture.count} piece(s). In checkers, captures are mandatory!`;
        badge = '<span class="coach-badge bad">Mistake</span>';
        updateMissedCaptures(missedCapture.count);
    }
    
    // 2. Анализ текущего хода
    else if (isCapture && promoted) {
        quality = 'excellent';
        advice = `👑 EXCELLENT! You captured ${captured.length} piece(s) AND promoted to king! This is a game-winning move.`;
        badge = '<span class="coach-badge good">Brilliant!</span>';
        updateGoodMoves(3);
    }
    else if (isCapture && captured.length >= 2) {
        quality = 'excellent';
        advice = `⚡ MULTI-CAPTURE! You took ${captured.length} pieces in one move. Perfect execution!`;
        badge = '<span class="coach-badge good">Excellent!</span>';
        updateGoodMoves(2);
    }
    else if (isCapture) {
        quality = 'good';
        advice = `🎯 Good capture! You eliminated an opponent's piece. Look for more capture opportunities.`;
        badge = '<span class="coach-badge good">Capture</span>';
        updateGoodMoves(1);
    }
    else if (promoted) {
        quality = 'good';
        advice = `👑 King promotion! Your piece can now move backwards. Use it to control the board.`;
        badge = '<span class="coach-badge good">King!</span>';
        updateGoodMoves(1);
    }
    else {
        // Обычный ход — даём стратегический совет
        const strategicAdvice = getStrategicAdvice(from, to);
        advice = strategicAdvice;
        badge = '<span class="coach-badge warn">OK</span>';
        updateGoodMoves(0.5);
    }
    
    // 3. Проверка на опасность после хода
    const dangerCheck = checkKingDangerAfterMove();
    if (dangerCheck) {
        advice += ` ${dangerCheck}`;
        badge = '<span class="coach-badge bad">Danger!</span>';
    }
    
    // 4. Проверка контроля центра
    const centerControl = checkCenterControl();
    if (centerControl && quality !== 'excellent') {
        advice += ` ${centerControl}`;
    }
    
    // Отправляем сообщение в UI
    setCoachMsg(advice, badge);
    
    // Сохраняем для истории
    lastAnalysis = {
        move,
        quality,
        advice,
        timestamp: Date.now()
    };
}

// missed take
function checkMissedCaptureBeforeMove() {
    // Получаем доску до хода (из истории)
    if (boardHistory.length === 0) return null;
    
    const previousBoard = boardHistory[boardHistory.length - 1];
    const mandatoryCaptures = getAllMandatoryCaptures(previousBoard, 'red');
    
    if (mandatoryCaptures.length > 0) {
        // Подсчитываем уникальные фигуры, которые могли бить
        const uniquePieces = new Set();
        mandatoryCaptures.forEach(cap => {
            uniquePieces.add(`${cap.from[0]},${cap.from[1]}`);
        });
        
        return {
            count: mandatoryCaptures.length,
            pieces: uniquePieces.size
        };
    }
    
    return null;
}

// danger
function checkKingDangerAfterMove() {
    // Проверяем, не подставили ли мы дамку под удар
    const whitePieces = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (isWhite(gameBoard[row][col])) {
                whitePieces.push({ row, col });
            }
        }
    }
    
    // Проверяем, может ли белая фигура взять нашу дамку
    for (const piece of whitePieces) {
        const moves = getAllValidMoves(gameBoard, piece.row, piece.col, []);
        for (const move of moves) {
            if (move.captured.length > 0) {
                const targetRow = move.captured[0][0];
                const targetCol = move.captured[0][1];
                const targetPiece = gameBoard[targetRow][targetCol];
                if (isRed(targetPiece) && isKing(targetPiece)) {
                    return "⚠️ WARNING: Your king is now under attack! Protect it next turn.";
                }
            }
        }
    }
    
    return null;
}

// contorl center
function checkCenterControl() {
    const centerRows = [3, 4];
    const centerCols = [2, 3, 4, 5];
    let redInCenter = 0;
    let whiteInCenter = 0;
    
    for (const row of centerRows) {
        for (const col of centerCols) {
            if ((row + col) % 2 === 1) { // Только чёрные клетки
                const piece = gameBoard[row][col];
                if (isRed(piece)) redInCenter++;
                if (isWhite(piece)) whiteInCenter++;
            }
        }
    }
    
    if (redInCenter < 2 && moveCount > 5) {
        return "📌 Strategic tip: Control the center! Central pieces have more mobility and capture options.";
    }
    
    return null;
}

// стратегия
function getStrategicAdvice(from, to) {
    const adviceList = [
        "Solid move. Try to keep your pieces connected — isolated pieces are easy targets.",
        "Good positioning. Look for opportunities to force a capture on your next turn.",
        "Developing your pieces well. Remember: control the center and avoid the edges.",
        "Building a strong formation. Watch for enemy kings that can move backwards.",
        "Consider advancing your back row pieces — they're safe and can become kings.",
        "Good progress. Set up traps by offering a piece that would lead to a double capture."
    ];
    
    // Проверяем, не ходим ли мы по краю
    if (to[1] === 0 || to[1] === 7 || from[1] === 0 || from[1] === 7) {
        return "Edge pieces are safer but less active. Balance defense with attack.";
    }
    
    // Проверяем, продвигаемся ли мы вперёд
    if (to[0] < from[0]) {
        return "👍 Advancing forward! Keep pushing to create king promotion opportunities.";
    }
    
    return adviceList[Math.floor(Math.random() * adviceList.length)];
}

// анализ партии
function analyzeFullGame() {
    if (!coachOn) return;
    
    const totalMovesPlayed = moveHistory.filter(m => m.player === 'red').length;
    const accuracy = totalMovesPlayed > 0 ? Math.round((goodMoves / totalMovesPlayed) * 100) : 0;
    
    let summary = '';
    let badgeType = '';
    
    if (accuracy >= 80) {
        summary = `🌟 EXCEPTIONAL GAME! Your accuracy was ${accuracy}% — Grandmaster level! You missed only ${missedCaptures} capture(s).`;
        badgeType = 'good';
    } else if (accuracy >= 60) {
        summary = `📈 Good game! ${accuracy}% accuracy. You captured ${captureCount} pieces and made ${kingsCount} kings.`;
        badgeType = 'warn';
    } else if (accuracy >= 40) {
        summary = `📚 Solid effort! ${accuracy}% accuracy. Focus on spotting capture opportunities — you missed ${missedCaptures} mandatory capture(s).`;
        badgeType = 'bad';
    } else {
        summary = `🎓 Learning game! ${accuracy}% accuracy. Remember: always look for captures first! Practice makes perfect.`;
        badgeType = 'bad';
    }
    
    // Добавляем персональные советы
    if (captureCount === 0 && totalMovesPlayed > 10) {
        summary += " 💡 Tip: Try to set up forks where one move creates two capture threats.";
    }
    if (kingsCount === 0 && totalMovesPlayed > 15) {
        summary += " 👑 You didn't promote any kings. Push pieces to the back row more aggressively!";
    }
    if (missedCaptures > 3) {
        summary += " 🔍 Focus: Before every move, check if any capture is available — it's mandatory!";
    }
    
    setCoachMsg(summary, `<span class="coach-badge ${badgeType}">Game Summary</span>`);
    
    // Сохраняем аналитику 
    if (window.saveGameAnalytics) {
        window.saveGameAnalytics({
            accuracy,
            missedCaptures,
            captures: captureCount,
            kings: kingsCount,
            totalMoves: totalMovesPlayed
        });
    }
}

// стата
function updateGoodMoves(value) {
    goodMoves += value;
    totalMoves++;
    
    const accuracy = totalMoves > 0 ? Math.round((goodMoves / totalMoves) * 100) : 0;
    const accVal = document.getElementById('acc-val');
    const accFill = document.getElementById('acc-fill');
    
    if (accVal) accVal.textContent = `${accuracy}%`;
    if (accFill) accFill.style.width = `${accuracy}%`;
}

function updateMissedCaptures(count) {
    missedCaptures += count;
    const missElement = document.getElementById('stat-miss');
    if (missElement) missElement.textContent = missedCaptures;
}

// сообщения
function setCoachMsg(message, badgeHtml = '') {
    const coachMsg = document.getElementById('coach-msg');
    if (!coachMsg || !coachOn) return;
    
    // Анимация печати
    coachMsg.innerHTML = '<div class="coach-typing"><span></span><span></span><span></span></div>';
    
    setTimeout(() => {
        coachMsg.innerHTML = message;
        if (badgeHtml) {
            coachMsg.innerHTML += `<div style="margin-top: 8px;">${badgeHtml}</div>`;
        }
    }, 400);
}

// совет
function setAITip() {
    if (!coachOn) return;
    
    const tips = [
        "💡 Watch how AI controls the center — it's key to victory.",
        "🎯 AI captures whenever possible. You should too!",
        "👑 AI tries to promote to king. Block its pieces from advancing.",
        "⚔️ Set traps! Offer a piece that leads to a double capture.",
        "📌 Keep your back row strong — it prevents enemy kings."
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    setTimeout(() => {
        const coachMsg = document.getElementById('coach-msg');
        if (coachMsg && coachOn) {
            coachMsg.innerHTML = randomTip;
        }
    }, 2000);
}

// экспорт
window.analyzeMove = analyzeMove;
window.analyzeFullGame = analyzeFullGame;
window.setCoachMsg = setCoachMsg;
window.setAITip = setAITip;
window.getStrategicAdvice = getStrategicAdvice;

console.log('✅ coach.js loaded');