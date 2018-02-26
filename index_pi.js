var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var rootNote = 60;

//Connect to server
var remoteServer = require('socket.io-client')('http://mug20.gustatory.audio:3100');
remoteServer.on('connect', function(){
	console.log('connected to remote server at port 3100.');
});
//remoteServer.on('event', function(data){});
remoteServer.on('control message', function(msg){
	rootNote = msg;
	console.log('new root note: ' + msg);
});
//remoteServer.on('disconnect', function(){});

io.on('connection', function(socket){
	console.log('a user connected');
});

console.log('pretend I am a Raspberry Pi.');
http.listen(3000, function(){
	console.log('listening on *:3000');
});

// export GPIO 18 as an output
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

