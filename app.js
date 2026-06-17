const displayId = document.getElementById('display-id');
const remoteIdInput = document.getElementById('remote-id-input');
const connectBtn = document.getElementById('connect-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const toggleMic = document.getElementById('toggle-mic');
const toggleVideo = document.getElementById('toggle-video');

let localStream;
let peer;
let currentCall;

// 1. Get access to camera and microphone
async function startLocalVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        
        // Ask the user to input a custom 4 digit room code
        let customCode = prompt("Enter a 4-digit code for your room (e.g., 1234):");
        
        // Validation loop to ensure it's exactly 4 characters
        while (!customCode || customCode.trim().length !== 4) {
            customCode = prompt("Invalid! Please enter exactly 4 characters/digits:");
        }
        
        initPeer(customCode.trim());
    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Please allow camera and microphone access to use this app.");
    }
}

// 2. Initialize PeerJS connection with a specific custom ID
function initPeer(roomCode) {
    // We pass the roomCode directly into the Peer constructor
    peer = new Peer(roomCode);

    peer.on('open', (id) => {
        displayId.innerText = id;
    });

    peer.on('error', (err) => {
        console.error(err);
        if (err.type === 'unavailable-id') {
            alert("That 4-digit code is already taken by someone else! Page will reload.");
            window.location.reload();
        } else {
            alert("An error occurred: " + err.message);
        }
    });

    // 3. Handle incoming calls
    peer.on('call', (call) => {
        currentCall = call;
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            remoteVideo.srcObject = remoteStream;
        });
    });
}

// 4. Place a call to a remote 4-digit code
connectBtn.addEventListener('click', () => {
    const remoteId = remoteIdInput.value.trim();
    if (remoteId.length !== 4) {
        alert("Please enter a valid 4-digit room code.");
        return;
    }

    currentCall = peer.call(remoteId, localStream);
    
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
    });
});

// 5. Mute/Unmute Control Logic
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

// Initialize on page load
startLocalVideo();
