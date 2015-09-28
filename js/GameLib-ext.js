var GameLib = {
	gameWidth: 800, // Just a default
	gameHeigh: 480, // Just a default
	$gameCtr: null,
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
	popupCallback: null,
	animEnd: 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
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

		window.open(getUrl(), '_system'); // _system is for Cordova comapibility
	},

	$_GET: function(name)
	{
		var a = new RegExp(name+"=([^&#=]*)");
		a = a.exec(location.search);
		if (null === a) return false;
		return decodeURIComponent(a[1]);
	},

	// History API
	resetHistory: function()
	{
		location.hash = '';
		try { history.replaceState('', '', location.pathname); } catch(e) {};
	},

	preload: function(callback)
	{
		var assetNum = 0, $loadPerc = $('#loadPerc'), imgNum = 0, nrToLoad = Game.images.length + Game.fonts.length;

		function loadFonts() {
			WebFont.load({
				custom: { families: Game.fonts },
				fontactive: function() {
					// Triggered once for each font that's loaded
					$loadPerc.css('width', Math.floor(++assetNum * 100 / nrToLoad)+'%');
				},
				active: function() {
					// Triggered when all fonts are loaded
					loadImages();
				}
			});
		}

		function loadImages() {
			var img = new Image();
			img.onload = function() {
				$loadPerc.css('width', Math.floor(++assetNum * 100 / nrToLoad)+'%');
				if (assetNum < nrToLoad) {
					loadImages();
				}
				else {
					if (callback) { setTimeout(callback, 200); }
					ThirdParty.loadingComplete();
	 				setTimeout(function(){$('#loading').remove()}, 500);
				}
			}
			img.src = Game.images[imgNum++];
		}

		if (Game.fonts && Game.fonts.length > 0) {
			loadFonts();
		}
		else {
			loadImages();
		}
	},

	/**
	 * Retrieve a word from the language file.
	 * Expects at least one, optionally more arguments.
	 */
	word: function()
	{
		var ss = gameWords[arguments[0]], x;
		for (x = 1; x < arguments.length; x++) {
			ss = ss.replace(new RegExp('#'+x,'g'), arguments[x]);
		}
		return ss;
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
		$('#langSelect tfoot td').html($('#langSelect tbody td[data-lang='+lang+']').html());
		$.getScript('js/words.'+lang+'.js', function() {
			GameLib.lang = lang;
			//GameLib.setStorage('lang', lang);
			localStorage.setItem('lang', lang);
			try { GameHiscore.set('lang', lang); } catch(e) {};
			$('[lang]').each(function() {
				var $this = $(this), lang = $this.attr('lang');
				if (/(\w+):(.+)/.test(lang)) {
					// Set a word as attribute value
					$this.attr(RegExp.$1, eval('GameLib.'+RegExp.$2))
				}
				else {
					// Set a word as html
					$this.html(eval('GameLib.' + lang));
				}
			});
			if (typeof Game.scaleButtonLabel === 'function') {
				Game.scaleButtonLabel();
			}
		});
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

	showPopup: function(title, url, width, height, scale, callback)
	{
		this.closePopup();
		width = width || 400;
		height = height || 300;
		if (typeof(scale) == 'undefined') { scale = true };

		var wrap = document.createElement('div'),
			popupPadding = 3,
			div = document.createElement('div'),
			cw = document.documentElement.clientWidth,
			ch = document.documentElement.clientHeight,
			isDesktop = !GameLib.isTouchDevice && (window.devicePixelRatio === undefined || window.devicePixelRatio === 1) && screen.width > 1000,
			html = [], cp = -15, content, style;

		if (typeof GameConfig.popupPadding !== 'undefined') {
			popupPadding = GameConfig.popupPadding; // padding + border
		}

		if (!scale && !isDesktop) {
			width = cw - 32 - (2*popupPadding);
			height = ch - 32 - (2*popupPadding);
			cp = 0;
		}

		style = 'width:' + width + 'px;height:' + height + 'px;margin-left:-' + (width/2+popupPadding) + 'px;margin-top:-' + (height/2+popupPadding) + 'px;';

		if (/\.html$/.test(url) || /^https?:\/\//.test(url)) {
			content = '<iframe src="' + url + '" style="display:block;width:' + width + 'px;height:' + height + 'px" frameborder="0"></iframe>';
			style += 'border-radius:0;background:#fff;';
		}
		else {
			content = '<div style="padding:5px 10px">' + url + '</div>';
		}

		div.className = 'popup';

		// Create dark overlay:
		wrap.className = 'popupWrap close';
		wrap.onclick = function(e) { if (/close/.test(e.target.className)) { GameLib.closePopup(); } };
		GameLib.popup = wrap;

		if (scale) { style += 'transform:scale(' + GameLib.scale + ');-webkit-transform:scale(' + GameLib.scale + ');-ms-transform:scale(' + GameLib.scale + ')'; }
		div.setAttribute('style', style);
		wrap.appendChild(div);

		if (callback) { this.popupCallback = callback; }

		if (title) {
			height -= 32;
			html.push('<div class="title">' + title + '</div>');
		}

		html.push(
			'<div style="overflow:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;width:'+width+'px;height:'+height+'px">',
			content,
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
			if (this.popupCallback) {
				this.popupCallback();
				this.popupCallback = null;
			}
		}
	},

	// Scale game to available viewport size.
	// If width & height are supplied, scale the game to that resolution,
	// and keep it centered within viewport.
	scaleGame: function(event, width, height)
	{
		var rotateDiv = document.getElementById('rotateHint'),
		    gameCtr = GameLib.$gameCtr[0],
			 // DO NOT use window.innerWidth/innerHeight!!!
			 // I repeat: DO NOT use window.innerWidth/innerHeight
			 // They are very unreliable in reporting the correct viewport size (iOS, Galaxy S3)!
			 vpW = Math.min(document.documentElement.clientWidth, window.innerWidth),
			 vpH = Math.min(document.documentElement.clientHeight, window.innerHeight),
			 isLandscape = vpW > vpH,
			 gameW = width || vpW, gameH = height || vpH;

		if (GameLib.scalable) {
			GameLib.scale = Math.min(gameW / GameLib.gameWidth, gameH / GameLib.gameHeight);
			gameCtr.style.webkitTransform = gameCtr.style.msTransform = gameCtr.style.transform = 'scale(' + GameLib.scale + ')';
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
			rotateDiv.style.display = GameLib.isTouch && !isLandscape ? 'block' : 'none';
		}

		if (ThirdParty.centerHorizontally) {
			var margin = GameLib.scale * GameLib.gameWidth < vpW ? (vpW - GameLib.scale * GameLib.gameWidth) / 2 : 0;
			gameCtr.style.marginLeft = margin + 'px';
		}

		if (ThirdParty.centerVertically) {
			var margin = GameLib.scale * GameLib.gameHeight < vpH ? (vpH - GameLib.scale * GameLib.gameHeight) / 2 : 0;
			gameCtr.style.marginTop = margin + 'px';
		}

		// Re-position page within viewport after orientation change:
		if (GameLib.isIOS) {
			window.scrollTo(0, -64);
		}

		var evt = document.createEvent('Events');
		evt.initEvent('scale', true, true);
		window.dispatchEvent(evt);
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

	clearStorage: function() {
		localStorage.clear();
		this.storageJar = {};
	},

	init: function(gameName, width, height)
	{
		// Enable debug-mode, when 'debug' is present in query-string:
		if (/debug/.test(location.search)) {
			window.onerror = function(msg, url, line) {
				alert('Error in line '+line+' of ' + url + ':\n' + msg);
			}
		}

		GameLib.gameName = gameName;
		GameLib.gameWidth = width;
		GameLib.gameHeight = height;

		Hammer($('#rotateHint')[0]).on('tap', function() {
			this.style.display = 'none';
		});

		/*
		// Backgroundcolor change?
		var bgcolor = GameLib.$_GET('bgcolor');
		if (false !== bgcolor) {
			document.documentElement.style.backgroundColor = bgcolor;
			document.documentElement.style.backgroundImage = 'none';
		}
		*/
		GameLib.$gameCtr = $('#gameContainer');
		GameLib.$gameCtr.css({width:width+'px', height:height+'px'});

		// To scale or not to scale...
		if (/noscale/.test(location.search)) {
			GameLib.scalable = false;
			if (GameLib.isIE) {
				var msViewportStyle = document.createElement('style');
				msViewportStyle.appendChild(document.createTextNode('@-ms-viewport{width:'+width+'px; height:'+height+'px}'));
				document.querySelector('head').appendChild(msViewportStyle);
			}
		}

		GameLib.scaleGame();

		$('#loading').html('<img src="' + (typeof ThirdParty.splashScreen !== 'undefined' ? ThirdParty.splashScreen : 'img/loading.jpg') + '" alt="Loading..." width="800" height="480"><div class="progressbar"><div id="loadPerc"></div></div>');
		GameLib.$gameCtr.css('visibility', 'visible');

		if (GameConfig.credits) {
			if ($('map[name="copyshareMap"]').length == 0) {
				var $map = $('<map>', {name:'copyshareMap'}).html('<area shape="circle" coords="16,17,17" href="credits.html" onclick="return false"><area shape="circle" coords="52,17,17" href="share.html" onclick="return false">').appendTo('body');

				$('area', $map).each(function() {
					Hammer(this).on('tap', function() {
						GameLib.showPopup(null,this.href,400,220);
					});
				});
			}
			$('<img>', {usemap:'#copyshareMap', src:'img/copyshare.png', 'class':'copycredits'}).appendTo($('#menuDiv'));
		}

		// Test localStorage:
		var hasLocalStorage = true;
		try {
			var mod = 'test';
			localStorage.setItem(mod, mod);
			localStorage.removeItem(mod);
		}
		catch(e) {
			hasLocalStorage = false;
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

		// Init language:
		var lang = this.getLang();
		this.setLang(lang);

		// Init idle-detector:
		window.addEventListener('idle', function() { GameSound.setIdle(true) }, false);
		window.addEventListener('wakeup', function() { GameSound.setIdle(false) }, false);

		// Disable context menu:
		if (!GameConfig.debug) {
			document.addEventListener('contextmenu', function(e){
				e.preventDefault();
			}, false);
		}

		// Init scale-event listener:
		window.addEventListener(GameLib.isIOS ? 'orientationchange' : 'resize', GameLib.scaleGame, false);

		// Init language selector:
		Hammer($('tfoot', '#langSelect')[0]).on('tap', function() {
			$(this).prev('tbody').show()
			.parents('table').addClass('open')
			.parents('body').one('mouseup', function() {
				$('#langSelect').removeClass('open').find('tbody').hide();
			});
		});

		$('tbody td', '#langSelect').each(function() {
			Hammer(this).on('tap', function() {
				var $this = $(this);
				GameLib.setLang($this.data('lang'));
				$this.parents('tbody').hide();
			});
		});

		// Fire 'gameready' event:
		var evt = document.createEvent('Events');
		evt.initEvent('gameready', true, true); //true for can bubble, true for cancelable
		evt.gameName = gameName;
		document.dispatchEvent(evt);

		// Start game when everything is loaded:
		GameLib.preload(function() {
			Game.init();
			$('#loading').addClass('slideOutUp animated1s').one(GameLib.animEnd, function() {
				$(this).remove();
			});
			if (GameLib.IEversion && GameLib.IEversion < 10) {
				var msg = 'You are using a rather old version of Internet Explorer (version ' + GameLib.IEversion + ').<br>This game might or might not work. We strongly advise you to upgrade to <a href="http://windows.microsoft.com/en-us/internet-explorer/ie-11-worldwide-languages" target="_blank">Internet Explorer 10</a> or better.<br>Alternatively, you can use <a href="http://getfirefox.com/" target="_blank">Firefox</a>, <a href="http://google.com/chrome/" target="_blank">Chrome</a>, <a href="http://apple.com/safari/" target="_blank">Safari</a> or <a href="http://opera.com/browser" target="_blank">Opera</a>.';
				GameLib.showPopup('Old Internet Explorer', msg, 300, 200);
			}
			else if (!hasLocalStorage) {
				var msg = 'You seem to be browsing in private mode. This game does not work in private mode, while we cannot use local storage for storing your score, progress etc.<br>Please run this game in a regular (non-private) browser window.';
				GameLib.showPopup('Private Browsing', msg, 300, 200);
			}
		});

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
