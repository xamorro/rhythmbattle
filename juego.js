// --- ELEMENTOS DE LA INTERFAZ (DOM) ---
const startBtn = document.getElementById('start-btn');
const heartsEle = document.getElementById('player-hearts');
const bossHealthFill = document.getElementById('boss-health-fill');
const bossDialogue = document.getElementById('boss-dialogue');
const comboCounterEle = document.getElementById('combo-counter');
const bossActiveUi = document.getElementById('boss-active-ui');
const gameMessage = document.getElementById('game-message');
const nextBossBtn = document.getElementById('next-boss-btn');
const muteMusicBtn = document.getElementById('mute-music-btn');

// --- DETECCIÓN DEL JEFE SELECCIONADO ---
const urlParams = new URLSearchParams(window.location.search);
const bossId = parseInt(urlParams.get('boss')) || 1;

// Configuración de los diferentes jefes
const bossConfigs = {
    1: {
        name: "👿 Rey Ritmo",
        oscType: "sine",
        color: "#ff4757",
        colorWarning: "#ff7f50",
        colorDanger: "#ffa502",
        phrases: [
            "¡Siente la presión del bajo!",
            "¡A ver si puedes seguir este ritmo!",
            "¡Izquierda, derecha, rompe la mesa!",
            "¡Esta melodía va a doler!",
            "¡Tempo acelerado activado!"
        ]
    },
    2: {
        name: "👸 Reina Melodía",
        oscType: "triangle",
        color: "#1e90ff",
        colorWarning: "#70a1ff",
        colorDanger: "#a8c0ff",
        phrases: [
            "¡Mi melodía es dulce pero letal!",
            "¡Sigue el compás de mi corona!",
            "¡Afinación perfecta, ataque inmediato!",
            "¿Podrás con este solo lírico?",
            "¡Tempo romántico activado!"
        ]
    },
    3: {
        name: "🤖 Sintetizador Supremo",
        oscType: "sawtooth",
        color: "#9b59b6",
        colorWarning: "#a29bfe",
        colorDanger: "#e8dbff",
        phrases: [
            "¡BIP BOP! ANALIZANDO COMPORTAMIENTO...",
            "¡RITMO DIGITAL ACTIVADO!",
            "¡SINTONIZANDO SEÑAL AGRESIVA!",
            "¡CÓDIGO DE AUDIO CARGADO EN MEMORIA!",
            "¡FRECUENCIA SINFÓNICA DESTRUCCIÓN!"
        ]
    }
};

const currentBoss = bossConfigs[bossId] || bossConfigs[1];

// COMBOS FIJOS PARA CADA JEFE (Van a la par del ritmo del personaje)
const bossCombos = {
    1: [ // Rey Ritmo: Rítmico, simétrico, tempo estable
        { keys: ['S', 'S', 'D', 'D'], spacing: 0.45 },
        { keys: ['K', 'K', 'L', 'L'], spacing: 0.45 },
        { keys: ['S', 'D', 'K', 'L'], spacing: 0.42 },
        { keys: ['L', 'K', 'D', 'S'], spacing: 0.42 },
        { keys: ['S', 'S', 'L', 'L', 'D'], spacing: 0.40 },
        { keys: ['K', 'K', 'S', 'S', 'L'], spacing: 0.40 },
        { keys: ['S', 'D', 'S', 'D', 'K'], spacing: 0.38 },
        { keys: ['K', 'L', 'K', 'L', 'D'], spacing: 0.38 },
        { keys: ['S', 'D', 'K', 'L', 'S', 'D'], spacing: 0.35 },
        { keys: ['L', 'K', 'D', 'S', 'L', 'K'], spacing: 0.32 }
    ],
    2: [ // Reina Melodía: Arpegios melódicos, lírico
        { keys: ['S', 'D', 'L'], spacing: 0.40 },
        { keys: ['L', 'K', 'S'], spacing: 0.40 },
        { keys: ['S', 'K', 'D', 'L'], spacing: 0.38 },
        { keys: ['L', 'D', 'K', 'S'], spacing: 0.38 },
        { keys: ['S', 'D', 'K', 'D', 'S'], spacing: 0.36 },
        { keys: ['K', 'L', 'K', 'D', 'L'], spacing: 0.36 },
        { keys: ['S', 'D', 'K', 'L', 'K'], spacing: 0.34 },
        { keys: ['L', 'K', 'D', 'S', 'D'], spacing: 0.34 },
        { keys: ['S', 'L', 'D', 'K', 'S', 'L'], spacing: 0.30 },
        { keys: ['S', 'D', 'K', 'L', 'K', 'D', 'S'], spacing: 0.28 }
    ],
    3: [ // Sintetizador Supremo: Sincopado, rápido, cibernético de 8-bits
        { keys: ['S', 'L', 'S', 'L'], spacing: 0.35 },
        { keys: ['D', 'K', 'D', 'K'], spacing: 0.35 },
        { keys: ['S', 'D', 'S', 'L', 'L'], spacing: 0.32 },
        { keys: ['K', 'L', 'K', 'S', 'S'], spacing: 0.32 },
        { keys: ['S', 'L', 'D', 'K', 'S'], spacing: 0.30 },
        { keys: ['L', 'S', 'K', 'D', 'L'], spacing: 0.30 },
        { keys: ['S', 'S', 'D', 'D', 'K', 'K'], spacing: 0.28 },
        { keys: ['L', 'L', 'K', 'K', 'D', 'D'], spacing: 0.28 },
        { keys: ['S', 'D', 'K', 'L', 'S', 'D', 'K'], spacing: 0.25 },
        { keys: ['S', 'L', 'D', 'K', 'S', 'L', 'D', 'K'], spacing: 0.22 }
    ]
};

// Actualizar nombre del jefe en la interfaz
const bossNameEle = document.getElementById('boss-name');
if (bossNameEle) {
    bossNameEle.innerText = currentBoss.name;
    bossNameEle.style.color = currentBoss.color;
}

// --- VARIABLES DEL ESTADO DE JUEGO ---
let gameInterval;
let gameStartTime = 0;
let isGameRunning = false;

let playerLives = 3;
const TOTAL_COMBOS_TO_WIN = 10;

let completedCombos = 0;
let activeAttackNotes = [];       // Notas en pantalla actualmente
let currentComboNotesCount = 0;   // Notas totales del ataque actual
let notesHitInCurrentCombo = 0;   // Notas defendidas con éxito
let isBossAttacking = false;
let failedCurrentCombo = false;   // Bloquea el combo si ya cometiste un fallo

const keys = ['S', 'D', 'K', 'L'];

// --- VARIABLES DE MÚSICA DE FONDO ---
let isMusicMuted = localStorage.getItem('game_music_muted') === 'true';
let musicSequencerInterval = null;
let currentMusicStep = 0;

// Notas de bajo procedurales (A2, A2, C3, D3, A2, A2, G2, E2)
const bassNotes = [
    110.00, 110.00, 130.81, 146.83,
    110.00, 110.00, 98.00, 82.41
];

// --- SISTEMA DE SONIDO MUSICAL (WEB AUDIO API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const toneConfig = {
    'S': 261.63, 
    'D': 329.63, 
    'K': 392.00, 
    'L': 523.25  
};

// Función para reproducir sonidos tipo sintetizador en tiempo real
function playSound(key, type = 'square', duration = 0.1) {
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

// --- SECUENCIADOR DE MÚSICA DE FONDO ---
function playMusicStep() {
    if (isMusicMuted || !isGameRunning) return;
    const freq = bassNotes[currentMusicStep % bassNotes.length];
    
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // Volumen bajo para ser música de fondo de ambiente
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.38);
    } catch (e) {
        console.error("Audio error in background music sequencer:", e);
    }
    
    currentMusicStep++;
}

function startMusicLoop() {
    if (musicSequencerInterval) clearInterval(musicSequencerInterval);
    currentMusicStep = 0;
    musicSequencerInterval = setInterval(playMusicStep, 400); // ~150 BPM
}

function stopMusicLoop() {
    if (musicSequencerInterval) {
        clearInterval(musicSequencerInterval);
        musicSequencerInterval = null;
    }
}

// --- CRONÓMETRO INTERNO ---
function getGameTime() {
    return (performance.now() - gameStartTime) / 1000;
}

// --- BOTÓN INICIAR BATALLA ---
startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    if (nextBossBtn) nextBossBtn.style.display = 'none';
    
    // Iniciar reloj interno
    gameStartTime = performance.now();
    isGameRunning = true;
    
    // Reiniciar estadísticas
    playerLives = 3;
    completedCombos = 0;
    activeAttackNotes = [];
    isBossAttacking = false;
    failedCurrentCombo = false;
    
    // Limpiar notas residuales en el DOM si las hubiera
    document.querySelectorAll('.note').forEach(n => n.remove());
    
    bossActiveUi.style.display = 'block';
    gameMessage.style.display = 'none';
    gameMessage.className = '';
    gameMessage.innerText = '';

    updateUI();
    bossDialogue.innerText = `¡Que empiece el duelo contra ${currentBoss.name}!`;
    
    // Ciclo del juego a 60 FPS
    gameInterval = setInterval(updateGame, 1000 / 60);
    
    // Desencadenar el primer ataque de la IA
    scheduleNextBossAction();

    // Activar música de fondo
    startMusicLoop();
});

// --- INTELIGENCIA ARTIFICIAL DEL ENEMIGO ---
function scheduleNextBossAction() {
    if (!isGameRunning || playerLives <= 0 || completedCombos >= TOTAL_COMBOS_TO_WIN) return;

    let cooldown = (completedCombos === 0 && activeAttackNotes.length === 0) 
        ? 0 
        : (Math.random() * 2000 + 1500);

    setTimeout(() => {
        if (isGameRunning && playerLives > 0 && completedCombos < TOTAL_COMBOS_TO_WIN) {
            launchRandomAttack();
        }
    }, cooldown);
}

function launchRandomAttack() {
    isBossAttacking = false; 
    failedCurrentCombo = false;
    notesHitInCurrentCombo = 0;
    
    // Elegir frase del jefe actual
    bossDialogue.innerText = currentBoss.phrases[Math.floor(Math.random() * currentBoss.phrases.length)];

    // Cargar combo fijo correspondiente al nivel y progreso del jugador
    const comboList = bossCombos[bossId] || bossCombos[1];
    const currentComboData = comboList[Math.min(completedCombos, comboList.length - 1)];

    currentComboNotesCount = currentComboData.keys.length;
    let noteSpacing = currentComboData.spacing;
    activeAttackNotes = [];

    let delayBeforeAttackStarts = (currentComboNotesCount * noteSpacing) + 0.3;

    // 1. EL JEFE TOCA SU MELODÍA PRIMERO (FASE DE ESCUCHA)
    for (let i = 0; i < currentComboNotesCount; i++) {
        let targetKey = currentComboData.keys[i];
        
        setTimeout(() => {
            if (isGameRunning && playerLives > 0) {
                // Utilizar el oscilador propio de cada jefe
                playSound(targetKey, currentBoss.oscType, 0.25); 
                
                const lane = document.getElementById(`lane-${targetKey}`);
                if (lane) {
                    lane.style.background = "rgba(255, 255, 255, 0.1)";
                    setTimeout(() => lane.style.background = "none", 150);
                }
            }
        }, (i * noteSpacing) * 1000);

        // 2. PROGRAMAMOS LAS NOTAS PARA EL TURNO DEL JUGADOR
        activeAttackNotes.push({
            time: getGameTime() + delayBeforeAttackStarts + (i * noteSpacing),
            key: targetKey,
            id: `note-${Date.now()}-${i}`
        });
    }

    setTimeout(() => {
        if (isGameRunning && playerLives > 0) {
            isBossAttacking = true;
        }
    }, delayBeforeAttackStarts * 1000);
}

// --- BUCLE DE ACTUALIZACIÓN (60 FPS) ---
function updateGame() {
    if (!isGameRunning) return;
    const currentTime = getGameTime();

    if (playerLives <= 0) {
        isGameRunning = false;
        setTimeout(() => endGame(false), 400);
        return;
    }
    
    if (completedCombos >= TOTAL_COMBOS_TO_WIN) {
        isGameRunning = false;
        setTimeout(() => endGame(true), 600);
        return;
    }

    // Gestionar la caída de las notas
    activeAttackNotes.forEach(note => {
        const timeToHit = note.time - currentTime;
        if (timeToHit > -0.5 && timeToHit < 2.0) {
            drawNote(note, timeToHit);
        }
    });
}

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
    const currentTop = targetTop - (timeToHit * 300);
    noteElement.style.top = `${currentTop}px`;
    
    if (timeToHit < -0.25) { 
        noteElement.remove();
        activeAttackNotes = activeAttackNotes.filter(n => n.id !== note.id);
        
        processPlayerMiss(note.key);
        checkComboEnd();
    }
}

// --- GESTIÓN DE ACIERTOS Y FALLOS ---
function processPlayerMiss(key) {
    triggerMissEffect(key);
    
    if (!failedCurrentCombo) {
        failedCurrentCombo = true;
        playerLives--;
        updateUI();
        bossDialogue.innerText = "😈 ¡Demasiado lento para mi ritmo!";
    }
}

// --- DETECTAR FIN DEL COMBO ---
function checkComboEnd() {
    if (activeAttackNotes.length === 0) {
        if (isBossAttacking) {
            isBossAttacking = false; 
            
            if (!failedCurrentCombo && notesHitInCurrentCombo === currentComboNotesCount) {
                bossDialogue.innerText = "💥 ¡Agh! Bloqueaste toda mi secuencia...";
                sendDamageToBoss(); 
            } else {
                scheduleNextBossAction();
            }
        }
    }
}

// --- ENTRADA DE TECLADO ---
window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;
    const key = e.key.toUpperCase();
    if (keys.includes(key)) {
        const lane = document.getElementById(`lane-${key}`);
        if(lane) lane.classList.add('pressing');
        
        checkHit(key);
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (keys.includes(key)) {
        const lane = document.getElementById(`lane-${key}`);
        if(lane) lane.classList.remove('pressing');
    }
});

function checkHit(key) {
    const currentTime = getGameTime();
    const hitWindow = 0.18; // 180ms Margen de error
    
    const index = activeAttackNotes.findIndex(note => 
        note.key === key && Math.abs(note.time - currentTime) < hitWindow
    );
    
    if (index !== -1) {
        playSound(key, 'square', 0.12);
        triggerHitEffect(key);

        const noteElement = document.getElementById(activeAttackNotes[index].id);
        if (noteElement) noteElement.remove();
        activeAttackNotes.splice(index, 1);

        notesHitInCurrentCombo++;
        checkComboEnd();
    } else {
        if (isBossAttacking && !failedCurrentCombo) {
            processPlayerMiss(key);
        }
    }
}

// --- ACTUALIZACIONES DE INTERFAZ (UI) ---
function updateUI() {
    heartsEle.innerText = "❤️".repeat(Math.max(0, playerLives)) + "🖤".repeat(Math.max(0, 3 - playerLives));
    comboCounterEle.innerText = `${completedCombos} / ${TOTAL_COMBOS_TO_WIN}`;
    
    let bossHealthPercentage = ((TOTAL_COMBOS_TO_WIN - completedCombos) / TOTAL_COMBOS_TO_WIN) * 100;
    bossHealthFill.style.width = `${bossHealthPercentage}%`;

    // Cambiar el color de la barra con respecto al boss actual
    if (completedCombos >= 7) {
        bossHealthFill.style.background = currentBoss.colorDanger; 
    } else if (completedCombos >= 4) {
        bossHealthFill.style.background = currentBoss.colorWarning; 
    } else {
        bossHealthFill.style.background = currentBoss.color; 
    }
}

function endGame(playerWon) {
    isGameRunning = false;
    clearInterval(gameInterval);
    stopMusicLoop();
    
    document.querySelectorAll('.note').forEach(n => n.remove());

    bossActiveUi.style.display = 'none';
    gameMessage.style.display = 'block';

    if (playerWon) {
        gameMessage.className = 'msg-win';
        gameMessage.innerText = '¡HAS GANADO!';
        
        // Guardar progreso del desbloqueo
        if (bossId === 1) {
            localStorage.setItem('boss_2_unlocked', 'true');
        } else if (bossId === 2) {
            localStorage.setItem('boss_3_unlocked', 'true');
        } else if (bossId === 3) {
            localStorage.setItem('boss_4_unlocked', 'true');
        }

        // Ofrecer botón para siguiente boss si aplica
        if (bossId < 3) {
            if (nextBossBtn) {
                nextBossBtn.style.display = 'block';
                nextBossBtn.innerText = "Siguiente Jefe";
            }
            startBtn.innerText = "Repetir Batalla";
        } else {
            if (nextBossBtn) nextBossBtn.style.display = 'none';
            startBtn.innerText = "Repetir Batalla";
        }
    } else {
        gameMessage.className = 'msg-lose';
        gameMessage.innerText = 'GAME OVER';
        if (nextBossBtn) nextBossBtn.style.display = 'none';
        startBtn.innerText = "Reintentar Batalla";
    }
    
    startBtn.style.display = 'block';
}

// --- EFECTOS DE LOS CARRILES ---
function triggerHitEffect(key) {
    const lane = document.getElementById(`lane-${key}`);
    if (!lane) return;
    lane.classList.remove('hit-flash', 'miss-flash');
    void lane.offsetWidth; 
    lane.classList.add('hit-flash');
    setTimeout(() => lane.classList.remove('hit-flash'), 200);
}

function triggerMissEffect(key) {
    const lane = document.getElementById(`lane-${key}`);
    if (!lane) return;
    lane.classList.remove('hit-flash', 'miss-flash');
    void lane.offsetWidth; 
    lane.classList.add('miss-flash');
    setTimeout(() => lane.classList.remove('miss-flash'), 300);
}

// --- LANZAR ANIMACIÓN DE DAÑO ---
function sendDamageToBoss() {
    const gameContainer = document.getElementById('game-container');
    const bossZone = document.getElementById('battle-ui'); 
    
    if (!gameContainer) return;

    const projectile = document.createElement('div');
    projectile.className = 'damage-projectile';
    gameContainer.appendChild(projectile);

    if (audioCtx.state !== 'suspended') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.4); 
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }

    setTimeout(() => {
        projectile.remove();
        
        completedCombos++;
        updateUI(); 
        
        if (bossZone) {
            bossZone.classList.remove('boss-hurt-flash');
            void bossZone.offsetWidth; 
            bossZone.classList.add('boss-hurt-flash');
            setTimeout(() => bossZone.classList.remove('boss-hurt-flash'), 300);
        }

        scheduleNextBossAction();
    }, 500); 
}

// --- REDIRECCIÓN AL SIGUIENTE JEFE ---
if (nextBossBtn) {
    nextBossBtn.addEventListener('click', () => {
        window.location.href = `juego.html?boss=${bossId + 1}`;
    });
}

// --- CONTROL DE MÚSICA DE FONDO MUTE ---
function updateMuteButtonUI() {
    if (!muteMusicBtn) return;
    if (isMusicMuted) {
        muteMusicBtn.classList.add('muted');
        muteMusicBtn.innerText = '🔇';
    } else {
        muteMusicBtn.classList.remove('muted');
        muteMusicBtn.innerText = '🎵';
    }
}

if (muteMusicBtn) {
    muteMusicBtn.addEventListener('click', () => {
        isMusicMuted = !isMusicMuted;
        localStorage.setItem('game_music_muted', isMusicMuted);
        updateMuteButtonUI();
        
        if (!isMusicMuted && isGameRunning && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    });
}

// Inicializar el botón de mute
updateMuteButtonUI();