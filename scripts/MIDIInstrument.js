/**
 * MIDIInstrument
 * by Ben Houge
 * A basic Web Audio, sample-based MIDI instrument
 * Set the buffer, base frequency, and envelope (fade in/fade out)
 * Send play requests with MIDI note, volume (0-1), and duration 
 * Designed for generative use, when duration is known at note inception, not live MIDI performance 
 * Optionally specify how far into the sample buffer to start reading (in percentage of overall duration) 
 * Supports microtonality with fractional MIDI notes, also with a remapping look-up table
 * Mono only for now (as this is designed to play back on a mobile phone)
 * Optional completion callback when note is finished (perhaps not implemented);
 * In the future, would be nice to rewrite to avoid all the duplicate code in the two play functions...
 */

// creating an intermittentSound object with an object constructor
function MIDIInstrument(buffer, baseFreq, fadeIn, fadeOut, completionCallback) {
	//alert(this);
	this.buffer = buffer;
	this.baseFreq = baseFreq;
	this.fadeIn = fadeIn;
	this.fadeOut = fadeOut;
	this.completionCallback = completionCallback;
	this.basePitchForRetuning = 0;
	this.retuningMap = [];
	this.Q = 10.0;
	this.filterGain = 25.0;
	this.outputNode;
	
	this.volumeCurve = [];
	this.pitchCurve = [];
	this.filterCurve = [];
	
	this.loopStart = 0.5;
	this.loopEnd = 0.51;
	
	// private variables
	// Douglas Crockford told me to do this: http://www.crockford.com/javascript/private.html
	// It's a convention that allows private member functions to access the object
	// due to an error in the ECMAScript Language Specification
	var that = this;
	var timerID;
	
	this.playNote = function(msUntilStart, midiNote, volume, duration, startTime) {
		//somewhere in here we should probably error check to make sure an outputNode with an audioContext is connected
		//var newNow = that.outputNode.context.currentTime + 0.1;
		//var pitchMultiplier = pitchClassToMultiplier(that.pitchArray[pitchIndex][0], that.pitchArray[pitchIndex][1]);
		var audioBufferSource = that.outputNode.context.createBufferSource();
		audioBufferSource.buffer = that.buffer;
		var pitch = midiNoteToMultiplier(midiNote);
		audioBufferSource.playbackRate.value = pitch;
		audioBufferGain = that.outputNode.context.createGain();
		//audioBufferGain.gain.value = volume;
		//audioBufferGain.gain.setValueAtTime(0., newNow);
		//audioBufferGain.gain.setValueAtTime(0., that.outputNode.context.currentTime);
		audioBufferSource.connect(audioBufferGain);
		audioBufferGain.connect(that.outputNode);
		
		//seems goofy, but by scheduling everything slightly into the future (voluntarily adding latency),
		//I was able to get rid of an ugly intermittent click (which randomly occurred even with no randomnessin parameters)
		//Keep an eye on this value as you test on other devices...
		//you could use this as a way to have different timing offsets for different devices...
		//console.log("User-agent header sent: " + navigator.userAgent);
		//maybe this could help? https://source.android.com/devices/audio/latency_measurements
		var timeToStart = that.outputNode.context.currentTime + (msUntilStart / 1000.) + 0.1;
		
		//if duration is less than sum of fade times, scale fade times down proportionately
		var fadeIn;
		var fadeOut;
		if ((that.fadeIn + that.fadeOut) > duration) {
			var scalePercent = duration / (that.fadeIn + that.fadeOut);
			fadeIn = that.fadeIn * scalePercent;
			fadeOut = that.fadeOut * scalePercent;
		} else {
			fadeIn = that.fadeIn;
			fadeOut = that.fadeOut;
		}
		
		try {
			audioBufferGain.gain.linearRampToValueAtTime(0.0, timeToStart);
			audioBufferGain.gain.linearRampToValueAtTime(volume, timeToStart + fadeIn);
			audioBufferGain.gain.linearRampToValueAtTime(volume, timeToStart + (duration - fadeOut));
			audioBufferGain.gain.linearRampToValueAtTime(0.0, timeToStart + duration);
			//unless there's something I'm missing here, duration (in start call) gets scaled with pitch, i.e., duration of buffer
			//so if you want duration to not scale with pitch, you should multiply it by pitch, which I was not doing before.
			audioBufferSource.start(timeToStart, startTime, duration * pitch);
		} catch(e) {
			alert(e);
		}
		timerID = window.setTimeout(finishedPlaying, duration * 1000.);
	}

	this.playNoteWithFilter = function(msUntilStart, midiNote, volume, duration, startTime) {
		//somewhere in here we should probably error check to make sure an outputNode with an audioContext is connected
		//var newNow = that.outputNode.context.currentTime + 0.1;
		//var pitchMultiplier = pitchClassToMultiplier(that.pitchArray[pitchIndex][0], that.pitchArray[pitchIndex][1]);
		var audioBufferSource = that.outputNode.context.createBufferSource();
		
		//test
		audioBufferSource.loop = true;
		//holy cow, this is a perfect loop! You can bow the vibes forever! You are a genius!
		//you are looping it for exactly one cycle, and I guess the vibes are perfectly in tune, makes sense
		//audioBufferSource.loopStart = 1.498089;
		//audioBufferSource.loopEnd = 1.5;
		
		//bah, looks like these can't be changed with linearRampToValueAtTime, which would be pretty noisy anyway...
		
		//make these properties to control from the outside...
		//var loopStart = Math.random() * 5.;
		//var loopDur = Math.random() * 0.1 + 0.025;
		//var loopEnd = loopStart + loopDur;
		
		audioBufferSource.loopStart = this.loopStart;
		audioBufferSource.loopEnd = this.loopStart + this.loopDur;
		
		//console.log('audioBufferSource.loopStart' + audioBufferSource.loopStart);
		
		audioBufferSource.buffer = this.buffer;
		var pitch = midiNoteToMultiplier(midiNote);
		audioBufferSource.playbackRate.value = pitch;
		var audioBufferGain = that.outputNode.context.createGain();
		//audioBufferGain.gain.value = volume;
		//audioBufferGain.gain.setValueAtTime(0., newNow);
		//audioBufferGain.gain.setValueAtTime(0., that.outputNode.context.currentTime);

		
		var audioBufferFilter = that.outputNode.context.createBiquadFilter();
		//audioBufferFilter.frequency.value = 10000;
		audioBufferFilter.type = "lowpass";
		//audioBufferFilter.frequency.value = 1000;
		//audioBufferFilter.gain.value = 25.0;
		//audioBufferFilter.detune.value = 100;
		audioBufferFilter.Q.value = this.Q;
		
		audioBufferSource.connect(audioBufferFilter);
		audioBufferFilter.connect(audioBufferGain);
		audioBufferGain.connect(that.outputNode);
		
		
		//seems goofy, but by scheduling everything slightly into the future (voluntarily adding latency),
		//I was able to get rid of an ugly intermittent click (which randomly occurred even with no randomness in parameters)
		//Keep an eye on this value as you test on other devices...
		//you could use this as a way to have different timing offsets for different devices...
		//console.log("User-agent header sent: " + navigator.userAgent);
		//maybe this could help? https://source.android.com/devices/audio/latency_measurements
		var timeToStart = that.outputNode.context.currentTime + (msUntilStart / 1000.) + 0.1;
		
		try {
			var fadeIn;
			var fadeOut;
			if (that.volumeCurve.length) {
				for (var i = 0; i < that.volumeCurve.length; i++) {
					var correspondingTime = duration * that.volumeCurve[i][0];
					var correspondingValue = that.volumeCurve[i][1];
					//console.log('time: ' + correspondingTime + '; volume: ' + correspondingValue);
					audioBufferGain.gain.linearRampToValueAtTime(correspondingValue, correspondingTime + timeToStart);
				}
			} else {
				//if duration is less than sum of fade times, scale fade times down proportionately
				//console.log('fadeIn: ' + fadeIn + ';fadeOut: ' + fadeOut + '; duration: ' + duration);
				if ((that.fadeIn + that.fadeOut) > duration) {
					var scalePercent = duration / (that.fadeIn + that.fadeOut);
					fadeIn = that.fadeIn * scalePercent;
					fadeOut = that.fadeOut * scalePercent;
				} else {
					fadeIn = that.fadeIn;
					fadeOut = that.fadeOut;
				}
				audioBufferGain.gain.linearRampToValueAtTime(0.0, timeToStart);
				audioBufferGain.gain.linearRampToValueAtTime(volume, timeToStart + fadeIn);
				audioBufferGain.gain.linearRampToValueAtTime(volume, timeToStart + (duration - fadeOut));
				audioBufferGain.gain.linearRampToValueAtTime(0.0, timeToStart + duration);
			}
			
			//audioBufferSource.playbackRate.exponentialRampToValueAtTime(1.0, timeToStart);
			//audioBufferSource.playbackRate.exponentialRampToValueAtTime(1.1, timeToStart + (duration * 0.5));
			//audioBufferSource.playbackRate.exponentialRampToValueAtTime(0.95, timeToStart + duration);
			
			//console.log('that.pitchCurve: ' + that.pitchCurve);
			for (var i = 0; i < that.pitchCurve.length; i++) {
				var correspondingTime = duration * that.pitchCurve[i][0];
				var correspondingValue = that.pitchCurve[i][1];
				//console.log('time: ' + correspondingTime + '; pitch: ' + correspondingValue);
				audioBufferSource.playbackRate.exponentialRampToValueAtTime(correspondingValue, correspondingTime + timeToStart);
			}
			
			for (var i = 0; i < that.filterCurve.length; i++) {
				var correspondingTime = duration * that.filterCurve[i][0];
				var correspondingValue = that.filterCurve[i][1];
				//console.log('time: ' + correspondingTime + '; cutoff freq: ' + correspondingValue);
				audioBufferFilter.frequency.exponentialRampToValueAtTime(correspondingValue, correspondingTime + timeToStart);
			}
			/*
			audioBufferFilter.frequency.exponentialRampToValueAtTime(500.0, timeToStart);
			//audioBufferFilter.frequency.exponentialRampToValueAtTime(15000, timeToStart + (duration * 0.35));
			audioBufferFilter.frequency.exponentialRampToValueAtTime(20000, timeToStart + (duration * 0.5));
			//audioBufferFilter.frequency.exponentialRampToValueAtTime(1000, timeToStart + (duration * 0.65));
			//audioBufferFilter.frequency.linearRampToValueAtTime(10000, timeToStart + (duration - fadeOut));
			audioBufferFilter.frequency.exponentialRampToValueAtTime(500.0, timeToStart + duration);
			*/
			
			//unless there's something I'm missing here, duration (in start call) gets scaled with pitch, i.e., duration of buffer
			//so if you want duration to not scale with pitch, you should multiply it by pitch, which I was not doing before.
			//console.log('pitch: ' + pitch + '; startTime: ' + startTime);
			
			//holy cow, I think this is a bug
			//if the loop flag is set to true, the duration argument to start() behaves differently
			//if false, duration is how much of the buffer to play (i.e., if pitch/speed is 1/2, play twice as much)
			//if true, duration is in real time (ignore pitch, just stop after a certain amount of time)
			audioBufferSource.start(timeToStart, that.loopStart, duration);
		} catch(e) {
			alert(e);
		}
		timerID = window.setTimeout(finishedPlaying, duration * 1000.);
	}
	
	
	//think about this...do you need a stop function?
	//if you do, you need to hang on to every note you've launched keep track of when it ends to know what's playing
	//so that you can send it a stop message
	//you could do this in an array
	//maybe this is not important...you're not going to get stuck MIDI notes, since you're specifying duration at note start
	//it would only be useful when you stupidly ask for a really long note, in which case, just refresh the page, no? 
	this.stop = function() {
		if (this.isPlaying) {
			window.clearTimeout(timerID);
			this.isPlaying = false;
			finishedPlaying();
		}
	}
	

	//Should fire when all notes are done?
	function finishedPlaying() {
		//console.log("Done!");
		if (that.completionCallback) {
			that.completionCallback();
		}
	}
	

	function midiNoteToMultiplier(midiNote) {
		var multiplier;
		if (that.baseFreq == 0) {
			multiplier = Math.pow(2., midiNote / 12.);
		} else {
			//var scaleDegree = midiNote % 12;
			var scaleDegree = ((midiNote + 12) - that.basePitchForRetuning) % 12;
			//console.log('MIDI note ' + midiNote + ' is scale degree ' + scaleDegree);
			var octave = Math.floor((midiNote - that.basePitchForRetuning) / 12);
			//console.log('octave: ' + octave);
			
			var ratioToBaseNote;
			if (that.retuningMap[scaleDegree]) {
				ratioToBaseNote = that.retuningMap[scaleDegree];
			} else {
				ratioToBaseNote = Math.pow(2., scaleDegree / 12.);
			}
			//console.log('ratio of desired note to base note: ' + ratioToBaseNote);
			
			var scaleDegreeOfReferenceNote = (69 - that.basePitchForRetuning) % 12;
			var octaveOfReferenceNote = Math.floor((69. - that.basePitchForRetuning) / 12.);
			
			var ratioOfReferenceToBaseNote;
			if (that.retuningMap[scaleDegreeOfReferenceNote]) {
				ratioOfReferenceToBaseNote = that.retuningMap[scaleDegreeOfReferenceNote];
			} else {
				ratioOfReferenceToBaseNote = Math.pow(2., scaleDegreeOfReferenceNote / 12.);
			}
			
			//console.log('ratio of reference note to base note: ' + ratioOfReferenceToBaseNote);
			
			multiplier = ratioToBaseNote * ((440. / that.baseFreq) / ratioOfReferenceToBaseNote) * Math.pow(2., octave - octaveOfReferenceNote);
		}
		return multiplier;
	}
	

	function interpolate(value, curve) {
		//remember, expecting curve to be an array of breakpoints (i.e., two-element arrays)
		//we should clip it on the ends...
		//console.log('value: ' + value + '; curve: ' + curve + '; curve.length: ' + curve.length);
		var interpolatedValue;
		if (value < curve[0][0]) {
			interpolatedValue = curve[0][1];
		} else if (value > curve[curve.length - 1][0]) {
			interpolatedValue = curve[curve.length - 1][1];
		} else {
			for (var i = 0; i < curve.length; i++) {
				if (value < curve[i][0]) {
					//console.log('value ' + value + ' is less than curve[i][0] ' + curve[i][0]);
					//console.log('value - curve[i-1][0] is ' + (value - curve[i-1][0]));
					//console.log('curve[i][0] - curve[i-1][0] is ' + (curve[i][0] - curve[i-1][0]));
					var percentageThroughStage = (value - curve[i-1][0]) / (curve[i][0] - curve[i-1][0]);
					//console.log('percentage through stage: ' + percentageThroughStage);
					interpolatedValue = (percentageThroughStage * (curve[i][1] - curve[i-1][1])) + curve[i-1][1];
					//console.log('interpolated value: ' + interpolatedValue);
					return interpolatedValue;
				}
			}
		}
		return interpolatedValue;
	}
	
	this.connect = function(nodeToConnectTo) {
		try {
			if (nodeToConnectTo.destination) {
				this.outputNode = nodeToConnectTo.destination;
			} else {
				this.outputNode = nodeToConnectTo;
			}
		} catch(e) {
			alert("It seems you have not specified a valid node.");
		}
	}
}
