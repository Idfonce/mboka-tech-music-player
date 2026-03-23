// ===========================================
// MBOKA-TECH MUSIC PLAYER - APK COMPATIBLE
// ===========================================

// Global Variables
let playlist = [];
let currentIndex = -1;
let isPlaying = false;
let isRepeat = false;
let isShuffle = false;
let currentLyrics = "";
let favourites = [];
let playlists = [];
let userProfile = {
    name: "Music Lover",
    picture: null
};

// DOM Elements
const audio = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const currentSongTitle = document.getElementById('currentSongTitle');
const currentSongArtist = document.getElementById('currentSongArtist');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const progressFill = document.getElementById('progressFill');
const progressBar = document.getElementById('progressBar');
const volumeControl = document.getElementById('volumeControl');
const nowPlayingCard = document.getElementById('nowPlayingCard');
const playingAnimation = document.getElementById('playingAnimation');
const lyricsContent = document.getElementById('lyricsContent');
const toast = document.getElementById('toast');

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data
    loadSavedData();
    
    // Setup audio events
    setupAudioEvents();
    
    // Setup file inputs
    setupFileInputs();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Setup page navigation
    setupPageNavigation();
    
    // Setup volume
    audio.volume = 0.7;
    volumeControl.value = 0.7;
    volumeControl.addEventListener('input', (e) => audio.volume = e.target.value);
    
    // Progress bar click
    progressBar.addEventListener('click', seek);
    
    // Load profile picture
    loadProfilePicture();
    
    // Update UI
    updateProfileUI();
    
    showToast('Welcome! Add songs to start listening');
});

// ===========================================
// PERMISSION HANDLING
// ===========================================
document.getElementById('requestPermissionBtn').addEventListener('click', function() {
    document.getElementById('permissionScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('fileInput').click();
});

document.getElementById('demoModeBtn').addEventListener('click', function() {
    document.getElementById('permissionScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    addDemoSongs();
    showToast('Demo mode activated. Add your own songs for full functionality');
});

// ===========================================
// DEMO SONGS
// ===========================================
function addDemoSongs() {
    const demoSongs = [
        { name: 'Demo Song 1 - Chill Vibes', artist: 'MBOKA-TECH', duration: 180 },
        { name: 'Demo Song 2 - Relaxing', artist: 'MBOKA-TECH', duration: 210 },
        { name: 'Demo Song 3 - Upbeat', artist: 'MBOKA-TECH', duration: 195 }
    ];
    
    demoSongs.forEach((song, index) => {
        // Create a simple beep sound for demo
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = song.duration;
        const sampleRate = 44100;
        const frameCount = duration * sampleRate;
        const audioBuffer = audioContext.createBuffer(2, frameCount, sampleRate);
        
        // Create a simple sine wave for demo
        for (let channel = 0; channel < 2; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                // Simple beep every second for demo
                const t = i / sampleRate;
                channelData[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 2) * 0.3;
            }
        }
        
        const wavBlob = audioBufferToWav(audioBuffer);
        const url = URL.createObjectURL(wavBlob);
        
        const newSong = {
            id: Date.now() + index,
            name: song.name,
            artist: song.artist,
            url: url,
            duration: song.duration,
            added: new Date().toISOString(),
            lyrics: `Demo lyrics for ${song.name}\n\nThis is a demo song.\n\nAdd your own music files to play real audio.\n\nClick "Add Songs" to import your MP3 files.`
        };
        
        playlist.push(newSong);
    });
    
    savePlaylist();
    renderPlaylist();
    if (playlist.length > 0) playSong(0);
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const samples = [];
    for (let channel = 0; channel < numChannels; channel++) {
        samples.push(buffer.getChannelData(channel));
    }
    
    const dataLength = samples[0].length * bytesPerSample * numChannels;
    const headerLength = 44;
    const wavBytes = new DataView(new ArrayBuffer(headerLength + dataLength));
    
    writeString(wavBytes, 0, 'RIFF');
    wavBytes.setUint32(4, 36 + dataLength, true);
    writeString(wavBytes, 8, 'WAVE');
    writeString(wavBytes, 12, 'fmt ');
    wavBytes.setUint32(16, 16, true);
    wavBytes.setUint16(20, format, true);
    wavBytes.setUint16(22, numChannels, true);
    wavBytes.setUint32(24, sampleRate, true);
    wavBytes.setUint32(28, sampleRate * blockAlign, true);
    wavBytes.setUint16(32, blockAlign, true);
    wavBytes.setUint16(34, bitDepth, true);
    writeString(wavBytes, 36, 'data');
    wavBytes.setUint32(40, dataLength, true);
    
    let offset = 44;
    for (let i = 0; i < samples[0].length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, samples[channel][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            wavBytes.setInt16(offset, intSample, true);
            offset += 2;
        }
    }
    
    return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// ===========================================
// FILE HANDLING
// ===========================================
function setupFileInputs() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);
    
    document.getElementById('addSongsBtn').addEventListener('click', () => fileInput.click());
    document.getElementById('addSongsEmptyBtn').addEventListener('click', () => fileInput.click());
    document.getElementById('lyricsFileInput').addEventListener('change', handleLyricsImport);
    document.getElementById('profilePicInput').addEventListener('change', handleProfilePictureUpload);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (!file.type.startsWith('audio/')) {
            showToast(`❌ ${file.name} is not an audio file`);
            return;
        }
        
        const url = URL.createObjectURL(file);
        const tempAudio = new Audio(url);
        
        tempAudio.addEventListener('loadedmetadata', () => {
            const song = {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                artist: extractArtist(file.name),
                url: url,
                duration: tempAudio.duration,
                size: file.size,
                added: new Date().toISOString(),
                lyrics: ""
            };
            
            playlist.push(song);
            savePlaylist();
            renderPlaylist();
            
            showToast(`✅ Added: ${song.name}`);
            
            if (playlist.length === 1) {
                playSong(0);
            }
        });
        
        tempAudio.addEventListener('error', () => {
            showToast(`❌ Error loading: ${file.name}`);
        });
    });
}

function extractArtist(filename) {
    const name = filename.replace(/\.[^/.]+$/, "");
    if (name.includes(' - ')) {
        return name.split(' - ')[0];
    }
    return 'Unknown Artist';
}

// ===========================================
// PLAYLIST FUNCTIONS
// ===========================================
function renderPlaylist() {
    const songsList = document.getElementById('songsList');
    
    if (playlist.length === 0) {
        songsList.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-headphones"></i>
                <h3>No Songs Added</h3>
                <p>Click "Add Songs" to add music from your device</p>
                <button class="add-btn" id="addSongsEmptyBtn"><i class="fas fa-plus-circle"></i> Add Songs</button>
            </div>
        `;
        const btn = document.getElementById('addSongsEmptyBtn');
        if (btn) btn.addEventListener('click', () => document.getElementById('fileInput').click());
        return;
    }
    
    let html = '';
    playlist.forEach((song, index) => {
        const isActive = index === currentIndex;
        html += `
            <div class="song-item ${isActive ? 'active' : ''}" onclick="playSong(${index})">
                <div class="song-number">${(index + 1).toString().padStart(2, '0')}</div>
                <div class="song-info">
                    <div class="song-name">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions">
                    <button onclick="event.stopPropagation(); toggleFavourite(${index})" title="Add to favourites">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="event.stopPropagation(); removeSong(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    songsList.innerHTML = html;
}

function playSong(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[currentIndex];
    
    audio.src = song.url;
    audio.load();
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            updatePlayButton();
            currentSongTitle.textContent = song.name;
            currentSongArtist.textContent = song.artist;
            nowPlayingCard.style.display = 'block';
            playingAnimation.style.display = 'flex';
            renderPlaylist();
            
            if (song.lyrics) {
                displayLyrics(song.lyrics);
                document.getElementById('lyricsCard').style.display = 'block';
            } else {
                lyricsContent.innerHTML = '<p>No lyrics added. Click "Import" to add lyrics for this song.</p>';
                document.getElementById('lyricsCard').style.display = 'block';
            }
        }).catch(error => {
            console.log('Playback failed:', error);
            showToast('Tap play button to start playback');
            isPlaying = false;
            updatePlayButton();
        });
    }
}

function playPause() {
    if (playlist.length === 0) {
        showToast('No songs added. Add songs first');
        return;
    }
    
    if (currentIndex === -1) {
        playSong(0);
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playingAnimation.style.display = 'none';
    } else {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                playingAnimation.style.display = 'flex';
            }).catch(error => {
                console.log('Playback failed:', error);
                showToast('Tap play button again');
            });
        }
    }
    
    updatePlayButton();
}

function nextSong() {
    if (playlist.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
        do {
            nextIndex = Math.floor(Math.random() * playlist.length);
        } while (nextIndex === currentIndex && playlist.length > 1);
    } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= playlist.length) {
            if (isRepeat) {
                nextIndex = 0;
            } else {
                showToast('End of playlist');
                return;
            }
        }
    }
    
    playSong(nextIndex);
}

function previousSong() {
    if (playlist.length === 0) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        if (isRepeat) {
            prevIndex = playlist.length - 1;
        } else {
            showToast('Beginning of playlist');
            return;
        }
    }
    
    playSong(prevIndex);
}

function removeSong(index) {
    if (confirm(`Remove "${playlist[index].name}" from playlist?`)) {
        URL.revokeObjectURL(playlist[index].url);
        playlist.splice(index, 1);
        savePlaylist();
        
        if (currentIndex === index) {
            audio.pause();
            if (playlist.length > 0) {
                if (index < playlist.length) {
                    playSong(index);
                } else {
                    playSong(playlist.length - 1);
                }
            } else {
                currentIndex = -1;
                isPlaying = false;
                nowPlayingCard.style.display = 'none';
                playingAnimation.style.display = 'none';
                currentSongTitle.textContent = 'Select a song to play';
                currentSongArtist.textContent = 'Unknown Artist';
                document.getElementById('lyricsCard').style.display = 'none';
            }
        } else if (currentIndex > index) {
            currentIndex--;
        }
        
        renderPlaylist();
        showToast(`✅ Removed`);
    }
}

function clearPlaylist() {
    if (confirm('Clear all songs from playlist?')) {
        playlist.forEach(song => URL.revokeObjectURL(song.url));
        playlist = [];
        currentIndex = -1;
        isPlaying = false;
        savePlaylist();
        renderPlaylist();
        audio.pause();
        nowPlayingCard.style.display = 'none';
        playingAnimation.style.display = 'none';
        currentSongTitle.textContent = 'Select a song to play';
        currentSongArtist.textContent = 'Unknown Artist';
        document.getElementById('lyricsCard').style.display = 'none';
        showToast('✅ All songs cleared');
    }
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    if (isRepeat) {
        repeatBtn.style.background = '#ff6b6b';
        repeatBtn.style.color = 'white';
        showToast('Repeat: ON');
    } else {
        repeatBtn.style.background = '#f0f0f0';
        repeatBtn.style.color = '#333';
        showToast('Repeat: OFF');
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (isShuffle) {
        shuffleBtn.style.background = '#ff6b6b';
        shuffleBtn.style.color = 'white';
        showToast('Shuffle: ON');
    } else {
        shuffleBtn.style.background = '#f0f0f0';
        shuffleBtn.style.color = '#333';
        showToast('Shuffle: OFF');
    }
}

// ===========================================
// AUDIO EVENTS
// ===========================================
function setupAudioEvents() {
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
        if (isRepeat) {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextSong();
        }
    });
    audio.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('error', (e) => {
        console.log('Audio error:', e);
        showToast('Error playing audio. Try re-adding the file.');
    });
}

function updateProgress() {
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    progressFill.style.width = `${progress}%`;
    currentTimeSpan.textContent = formatTime(audio.currentTime);
}

function seek(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

function updatePlayButton() {
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// ===========================================
// LYRICS FUNCTIONS
// ===========================================
function importLyrics() {
    if (currentIndex === -1) {
        showToast('Please select a song first');
        return;
    }
    document.getElementById('lyricsFileInput').click();
}

function handleLyricsImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const lyrics = e.target.result;
        if (currentIndex !== -1) {
            playlist[currentIndex].lyrics = lyrics;
            savePlaylist();
            displayLyrics(lyrics);
            showToast('✅ Lyrics imported successfully');
        }
    };
    reader.readAsText(file);
}

function displayLyrics(lyrics) {
    lyricsContent.innerHTML = lyrics.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

function closeLyrics() {
    document.getElementById('lyricsCard').style.display = 'none';
}

// ===========================================
// FAVOURITES FUNCTIONS
// ===========================================
function toggleFavourite(songIndex) {
    const song = playlist[songIndex];
    const existingIndex = favourites.findIndex(f => f.id === song.id);
    
    if (existingIndex === -1) {
        favourites.push(song);
        showToast(`❤️ Added to favourites: ${song.name}`);
    } else {
        favourites.splice(existingIndex, 1);
        showToast(`💔 Removed from favourites: ${song.name}`);
    }
    
    saveFavourites();
    renderFavourites();
}

function renderFavourites() {
    const favouritesList = document.getElementById('favouritesList');
    
    if (!favouritesList) return;
    
    if (favourites.length === 0) {
        favouritesList.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-heart"></i>
                <h3>No Favourite Songs</h3>
                <p>Click the heart icon on any song to add to favourites</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    favourites.forEach((song, index) => {
        const originalIndex = playlist.findIndex(s => s.id === song.id);
        html += `
            <div class="song-item" onclick="playSong(${originalIndex !== -1 ? originalIndex : 0})">
                <div class="song-number">${(index + 1).toString().padStart(2, '0')}</div>
                <div class="song-info">
                    <div class="song-name">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions">
                    <button onclick="event.stopPropagation(); removeFavourite(${song.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    favouritesList.innerHTML = html;
}

function removeFavourite(songId) {
    const index = favourites.findIndex(f => f.id === songId);
    if (index !== -1) {
        favourites.splice(index, 1);
        saveFavourites();
        renderFavourites();
        showToast('💔 Removed from favourites');
    }
}

// ===========================================
// PLAYLISTS FUNCTIONS
// ===========================================
function createPlaylist() {
    const name = prompt('Enter playlist name:');
    if (!name) return;
    
    playlists.push({
        id: Date.now(),
        name: name,
        songs: [],
        created: new Date().toISOString()
    });
    
    savePlaylists();
    renderPlaylists();
    showToast(`✅ Playlist "${name}" created`);
}

function renderPlaylists() {
    const playlistsGrid = document.getElementById('playlistsGrid');
    
    if (!playlistsGrid) return;
    
    if (playlists.length === 0) {
        playlistsGrid.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-list"></i>
                <h3>No Playlists</h3>
                <p>Click "Create New Playlist" to get started</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    playlists.forEach((playlist, index) => {
        html += `
            <div class="playlist-card" onclick="viewPlaylist(${index})">
                <div class="playlist-icon">
                    <i class="fas fa-list"></i>
                </div>
                <div class="playlist-info">
                    <div class="playlist-name">${escapeHtml(playlist.name)}</div>
                    <div class="playlist-count">${playlist.songs.length} songs</div>
                </div>
            </div>
        `;
    });
    
    playlistsGrid.innerHTML = html;
}

function viewPlaylist(index) {
    const playlistSongs = playlists[index].songs;
    if (playlistSongs.length === 0) {
        showToast('This playlist is empty');
        return;
    }
    // Show playlist songs in home page
    showPage('home');
    displayPlaylistSongs(playlistSongs);
}

function displayPlaylistSongs(songs) {
    const songsList = document.getElementById('songsList');
    let html = '';
    songs.forEach((song, index) => {
        const originalIndex = playlist.findIndex(s => s.id === song.id);
        html += `
            <div class="song-item" onclick="playSong(${originalIndex !== -1 ? originalIndex : 0})">
                <div class="song-number">${(index + 1).toString().padStart(2, '0')}</div>
                <div class="song-info">
                    <div class="song-name">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
            </div>
        `;
    });
    songsList.innerHTML = html;
}

// ===========================================
// PROFILE FUNCTIONS
// ===========================================
function uploadProfilePicture() {
    document.getElementById('profilePicInput').click();
}

function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        userProfile.picture = e.target.result;
        localStorage.setItem('mboka_profile', JSON.stringify(userProfile));
        updateProfileUI();
        showToast('✅ Profile picture updated');
    };
    reader.readAsDataURL(file);
}

function loadProfilePicture() {
    const saved = localStorage.getItem('mboka_profile');
    if (saved) {
        userProfile = JSON.parse(saved);
    }
}

function updateProfileUI() {
    if (userProfile.picture) {
        // Update sidebar avatar
        document.getElementById('sidebarAvatar').innerHTML = `<img src="${userProfile.picture}" style="width:100%;height:100%;object-fit:cover;">`;
        // Update dropdown profile pic
        document.getElementById('dropdown-profile-pic').innerHTML = `<img src="${userProfile.picture}" style="width:100%;height:100%;object-fit:cover;">`;
        // Update profile icon in header
        document.getElementById('profile-icon').innerHTML = `<img src="${userProfile.picture}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        document.getElementById('sidebarAvatar').innerHTML = '<i class="fas fa-user-circle"></i>';
        document.getElementById('dropdown-profile-pic').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('profile-icon').innerHTML = '<i class="fas fa-user"></i>';
    }
}

function showStats() {
    const totalSongs = playlist.length;
    const totalFavourites = favourites.length;
    const totalPlaylists = playlists.length;
    const totalPlaytime = Math.round(playlist.reduce((sum, s) => sum + (s.duration || 0), 0) / 60);
    
    alert(`📊 Statistics\n\nTotal Songs: ${totalSongs}\nFavourites: ${totalFavourites}\nPlaylists: ${totalPlaylists}\nTotal Playtime: ${totalPlaytime} minutes`);
}

function clearAllData() {
    if (confirm('Clear all data? This will delete all songs, playlists, and favourites.')) {
        playlist.forEach(song => URL.revokeObjectURL(song.url));
        playlist = [];
        favourites = [];
        playlists = [];
        currentIndex = -1;
        isPlaying = false;
        
        localStorage.removeItem('mboka_playlist');
        localStorage.removeItem('mboka_favourites');
        localStorage.removeItem('mboka_playlists');
        
        renderPlaylist();
        renderFavourites();
        renderPlaylists();
        
        audio.pause();
        nowPlayingCard.style.display = 'none';
        playingAnimation.style.display = 'none';
        currentSongTitle.textContent = 'Select a song to play';
        currentSongArtist.textContent = 'Unknown Artist';
        
        showToast('✅ All data cleared');
    }
}

// ===========================================
// SIDEBAR & NAVIGATION
// ===========================================
function setupSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebar');
    
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    menuBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}

function setupPageNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
            
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            closeSidebar();
        });
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    if (pageId === 'playlists') renderPlaylists();
    if (pageId === 'favourites') renderFavourites();
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function setupProfileDropdown() {
    const profileToggle = document.getElementById('profile-toggle');
    const dropdown = document.getElementById('profile-dropdown');
    
    profileToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', function() {
        dropdown.classList.remove('show');
    });
}

// ===========================================
// STORAGE FUNCTIONS
// ===========================================
function savePlaylist() {
    const playlistData = playlist.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artist,
        duration: song.duration,
        size: song.size,
        added: song.added,
        lyrics: song.lyrics
    }));
    localStorage.setItem('mboka_playlist', JSON.stringify(playlistData));
}

function loadSavedData() {
    // Load playlist
    const savedPlaylist = localStorage.getItem('mboka_playlist');
    if (savedPlaylist) {
        const saved = JSON.parse(savedPlaylist);
        if (saved.length > 0) {
            showToast(`${saved.length} songs found. Add them again to play.`);
        }
    }
    
    // Load favourites
    const savedFavourites = localStorage.getItem('mboka_favourites');
    if (savedFavourites) favourites = JSON.parse(savedFavourites);
    
    // Load playlists
    const savedPlaylists = localStorage.getItem('mboka_playlists');
    if (savedPlaylists) playlists = JSON.parse(savedPlaylists);
}

function saveFavourites() {
    localStorage.setItem('mboka_favourites', JSON.stringify(favourites));
}

function savePlaylists() {
    localStorage.setItem('mboka_playlists', JSON.stringify(playlists));
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
            }
