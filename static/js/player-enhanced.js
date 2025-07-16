/**
 * 增强版音频播放器 - 修复移动端问题
 * 解决页面切换、时间显示和按键大小问题
 */

class EnhancedAudioPlayer {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.currentSong = null;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 1;
        
        // 移动端检测
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 状态保存键名
        this.STORAGE_KEYS = {
            CURRENT_SONG: 'audioPlayer_currentSong',
            CURRENT_TIME: 'audioPlayer_currentTime',
            IS_PLAYING: 'audioPlayer_isPlaying',
            VOLUME: 'audioPlayer_volume'
        };
        
        this.init();
    }
    
    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPlayer());
        } else {
            this.setupPlayer();
        }
        
        // 页面卸载时保存状态
        window.addEventListener('beforeunload', () => this.saveState());
        
        // 页面隐藏时保存状态（移动端）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            } else {
                // 页面重新显示时恢复状态
                setTimeout(() => this.restoreState(), 100);
            }
        });
        
        // 移动端页面切换处理
        window.addEventListener('pagehide', () => this.saveState());
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                setTimeout(() => this.restoreState(), 100);
            }
        });
    }
    
    setupPlayer() {
        // 创建播放器容器
        this.createPlayerHTML();
        
        // 绑定控制按钮
        this.bindControls();
        
        // 恢复之前的播放状态
        this.restoreState();
        
        // 如果是移动端，应用特殊样式
        if (this.isMobile) {
            this.applyMobileStyles();
        }
    }
    
    createPlayerHTML() {
        const existingPlayer = document.querySelector('.audio-player');
        if (existingPlayer) {
            existingPlayer.remove();
        }
        
        const playerHTML = `
            <div class="audio-player ${this.isMobile ? 'mobile' : ''}" id="audioPlayer">
                <audio id="audioElement" preload="metadata"></audio>
                
                <div class="player-info">
                    <div class="song-title" id="songTitle">Villa Lobos Etude No.7</div>
                </div>
                
                <div class="player-controls">
                    <button class="control-btn" id="prevBtn" title="上一首">
                        <span class="icon">⏮</span>
                    </button>
                    
                    <button class="control-btn play-pause-btn" id="playPauseBtn" title="播放/暂停">
                        <span class="icon play-icon">▶</span>
                        <span class="icon pause-icon" style="display: none;">⏸</span>
                    </button>
                    
                    <button class="control-btn" id="nextBtn" title="下一首">
                        <span class="icon">⏭</span>
                    </button>
                </div>
                
                <div class="player-timeline">
                    <span class="time-display" id="currentTimeDisplay">0:00</span>
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar">
                            <div class="progress-fill" id="progressFill"></div>
                            <div class="progress-handle" id="progressHandle"></div>
                        </div>
                    </div>
                    <span class="time-display" id="durationDisplay">0:00</span>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
    }
    
    bindControls() {
        this.audio = document.getElementById('audioElement');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
        this.durationDisplay = document.getElementById('durationDisplay');
        this.songTitle = document.getElementById('songTitle');
        
        // 播放/暂停按钮
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // 上一首/下一首
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // 进度条控制
        this.bindProgressControls();
        
        // 音频事件
        this.bindAudioEvents();
    }
    
    bindProgressControls() {
        let isDragging = false;
        
        // 鼠标事件
        this.progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.updateProgress(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.updateProgress(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // 触摸事件（移动端）
        this.progressBar.addEventListener('touchstart', (e) => {
            isDragging = true;
            this.updateProgress(e.touches[0]);
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                this.updateProgress(e.touches[0]);
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
    
    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => {
            this.duration = this.audio.duration;
            this.updateDurationDisplay();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            if (!this.audio.duration) return;
            
            this.currentTime = this.audio.currentTime;
            this.updateTimeDisplay();
            this.updateProgressBar();
            
            // 实时保存播放时间
            this.saveCurrentTime();
        });
        
        this.audio.addEventListener('ended', () => {
            this.nextTrack();
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.savePlayState();
        });
        
        // 错误处理
        this.audio.addEventListener('error', (e) => {
            console.error('音频播放错误:', e);
            this.handleAudioError();
        });
    }
    
    togglePlayPause() {
        if (!this.audio.src) {
            this.loadDefaultSong();
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            await this.audio.play();
        } catch (error) {
            console.error('播放失败:', error);
            this.handlePlayError(error);
        }
    }
    
    pause() {
        this.audio.pause();
    }
    
    loadDefaultSong() {
        const defaultSong = {
            title: 'Villa Lobos Etude No.7',
            src: 'static/audio/Villa Lobos Etude No.7.mp3'
        };
        
        this.loadSong(defaultSong);
    }
    
    loadSong(song) {
        this.currentSong = song;
        this.audio.src = song.src;
        this.songTitle.textContent = song.title;
        
        // 恢复播放时间
        const savedTime = this.getSavedTime();
        if (savedTime > 0) {
            this.audio.currentTime = savedTime;
        }
        
        this.saveSong();
    }
    
    updateProgress(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const time = percent * this.duration;
        
        if (time >= 0 && time <= this.duration) {
            this.audio.currentTime = time;
            this.currentTime = time;
            this.updateTimeDisplay();
            this.updateProgressBar();
        }
    }
    
    updateProgressBar() {
        if (!this.duration) return;
        
        const percent = (this.currentTime / this.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.progressHandle.style.left = `${percent}%`;
    }
    
    updateTimeDisplay() {
        this.currentTimeDisplay.textContent = this.formatTime(this.currentTime);
    }
    
    updateDurationDisplay() {
        this.durationDisplay.textContent = this.formatTime(this.duration);
    }
    
    updatePlayButton() {
        const playIcon = this.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
        } else {
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        }
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // 状态保存和恢复
    saveState() {
        if (this.currentSong) {
            localStorage.setItem(this.STORAGE_KEYS.CURRENT_SONG, JSON.stringify(this.currentSong));
        }
        
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_TIME, this.currentTime.toString());
        localStorage.setItem(this.STORAGE_KEYS.IS_PLAYING, this.isPlaying.toString());
        localStorage.setItem(this.STORAGE_KEYS.VOLUME, this.volume.toString());
    }
    
    restoreState() {
        // 恢复歌曲
        const savedSong = localStorage.getItem(this.STORAGE_KEYS.CURRENT_SONG);
        if (savedSong) {
            try {
                const song = JSON.parse(savedSong);
                this.loadSong(song);
            } catch (e) {
                console.error('恢复歌曲失败:', e);
                this.loadDefaultSong();
            }
        } else {
            this.loadDefaultSong();
        }
        
        // 恢复播放状态
        const wasPlaying = localStorage.getItem(this.STORAGE_KEYS.IS_PLAYING) === 'true';
        if (wasPlaying && this.currentSong) {
            // 延迟播放，确保音频已加载
            setTimeout(() => {
                this.play();
            }, 500);
        }
        
        // 恢复音量
        const savedVolume = localStorage.getItem(this.STORAGE_KEYS.VOLUME);
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
        }
    }
    
    saveCurrentTime() {
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_TIME, this.currentTime.toString());
    }
    
    savePlayState() {
        localStorage.setItem(this.STORAGE_KEYS.IS_PLAYING, this.isPlaying.toString());
    }
    
    saveSong() {
        if (this.currentSong) {
            localStorage.setItem(this.STORAGE_KEYS.CURRENT_SONG, JSON.stringify(this.currentSong));
        }
    }
    
    getSavedTime() {
        const savedTime = localStorage.getItem(this.STORAGE_KEYS.CURRENT_TIME);
        return savedTime ? parseFloat(savedTime) : 0;
    }
    
    // 移动端样式优化
    applyMobileStyles() {
        const player = document.getElementById('audioPlayer');
        if (player) {
            player.classList.add('mobile-optimized');
        }
        
        // 防止按钮在移动端变大
        const controlBtns = document.querySelectorAll('.control-btn');
        controlBtns.forEach(btn => {
            btn.style.touchAction = 'manipulation';
            btn.style.userSelect = 'none';
        });
    }
    
    // 错误处理
    handleAudioError() {
        console.error('音频加载失败，尝试重新加载...');
        this.isPlaying = false;
        this.updatePlayButton();
    }
    
    handlePlayError(error) {
        if (error.name === 'NotAllowedError') {
            console.log('需要用户交互才能播放音频');
            // 显示播放提示
            this.showPlayPrompt();
        }
    }
    
    showPlayPrompt() {
        // 可以在这里添加提示用户点击播放的UI
        console.log('请点击播放按钮开始播放');
    }
    
    // 上一首/下一首（可扩展多首歌曲）
    previousTrack() {
        // 当前只有一首歌，回到开始
        this.audio.currentTime = 0;
        this.currentTime = 0;
        this.updateTimeDisplay();
        this.updateProgressBar();
    }
    
    nextTrack() {
        // 当前只有一首歌，回到开始
        this.audio.currentTime = 0;
        this.currentTime = 0;
        this.updateTimeDisplay();
        this.updateProgressBar();
        this.pause();
    }
}

// 初始化播放器
let audioPlayer;

// 确保页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        audioPlayer = new EnhancedAudioPlayer();
    });
} else {
    audioPlayer = new EnhancedAudioPlayer();
} 