var app = require('express')();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var listenerCount = 0;
var supremeLeaderCount = 0;
var mysteryUserCount = 0;

//ok, instead of an array with arbitrary indices, give each file a handy instrument name
//that way, if you add or replace samples here, you don't need to change it on the receiving end
var fileNames = {
		click: "click.mp3",
		piano1: "Piano72a.mp3",
        piano2: "Piano72b.mp3",
        piano3: "Piano72c.mp3",
        voice1: "Ben_Drone_C3.mp3"
};

var directoryPrefix = '/sounds/compressed/';

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get(/^(.*)$/, function(req, res){
	//if a specific file is requested, pass it on through...
	//note; this seems to be required for script files, too...
	res.sendFile(__dirname + req.params[0]);
});

var rootNote = 60;
var lastFewTimeStamps = [];
var timeStampIndex = 0;

//Connect to remote server
var remoteServer = require('socket.io-client')('http://mug20.gustatory.audio:3100');
remoteServer.on('connect', function(){
	console.log('connected to remote server at port 3100.');
	var localTime = Date.now();
	remoteServer.emit('get time', localTime);
});
remoteServer.on('control message', function(msg){
	rootNote = msg;
	console.log('new root note: ' + msg);
});
remoteServer.on('server time', function(msg){
	var timeStamp = JSON.parse(msg);
	console.log('originalTime: ' + timeStamp.originalTime + '; serverTime: ' + timeStamp.serverTime);
	var latency = (timeStamp.serverTime - timeStamp.originalTime) / 2.0;
	console.log('local time is ' + latency + 'behind server time');
	lastFewTimeStamps[timeStampIndex] = latency;
	console.log('lastFewTimeStamps: ' + lastFewTimeStamps);
	var averageDifference = 0;
	for (var i = 0; i < lastFewTimeStamps.length; i++) {
		averageDifference += lastFewTimeStamps[i];
	}
	averageDifference = averageDifference / lastFewTimeStamps.length;
	console.log('average difference: ' + averageDifference);
});
remoteServer.on('disconnect', function(){
	console.log('disconnected from remote server.');
});

io.on('connection', function(socket){
	//console.log('a user connected');
	socket.on('disconnect', function(){
		  if (socket.category == "listener") {
			  listenerCount--;
			  console.log('listener disconnected; listeners remaining: ' + listenerCount);
		  } else if (socket.category == "supreme leader") {
			  supremeLeaderCount--;
			  console.log('supreme leader disconnected; supreme leaders remaining: ' + supremeLeaderCount);
		  } else {
			  console.log('mystery user disconnected; mystery users remaining: ' + mysteryUserCount);
			  mysteryUserCount--;
		  }
	  });
	socket.on('i am', function(msg){
	    if (msg == 'listener') {
	    	socket.category = msg;
	    	listenerCount++;
	    	console.log("listener connected; listeners: " + listenerCount);
	   
	    	//tell listener how many audio files to expect
	    	var numberOfFilesToSend = Object.keys(fileNames).length
	    	
	    	//don't change this format! 'sending audio' is a specially formatted command!
	    	socket.emit('sending audio', numberOfFilesToSend);

	    	//send the audio files
	    	for (var instrument in fileNames) {
	    		//console.log(fileNames[instrument]);
	    		var fileToPush = __dirname + directoryPrefix + fileNames[instrument];
	    		//console.log(fileToPush + ' is a ' + instrument);
	    		pushSoundToClient(fileToPush, instrument, socket);
	    	}
	    } else if (msg == 'supreme leader') {
	    	socket.category = msg;
	    	supremeLeaderCount++;
	    	console.log("supreme leader connected; supreme leaders: " + supremeLeaderCount);
	    } else {
	    	console.log("mystery user connected; mystery users: " + mysteryUserCount);
	    	mysterUserCount++;
	    }
  });
  socket.emit('get type', 'because you just connected!');
});

function pushSoundToClient(filename, bufferIndex, socket) {
	//console.log('Pushing ' + filename + ' to buffer index ' + bufferIndex + ' on socket ' + socket);
	fs.readFile(filename, function(err, buf){
		if (err) {
			console.log("Error: " + err);
		} else {
			//console.log('audio index:' + bufferIndex);
			//note: now sending instrument name instead of numerical index, but should still work...
		    socket.emit('audio', { audio: true, buffer: buf, index: bufferIndex });
		}
	});
}

console.log('I am a Raspberry Pi.');
http.listen(3000, function(){
	console.log('listening on *:3000');
});

/*
// export GPIO 18 as an output
// need to comment this out if you're not running on a Pi
var GPIO = require('onoff').Gpio,
	button = new GPIO(16, 'in', 'both'),
	led = new GPIO(18, 'out'),
	led2 = new GPIO(23, 'out');
	
var buttonIsOn = false;
button.watch(function(err, state) {
	console.log("err is " + err);
	console.log("state is " + state);
	if(state == 1 && !buttonIsOn) {
		console.log("button pressed!");
		io.emit('testSound', rootNote);
		buttonIsOn = true;
	} else {
		console.log("button released!");
		io.emit('testSoundStop');
		buttonIsOn = false;
	}
});


// start a timer that runs the callback function every second 
setInterval(function() {
	// get the current state of the LED
	var state = led2.readSync();
	// write the opposite of the current state to the LED
	led2.writeSync(Number(!state));
}, 100);

// start a timer that runs the callback function every second 
setInterval(function() {
	// get the current state of the LED
	var state = led.readSync();
	// write the opposite of the current state to the LED
	led.writeSync(Number(!state));
}, 80);

*/

