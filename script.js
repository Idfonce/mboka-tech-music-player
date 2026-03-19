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
        const isPlaying = currentSongIndex !== -1 && music
