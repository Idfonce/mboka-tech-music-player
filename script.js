const PERMISSION_KEY = 'mboka_permission';
const MUSIC_LIBRARY_KEY = 'mboka_music_library';
const FAVOURITES_KEY = 'mboka_favourites';
const PLAYLISTS_KEY = 'mboka_playlists';
const PROFILE_KEY = 'mboka_profile';

let hasPermission = localStorage.getItem(PERMISSION_KEY) === 'granted';
let musicLibrary = [];
let favourites = [];
let playlists = [];
let profile = {};

const audio = document.getElementById('audioPlayer');
let currentSongIndex = -1;
let isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
    if (!hasPermission) {
        document.getElementById('permission-card').style.display = 'block';
    } else {
        loadData();
        initializeApp();
    }
    
    setupNavigation();
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    setupAudioEvents();
    
    document.getElementById('profile-toggle').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('profile-dropdown').classList.toggle('show');
    });
    
    document.addEventListener('click', function() {
        document.getElementById('profile-dropdown').classList.remove('show');
    });
    
    document.getElementById('progressBar').addEventListener('input', function(e) {
        if (audio.duration) {
            audio.currentTime = (e.target.value / 100) * audio.duration;
        }
    });
    
    document.getElementById('volumeControl').addEventListener('input', function(e) {
        audio.volume = e.target.value;
    });
});

function grantFileAccess() {
    hasPermission = true;
    localStorage.setItem(PERMISSION_KEY, 'granted');
    document.getElementById('permission-card').style.display = 'none';
    
    musicLibrary = [];
    favourites = [];
    playlists = [];
    profile = { name: 'Music Listener', volume: 1, picture: null };
    
    saveProfile();
    initializeApp();
    showToast('✅ File access granted');
}

function denyFileAccess() {
    document.getElementById('permission-card').style.display = 'none';
    showToast('❌ Permission denied');
}

function loadData() {
    musicLibrary = JSON.parse(localStorage.getItem(MUSIC_LIBRARY_KEY)) || [];
    favourites = JSON.parse(localStorage.getItem(FAVOURITES_KEY)) || [];
    playlists = JSON.parse(localStorage.getItem(PLAYLISTS_KEY)) || [];
    profile = JSON.parse(localStorage.getItem(PROFILE_KEY)) || { name: 'Music Listener', volume: 1, picture: null };
}

function initializeApp() {
    displayMusicLibrary();
    displayFavourites();
    displayPlaylists();
    displayRecentSongs();
    updateStats();
    loadProfile();
    updateProfileDropdown();
}

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) btn.classList.add('active');
    });
    
    if (pageId === 'library') displayMusicLibrary();
    if (pageId === 'favourites') displayFavourites();
    if (pageId === 'playlists') displayPlaylists();
    if (pageId === 'recent') displayRecentSongs();
    
    document.getElementById('profile-dropdown').classList.remove('show');
}

function handleFileSelect(event) {
    if (!hasPermission) {
        showToast('❌ Grant access first');
        return;
    }
    
    Array.from(event.target.files).forEach(file => {
        if (!file.type.startsWith('audio/')) {
            showToast(`❌ ${file.name} not audio`);
            return;
        }
        
        const url = URL.createObjectURL(file);
        const audioElement = new Audio(url);
        
        audioElement.addEventListener('loadedmetadata', () => {
            musicLibrary.unshift({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Unknown Artist',
                url: url,
                duration: audioElement.duration,
                size: file.size,
                added: new Date().toISOString()
            });
            
            saveLibrary();
            displayMusicLibrary();
            displayRecentSongs();
            updateStats();
            showToast(`✅ Added: ${file.name}`);
        });
    });
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100 || 0;
        document.getElementById('progressBar').value = progress;
        document.getElementById('currentTimeDisplay').textContent = formatTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('durationDisplay').textContent = formatTime(audio.duration);
    });
}

function playSong(index) {
    if (!hasPermission || index < 0 || index >= musicLibrary.length) return;
    
    currentSongIndex = index;
    const song = musicLibrary[index];
    
    audio.src = song.url;
    audio.volume = profile.volume;
    audio.play();
    
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('currentSongTitle').textContent = song.name;
    document.getElementById('currentSongArtist').textContent = song.artist;
    document.getElementById('nowPlayingBar').style.display = 'block';
    
    displayMusicLibrary();
}

function playSongById(songId) {
    const index = musicLibrary.findIndex(s => s.id === songId);
    if (index !== -1) playSong(index);
}

function playPause() {
    if (!hasPermission || musicLibrary.length === 0) return;
    
    if (currentSongIndex === -1) {
        playSong(0);
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audio.play();
        isPlaying = true;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function nextSong() {
    if (musicLibrary.length === 0) return;
    let next = currentSongIndex + 1;
    if (next >= musicLibrary.length) next = 0;
    playSong(next);
}

function previousSong() {
    if (musicLibrary.length === 0) return;
    let prev = currentSongIndex - 1;
    if (prev < 0) prev = musicLibrary.length - 1;
    playSong(prev);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleFavourite(songId) {
    const index = favourites.findIndex(f => f.id === songId);
    
    if (index === -1) {
        const song = musicLibrary.find(s => s.id === songId);
        if (song) {
            favourites.push(song);
            showToast('❤️ Added to favourites');
        }
    } else {
        favourites.splice(index, 1);
        showToast('💔 Removed from favourites');
    }
    
    saveFavourites();
    displayMusicLibrary();
    displayFavourites();
    updateStats();
}

function isFavourite(songId) {
    return favourites.some(f => f.id === songId);
}

function displayMusicLibrary() {
    if (!hasPermission) return;
    
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    let songs = musicLibrary.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.artist.toLowerCase().includes(search)
    );
    
    if (songs.length === 0) {
        document.getElementById('songsList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-headphones"></i>
                <h3>No songs found</h3>
            </div>
        `;
        return;
    }
    
    let html = '';
    songs.forEach(song => {
        const isPlaying = currentSongIndex !== -1 && musicLibrary[currentSongIndex]?.id === song.id;
        const isFav = isFavourite(song.id);
        
        html += `
            <div class="song-item ${isPlaying ? 'playing' : ''}" onclick="playSongById(${song.id})">
                <div class="song-artwork"><i class="fas fa-music"></i></div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions" onclick="event.stopPropagation()">
                    <button onclick="toggleFavourite(${song.id})" class="favourite-btn ${isFav ? 'active' : ''}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="addToPlaylist(${song.id})" class="secondary"><i class="fas fa-plus"></i></button>
                    <button onclick="deleteSong(${song.id})" class="danger"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('songsList').innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayFavourites() {
    if (!hasPermission || favourites.length === 0) {
        document.getElementById('favouritesList').innerHTML = `
            <div class="empty-state"><i class="fas fa-heart"></i><h3>No favourites</h3></div>
        `;
        return;
    }
    
    let html = '';
    favourites.forEach(song => {
        html += `
            <div class="song-item" onclick="playSongById(${song.id})">
                <div class="song-artwork"><i class="fas fa-music"></i></div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions" onclick="event.stopPropagation()">
                    <button onclick="toggleFavourite(${song.id})" class="favourite-btn active">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('favouritesList').innerHTML = html;
}

function displayRecentSongs() {
    if (!hasPermission || musicLibrary.length === 0) {
        document.getElementById('recentSongsList').innerHTML = `
            <div class="empty-state"><i class="fas fa-clock"></i><h3>No recent songs</h3></div>
        `;
        return;
    }
    
    const recent = [...musicLibrary].sort((a,b) => new Date(b.added) - new Date(a.added)).slice(0, 10);
    let html = '';
    recent.forEach(song => {
        html += `
            <div class="song-item" onclick="playSongById(${song.id})">
                <div class="song-artwork"><i class="fas fa-music"></i></div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
            </div>
        `;
    });
    
    document.getElementById('recentSongsList').innerHTML = html;
}

function displayPlaylists() {
    if (!hasPermission) return;
    
    if (playlists.length === 0) {
        document.getElementById('emptyPlaylists').style.display = 'block';
        document.getElementById('playlistsGrid').innerHTML = '';
        return;
    }
    
    document.getElementById('emptyPlaylists').style.display = 'none';
    let html = '';
    playlists.forEach((p, i) => {
        html += `
            <div class="playlist-card" onclick="openPlaylist(${i})">
                <div class="playlist-icon"><i class="fas fa-list"></i></div>
                <div class="playlist-name">${escapeHtml(p.name)}</div>
                <div class="playlist-count">${p.songs.length} songs</div>
            </div>
        `;
    });
    
    document.getElementById('playlistsGrid').innerHTML = html;
}

function createPlaylist() {
    const name = prompt('Playlist name:');
    if (!name) return;
    
    playlists.push({ id: Date.now(), name, songs: [], created: new Date().toISOString() });
    savePlaylists();
    displayPlaylists();
    updateStats();
    showToast(`✅ Playlist created`);
}

function addToPlaylist(songId) {
    if (playlists.length === 0) {
        if (confirm('Create a playlist first?')) createPlaylist();
        return;
    }
    
    const song = musicLibrary.find(s => s.id === songId);
    if (!song) return;
    
    const list = playlists.map((p,i) => `${i+1}. ${p.name}`).join('\n');
    const choice = prompt(`Select playlist:\n${list}`);
    
    if (choice && !isNaN(choice) && choice > 0 && choice <= playlists.length) {
        const idx = choice - 1;
        if (!playlists[idx].songs.some(s => s.id === song.id)) {
            playlists[idx].songs.push(song);
            savePlaylists();
            showToast(`✅ Added to ${playlists[idx].name}`);
        }
    }
}

function openPlaylist(idx) {
    const songs = playlists[idx].songs;
    if (songs.length === 0) {
        showToast('Playlist empty');
        return;
    }
    
    showPage('library');
    
    let html = '';
    songs.forEach(song => {
        html += `
            <div class="song-item" onclick="playSongById(${song.id})">
                <div class="song-artwork"><i class="fas fa-music"></i></div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
            </div>
        `;
    });
    
    document.getElementById('songsList').innerHTML = html;
}

function loadProfile() {
    document.getElementById('displayName').value = profile.name;
    document.getElementById('defaultVolume').value = profile.volume;
    document.getElementById('volumeControl').value = profile.volume;
    document.getElementById('profileName').textContent = profile.name;
    audio.volume = profile.volume;
}

function saveProfile() {
    profile.name = document.getElementById('displayName').value;
    profile.volume = parseFloat(document.getElementById('defaultVolume').value);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    updateProfileDropdown();
    document.getElementById('profileName').textContent = profile.name;
    showToast('✅ Settings saved');
}

function updateProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            profile.picture = event.target.result;
            saveProfile();
            updateProfileDropdown();
            showToast('✅ Photo updated');
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

function updateProfileDropdown() {
    document.getElementById('dropdown-username').textContent = profile.name;
    
    if (profile.picture) {
        document.getElementById('profile-icon').innerHTML = `<img src="${profile.picture}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('dropdown-profile-pic').innerHTML = `<img src="${profile.picture}" style="width:100%;height:100%;object-fit:cover;">`;
    }
}

function logout() {
    if (confirm('Logout?')) {
        showToast('👋 Logged out');
        showPage('library');
    }
}

function saveLibrary() {
    localStorage.setItem(MUSIC_LIBRARY_KEY, JSON.stringify(musicLibrary));
    updateStats();
}

function saveFavourites() {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
}

function savePlaylists() {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function deleteSong(songId) {
    if (!confirm('Delete?')) return;
    
    const idx = musicLibrary.findIndex(s => s.id === songId);
    if (idx !== -1) {
        URL.revokeObjectURL(musicLibrary[idx].url);
        musicLibrary.splice(idx, 1);
        
        const favIdx = favourites.findIndex(f => f.id === songId);
        if (favIdx !== -1) favourites.splice(favIdx, 1);
        
        saveLibrary();
        saveFavourites();
        displayMusicLibrary();
        displayFavourites();
        updateStats();
        
        if (currentSongIndex === idx) {
            audio.pause();
            currentSongIndex = -1;
            document.getElementById('nowPlayingBar').style.display = 'none';
        }
        
        showToast('✅ Deleted');
    }
}

function clearAllData() {
    if (!confirm('Clear everything?')) return;
    
    musicLibrary.forEach(s => URL.revokeObjectURL(s.url));
    musicLibrary = [];
    favourites = [];
    playlists = [];
    
    localStorage.setItem(MUSIC_LIBRARY_KEY, '[]');
    localStorage.setItem(FAVOURITES_KEY, '[]');
    localStorage.setItem(PLAYLISTS_KEY, '[]');
    
    displayMusicLibrary();
    displayFavourites();
    displayPlaylists();
    displayRecentSongs();
    updateStats();
    
    audio.pause();
    document.getElementById('nowPlayingBar').style.display = 'none';
    showToast('✅ Library cleared');
}

function updateStats() {
    if (!hasPermission) return;
    
    const size = (musicLibrary.reduce((s, song) => s + (song.size || 0), 0) / (1024*1024)).toFixed(2);
    const mins = Math.round(musicLibrary.reduce((s, song) => s + (song.duration || 0), 0) / 60);
    
    document.getElementById('totalSongs').textContent = musicLibrary.length;
    document.getElementById('totalFavourites').textContent = favourites.length;
    document.getElementById('totalPlaylists').textContent = playlists.length;
    document.getElementById('storageUsed').textContent = size + ' MB';
    document.getElementById('totalSongsStat').textContent = musicLibrary.length;
    document.getElementById('totalFavouritesStat').textContent = favourites.length;
    document.getElementById('totalStorage').textContent = size + ' MB';
    document.getElementById('totalPlaytime').textContent = mins + ' min';
}

function searchMusic() {
    displayMusicLibrary();
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
            }
