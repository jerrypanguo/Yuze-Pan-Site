

(function() {

    document.addEventListener('DOMContentLoaded', function() {

        if (!document.querySelector('.video-wrapper')) return;

        function setupNetworkInterception() {

            const blockedEndpoints = [
                '/api/stats/watchtime',
                '/api/stats/qoe',
                '/get_endscreen',
                '/get_midroll_info',
                '/related_video',
                '/get_video_metadata'
            ];

            const originalFetch = window.fetch;

            window.fetch = function(resource, init) {

                const url = resource.url || resource;
                const shouldBlock = blockedEndpoints.some(endpoint =>
                    typeof url === 'string' && url.includes(endpoint)
                );

                if (shouldBlock) {
                    console.log('已拦截请求:', url);
                    return Promise.resolve(new Response(null, {
                        status: 404,
                        statusText: 'Not Found',
                        headers: { 'Content-Type': 'text/plain' }
                    }));
                }

                return originalFetch.apply(this, arguments);
            };

            const originalOpen = XMLHttpRequest.prototype.open;

            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {

                this._url = url;
                this._shouldBlock = blockedEndpoints.some(endpoint =>
                    typeof url === 'string' && url.includes(endpoint)
                );

                return originalOpen.apply(this, arguments);
            };

            const originalSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.send = function(body) {

                if (this._shouldBlock) {
                    console.log('已拦截XHR请求:', this._url);

                    this.onreadystatechange && setTimeout(() => {
                        Object.defineProperty(this, 'readyState', { value: 4 });
                        Object.defineProperty(this, 'status', { value: 404 });
                        Object.defineProperty(this, 'statusText', { value: 'Not Found' });
                        Object.defineProperty(this, 'response', { value: null });
                        Object.defineProperty(this, 'responseText', { value: '' });
                        this.onreadystatechange();
                    }, 10);

                    this.onload && setTimeout(() => {
                        const event = new Event('load');
                        this.onload(event);
                    }, 20);

                    return;
                }

                return originalSend.apply(this, arguments);
            };

            setupIframeRequestBlocker();
        }

        function setupIframeRequestBlocker() {
            const videoIframe = document.querySelector('.video-wrapper iframe');
            if (!videoIframe) return;

            try {

                videoIframe.addEventListener('load', function() {
                    try {
                        const iframeWindow = videoIframe.contentWindow;
                        const iframeDocument = iframeWindow.document;

                        const script = iframeDocument.createElement('script');
                        script.textContent = `
                            (function() {
                                // 存储原始的fetch方法
                                const originalFetch = window.fetch;

                                // 重写fetch方法
                                window.fetch = function(resource, init) {
                                    const url = resource.url || resource;
                                    // 检查URL是否包含特定的API请求
                                    if (typeof url === 'string' &&
                                        (url.includes('/api/stats/watchtime') ||
                                         url.includes('/api/stats/qoe') ||
                                         url.includes('/get_endscreen'))) {
                                        console.log('Iframe内部拦截请求:', url);
                                        return Promise.resolve(new Response(null, {
                                            status: 404,
                                            statusText: 'Not Found'
                                        }));
                                    }

                                    // 正常请求
                                    return originalFetch.apply(this, arguments);
                                };

                                // 拦截XMLHttpRequest
                                const originalOpen = XMLHttpRequest.prototype.open;
                                XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                                    this._url = url;
                                    this._shouldBlock = typeof url === 'string' &&
                                        (url.includes('/api/stats/watchtime') ||
                                         url.includes('/api/stats/qoe') ||
                                         url.includes('/get_endscreen'));

                                    return originalOpen.apply(this, arguments);
                                };

                                const originalSend = XMLHttpRequest.prototype.send;
                                XMLHttpRequest.prototype.send = function(body) {
                                    if (this._shouldBlock) {
                                        console.log('Iframe内部拦截XHR请求:', this._url);
                                        Object.defineProperty(this, 'readyState', { value: 4 });
                                        Object.defineProperty(this, 'status', { value: 404 });
                                        return;
                                    }

                                    return originalSend.apply(this, arguments);
                                };
                            })();
                        `;
                        iframeDocument.head.appendChild(script);
                    } catch (e) {
                        console.log('无法向iframe注入代码(跨域限制)', e);
                    }
                });
            } catch (e) {
                console.log('无法设置iframe请求拦截', e);
            }
        }

        setupNetworkInterception();

        const allowedUrls = [
            'https://www.youtube.com/channel/UCSyJvU1NWamcfSkOAdE3hhQ?embeds_referring_euri=https%3A%2F%2Fyuzeguitar.us.kg%2F&source_ve_path=MzY5MjU',
            'https://www.youtube.com/channel/UCSyJvU1NWamcfSkOAdE3hhQ',
            'https://www.youtube.com/watch?time_continue=1&v=7NrO3vBjsos&embeds_referring_euri=https%3A%2F%2Fyuzeguitar.us.kg%2F&source_ve_path=Mjg2NjUsMjg2NjQsMjg2NjY',
            'https://www.youtube.com/watch?v=7NrO3vBjsos&t=1s&ab_channel=jerry_guitarist',
            'https://www.youtube.com/@jerry-yuze731',
            'https://yuzeguitar.site/gallery.html',
            'https://yuzeguitar.site/index.html#profile',
            'https://yuzeguitar.site/index.html#hero',
            'https://yuzeguitar.site/',
            'https://yuzeguitar.site/video.html',
            'https://yuzeguitar.site/contact.html'
        ];

        const simplifiedAllowedUrls = allowedUrls.map(url => {
            return url.replace(/^https?:\/\//, '');
        });

        function createBlockerOverlay() {

            if (document.getElementById('linkBlockerOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'linkBlockerOverlay';
            overlay.className = 'link-blocker-overlay';

            const message = document.createElement('div');
            message.className = 'link-blocker-message';
            message.textContent = 'External links are not allowed.';

            overlay.appendChild(message);
            document.body.appendChild(overlay);

            return overlay;
        }

        function showBlockerMessage() {
            const overlay = document.getElementById('linkBlockerOverlay') || createBlockerOverlay();
            overlay.classList.add('active');

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 2000);
        }

        function isUrlAllowed(url) {

            if (!url || url.startsWith('#') || url.startsWith('javascript:')) return true;
            if (url.startsWith('index.html') ||
                url === 'gallery.html' ||
                url === 'video.html' ||
                url === 'contact.html') return true;

            return allowedUrls.some(allowedUrl => url === allowedUrl) ||
                   simplifiedAllowedUrls.some(allowedUrl => url.replace(/^https?:\/\//, '') === allowedUrl);
        }

        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');

            if (!isUrlAllowed(href)) {
                e.preventDefault();
                e.stopPropagation();
                showBlockerMessage();
                return false;
            }
        }, true);

        window.addEventListener('beforeunload', function(e) {

            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'A') {
                const href = activeElement.getAttribute('href');

                if (href && (
                    href.startsWith('index.html') ||
                    href === 'gallery.html' ||
                    href === 'video.html' ||
                    href === 'contact.html' ||
                    href.startsWith('#')
                )) {
                    return;
                }
            }

            const destinationUrl = activeElement.href;
            if (destinationUrl && !isUrlAllowed(destinationUrl)) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });

        const videoWrapper = document.querySelector('.video-wrapper');
        const iframe = videoWrapper ? videoWrapper.querySelector('iframe') : null;

        if (!iframe) return;

        const protectionOverlay = document.createElement('div');
        protectionOverlay.className = 'video-end-protection-overlay';
        Object.assign(protectionOverlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '1045px',
            height: '1047.26px',
            margin: '16px 0px 0px',
            zIndex: '1000',
            display: 'none',
            cursor: 'default',
            pointerEvents: 'auto'
        });

        videoWrapper.style.position = 'relative';
        videoWrapper.appendChild(protectionOverlay);

        function onYouTubeIframeAPIReady() {
            const videoId = extractVideoId(iframe.src);
            if (!videoId) return;

            new YT.Player(iframe, {
                videoId: videoId,
                events: {
                    'onStateChange': onPlayerStateChange,
                    'onReady': onPlayerReady
                }
            });
        }

        function extractVideoId(url) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }

        function onPlayerStateChange(event) {

            checkVideoProgress(event.target);

            if (event.data === YT.PlayerState.ENDED) {
                showProtectionOverlay();
            }
        }

        function onPlayerReady(event) {

            setInterval(function() {
                checkVideoProgress(event.target);
            }, 1000);
        }

        function checkVideoProgress(player) {
            try {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();

                if (currentTime >= 563 || currentTime / duration > 0.98) {
                    showProtectionOverlay();
                } else {
                    hideProtectionOverlay();
                }
            } catch (e) {
                console.log('无法检查视频进度', e);
            }
        }

        function showProtectionOverlay() {
            protectionOverlay.style.display = 'block';

            adjustOverlaySize();
        }

        function hideProtectionOverlay() {
            protectionOverlay.style.display = 'none';
        }

        function adjustOverlaySize() {
            const wrapperRect = videoWrapper.getBoundingClientRect();

            if (window.innerWidth <= 768) {
                protectionOverlay.style.width = wrapperRect.width + 'px';
                protectionOverlay.style.height = wrapperRect.height * 0.85 + 'px';
            } else {

                protectionOverlay.style.width = '1045px';
                protectionOverlay.style.height = '1047.26px';
            }
        }

        window.addEventListener('resize', function() {
            if (protectionOverlay.style.display === 'block') {
                adjustOverlaySize();
            }
        });

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {

                if (mutation.addedNodes && mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];

                        if (node.classList &&
                            (node.classList.contains('ytp-endscreen-content') ||
                             node.classList.contains('ytp-videowall-still'))) {
                            showProtectionOverlay();
                            break;
                        }
                    }
                }
            });
        });

        observer.observe(videoWrapper, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        function loadYouTubeAPI() {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            if (window.YT && window.YT.Player) {
                onYouTubeIframeAPIReady();
            } else {

                window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
            }
        }

        loadYouTubeAPI();

        let backupCheckInterval;
        function setupBackupDetection() {

            backupCheckInterval = setInterval(function() {

                const endScreenContent = document.querySelector('.ytp-endscreen-content');
                const videowallStills = document.querySelectorAll('.ytp-videowall-still');

                if (endScreenContent || videowallStills.length > 0) {
                    showProtectionOverlay();
                }
            }, 1000);
        }

        setupBackupDetection();

        window.addEventListener('beforeunload', function() {
            observer.disconnect();
            if (backupCheckInterval) {
                clearInterval(backupCheckInterval);
            }
        });
    });
})();
