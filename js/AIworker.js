/*

# Copyright 2014 Ryan Marcus
#
# This file is part of DraughtsAI.
#
# DraughtsAI is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# DraughtsAI is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with DraughtsAI.  If not, see <http://www.gnu.org/licenses/>.

*/

importScripts('rules.js');

addEventListener('message', function (event) {
  var player = new Rules.Player(event.data.board, event.data.side, event.data.level);
  var results = player.run()
  postMessage({ move: results[0], results: results});
}, false);
