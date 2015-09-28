var GameSound = {
	ua: navigator.userAgent,
	useWebAudioBGM: true,
	playSoundFX: true,
	soundHowl: null,
	musicHowl: null,
	musicMuted: false,
	soundMuted: false,
	loopSoundId: null,
	musicPlaying: false,
	loopPlaying: null,
	sprite: null,

	loadScript: function(url, fn) {
		var js, fjs = document.getElementsByTagName('script')[0];
		js = document.createElement('script');
		if (fn) { js.addEventListener('load', fn, false); }
		js.src = url;
		fjs.parentNode.insertBefore(js, fjs);
	},

	init: function(sprite) {
		this.soundMuted = GameLib.getStorage('soundMuted') === true;
		this.musicMuted = GameLib.getStorage('musicMuted') === true;
		this.sprite = sprite;

		// Conditions when to use <audio> instead of WebAudio for BGM:
		var isHTTP = /http/.test(location.protocol);
		if (!isHTTP || /(Trident|MSIE|IEMobile|Silk)/.test(this.ua) || (/Android/.test(this.ua) && !/(Chrome|Firefox|Opera)/.test(this.ua)) ) {
			this.useWebAudioBGM = false;
		}

		// Conditions when not to play soundFX: Silk, Android Stock
		if (/Silk/.test(this.ua) || (/Android/.test(this.ua) && !/(Chrome|Firefox|Opera)/.test(this.ua)) ) {
			this.playSoundFX = false;
		}
	
		this.musicHowl = new Howl({
			src: ['sounds/Game.ogg', 'sounds/Game.m4a'],
			loop: true,
			duration: GameConfig.BGMduration || 0
		});

		if (this.playSoundFX) {
			if (Howler.usingWebAudio) {
				GameSound.soundHowl = new Howl({
					src: ['sounds/sprite.ogg', 'sounds/sprite.m4a'],
					sprite: sprite
				});
			}
			else {
				this.loadScript('sounds/sprite.js', function() {
					GameSound.soundHowl = new Howl({
						src: [soundSprite, 'sounds/sprite.m4a', 'sounds/sprite.ogg'],
						sprite: sprite
					});
				});
			}
		}
	},

	ping: function()
	{
		if (!Howler.usingWebAudio) return;

		var ctx = Howler.ctx,
			 buffer = ctx.createBuffer(1, 1, 22050),
			 source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);

		// play the empty buffer
		if (typeof source.start === 'undefined') {
			source.noteOn(0);
		} else {
			source.start(0);
		}
	},

	playSound: function(spriteId, loop, onend) {
		var self = this;

		if (loop && this.loopPlaying) {
			this.soundHowl.stop(this.loopPlaying);
			this.loopPlaying = null;
		}

		if (!this.sprite[spriteId] || !this.playSoundFX || this.soundMuted) { 
			if (!loop && onend) { onend(false); }
			return; 
		}

		/*
		if (onend) {
			this.soundHowl.once('end', onend);
		}
		*/
	
		var soundId = this.soundHowl.play(spriteId, onend);
		if (loop) { self.loopPlaying = soundId; }
	},
	
	playMusic: function() {
		if (this.musicPlaying) return; // Prevent music from being played twice
		this.musicHowl.play();
		if (this.musicMuted) {
			this.musicHowl.mute(true);
		}
		this.musicPlaying = true;
	},

	stopMusic: function() {
		if (this.musicPlaying) {
			this.musicHowl.stop();
			this.musicPlaying = false;
		}
	},

	muteMusic: function(mute) {
		this.musicMuted = mute;
		if (mute) this.musicHowl.mute(true);
		else this.musicHowl.mute(false);
		GameLib.setStorage('musicMuted', mute);
	},

	muteSound: function(mute) {
		this.soundMuted = mute;
		if (mute) this.soundHowl.mute(true);
		else this.soundHowl.mute(false);
		GameLib.setStorage('soundMuted', mute);
	},

	setIdle: function(idle) {
		Howler.mute(idle);
	}
	
};

document.addEventListener('gameready', function(e) {
	GameSound.init(GameConfig.soundSprite);
}, false);
