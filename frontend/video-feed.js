const streamIdInput = document.getElementById('stream-id');
const roomCodeInput = document.getElementById('room-code');
const videoIframe = document.getElementById('video-iframe');

function updateIframeSrc() {
  const streamId = streamIdInput.value;
  const roomCode = roomCodeInput.value;
  const iframeSrc = `https://vdo.ninja/?v=${streamId}&r=${roomCode}&scn&p=0`;
  videoIframe.src = iframeSrc;
}

// Update the iframe initially with the default values
updateIframeSrc();

// Add event listeners to update the iframe when input values change
streamIdInput.addEventListener('input', updateIframeSrc);
roomCodeInput.addEventListener('input', updateIframeSrc);
