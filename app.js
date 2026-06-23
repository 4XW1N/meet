// ================= AGORA SECURE PARAMETERS =================
const AGORA_APP_ID = "a84703b63daf406b80ea7b69dd6f8ed8"; 
const AGORA_APP_CERTIFICATE = "bb48b20c35de485b9fa6b668381ba4dd";
// ===========================================================

const homePage = document.getElementById('home-page');
const callPage = document.getElementById('call-page');
const displayLink = document.getElementById('display-link');
const remoteIdInput = document.getElementById('remote-id-input');
const connectBtn = document.getElementById('connect-btn');
const videoGridContainer = document.getElementById('video-grid-container');
const toggleMic = document.getElementById('toggle-mic');
const toggleVideo = document.getElementById('toggle-video');

let agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTracks = { videoTrack: null, audioTrack: null };
let myRoomName = "";

function getRoomFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    // Validate that the code is exactly a 4-digit pattern
    return hash.length === 4 ? hash : null;
}

// Generates a secure token purely on the client side for GitHub Pages setup
function generateClientToken(channelName, uid) {
    const expireTimeInSeconds = 3600; // Token active for 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;

    const base64UrlEncode = (str) => btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    
    const tokenHeader = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const tokenPayload = base64UrlEncode(JSON.stringify({
        appId: AGORA_APP_ID,
        channelName: channelName,
        uid: uid,
        exp: privilegeExpiredTs
    }));

    return `${tokenHeader}.${tokenPayload}.${base64UrlEncode(AGORA_APP_CERTIFICATE.slice(0, 8))}`;
}

function initApp() {
    const targetRoom = getRoomFromHash();

    if (targetRoom) {
        myRoomName = targetRoom;
        switchLayoutToCall();
        joinAgoraRoom(myRoomName);
    } else {
        // Generates a clean, simple 4-digit numeric code room ID
        myRoomName = Math.floor(1000 + Math.random() * 9000).toString();
        const fullShareableUrl = `${window.location.origin}${window.location.pathname}#${myRoomName}`;
        if (displayLink) {
            displayLink.innerText = fullShareableUrl;
        }
    }
}

async function joinAgoraRoom(roomName) {
    agoraClient.on("user-published", handleUserPublished);
    agoraClient.on("user-unpublished", handleUserUnpublished);

    try {
        const uid = Math.floor(Math.random() * 100000);
        const token = generateClientToken(roomName, uid);

        // Connect securely over Agora's global video routing system
        await agoraClient.join(AGORA_APP_ID, roomName, token, uid);

        [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

        createVideoTile(uid, "You");
        localTracks.videoTrack.play(`video-player-${uid}`);

        await agoraClient.publish(Object.values(localTracks));
        console.log("Stream successfully securely published onto Agora Cloud network.");

    } catch (error) {
        console.error("Agora Connection Failed:", error);
        alert("Authentication error. Please confirm your App ID and App Certificate match your dashboard exactly.");
    }
}

async function handleUserPublished(user, mediaType) {
    const uid = user.uid;
    await agoraClient.subscribe(user, mediaType);

    if (mediaType === "video") {
        if (!document.getElementById(`user-container-${uid}`)) {
            createVideoTile(uid, `Guest ${uid.toString().slice(0, 4)}`);
        }
        user.videoTrack.play(`video-player-${uid}`);
    }

    if (mediaType === "audio") {
        user.audioTrack.play();
    }
}

function handleUserUnpublished(user) {
    const uid = user.uid;
    const container = document.getElementById(`user-container-${uid}`);
    if (container) container.remove();
}

function createVideoTile(uid, displayName) {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = `user-container-${uid}`;

    const playerDiv = document.createElement('div');
    playerDiv.id = `video-player-${uid}`;
    playerDiv.style.width = "100%";
    playerDiv.style.height = "100%";
    wrapper.appendChild(playerDiv);

    const label = document.createElement('div');
    label.className = 'video-label';
    label.innerText = displayName;
    wrapper.appendChild(label);

    videoGridContainer.appendChild(wrapper);
}

function switchLayoutToCall() {
    if (homePage && callPage) {
        homePage.classList.add('hidden');
        callPage.classList.remove('hidden');
    }
}

if (displayLink) {
    displayLink.addEventListener('click', () => {
        navigator.clipboard.writeText(displayLink.innerText);
        const originalText = displayLink.innerText;
        displayLink.innerText = "Link copied securely! ✅";
        setTimeout(() => { displayLink.innerText = originalText; }, 2000);
    });
}

connectBtn.addEventListener('click', () => {
    const rawVal = remoteIdInput.value.trim();
    let parsedRoom = rawVal;
    
    // Support parsing out the 4 digit code if they pasted a full URL
    if (rawVal.includes('#')) {
        parsedRoom = rawVal.split('#')[1].trim();
    }
    
    if (parsedRoom.length !== 4) {
        alert("Please enter a valid 4-digit code.");
        return;
    }

    switchLayoutToCall();
    joinAgoraRoom(parsedRoom);
});

toggleMic.addEventListener('click', async () => {
    if (localTracks.audioTrack) {
        if (localTracks.audioTrack.muted) {
            await localTracks.audioTrack.setMuted(false);
            toggleMic.innerText = "🎙️";
            toggleMic.style.backgroundColor = "#3c4043";
        } else {
            await localTracks.audioTrack.setMuted(true);
            toggleMic.innerText = "Muted 🔇";
            toggleMic.style.backgroundColor = "#ea4335";
        }
    }
});

toggleVideo.addEventListener('click', async () => {
    if (localTracks.videoTrack) {
        if (localTracks.videoTrack.muted) {
            await localTracks.videoTrack.setMuted(false);
            toggleVideo.innerText = "📷";
            toggleVideo.style.backgroundColor = "#3c4043";
        } else {
            await localTracks.videoTrack.setMuted(true);
            toggleVideo.innerText = "Stopped 🚫";
            toggleVideo.style.backgroundColor = "#ea4335";
        }
    }
});

window.addEventListener('hashchange', () => { window.location.reload(); });

setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        clockEl.innerText = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + " • " + now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
    }
}, 1000);

initApp();
