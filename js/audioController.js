/**
 * Our main controller
 */
var AudioController = (function(){
	var audioContext;
	var polyphonic;
	var audioStream;

	// where we display the frequency spectrum
	var freqDisplay;

	// where we display the pitch set
	var pitchDisplay;

	navigator.getMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

	window.AudioContext = (window.AudioContext ||
		window.mozAudioContext ||
		window.webkitAudioContext ||
		window.msAudioContext ||
		window.oAudioContext);

	var init = function(canvasId){
		if (canvasId){
			if (AudioContext) {
		        audioContext = new AudioContext();
	        } else {
	            throw new Error('AudioContext not supported.');
	        }

	        polyphonic = Polyphonic.getInstance();
	        polyphonic.setUpdateCallback(updatePitchDisplay);
	        polyphonic.init(audioContext);

	        freqDisplay = new SpectrumBox(2048, 100, canvasId, audioContext);
  			freqDisplay.getCanvasContext().fillStyle = 'rgb(0, 0, 0)';

  			pitchDisplay = $('#pitch-display');
		}
	};

	/**
	 * Get audio from user microphone
	 *
	 **/
	var getUserMedia = function(options, callback){
		var errorCallback = function(e){
			console.log(e);
			alert(
				'Stream generation failed. Make sure your media settings are set correctly.'
			);
		}

		if (navigator.getMedia){
			try {
		        navigator.getMedia(options, callback, errorCallback);
		    } catch (e) {
		        console.log(e);
		    }
		} else {
			alert('Can\'t get user media.');
		}
	}

	/**
	 * Create stream and connect to analyzer and spectrum display
	 *
	 **/
	var gotStream = function(stream){
		// Store a reference to the stream so we can stop it later
		audioStream = stream;

		// Create an AudioNode from the stream
		var src = audioContext.createMediaStreamSource(stream);

		// Connect to polyphonic analyzer
		var analyzer = polyphonic.getAudioNode();
		src.connect(analyzer);

		// Connect to spectrum display
		var freqNode = freqDisplay.getAudioNode();
		analyzer.connect(freqNode);
	}

	var updatePitchDisplay = function(pitchSet){
		pitchDisplay.empty();
		var str = '';
		var disp = $('<span></span>').addClass('single');

		if (pitchSet.length === 0){
			str = '-';
		} else {
			str = pitchSet.join(', ');
			if (pitchSet.length > 3){
				disp.removeClass('single');
				disp.addClass('multi');
			}
		}
		disp.html(str);
		pitchDisplay.append(disp);
	}

	var audioModule = {}; // The public object we return
	var alreadyRun = false; // If we already asked for mic permission

	audioModule.initialize = function(canvasId){
		init(canvasId);
	};
	audioModule.run = function(){
		if (!alreadyRun){
			// Get audio and create a stream
			getUserMedia({audio: true}, gotStream);
			alreadyRun = true;
		}
		
		// Enable pitch detection
		polyphonic.enable();

		// Enable spectrum display
		freqDisplay.enable();
	};

	audioModule.stop = function(){
		// Stop the audio stream
		audioStream.stop();

		// Disable pitch detection
		polyphonic.disable();

		// Disable spectrum display
		freqDisplay.disable();
	}

	return audioModule;
})();