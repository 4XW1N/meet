const homePage = document.getElementById('home-page');
const callPage = document.getElementById('call-page');
const displayLink = document.getElementById('display-link');
const remoteIdInput = document.getElementById('remote-id-input');
const connectBtn = document.getElementById('connect-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const toggleMic = document.getElementById('toggle-mic');
const toggleVideo = document.getElementById('toggle-video');
const remoteLabel = document.getElementById('remote-label');

let localStream;
let peer;
let currentCall;
let myRoomCode = "";
let isGuestMode = false;

function generateFourDigitCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function getRoomCodeFromUrl() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && hash.length === 4 && !isNaN(hash)) {
        return hash;
    }
    return null;
}

function initApp() {
    const urlRoomCode = getRoomCodeFromUrl();

    if (urlRoomCode) {
        // GUEST MODE
        isGuestMode = true;
        myRoomCode = generateFourDigitCode(); 
        switchLayoutToCall();
        remoteLabel.innerText = `Connecting to room: ${urlRoomCode}`;
        
        initPeerAndConnect(myRoomCode, urlRoomCode);
    } else {
        // HOST MODE
        myRoomCode = generateFourDigitCode();
        // Clean URL construction specifically tailored for custom domains like meet.is-pro.dev
        const fullShareableUrl = `${window.location.origin}/#${myRoomCode}`;
        
        if (displayLink) {
            displayLink.innerText = fullShareableUrl;
        }
        
        initPeerAndConnect(myRoomCode, null);
    }
}

function initPeerAndConnect(myCode, targetToCall) {
    // Standardizing firewall circumvention to make sure handshakes land instantly
    peer = new Peer(myCode, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', async (id) => {
        console.log("Registered on network with ID:", id);
        if (targetToCall) {
            await getMediaAccess();
            console.log("Dialing target peer room code:", targetToCall);
            currentCall = peer.call(targetToCall, localStream);
            setupStreamHandlers(currentCall);
        }
    });

    peer.on('error', (err) => {
        console.error("PeerJS Core Error:", err.type, err.message);
        if (err.type === 'unavailable-id') {
            initApp(); 
        } else if (err.type === 'peer-unavailable') {
            alert("Room not found! Double check the 4-digit code and ensure the Host still has the window open.");
            window.location.href = window.location.origin;
        }
    });

    peer.on('call', async (call) => {
        console.custom("Receiving call request from remote user...");
        currentCall = call;
        remoteLabel.innerText = `Connected Room`;
        
        if (!localStream) {
            await getMediaAccess();
        }
        
        switchLayoutToCall();
        call.answer(localStream);
        setupStreamHandlers(call);
    });
}

function setupStreamHandlers(callObject) {
    callObject.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
    });
}

async function getMediaAccess() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        }
    } catch (error) {
        console.error("Hardware access rejected.", error);
        alert("Please enable Camera & Microphone access permissions in your browser address bar.");
    }
}

function switchLayoutToCall() {
    homePage.classList.add('hidden');
    callPage.classList.remove('hidden');
}

if (displayLink) {
    displayLink.addEventListener('click', () => {
        navigator.clipboard.writeText(displayLink.innerText);
        displayLink.innerText = "Copied link! ✅";
        setTimeout(() => {
            const fullShareableUrl = `${window.location.origin}/#${myRoomCode}`;
            displayLink.innerText = fullShareableUrl;
        }, 2000);
    });
}

connectBtn.addEventListener('click', async () => {
    const remoteId = remoteIdInput.value.trim();
    if (remoteId.length !== 4) {
        alert("Please input a valid 4-digit numeric code.");
        return;
    }

    await getMediaAccess();
    switchLayoutToCall();
    remoteLabel.innerText = `Room: ${remoteId}`;

    currentCall = peer.call(remoteId, localStream);
    setupStreamHandlers(currentCall);
});

toggleMic.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleMic.innerText = audioTrack.enabled ? "🎙️" : "🔇";
        toggleMic.style.backgroundColor = audioTrack.enabled ? "#3c4043" : "#ea4335";
    }
});

toggleVideo.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideo.innerText = videoTrack.enabled ? "📷" : "🚫";
        toggleVideo.style.backgroundColor = videoTrack.enabled ? "#3c4043" : "#ea4335";
    }
});

window.addEventListener('hashchange', () => {
    window.location.reload();
});

setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        clockEl.innerText = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + " • " + now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
    }
}, 1000);

initApp();
