// ===========================================
// MUSIC PLAYER DATA
// ===========================================
let playlist = [];
let currentIndex = -1;
let isPlaying = false;
let isRepeat = false;
let isShuffle = false;
let currentLyrics = "";

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

// User Data
let currentUser = null;
let favourites = [];
let playlists = [];

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data
    loadUserData();
    loadPlaylist();
    
    // Setup file input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('lyricsFileInput').addEventListener('change', handleLyricsImport);
    
    // Setup audio events
    setupAudioEvents();
    
    // Setup volume
    audio.volume = 0.7;
    volumeControl.value = 0.7;
    
    // Setup progress bar click
    progressBar.addEventListener('click', seek);
    
    // Volume control
    volumeControl.addEventListener('input', function(e) {
        audio.volume = e.target.value;
    });
    
    // Setup sidebar
    setupSidebar();
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Setup page navigation
    setupPageNavigation();
    
    showToast('Welcome! Add songs to start listening');
});

// ===========================================
// SIDEBAR FUNCTIONS
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
    const pages = ['home', 'playlists', 'favourites', 'about'];
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Update active state
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected page
            pages.forEach(page => {
                const pageEl = document.getElementById(`${page}-page`);
                if (pageEl) pageEl.classList.remove('active');
            });
            document.getElementById(`${pageId}-page`).classList.add('active');
            
            // Close sidebar
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
            document.body.style.overflow = '';
            
            // Refresh content
            if (pageId === 'playlists') renderPlaylists();
            if (pageId === 'favourites') renderFavourites();
        });
    });
}

// ===========================================
// FILE HANDLING
// ===========================================
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
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
                <button class="add-btn" onclick="document.getElementById('fileInput').click()">
                    <i class="fas fa-plus-circle"></i> Add Songs
                </button>
            </div>
        `;
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
    audio.play();
    
    isPlaying = true;
    updatePlayButton();
    
    currentSongTitle.textContent = song.name;
    currentSongArtist.textContent = song.artist;
    nowPlayingCard.style.display = 'block';
    playingAnimation.style.display = 'flex';
    
    renderPlaylist();
    
    // Display lyrics if available
    if (song.lyrics) {
        currentLyrics = song.lyrics;
        displayLyrics(song.lyrics);
        document.getElementById('lyricsCard').style.display = 'block';
    } else {
        currentLyrics = "";
        lyricsContent.innerHTML = '<p>No lyrics added. Click "Import" to add lyrics for this song.</p>';
        document.getElementById('lyricsCard').style.display = 'block';
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
        audio.play();
        isPlaying = true;
        playingAnimation.style.display = 'flex';
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
                showToast('This is the last song in playlist');
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
            showToast('This is the first song in playlist');
            return;
        }
    }
    
    playSong(prevIndex);
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    if (isRepeat) {
        repeatBtn.style.background = '#ff6b6b';
        repeatBtn.style.color = 'white';
        showToast('Repeat mode: ON');
    } else {
        repeatBtn.style.background = '#f0f0f0';
        repeatBtn.style.color = '#333';
        showToast('Repeat mode: OFF');
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (isShuffle) {
        shuffleBtn.style.background = '#ff6b6b';
        shuffleBtn.style.color = 'white';
        showToast('Shuffle mode: ON');
    } else {
        shuffleBtn.style.background = '#f0f0f0';
        shuffleBtn.style.color = '#333';
        showToast('Shuffle mode: OFF');
    }
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
                    <button onclick="event.stopPropagation(); toggleFavouriteBySongId(${song.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    favouritesList.innerHTML = html;
}

function toggleFavouriteBySongId(songId) {
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

// ===========================================
// AUDIO EVENTS
// ===========================================
function setupAudioEvents() {
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(audio.duration);
    });
}

function updateProgress() {
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    progressFill.style.width = `${progress}%`;
    currentTimeSpan.textContent = formatTime(audio.currentTime);
}

function handleSongEnd() {
    if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
    } else {
        nextSong();
    }
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
// USER FUNCTIONS
// ===========================================
function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('whatsapp_users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = {
            username: user.username,
            name: user.name,
            email: user.email,
            picture: user.picture
        };
        updateUIForLoggedInUser();
        showToast(`Welcome back, ${currentUser.name}!`);
        document.getElementById('profile-dropdown').classList.remove('show');
    } else {
        showToast('Invalid username or password');
    }
}

function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    
    if (!username || !password) {
        showToast('Please fill all fields');
        return;
    }
    
    if (password !== confirm) {
        showToast('Passwords do not match');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('whatsapp_users') || '[]');
    if (users.find(u => u.username === username)) {
        showToast('Username already exists');
        return;
    }
    
    const newUser = {
        username: username,
        password: password,
        name: username,
        email: `${username}@example.com`,
        picture: null
    };
    
    users.push(newUser);
    localStorage.setItem('whatsapp_users', JSON.stringify(users));
    
    currentUser = {
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        picture: null
    };
    
    updateUIForLoggedInUser();
    showToast(`Account created! Welcome ${currentUser.name}`);
}

function logout() {
    currentUser = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('profile-section-dropdown').style.display = 'none';
    document.getElementById('dropdown-username').textContent = 'Guest User';
    document.getElementById('dropdown-email').textContent = 'Not logged in';
    showToast('Logged out successfully');
}

function updateUIForLoggedInUser() {
    if (!currentUser) return;
    
    document.getElementById('dropdown-username').textContent = currentUser.name;
    document.getElementById('dropdown-email').textContent = currentUser.email;
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('profile-section-dropdown').style.display = 'block';
    document.getElementById('dropdownUserName').textContent = currentUser.name;
    document.getElementById('dropdownUserEmailDisplay').textContent = currentUser.email;
    
    if (currentUser.picture) {
        document.getElementById('dropdownUserAvatar').innerHTML = `<img src="${currentUser.picture}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('profile-icon').innerHTML = `<img src="${currentUser.picture}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('dropdown-profile-pic').innerHTML = `<img src="${currentUser.picture}" style="width:100%;height:100%;object-fit:cover;">`;
    }
}

function showProfilePage() {
    showToast('Profile feature coming soon!');
}

function switchAuthTab(tab) {
    const loginTab = document.querySelectorAll('.auth-tab')[0];
    const registerTab = document.querySelectorAll('.auth-tab')[1];
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
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

function loadPlaylist() {
    const saved = localStorage.getItem('mboka_playlist');
    if (saved) {
        const savedPlaylist = JSON.parse(saved);
        if (savedPlaylist.length > 0) {
            showToast(`${savedPlaylist.length} songs found. Please re-add your music files to play them.`);
        }
    }
}

function saveFavourites() {
    localStorage.setItem('mboka_favourites', JSON.stringify(favourites));
}

function loadFavourites() {
    const saved = localStorage.getItem('mboka_favourites');
    if (saved) {
        favourites = JSON.parse(saved);
    }
}

function savePlaylists() {
    localStorage.setItem('mboka_playlists', JSON.stringify(playlists));
}

function loadPlaylists() {
    const saved = localStorage.getItem('mboka_playlists');
    if (saved) {
        playlists = JSON.parse(saved);
    }
}

function loadUserData() {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
    loadFavourites();
    loadPlaylists();
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
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
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
