(function(win, doc) {
	var secs = GameConfig.idleTimeout ? GameConfig.idleTimeout : 60,
	    timeoutID, isIdle = false, stateKey, eventKey, keys = {
		hidden: 'visibilitychange',
		webkitHidden: 'webkitvisibilitychange',
		mozHidden: 'mozvisibilitychange',
		msHidden: 'msvisibilitychange'
	};

	function fireEvent(name, target) {
		if ( (!isIdle && name == 'wakeup') || (isIdle && name == 'idle') ) return;
		isIdle = name == 'idle';
		target = target || win;
		var evt = doc.createEvent('Events');
		evt.initEvent(name, true, true); //true for can bubble, true for cancelable
		target.dispatchEvent(evt);
	}

	function startTimer() {
		timeoutID = win.setTimeout(function() { fireEvent('idle') }, secs * 1000);
	}

	function resetTimer() {
		win.clearTimeout(timeoutID);
		fireEvent('wakeup');
		startTimer();
	}

	win.addEventListener('mousemove', resetTimer, false);
	win.addEventListener('mousedown', resetTimer, false);
	win.addEventListener('click', resetTimer, false);
	win.addEventListener('keydown', resetTimer, false);
	win.addEventListener('DOMMouseScroll', resetTimer, false);
	win.addEventListener('mousewheel', resetTimer, false);
	win.addEventListener('touchstart', resetTimer, false);
	win.addEventListener('MSPointerMove', resetTimer, false);
	// For iOS, when closing Safari:
	win.addEventListener('pagehide', function() { win.clearTimeout(timeoutID); fireEvent('idle') }, false);
	win.addEventListener('pageshow', resetTimer, false);

	for (stateKey in keys) {
		if (stateKey in doc) {
			eventKey = keys[stateKey];
			break;
		}
	}

	doc.addEventListener(eventKey, function() {
		if (doc[stateKey]) { // Hidden
			win.clearTimeout(timeoutID);
		}
		else { // Visible
			startTimer();
		}
		fireEvent(doc[stateKey] ? 'idle' : 'wakeup');
	});

	startTimer();

})(window, document);
