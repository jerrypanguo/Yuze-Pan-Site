
class AudioPlayer {
    constructor() {
        this.isPlaying = false;
        this.currentTrack = 0;
        this.audioElement = null;
        this.currentTime = 0;
        this.continueOnExit = true;
        this.originalVolume = 1.0;
        this.volumeBeforeFade = 1.0;
        this.isVolumeAnimating = false;
        this.volumeAnimationId = null;
        this.wasPlayingBeforeVideoPage = false;
        this.storageKey = 'yuze-pan-player-state';
        this.syncInterval = null;
        this.lastSyncTime = 0;

        this.tracks = [
            {
                title: 'Villa Lobos Etude No.7 - Yuze Pan',
                file: 'static/audio/Villa Lobos Etude No.7.mp3',
                duration: '2:17'
            }
        ];

        this.initPlayer();
        this.restorePlayerState();
        this.setupContinuousPlayback();
        this.setupVideoPageTransitions();
        this.updateTrackDisplay();
        this.checkAndOptimizeForMobile();
        this.setupSpacebarControl();

        console.log('[AudioPlayer] Initialized with true cross-page continuous playback');
    }

    setupContinuousPlayback() {

        window.addEventListener('beforeunload', () => {
            this.savePlayerStateForContinuation();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.savePlayerStateForContinuation();
            }
        });

        this.startPlaybackSync();

        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                this.handleStateUpdate(JSON.parse(e.newValue));
            }
        });
    }

    startPlaybackSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            if (this.isPlaying && this.audioElement && !this.isVolumeAnimating) {
                this.savePlayerStateForContinuation();
            }
        }, 250);
    }

    stopPlaybackSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    savePlayerStateForContinuation() {
        const currentTime = this.audioElement ? this.audioElement.currentTime : this.currentTime;
        const state = {
            isPlaying: this.isPlaying && !document.body.classList.contains('video-page'),
            currentTrack: this.currentTrack,
            currentTime: currentTime,
            volume: this.audioElement ? this.audioElement.volume : this.originalVolume,
            wasPlayingBeforeVideoPage: this.wasPlayingBeforeVideoPage,
            timestamp: Date.now(),
            pageUrl: window.location.href,
            syncId: Date.now() + Math.random()
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
            this.lastSyncTime = state.timestamp;
        } catch (error) {
            console.error('[AudioPlayer] Error saving state:', error);
        }
    }

    handleStateUpdate(newState) {

        if (newState.pageUrl === window.location.href ||
            newState.timestamp <= this.lastSyncTime) {
            return;
        }

        if (newState.isPlaying && this.isPlaying) {
            console.log('[AudioPlayer] Another page is playing, stopping local playback');
            this.pauseLocal();
        }
    }

    pauseLocal() {
        if (this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
        }
        this.isPlaying = false;
        if (this.playBtn) {
            this.playBtn.classList.remove('playing');
        }
    }

    restorePlayerState() {
        const savedState = localStorage.getItem(this.storageKey);
        if (!savedState) {
            this.loadTrack(this.currentTrack);
            return;
        }

        try {
            const state = JSON.parse(savedState);
            const timeDiff = Date.now() - state.timestamp;

            if (timeDiff > 5 * 60 * 1000) {
                console.log('[AudioPlayer] State too old, not restoring playback');
                this.loadTrack(this.currentTrack);
                return;
            }

            this.currentTrack = state.currentTrack || 0;
            this.wasPlayingBeforeVideoPage = state.wasPlayingBeforeVideoPage || false;
            this.loadTrack(this.currentTrack);

            const setupRestoredState = () => {
                if (state.currentTime && this.audioElement) {

                    let newTime = state.currentTime;
                    if (state.isPlaying && !document.body.classList.contains('video-page')) {

                        newTime += timeDiff / 1000;

                        if (this.audioElement.duration && newTime < this.audioElement.duration) {
                            this.audioElement.currentTime = newTime;
                        } else {
                            this.audioElement.currentTime = state.currentTime;
                        }
                    } else {
                        this.audioElement.currentTime = state.currentTime;
                    }
                }

                if (state.volume !== undefined && this.audioElement) {
                    this.audioElement.volume = state.volume;
                    this.volumeBeforeFade = state.volume;
                }

                if (state.isPlaying && !document.body.classList.contains('video-page')) {
                    this.resumePlayback();
                }
            };

            if (this.audioElement.readyState >= 2) {
                setupRestoredState();
            } else {
                this.audioElement.addEventListener('loadeddata', setupRestoredState, { once: true });
            }

            console.log('[AudioPlayer] State restored from:', state.pageUrl);

        } catch (error) {
            console.error('[AudioPlayer] Error restoring state:', error);
            this.loadTrack(this.currentTrack);
        }
    }

    resumePlayback() {
        if (!this.audioElement || document.body.classList.contains('video-page')) {
            return;
        }

        const playPromise = this.audioElement.play();
        if (playPromise) {
            playPromise.then(() => {
                this.isPlaying = true;
                if (this.playBtn) {
                    this.playBtn.classList.add('playing');
                }
                console.log('[AudioPlayer] Playback resumed automatically');
            }).catch(error => {
                console.log('[AudioPlayer] Auto-resume failed (user interaction needed):', error);
                this.isPlaying = false;
                if (this.playBtn) {
                    this.playBtn.classList.remove('playing');
                }
            });
        }
    }

    setupVideoPageTransitions() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            const currentIsVideoPage = document.body.classList.contains('video-page');
            const targetIsVideoPage = href.includes('video.html');

            if (!currentIsVideoPage && targetIsVideoPage) {
                this.handleEnterVideoPage();
            } else if (currentIsVideoPage && !targetIsVideoPage) {
                this.handleExitVideoPage();
            }
        });
    }

    handleEnterVideoPage() {
        if (this.isPlaying && this.audioElement) {
            console.log('[AudioPlayer] Entering video page - starting volume fade out');
            this.wasPlayingBeforeVideoPage = true;
            this.fadeOutVolume();
        } else {
            this.wasPlayingBeforeVideoPage = false;
        }
    }

    handleExitVideoPage() {
        if (this.wasPlayingBeforeVideoPage) {
            console.log('[AudioPlayer] Exiting video page - will resume playback');

            this.wasPlayingBeforeVideoPage = true;
            this.savePlayerStateForContinuation();
        }
    }

    fadeOutVolume() {
        if (this.isVolumeAnimating || !this.audioElement) return;

        this.isVolumeAnimating = true;
        this.volumeBeforeFade = this.audioElement.volume;

        const fadeSteps = [
            { time: 300, volume: 0.8 },
            { time: 500, volume: 0.6 },
            { time: 800, volume: 0.3 },
            { time: 1000, volume: 0.0 }
        ];

        let stepIndex = 0;
        const startTime = Date.now();
        const startVolume = this.audioElement.volume;

        const animateVolume = () => {
            const elapsed = Date.now() - startTime;

            if (stepIndex < fadeSteps.length) {
                const currentStep = fadeSteps[stepIndex];

                if (elapsed >= currentStep.time) {
                    this.audioElement.volume = currentStep.volume;
                    console.log(`[AudioPlayer] Volume fade out: ${(currentStep.volume * 100).toFixed(0)}% at ${currentStep.time}ms`);
                    stepIndex++;
                } else {
                    const prevStep = stepIndex === 0 ? { time: 0, volume: startVolume } : fadeSteps[stepIndex - 1];
                    const progress = (elapsed - prevStep.time) / (currentStep.time - prevStep.time);
                    const volume = prevStep.volume + (currentStep.volume - prevStep.volume) * progress;
                    this.audioElement.volume = Math.max(0, Math.min(1, volume));
                }

                this.volumeAnimationId = requestAnimationFrame(animateVolume);
            } else {
                this.audioElement.volume = 0;
                this.audioElement.pause();
                this.isPlaying = false;
                this.isVolumeAnimating = false;
                if (this.playBtn) {
                    this.playBtn.classList.remove('playing');
                }
                this.savePlayerStateForContinuation();
                console.log('[AudioPlayer] Volume fade out complete - audio paused');
            }
        };

        this.volumeAnimationId = requestAnimationFrame(animateVolume);
    }

    stopVolumeAnimation() {
        if (this.volumeAnimationId) {
            cancelAnimationFrame(this.volumeAnimationId);
            this.volumeAnimationId = null;
            this.isVolumeAnimating = false;
        }
    }

    setupSpacebarControl() {
        document.addEventListener('keydown', (event) => {
            if (document.body.classList.contains('video-page')) {
                return;
            }

            if (event.code === 'Space' || event.keyCode === 32) {
                event.preventDefault();
                this.togglePlay();
            }
        });
    }

    checkAndOptimizeForMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            console.log("移动设备检测:优化播放器...");

            if (this.audioElement) {
                this.audioElement.setAttribute('preload', 'metadata');
            }

            document.querySelectorAll('.player-btn').forEach(btn => {
                btn.classList.add('mobile-btn');

                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.classList.add('touch-active');
                }, { passive: false });

                btn.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    this.classList.remove('touch-active');
                    this.click();
                }, { passive: false });
            });
        }
    }

    initPlayer() {
        this.audioElement = document.createElement('audio');
        this.audioElement.setAttribute('preload', 'auto');
        this.audioElement.classList.add('continue-on-exit');
        this.audioElement.volume = this.originalVolume;
        document.body.appendChild(this.audioElement);

        this.playBtn = document.querySelector('.play-btn');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.trackName = document.querySelector('.track-name');
        this.trackTime = document.querySelector('.track-time');

        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => {
                console.log('[DEBUG] Play button clicked');
                this.togglePlay();
            });
        }

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevTrack());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextTrack());
        }

        if (this.audioElement) {
            this.audioElement.addEventListener('timeupdate', () => this.updateTime());
            this.audioElement.addEventListener('ended', () => this.nextTrack());

            this.audioElement.addEventListener('error', (e) => {
                console.error('音频加载错误:', e);
                if (this.trackTime) {
                    this.trackTime.textContent = '加载错误';
                }
            });
        }
    }

    loadTrack(index) {
        if (!this.tracks[index] || !this.audioElement) return;

        const track = this.tracks[index];
        this.audioElement.src = track.file;
        this.currentTrack = index;

        this.updateTrackDisplay();

        if (this.isPlaying) {
            this.pause();
            setTimeout(() => this.play(), 300);
        }
    }

    updateTrackDisplay() {
        const track = this.tracks[this.currentTrack];
        if (this.trackName) {
            this.trackName.textContent = track.title;
        }
        if (this.trackTime) {
            this.trackTime.textContent = `0:00/${track.duration}`;
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audioElement || document.body.classList.contains('video-page')) {
            console.log('[AudioPlayer] Cannot play on video page');
            return;
        }

        console.log('[DEBUG] play() method entered');

        if (this.playBtn) {
            this.playBtn.classList.add('playing');
        }

        const playPromise = this.audioElement.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.savePlayerStateForContinuation();
                console.log('[AudioPlayer] Playing started');
            }).catch(error => {
                console.error('播放错误:', error);
                if (error.name === 'NotAllowedError') {
                    this.pause();
                } else {
                    this.nextTrack();
                }
            });
        } else {
            this.isPlaying = true;
            this.savePlayerStateForContinuation();
        }
    }

    pause() {
        if (!this.audioElement) return;

        console.log('[DEBUG] pause() method entered');

        this.audioElement.pause();
        this.isPlaying = false;

        if (this.playBtn) {
            this.playBtn.classList.remove('playing');
        }

        this.savePlayerStateForContinuation();
        console.log('[AudioPlayer] Playback paused');
    }

    prevTrack() {
        this.currentTrack = (this.currentTrack - 1 + this.tracks.length) % this.tracks.length;
        this.loadTrack(this.currentTrack);
        this.savePlayerStateForContinuation();
    }

    nextTrack() {
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        this.loadTrack(this.currentTrack);
        this.savePlayerStateForContinuation();
    }

    updateTime() {
        if (!this.audioElement || !this.trackTime) return;

        const currentTime = this.audioElement.currentTime;
        const duration = this.audioElement.duration;

        if (isNaN(duration)) return;

        const currentFormatted = this.formatTime(currentTime);
        const durationFormatted = this.formatTime(duration);

        this.trackTime.textContent = `${currentFormatted}/${durationFormatted}`;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    destroy() {
        this.stopVolumeAnimation();
        this.stopPlaybackSync();

        if (this.continueOnExit) {
            this.savePlayerStateForContinuation();
        }

        console.log('[AudioPlayer] Player destroyed');
    }
}

window.AudioPlayerManager = {
    instance: null,

    init() {
        if (!this.instance) {
            this.instance = new AudioPlayer();
            console.log('[AudioPlayerManager] Player initialized');
        }
        return this.instance;
    },

    getInstance() {
        return this.instance;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('has-audio-player', 'continue-on-exit');

    if (document.querySelector('.player-controls')) {
        window.AudioPlayerManager.init();
    }

    const externalLinks = document.querySelectorAll('a:not([href^="#"])');

    externalLinks.forEach(link => {

        if (link.hostname === window.location.hostname) {
            link.addEventListener('click', function(e) {

                const isVideoPage = this.href.includes('video.html');
                const fromVideoPage = document.body.classList.contains('video-page');

                if ((isVideoPage && !fromVideoPage) || (!isVideoPage && fromVideoPage)) {
                    e.preventDefault();

                    document.body.style.opacity = '0.7';

                    if (isVideoPage && !fromVideoPage) {
                        const playerBar = document.querySelector('.player-bar');
                        const navBar = document.querySelector('.nav-bar');

                        if (playerBar && navBar) {
                            playerBar.style.transform = 'translateY(100%)';
                            playerBar.style.opacity = '0';
                            navBar.style.bottom = '0';

                            setTimeout(() => {
                                window.location.href = this.href;
                            }, 300);
                            return;
                        }
                    }

                    else if (!isVideoPage && fromVideoPage) {

                        const playerBar = document.querySelector('.player-bar');
                        const navBar = document.querySelector('.nav-bar');

                        if (playerBar && navBar) {

                            playerBar.style.transform = 'translateY(100%)';
                            playerBar.style.opacity = '0';

                            setTimeout(() => {

                                playerBar.style.pointerEvents = 'auto';

                                navBar.style.transition = 'bottom 0.3s ease';
                                navBar.style.bottom = 'var(--player-height)';

                                playerBar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                                playerBar.style.transform = 'translateY(0)';
                                playerBar.style.opacity = '1';

                                setTimeout(() => {
                                    window.location.href = this.href;
                                }, 250);
                            }, 50);
                            return;
                        }
                    }

                    setTimeout(() => {
                        window.location.href = this.href;
                    }, 200);
                }
            });
        }
    });
});

window.addEventListener('beforeunload', () => {
    const player = window.AudioPlayerManager.getInstance();
    if (player) {
        player.destroy();
    }
});
