// --- ELEMENTOS DE LA INTERFAZ (DOM) ---
const startBtn = document.getElementById('start-btn');
const heartsEle = document.getElementById('player-hearts');
const bossHealthFill = document.getElementById('boss-health-fill');
const bossDialogue = document.getElementById('boss-dialogue');
const songNameDisplay = document.getElementById('song-name-display');
const comboCounterEle = document.getElementById('combo-counter');
const gameMessage = document.getElementById('game-message');
const musicoteCurrentBadge = document.getElementById('musicote-current-badge');
const muteMusicBtn = document.getElementById('mute-music-btn');
const songListEle = document.getElementById('song-list');
const songDetailsEle = document.getElementById('song-details');
const detailSongName = document.getElementById('detail-song-name');
const detailSongNotes = document.getElementById('detail-song-notes');
const detailSongAudio = document.getElementById('detail-song-audio');
const uploadLabel = document.getElementById('upload-label');
const audioFileInput = document.getElementById('audio-file');
const audioPlayer = document.getElementById('audio-player');

// --- VARIABLES DEL ESTADO DE JUEGO ---
let gameInterval;
let gameStartTime = 0;
let isGameRunning = false;
let playerLives = 3;
const MAX_LIVES = 3;
let completedCombos = 0; // Notas acertadas en la partida
let totalNotesInSong = 0;
let activeAttackNotes = []; // Notas activas en la pista
let customSongs = [];
let selectedSong = null;
let audioFileLoaded = false;
const keys = ['S', 'D', 'K', 'L'];

// --- VARIABLES DE MUTE ---
let isMusicMuted = localStorage.getItem('game_music_muted') === 'true';

// --- SISTEMA DE EFECTOS DE SONIDO (WEB AUDIO API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const toneConfig = {
    'S': 261.63, 
    'D': 329.63, 
    'K': 392.00, 
    'L': 523.25  
};

function playSound(key, type = 'square', duration = 0.12) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type; 
    osc.frequency.setValueAtTime(toneConfig[key], audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// --- CONTROL DE MUTE DE LA CANCIÓN ---
function updateMuteButtonUI() {
    if (!muteMusicBtn) return;
    if (isMusicMuted) {
        muteMusicBtn.classList.add('muted');
        muteMusicBtn.innerText = '🔇';
        audioPlayer.muted = true;
    } else {
        muteMusicBtn.classList.remove('muted');
        muteMusicBtn.innerText = '🎵';
        audioPlayer.muted = false;
    }
}

if (muteMusicBtn) {
    muteMusicBtn.addEventListener('click', () => {
        isMusicMuted = !isMusicMuted;
        localStorage.setItem('game_music_muted', isMusicMuted);
        updateMuteButtonUI();
    });
}

// --- RELOJ INTERNO ---
function getGameTime() {
    return (performance.now() - gameStartTime) / 1000;
}

// --- CARGAR LISTADO DE CANCIONES ---
function loadCustomSongs() {
    customSongs = JSON.parse(localStorage.getItem('custom_rhythm_songs')) || [];
    songListEle.innerHTML = '';
    
    if (customSongs.length === 0) {
        songListEle.innerHTML = `
            <div style="color: #a5b1c2; font-style: italic; text-align: center; padding: 25px 0; font-size: 13px; border: 1px dashed rgba(0, 210, 211, 0.25); border-radius: 6px;">
                ¡No hay canciones creadas!<br>
                <a href="editor_local.html" style="color: #00d2d3; text-decoration: underline; display: inline-block; margin-top: 10px; font-weight: bold;">Ir al Creador</a>
            </div>
        `;
        return;
    }
    
    customSongs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-entry';
        div.innerHTML = `
            <span class="title">${song.name}</span>
            <span class="notes-count">${song.map.length} notas</span>
        `;
        div.addEventListener('click', () => selectSong(song, div));
        songListEle.appendChild(div);
    });
}

// --- SELECCIONAR CANCIÓN ---
function selectSong(song, element) {
    if (isGameRunning) {
        isGameRunning = false;
        clearInterval(gameInterval);
        audioPlayer.pause();
    }

    document.querySelectorAll('.song-entry').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    selectedSong = song;
    audioFileLoaded = false;
    
    songDetailsEle.style.display = 'block';
    detailSongName.innerText = song.name;
    detailSongNotes.innerText = song.map.length;
    detailSongAudio.innerText = song.fileName || "Desconocido.mp3";
    
    uploadLabel.innerText = "📂 Cargar Archivo MP3";
    audioPlayer.removeAttribute('src');
    audioFileInput.value = '';
    
    startBtn.style.display = 'none';
    gameMessage.style.display = 'none';
    
    songNameDisplay.innerText = song.name;
    bossDialogue.innerText = `Asocia el archivo "${song.fileName || 'su audio'}" para poder empezar.`;
    bossHealthFill.style.width = '0%';
}

// --- CONTROL DE SUBIDA DE MP3 ---
audioFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && selectedSong) {
        audioPlayer.src = URL.createObjectURL(file);
        audioFileLoaded = true;
        uploadLabel.innerText = "✅ Audio Cargado";
        startBtn.style.display = 'block';
        startBtn.innerText = "¡Empezar Canción!";
        bossDialogue.innerText = "¡Todo listo! Pulsa empezar para jugar.";
    }
});

// --- INICIAR JUEGO ---
startBtn.addEventListener('click', () => {
    if (!selectedSong || !audioFileLoaded) return;
    
    startBtn.style.display = 'none';
    gameMessage.style.display = 'none';
    
    playerLives = MAX_LIVES;
    completedCombos = 0;
    totalNotesInSong = selectedSong.map.length;
    activeAttackNotes = [];
    
    // Rellenar notas de la canción sumando un desfase inicial para el tiempo de caída de notas
    selectedSong.map.forEach((note, index) => {
        activeAttackNotes.push({
            time: note.time + 1.8, // 1.8 segundos tarda la nota en llegar a la línea de impacto
            key: note.key,
            id: `note-${index}-${Date.now()}`
        });
    });
    
    // Limpiar notas anteriores del DOM
    document.querySelectorAll('.note').forEach(n => n.remove());
    
    isGameRunning = true;
    gameStartTime = performance.now();
    
    // Iniciar la música exactamente a los 1.8s para sincronizar la primera nota (que cae en el tiempo 0.0 de la canción)
    setTimeout(() => {
        if (isGameRunning) {
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(err => console.error("Audio playback error:", err));
        }
    }, 1800);
    
    updateUI();
    
    // Bucle del juego a 60 FPS
    gameInterval = setInterval(updateGame, 1000 / 60);
});

// --- BUCLE DE JUEGO (60 FPS) ---
function updateGame() {
    if (!isGameRunning) return;
    const currentTime = getGameTime();
    
    if (playerLives <= 0) {
        endGame(false);
        return;
    }
    
    // Barra de progreso de la canción
    if (audioPlayer.duration) {
        let progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        bossHealthFill.style.width = `${progress}%`;
    }
    
    // Renderizado de las notas activas
    activeAttackNotes.forEach(note => {
        const timeToHit = note.time - currentTime;
        if (timeToHit > -0.5 && timeToHit < 2.0) {
            drawNote(note, timeToHit);
        }
    });
}

// --- DIBUJAR NOTA EN CARRIL ---
function drawNote(note, timeToHit) {
    const lane = document.getElementById(`lane-${note.key}`);
    if (!lane) return;
    
    let noteElement = document.getElementById(note.id);
    if (!noteElement) {
        noteElement = document.createElement('div');
        noteElement.id = note.id;
        noteElement.className = `note ${note.key}`;
        lane.appendChild(noteElement);
    }
    
    const targetTop = 540; // Línea de impacto
    const currentTop = targetTop - (timeToHit * 300); // Velocidad de caída 300px/s
    noteElement.style.top = `${currentTop}px`;
    
    // Penalización por nota perdida (miss)
    if (timeToHit < -0.25) {
        noteElement.remove();
        activeAttackNotes = activeAttackNotes.filter(n => n.id !== note.id);
        processPlayerMiss(note.key);
    }
}

// --- ACIERTOS Y FALLOS ---
function processPlayerMiss(key) {
    triggerMissEffect(key);
    playerLives--;
    updateUI();
    bossDialogue.innerText = "❌ ¡Nota perdida!";
}

function triggerMissEffect(key) {
    const lane = document.getElementById(`lane-${key}`);
    if (!lane) return;
    lane.classList.remove('hit-flash', 'miss-flash');
    void lane.offsetWidth; 
    lane.classList.add('miss-flash');
    setTimeout(() => lane.classList.remove('miss-flash'), 300);
}

function triggerHitEffect(key) {
    const lane = document.getElementById(`lane-${key}`);
    if (!lane) return;
    lane.classList.remove('hit-flash', 'miss-flash');
    void lane.offsetWidth; 
    lane.classList.add('hit-flash');
    setTimeout(() => lane.classList.remove('hit-flash'), 200);
}

// --- CONTROL DE ENTRADA DE TECLADO ---
window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;
    const key = e.key.toUpperCase();
    if (keys.includes(key)) {
        const lane = document.getElementById(`lane-${key}`);
        if (lane) lane.classList.add('pressing');
        
        checkHit(key);
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (keys.includes(key)) {
        const lane = document.getElementById(`lane-${key}`);
        if (lane) lane.classList.remove('pressing');
    }
});

function checkHit(key) {
    const currentTime = getGameTime();
    const hitWindow = 0.18; // 180ms margen de error
    
    const index = activeAttackNotes.findIndex(note => 
        note.key === key && Math.abs(note.time - currentTime) < hitWindow
    );
    
    if (index !== -1) {
        playSound(key, 'square', 0.12);
        triggerHitEffect(key);
        
        const noteElement = document.getElementById(activeAttackNotes[index].id);
        if (noteElement) noteElement.remove();
        
        activeAttackNotes.splice(index, 1);
        completedCombos++;
        updateUI();
    } else {
        // Penalización por pulsaciones fantasmas (ghost-hits)
        processPlayerMiss(key);
    }
}

// --- ACTUALIZAR INTERFAZ (UI) ---
function updateUI() {
    heartsEle.innerText = "❤️".repeat(Math.max(0, playerLives)) + "🖤".repeat(Math.max(0, MAX_LIVES - playerLives));
    comboCounterEle.innerText = completedCombos;
    if (musicoteCurrentBadge) {
        musicoteCurrentBadge.innerText = `FALLOS: ${MAX_LIVES - playerLives} / ${MAX_LIVES}`;
    }
}

// --- CONTROL DE FIN DE PARTIDA POR REPRODUCCIÓN COMPLETA ---
audioPlayer.addEventListener('ended', () => {
    if (isGameRunning) {
        endGame(true);
    }
});

function endGame(playerWon) {
    isGameRunning = false;
    clearInterval(gameInterval);
    audioPlayer.pause();
    
    document.querySelectorAll('.note').forEach(n => n.remove());
    
    gameMessage.style.display = 'block';
    
    if (playerWon) {
        gameMessage.className = 'msg-win';
        let accuracy = totalNotesInSong > 0 ? Math.round((completedCombos / totalNotesInSong) * 100) : 100;
        gameMessage.innerHTML = `
            ¡CANCION COMPLETADA!
            <div style="font-size: 16px; color: #fff; margin-top: 10px;">
                Aciertos: <strong style="color: #00d2d3;">${completedCombos} / ${totalNotesInSong}</strong> (${accuracy}%)
            </div>
        `;
        bossDialogue.innerText = "🔥 ¡Increíble! Has dominado el ritmo de la canción.";
    } else {
        gameMessage.className = 'msg-lose';
        gameMessage.innerHTML = `
            GAME OVER
            <div style="font-size: 16px; color: #fff; margin-top: 10px;">
                Puntuación: <strong style="color: #ff4757;">${completedCombos}</strong> notas.
            </div>
        `;
        bossDialogue.innerText = "💀 ¡Te has quedado sin vidas!";
    }
    
    startBtn.innerText = "Reintentar Canción";
    startBtn.style.display = 'block';
}

// --- INICIALIZACIÓN ---
updateMuteButtonUI();
loadCustomSongs();
