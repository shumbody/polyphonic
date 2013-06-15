var AudioController = (function(){
	var audioContext;
	var analyzer;

	// where we display the frequency spectrum
	var freqDisplay;

	navigator.getMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

	var init = function(canvasId){
		if (canvasId){
			if (typeof AudioContext !== "undefined") {
		        audioContext = new AudioContext();
	        } else if (typeof webkitAudioContext !== "undefined") {
	            audioContext = new webkitAudioContext();
	        } else {
	            throw new Error('AudioContext not supported.');
	        }

	        freqDisplay = new SpectrumBox(2048, 30, canvasId, audioContext);
  			freqDisplay.setValidPoints(500);
  			freqDisplay.getCanvasContext().fillStyle = 'rgb(150, 150, 150)';
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
		// Create an AudioNode from the stream
		var mediaStreamSource = audioContext.createMediaStreamSource(stream);

		// Connect to analyzer
		analyzer = audioContext.createAnalyser();
		analyzer.fftSize = 2048;
		mediaStreamSource.connect(analyzer);

		// Connect to spectrum display
		var freqNode = freqDisplay.getAudioNode();
		mediaStreamSource.connect(freqNode);
	}

	var audioModule = {}// The public object we return
	audioModule.initialize = function(canvasId){
		init(canvasId);
	};
	audioModule.run = function(){
		// Get audio and create a stream
		getUserMedia({audio: true}, gotStream);

		// Enable spectrum display
		freqDisplay.enable();
	};

	return audioModule;
})();