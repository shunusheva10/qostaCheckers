// board
function toChessNotation(row, col) {
    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rank = 8 - row;
    return files[col] + rank;
}

// Преобразование из шахматной нотации в координаты (A8 → 0,0)
function fromChessNotation(notation) {
    const files = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7 };
    const file = notation[0].toUpperCase();
    const rank = parseInt(notation[1]);
    return {
        row: 8 - rank,
        col: files[file]
    };
}

// Форматирование хода для отображения в логе
function formatMove(fromRow, fromCol, toRow, toCol) {
    return `${toChessNotation(fromRow, fromCol)} → ${toChessNotation(toRow, toCol)}`;
}

// Форматирование взятия
function formatCapture(fromRow, fromCol, toRow, toCol, captureCount) {
    return `${toChessNotation(fromRow, fromCol)} × ${toChessNotation(toRow, toCol)}${captureCount > 1 ? ` (×${captureCount})` : ''}`;
}

// Показать временное уведомление (тост)
function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Показать уведомление с возможностью закрыть (для важных сообщений)
function showAlert(message, type = 'info', duration = 3000) {
    // type: 'info', 'success', 'warning', 'error'
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    let bgColor = '';
    switch (type) {
        case 'success': bgColor = 'var(--green)'; break;
        case 'warning': bgColor = 'var(--accent2)'; break;
        case 'error': bgColor = 'var(--red2)'; break;
        default: bgColor = 'var(--accent2)';
    }
    
    toast.style.background = bgColor;
    toast.style.color = '#fff';
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.background = '';
            toast.style.color = '';
        }, 300);
    }, duration);
}

// звуки через Web Audio API 
let audioContext = null;

function initAudio() {
    if (!audioContext && window.AudioContext) {
        audioContext = new AudioContext();
    }
}

function playBeep(frequency = 440, duration = 0.1, volume = 0.3) {
    if (!window.AudioContext) return;
    
    initAudio();
    if (!audioContext) return;
    
    // Возобновляем если был suspended (браузеры требуют взаимодействия)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
}

function playMoveSound() {
    playBeep(523.25, 0.08, 0.15); // Нота C5
}

function playCaptureSound() {
    playBeep(659.25, 0.1, 0.2); // Нота E5
    setTimeout(() => playBeep(523.25, 0.08, 0.15), 50);
}

function playKingSound() {
    playBeep(783.99, 0.15, 0.25); // Нота G5
    setTimeout(() => playBeep(987.77, 0.2, 0.2), 100); // Нота B5
}

function playWinSound() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        setTimeout(() => playBeep(freq, 0.3, 0.2), i * 150);
    });
}

function playLoseSound() {
    const notes = [523.25, 493.88, 440.00, 392.00];
    notes.forEach((freq, i) => {
        setTimeout(() => playBeep(freq, 0.3, 0.15), i * 150);
    });
}

// Сохранение в localStorage с проверкой
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

// Загрузка из localStorage
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item) return JSON.parse(item);
        return defaultValue;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return defaultValue;
    }
}

// Сохранение состояния игры (для автосохранения)
function saveGameState(board, turn, stats, moveHistory) {
    const gameState = {
        board: board.map(row => [...row]),
        turn: turn,
        stats: { ...stats },
        moveHistory: [...moveHistory],
        timestamp: Date.now()
    };
    saveToLocalStorage('checkers_autosave', gameState);
}

// Загрузка автосохранения
function loadGameState() {
    return loadFromLocalStorage('checkers_autosave', null);
}

// Очистка автосохранения
function clearAutosave() {
    localStorage.removeItem('checkers_autosave');
}

// Копирование текста в буфер обмена
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 1500);
        return true;
    } catch (e) {
        console.error('Failed to copy:', e);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 1500);
        return false;
    }
}

// Генерация случайного ID для игры
function generateGameId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Случайный элемент из массива
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Promise-based задержка
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Анимация фигуры при ходе
function animatePiece(element, callback) {
    if (!element) {
        if (callback) callback();
        return;
    }
    
    element.style.transform = 'scale(1.2)';
    element.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
        element.style.transform = 'scale(1)';
        setTimeout(() => {
            if (callback) callback();
        }, 100);
    }, 100);
}

// Эффект пульсации для подсветки
function addPulseEffect(element, duration = 1000) {
    if (!element) return;
    element.classList.add('pulse');
    setTimeout(() => {
        element.classList.remove('pulse');
    }, duration);
}

// Проверка, является ли устройство мобильным
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Проверка, поддерживается ли Web Audio
function isWebAudioSupported() {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
}

// export

window.utils = {
    // Нотация
    toChessNotation,
    fromChessNotation,
    formatMove,
    formatCapture,
    
    // Уведомления
    showToast,
    showAlert,
    
    // Звуки
    playMoveSound,
    playCaptureSound,
    playKingSound,
    playWinSound,
    playLoseSound,
    initAudio,
    
    // Хранение
    saveToLocalStorage,
    loadFromLocalStorage,
    saveGameState,
    loadGameState,
    clearAutosave,
    
    // Разное
    copyToClipboard,
    generateGameId,
    randomElement,
    delay,
    animatePiece,
    addPulseEffect,
    isMobile,
    isWebAudioSupported
};

console.log('✅ utils.js loaded');