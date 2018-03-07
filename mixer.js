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
        consoleLog = '+ SamJ Mixer: ',	// Console log Suffix
        GAPIKey = null,					// Google API Key (Used for fetching playlist data)
        GAPImaxResults = 50,			// Youtube Playlist Max Results
        startImage = null,				// URL for buffer image
        startImageShowing = false,		// Is buffer image Showing?
        fadeOutTime = 500, 				// In ms - Crossover fade between clips ting
        APIReady = false,				// Is the API ready to be used?
        safezone = (1000 + fadeOutTime),// Safezone in ms added onto last load time
        loadStartTime = null,			// Epoch time of the video transition Start
        firstplay = true,				// Is this the first video playing?
        loadTime = 1500, 				// Default Load Time Value ms
        PlaylistReady = false,			// Is the playlist ready to be played?
        debug = true,					// Is script in debug mode (Console Logging)
        playing = 0,					// Current playing videos Index
        isPlaying = false,				// Is a video currently playing
        queue = [],						// Array containing video ID's and parameters
        playlistId = null,				// If using a youtube playlist, its ID
        lastPlayed = null,				// Last played track Index
        shuffle = false,				// Choose a random video from the queue each time instead of linear playback
        nintyTimer = null,				// Timer to initiate Crossfade
        tVideoVar = [],					// Container for youtube player JS Elections
        tVideoDom = [],					// Container for Youtube player DOM Elements
        lastBufferStartTime = null;     // Epoch time of when the last buffer started

    //--------------------------
    //------- Internal Functions
    //--------------------------

    /**
     * Inject Youtube API
     * @TODO: Add config flags to not load x API (Project may already load in other script)
     */
    (function init() {

        if (debug) console.log(consoleLog + "LOADING API");
        var apis = ['https://apis.google.com/js/client.js?onload=onGAPIReady', 'https://www.youtube.com/iframe_api'];
        for (var i = 0; i < apis.length; i++) {
            var tag = document.createElement('script');
            tag.src = apis[i];
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.addEventListener('resize', handleWindowResize);
    })();

    /**
     * Handle Adding Videos To The Queue Manually
     * @param id
     * @param opts
     */
    function playlistPush(id, opts) {
        if (debug) console.log(consoleLog + '#' + id + ' has been pushed to the queue.');

        // Default Options
        var temp = {};
        temp.id = id;
        temp.start = opts.start || 0;
        temp.end = opts.playfor || -1;

        queue.push(temp);
    }

    /**
     * Handle Preloading Next Video
     */
    function loadNextVideo() {
        // Guards
        if (queue.length === 0) return console.error(consoleLog + 'Empty Queue!');
        if (debug && queue.length === 1) return console.warn(consoleLog + 'Add more videos for an optimal experience');
        if (debug && tVideoVar.length >= 2) return console.warn(consoleLog + 'Aborting Preload, already a video waiting');

        // Linear Playback
        if (!SamJ_Mixer.shuffle && (++playing >= queue.length)) {
            playing = 0;
        } else {
            // Shuffle Play
            var unique = false;
            while (!unique) {
                playing = Math.round(Math.random() * queue.length) - 1;
                if (lastPlayed === null || playing !== lastPlayed) unique = true;
            }
        }
        if (playing < 0) playing = 0;
        if (debug) console.log(consoleLog + 'Loading Next Video: #' + queue[playing].id);
        loadVideo(queue[playing]);

        lastPlayed = queue[playing];
    }

    /**
     * Handle Loading The Video
     * @param video
     */
    function loadVideo(video) {
        // Create a temp element and spawn a youtube process on it
        var tempElement = document.createElement('div');
        document.getElementById(containerID).appendChild(tempElement);
        video = new YT.Player(tempElement, {
            videoId: video.id,
            playerVars: {
                volume: 0,
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

        // This is the first video
        if (firstplay) {
            firstplay = false;
            video.a.className = "active";
        }

        // Add to our Youtube Containers
        tVideoVar.push(video);
        tVideoDom.push(tempElement);
    }

    /**
     * Handle Preloading next video on video change
     * @param data
     */
    function onPlayerReady(data) {
        data.target.mute();	// Mute Video @TODO: Make Configurable & Add Audio Crossfade

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
     * @TODO: Better Way?
     */
    function onAPIReady() {
        APIReady = true;
        if (PlaylistReady) loadNextVideo();
    }

    /**
     * User Invoked Start
     * @TODO: Better Way?
     */
    function startPlayer() {
        PlaylistReady = true;
        if (APIReady) loadNextVideo();
    }

    /**
     * Handle Youtube Player State Changed
     * @param event
     */
    function onPlayerStateChange(event) {
        // Next Video Has Started Playing
        if (event.data === YT.PlayerState.PLAYING)
            handlePlayerPlaying(event);

        if (event.data === YT.PlayerState.ENDED)
            handlePlayerEnd(event);

        if (event.data === YT.PlayerState.BUFFERING)
            handlePlayerBuffering(event);
    }

    /**
     * Handle Youtube Video End Event
     * @param event
     */
    function handlePlayerEnd(event) {
        if (debug) console.log(consoleLog + 'Ended ' + event.target.getVideoData().title);

        // Remove Played Video
        event.target.a.outerHTML = '';
        tVideoVar.splice(0, 1);
        if (debug) console.log(consoleLog + 'Removed ' + tVideoVar[0].getVideoData().title);

        // Load Next Video
        loadNextVideo();
    }

    /**
     * Handle Youtube Playing Event
     * @param event
     */
    function handlePlayerPlaying(event) {
        if (debug) console.log(consoleLog + '--------------------------');
        if (debug) console.log(consoleLog + 'Next Video Started Playing');

        loadTime = (new Date()).getTime() - lastBufferStartTime;
        if(debug) console.log(consoleLog + 'Took ' + loadTime + 'ms to init next video play');

        if (debug) console.log(consoleLog + 'Playing ' + event.target.getVideoData().title);

        var length = event.target.getDuration(); // Video Length In Seconds
        var transTime = (loadTime + safezone);   // Calculate Transition Time (Previous Load Time + Safezone)

        toggleBufferImage(false);


        // Create our transition timer
        // @TODO: Handle network drops, rebuild nintyTimer?
        nintyTimer = setTimeout(function () {
            if (tVideoDom.length <= 1) return;

            // Play 2nd Videos
            if (debug) console.log(consoleLog + 'Init play of next video');
            loadStartTime = Date.now(); // Set time of transition start
            tVideoVar[1].playVideo();   // Init Play Of Next Video
        }, ((length * 1000) - transTime) - safezone);
        if(debug)console.log(consoleLog + 'Video Overlap @ ' + ((((length * 1000) - transTime) - safezone) / 1000).toString() + 's');

        // Fade out timer
        // @TODO: Make Fade Work Properly
        // @TODO: Add option to transition when next clip loads or after current clip finishes
        setTimeout(function () {
            var i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
            var ii = (i === 1) ? 0 : 1;
            tVideoVar[i].a.className = "active";
            tVideoVar[ii].a.className = "";
        }, (length * 1000) - fadeOutTime);
        if(debug) console.log(consoleLog + 'Fadeout @ ' + (((length * 1000) - fadeOutTime) / 1000).toString() + 's');
        if (debug) console.log(consoleLog + '--------------------------');
    }

    /**
     * Handle Player Buffering
     * @param event
     */
    function handlePlayerBuffering(event) {
        lastBufferStartTime = (new Date()).getTime();
    }

    /**
     * Toggles Buffer Image
     * @param bool
     * @returns bool
     */
    function toggleBufferImage(bool) {
        //if(typeof(bool) !== 'boolean') bool = !startImageShowing;

        // Hide the buffer image
        if (document.getElementsByClassName('bufferImage').length > 0) {
            for (var i = 0; i < document.getElementsByClassName('bufferImage').length; i++)
                document.getElementsByClassName('bufferImage')[i].style.opacity = (bool) ? 1 : 0;
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
        tVideoDom: tVideoDom,
        tVideoVar: tVideoVar,
        startImage: startImage,
        shuffle: shuffle,
        toggleBufferImage: toggleBufferImage,
        windowResized: handleWindowResize
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
        if (SamJ_Mixer.debug) console.log("+ SamJ Mixer: API READY");
        if (SamJ_Mixer.gapi.key === null) SamJ_Mixer.onAPIReady();
    };

    /**
     * Callback Event For Youtube Google API Ready
     */
    window.onGAPIReady = function () {
        if (SamJ_Mixer.debug) console.log("+ SamJ Mixer: GAPI READY");
        if (SamJ_Mixer.gapi.key === null) return;
        gapi.client.setApiKey(SamJ_Mixer.gapi.key);
        gapi.client.load('youtube', 'v3', function () {
            var request = gapi.client.youtube.playlistItems.list({
                part: 'snippet,contentDetails',
                playlistId: SamJ_Mixer.playlist.id,
                maxResults: SamJ_Mixer.gapi.maxResults
            });
            request.execute(function (response) {
                for (var i = 0; i < response.items.length; i++)
                    SamJ_Mixer.playlist.push(response.items[i].snippet.resourceId.videoId, {start: 0, playfor: -1});

                SamJ_Mixer.startPlayer();
            });
        });
        SamJ_Mixer.onAPIReady();
    };
})();
