const defaultVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const video = document.getElementById("videoPlayer");
const source = document.getElementById("videoSource");
const loadButton = document.getElementById("loadVideo");
const playButton = document.getElementById("playButton");
const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");
const playbackRate = document.getElementById("playbackRate");
const fullscreen = document.getElementById("fullscreen");
const statusMessage = document.getElementById("statusMessage");
const overlay = document.getElementById("videoOverlay");
const urlInput = document.getElementById("videoUrl");

const formatTime = (seconds) => {
    if (Number.isNaN(seconds) || !Number.isFinite(seconds)) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

const updateStatus = (message) => {
    statusMessage.textContent = message;
};

const loadVideo = (url) => {
    const safeUrl = url?.trim() || defaultVideo;
    source.src = safeUrl;
    video.load();
    updateStatus("视频已载入，等待播放。");
};

const togglePlay = () => {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
};

loadButton.addEventListener("click", () => {
    loadVideo(urlInput.value);
});

video.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(video.duration);
    updateStatus("元数据加载完成，点击播放。");
});

video.addEventListener("timeupdate", () => {
    const percent = (video.currentTime / video.duration) * 100;
    progress.value = Number.isFinite(percent) ? percent : 0;
    currentTime.textContent = formatTime(video.currentTime);
});

video.addEventListener("play", () => {
    playButton.textContent = "暂停";
    updateStatus("正在播放...");
});

video.addEventListener("pause", () => {
    playButton.textContent = "播放";
    updateStatus("已暂停。你可以继续播放或更换视频。");
});

video.addEventListener("ended", () => {
    playButton.textContent = "播放";
    updateStatus("播放结束。可尝试新的片段或重播。");
});

playButton.addEventListener("click", togglePlay);

overlay.addEventListener("click", togglePlay);

progress.addEventListener("input", () => {
    if (!Number.isFinite(video.duration)) {
        return;
    }
    video.currentTime = (progress.value / 100) * video.duration;
});

volume.addEventListener("input", () => {
    video.volume = Number(volume.value);
});

playbackRate.addEventListener("change", () => {
    video.playbackRate = Number(playbackRate.value);
});

fullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        video.requestFullscreen();
        return;
    }
    document.exitFullscreen();
});

video.addEventListener("click", togglePlay);

loadVideo(defaultVideo);
video.volume = Number(volume.value);
