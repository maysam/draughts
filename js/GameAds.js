/** 
 * Google Adsense Text/Image/Video Ads
 */
var GameAds = {

config: null,
adsManager: null,
adsLoader: null,
adDisplayContainer: null,
intervalTimer: null,
resizeTimer: null,
gameDiv: null,
adDiv: null,
doneFn: null,
throbber: null,

init: function() 
{
	if (!GameLib.online) return false;

	// If ads configured in ThirdParty.js, use that:
	if (ThirdParty.ads && ThirdParty.ads.adsense) {
		GameAds.config = ThirdParty.ads;
	}
	// Otherwise, if ads configured in Config.js, use that:
	else if (GameConfig.ads && GameConfig.ads.adsense) {
		GameAds.config = GameConfig.ads;
	}
	else {// No ads.
		return false;
	}

	this.gameDiv = document.getElementById('gameContainer');
	this.adDiv = document.getElementById('adContainer');

	var a = document.createElement('script'),
		 m = document.getElementsByTagName('script')[0];
	a.src = 'http://imasdk.googleapis.com/js/sdkloader/ima3.js';
	m.parentNode.insertBefore(a,m);

	return true;
},

// Determine whether or not to show Google Adsense Ads:
showAd: function()
{
	/* Lots of cases to take into account:

	   3rd party hosts game on its own domain
		======================================
		In this case, http://api.zygomatic.nl/js/zygomatic-game.js might not be available.
		The 3rd party determines whether or not to show ads via ThirdParty.showGoogleAds

		3rd party embeds iframe (src: http://cdn.htmlgames.com/GAME)
		============================================================
		In this case, ads are not shown when ThirdParty.showGoogleAds === false
		Otherwise, find the hostname of the parent window.
		If that hostname appears in zygomatic.settings.skipGoogleAdDomains, no ads are shown.
		If that hostname does not appear in zygomatic.settings.skipGoogleAdDomains, ads are shown.

		3rd party links to game directly (src: http://cdn.htmlgames.com/GAME)
		=====================================================================
		The game is not embedded in an iframe. 
		In this case, ads are not shown when ThirdParty.showGoogleAds === false
		Otherwise, find the hostname of the referrer window.
		If that hostname appears in zygomatic.settings.skipGoogleAdDomains, no ads are shown.
		If that hostname does not appear in zygomatic.settings.skipGoogleAdDomains, ads are shown.

		3rd party embeds game via "embed game" tool @ htmlgames.com
		===========================================================
		Depending on the browser (desktop/mobile), the game is launched in an iframe or new window.
		Ads are not shown when ThirdParty.showGoogleAds === false
		Otherwise, find the hostname of the referrer or parent window..
		If that hostname appears in zygomatic.settings.skipGoogleAdDomains, no ads are shown.
		If that hostname does not appear in zygomatic.settings.skipGoogleAdDomains, ads are shown.
	*/

	var showAds, now = Math.round(1*new Date()/1000), hostDomain = GameLib.getHostDomain();

	if (null === GameAds.config) return false;

	console.log('Host domain: ' + hostDomain);
	try {// window.zygomatic might not be available
		showAds = (','+window.zygomatic.settings.skipGoogleAdDomains.join(',')+',').indexOf(hostDomain) === -1;
	} catch(e) {
		showAds = false;
	};

	if (showAds) {
		// We may show an ad, but: Show max 1 ad per hour.
		var lastAdTimestamp = GameLib.getStorage('lastAdTimestamp'),
			 itv = GameAds.config.interval ? GameAds.config.interval : 3600;

		if (lastAdTimestamp !== false) {
			if (now - lastAdTimestamp < itv) {
				return false;
			}
		}
		GameLib.setStorage('lastAdTimestamp', now);
	}

	return showAds;
},

showLoading: function(on)
{
	if (on) {
		this.throbber = document.createElement('div');
		this.throbber.id = 'throbber';
		this.throbber.innerHTML = '<span class="throbber">Loading...</span>';
		this.adDiv.appendChild(this.throbber);
		this.adDiv.style.visibility = 'visible';
	}
	else {
		this.throbber.parentNode.removeChild(this.throbber);
	}
},

requestAd: function(callback) 
{
	var self = this;
	if (typeof callback == 'function') { self.doneFn = callback; }

	function resizeAB() {
		var rect = self.gameDiv.getBoundingClientRect();
		self.adDiv.style.top = rect.top + 'px';
		self.adDiv.style.left = rect.left + 'px';
		self.adDiv.style.width = rect.width + 'px';
		self.adDiv.style.height = (rect.height+1) + 'px';
	}

	if (typeof google == 'undefined') {
		// AdBlocker is active:
		this.adDiv.style.visibility = 'visible';
		this.adDiv.innerHTML = '<a href="http://www.htmlgames.com/" target="_blank"><img src="http://cdn.htmlgames.com/banner/adblock.png" style="width:100%;height:100%"></a><div id="timeLeft"></div>';
		window.addEventListener('resize', resizeAB, false);
		resizeAB();

		var tlDiv = document.getElementById('timeLeft'), el = document.createElement('div'),
			 adDuration = 30, duration = 30;
		tlDiv.appendChild(el);

		// Hide Ad & Start game after 30 secs.
		GameAds.intervalTimer = setInterval(
			function() {
				duration--;
				el.style.width = 100 - Math.round(duration / adDuration * 100) + '%';
				if (duration == -1) {
					window.removeEventListener('resize', resizeAB, false);
					GameAds.adDone('timeout');
				}
			},
			1000 // every second
		);

		return;
	}

	this.resize();
	self.showLoading(true);

	// Create the ad display container.
	self.createAdDisplayContainer();
	// Initialize the container. Must be done via a user action on mobile devices.
	self.adDisplayContainer.initialize();
	// Create ads loader.
	self.adsLoader = new google.ima.AdsLoader(self.adDisplayContainer);
	// Listen and respond to ads loaded and error events.
	self.adsLoader.addEventListener(
			google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
			self.onAdsManagerLoaded,
			false);
	self.adsLoader.addEventListener(
			google.ima.AdErrorEvent.Type.AD_ERROR,
			self.onAdError,
			false);

	// Request video ads.
	var adsRequest = new google.ima.AdsRequest();

	// Create and add description-url:
	var descriptionUrl = location.protocol + location.port + '//' + location.hostname + location.pathname.substr(0,location.pathname.lastIndexOf('/')) + '/about.html';
	adsRequest.adTagUrl = GameAds.config.adsense.url.replace('[description_url]', encodeURIComponent(descriptionUrl));

	if (/games\.(avoid\.org|webgear\.nl)/.test(location.hostname)) {
		adsRequest.adTagUrl += '&adtest=on';
	}

	// Specify the linear and nonlinear slot sizes. This helps the SDK to
	// select the correct creative if multiple are returned.
	adsRequest.linearAdSlotWidth = GameLib.gameWidth;
	adsRequest.linearAdSlotHeight = GameLib.gameHeight;

	//alert((GameLib.gameWidth * GameLib.scale) + 'x' + ((GameLib.gameHeight-50) * GameLib.scale));
	adsRequest.nonLinearAdSlotWidth = Math.round(GameLib.gameWidth * GameLib.scale);
	// Substract some height (50px): otherwise google serves images that (sometimes) exactly fit the height of the game.
	// The close-ad button then resides at the very top of the screen. Clicking it on an iPhone (with minimal-ui viewport),
	// brings down the address bar instead of closing the ad.
	adsRequest.nonLinearAdSlotHeight = Math.round((GameLib.gameHeight-50) * GameLib.scale); 

	self.adsLoader.requestAds(adsRequest);
},

createAdDisplayContainer: function() 
{
	// We assume the adContainer is the DOM id of the element that will house the ads.
	this.adDisplayContainer =
			new google.ima.AdDisplayContainer(GameAds.adDiv);
},

onAdsManagerLoaded: function(adsManagerLoadedEvent) 
{
	// Get the ads manager.
	var adsRenderingSettings = new google.ima.AdsRenderingSettings();
	adsRenderingSettings.loadVideoTimeout = 5000;
	GameAds.adsManager = adsManagerLoadedEvent.getAdsManager(GameAds.gameDiv, adsRenderingSettings);	// should be set to the content video element

	// Add listeners to the required events.
	GameAds.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, GameAds.onAdError);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, GameAds.onAdEvent);

	// Listen to any additional events, if necessary.
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, GameAds.onAdEvent);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, GameAds.onAdEvent);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, GameAds.onAdEvent);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, GameAds.onAdEvent);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, GameAds.onAdEvent);
	GameAds.adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, GameAds.onAdEvent);

	try {
		// Initialize the ads manager. Ad rules playlist will start at this time.
		GameAds.adsManager.init(GameLib.gameWidth, GameLib.gameHeight, google.ima.ViewMode.NORMAL);
		// Call play to start showing the ad. Single video and overlay ads will
		// start at this time; the call will be ignored for ad rules.
		GameAds.adsManager.start();
	} catch (adError) {
		// An error may be thrown if there was a problem with the VAST response.
	}
},

resize: function(adWidth, adHeight)
{
	// Make adDiv as large as gameContainer, without CSS-scaling
	var rect = this.gameDiv.getBoundingClientRect(), p;
	for (p in {left:0,top:0,width:0,height:0}) {
		this.adDiv.style[p] = Math.round(rect[p]) + 'px';
	}

	if (arguments.length == 2) {
		if (rect.width < adWidth || rect.height < adHeight) {
			this.adDone('error'); // Ad doesn't fit in viewport
		}
		else {
			GameAds.adsManager.resize(Math.ceil(rect.width), Math.ceil(rect.height), google.ima.ViewMode.FULLSCREEN);
		}
	}
},

resizeHandler: function()
{
	clearTimeout(this.resizeTimer);
	this.resizeTimer = setTimeout(function() {
		GameAds.resize(0,0); // 0, 0 to make argument count = 2
	}, 50);
},

onAdEvent: function(adEvent) 
{
	// Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
	// don't have ad object associated.
	var ad = adEvent.getAd(), adIsLinear = ad.isLinear();
	switch (adEvent.type) {
		case google.ima.AdEvent.Type.LOADED:
			// This is the first event sent for an ad - it is possible to
			// determine whether the ad is a video ad or an overlay.
			// Image banner: linear == false
			// Video banner: linear == true
			var adWidth = ad.getWidth(), adHeight = ad.getHeight(), resized;

			GameAds.showLoading(false); // Hide 'loading...'
			/*
			if (!adIsLinear && (adWidth == 0 || adHeight == 0)) {
				console.log('ERROR: Google returns an Ad with size 0!');
				GameAds.adDone('error');
				break;
			}
			*/

			GameAds.resize(adWidth, adHeight); 
			GameAds.adDiv.querySelectorAll('iframe')[0].style.visibility = 'visible';
			
			window.addEventListener('resize', GameAds.resizeHandler, false);
			break;

		case google.ima.AdEvent.Type.STARTED:
			// This event indicates the ad has started - the video player
			// can adjust the UI, for example display a pause button and
			// remaining time.
			
			var tlDiv = document.getElementById('timeLeft'), el = document.createElement('div');
			tlDiv.appendChild(el);

			if (adIsLinear) {
				// For a linear ad, a timer can be started to poll for the remaining time.
				var duration = ad.getDuration();
				GameAds.intervalTimer = setInterval(
					function() {
						el.style.width = 100 - Math.round(GameAds.adsManager.getRemainingTime() / duration * 100) + '%';
					},
					100 // every 100ms
				);
			}
			else {
				var adDuration = 15, duration = 15;
				GameAds.adDiv.onclick = function() { GameAds.adDone('complete'); };

				// Hide Ad & Start game after 15 secs.
				GameAds.intervalTimer = setInterval(
					function() {
						duration--;
						el.style.width = 100 - Math.round(duration / adDuration * 100) + '%';
						if (duration == -1) {
							GameAds.adDone('timeout');
						}
					},
					1000 // every second
				);
			}
			break;

		case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:
			break;

		case google.ima.AdEvent.Type.COMPLETE:
		case google.ima.AdEvent.Type.USER_CLOSE:
			GameAds.adDone('complete');
			break;

		case google.ima.AdEvent.Type.SKIPPED:
			// This event indicates the ad has finished - the video player
			// can perform appropriate UI actions, such as removing the timer for
			// remaining time detection.
			/*
			if (ad.isLinear()) {
				clearInterval(intervalTimer);
			}*/
			GameAds.adDone('skipped');
			break;
	}
},

// Ad done, show/start game
adDone: function(status, doDone) 
{
	if (typeof doDone == 'undefined') { doDone = true; }
	var self = this;
	window.removeEventListener('resize', self.resizeHandler, false); // ARJAN	
	if (self.intervalTimer) { clearInterval(self.intervalTimer); }
	//self.adDiv.parentNode.removeChild(self.adDiv);
	self.adDiv.innerHTML = '<div id="timeLeft"></div>';
	self.adDiv.style.visibility = 'hidden';
	try { GameAds.adsManager.destroy(); } catch(e) {};
	if (doDone && self.doneFn) { self.doneFn(status); }
},

onAdError: function(adErrorEvent) 
{
	// Handle the error logging.
	console.log(adErrorEvent.getError());
	GameAds.adDone('error');
	try { GameAds.adsManager.destroy(); } catch(e) {};
}

};

document.addEventListener('gameready', function(e) {
	GameAds.init();
}, false);
