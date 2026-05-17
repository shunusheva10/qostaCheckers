const SKINS = [
    {
        id: 'classic',
        name: 'Classic',
        free: true,
        emoji: '⭕',
        p1: '#E84545',
        p1k: '#FF7777',
        p2: '#F0EFE8',
        p2k: '#FFE88A',
        boardDark: '#1E1A2E',
        boardLight: '#2A2438',
    },
    {
        id: 'wooden',
        name: 'Wooden',
        free: true,
        emoji: '🪵',
        p1: '#C04000',
        p1k: '#E05020',
        p2: '#F5DEB3',
        p2k: '#FFD700',
        boardDark: '#8B4513',
        boardLight: '#DEB887',
    },
    {
        id: 'neon',
        name: 'Neon',
        free: false,
        emoji: '💜',
        p1: '#FF006E',
        p1k: '#FF66A8',
        p2: '#00F5D4',
        p2k: '#80FFEA',
        boardDark: '#0D0020',
        boardLight: '#1A0040',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        free: false,
        emoji: '🌊',
        p1: '#FF4500',
        p1k: '#FF7755',
        p2: '#00BFFF',
        p2k: '#87CEEB',
        boardDark: '#0A2342',
        boardLight: '#1B4F72',
    },
    {
        id: 'forest',
        name: 'Forest',
        free: false,
        emoji: '🌲',
        p1: '#8B0000',
        p1k: '#CC2222',
        p2: '#98FB98',
        p2k: '#ADFF2F',
        boardDark: '#1A3320',
        boardLight: '#2D5A35',
    },
    {
        id: 'marble',
        name: 'Marble',
        free: false,
        emoji: '🪨',
        p1: '#8B0000',
        p1k: '#DC143C',
        p2: '#F5F5F5',
        p2k: '#E8D5B7',
        boardDark: '#3D3D3D',
        boardLight: '#A0A0A0',
    },
    {
        id: 'gold',
        name: 'Royal Gold',
        free: false,
        emoji: '👑',
        p1: '#8B0000',
        p1k: '#FF0000',
        p2: '#DAA520',
        p2k: '#FFD700',
        boardDark: '#2C1A00',
        boardLight: '#5C3A00',
    },
    {
        id: 'cyber',
        name: 'Cyber',
        free: false,
        emoji: '🤖',
        p1: '#FF3300',
        p1k: '#FF6600',
        p2: '#00FF41',
        p2k: '#39FF14',
        boardDark: '#0A0A0A',
        boardLight: '#1A1A1A',
    },
];

let currentSkin = localStorage.getItem('skin') || 'classic';
let isPro = localStorage.getItem('kp_pro') === 'true';

function applySkin(skinId) {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return;

    if (!skin.free && !isPro) {
        showProModal();
        return;
    }

    currentSkin = skinId;
    localStorage.setItem('skin', skinId);

    const root = document.documentElement;
    root.style.setProperty('--p1', skin.p1);
    root.style.setProperty('--p1k', skin.p1k);
    root.style.setProperty('--p2', skin.p2);
    root.style.setProperty('--p2k', skin.p2k);
    root.style.setProperty('--board-dark', skin.boardDark);
    root.style.setProperty('--board-light', skin.boardLight);

    // Re-render board with new colors
    if (window.renderBoard) window.renderBoard();

    showToast(`🎨 Skin: ${skin.name}`, 1500);
}

window.renderSkinsGrid = function() {
    const grid = document.getElementById('skins-grid');
    if (!grid) return;

    grid.innerHTML = SKINS.map(skin => `
        <div onclick="applySkin('${skin.id}')" style="
            cursor:pointer; border-radius:10px; padding:12px 8px; text-align:center;
            background:${currentSkin === skin.id ? 'rgba(200,150,90,0.2)' : 'var(--bg3)'};
            border:1px solid ${currentSkin === skin.id ? 'var(--accent)' : 'var(--border)'};
            transition:all .2s; position:relative;
        " onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='${currentSkin === skin.id ? 'var(--accent)' : 'var(--border)'}'" >
            ${!skin.free && !isPro ? '<div style="position:absolute;top:4px;right:4px;background:var(--gold);color:#000;font-size:7px;padding:1px 4px;border-radius:3px;font-weight:700">PRO</div>' : ''}
            <div style="font-size:24px;margin-bottom:4px">${skin.emoji}</div>
            <div style="font-size:10px;color:var(--text2);font-weight:500">${skin.name}</div>
            <div style="display:flex;gap:3px;justify-content:center;margin-top:6px">
                <div style="width:10px;height:10px;border-radius:50%;background:${skin.p1}"></div>
                <div style="width:10px;height:10px;border-radius:50%;background:${skin.p2}"></div>
            </div>
        </div>
    `).join('');
};

// city leaderboard
window.renderCityLeaderboard = async function() {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    const playerCity = window.getPlayerCity?.() || '';
    if (!playerCity) {
        container.innerHTML = `
            <div style="text-align:center;padding:12px;color:var(--text3);font-size:11px">
                Add your city in Profile to see city rankings! 🏙️
            </div>`;
        return;
    }

    container.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3)">Loading city...</div>';

    try {
        const db = window.supabaseClient;
        if (!db) { container.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3)">Not connected</div>'; return; }

        const { data, error } = await db
            .from('leaderboard')
            .select('*')
            .ilike('city', `%${playerCity}%`)
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;

        const currentUserId = window.getUserId?.();

        if (!data?.length) {
            container.innerHTML = `
                <div style="text-align:center;padding:12px;color:var(--text3);font-size:11px">
                    🏙️ No players from ${playerCity} yet.<br>Be the first!
                </div>`;
            return;
        }

        const cityIcon = getCityIcon(playerCity);
        container.innerHTML = `
            <div style="font-size:10px;color:var(--accent2);margin-bottom:8px;text-align:center">
                ${cityIcon} Top players from ${playerCity}
            </div>
            ${data.map((item, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                const isMe = item.user_id === currentUserId;
                const winRate = item.games_played > 0 ? Math.round((item.wins / item.games_played) * 100) : 0;
                return `
                    <div style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--border);font-size:11px${isMe?';background:rgba(255,200,0,0.07);border-radius:4px':''}">
                        <span style="width:22px;font-weight:600;color:var(--accent2)">${medal}</span>
                        <span style="flex:1;font-weight:${isMe?'700':'500'};color:${isMe?'var(--gold)':'inherit'}">${escHtml(item.username||'Anon')}${isMe?' 👤':''}</span>
                        <span style="color:var(--text3);font-size:9px">${winRate}%W</span>
                        <span style="font-weight:600;color:var(--gold)">${item.score}pts</span>
                    </div>`;
            }).join('')}`;
    } catch (e) {
        container.innerHTML = `<div style="text-align:center;padding:10px;color:#e55;font-size:11px">⚠️ ${escHtml(e.message)}</div>`;
    }
};

function getCityIcon(city) {
    const cityIcons = {
        'алматы': '🏔️', 'almaty': '🏔️',
        'астана': '🌆', 'astana': '🌆', 'нур-султан': '🌆',
        'костанай': '🌾', 'kostanay': '🌾',
        'москва': '🏛️', 'moscow': '🏛️',
        'london': '🎡', 'new york': '🗽', 'paris': '🗼',
        'берлин': '🐻', 'berlin': '🐻',
        'токио': '🗾', 'tokyo': '🗾',
    };
    const lc = city.toLowerCase();
    for (const [key, icon] of Object.entries(cityIcons)) {
        if (lc.includes(key)) return icon;
    }
    return '🏙️';
}

// override
const _origRenderLeaderboard = window.renderLeaderboard;
window.renderLeaderboard = async function() {
    if (window.getLbMode && window.getLbMode() === 'city') {
        return window.renderCityLeaderboard();
    }
    return _origRenderLeaderboard ? _origRenderLeaderboard() : null;
};

// pro unlock
window.unlockPro = function(code) {
    if (code === 'PRO2024' || code === 'LAUNCH50') {
        isPro = true;
        localStorage.setItem('kp_pro', 'true');
        showToast('✨ Pro unlocked! Enjoy all features.', 3000);
        window.renderSkinsGrid?.();
        document.getElementById('pro-modal').style.display = 'none';
        return true;
    }
    return false;
};

// weekly challenge
function checkWeeklyChallenge() {
    const wins = parseInt(localStorage.getItem('weekly_wins') || '0');
    const badges = [
        { threshold: 1, badge: '🌱', name: 'First Win' },
        { threshold: 5, badge: '⚔️', name: 'Warrior' },
        { threshold: 10, badge: '🏆', name: 'Champion' },
        { threshold: 25, badge: '👑', name: 'King' },
    ];
    const earned = badges.filter(b => wins >= b.threshold);
    return earned[earned.length - 1] || null;
}

// Track wins for weekly challenge
const _origSaveGame = window.saveGameToSupabase;
window.saveGameToSupabase = async function(winner, movesCount, capturesCount) {
    if (winner === 'red') {
        const wins = parseInt(localStorage.getItem('weekly_wins') || '0') + 1;
        localStorage.setItem('weekly_wins', wins);
        const badge = checkWeeklyChallenge();
        if (badge) {
            const prevBadge = localStorage.getItem('last_badge');
            if (prevBadge !== badge.badge) {
                localStorage.setItem('last_badge', badge.badge);
                setTimeout(() => showToast(`${badge.badge} Achievement: ${badge.name}!`, 3000), 1000);
            }
        }
    }
    return _origSaveGame ? _origSaveGame(winner, movesCount, capturesCount) : false;
};

// untils
function escHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// init
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved skin
    if (currentSkin && currentSkin !== 'classic') {
        applySkin(currentSkin);
    }

    // Show pro badge if unlocked
    if (isPro) {
        const banner = document.getElementById('pro-banner');
        if (banner) {
            banner.innerHTML = `<span>✨ <b style="color:var(--gold)">KingsPlay Pro</b> — All features unlocked! Thank you for supporting us. 🙏</span>`;
        }
    }

    // Weekly challenge display
    const badge = checkWeeklyChallenge();
    if (badge) {
        const logoSub = document.querySelector('.logo-sub');
        if (logoSub) {
            logoSub.innerHTML = `AI Coach Edition · ${badge.badge} ${badge.name}`;
        }
    }
});

console.log('✅ pro.js loaded');