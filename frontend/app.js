const config = window.__CONFIG__ || {};
const backendUrl = config.BACKEND_URL || window.location.origin;
const apiKey = config.API_KEY || "";

const socketOptions = {
    transports: ['websocket'],
    upgrade: false,
    auth: apiKey ? { apiKey } : {}
};

const socket = io(backendUrl, socketOptions);
window.socket = socket;

socket.on('connect', () => {
    console.log('Connected to Server!');
    document.getElementById('status-msg').textContent = 'CONNECTED';
});

socket.on('connect_error', (err) => {
    console.log('Connection Error:', err.message);
    document.getElementById('status-msg').textContent = 'CONN ERROR';
});

const overlay = document.getElementById('overlay');
const lockToggle = document.getElementById('lockToggle');
const statusMsg = document.getElementById('status-msg');
let controlEnabled = false;

document.getElementById('loginBtn').onclick = () => socket.emit('auth', document.getElementById('passInput').value);

socket.on('auth_success', () => {
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('main-ui').style.display = 'flex';

    const video = document.getElementById('remoteVideo');
    video.play().catch((e) => console.log('Auto-play blocked:', e));
});

socket.on('auth_lockout', (data) => {
    document.getElementById('status-msg').textContent = 'TOO MANY ATTEMPTS';
    document.getElementById('loginBtn').disabled = true;
    setTimeout(() => {
        document.getElementById('status-msg').textContent = 'TRY AGAIN';
        document.getElementById('loginBtn').disabled = false;
    }, Math.max(0, data.retryAfter || 0));
});

lockToggle.onclick = () => {
    controlEnabled = !controlEnabled;
    lockToggle.innerText = controlEnabled ? 'STOP' : 'CONTROLS';
    lockToggle.classList.toggle('toggle-active');
    statusMsg.textContent = controlEnabled ? 'CONTROLS ON' : 'READY';
};

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

overlay.addEventListener('mousedown', () => {
    if (controlEnabled && !isMobile()) overlay.requestPointerLock();
});

let pendingDX = 0;
let pendingDY = 0;
let lastTouch = null;

document.addEventListener('mousemove', (e) => {
    if (!isMobile() && document.pointerLockElement === overlay && controlEnabled) {
        pendingDX += e.movementX;
        pendingDY += e.movementY;
    }
});

overlay.addEventListener('touchstart', (e) => {
    if (!controlEnabled) return;
    if (e.touches.length === 1) {
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        socket.emit('m_click', { t: 'down', b: 'left' });
    }
});

overlay.addEventListener('touchmove', (e) => {
    if (!controlEnabled) return;
    if (e.touches.length === 1 && lastTouch) {
        const newX = e.touches[0].clientX;
        const newY = e.touches[0].clientY;
        const dx = newX - lastTouch.x;
        const dy = newY - lastTouch.y;
        lastTouch = { x: newX, y: newY };
        socket.emit('m_rel', { dx, dy });
    }
});

overlay.addEventListener('touchend', () => {
    if (!controlEnabled) return;
    socket.emit('m_click', { t: 'up', b: 'left' });
    lastTouch = null;
});

function syncMouse() {
    if (controlEnabled && (pendingDX !== 0 || pendingDY !== 0)) {
        socket.emit('m_rel', { dx: pendingDX, dy: pendingDY });
        pendingDX = 0;
        pendingDY = 0;
    }
    requestAnimationFrame(syncMouse);
}

syncMouse();

overlay.addEventListener('mousedown', (e) => {
    if (controlEnabled && !isMobile()) socket.emit('m_click', { t: 'down', b: e.button === 2 ? 'right' : 'left' });
});

overlay.addEventListener('mouseup', (e) => {
    if (controlEnabled && !isMobile()) socket.emit('m_click', { t: 'up', b: e.button === 2 ? 'right' : 'left' });
});

overlay.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
    if (
        controlEnabled
        && ((!isMobile() && document.pointerLockElement === overlay) || isMobile())
    ) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
        socket.emit('k', { val: e.key, state: 'down' });
    }
}, true);

window.addEventListener('keyup', (e) => {
    if (
        controlEnabled
        && ((!isMobile() && document.pointerLockElement === overlay) || isMobile())
    ) {
        socket.emit('k', { val: e.key, state: 'up' });
    }
}, true);

window.onblur = () => {
    if (controlEnabled) {
        socket.emit('reset_keys');
    }
};

const video = document.getElementById('remoteVideo');
const mediaSource = new MediaSource();
let sourceBuffer = null;
let queue = [];

video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', () => {
    sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');
    sourceBuffer.addEventListener('updateend', () => {
        if (queue.length > 0 && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(queue.shift());
        }
    });

    sourceBuffer.onerror = () => {
        console.error('Buffer error, clearing...');
        try {
            if (video.buffered.length > 0) {
                video.currentTime = video.buffered.end(video.buffered.length - 1);
            }
        } catch (err) {
        }
    };
});

socket.on('v', (data) => {
    const chunk = new Uint8Array(data);
    if (sourceBuffer && !sourceBuffer.updating) {
        try {
            if (
                video.buffered.length > 0
                && video.buffered.end(0) - video.buffered.start(0) > 10
            ) {
                sourceBuffer.remove(0, video.buffered.end(0) - 1);
                return;
            }
            sourceBuffer.appendBuffer(chunk);
        } catch (e) {
            console.log('Buffer full, skipping frame');
        }
    } else {
        queue.push(chunk);
    }

    if (video.buffered.length > 0) {
        const liveEnd = video.buffered.end(video.buffered.length - 1);
        if (liveEnd - video.currentTime > 0.25) {
            video.currentTime = liveEnd;
        }
    }
});

const qualitySlider = document.getElementById('qualitySlider');
qualitySlider.onchange = () => {
    socket.emit('change_quality', qualitySlider.value);
};
