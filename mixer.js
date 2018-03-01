//
// @docs https://github.com/SamJUK/Youtube-Seamless/blob/master/readme.md
//
window.SamJ_Mixer = (function(window){
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
		APIReady = false,				//
		safezone = (1000 + fadeOutTime),// Safezone in ms added onto last load time
		loadStartTime = null,			//
		firstplay = true,				// Is this the first video playing?
		loadTime = 1500, 				// Default Load Time Value ms
		PlaylistReady = false,			//
		debug = true,					//
		playing = -1,					//
		isPlaying = false,				//
		queue = [],						//
		playlistId = null,				//
		lastPlayed = null,				//
        shuffle = false,				// Choose a random video from the queue each time instead of linear playback
		nintyTimer = null,				//
		tVideoVar = [],					//
		tVideoDom = [];					//

	//--------------------------
	//------- Internal Functions
	//--------------------------

	// Inject Youtube API
	(function init(){

		if(debug) console.log(consoleLog + "LOADING API");
		var apis = ['https://apis.google.com/js/client.js?onload=onGAPIReady', 'https://www.youtube.com/iframe_api'];
		for(var i=0;i<apis.length;i++){
			var tag = document.createElement('script');
			tag.src = apis[i];
			var firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
		}

		window.addEventListener('resize', handleWindowResize);
	})();

	// Handle Adding Videos To The Queue Manually
	function playlistPush(id, opts){
		if(debug)console.log(consoleLog+'#'+id+' has been pushed to the queue.');

		// Default Options
		var temp = {};
		temp.id = id;
		temp.start = opts.start || 0;
		temp.end = opts.playfor || -1;

		queue.push(temp);
	}

	// Handle Preloading Next Video
	function loadNextVideo(){
		if(queue.length === 0) return console.error(consoleLog + 'Empty Queue!');
		if(debug && queue.length === 1) return console.warn(consoleLog + 'Add more videos for an optimal experience');

		if(debug && tVideoVar.length >= 2) return console.warn(consoleLog+'Aborting Preload, already a video waiting');

		// Linear Playback
		if(!SamJ_Mixer.shuffle && (++playing >= queue.length)){
			playing = 0;
		}else{
            var unique = false;
			while(!unique){
				playing = Math.round(Math.random() * queue.length);
                console.log(playing);
                console.log(lastPlayed);
				if(lastPlayed === null || playing !== lastPlayed) unique = true;
			}

		}

        console.log(consoleLog+playing);
        console.log(consoleLog+JSON.stringify(queue[playing]));
		if(debug)console.log(consoleLog + 'Loading Next Video: #' + queue[playing].id);
		loadVideo(queue[playing]);

		lastPlayed = queue[playing];
	}

	// Handle Loading The Video
	function loadVideo(video){
		//let ap = (tVideoVar.length == 0) ? 1 : 0;
		var tempElement = document.createElement('div');
		document.getElementById(containerID).appendChild(tempElement);
		video = new YT.Player(tempElement, {
			videoId: video.id,
			playerVars: {
				//autoplay: ap, // Removed as of Jan 2018
				volume: 0,
				controls: 0,
				disablekb:1,
				iv_load_policy:3,
				showinfo:0,
				rel:0,
				start:video.start,
				modestbranding: 1
			},
			events: {
				onReady: onPlayerReady,
				onStateChange: onPlayerStateChange,
			}
		});

		if(firstplay) {
			firstplay = false;
			video.a.className = "active";
		}
		tVideoVar.push(video);
		tVideoDom.push(tempElement);
	}

	// Handle Preloading next video on vide change
	function onPlayerReady(data){
		data.target.mute();
		if(!isPlaying){
			// First Video Play
			data.target.playVideo();
			isPlaying = true;
		}

		if(tVideoVar.length < 2){
			// Preload Next Video
			loadNextVideo();
		}
	}

	// Youtube Callback Invoked Start
	function onAPIReady(){
		APIReady = true;
		if(PlaylistReady) loadNextVideo();
	}

	// User Invoked Start
	function startPlayer(){
		//handleBufferImage();
		PlaylistReady = true;
		if(APIReady)loadNextVideo();
	}

	// Handle YT Player State Change
	function onPlayerStateChange(event){
		if(event.data === 1){
			if(loadStartTime !== null) {
				loadTime = Date.now() - loadStartTime;
				if(debug)console.log(consoleLog+'Took ' + loadTime + 'ms to init next video play');
			}
			if(debug)console.log(consoleLog+'Next Video Started Playing');
		}
		if(event.data === YT.PlayerState.PLAYING)
			handlePlayerPlaying(event);
		if(event.data === YT.PlayerState.ENDED)
			handlePlayerEnd(event);
	}

	function handlePlayerEnd(event){
		if(debug)console.log(consoleLog+'Ended ' + event.target.getVideoData().title);

		// Remove Played Video
		if(debug)console.log(consoleLog+'Removed ' + tVideoVar[0].getVideoData().title)
		event.target.a.outerHTML = '';
		tVideoVar.splice(0, 1);

		// Load Next Video
		loadNextVideo();
	}

	function handlePlayerPlaying(event){
		var length = event.target.getDuration(); // In Seconds
		var transTime = (loadTime + safezone);
		if(debug)console.log(consoleLog+'Playing ' + event.target.getVideoData().title);

		if(document.getElementsByClassName('bufferImage').length > 0){
			document.getElementsByClassName('bufferImage')[0].style.opacity = 0;
		}

		nintyTimer = setTimeout(function(){
			if(tVideoDom.length > 1){
				// Play 2nd Videos
				loadStartTime = Date.now();
				if(debug)console.log(consoleLog+'Init play of next video');
				tVideoVar[1].playVideo();
				setTimeout(function(){
					// console.log(tVideoVar[0].getPlayerState());
					// console.log(tVideoVar[1]);
					// console.log(Object.keys(tVideoVar[1]));
					var i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
					var ii = (i === 1) ? 0 : 1;
					tVideoVar[i].a.className = "active";
					tVideoVar[ii].a.className = "";
				},(fadeOutTime + safezone));
			}
		}, (length * 1000) - transTime);
		if(debug)console.log(consoleLog+'Set Transition for: ' + ((length * 1000) - transTime) / 1000 + 's' + ' : Length is ' + length + 's')
	}

	function toggleBufferImage(bool){
		if(typeof(bool) !== 'boolean') return console.log(consoleLog + 'Toggle Buffer Image Requires a boolean as a parameter');
		return startImageShowing = !startImageShowing;
	}

	function handleWindowResize(){
		for(var key in tVideoVar){
			tVideoVar[key].setSize(window.innerWidth, window.innerHeight);
		}
	}

	//--------------------------
	//------------ Get | Setters
	//--------------------------
	var SamJ_Mixer = {
		playlist:{
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
		startImageShowing: toggleBufferImage,
		windowResized: handleWindowResize
	};

	return SamJ_Mixer;
})(window);


// Youtube Callback Functions
// Need to be declared in global space
(function(){
	window.onYouTubeIframeAPIReady = function() {
		if(SamJ_Mixer.debug) console.log("+ SamJ Mixer: API READY");
		if(SamJ_Mixer.gapi.key === null) SamJ_Mixer.onAPIReady();
	};

	window.onGAPIReady = function(){
		if(SamJ_Mixer.debug)console.log("+ SamJ Mixer: GAPI READY");
		if(SamJ_Mixer.gapi.key === null) return;
		gapi.client.setApiKey(SamJ_Mixer.gapi.key);
		gapi.client.load('youtube', 'v3', function () {
			var request = gapi.client.youtube.playlistItems.list({
				part: 'snippet,contentDetails',
				playlistId: SamJ_Mixer.playlist.id,
				maxResults: SamJ_Mixer.gapi.maxResults
			});
			request.execute(function (response) {
				for (var i = 0; i < response.items.length; i++)
					SamJ_Mixer.playlist.push(response.items[i].snippet.resourceId.videoId,{start:0,playfor:-1});

				SamJ_Mixer.startPlayer();
			});
		});
		SamJ_Mixer.onAPIReady();
	};
})();
