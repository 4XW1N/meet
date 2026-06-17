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

// Helper: Generate clean 4 digit room strings
function generateFourDigitCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Check if there is a hash code in the URL (e.g., meet.is-pro.dev/#2013)
function getRoomCodeFromUrl() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && hash.length === 4 && !isNaN(hash)) {
        return hash;
    }
    return null;
}

// Initialize Application Engine Routing
function initApp() {
    const urlRoomCode = getRoomCodeFromUrl();

    if (urlRoomCode) {
        // GUEST MODE: Loaded directly via hashed address link
        isGuestMode = true;
        myRoomCode = generateFourDigitCode(); // Unique individual caller ID
        switchLayoutToCall();
        remoteLabel.innerText = `Connecting to room: ${urlRoomCode}`;
        
        initPeerAndConnect(myRoomCode, urlRoomCode);
    } else {
        // HOST MODE: Regular Landing page generation rules
        myRoomCode = generateFourDigitCode();
        // Generates clean secure hash links like meet.is-pro.dev/#2013
        const fullShareableUrl = `${window.location.origin}${window.location.pathname}#${myRoomCode}`;
        displayLink.innerText = fullShareableUrl;
        
        initPeerAndConnect(myRoomCode, null);
    }
}

// Initialize structural Peer connection logic
function initPeerAndConnect(myCode, targetToCall) {
    peer = new Peer(myCode);

    peer.on('open', async (id) => {
        if (targetToCall) {
            await getMediaAccess();
            currentCall = peer.call(targetToCall, localStream);
            setupStreamHandlers(currentCall);
        }
    });

    peer.on('error', (err) => {
        console.error(err);
        if (err.type === 'unavailable-id') {
            initApp(); 
        }
    });

    // Handle incoming connections from calls
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

// Request Hardware Feed Permissions
async function getMediaAccess() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        }
    } catch (error) {
        console.error("Hardware access rejected.", error);
        alert("Camera and microphone authorization required.");
    }
}

// Structural Screen Swap Layout adjustments
function switchLayoutToCall() {
    homePage.classList.add('hidden');
    callPage.classList.remove('hidden');
}

// Copy Code link click interaction event listener
displayLink.addEventListener('click', () => {
    navigator.clipboard.writeText(displayLink.innerText);
    alert("Meeting URL link copied to clipboard successfully!");
});

// Manual Input Field Connect Event Listener
connectBtn.addEventListener('click', async () => {
    const remoteId = remoteIdInput.value.trim();
    if (remoteId.length !== 4) {
        alert("Please provide a 4-digit room target number.");
        return;
    }

    await getMediaAccess();
    switchLayoutToCall();
    remoteLabel.innerText = `Room: ${remoteId}`;

    currentCall = peer.call(remoteId, localStream);
    setupStreamHandlers(currentCall);
});

// Media Control System Audio Track Toggles
toggleMic.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleMic.innerText = audioTrack.enabled ? "🎙️" : "🔇";
        toggleMic.style.backgroundColor = audioTrack.enabled ? "#3c4043" : "#ea4335";
    }
});

// Media Control System Video Track Toggles
toggleVideo.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideo.innerText = videoTrack.enabled ? "📷" : "🚫";
        toggleVideo.style.backgroundColor = videoTrack.enabled ? "#3c4043" : "#ea4335";
    }
});

// Listen for hash changes manually if a user pastes a new one while on the page
window.addEventListener('hashchange', () => {
    window.location.reload();
});

// Live clock string interval script configuration
setInterval(() => {
    const now = new Date();
    document.getElementById('live-clock').innerText = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + " • " + now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
}, 1000);

initApp();
