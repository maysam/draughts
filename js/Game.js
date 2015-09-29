var Game = {

	difficulty: 'easy',
	images: ['img/sprite.png', 'img/close.png', 'img/draughts.jpg', 'img/draughts-small.jpg', 'img/logo_zygomatic.png', 'img/black_empty.gif', 'img/red_empty.gif', 'img/white.png', 'img/white_king.png', 'img/black.png', 'img/black_king.png'],
	fonts: [],

	turn: 1,
	moves: 0,
	pegs: [],
	cells: [],
	pegSize: 38,
	winner: 0,
	player: -1,
	computer: 1,
	AILevel: 1,
	baseURL: 'img/',
	world: null,
	worker: new Worker('js/AIworker.js'),
	gameActive: false,

	restart: function(player_color)
	{
		if (Game.gameActive) {
			if (!confirm(GameLib.word(110 /* Are you sure? */))) { return; }
		}

		if (player_color) { Game.player_color = player_color; }
		$('#yourTurn,#myTurn,#youWin,#youLoose').hide();

		Game.world.parent().addClass('rotateOut animated1s').one(GameLib.animEnd, function(){
			Game.world.parent().removeClass('rotateOut animated1s');
			Game.playAs(Game.player_color);
		});
	},
	toggleMusic: function()
	{
		if (GameSound.musicMuted) {
			GameSound.muteMusic(false);
			$('.audio .music').addClass('on');
		}
		else {
			GameSound.muteMusic(true);
			$('.audio .music').removeClass('on');
		}
	},

	toggleSound: function()
	{
		if (GameSound.soundMuted) {
			GameSound.muteSound(false);
			$('.audio .sound').addClass('on');
		}
		else {
			GameSound.muteSound(true);
			$('.audio .sound').removeClass('on');
		}
	},

	showMenu: function()
	{
		GameLib.resetHistory()
		GameLib.closePopup();
		GameSound.stopMusic();
		Game.gameDiv.hide();
		Game.menuDiv.show();
		ThirdParty.mainMenu();
	},

	showHelp: function()
	{
		ThirdParty.gameHelp();
		var html = [
			'<p>' + GameLib.word(105 /* Game help */) + '</p>',
			// '<p>' + GameLib.word(106 /* On touch screens */) + '</p>',
			'<div class="buttons">',
			'<p><button class="large awesome" onclick="GameLib.closePopup()">' + GameLib.word(3 /* Close */) + '</button></p>',
			'</div>'
		];
		GameLib.showPopup(GameLib.word(104 /* How to play Draughts */) , html.join(''), 400, 220, true, GameLib.resetHistory);
	},

	startGame: function(difficulty)
	{
		if (typeof difficulty == 'undefined') {
			difficulty = Game.difficulty;
		};
		Game.difficulty = difficulty;

		var diffs = {easy:1, medium:3, hard:5, expert:7};
		Game.AILevel = diffs[Game.difficulty];

		$('#youWin,#youLoose').hide();

		if (typeof GameAds !== 'undefined' && GameAds.showAd()) {
			// HTC One stock browser doesn't like to immediately call requestAds...
			GameSound.ping();
			setTimeout(function() { GameAds.requestAd(Game.showGame) }, 0);
		}
		else {
			Game.showGame();
		}
	},

	pause: function()
	{
		if (!Game.world.is(':visible') || $('#pauseDiv').length > 0) return;
		var html = [
			'<div id="pauseDiv">',
			'<p><div class="audio">' + $('div.audio').eq(0).html() + '</div></p>',
			'<div class="buttons">',
			'<p><button class="large awesome" onclick="Game.showMenu()">' +  GameLib.word(10 /* Menu */)  + '</button></p>',
			'<p><button class="large awesome" onclick="GameLib.closePopup()">' + GameLib.word(6 /* Continue */) + '</button></p>',
			'</div></div>'
		];
		GameLib.showPopup(GameLib.word(5 /* Pause */), html.join(''), 400, 240, true, Game.unpause);
	},

	unpause: function()
	{
		GameLib.closePopup();
	},

	showGame: function()
	{
		// Pause when idle. Wait a bit, so you don't get pause popup when reloading:
		function goIdle() {
			window.removeEventListener('idle', goIdle, false);
			setTimeout(Game.pause, 300);
		}
		window.addEventListener('idle', goIdle, false);

		ThirdParty.gameStart();
		$('#helpDiv').hide();
		//GameSound.playMusic(); // Don't wait, iPad doesn't like that
		Game.menuDiv.hide();
		Game.gameDiv.show();

		var wmap = {easy:118, medium:119, hard:120, expert:121};
		$('#difficulty').html(GameLib.word(wmap[Game.difficulty]));

		Game.playAs(-1); // Start as black = -1
	},
	// player == 1: player
	// player == -1: computer
	win: function(player)
	{
		Game.gameActive = false;
		GameSound.stopMusic();
		$('#yourTurn,#myTurn').hide();
		ThirdParty.levelComplete();

		if (player == this.computer) {
			// Computer wins
			$('#youLoose').fadeIn();
		}
		else {
			// Player wins
			$('#youWin').fadeIn();
			GameSound.playSound('youwin');
		}
	},
	// player=1: white, player=-1: black
	doAIDrop: function(player)
	{
		var bord = []
		for (var i = 0; i < 10; i++) {
			bord[i] = []
			for (var j = 0; j < 10; j++) {
				bord[i][j] = Game.pegs[j][i]
			}
		}
		Game.worker.postMessage({side: player || Game.computer, board:bord, level:Game.AILevel});
	},
	initWorker: function()
	{
		this.worker.addEventListener('message', function(ev) {
			var m = ev.data;
			var moves = m.move
			if(Array.isArray(moves)) {
				Game.move(moves)
			} else {
				Game.win(Game.player);
			}
		})
	},
	move: function(coordinates)
	{
		var jumped = false
		for (var i = 0; i <= coordinates.length-4; i+=2) {
			jumped = Game.step(coordinates[i], coordinates[i+1], coordinates[i+2], coordinates[i+3])
		}
		if(Game.canMove()) {
			Game.changeHand()
		} else {
			Game.win(Game.computer)
		}
	},
	step: function(from_i, from_j, to_i, to_j)
	{
		var to_id = 'peg_' + to_i + '_' + to_j
		var dropzone = $('#tile_' + to_i + '_' + to_j)
		var originator = $('#peg_' + from_i + '_' + from_j)

		$('.'+originator.prop('class').replace(' ','.')).css('border','none')

		originator.css('left', dropzone.css('left'))
		.css('top', dropzone.css('top'))
		.data('i', to_i)
		.data('j', to_j)
		.prop('id', to_id)
		.css('border','red solid thin')

		Game.pegs[to_i][to_j] = Game.pegs[from_i][from_j]
		Game.pegs[from_i][from_j] = 0

		Game.shouldJump = false
		if(Math.abs(from_i-to_i) >= 2) {
			// jump
			var dir_i = (to_i - from_i)/Math.abs(to_i - from_i)
			var dir_j = (to_j - from_j)/Math.abs(to_j - from_j)
			var w = from_j
			for (var z = from_i+dir_i; z != to_i; z += dir_i) {
				w += dir_j
				console.log(z, w)
				var enemy_i = z
				var enemy_j = w
				var enemy_sel = '#peg_' + enemy_i + '_' + enemy_j
				$(enemy_sel).fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500, function() { $(this).remove(); })
				Game.pegs[enemy_i][enemy_j] = 0
			}
			if(Game.canJumpFrom(to_i, to_j) > 0) {
				Game.shouldJump = [to_i, to_j]
			}
	 		setTimeout(function() { GameSound.playSound(Game.turn == Game.computer ? 'pegsdrop1' : 'pegsdrop2'); }, 8);
		} else {
			setTimeout(function() { GameSound.playSound(Game.turn == Game.computer ? 'pegdrop1' : 'pegdrop2'); }, 8);
		}
		if (!Game.shouldJump) {
			// king it
			if(to_j == 0 && Game.pegs[to_i][to_j] == Game.player) {
				Game.pegs[to_i][to_j] *= 2
				// change the src
				originator.prop('src', 'img/'+(Game.player_color == 1 ? 'white' : 'black')+'_king.png')
			}
			if(to_j == 9 && Game.pegs[to_i][to_j] == Game.computer) {
				Game.pegs[to_i][to_j] *= 2
				// change the src
				originator.prop('src', 'img/'+(Game.player_color == -1 ? 'white' : 'black')+'_king.png')
			}
		};
	},
	changeHand: function()
	{
		var humanPegs = 0
		var computerPegs = 0
		for (var i = 0; i < 10; i++) {
			for (var j = 0; j < 10; j++) {
				if (this.pegs[i][j]*this.player > 0) {
					humanPegs ++
				}
				if (this.pegs[i][j]*this.player < 0) {
					computerPegs ++
				}
			}
		}

		$('#human-captures').text(humanPegs)
		$('#computer-captures').text(computerPegs)

		if(!Game.shouldJump){
			this.turn = -this.turn;
		}

		$('#myTurn, #yourTurn').hide();
		if (this.turn == this.computer) {
			$('#myTurn').show();
			setTimeout(Game.doAIDrop, 1000)
		}
		else {
			$('#yourTurn').show();
		}
		return this.turn;
	},
	player_color : -1,
	playAs: function(player_color)
	{
		$('.peg').remove();
		Game.gameActive = true;
		Game.player_color = player_color

		$('#playerImg').prop('src', 'img/' + (Game.player_color == 1 ? 'white' : 'black') + '.png');

		this.turn = -Game.player_color;
		this.moves = 0;
		this.winner = 0;
		this.player = -1;
		this.computer = 1
		for (var i = 0; i < 10; i++) {
			this.pegs[i] = [];
			for(var j = 0; j < 10; j++) {
				this.pegs[i][j] = 0
				if((i+j)%2==1)
				{
					// r = Math.random()*7
					r = j
					if(r<4) {
						this.pegs[i][j] = this.computer
						img = $('<img>', {id:'peg_' + i + '_' + j, 'class':'peg', src: 'img/'+(Game.player_color == -1 ? 'white' : 'black')+'.png'})
							.css({left:(i*Game.pegSize)+'px', top:(j*Game.pegSize)+'px'})
							.data('i', i).data('j', j)
							.appendTo('#pegsDiv')
					}
					if(r>5) {
						this.pegs[i][j] = this.player
						img = $('<img>', {id:'peg_' + i + '_' + j, 'class':'peg', src: 'img/'+(Game.player_color == 1 ? 'white' : 'black')+'.png'})
							.css({left:(i*Game.pegSize)+'px', top:(j*Game.pegSize)+'px'})
							.prop('draggable', true)
							.data('i', i).data('j', j)
							.appendTo('#pegsDiv')
					}
				}
			}
		}
		Game.make_draggable()
		GameSound.playMusic(); // Don't wait, iPad doesn't like that
		Game.changeHand()
	},
	setStatus: function(text)
	{
		if (GameConfig.debug) {
			console.log(text);
		}
	},
	valid_move: function(i,j)
	{
		return (i>=0 && i<10 && j>=0 && j<10)
	},
	isPlayer: function(i,j)
	{
		return Game.pegs[i][j] == Game.player || Game.pegs[i][j] == Game.player*2
	},
	isComputer: function(i,j)
	{
		return Game.pegs[i][j] == Game.computer || Game.pegs[i][j] == Game.computer*2
	},
	capture_moves: function(i,j, directions, coming_dir, is_king)
	{
		var moves = []
		var double_kill = false
		var max_depth = 0
		for (var d in directions) {
			var dir = directions[d]
			var x = dir[0]
			var y = dir[1]
			if(x+coming_dir[0] != 0 || y+coming_dir[1] != 0) {
				var seen_computer = false
				var seen_landing = false
				var z = 1
				while(Game.valid_move(i+x*z,j+y*z)){
					var xz = i+x*z
					var yz = j+y*z
					if(seen_computer) {
						if(Game.isPlayer(xz, yz))
							break
						if(Game.isComputer(xz, yz))
							break
						seen_landing = true
					} else if (seen_landing) {
						if(Game.isPlayer(xz, yz))
							break
						if(Game.isComputer(xz, yz))
							break
					} else {
						if(Game.isPlayer(xz, yz))
							break
						if(Game.isComputer(xz, yz))
							seen_computer = true
						else
							if(!is_king)
								break
					}

					if (seen_landing) {
						var captured_moves = Game.capture_moves(i+x*z,j+y*z, directions, dir, is_king)
						if (captured_moves.moves.length > 0) {
							if (!double_kill) {
								double_kill = true
								moves = []
							}
							if(max_depth < captured_moves.depth) {
								max_depth = captured_moves.depth
								moves = []
							}
							if(max_depth == captured_moves.depth) {
								moves.push([i, j, i+x*z, j+y*z])
							}
						} else {
							if (!double_kill) {
								moves.push([i, j, i+x*z, j+y*z])
							}
						}
						if(!is_king)
							break
					}
					z++
				}
			}
		}
		return {moves: moves, depth: max_depth+1}
	},
	canJumpFrom: function(i,j)
	{
		if (Game.pegs[i][j]*Game.player > 0) {
			var directions = [[-1,-1], [1,-1], [-1,1], [1,1]]
			var is_king = Math.abs(Game.pegs[i][j])==2
			var capture_moves = Game.capture_moves(i,j, directions, [0,0], is_king)
			if (capture_moves.moves.length > 0) {
				return capture_moves.depth
			}
		}
		return 0
	},
	canJump: function()
	{
		var max_jump = 0;
		for (var i = 0; i < 10; i++) {
			for (var j = 0; j < 10; j++) {
				var jump_length = Game.canJumpFrom(i,j)
				if(jump_length > max_jump){
					max_jump = jump_length
				}
			}
		}
		return max_jump
	},
	possible_moves: function(i,j)
	{
		var is_king = Math.abs(Game.pegs[i][j])==2
		var	directions = [[-1,-1], [1,-1], [-1,1], [1,1]]
		if(!Game.shouldJump) {
			// make sure is longest jump
			var acceptable_jump = Game.canJump()
			if(acceptable_jump > 0) {
				var capture_moves = Game.capture_moves(i,j, directions, [0,0], is_king)
				if (capture_moves.moves.length > 0 && capture_moves.depth == acceptable_jump) {
					return capture_moves.moves
				}
				return []
			}
		} else if(Game.shouldJump[0] == i && Game.shouldJump[1] == j) {
			// just jump
			var capture_moves = Game.capture_moves(i,j, directions, [0,0], is_king)
			return capture_moves.moves
		}
		if(!is_king)
			directions = [[-1,-1], [1,-1]]
		var moves = []
		for (var d = 0; d < directions.length; d++) {
			var dir = directions[d]
			var x = dir[0]
			var y = dir[1]
			var from = 1
			var to = 1
			if(is_king)
				to = 10
			for (var z = from; z <= to; z++) {
				var xz = x*z
				var yz = y*z
				if(Game.valid_move(i+xz,j+yz) && Game.pegs[i+xz][j+yz] == 0)
					moves.push([i, j, i+xz, j+yz])
				else
					break
			}
		}
		return moves
	},
	shouldJump: false,
	canMove: function()
	{
		for (var i = 0; i < 10; i++) {
			for (var j = 0; j < 10; j++) {
				if (Game.pegs[i][j]*Game.player > 0) {
					var is_king = Math.abs(Game.pegs[i][j])==2
					var directions = [[-1,-1], [1,-1]]
					if(is_king)
						directions = [[-1,-1], [1,-1], [-1,1], [1,1]]
					for (var d = 0; d < directions.length; d++) {
						var dir = directions[d]
						var x = dir[0]
						var y = dir[1]
						if(Game.valid_move(i+x,j+y) && Game.pegs[i+x][j+y] == 0) {
							return true
						}
					}
				}
			}
		}
		return Game.canJump() > 0
	},
	make_draggable: function()
	{
		function highlight_possibilities(ev) {
	    // highlight possible targets
      if (!Game.gameActive || (Game.turn == Game.computer)) {
        return
      }
	    target = $(ev.target)
	    i = target.data('i')
	    j = target.data('j')
			var possibles = Game.possible_moves(i,j)
			for (var k = 0; k < possibles.length; k++) {
				m = possibles[k][2]
				n = possibles[k][3]
				Game.cells[m][n].addClass('dropzone')
				Game.cells[m][n].data('path', possibles[k])
			}
		}
		function remove_highlights(event) {
      $(event.target).css({'transform': 'translate(0,0)'});
      var x = -1
      var y = -1
      if(event.pageX) {
        x = event.pageX
        y = event.pageY
      } else {
      	if(event.gesture.center.pageX) {
  	      x = event.gesture.center.pageX
    	    y = event.gesture.center.pageY
	    	} else {
	        x = event.gesture.center.x
	        y = event.gesture.center.y
      	}
      }
      var dropEl = document.elementFromPoint(x, y)
      if ($(dropEl).hasClass('dropzone')) {
        var dropzone = $(dropEl)
        var path = dropzone.data('path')
        Game.move(path)
      }

      $('.dropzone').removeClass('dropzone')
      event.preventDefault();
		}
		function move_peg(event) {
      $(event.target).css('transform', 'translate(' + event.gesture.deltaX/GameLib.scale + 'px,' + event.gesture.deltaY/GameLib.scale + 'px)');
		}

		var options = {
		  preventDefault: true
		}
    $('[draggable="true"]').each(function(index, item) {
    	Hammer(item, options)
	      .on('panstart dragstart', highlight_possibilities)
  	    .on('pan drag', move_peg)
    	  .on('panend dragend', remove_highlights)
    })
	},
	create: function ()
	{
		for(var i = 0; i < 10; i++) {
			this.cells[i] = [];
			for(var j = 0; j < 10; j++) {
				if((i+j)%2==1)
					src = "img/black_empty.gif"
				else
					src = "img/red_empty.gif"
				rectGraphics = $('<img />');
				rectGraphics.css({
					// backgroundImage: 'url('+src+')',
					left: (i*this.pegSize) + 'px',
					top: (j*this.pegSize) + 'px'
				})
				.data('i', i)
				.data('j', j)
				.prop('src', src)
				.prop('id', 'tile_' + i + '_' + j)
				this.world.append(rectGraphics);
				this.cells[i][j] = rectGraphics;
			}
		}
	},
	init: function()
	{
		Game.containerDiv = $('#gameContainer');
		Game.menuDiv = $('#menuDiv');
		Game.gameDiv = $('#gameDiv');
		Game.world = $('#gameBoard #overlayDiv');

		// Toggle fullscreen
		if (ThirdParty.enableFullscreenToggle && screenfull.enabled) {
			$('.audio').append('<div class="sprite fullscreen" title="Toggle fullscreen" onclick="screenfull.toggle()">');
			document.addEventListener(screenfull.raw.fullscreenchange, function() {
				$('.fullscreen').toggleClass('on');
			});
		}
		// /Toggle fullscreen

		if (GameSound.musicMuted) {
			$('.audio .music').removeClass('on');
		}
		if (GameSound.soundMuted) {
			$('.audio .sound').removeClass('on');
		}

		Game.showMenu();

		Game.create();
		Game.initWorker();
	}

};
