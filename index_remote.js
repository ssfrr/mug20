/**
 * 
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('a user connected');
	socket.on('get time', function(msg){
	  	var timeStamp = Date.now();
	  	var timeStampMessage = '/timeStamp ' + msg + ':' + timeStamp;
	  	//socket.emit(), not io.emit(), which sends to everybody
	  	socket.emit('sync message', timeStampMessage);
	    //console.log('sync message: ' + timeStampMessage);
	});
});

console.log('pretend I am a remote server.');
http.listen(3100, function(){
	console.log('listening on *:3100');
});

var timerID
var timeToNextChord = 5000; //ms, remember
var notes = [60, 64, 65, 67, 62, 64, 58];
var notesIndex = 0;
timerID = setTimeout(pickNextChord, timeToNextChord);

function pickNextChord() {
	var rootNote = notes[notesIndex];
    emitControlMessage(rootNote);
    console.log('current root note: ' + rootNote);
    notesIndex++;
    if (notesIndex >= notes.length) {
    	notesIndex = 0;
    }
	timerID = setTimeout(pickNextChord, timeToNextChord);
}

function emitControlMessage(cm) {
	io.emit('control message', cm);
	console.log(cm);
}
