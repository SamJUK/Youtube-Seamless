# Youtube Seamless
Youtube Seamless is a javascript libaray that allows for playback of youtube videos and aims to remove the buffering between each of the videos. By initating the playback of the next video before the current active one finishes, using the buffer time of the previous video. 


# Content
1. [Getting Started](#Getting-started)
2. [Support Guide](#support-guide)
3. [Todo](#todo)


# Getting Started
- First add your DOM container for the youtube players to reside, and a buffer image to show while the inital video is buffering
```html
<div id="overlay">
    <img class="bufferImage" src="https://via.placeholder.com/1280x720"/>
</div> 
```
- Next include the javascript libary in the footer of your application
```html
<script type="text/javascript" src="path/to/libary/mixer.js"></script>
```

- Now you want to build your playlist and initate the playback, either by declaring indiviual playlist id's or creating a playlist
```html
<script type="text/javascript">
(function(){
    SamJ_Mixer.gapi.key = 'YOUR_GAPI_KEY';
    SamJ_Mixer.playlist.id = 'PLAYLIST_ID';
})();
</script>
```

```html
<script type="text/javascript">
(function(){
    SamJ_Mixer.gapi.key = 'YOUR_GAPI_KEY';
    SamJ_Mixer.playlist.push('VideoID', {start: 0, end: -1});
    SamJ_Mixer.playlist.push('VideoID2', {start: 3, end: 20});
    SamJ_Mixer.startPlayer();
})();
</script>
```


# Todo
- [ ] Handle Letterbox View / Full Screen
- [ ] Autoplay Native Android Browsers
- [ ] Remove Duplicate Code
    - [ ] handleNewVideoPlaying...
    - [ ] handleNetworkDroppedPlaying...        etc
- [ ] Flicker on player remove/add from DOM sometimes

# Support Guide
Not guaranteed support, but seemed fine to me... ¯\\\_(ツ)\_/¯

Desktop - Windows
- [ ] Firefox     (-)         - W10 Native (16299)
- [x] Firefox Dev (58.0b14)   - W10 Native (16299)
- [x] Chrome      (63.0.3239) - W10 Native (16299)
- [x] Edge        (41.16299)  - W10 Native (16299)

Desktop - OSX
- [x] Chrome      (63.0.3239) - High Sierra Native (10.13.2)
- [x] Firefox Dev (59.0b6)    - High Sierra Native (10.13.2)
- [x] Firefox     (57.0.4)    - High Sierra Native (10.13.2)
- [x] Safari      (-)         - High Sierra Native (10.13.2)


Mobile - Android
- [x] Chrome
- [ ] Native (No Autoplay)
- [ ] Firefox

# Built With
- [Youtube Api by Google](https://developers.google.com/youtube/)