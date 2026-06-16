// --- ELEMENTOS DE LA INTERFAZ (DOM) ---
const startBtn = document.getElementById('start-btn');
const heartsEle = document.getElementById('player-hearts');
const bossHealthFill = document.getElementById('boss-health-fill');
const bossDialogue = document.getElementById('boss-dialogue');
const comboCounterEle = document.getElementById('combo-counter');
const bossActiveUi = document.getElementById('boss-active-ui');
const gameMessage = document.getElementById('game-message');

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

// Diálogos del jefe
const bossPhrases = [
    "¡Siente la presión del bajo!",
    "¡A ver si puedes seguir este ritmo!",
    "¡Izquierda, derecha, rompe la mesa!",
    "¡Esta melodía va a doler!",
    "¡Tempo acelerado activado!"
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

// --- CRONÓMETRO INTERNO ---
function getGameTime() {
    return (performance.now() - gameStartTime) / 1000;
}

// --- BOTÓN INICIAR BATALLA ---
startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    
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
    bossDialogue.innerText = "¡Que empiece el duelo musical!";
    
    // Ciclo del juego a 60 FPS
    gameInterval = setInterval(updateGame, 1000 / 60);
    
    // Desencadenar el primer ataque de la IA
    scheduleNextBossAction();
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
    
    bossDialogue.innerText = bossPhrases[Math.floor(Math.random() * bossPhrases.length)];

    let minNotes = 3 + Math.floor(completedCombos / 3); 
    let maxNotes = 5 + Math.floor(completedCombos / 3);
    currentComboNotesCount = Math.floor(Math.random() * (maxNotes - minNotes + 1)) + minNotes;

    let noteSpacing = Math.max(0.2, 0.45 - (completedCombos * 0.025));
    activeAttackNotes = [];

    let delayBeforeAttackStarts = (currentComboNotesCount * noteSpacing) + 0.3;

    // 1. EL JEFE TOCA SU MELODÍA PRIMERO (FASE DE ESCUCHA)
    for (let i = 0; i < currentComboNotesCount; i++) {
        let randomKey = keys[Math.floor(Math.random() * keys.length)];
        
        setTimeout(() => {
            if (isGameRunning && playerLives > 0) {
                playSound(randomKey, 'sine', 0.25); 
                
                const lane = document.getElementById(`lane-${randomKey}`);
                if (lane) {
                    lane.style.background = "rgba(255, 255, 255, 0.1)";
                    setTimeout(() => lane.style.background = "none", 150);
                }
            }
        }, (i * noteSpacing) * 1000);

        // 2. PROGRAMAMOS LAS NOTAS PARA EL TURNO DEL JUGADOR
        activeAttackNotes.push({
            time: getGameTime() + delayBeforeAttackStarts + (i * noteSpacing),
            key: randomKey,
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

    if (completedCombos >= 7) {
        bossHealthFill.style.background = "#ffa502"; 
    } else if (completedCombos >= 4) {
        bossHealthFill.style.background = "#ff7f50"; 
    } else {
        bossHealthFill.style.background = "#ff4757"; 
    }
}

function endGame(playerWon) {
    isGameRunning = false;
    clearInterval(gameInterval);
    
    document.querySelectorAll('.note').forEach(n => n.remove());

    bossActiveUi.style.display = 'none';
    gameMessage.style.display = 'block';

    if (playerWon) {
        gameMessage.className = 'msg-win';
        gameMessage.innerText = '¡HAS GANADO!';
    } else {
        gameMessage.className = 'msg-lose';
        gameMessage.innerText = 'GAME OVER';
    }
    
    startBtn.innerText = "Reintentar Batalla";
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