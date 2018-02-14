window.SamJ_Mixer = (function(window){

	//--------------------------
	//---------------- Variables
	//--------------------------
	let consoleLog = '+ SamJ Mixer: ',
	fadeOutTime = 500, // In ms - Crossover fade between clips ting
	APIReady = false,
	safezone = (1000 + fadeOutTime), // Safezone in ms added onto last load time
	loadStartTime = null,
	firstplay = true,
	loadTime = 1500, // Default Load Time Value ms
	PlaylistReady = false,
	debug = true,
	playing = -1,
	isPlaying = false,
	playList = [],
	lastPlayed = null,
	shuffle = false,
	containerID = 'overlay',
	nintyTimer = null,
	tVideoVar = [],
	tVideoDom = [];

	//--------------------------
	//------- Internal Functions
	//--------------------------

	// Load API Youtube
	(function init(){
		if(debug) console.log(consoleLog + "LOADING API");
		let tag = document.createElement('script');
		tag.src = "https://www.youtube.com/iframe_api";

		let firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
	})();

	// Handle Adding Videos To Playlist
	function playlistPush(id, opts){
		if(debug)console.log(`${consoleLog}#${id} has been pushed to the playlist.`);

		// Default Options
		let temp = {};
		temp.id = id;
		temp.start = opts.start || 0;
		temp.end = opts.playfor || -1;

		playList.push(temp);
	};

	// Handle Preloading Next Video
	function loadNextVideo(){
		if(playList.length == 0) return console.error(consoleLog + 'Empty Playlist!');
		if(debug && playList.length == 1) return console.warn(consoleLog + 'Add more videos for an optimal experience');

		if(debug && tVideoVar.length >= 2) return console.warn(consoleLog+'Aborting Preload, already a video waiting');

		// Linear Playback
		if(!shuffle){
			playing++;
			if(playing >= playList.length) playing = 0;
		};

		if(debug)console.log(consoleLog + 'Loading Next Video: #' + playList[playing].id);
		loadVideo(playList[playing]);

		lastPlayed = playList[playing];
	};

	// Handle Loading The Video
	function loadVideo(video){
		//let ap = (tVideoVar.length == 0) ? 1 : 0;
		var tempElement = document.createElement('div');
		document.getElementById(containerID).appendChild(tempElement);
		var video = new YT.Player(tempElement, {
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
		};
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
		PlaylistReady = true;
		if(APIReady)loadNextVideo();
	}

	// Handle YT Player State Change
	function onPlayerStateChange(event){
		if(event.data == 1){
			if(loadStartTime !== null) {
				loadTime = Date.now() - loadStartTime;
				if(debug)console.log(consoleLog+'Took ' + loadTime + 'ms to init next video play');
			}
			if(debug)console.log(consoleLog+'Next Video Started Playing');
		}
		if(event.data == YT.PlayerState.PLAYING)
			handlePlayerPlaying(event);
		if(event.data == YT.PlayerState.ENDED)
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
		let length = event.target.getDuration(); // In Seconds
		let transTime = (loadTime + safezone);
		if(debug)console.log(consoleLog+'Playing ' + event.target.getVideoData().title);

		nintyTimer = setTimeout(()=>{
			if(tVideoDom.length > 1){
				// Play 2nd Videos
				loadStartTime = Date.now();
				if(debug)console.log(consoleLog+'Init play of next video');
				console.log(tVideoVar);
				tVideoVar[1].playVideo();
				setTimeout(()=>{
					// console.log(tVideoVar[0].getPlayerState());
					// console.log(tVideoVar[1]);
					// console.log(Object.keys(tVideoVar[1]));
					let i = (tVideoVar[1].hasOwnProperty('getPlayerState')) ? 1 : 0;
					let ii = (i == 1) ? 0 : 1;
					tVideoVar[i].a.className = "active";
					tVideoVar[ii].a.className = "";
				},(fadeOutTime + safezone));
			}
		}, (length * 1000) - transTime);
		if(debug)console.log(consoleLog+'Set Transition for: ' + ((length * 1000) - transTime) / 1000 + 's' + ' : Length is ' + length + 's')
	}

	//--------------------------
	//------------ Get | Setters
	//--------------------------
	var SamJ_Mixer = {
		playlist:{
			push: playlistPush
		},
		onAPIReady: onAPIReady,
		startPlayer: startPlayer,
		debug: debug,
		tVideoDom: tVideoDom,
		tVideoVar: tVideoVar
	};

	return SamJ_Mixer;
})(window);


// Need to be declared in global Scope
(function(){
	window.onYouTubeIframeAPIReady = function() {
		if(SamJ_Mixer.debug)console.log("+ SamJ Mixer: API READY");
		SamJ_Mixer.onAPIReady();
	}
})();
