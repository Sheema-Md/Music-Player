/* =============== STATE =============== */
let currentSongIndex = 0;
let currentSong = new Audio();
let isShuffle = false;
let isRepeat = false;          // single-track repeat
let isLoop = false;            // playlist loop
let playedIndices = [];
let Songs = [];
let currFolder = "";

/* =============== DOM =============== */
const seekbar = document.getElementById("seek-bar");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("previous");
const nextBtn = document.getElementById("next");
const volumeImg = document.querySelector(".volume img");
const volumeInp = document.getElementById("volume");
const visualizer = document.getElementById("visualizer");

const currentSongName = document.querySelector(".current-song p");
const currentSongImg = document.querySelector(".current-song img");

const libraryListEl = document.getElementById("libraryList");
const recentlyListEl = document.getElementById("recentlyPlayedList");

/* =============== HELPERS =============== */
function convertSeconds(seconds) {
  if (!isFinite(seconds)) return "00:00";
  let minutes = Math.floor(seconds / 60);
  let remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function ensureSongsContainer() {
  let container = document.getElementById("songs-container");
  if (!container) {
    const mc = document.getElementById("main-content");
    const div = document.createElement("div");
    div.id = "songs-container";
    mc.appendChild(div);
    container = div;
  }
  if (!container.querySelector("ul")) {
    container.innerHTML = `<ul class="song-list"></ul>`;
  }
  return container.querySelector("ul.song-list");
}

// Library storage: always [{name, folder}]
const getLibrary = () => JSON.parse(localStorage.getItem("library") || "[]");
const saveLibrary = (data) => localStorage.setItem("library", JSON.stringify(data));

function setVisualizer(paused) {
  if (!visualizer) return;
  visualizer.classList.toggle("paused", !!paused);
  visualizer.style.opacity = paused ? "0" : "1";
}

function setAlbumArt(folder, trackName) {
  if (!currentSongImg) return;
  const candidateJpg = `${folder}/${trackName}.jpg`;
  const candidatePng = `${folder}/${trackName}.png`;
  const testImg = new Image();
  testImg.onload = () => currentSongImg.src = testImg.src;
  testImg.onerror = () => {
    const pngImg = new Image();
    pngImg.onload = () => currentSongImg.src = pngImg.src;
    pngImg.onerror = () => currentSongImg.src = "images/music.svg";
    pngImg.src = candidatePng;
  };
  testImg.src = candidateJpg;
}

function updateRecentlyPlayedUI(entry) {
  recentlyListEl.innerHTML = `
    <li>
      <div class="li-song" style="display:flex; align-items:center;">
        <img src="images/music.svg" alt="Music Icon" />
        <p style="margin-left:10px;">${entry.name}</p>
      </div>
    </li>`;
  localStorage.setItem("recent", JSON.stringify(entry));
}

function hydrateRecentlyPlayedFromStorage() {
  const recent = localStorage.getItem("recent");
  if (recent) {
    try { updateRecentlyPlayedUI(JSON.parse(recent)); } catch { }
  } else {
    recentlyListEl.innerHTML = "";
  }
}

/* =============== SONGS / PLAYLIST =============== */
async function getSongs(folder) {
  Songs = [];
  currFolder = folder;

  const res = await fetch(`${folder}/`);
  const html = await res.text();
  const div = document.createElement("div");
  div.innerHTML = html;
  const as = div.getElementsByTagName("a");
  for (let i = 0; i < as.length; i++) {
    if (as[i].href.endsWith(".mp3")) {
      Songs.push(decodeURIComponent(as[i].href.split(`${folder}/`)[1]));
    }
  }

  const ul = ensureSongsContainer();
  ul.innerHTML = "";
  const lib = getLibrary();

  for (const song of Songs) {
    const songName = song.replace(".mp3", "");
    const isInLib = lib.some(x => x.name === songName && x.folder === folder);
    const activeClass = isInLib ? "active" : "";

    const li = document.createElement("li");
    li.style.background = getRandomGradient();

    const img = new Image();
    img.classList.add("album-art");
    const jpg = `images/${songName}.jpg`;
    const png = `images/${songName}.png`;
    img.src = jpg;
    img.onerror = () => {
      img.src = png;
      img.onerror = () => { img.src = "images/music.svg"; };
    };

    li.innerHTML = `
      <div class="li-song" style="display:flex; align-items:center; cursor:pointer;">
        ${img.outerHTML}
        <p style="margin-left:10px;">${songName}</p>
      </div>
      <button class="add-to-library ${activeClass}" data-song="${songName}" data-folder="${folder}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
          2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81
          14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
          11.54L12 21.35z"/>
        </svg>
      </button>
    `;
    ul.appendChild(li);

    li.querySelector(".li-song").addEventListener("click", () => {
      currentSongIndex = Songs.findIndex(s => s === song);
      playMusic(songName);
    });

    li.querySelector(".add-to-library").addEventListener("click", (e) => {
      e.stopPropagation();
      addToLibrary(songName, folder, e.currentTarget);
    });
  }

  currentSong.pause();
  playBtn.src = "images/play.svg";
  currentSongName.textContent = "Select a song";
  setVisualizer(true);
}

/* =============== PLAYER =============== */
function playMusic(trackName) {
  if (!Songs.length) { currentSong.pause(); return; }

  currentSong.pause();
  currentSong = new Audio(`${currFolder}/${trackName}.mp3`);
  currentSong.play();

  playBtn.src = "images/pause.svg";
  currentSongName.textContent = trackName;
  setAlbumArt(currFolder, trackName);
  setVisualizer(false);

  updateRecentlyPlayedUI({ name: trackName, folder: currFolder });

  currentSong.onloadedmetadata = () => {
    document.querySelector(".duration").textContent = convertSeconds(currentSong.duration);
  };

  currentSong.ontimeupdate = () => {
    document.querySelector(".current-duration").textContent = convertSeconds(currentSong.currentTime);
    const pct = (currentSong.currentTime / (currentSong.duration || 1)) * 100;
    seekbar.value = pct;
    seekbar.style.background = `linear-gradient(to right, #1db954 ${pct}%, #ccc ${pct}%)`;
  };

  currentSong.onended = () => {
    if (isRepeat) {
      playMusic(trackName);
    } else {
      playNextSong();
    }
  };
}

function playNextSong() {
  if (!Songs.length) return;

  if (isShuffle) {
    if (playedIndices.length >= Songs.length - 1) playedIndices = [];
    let nextIndex;
    do { nextIndex = Math.floor(Math.random() * Songs.length); }
    while (nextIndex === currentSongIndex || playedIndices.includes(nextIndex));
    playedIndices.push(nextIndex);
    currentSongIndex = nextIndex;
  } else {
    currentSongIndex++;
    if (currentSongIndex >= Songs.length) {
      if (isLoop) currentSongIndex = 0; else return;
    }
  }
  const nextName = Songs[currentSongIndex].replace(".mp3", "");
  playMusic(nextName);
}

function playPreviousSong() {
  if (!Songs.length) return;
  currentSongIndex = (currentSongIndex - 1 + Songs.length) % Songs.length;
  playMusic(Songs[currentSongIndex].replace(".mp3", ""));
}

function togglePlayPause() {
  if (!currentSong.src) return;
  if (currentSong.paused) {
    currentSong.play();
    playBtn.src = "images/pause.svg";
    setVisualizer(false);
  } else {
    currentSong.pause();
    playBtn.src = "images/play.svg";
    setVisualizer(true);
  }
}

/* =============== STYLING HELPERS =============== */
function getRandomGradient() {
  const gradients = [
    "linear-gradient(135deg, #ff9a9e, #fad0c4)",
    "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    "linear-gradient(135deg, #f6d365, #fda085)",
    "linear-gradient(135deg, #84fab0, #8fd3f4)",
    "linear-gradient(135deg, #fccb90, #d57eeb)",
    "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
    "linear-gradient(135deg, #ffecd2, #fcb69f)"
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

/* =============== LIBRARY =============== */
function updateLibraryUI() {
  const lib = getLibrary();
  if (!lib.length) {
    libraryListEl.innerHTML = "<li style='color:gray;'>No saved songs</li>";
    return;
  }
  libraryListEl.innerHTML = "";

  lib.forEach(entry => {
    const li = document.createElement("li");
    li.style.background = getRandomGradient();

    const img = new Image();
    img.classList.add("album-art");
    const jpg = `images/${entry.name}.jpg`;
    const png = `images/${entry.name}.png`;
    img.src = jpg;
    img.onerror = () => {
      img.src = png;
      img.onerror = () => { img.src = "images/music.svg"; };
    };

    li.innerHTML = `
      <div class="li-song" style="display:flex; align-items:center; cursor:pointer;">
        ${img.outerHTML}
        <p style="margin-left:10px;">${entry.name}</p>
      </div>`;

    li.addEventListener("click", async () => {
      await getSongs(entry.folder);
      const idx = Songs.findIndex(s => s.replace(".mp3", "") === entry.name);
      if (idx !== -1) {
        currentSongIndex = idx;
        playMusic(entry.name);
      }
    });
    libraryListEl.appendChild(li);
  });
}

function addToLibrary(name, folder, buttonEl) {
  let lib = getLibrary();
  const exists = lib.some(x => x.name === name && x.folder === folder);

  if (!exists) {
    lib.push({ name, folder });
    saveLibrary(lib);
    updateLibraryUI();
    if (buttonEl) buttonEl.classList.add("active");
  } else {
    lib = lib.filter(x => !(x.name === name && x.folder === folder));
    saveLibrary(lib);
    updateLibraryUI();
    if (buttonEl) buttonEl.classList.remove("active");
  }
}

/* =============== SEARCH =============== */
function filterSongs(query) {
  const q = (query || "").toLowerCase();
  const ul = ensureSongsContainer();
  ul.innerHTML = "";

  const lib = getLibrary();
  const filtered = !q ? Songs : Songs.filter(s => s.toLowerCase().includes(q));
  filtered.forEach(song => {
    const songName = song.replace(".mp3", "");
    const isInLib = lib.some(x => x.name === songName && x.folder === currFolder);
    const heartFill = isInLib ? "red" : "none";

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="li-song" style="display:flex; justify-content:space-between; align-items:center;">
        <div class="song-click" style="display:flex; align-items:center; cursor:pointer;">
          <img src="images/music.svg" alt="">
          <p style="margin-left:10px;">${songName}</p>
        </div>
        <button class="add-to-library" data-song="${songName}" data-folder="${currFolder}"
                style="background:none; border:none; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="${heartFill}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
            2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81
            14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
            11.54L12 21.35z"/>
          </svg>
        </button>
      </div>`;
    ul.appendChild(li);

    li.querySelector(".song-click").addEventListener("click", () => {
      const realIndex = Songs.findIndex(s => s === song);
      if (realIndex !== -1) {
        currentSongIndex = realIndex;
        playMusic(songName);
      }
    });

    li.querySelector(".add-to-library").addEventListener("click", (e) => {
      e.stopPropagation();
      addToLibrary(songName, currFolder, e.currentTarget);
    });
  });
}
window.filterSongs = filterSongs;

/* =============== PLAYLIST CARDS (HOME) =============== */
function bindPlaylistCards() {
  document.querySelectorAll(".card").forEach(card => card.replaceWith(card.cloneNode(true)));
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", async () => {
      const folder = card.dataset.folder;
      if (!folder) return;
      await getSongs(`musics/${folder}`);
    });
  });
}
window.bindPlaylistCards = bindPlaylistCards;

/* =============== INIT CONTROLS =============== */
function initControls() {
  playBtn.addEventListener("click", togglePlayPause);
  prevBtn.addEventListener("click", playPreviousSong);
  nextBtn.addEventListener("click", playNextSong);

  seekbar.addEventListener("input", () => {
    if (!currentSong.duration) return;
    const seekTo = (seekbar.value / 100) * currentSong.duration;
    currentSong.currentTime = seekTo;
  });

  document.getElementById("shuffle").addEventListener("click", () => {
    isShuffle = !isShuffle;
    document.getElementById("shuffle").classList.toggle("active");
    playedIndices = [];
  });

  document.getElementById("loop").addEventListener("click", () => {
    isRepeat = !isRepeat;
    document.getElementById("loop").classList.toggle("active");
  });

  volumeInp.addEventListener("change", e => {
    currentSong.volume = parseInt(e.target.value, 10) / 100;
    volumeImg.src = currentSong.volume > 0 ? "images/volume.svg" : "images/mute.svg";
  });

  volumeImg.addEventListener("click", () => {
    if (currentSong.volume > 0) {
      currentSong.volume = 0;
      volumeInp.value = 0;
      volumeImg.src = "images/mute.svg";
    } else {
      currentSong.volume = 0.1;
      volumeInp.value = 10;
      volumeImg.src = "images/volume.svg";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    switch (e.code) {
      case "Space": e.preventDefault(); togglePlayPause(); break;
      case "ArrowRight": e.preventDefault(); playNextSong(); break;
      case "ArrowLeft": e.preventDefault(); playPreviousSong(); break;
      case "ArrowUp": e.preventDefault(); currentSong.volume = Math.min(currentSong.volume + 0.1, 1); volumeInp.value = currentSong.volume * 100; break;
      case "ArrowDown": e.preventDefault(); currentSong.volume = Math.max(currentSong.volume - 0.1, 0); volumeInp.value = currentSong.volume * 100; break;
      case "KeyS": isShuffle = !isShuffle; document.getElementById("shuffle").classList.toggle("active"); playedIndices = []; break;
      case "KeyL": isRepeat = !isRepeat; document.getElementById("loop").classList.toggle("active"); break;
    }
  });
}

/* =============== BOOT ============= */
document.addEventListener("DOMContentLoaded", () => {
  initControls();
  updateLibraryUI();
  hydrateRecentlyPlayedFromStorage();
  ensureSongsContainer();
});
