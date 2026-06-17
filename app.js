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

function getRoomCodeFromUrl() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && hash.length > 5) {
        return hash;
    }
    return null;
}

function initApp() {
    const urlRoomCode = getRoomCodeFromUrl();

    if (urlRoomCode) {
        isGuestMode = true;
        initPeerAndConnect(null, urlRoomCode);
    } else {
        initPeerAndConnect(null, null);
    }
}

function initPeerAndConnect(myCode, targetToCall) {
    // Standardizing a worldwide firewall circumvention array (STUN + TURN Relay)
    peer = new Peer(undefined, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Public open-relay fallback tunnels to bridge distinct cellular/Wi-Fi topologies
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelay',
                    credential: 'openrelay'
                },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelay',
                    credential: 'openrelay'
                }
            ]
        }
    });

    peer.on('open', async (id) => {
        myRoomCode = id;
        console.log("Registered on cross-network PeerJS server with ID:", id);

        if (targetToCall) {
            switchLayoutToCall();
            remoteLabel.innerText = `Connecting via secure tunnel...`;
            await getMediaAccess();
            currentCall = peer.call(targetToCall, localStream);
            setupStreamHandlers(currentCall);
        } else {
            const fullShareableUrl = `${window.location.origin}${window.location.pathname}#${myRoomCode}`;
            if (displayLink) {
                displayLink.innerText = fullShareableUrl;
            }
        }
    });

    peer.on('error', (err) => {
        console.error("PeerJS Connectivity Error Context:", err.type);
        if (err.type === 'peer-unavailable') {
            alert("Meeting room not found. Ensure the host is still connected and online.");
            window.location.href = window.location.origin;
        }
    });

    peer.on('call', async (call) => {
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
    }
}

function switchLayoutToCall() {
    if(homePage && callPage) {
        homePage.classList.add('hidden');
        callPage.classList.remove('hidden');
    }
}

if (displayLink) {
    displayLink.addEventListener('click', () => {
        if (myRoomCode) {
            navigator.clipboard.writeText(displayLink.innerText);
            const savedUrl = displayLink.innerText;
            displayLink.innerText = "Copied link! ✅";
            setTimeout(() => {
                displayLink.innerText = savedUrl;
            }, 2000);
        }
    });
}

connectBtn.addEventListener('click', async () => {
    const remoteId = remoteIdInput.value.trim();
    let targetedId = remoteId;
    if (remoteId.includes('#')) {
        targetedId = remoteId.split('#')[1].trim();
    }

    if (!targetedId) return;

    await getMediaAccess();
    switchLayoutToCall();
    remoteLabel.innerText = `Connecting...`;

    currentCall = peer.call(targetedId, localStream);
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
