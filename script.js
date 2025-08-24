

let currentSongIndex = 0;
let currentSong = new Audio();
let isShuffle = false;
let isLoop = false;
let playedIndices = [];
let isRepeat = false;
let Songs = [];
const seekbar = document.getElementById("seek-bar");
let currFolder = "";

const play = document.getElementById("play");
const previous = document.getElementById("previous");
const next = document.getElementById("next");

function convertSeconds(seconds) {
  let minutes = Math.floor(seconds / 60);
  let remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function getSongs(folder) {
  Songs = [];
  currFolder = folder;

  let a = await fetch(`${folder}/`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let list = div.getElementsByTagName("a");

  // Load saved library once
  let savedLibrary = JSON.parse(localStorage.getItem("library")) || [];

  for (let i = 0; i < list.length; i++) {
    const element = list[i];
    if (element.href.endsWith(".mp3")) {
      Songs.push(decodeURIComponent(element.href.split(`${folder}/`)[1]));
    }
  }

  let SongDiv = document.querySelector(".lists ul");
  SongDiv.innerHTML = "";

  for (const song of Songs) {
    const songName = song.replace(".mp3", "");
    const isInLibrary = savedLibrary.includes(songName);
    const heartFill = isInLibrary ? "red" : "none";
    const disabledAttr = isInLibrary ? "disabled" : "";

    SongDiv.innerHTML += `
      <li>
        <div class="li-song" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; cursor:pointer;">
            <img src="images/music.svg" alt="">
            <p style="margin-left:10px;">${songName}</p>
          </div>
          <button class="add-to-library" data-song="${songName}" aria-label="Add to Library" title="Add to Library" style="background:none; border:none; cursor:pointer;" ${disabledAttr}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="${heartFill}" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42
                4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5
                3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
                11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
      </li>`;
  }

  // Attach event listeners for "Add to Library" buttons
  document.querySelectorAll(".add-to-library").forEach(button => {
    button.addEventListener("click", function (e) {
      e.stopPropagation(); // prevent li click event
      const songName = this.getAttribute("data-song");
      addToLibrary(songName, this);
    });
  });

  if (Songs.length > 0) {
    currentSongIndex = 0;
    playMusic(Songs[0].replace(".mp3", ""));
  }

  Array.from(SongDiv.querySelectorAll("li")).forEach((e, index) => {
    e.addEventListener("click", () => {
      currentSongIndex = index;
      playMusic(Songs[currentSongIndex].replace(".mp3", ""));
    });
  });

  currentSong.pause();
  currentSong.src = "";
  currentSongIndex = 0;
  play.src = "images/play.svg";
  document.querySelector(".current-song p").innerHTML = "Select a song";
}

const playMusic = (track) => {
  currentSong.pause();
  currentSong = new Audio(`${currFolder}/${track}.mp3`);
  currentSong.play();
  play.src = "images/pause.svg";
  document.querySelector(".current-song p").innerHTML = track;

  currentSong.addEventListener("loadedmetadata", () => {
    document.querySelector(".duration").innerHTML = convertSeconds(currentSong.duration);
  });

  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".current-duration").innerHTML = convertSeconds(currentSong.currentTime);
    const percentage = (currentSong.currentTime / currentSong.duration) * 100;
    seekbar.value = percentage;
    seekbar.style.background = `linear-gradient(to right, #1db954 ${percentage}%, #ccc ${percentage}%)`;
  });

  currentSong.addEventListener("ended", () => {
    if (isRepeat) {
      playMusic(Songs[currentSongIndex].replace(".mp3", ""));
    } else if (isShuffle) {
      if (!playedIndices.includes(currentSongIndex)) {
        playedIndices.push(currentSongIndex);
      }
      if (playedIndices.length === Songs.length) {
        playedIndices = [];
      }
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * Songs.length);
      } while (playedIndices.includes(nextIndex) && playedIndices.length < Songs.length);
      playedIndices.push(nextIndex);
      currentSongIndex = nextIndex;
      playMusic(Songs[currentSongIndex].replace(".mp3", ""));
    } else {
      playNextSong();
    }
  });
};

const playNextSong = () => {
  if (isShuffle) {
    if (playedIndices.length === Songs.length - 1) {
      playedIndices = [];
    }
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * Songs.length);
    } while (nextIndex === currentSongIndex || playedIndices.includes(nextIndex));
    playedIndices.push(nextIndex);
    currentSongIndex = nextIndex;
  } else {
    currentSongIndex++;
    if (currentSongIndex >= Songs.length) {
      if (isLoop) {
        currentSongIndex = 0;
      } else {
        return;
      }
    }
  }
  playMusic(Songs[currentSongIndex].replace(".mp3", ""));
};

const playPreviousSong = () => {
  currentSongIndex = (currentSongIndex - 1 + Songs.length) % Songs.length;
  playMusic(Songs[currentSongIndex].replace(".mp3", ""));
};

const togglePlayPause = () => {
  if (!currentSong.src || currentSong.paused) {
    if (!currentSong.src) {
      currentSongIndex = 0;
      playMusic(Songs[currentSongIndex].replace(".mp3", ""));
    } else {
      currentSong.play();
      play.src = "images/pause.svg";
    }
  } else {
    currentSong.pause();
    play.src = "images/play.svg";
  }
};

const initializeKeyboardShortcuts = () => {
  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "Space":
        e.preventDefault();
        togglePlayPause();
        break;
      case "ArrowRight":
        playNextSong();
        break;
      case "ArrowLeft":
        playPreviousSong();
        break;
      case "ArrowUp":
        currentSong.volume = Math.min(currentSong.volume + 0.1, 1);
        document.querySelector("#volume").value = currentSong.volume * 100;
        break;
      case "ArrowDown":
        currentSong.volume = Math.max(currentSong.volume - 0.1, 0);
        document.querySelector("#volume").value = currentSong.volume * 100;
        break;
      case "KeyM":
        const volumeIcon = document.querySelector(".volume>img");
        const volumeSlider = document.querySelector("#volume");
        if (currentSong.volume > 0) {
          currentSong.volume = 0;
          volumeSlider.value = 0;
          volumeIcon.src = "images/mute.svg";
        } else {
          currentSong.volume = 0.1;
          volumeSlider.value = 10;
          volumeIcon.src = "images/volume.svg";
        }
        break;
      case "KeyS":
        isShuffle = !isShuffle;
        document.getElementById("shuffle").classList.toggle("active");
        playedIndices = [];
        break;
      case "KeyL":
        isRepeat = !isRepeat;
        document.getElementById("loop").classList.toggle("active");
        break;
    }
  });
};

async function main() {
  await getSongs("musics/PartySongs");

  play.addEventListener("click", () => togglePlayPause());
  previous.addEventListener("click", () => playPreviousSong());
  next.addEventListener("click", () => playNextSong());

  seekbar.addEventListener("input", () => {
    const seekTo = (seekbar.value / 100) * currentSong.duration;
    currentSong.currentTime = seekTo;
  });
}

document.querySelector("#volume").addEventListener("change", (e) => {
  currentSong.volume = parseInt(e.target.value) / 100;

  if (currentSong.volume > 0) {
    document.querySelector(".volume img").src = "images/volume.svg";
  }
});

// Mute/unmute
document.querySelector(".volume img").addEventListener("click", (e) => {

  const volumeInput = document.querySelector("#volume");
  if (e.target.src.includes("volume.svg")) {
    e.target.src = "images/mute.svg";
    currentSong.volume = 0;
    volumeInput.value = 0;
  } else {
    e.target.src = "images/volume.svg";
    currentSong.volume = 0.1;
    volumeInput.value = 10;
  }
});

function bindPlaylistCards() {
  Array.from(document.getElementsByClassName("card")).forEach((e) => {
    e.replaceWith(e.cloneNode(true));
  });
  Array.from(document.getElementsByClassName("card")).forEach((e) => {
    e.addEventListener("click", async (item) => {
      await getSongs(`musics/${item.currentTarget.dataset.folder}`);
      if (Songs.length > 0) {
        currentSongIndex = 0;
        playMusic(Songs[0].replace(".mp3", ""));
      }
    });
  });
}

function filterSongs(query) {
  query = query.toLowerCase();
  let filtered = Songs.filter(song => song.toLowerCase().includes(query));
  let SongDiv = document.querySelector(".lists ul");
  SongDiv.innerHTML = "";
  for (const song of filtered) {
    SongDiv.innerHTML += `
      <li>
        <div class="li-song">
          <img src="images/music.svg" alt="">
          <p>${song.replace(".mp3", "")}</p>
        </div>
      </li>`;
  }
  Array.from(document.querySelectorAll(".lists li")).forEach((e, index) => {
    e.addEventListener("click", () => {
      let realIndex = Songs.findIndex(s => s === filtered[index]);
      if (realIndex !== -1) {
        currentSongIndex = realIndex;
        playMusic(Songs[currentSongIndex].replace(".mp3", ""));
      }
    });
  });
}



document.addEventListener("DOMContentLoaded", () => main());

document.getElementById("shuffle").addEventListener("click", () => {
  isShuffle = !isShuffle;
  document.getElementById("shuffle").classList.toggle("active");
  playedIndices = [];
});

document.getElementById("loop").addEventListener("click", () => {
  isLoop = !isLoop;
  document.getElementById("loop").classList.toggle("active");
});

initializeKeyboardShortcuts();


// ===== LIBRARY FEATURE =====

// Add song to localStorage and update heart color
function addToLibrary(songName, button) {
  let savedLibrary = JSON.parse(localStorage.getItem("library")) || [];

  if (!savedLibrary.includes(songName)) {
    savedLibrary.push(songName);
    localStorage.setItem("library", JSON.stringify(savedLibrary));
  }
  // Make heart red and disable button to prevent duplicate adding
  button.querySelector("svg path").setAttribute("fill", "red");
  button.disabled = true;
}

// Attach event listeners to all Add buttons and initialize hearts
document.addEventListener("DOMContentLoaded", () => {
  let savedLibrary = JSON.parse(localStorage.getItem("library")) || [];

  document.querySelectorAll(".add-to-library").forEach(button => {
    const songName = button.getAttribute("data-song");

    // If song already in library, make heart red and disable button
    if (savedLibrary.includes(songName)) {
      button.querySelector("svg path").setAttribute("fill", "red");
      button.disabled = true;
    }

    button.addEventListener("click", function (e) {
      e.stopPropagation(); // prevent event bubbling if needed
      addToLibrary(songName, this);
    });
  });
});

// // Card click to switch playlist
// Array.from(document.getElementsByClassName("card")).forEach((e) => {
//   e.addEventListener("click", async (item) => {
//     await getSongs(`musics/${item.currentTarget.dataset.folder}`);
//   });
// });



// const loginBtn = document.getElementById("login-btn");
// const authSection = document.getElementById("auth-section");
// const backdrop = document.getElementById("auth-backdrop");
// const closeBtn = document.getElementById("close-auth");

// loginBtn.addEventListener("click", () => {
//   authSection.classList.add("show");
//   authSection.classList.remove("hidden");
//   backdrop.classList.add("show");
// });

// backdrop.addEventListener("click", closeModal);
// closeBtn.addEventListener("click", closeModal);

// function closeModal() {
//   authSection.classList.remove("show");
//   authSection.classList.add("hidden");
//   backdrop.classList.remove("show");
// }

// document.getElementById("show-login").addEventListener("click", () => {
//   document.getElementById("login-form").classList.remove("hidden");
//   document.getElementById("signup-form").classList.add("hidden");
//   document.getElementById("show-login").classList.add("active");
//   document.getElementById("show-signup").classList.remove("active");
// });

// document.getElementById("show-signup").addEventListener("click", () => {
//   document.getElementById("signup-form").classList.remove("hidden");
//   document.getElementById("login-form").classList.add("hidden");
//   document.getElementById("show-signup").classList.add("active");
//   document.getElementById("show-login").classList.remove("active");
// });




// function updatePlaybackStatus() {
//   const status = [];
//   if (isShuffle) status.push("🔀 Shuffle ON");
//   if (isRepeat) status.push("🔁 Loop ON");
//   document.getElementById("status").textContent = status.join(" | ") || "▶ Normal Play";
// }

// document.getElementById("shuffle").addEventListener("click", () => {
//   isShuffle = !isShuffle;
//   document.getElementById("shuffle").classList.toggle("active");
//   updatePlaybackStatus();
// });

// document.getElementById("loop").addEventListener("click", () => {
//   isRepeat = !isRepeat;
//   document.getElementById("loop").classList.toggle("active");
//   updatePlaybackStatus();
// });
