// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDklGyLFZmuyHtQJYDfKyt9kShni0J5NxA",
  authDomain: "rhythmarena-e4702.firebaseapp.com",
  databaseURL: "https://rhythmarena-e4702-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "rhythmarena-e4702",
  storageBucket: "rhythmarena-e4702.firebasestorage.app",
  messagingSenderId: "291534481642",
  appId: "1:291534481642:web:b7a0cbc04a45f02dc54f93"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

let playerLives = 1;
let completedCombos = 0; // Contará las notas acertadas
let activeAttackNotes = [];       // Notas en pantalla actualmente

let highscore = parseInt(localStorage.getItem('rhythm_arena_highscore')) || 0;
let highscoreSpawnTimeout = null;   // Manejador del flujo continuo

const keys = ['S', 'D', 'K', 'L'];

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
    playerLives = 1;
    completedCombos = 0;
    activeAttackNotes = [];
    
    // Limpiar notas residuales en el DOM si las hubiera
    document.querySelectorAll('.note').forEach(n => n.remove());
    
    bossActiveUi.style.display = 'block';
    gameMessage.style.display = 'none';
    gameMessage.className = '';
    gameMessage.innerText = '';

    updateUI();
    bossDialogue.innerText = "¡A ver cuánto aguantas con 1 sola vida!";
    
    // Ciclo del juego a 60 FPS
    gameInterval = setInterval(updateGame, 1000 / 60);
    
    // Desencadenar el primer flujo de ataque
    launchContinuousHighscoreNote();
});

// --- GENERACIÓN CONTINUA PARA MODO HIGHSCORE ---
function launchContinuousHighscoreNote() {
    if (!isGameRunning || playerLives <= 0) return;

    let randomKey = keys[Math.floor(Math.random() * keys.length)];
    
    activeAttackNotes.push({
        time: getGameTime() + 1.8, // Tiempo de anticipación de caída
        key: randomKey,
        id: `note-${Date.now()}-${Math.random()}`
    });

    // Intervalo de caída dinámico. Se vuelve más rápido cuantas más notas aciertas
    let spawnRate = Math.max(220, 750 - (completedCombos * 6)); 

    highscoreSpawnTimeout = setTimeout(() => {
        launchContinuousHighscoreNote();
    }, spawnRate);
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
    
    // La velocidad incrementa progresivamente según las notas acertadas
    let speedPixels = 300 + Math.min(220, completedCombos * 2.5);
    const currentTop = targetTop - (timeToHit * speedPixels);
    noteElement.style.top = `${currentTop}px`;
    
    if (timeToHit < -0.20) { 
        noteElement.remove();
        activeAttackNotes = activeAttackNotes.filter(n => n.id !== note.id);
        
        processPlayerMiss(note.key);
    }
}

// --- GESTIÓN DE ACIERTOS Y FALLOS ---
function processPlayerMiss(key) {
    triggerMissEffect(key);
    playerLives--;
    updateUI();
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

        completedCombos++;
        
        // Actualizar y persistir el récord en localStorage
        if (completedCombos > highscore) {
            highscore = completedCombos;
            localStorage.setItem('rhythm_arena_highscore', highscore);
        }
        
        // Efecto visual: la barra se llena progresivamente cada 25 notas consecutivas
        let visualProgress = (completedCombos % 25) * 4;
        bossHealthFill.style.width = `${visualProgress}%`;
        
        if (completedCombos % 10 === 0) {
            bossDialogue.innerText = `👿 ¡Llevas ${completedCombos}! ¿Podrás aguantar la aceleración?`;
        }
        updateUI();
    } else {
        // Penalización por pulsar botones al azar en modo Highscore
        processPlayerMiss(key);
    }
}

// --- ACTUALIZACIONES DE INTERFAZ (UI) ---
function updateUI() {
    heartsEle.innerText = playerLives > 0 ? "❤️" : "💀";
    comboCounterEle.innerText = `${completedCombos} (Récord: ${highscore})`;
}

function endGame() {
    isGameRunning = false;
    clearInterval(gameInterval);
    clearTimeout(highscoreSpawnTimeout);
    
    document.querySelectorAll('.note').forEach(n => n.remove());

    bossActiveUi.style.display = 'none';
    gameMessage.style.display = 'block';

    gameMessage.className = 'msg-lose';
    
    // Crear la estructura de derrota con el formulario de guardado
    gameMessage.innerHTML = `
        GAME OVER
        <div style="font-size: 18px; color: #fff; margin-top: 10px;">
            Acertaste: <strong style="color: #ffa502;">${completedCombos}</strong> notas.
        </div>
        <div style="font-size: 14px; color: #a5b1c2; margin-top: 5px;">
            Tu mejor récord histórico: ${highscore}
        </div>
        
        <div id="save-score-container">
            <input type="text" id="player-name-input" placeholder="Ingresa tu Nombre" maxlength="12">
            <button id="save-score-btn">💾 Guardar Puntuación</button>
        </div>
    `;

    // Vincular el evento del botón de guardar puntuación
    const saveBtn = document.getElementById('save-score-btn');
    const nameInput = document.getElementById('player-name-input');
    
    if (saveBtn && nameInput) {
        saveBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert("Por favor, ingresa un nombre válido.");
                return;
            }
            saveScoreToFirebase(name);
        });
        
        // Permitir guardar presionando Enter en el input
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    }
    
    startBtn.innerText = "Reintentar Desafío";
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

// --- EFECTOS DE LOS CARRILES EN FALLO ---
function triggerMissEffect(key) {
    const lane = document.getElementById(`lane-${key}`);
    if (!lane) return;
    lane.classList.remove('hit-flash', 'miss-flash');
    void lane.offsetWidth; 
    lane.classList.add('miss-flash');
    setTimeout(() => lane.classList.remove('miss-flash'), 300);
}

// --- GUARDAR PUNTUACIÓN EN FIREBASE ---
function saveScoreToFirebase(playerName) {
    const saveBtn = document.getElementById('save-score-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Guardando...';
    }

    database.ref('highscores').push({
        name: playerName,
        score: completedCombos,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        const container = document.getElementById('save-score-container');
        if (container) {
            container.innerHTML = '<span style="color: #2ed573; font-weight: bold; font-size: 15px; text-shadow: 0 0 10px rgba(46,213,115,0.4);">¡Puntuación guardada con éxito!</span>';
        }
    }).catch((err) => {
        console.error("Error al guardar en Firebase:", err);
        alert("Hubo un problema al subir tu puntuación.");
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = '💾 Guardar Puntuación';
        }
    });
}

// --- CARGAR Y ESCUCHAR EL TOP 10 DE RÉCORDS ---
function setupHighscoresListener() {
    const highscoreListEle = document.getElementById('highscore-list');
    
    database.ref('highscores')
        .orderByChild('score')
        .limitToLast(10)
        .on('value', (snapshot) => {
            highscoreListEle.innerHTML = '';
            const rawScores = [];
            
            snapshot.forEach((childSnapshot) => {
                rawScores.push(childSnapshot.val());
            });
            
            // Reordenar de mayor a menor
            rawScores.reverse();
            
            if (rawScores.length === 0) {
                highscoreListEle.innerHTML = '<div class="highscore-entry loading">¡Sin récords aún!<br>Sé el primero.</div>';
                return;
            }
            
            rawScores.forEach((entry, index) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'highscore-entry';
                
                const safeName = escapeHTML(entry.name || 'Anónimo');
                
                entryDiv.innerHTML = `
                    <div>
                        <span class="rank">${index + 1}.</span>
                        <span class="name">${safeName}</span>
                    </div>
                    <span class="score">${entry.score}</span>
                `;
                highscoreListEle.appendChild(entryDiv);
            });
        }, (error) => {
            console.error("Error cargando puntuaciones:", error);
            highscoreListEle.innerHTML = '<div class="highscore-entry loading" style="color: #ff4757;">Error al conectar con la base de datos</div>';
        });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Inicializar la escucha al cargar la página
setupHighscoresListener();
