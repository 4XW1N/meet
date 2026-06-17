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

// Read the unique PeerJS long ID string from the URL hash
function getRoomCodeFromUrl() {
    const hash = window.location.hash.replace('#', '').trim();
    // Validate that it has content and isn't just an empty string
    if (hash && hash.length > 5) {
        return hash;
    }
    return null;
}

function initApp() {
    const urlRoomCode = getRoomCodeFromUrl();

    if (urlRoomCode) {
        // GUEST MODE: Joining someone else's room
        isGuestMode = true;
        // Guest gets an auto-assigned long ID string from the PeerJS cloud server
        initPeerAndConnect(null, urlRoomCode);
    } else {
        // HOST MODE: Creating a new room
        // Host gets an auto-assigned long ID string from the PeerJS cloud server
        initPeerAndConnect(null, null);
    }
}

function initPeerAndConnect(myCode, targetToCall) {
    // Leave the ID parameter blank so PeerJS generates its global unique long ID string
    peer = new Peer(undefined, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', async (id) => {
        myRoomCode = id;
        console.log("Successfully registered on PeerJS with unique ID:", id);

        if (targetToCall) {
            // Guest configurations
            switchLayoutToCall();
            remoteLabel.innerText = `Connecting to host...`;
            await getMediaAccess();
            currentCall = peer.call(targetToCall, localStream);
            setupStreamHandlers(currentCall);
        } else {
            // Host configurations: dynamically show the generated sharing link
            const fullShareableUrl = `${window.location.origin}/#${myRoomCode}`;
            if (displayLink) {
                displayLink.innerText = fullShareableUrl;
            }
        }
    });

    peer.on('error', (err) => {
        console.error("PeerJS Core Connection Error:", err.type, err.message);
        if (err.type === 'peer-unavailable') {
            alert("The host room could not be found. Please check your link or ensure the host still has the page open.");
            window.location.href = window.location.origin;
        }
    });

    // Handle incoming connections from calls (for the Host)
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
        const savedUrl = displayLink.innerText;
        displayLink.innerText = "Copied link! ✅";
        setTimeout(() => {
            displayLink.innerText = savedUrl;
        }, 2000);
    });
}

connectBtn.addEventListener('click', async () => {
    const remoteId = remoteIdInput.value.trim();
    if (!remoteId) {
        alert("Please paste a valid long string meeting code.");
        return;
    }

    await getMediaAccess();
    switchLayoutToCall();
    remoteLabel.innerText = `Connecting...`;

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
