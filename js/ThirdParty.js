var ThirdParty = {

centerHorizontally: true,
centerVertically: true,
showRotateHint: true,
enableFullscreenToggle: true,

// Called when all assets have been loaded
loadingComplete: function()
{
	 //console.log('API: loadingComplete');
},

// Called when the main menu is showed
mainMenu: function() 
{
	//console.log('API: mainMenu');
},

gameHelp: function() 
{
	//console.log('API: gameHelp');
	GameAnalytics.hit('GameHelp');
},

// Called when the game (first level) starts
gameStart: function() 
{
	//console.log('API: gameStart');
	GameAnalytics.hit('GameStart');
},

// Called when a level is completed
levelComplete: function(level) 
{
	//console.log('API: levelComplete: ' + level);
	GameAnalytics.hit('LevelComplete', level);
},

// Called when game over
gameOver: function() 
{
	//console.log('API: gameOver');
	GameAnalytics.hit('GameOver');
},

// Called when game is restarted
restartGame: function() 
{
	//console.log('API: restartGame');
},

// Called when game is completed (all levels completed)
gameComplete: function() 
{
	//console.log('API: gameComplete');
	GameAnalytics.hit('GameComplete');
},

showLeaderboard: function()
{
	//console.log('API: showLeaderboard');
	GameHiscore.leaderBoard();
},

// Called when user is ready to submit a score.
submitScore: function(score, level) 
{
	//console.log('API: submitScore ' + score);
	if (GameLib.online) {
		GameHiscore.submitScore(score);
	}
	else {
		alert('You are offline, you cannot submit your score.');
	}
}

};
