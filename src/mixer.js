/*
 * Youtube Seamless Video Mixer
 * @author http://github.com/SamJUK
 * @docs https://github.com/SamJUK/Youtube-Seamless/blob/master/readme.md
 */
window.SamJ_Mixer = (function (window) {
    //--------------------------
    //---------------- Variables
    //--------------------------
    var containerID = 'overlay',		// Container to inject videos into
        version = 1,                    // Script Version Number
        GAPIKey = null,					// Google API Key (Used for fetching playlist data)
        GAPImaxResults = 50,			// Youtube Playlist Max Results
        startImage = null,				// URL for buffer image
        startImageShowing = false,		// Is buffer image Showing?
        playAudio = false,              // Allow Clip Audio
        fadeOutTime = 750, 		        // In ms - Crossover fade between clips ting
        APIReady = false,				// Is the API ready to be used?
        safezone = (1000 + fadeOutTime),// Safezone in ms added onto last load time
        loadStartTime = null,			// Epoch time of the video transition Start
        firstplay = true,				// Is this the first video playing?
        loadTime = 1500, 				// Default Load Time Value ms
        PlaylistReady = false,			// Is the playlist ready to be played?
        debug_enabled = true,			// Is script in debug mode (Console Logging)
        playing = 0,					// Current playing videos Index
        isPlaying = false,				// Is a video currently playing
        queue = [],						// Array containing video ID's and parameters
        playlistId = null,				// If using a youtube playlist, its ID
        lastPlayed = null,				// Last played track Index
        shuffle = false,				// Choose a random video from the queue each time instead of linear playback
        nintyTimer = null,				// Timer to initiate Crossfade
        fadeTimer = null,               // Timer for fade between videos
        tVideoVar = [],					// Container for youtube playerss
        lastBufferStartTime = null,     // Epoch time of when the last buffer started
        networkDropped = false,         // Have we dropped connection
        transitionOnEnd = true,         // Switch to next video at the end of current.
        audioInterval = null,
        showVersionInConsole = true;

    //--------------------------
    //------- Polyfill Functions
    //--------------------------
    if(typeof console.group !== 'function') {
        console.group = function (name) {
            console.log('--- GROUP STARTED: ' + name + '---');
        };
    }
    if(typeof console.groupCollapsed !== 'function') {
        console.groupCollapsed = function (name) {
            console.log('--- GROUP STARTED: ' + name + '---');
        };
    }
    if(typeof console.groupEnd !== 'function') {
        console.groupEnd = function (name) {
            console.log('--- GROUP ENDED: ' + name + '---');
        };
    }


    //--------------------------
    //------- Internal Functions
    //--------------------------

    /**
     * Inject Youtube API
     */
    (function init() {
        if(showVersionInConsole) {
            var console_info = ["%c Youtube Seamless %cv"+version+" %c https://github.com/SamJUK/youtube-seamless", "background: #000000;color: #00ff99", "background: #000000;color: #fff", ""];
            console.log.apply(console, console_info);
        }

        loadGoogleAPIs();
        window.addEventListener('resize', handleWindowResize);
    })();

    /**
     * @TODO: Add config flags to not load x API (Project may already load in other script)
     */
    function loadGoogleAPIs() {
        debug("LOADING API");
        var apis = ['https://apis.google.com/js/client.js?onload=onGAPIReady', 'https://www.youtube.com/iframe_api'];
        for (var i = 0; i < apis.length; i++) {
            var tag = document.createElement('script');
            tag.src = apis[i];
            document.body.appendChild(tag);
        }
    }

    /**
     * Handle Adding Videos To The Queue Manually
     * @param id
     * @param opts
     */
    function playlistPush(id, opts) {
        debug('#' + id + ' has been pushed to the queue.');

        // Default Options
        var temp = {};
        temp.id = id;
        temp.start = opts.start || 0;
        temp.end = opts.end || -1;

        queue.push(temp);
    }

    /**
     * Handle Preloading Next Video
     *
     * @TODO: Refactor
     */
    function loadNextVideo() {
        // Guards
        if (queue.length === 0) {
            return debug('Empty Queue!', 'error');
        }
        if (queue.length === 1) {
            return debug('Add more videos for an optimal experience', 'warn');
        }
        if (tVideoVar.length >= 2) {
            return debug('Aborting Preload, already a video waiting', 'warn');
        }

        // Linear Playback
        if (!SamJ_Mixer.shuffle && (++playing >= queue.length)) {
            playing = 0;
        } else {
            // Shuffle Play
            var unique = false;
            while (!unique) {
                playing = Math.round(Math.random() * queue.length) - 1;
                if (lastPlayed === null || playing !== lastPlayed) {
                    unique = true;
                }
            }
        }

        if (playing < 0) {
            playing = 0;
        }

        debug('Loading Next Video: #' + queue[playing].id);
        loadVideo(queue[playing]);
        lastPlayed = queue[playing];
    }

    /**
     * Handle Loading The Video
     * @param video
     *
     * @TODO: Refactor - Abstract First play into own function
     */
    function loadVideo(video) {
        // Create a temp element and spawn a youtube process on it
        var tempElement = document.createElement('div');
        document.getElementById(containerID).appendChild(tempElement);
        yt_video = createYoutubePlayer(video.id);

        // This is the first video
        if (firstplay) {
            firstplay = false;
            yt_video.a.className = "active";

            debug(video.id);
            var event = new CustomEvent('FirstVideoLoad', {
                detail: {
                    video_id: video.id
                }
            });
            document.getElementById(containerID).dispatchEvent(event);
        }

        // Add to our Youtube Container
        tVideoVar.push(yt_video);
    }

    function createYoutubePlayer(videoID) {
        var tempElement = document.createElement('div');
        document.getElementById(containerID).appendChild(tempElement);

        return new YT.Player(tempElement, {
            videoId: videoID,
            playerVars: {
                volume: 1,
                controls: 0,
                disablekb: 1,
                iv_load_policy: 3,
                showinfo: 0,
                rel: 0,
                start: video.start,
                modestbranding: 1
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });
    }

    /**
     * Handle Preloading next video on video change
     * @param data
     */
    function onPlayerReady(data) {
        // First Video Play (Simulate Video Click)
        if (!isPlaying) {
            data.target.playVideo();
            isPlaying = true;
        }

        // Preload Next Video
        if (tVideoVar.length < 2) {
            loadNextVideo();
        }
    }

    /**
     * Youtube Callback Invoked Start
     */
    function onAPIReady() {
        APIReady = true;
        if (PlaylistReady) {
           loadNextVideo();
        }
    }

    /**
     * User Invoked Start
     */
    function startPlayer() {
        PlaylistReady = true;
        if (APIReady) {
            loadNextVideo();
        }
    }

    /**
     * Handle Youtube Player State Changed
     * @param event
     */
    function onPlayerStateChange(event) {
        // Next Video Has Started Playing
        if (event.data === YT.PlayerState.PLAYING) {
            return handlePlayerPlaying(event);
        }

        if (event.data === YT.PlayerState.ENDED) {
            return handlePlayerEnd(event);
        }

        if (event.data === YT.PlayerState.BUFFERING) {
            return handlePlayerBuffering(event);
        }
    }

    /**
     * Handle Youtube Video End Event
     * @param event
     */
    function handlePlayerEnd(event) {
        debug('Ended ' + event.target.getVideoData().title);

        var video_id = event.target.getVideoData().video_id;
        debug(video_id);
        var event = new CustomEvent('VideoEnded', {
            detail: {
                video_id: video_id
            }
        });
        document.getElementById(containerID).dispatchEvent(event);

        // Remove Played Video
        event.target.a.outerHTML = '';
        tVideoVar.splice(0, 1);
        debug('Removed ' + tVideoVar[0].getVideoData().title);

        // Load Next Video
        loadNextVideo();
    }

    /**
     * Handle Youtube Playing Event
     * @param event
     */
    function handlePlayerPlaying(event) {
        // Mute Video
        if(!SamJ_Mixer.playAudio) {
            event.target.mute();
        }

        if(networkDropped) {
            handleNetworkDropPlaying(event);
        } else {
            handleNewVideoPlaying(event);
        }
    }

    /**
     * Handle Player Buffering
     * @param event
     */
    function handlePlayerBuffering(event) {
        lastBufferStartTime = (new Date()).getTime();

        // Network Dropped so rebind nintytimer
        if(event.target.getCurrentTime() === 0 || event.target.getCurrentTime() === queue[playing].start) {
            return;
        }

        networkDropped = true;
        debug('Network Issue, Started Buffering...', 'warn');
        
        if(nintyTimer !== null) {
            debug('Removed Ninty Timer');
            clearTimeout(nintyTimer);
            nintyTimer = null;
        }

        if(fadeTimer !== null) {
            debug('Removed Fade Timer');
            clearTimeout(fadeTimer);
            fadeTimer = null;
        }

        toggleBufferImage(true);
    }

    /**
     * Started playing again after network drop
     * @param event
     */
    function handleNetworkDropPlaying(event) {
        networkDropped = false;
        debug('--------------------------');
        debug('Recovered from network drop');
        handleVideoPlay(event);
    }

    /**
     * Started playing a new video
     * @param event
     */
    function handleNewVideoPlaying(event) {
        console.groupCollapsed('Video Playing');
        debug('--------------------------');
        debug('Next Video Started Playing');

        loadTime = (new Date()).getTime() - lastBufferStartTime;
        debug('Took ' + loadTime + 'ms to init next video play');
        debug('Playing ' + event.target.getVideoData().title);

        handleVideoPlay(event);

        var video_id = event.target.getVideoData().video_id;
        debug(video_id);
        var event = new CustomEvent('NewVideoPlaying', {
            detail: {
                video_id: video_id
            }
        });
        document.getElementById(containerID).dispatchEvent(event);
    }


    /**
     * @param event
     *
     * @TODO: Refactor, function wayyy to big
     */
    function handleVideoPlay(event) {
        var length;

        // Get Video Duration
        if((queue[playing].end !== -1) && (queue[playing].end > queue[playing].start)) {
            length = queue[playing].end;
        } else {
            length = event.target.getDuration();
        }

        length -= event.target.getCurrentTime(); // Remove time already played

        var transTime = (loadTime + safezone);   // Calculate Transition Time (Previous Load Time + Safezone)

        toggleBufferImage(false);

        // Create our transition timer
        if(nintyTimer !== null) {
            clearTimeout(nintyTimer);
            nintyTimer = null;
        }

        var nintyTimerLength = ((length * 1000) - transTime) - safezone;
        nintyTimer = setTimeout(function () {
            if (tVideoVar.length <= 1) {
                return;
            }

            // Play 2nd Videos
            debug('Init play of next video');
            loadStartTime = Date.now(); // Set time of transition start
            tVideoVar[1].playVideo();   // Init Play Of Next Video
        }, nintyTimerLength);
        debug('Video Overlap @ ' + (nintyTimerLength / 1000).toString() + 's');

        setTimeout(function () {
            var i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
            window.asd = tVideoVar[i];
            tVideoVar[i].setVolume(0);
        }, 1500);

        // Fade out timer
        if(transitionOnEnd || (!transitionOnEnd && fadeTimer === null)) {
            var fadeTimerLength = (length * 1000) - fadeOutTime;
            fadeTimer = setTimeout(function () {
                var i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
                var ii = (i === 1) ? 0 : 1;
                tVideoVar[i].a.className = "active";
                tVideoVar[ii].a.className = "";
            }, fadeTimerLength);
        } else {
            var i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
            var ii = (i === 1) ? 0 : 1;
            tVideoVar[i].a.className = "active";
            tVideoVar[ii].a.className = "";
            console.log(tVideoVar[ii]);
        }

        debug('Fadeout @ ' + (fadeTimerLength / 1000).toString() + 's');
        debug('Video Progress: ' + event.target.getCurrentTime());
        debug('Video Length: ' + event.target.getDuration());
        debug('--------------------------');
        console.groupEnd('Video Playing');
    }

    /**
     * Toggles Buffer Image
     * @param bool
     * @returns bool
     */
    function toggleBufferImage(bool) {
        var buffer_images = document.getElementsByClassName('bufferImage');

        if (buffer_images.length === 0) {
            return console.error('No Buffer Image');
        }

        for (var i = 0; i < buffer_images.length; i++) {
            buffer_images[i].style.opacity = bool ? 1 : 0;
        }

        return startImageShowing = bool;
    }

    /**
     * Event Handler For Window Resizing
     */
    function handleWindowResize() {
        // Set all current rendered youtube videos to fill the new screen size
        for (var key in tVideoVar) {
            tVideoVar[key].setSize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Handle Displaying Debug Logic
     */
    function debug(message, severity) {
        if(!debug_enabled && severity !== 'error') {
            return;
        }

        if(['info', 'warn', 'error'].includes(severity) === false){
            severity = 'info';
        }

        console[severity]('+ Youtube Seamless: ' + message);
    }

    //--------------------------
    //------------ Get | Setters
    //--------------------------
    var SamJ_Mixer = {
        playlist: {
            push: playlistPush,
            id: playlistId
        },
        onAPIReady: onAPIReady,
        startPlayer: startPlayer,
        gapi: {
            key: GAPIKey,
            maxResults: GAPImaxResults
        },
        debug: debug,
        tVideoVar: tVideoVar,
        startImage: startImage,
        shuffle: shuffle,
        toggleBufferImage: toggleBufferImage,
        windowResized: handleWindowResize,
        playAudio: playAudio
    };

    return SamJ_Mixer;
})(window);

/**
 * Youtube Callback Function, Need to be decalred in global space
 */
(function () {
    /**
     * Callback Event For Youtube Iframe API Ready
     */
    window.onYouTubeIframeAPIReady = function () {
        SamJ_Mixer.debug("API READY");
        if (SamJ_Mixer.gapi.key === null) {
            SamJ_Mixer.onAPIReady();
        }
    };

    /**
     * Callback Event For Youtube Google API Ready
     *
     * @TODO: Refactor
     */
    window.onGAPIReady = function () {
        SamJ_Mixer.debug('GAPI READY');
        if (SamJ_Mixer.gapi.key === null) {
            return;
        }
        gapi.client.setApiKey(SamJ_Mixer.gapi.key);
        gapi.client.load('youtube', 'v3', function () {
            if(SamJ_Mixer.playlist.id !== null) {
                var request = gapi.client.youtube.playlistItems.list({
                    part: 'snippet,contentDetails',
                    playlistId: SamJ_Mixer.playlist.id,
                    maxResults: SamJ_Mixer.gapi.maxResults
                });
                request.execute(function (response) {
                    console.groupCollapsed('Playlist items');
                    for (var i = 0; i < response.items.length; i++) {
                        SamJ_Mixer.playlist.push(response.items[i].snippet.resourceId.videoId, {start: 0, end: -1});
                    }
                    console.groupEnd('Playlist items');

                    SamJ_Mixer.startPlayer();
                });
            }
        });
        SamJ_Mixer.onAPIReady();
    };
})();
