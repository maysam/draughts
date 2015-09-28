if(!(window.console && console.log)) {
    // For old IE's:
    var console = {
        log: function(){},
        debug: function(){},
        info: function(){},
        warn: function(){},
        error: function(){}
    };
}

var GameLib = {
	gameWidth: 800,
	gameHeight: 480,
	containerDiv: null,
	storageJar: {},
	scale: 1,
	scalable: true,
	gameName: '',
	lang: 'en',
	isTouch: 'ontouchstart' in window || navigator.msMaxTouchPoints,
	isIOS: /iP(hone|ad|od)/.test(navigator.userAgent),
	isAndroid: /Android/.test(navigator.userAgent),
	isIE: /IEMobile/.test(navigator.userAgent),
	online: true,
	popup: null,
	IEversion: (function() {
		var v = 3, div = document.createElement('div'), all = div.getElementsByTagName('i');
		do
			div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
		while 
			(all[0]);
		return v > 4 ? v : document.documentMode;
	}()),

	moreGames: function() {
		var lang = GameLib.lang;
		if (typeof(ThirdParty.moreGames) == 'function') {
			return ThirdParty.moreGames(lang);
		}

		var cat = document.querySelector('meta[name=gameCats]').content.split(',')[0].toLowerCase(),
		urls = {
			mahjong: {
				en: 'mahjonggames.com',
				de: 'mahjongspielen.de',
				nl: 'mahjongspelen.nl',
				es: 'juegosmahjong.com',
				fr: 'www.mahjongjeux.com'
			},
			solitaire: {
				en: 'solitaireonline.com',
				nl: 'patiencespelen.nl',
				de: 'kartenspielen.de',
				es: 'juegossolitario.com',
				fr: 'solitairejeux.com'
			},
			mind: {
				en: 'mindgames.com',
				nl: 'denkspelletjes.nl',
				es: 'juegos-mentales.com',
				de: 'knobelspiele.com'
			},
			hiddenobject: {
				en: 'hiddenobjectgames.com',
				nl: 'hiddenobjectspellen.nl',
				de: 'wimmelbildspiele.de',
				es: 'juegosdeobjetosocultos.com'
			},
			platform: {
				en: 'platformgames.com',
				nl: 'platformspellen.nl',
				de: 'plattformspiele.de',
				es: 'juegosplataformas.com'
			},
			match3: {
				en: 'match3games.com',
				nl: 'match3spellen.nl'
			},
			classic: {
				en: 'classicgame.com',
				nl: 'klassiekspel.nl',
				de: 'spieleklassiker.com',
				es: 'juegos-clasicos.es'
			}
		};
		if (cat == 'puzzle' || cat == 'memory') cat = 'mind';
		if (cat == 'bubble') cat = 'match3';

		function getUrl() {
			if (typeof urls[cat] !== 'undefined') { 
				var obj = urls[cat];
				return 'http://' + obj[typeof obj[lang] == 'undefined' ? 'en' : lang];
			}
			if (lang == 'nl') { return 'http://htmlspellen.nl'; }
			if (lang == 'de') { return 'http://html-spiele.de'; }
			return 'http://htmlgames.com';
		}

		window.open(getUrl(), '_system'); // _system is for Cordova compatibility
	},
	
	$_GET: function(name) 
	{
		var a = new RegExp(name+"=([^&#=]*)");
		a = a.exec(location.search);
		if (null === a) return false;
		return decodeURIComponent(a[1]);
	},

	getLang: function() 
	{
		var langs = ',zh,en,nl,es,pt,fr,it,de,ru,in,pl,tr,',
		    lang = localStorage.getItem('lang');
		if (null === lang) {
			// Fallback to 'old' cookie:
			lang = GameLib.getStorage('lang');
			if (false === lang) lang = null;
		}
		if (null === lang) {
			// Use browser lang
			lang = (navigator.language || navigator.userLanguage).substr(0,2);
			return langs.indexOf(','+lang+',') == -1 ? 'en' : lang;
		}
		return lang;
	},

	setLang: function(lang) 
	{
		GameLib.lang = lang;
		localStorage.setItem('lang', lang);
		try { GameHiscore.set('lang', lang); } catch(e) {};
	},

	getHostDomain: function()
	{
		var hostDomain = location.hostname, idx,
			 parentUrl = (parent === window) ? null : document.referrer;

		if (parentUrl !== null) {
			// We're inside an iframe, find hostname of parent:
			hostDomain = parentUrl;
		}
		else if (document.referrer) {
			hostDomain = document.referrer;
		}

		// Extract hostname alone:
		hostDomain = hostDomain.replace(/^https?:\/\//i, '').replace(/^(www|dev)\./, ''); // Strip http:// and www./dev. prefix
		idx = hostDomain.indexOf('/');
		if (idx != -1) { hostDomain = hostDomain.substr(0, idx); } // Strip path

		return hostDomain;
	},

	showPopup: function(title, url, width, height, scale)
	{
		this.closePopup();
		width = width || 400;
		height = height || 300;
		if (typeof(scale) == 'undefined') { scale = true };

		var wrap = document.createElement('div'),
			div = document.createElement('div'),
			cw = document.documentElement.clientWidth,
			ch = document.documentElement.clientHeight,
			isDesktop = !GameLib.isTouchDevice && (window.devicePixelRatio === undefined || window.devicePixelRatio === 1) && screen.width > 1000,
			html = [], cp = -15;

		if (!scale && !isDesktop) {
			//width = Math.min(800*GameLib.scale,cw - 32);
			width = cw - 32;
			height = ch - 32;
			cp = 0;
		}

		div.className = 'popup';

		// Create dark overlay:
		wrap.className = 'popupWrap close';
		wrap.onclick = function(e) { if (/close/.test(e.target.className)) { GameLib.closePopup(); } };
		GameLib.popup = wrap;
		
		var style = 'width:' + width + 'px;height:' + height + 'px;margin-left:-' + (width/2) + 'px;margin-top:-' + (height/2) + 'px;';
		if (scale) { style += 'transform:scale(' + GameLib.scale + ');-webkit-transform:scale(' + GameLib.scale + ');-ms-transform:scale(' + GameLib.scale +')'; }
		div.setAttribute('style', style);
		wrap.appendChild(div);

		if (title) { 
			height -= 32;
			html.push('<div class="title">' + title + '</div>'); 
		}

		var content = /\.html$/.test(url) || /^https?:\/\//.test(url) ? 
			'<iframe src="' + url + '" style="display:block;width:' + width + 'px;height:' + height + 'px" frameborder="0"></iframe>' :
			'<div style="padding:5px 10px">' + url + '</div>';

		html.push(
			'<div style="overflow:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;width:'+width+'px;height:'+height+'px">' +
			content + 
			'</div>',
			'<img src="img/close.png" class="close" style="right:'+cp+'px;top:'+cp+'px">'
		);
		div.innerHTML = html.join('');
		document.body.appendChild(wrap);
		return false;
	},

	closePopup: function() 
	{
		if (this.popup) {
			this.popup.parentNode.removeChild(this.popup);
			this.popup = null;
		}
	},

	// Scale game to available viewport size.
	// If width & height are supplied, scale the game to that resolution,
	// and keep it centered within viewport.
	scaleGame: function(event, width, height) 
	{
		var rotateDiv = document.getElementById('rotateHint'),
			 // DO NOT use window.innerWidth/innerHeight!!!
			 // I repeat: DO NOT use window.innerWidth/innerHeight
			 // They are very unreliable in reporting the correct viewport size (iOS, Galaxy S3)!
			 vpW = Math.min(document.documentElement.clientWidth, window.innerWidth),
			 vpH = Math.min(document.documentElement.clientHeight, window.innerHeight),
			 isLandscape = vpW > vpH,
			 gameW = width || vpW, gameH = height || vpH;

		if (GameLib.scalable) {
			GameLib.scale = Math.min(gameW / GameLib.gameWidth, gameH / GameLib.gameHeight);
			GameLib.containerDiv.style.webkitTransform = GameLib.containerDiv.style.msTransform = GameLib.containerDiv.style.transform = 'scale(' + GameLib.scale + ')';
		}
		else
		{// Adjust viewport (doesn't work very well)
			var vp = document.querySelector('meta[name=viewport]'), attr = 'width=' + GameLib.gameWidth;
			if (isLandscape && GameLib.gameHeight > window.innerHeight && GameLib.gameWidth <= vpW) {
				attr = 'height=' + GameLib.gameHeight;
			}
			vp.setAttribute('content','minimal-ui,user-scalable=0,' + attr);
		}

		if (ThirdParty.showRotateHint) {
			var orientation = GameConfig.orientation || 'landscape';
			rotateDiv.style.display = GameLib.isTouch && ((orientation == 'landscape' && !isLandscape) || (orientation == 'portrait' && isLandscape)) ? 'block' : 'none';
		}

		if (ThirdParty.centerHorizontally) {
			var margin = GameLib.scale * GameLib.gameWidth < vpW ? (vpW - GameLib.scale * GameLib.gameWidth) / 2 : 0;
			GameLib.containerDiv.style.marginLeft = margin + 'px';
		}

		if (ThirdParty.centerVertically) {
			var margin = GameLib.scale * GameLib.gameHeight <= vpH ? (vpH - GameLib.scale * GameLib.gameHeight) / 2 : 0;
			GameLib.containerDiv.style.marginTop = margin + 'px';
		}

		// Re-position page within viewport after orientation change:
		if (GameLib.isIOS) {
			window.scrollTo(0, -64);
		}
	},

	getStorage: function(name) {
		return this.storageJar[name] !== undefined ? this.storageJar[name] : false;
	},

	setStorage: function(name, value) {
		if (typeof name === 'object') {
			for (var x in name) {
				if (null === name[x]) { delete this.storageJar[x]; }
				else { this.storageJar[x] = name[x]; }
			}
		}
		else {
			if (null === value) {
				delete this.storageJar[name];
			}
			else {
				this.storageJar[name] = value;
			}
		}
		this.saveStorage();
	},

	saveStorage: function() {
		localStorage.setItem(this.gameName, JSON.stringify(this.storageJar));
	},

	init: function(gameName, width, height) 
	{
		// Enable debug-mode, when 'debug' is present in query-string:
		if (/debug/.test(location.search)) {
			window.onerror = function(msg, url, line) {
				alert('Error in line '+line+' of ' + url + ':\n' + msg);
			}
		}
		else {
			// Disable context menu:
			document.addEventListener('contextmenu', function(e){
				e.preventDefault();
			}, false);
		}

		GameLib.gameName = gameName;
		GameLib.gameWidth = width;
		GameLib.gameHeight = height;

		document.getElementById('rotateHint').addEventListener('click', function() {
			this.style.display = 'none';
		});

		// Backgroundcolor change?
		var bgcolor = GameLib.$_GET('bgcolor');
		if (false !== bgcolor) {
			document.documentElement.style.backgroundColor = bgcolor;
			document.documentElement.style.backgroundImage = 'none';
		}
		else if (ThirdParty.background) {
			// Custom background defined in ThirdParty.js.
			// Can be a URL to an image, or a color.
			document.documentElement.style.background = 
				/([\.\/])/.test(ThirdParty.background) ? 
				'url(' + ThirdParty.background + ')' :
				ThirdParty.background;
		}

		GameLib.containerDiv = document.getElementById('gameContainer');
		GameLib.containerDiv.style.width = width + 'px';
		GameLib.containerDiv.style.height = height + 'px';

		// To scale or not to scale...
		if (/noscale/.test(location.search)) {
			GameLib.scalable = false;
			if (GameLib.isIE) {
				var msViewportStyle = document.createElement('style');
				msViewportStyle.appendChild(document.createTextNode('@-ms-viewport{width:'+width+'px; height:'+height+'px}'));
				document.querySelector('head').appendChild(msViewportStyle);
			}
		}
		
		// Test localStorage:
		try {
			var mod = 'test';
			localStorage.setItem(mod, mod);
			localStorage.removeItem(mod);
		}
		catch(e) {
			var msg = 'You seem to be browsing in private mode. This game does not work in private mode, while we cannot use local storage for storing your score, progress etc.<br>Please run this game in a regular (non-private) browser window.';
			this.showPopup('Private Browsing', msg, 300, 200);
		}

		// Init localStorage:
		var storageJar = localStorage.getItem(this.gameName); 
		if (null !== storageJar) {
			this.storageJar = JSON.parse(storageJar);
		}

		// Disable elastic scrolling on iOS7.1 (or higher):
		if (this.isIOS && /.*CPU.*OS (\d+)_(\d+)/i.test(navigator.userAgent)) {
			if (parseFloat(RegExp.$1 + '.' + RegExp.$2) >= 7.1) {
				document.addEventListener('touchmove', function(e) { e.preventDefault(); }, false);
			}
		}

		// Init idle-detector:
		window.addEventListener('idle', function() { GameSound.setIdle(true) }, false);
		window.addEventListener('wakeup', function() { GameSound.setIdle(false) }, false);

		// Init scale-event listener:
		window.addEventListener(GameLib.isIOS ? 'orientationchange' : 'resize', GameLib.scaleGame, false);

		// Fire 'gameready' event:
		var evt = document.createEvent('Events');
		evt.initEvent('gameready', true, true); //true for can bubble, true for cancelable
		evt.gameName = gameName;
		document.dispatchEvent(evt);

		// Start game:
		GameLib.scaleGame();
//		window.addEventListener('load', function() { orderInit(1); }, false);
		orderInit(1);
		
		if (GameLib.IEversion && GameLib.IEversion < 10) {
			var msg = 'You are using a rather old version of Internet Explorer (version ' + GameLib.IEversion + ').<br>This game might or might not work. We strongly advise you to upgrade to <a href="http://windows.microsoft.com/en-us/internet-explorer/ie-11-worldwide-languages" target="_blank">Internet Explorer 10</a> or better.<br>Alternatively, you can use <a href="http://getfirefox.com/" target="_blank">Firefox</a>, <a href="http://google.com/chrome/" target="_blank">Chrome</a>, <a href="http://apple.com/safari/" target="_blank">Safari</a> or <a href="http://opera.com/browser" target="_blank">Opera</a>.';
			this.showPopup('Old Internet Explorer', msg, 300, 200);
		}
		
		// iPhone (not iPad): faux event dispatcher when addressbar/toolbar (dis)appear.
		if (/iP(od|hone)/.test(navigator.userAgent) && !navigator.standalone) {
			GameLib.windowHeight = window.innerHeight;
			setInterval(function() {
				if (window.innerHeight != GameLib.windowHeight) {
					GameLib.windowHeight = window.innerHeight;
					GameLib.scaleGame();
				}
			}, 500);
		};

		window.focus(); // Focus current window (useful when loaded inside iframe)
	}
};
