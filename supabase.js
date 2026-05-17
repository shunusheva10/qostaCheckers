const SUPABASE_URL = "https://ciroekpypcnwiekkjvla.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcm9la3B5cGNud2lla2tqdmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDcwNjUsImV4cCI6MjA5NDU4MzA2NX0.zusSfkKPsjWUd3eL7knOCX1bG-owdhwAXVbchEKINhw";

let _supabase = null;

function getClient() {
    if (_supabase) return _supabase;
    if (window.supabase && window.supabase.createClient) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = _supabase;
        console.log('✅ Supabase client created');
        return _supabase;
    }
    console.error('❌ Supabase SDK not loaded yet');
    return null;
}

// id and profile
window.getUserId = function () {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        userId = 'player_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        localStorage.setItem('user_id', userId);
    }
    return userId;
};

window.getPlayerName = function () {
    return localStorage.getItem('player_name') || null;
};

window.getPlayerCity = function () {
    return localStorage.getItem('player_city') || '';
};

// profile saving
window.savePlayerProfile = async function () {
    const nameInput = document.getElementById('player-name');
    const cityInput = document.getElementById('player-city');
    const name = nameInput?.value?.trim();
    const city = cityInput?.value?.trim() || '';

    if (!name) {
        showMsg('⚠️ Please enter your name first!');
        nameInput?.focus();
        return;
    }

    localStorage.setItem('player_name', name);
    localStorage.setItem('player_city', city);

    // Сразу создаём/обновляем запись в leaderboard
    const db = getClient();
    if (db) {
        try {
            const userId = window.getUserId();
            const { data: existing } = await db
                .from('leaderboard')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) {
                await db.from('leaderboard')
                    .update({ username: name, city, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);
            } else {
                await db.from('leaderboard').insert([{
                    user_id: userId, username: name, city,
                    score: 0, games_played: 0, wins: 0
                }]);
            }
        } catch (e) {
            console.warn('Profile upsert error:', e.message);
        }
    }

    // Обновляем кнопку
    const saveBtn = document.getElementById('submit-score-btn');
    if (saveBtn) {
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => { saveBtn.textContent = '💾 Save'; }, 2000);
    }

    showMsg('✅ Profile saved! Hello, ' + name + '!');

    if (window.setCoachMsg) {
        window.setCoachMsg(`Welcome, ${name}${city ? ' from ' + city : ''}! Your results will be saved to the leaderboard.`, '');
    }

    await window.renderLeaderboard();
};

// game saving
window.saveGameToSupabase = async function (winner, movesCount, capturesCount) {
    const db = getClient();
    if (!db) return false;

    const playerName = window.getPlayerName();
    if (!playerName) {
        showMsg('⚠️ Set your name in Profile to save results to leaderboard!');
        return false;
    }

    console.log('📝 Saving game...', { winner, movesCount, capturesCount });

    try {
        const { error } = await db.from('games').insert([{
            user_id: window.getUserId(),
            winner,
            moves_count: movesCount,
            captures_count: capturesCount,
            created_at: new Date().toISOString()
        }]);

        if (error) throw error;

        console.log('✅ Game saved!');
        await window.updateLeaderboard(winner === 'red');
        return true;
    } catch (e) {
        console.error('❌ Save error:', e);
        showMsg('❌ Save failed: ' + e.message);
        return false;
    }
};

// leaderboard update
window.updateLeaderboard = async function (isWin) {
    const db = getClient();
    if (!db) return;

    try {
        const userId = window.getUserId();
        const username = window.getPlayerName() || 'Anonymous';
        const city = window.getPlayerCity();

        const { data: existing, error: fetchError } = await db
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // Победа = +15 очков, поражение = +5 (за участие)
        const pointsToAdd = isWin ? 15 : 5;

        if (existing) {
            await db.from('leaderboard').update({
                score: (existing.score || 0) + pointsToAdd,
                games_played: (existing.games_played || 0) + 1,
                wins: (existing.wins || 0) + (isWin ? 1 : 0),
                username,
                city,
                updated_at: new Date().toISOString()
            }).eq('user_id', userId);
        } else {
            await db.from('leaderboard').insert([{
                user_id: userId, username, city,
                score: pointsToAdd,
                games_played: 1,
                wins: isWin ? 1 : 0
            }]);
        }

        console.log('✅ Leaderboard updated (+' + pointsToAdd + ' pts)');
        await window.renderLeaderboard();
    } catch (e) {
        console.error('❌ Leaderboard update error:', e);
    }
};

// leaderboard loading
window.loadLeaderboard = async function (limit = 10) {
    const db = getClient();
    if (!db) return [];
    try {
        const { data, error } = await db
            .from('leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('❌ Load leaderboard error:', e);
        return [];
    }
};

// leaderboard style
window.renderLeaderboard = async function () {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3)">Loading...</div>';
    const data = await window.loadLeaderboard(10);
    const currentUserId = window.getUserId();

    if (!data.length) {
        container.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3)">🏆 No scores yet. Win a game!</div>';
        return;
    }

    container.innerHTML = data.map((item, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const isMe = item.user_id === currentUserId;
        const winRate = item.games_played > 0 ? Math.round((item.wins / item.games_played) * 100) : 0;
        return `
            <div style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--border);font-size:11px${isMe ? ';background:rgba(255,200,0,0.07);border-radius:4px' : ''}">
                <span style="width:28px;font-weight:600;color:var(--accent2)">${medal}</span>
                <span style="flex:1;font-weight:${isMe ? '700' : '500'};color:${isMe ? 'var(--gold)' : 'inherit'}">${escapeHtml(item.username || 'Anonymous')}${isMe ? ' 👤' : ''}</span>
                <span style="color:var(--text3);font-size:9px">${escapeHtml(item.city || '')}</span>
                <span style="color:var(--text3);font-size:9px">${winRate}%W</span>
                <span style="font-weight:600;color:var(--gold)">${item.score}pts</span>
            </div>
        `;
    }).join('');
};

// analytics
window.saveGameAnalytics = async function ({ accuracy, missedCaptures, captures, kings, totalMoves }) {
    const db = getClient();
    if (!db) return;
    try {
        await db.from('analytics').insert([{
            user_id: window.getUserId(),
            accuracy, missed_captures: missedCaptures,
            captures, kings, total_moves: totalMoves,
            created_at: new Date().toISOString()
        }]);
    } catch (e) {
        console.warn('Analytics save skipped:', e.message);
    }
};

// connection checking
window.testSupabaseConnection = async function () {
    const db = getClient();
    if (!db) { console.error('❌ Supabase SDK not available'); return false; }
    try {
        const { error } = await db.from('leaderboard').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase connected!');
        await window.renderLeaderboard();
        return true;
    } catch (e) {
        console.error('❌ Connection error:', e.message);
        const container = document.getElementById('leaderboard');
        if (container) container.innerHTML = `<div style="text-align:center;padding:10px;color:#e55;font-size:11px">⚠️ DB error: ${escapeHtml(e.message)}</div>`;
        return false;
    }
};

// additionals
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMsg(msg) {
    if (window.showToast) window.showToast(msg, 2500);
    else console.log(msg);
}

// init
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('submit-score-btn');
    if (saveBtn) saveBtn.onclick = window.savePlayerProfile;

    // Восстанавливаем профиль из localStorage
    const savedName = localStorage.getItem('player_name');
    const savedCity = localStorage.getItem('player_city');
    if (savedName && document.getElementById('player-name')) {
        document.getElementById('player-name').value = savedName;
    }
    if (savedCity && document.getElementById('player-city')) {
        document.getElementById('player-city').value = savedCity;
    }

    // Подсказка если имя не задано
    if (!savedName) {
        setTimeout(() => {
            if (window.setCoachMsg) {
                window.setCoachMsg('👤 Enter your name in the Profile section so your results appear on the leaderboard!', '');
            }
        }, 1500);
    }

    setTimeout(() => window.testSupabaseConnection(), 500);
});

console.log('✅ supabase.js loaded');