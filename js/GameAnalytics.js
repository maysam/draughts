(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','__gaTracker');

var GameAnalytics = {
	gaUA: null,

	init: function() {
		if (!GameLib.online) return;

		if (ThirdParty.gaUA) {
			GameAnalytics.gaUA = ThirdParty.gaUA;
		}
		else if (GameConfig.gaUA) {
			GameAnalytics.gaUA = GameConfig.gaUA;
		}

		if (GameAnalytics.gaUA !== null) {
			// Google Analytics pageview hit:
			__gaTracker('create', GameAnalytics.gaUA, 'auto');
			__gaTracker('send', 'pageview');
		}

	},

	hit: function(what, value) 
	{
		if (null === GameAnalytics.gaUA) return;

		if (undefined === value) {
			__gaTracker('send', 'event', 'game', what);
		}
		else {
			__gaTracker('send', 'event', 'game', what, value);
		}
	}
};

document.addEventListener('gameready', function(e) {
	GameAnalytics.init();
}, false);
