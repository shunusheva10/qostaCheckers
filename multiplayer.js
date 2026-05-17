console.log('🟢 multiplayer.js v3 loaded');

let multiplayerActive = false;
let currentRoom = null;
let multiplayerChannel = null;
let isHost = false;
let gameStarted = false;
let myColor = 'red'; // host = red, guest = white
let opponentName = 'Opponent';

window.multiplayerMode = false;
window.myColor = 'red';

// blitz time
let blitzMode = false;
let blitzTimeRed = 180;
let blitzTimeWhite = 180;
let blitzInterval = null;

function startBlitzTimer() {
    if (!blitzMode) return;
    clearInterval(blitzInterval);
    blitzInterval = setInterval(() => {
        if (!gameActive || !window.multiplayerMode) { clearInterval(blitzInterval); return; }
        if (currentTurn === 'red') {
            blitzTimeRed--;
            if (blitzTimeRed <= 0) { clearInterval(blitzInterval); endBlitzGame('white'); return; }
        } else {
            blitzTimeWhite--;
            if (blitzTimeWhite <= 0) { clearInterval(blitzInterval); endBlitzGame('red'); return; }
        }
        updateBlitzDisplay();
    }, 1000);
}

function endBlitzGame(winner) {
    gameActive = false;
    showGameOver(winner);
    if (multiplayerChannel) {
        multiplayerChannel.send({ type: 'broadcast', event: 'timeout', payload: { winner } });
    }
}

function updateBlitzDisplay() {
    const redEl = document.getElementById('blitz-red');
    const whiteEl = document.getElementById('blitz-white');
    if (redEl) {
        const m = Math.floor(blitzTimeRed / 60);
        const s = String(blitzTimeRed % 60).padStart(2, '0');
        redEl.textContent = `${m}:${s}`;
        redEl.style.color = blitzTimeRed < 30 ? 'var(--red2)' : 'var(--accent2)';
    }
    if (whiteEl) {
        const m = Math.floor(blitzTimeWhite / 60);
        const s = String(blitzTimeWhite % 60).padStart(2, '0');
        whiteEl.textContent = `${m}:${s}`;
        whiteEl.style.color = blitzTimeWhite < 30 ? 'var(--red2)' : 'var(--accent2)';
    }
}

function injectBlitzUI() {
    let el = document.getElementById('blitz-timer-bar');
    if (el) el.remove();
    const bar = document.createElement('div');
    bar.id = 'blitz-timer-bar';
    bar.style.cssText = `
        display:flex; justify-content:space-between; align-items:center;
        background:var(--bg3); border:1px solid var(--border); border-radius:8px;
        padding:8px 16px; margin:8px 0; font-family:'DM Mono',monospace; font-size:14px;
    `;
    bar.innerHTML = `
        <span style="color:var(--p1)">🔴 <span id="blitz-red">3:00</span></span>
        <span style="color:var(--text3);font-size:11px">⚡ BLITZ</span>
        <span style="color:var(--text2)">⚪ <span id="blitz-white">3:00</span></span>
    `;
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) statusBar.parentNode.insertBefore(bar, statusBar);
    updateBlitzDisplay();
}

// modal
function showMultiplayerModal() {
    let modal = document.getElementById('mp-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'mp-modal';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:1000;
        display:flex; align-items:center; justify-content:center;
        backdrop-filter:blur(6px);
    `;

    const playerName = window.getPlayerName?.() || 'Player';
    modal.innerHTML = `
        <div style="
            background:var(--bg2); border:1px solid var(--border2); border-radius:16px;
            padding:32px; width:380px; max-width:95vw;
            box-shadow:0 24px 80px rgba(0,0,0,0.6);
        ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
                <div>
                    <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--accent2)">🎮 Multiplayer</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">Real-time checkers duels</div>
                </div>
                <button onclick="document.getElementById('mp-modal').remove()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;padding:4px">✕</button>
            </div>

            <!-- Mode selector -->
            <div style="display:flex;gap:8px;margin-bottom:20px">
                <button id="mp-mode-classic" onclick="selectMPMode('classic')" style="
                    flex:1;padding:10px;border-radius:8px;border:1px solid var(--accent);
                    background:rgba(200,150,90,0.12);color:var(--accent2);font-size:12px;cursor:pointer;font-weight:600;
                ">♟ Classic</button>
                <button id="mp-mode-blitz" onclick="selectMPMode('blitz')" style="
                    flex:1;padding:10px;border-radius:8px;border:1px solid var(--border2);
                    background:var(--bg3);color:var(--text2);font-size:12px;cursor:pointer;font-weight:600;
                ">⚡ Blitz 3min</button>
            </div>

            <!-- Create game -->
            <div style="background:var(--bg3);border-radius:10px;padding:16px;margin-bottom:12px">
                <div style="font-size:11px;color:var(--text3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em">Create a room</div>
                <button id="mp-create-btn" onclick="window.createMultiplayerGame()" style="
                    width:100%;padding:12px;background:var(--accent);border:none;border-radius:8px;
                    color:#000;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .2s;
                ">Create Game</button>
                <div id="mp-created-code" style="display:none;margin-top:12px;text-align:center">
                    <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Share this code:</div>
                    <div id="mp-code-display" style="
                        font-family:'DM Mono',monospace;font-size:28px;font-weight:700;
                        color:var(--accent2);letter-spacing:.25em;
                        background:var(--bg4);padding:10px;border-radius:8px;cursor:pointer;
                    " onclick="copyRoomCode()">------</div>
                    <div style="font-size:10px;color:var(--text3);margin-top:6px">Click to copy • Waiting for opponent...</div>
                    <div id="mp-waiting-dots" style="font-size:20px;margin-top:8px;animation:pulse 1.5s infinite">⏳</div>
                </div>
            </div>

            <!-- Join game -->
            <div style="background:var(--bg3);border-radius:10px;padding:16px">
                <div style="font-size:11px;color:var(--text3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em">Join a room</div>
                <div style="display:flex;gap:8px">
                    <input id="mp-join-input" type="text" placeholder="Enter code" maxlength="6"
                        style="
                            flex:1;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;
                            padding:10px 12px;color:var(--text);font-family:'DM Mono',monospace;
                            font-size:16px;letter-spacing:.15em;text-transform:uppercase;
                        "
                        oninput="this.value=this.value.toUpperCase()"
                    >
                    <button onclick="window.joinMultiplayerGame()" style="
                        padding:10px 16px;background:var(--bg4);border:1px solid var(--border2);
                        border-radius:8px;color:var(--text2);font-size:13px;cursor:pointer;font-weight:600;
                        transition:all .2s;
                    " onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border2)'">Join →</button>
                </div>
            </div>

            <div id="mp-status-msg" style="text-align:center;font-size:11px;color:var(--text3);margin-top:14px;min-height:16px"></div>
        </div>
    `;

    document.body.appendChild(modal);
}

window._mpMode = 'classic';
window.selectMPMode = function(mode) {
    window._mpMode = mode;
    blitzMode = mode === 'blitz';
    ['classic','blitz'].forEach(m => {
        const btn = document.getElementById(`mp-mode-${m}`);
        if (!btn) return;
        if (m === mode) {
            btn.style.border = '1px solid var(--accent)';
            btn.style.background = 'rgba(200,150,90,0.12)';
            btn.style.color = 'var(--accent2)';
        } else {
            btn.style.border = '1px solid var(--border2)';
            btn.style.background = 'var(--bg3)';
            btn.style.color = 'var(--text2)';
        }
    });
};

function copyRoomCode() {
    if (currentRoom) {
        navigator.clipboard.writeText(currentRoom).catch(() => {});
        showToast('✅ Code copied!', 1500);
    }
}
window.copyRoomCode = copyRoomCode;

// room creation
window.createMultiplayerGame = async function() {
    if (!window.supabaseClient) {
        updateMPStatus('❌ Supabase not connected. Check your connection.');
        return;
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentRoom = roomCode;
    isHost = true;
    myColor = 'red';
    window.myColor = 'red';
    multiplayerActive = true;
    window.multiplayerMode = true;

    // Show code in modal
    const codeEl = document.getElementById('mp-code-display');
    const createdEl = document.getElementById('mp-created-code');
    const createBtn = document.getElementById('mp-create-btn');
    if (codeEl) codeEl.textContent = roomCode;
    if (createdEl) createdEl.style.display = 'block';
    if (createBtn) createBtn.style.display = 'none';

    updateMPStatus('⏳ Waiting for opponent to join...');
    setupChannel(roomCode);

    // Announce room creation
    setTimeout(() => {
        if (multiplayerChannel) {
            multiplayerChannel.send({
                type: 'broadcast',
                event: 'host_ready',
                payload: { name: window.getPlayerName?.() || 'Host', mode: window._mpMode }
            });
        }
    }, 800);
};

// join room
window.joinMultiplayerGame = async function() {
    const input = document.getElementById('mp-join-input') || document.getElementById('join-code');
    const roomCode = input?.value?.trim().toUpperCase();

    if (!roomCode || roomCode.length < 4) {
        updateMPStatus('⚠️ Enter a valid room code!');
        return;
    }

    currentRoom = roomCode;
    isHost = false;
    myColor = 'white';
    window.myColor = 'white';
    multiplayerActive = true;
    window.multiplayerMode = true;

    updateMPStatus(`🔄 Connecting to room ${roomCode}...`);
    setupChannel(roomCode);

    setTimeout(() => {
        if (multiplayerChannel) {
            multiplayerChannel.send({
                type: 'broadcast',
                event: 'join',
                payload: { name: window.getPlayerName?.() || 'Guest', mode: window._mpMode }
            });
        }
    }, 600);
};

// channel
function setupChannel(roomCode) {
    if (multiplayerChannel) {
        multiplayerChannel.unsubscribe();
        multiplayerChannel = null;
    }

    multiplayerChannel = window.supabaseClient.channel(`kingsplay_room_${roomCode}`, {
        config: { broadcast: { self: false } }
    });

    multiplayerChannel
        .on('broadcast', { event: 'host_ready' }, ({ payload }) => {
            if (!isHost) {
                blitzMode = payload.mode === 'blitz';
                window._mpMode = payload.mode || 'classic';
                updateMPStatus(`✅ Host is ready! Joined as White.`);
            }
        })
        .on('broadcast', { event: 'join' }, ({ payload }) => {
            if (isHost && !gameStarted) {
                opponentName = payload.name || 'Opponent';
                blitzMode = payload.mode === 'blitz';
                updateMPStatus(`✅ ${opponentName} joined! Starting...`);
                setTimeout(() => startMultiplayerGame(true), 800);
                // Tell guest to start
                multiplayerChannel.send({
                    type: 'broadcast',
                    event: 'game_start',
                    payload: { hostName: window.getPlayerName?.() || 'Host', mode: window._mpMode }
                });
            }
        })
        .on('broadcast', { event: 'game_start' }, ({ payload }) => {
            if (!isHost) {
                opponentName = payload.hostName || 'Opponent';
                blitzMode = payload.mode === 'blitz';
                updateMPStatus(`🎮 Game started! You play White.`);
                setTimeout(() => startMultiplayerGame(false), 400);
            }
        })
        .on('broadcast', { event: 'move' }, handleOpponentMove)
        .on('broadcast', { event: 'timeout' }, ({ payload }) => {
            if (payload?.winner) {
                gameActive = false;
                clearInterval(blitzInterval);
                showGameOver(payload.winner);
            }
        })
        .on('broadcast', { event: 'resign' }, () => {
            gameActive = false;
            showToast('Opponent resigned! You win! 🏆', 3000);
            showGameOver(myColor);
        })
        .subscribe(status => {
            if (status === 'SUBSCRIBED') {
                console.log(`[MP] Subscribed to room ${roomCode}`);
            }
        });
}

// handel opponent move
function handleOpponentMove({ payload }) {
    if (!payload || !gameActive) return;

    const move = {
        from: [payload.fromRow, payload.fromCol],
        to: [payload.toRow, payload.toCol],
        captured: payload.captured || []
    };

    const opponent = isHost ? 'white' : 'red';
    executeLocalMove(move, opponent);

    if (blitzMode) startBlitzTimer(); // restart interval on turn change
}

// local move execution
function executeLocalMove(move, player) {
    const { from, to, captured } = move;
    const piece = gameBoard[from[0]][from[1]];

    gameBoard[from[0]][from[1]] = EMPTY;
    captured.forEach(([r, c]) => {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) gameBoard[r][c] = EMPTY;
    });

    if (player === 'red' && to[0] === 0) {
        gameBoard[to[0]][to[1]] = RED_KING;
    } else if (player === 'white' && to[0] === 7) {
        gameBoard[to[0]][to[1]] = WHITE_KING;
    } else {
        gameBoard[to[0]][to[1]] = piece || (player === 'red' ? RED : WHITE);
    }

    currentTurn = currentTurn === 'red' ? 'white' : 'red';

    renderBoard();
    updateStatusMessage();
    addToMoveLog(from, to, captured, false, player);

    // Check win
    const redMoves = getAllMovesForPlayer(gameBoard, 'red');
    const whiteMoves = getAllMovesForPlayer(gameBoard, 'white');
    if (redMoves.length === 0) { gameActive = false; showGameOver('white'); }
    else if (whiteMoves.length === 0) { gameActive = false; showGameOver('red'); }
}

// intercept executeMove 
document.addEventListener('DOMContentLoaded', () => {
    if (window._mpExecuteWrapped) return;
    window._mpExecuteWrapped = true;

    const _orig = window.executeMove;

    window.executeMove = function(move, player) {
        if (!window.multiplayerMode) {
            return _orig ? _orig.call(this, move, player) : null;
        }

        // Only allow our own color to move
        if (player !== (window.myColor || 'red')) return;

        // Broadcast to opponent
        if (multiplayerChannel) {
            multiplayerChannel.send({
                type: 'broadcast',
                event: 'move',
                payload: {
                    fromRow: move.from[0],
                    fromCol: move.from[1],
                    toRow: move.to[0],
                    toCol: move.to[1],
                    captured: move.captured || []
                }
            });
        }

        executeLocalMove(move, player);
        if (blitzMode) startBlitzTimer();
    };
}, { once: true });

// multiplayer game
function startMultiplayerGame(asHost) {
    if (gameStarted) return;
    gameStarted = true;

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

    const moveLog = document.getElementById('move-log');
    if (moveLog) moveLog.innerHTML = '';

    ['stat-moves','stat-cap','stat-kings','stat-miss'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });

    renderBoard();
    updateStatusMessage();

    // Update player labels
    const p1name = document.querySelector('#p1card .name');
    const p2name = document.querySelector('#p2card .name');
    const p2role = document.getElementById('ai-diff-label');
    if (asHost) {
        if (p1name) p1name.textContent = window.getPlayerName?.() || 'You (Red)';
        if (p2name) p2name.textContent = opponentName + ' (White)';
        if (p2role) p2role.textContent = blitzMode ? '⚡ Blitz 3min' : '🌐 Online';
    } else {
        if (p1name) p1name.textContent = opponentName + ' (Red)';
        if (p2name) p2name.textContent = window.getPlayerName?.() || 'You (White)';
        if (p2role) p2role.textContent = blitzMode ? '⚡ Blitz 3min' : '🌐 Online';
    }

    // Close modal
    const modal = document.getElementById('mp-modal');
    if (modal) modal.remove();

    // Update multiplayer status section
    const statusEl = document.getElementById('multiplayer-status');
    if (statusEl) statusEl.innerHTML = `🟢 <b>Room: ${currentRoom}</b> · ${blitzMode ? '⚡ Blitz' : 'Classic'} · You are <b style="color:${myColor==='red'?'var(--p1)':'var(--text2)'}">${myColor.toUpperCase()}</b>`;

    if (blitzMode) {
        blitzTimeRed = 180;
        blitzTimeWhite = 180;
        injectBlitzUI();
        if (asHost) startBlitzTimer();
    }

    showToast(asHost ? `🎮 ${opponentName} joined! You play Red.` : `🎮 Game started! You play White.`, 3000);
    if (window.setCoachMsg) window.setCoachMsg(`Multiplayer game started! You are ${myColor.toUpperCase()}. ${blitzMode ? '⚡ 3 minutes each!' : 'Good luck!'}`, '');
}

// resign
window.resignMultiplayer = function() {
    if (!window.multiplayerMode) return;
    if (multiplayerChannel) {
        multiplayerChannel.send({ type: 'broadcast', event: 'resign', payload: {} });
    }
    window.leaveMultiplayer();
};

// leave
window.leaveMultiplayer = function() {
    clearInterval(blitzInterval);
    if (multiplayerChannel) { multiplayerChannel.unsubscribe(); multiplayerChannel = null; }
    window.multiplayerMode = false;
    multiplayerActive = false;
    gameStarted = false;
    currentRoom = null;
    blitzMode = false;

    const blitzBar = document.getElementById('blitz-timer-bar');
    if (blitzBar) blitzBar.remove();

    const statusEl = document.getElementById('multiplayer-status');
    if (statusEl) statusEl.innerHTML = '';

    // Reset player labels
    const p2name = document.querySelector('#p2card .name');
    const p2role = document.getElementById('ai-diff-label');
    if (p2name) p2name.textContent = 'AI Opponent';
    if (p2role) p2role.textContent = 'Medium difficulty';

    startGame();
    showToast('Left multiplayer room', 1500);
};

// utils
function updateMPStatus(msg) {
    const el = document.getElementById('mp-status-msg');
    if (el) el.textContent = msg;
    const mainEl = document.getElementById('multiplayer-status');
    if (mainEl) mainEl.textContent = msg;
}

function addToMoveLog(from, to, captured, isPromotion, player) {
    if (typeof window.utils?.toChessNotation !== 'function') return;
    const log = document.getElementById('move-log');
    if (!log) return;
    const notation = captured.length > 0
        ? window.utils.formatCapture(from[0], from[1], to[0], to[1], captured.length)
        : window.utils.formatMove(from[0], from[1], to[0], to[1]);
    const entry = document.createElement('div');
    entry.style.cssText = `font-size:11px;padding:3px 6px;border-bottom:1px solid var(--border);color:${player==='red'?'var(--p1)':'var(--text2)'}`;
    entry.textContent = `${player === 'red' ? '🔴' : '⚪'} ${notation}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// init buttons
document.addEventListener('DOMContentLoaded', () => {
    // Override create/join buttons to open modal
    const createBtn = document.getElementById('create-game-btn');
    const joinBtn = document.getElementById('join-game-btn');

    if (createBtn) {
        createBtn.onclick = () => {
            showMultiplayerModal();
            setTimeout(() => window.createMultiplayerGame(), 300);
        };
    }
    if (joinBtn) {
        joinBtn.onclick = () => showMultiplayerModal();
    }

    // Add multiplayer resign to resign button
    const resignBtn = document.getElementById('resign-btn');
    if (resignBtn) {
        const origOnClick = resignBtn.onclick;
        resignBtn.addEventListener('click', () => {
            if (window.multiplayerMode) window.resignMultiplayer();
        });
    }
});

console.log('✅ multiplayer.js v3 loaded');