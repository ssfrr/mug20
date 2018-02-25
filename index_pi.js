var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('a user connected');
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

// export GPIO 18 as an output
var GPIO = require('onoff').Gpio,
	button = new GPIO(16, 'in', 'both'),
	led = new GPIO(18, 'out'),
	led2 = new GPIO(23, 'out');
	
button.watch(function(err, state) {
	console.log("err is " + err);
	console.log("state is " + state);
	if(state == 1) {
		console.log("button pressed!");
		io.emit('testSound');
	} else {
		console.log("button released!");
		io.emit('testSoundStop');
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

