/**
 * Polyphonic Pitch Set Detector
 *
 * Singleton class for analyzing polyphonic signals
 **/

var Polyphonic = (function(){
	var audioContext;
	var pitchSet = []; // Our current read on the audio stream

	var fft;
	var fftSize = 8192;

	var freqSpectrum;
	var freqSpectrumCount = 0;

	var noiseThreshold;
	var buffer;

	var intervalToggle;
	var onUpdateCallback;
	var updateRateMs = 40;

	var PITCH = {}
	PITCH.classes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
	PITCH.freqMap = [
		{f: 27.5, p: 'A'},
		{f: 29.1, p: 'A#'},
		{f: 30.9, p: 'B'},
		{f: 32.7, p: 'C'},
		{f: 34.6, p: 'C#'},
		{f: 36.7, p: 'D'},
		{f: 38.9, p: 'D#'},
		{f: 41.2, p: 'E'},
		{f: 43.7, p: 'F'},
		{f: 46.2, p: 'F#'},
		{f: 49.0, p: 'G'},
		{f: 51.9, p: 'G#'},
		{f: 55.0, p: 'A'},
		{f: 58.3, p: 'A#'},
		{f: 61.7, p: 'B'},
		{f: 65.4, p: 'C'},
		{f: 69.3, p: 'C#'},
		{f: 73.4, p: 'D'},
		{f: 77.8, p: 'D#'},
		{f: 82.4, p: 'E'},
		{f: 87.3, p: 'F'},
		{f: 92.5, p: 'F#'},
		{f: 98.0, p: 'G'},
		{f: 103.8, p: 'G#'},
		{f: 110.0, p: 'A'},
		{f: 116.5, p: 'A#'},
		{f: 123.5, p: 'B'},
		{f: 130.8, p: 'C'},
		{f: 138.6, p: 'C#'},
		{f: 146.9, p: 'D'},
		{f: 155.6, p: 'D#'},
		{f: 164.8, p: 'E'},
		{f: 174.6, p: 'F'},
		{f: 185.0, p: 'F#'},
		{f: 196.0, p: 'G'},
		{f: 207.7, p: 'G#'},
		{f: 220.0, p: 'A'},
		{f: 233.1, p: 'A#'},
		{f: 246.9, p: 'B'},
		{f: 261.6, p: 'C'},
		{f: 277.1, p: 'C#'},
		{f: 293.7, p: 'D'},
		{f: 311.1, p: 'D#'},
		{f: 330.6, p: 'E'},
		{f: 350.2, p: 'F'},
		{f: 370.0, p: 'F#'},
		{f: 392.0, p: 'G'},
		{f: 415.3, p: 'G#'},
		{f: 440.0, p: 'A'},
		{f: 466.2, p: 'A#'},
		{f: 493.9, p: 'B'},
		{f: 523.3, p: 'C'},
		{f: 554.4, p: 'C#'},
		{f: 587.3, p: 'D'},
		{f: 622.25, p: 'D#'},
		{f: 659.3, p: 'E'},
		{f: 698.5, p: 'F'},
		{f: 740.0, p: 'F#'},
		{f: 784.0, p: 'G'},
		{f: 830.6, p: 'G#'},
		{f: 880.0, p: 'A'},
		{f: 932.3, p: 'A#'},
		{f: 987.8, p: 'B'},
		{f: 1046.5, p: 'C'},
		{f: 1108.7, p: 'C#'},
		{f: 1174.7, p: 'D'},
		{f: 1244.5, p: 'D#'},
		{f: 1318.5, p: 'E'},
		{f: 1396.9, p: 'F'},
		{f: 1480.0, p: 'F#'},
		{f: 1568.0, p: 'G'},
		{f: 1661.2, p: 'G#'},
		{f: 1760.0, p: 'A'},
		{f: 1864.7, p: 'A#'},
		{f: 1975.5, p: 'B'},
		{f: 2093.0, p: 'C'},
		{f: 2217.5, p: 'C#'},
		{f: 2349.3, p: 'D'},
		{f: 2489.0, p: 'D#'},
		{f: 2637.0, p: 'E'},
		{f: 2793.8, p: 'F'},
		{f: 2960.0, p: 'F#'},
		{f: 3136.0, p: 'G'},
		{f: 3322.4, p: 'G#'},
		{f: 3520.0, p: 'A'},
		{f: 3729.3, p: 'A#'},
		{f: 3951.1, p: 'B'},
		{f: 4186.0, p: 'C'},
	];
	PITCH.freqMapLength = PITCH.freqMap.length;

	/**
	 * A buffer class for buffering samples from the audio stream
	 */
	var Buffer = function(audioContext, captureSize){
		this.captureSize = captureSize; // how many samples we capture in one update
		this.data = new Float32Array(this.captureSize*4);
		this.dataLength = this.data.length;
		this.pointer = 0;

		var that = this;
		this.node = audioContext.createScriptProcessor(this.captureSize, 1, 1);
		this.node.onaudioprocess = function(e){
			var input = e.inputBuffer.getChannelData(0);
			var output = e.outputBuffer.getChannelData(0);

			that.push(input);
			for (var i = 0; i < input.length; i++){
				output[i] = input[i];
			}
		};
	};

	Buffer.prototype.push = function(arr){
		if (this.pointer !== this.dataLength){
			for (var i = 0; i < this.captureSize; i++){
				this.data[this.pointer + i] = arr[i]
			}
			this.pointer += this.captureSize;
		} 

		// slide values over and push at end
		else {
			var endOffset = this.captureSize*3;
			for (var i = 0; i < endOffset; i++){
				this.data[i] = this.data[this.captureSize + i];
			}
			for (var i = 0; i < this.captureSize; i++){
				this.data[endOffset + i] = arr[i];
			}
		}
	};

	Buffer.prototype.isFull = function(){
		return this.pointer === this.dataLength;
	};

	var init = function(acxt){
		audioContext = acxt;

		setupFFT();
		setupBuffer();
	};

	/**
	 * Run through freq spectrum and bin up peaks into pitch classes
	 */
	var computePitchProfile = function(freqSpectrum){
		var pitchProfile = {};
		for (var each in PITCH.classes){
			var pitchClass = PITCH.classes[each];
			pitchProfile[pitchClass] = 0;
		}

		var numFreqs = freqSpectrum.length;
		var top = []; // Look at top 20 strongest frequencies
		for (var i = 0; i < numFreqs; i++){	
			top.push(freqSpectrum[i]);

			if (top.length >= 20){
				top.sort(function(a,b){return b.val - a.val});
				top.splice(20,1);
			}
		}

		var threshold = Math.max(
			noiseThreshold,
			0.25 * computeFreqSpectrumAmpRange(freqSpectrum)
			);

		//console.log(top.map(function(elt){if (elt.val > threshold){return [elt.freq, elt.val]}}));
		for (var each in top){
			var freq = top[each].freq;
			var val = top[each].val;

			// Only bin up freqs that are significantly big
			if (val > threshold){
				// ...And within instrument freq range
				if (freq > PITCH.freqMap[0].f - 5 && 
					freq < PITCH.freqMap[PITCH.freqMapLength-1].f + 5){

					var pitchClass = getPitchFromFreq(freq);
					if (pitchClass !== undefined){
						pitchProfile[pitchClass] += val;
					}
				}
			}
		}

		return pitchProfile;
	}

	/**
	 * Range of amplitude in frequency spectrum
	 */
	var computeFreqSpectrumAmpRange = function (freqSpectrum){
		var max = 0;
		var min = Infinity;
		var numFreqs = freqSpectrum.length;

		for (var i = 0; i < numFreqs; i++){
			var val = freqSpectrum[i].val;
			max = Math.max(max, val);
			min = Math.min(min, val);
		}

		return max-min;
	}

	/**
	 * Binary search for pitch class
	 */
	var getPitchFromFreq = function(freq){
		var len = PITCH.freqMapLength;
		var lo = 0;
		var hi = len;

		// Deal with edge cases
		if (freq < PITCH.freqMap[0].f){
			return PITCH.freqMap[0].p;
		} else if (freq > PITCH.freqMap[len-1].f){
			return PITCH.freqMap[len-1].p;
		}

		while(hi - lo > 1){
			var mid = Math.floor((hi + lo)/2);
			var testFreq = PITCH.freqMap[mid].f;

			if (freq < testFreq){
				hi = mid;
			} else if (freq > testFreq){
				lo = mid;
			} else {
				return PITCH.freqMap[mid].p;
			}
		}

		var pickLo = Math.abs(freq-PITCH.freqMap[lo].f);
		var pickHi = Math.abs(freq-PITCH.freqMap[hi].f);

		// Disregard frequences that are far from a pitch freq;
		if (Math.min(pickLo, pickHi) < 5){
			return pickHi < pickLo ? PITCH.freqMap[hi].p : PITCH.freqMap[lo].p;
		}
	};

	/**
	 * After we compute a pitch profile, we process it to
	 * get our final pitch set
	 */
	var getPitchSetFromProfile = function(pitchProfile){
		var pitchSet = [];

		// Convert to array of {p: pitch, val: value} objects
		var arr = []
		for (var pitchClass in pitchProfile){
			arr.push({p: pitchClass, val: pitchProfile[pitchClass]});
		}

		// Sort by strength of pitch class
		arr.sort(function(a,b){return b.val - a.val});

		// Strongest pitch becomes benchmark
		var benchmark = arr[0].val * 0.3;
		if (benchmark === 0){
			return pitchSet;
		} else {
			pitchSet.push(arr[0].p);
		}
		for (var i = 1; i < arr.length; i++){
			if (arr[i].val >= benchmark){
				pitchSet.push(arr[i].p);
			}
		}
		return pitchSet.sort();
	};
 
	var setupBuffer = function(){
		buffer = new Buffer(audioContext, 2048)
	};

	var setupFFT = function(){
		fft = new FFT(fftSize, audioContext.sampleRate/4);
	};

	/**
	 * Noise detector module. Compute must be called 15 times before global
	 * noiseThreshold is set.
	 */
	var noiseDetector = (function(){
		var noiseCount = 0;
		var noiseMax = 0;

		noiseDetectModule = {};
		noiseDetectModule.compute = function(freqSpectrum){
			if (noiseCount === 15){
				noiseThreshold = noiseMax*7; // since freqSpectrum is computed after 7 updates
			} else {
				for (var each in freqSpectrum){
					noiseMax = Math.max(noiseMax, freqSpectrum[each].val);
				}
				noiseCount += 1;
			}
		}
		return noiseDetectModule;
	})();

	var update = function(){
		if (buffer.isFull()){
			// Make copy of buffer
			var samples = new Float32Array(buffer.dataLength)
			for (var i=0; i<buffer.dataLength; i++){
				samples[i] = buffer.data[i];
			}

			// Run FFT
			fft.forward(samples);

			// Get spectrum
			var newFreqSpectrum = [];
			var nyquistFreq = 0.5 * audioContext.sampleRate;
			for (var i=0; i<fft.spectrum.length; i++){
				var obj = {};
				obj.freq = i*nyquistFreq / fft.spectrum.length;
				obj.val = fft.spectrum[i];

				newFreqSpectrum.push(obj);
			}

			if (noiseThreshold){
				if (freqSpectrumCount === 0){
					freqSpectrum = newFreqSpectrum;
				} else {
					for (var i=0; i<freqSpectrum.length; i++){
						freqSpectrum[i].val += newFreqSpectrum[i].val;
					}
				}
				freqSpectrumCount = (freqSpectrumCount + 1) % 7;

				// Pitch analysis every 7th update
				if (freqSpectrumCount === 0){
					// Compute a pitch profile
					var pitchProfile = computePitchProfile(freqSpectrum);

					// Get pitch set
					pitchSet = getPitchSetFromProfile(pitchProfile);

					if (onUpdateCallback !== undefined){
						onUpdateCallback(pitchSet);
					}	
				}
			} else {
				noiseDetector.compute(newFreqSpectrum);
			}
		}
	};

	var polyModule = {};
	polyModule.init = function(acxt){
		init(acxt);
	};
	polyModule.getAudioNode = function(){
		return buffer.node;
	};
	polyModule.getPitchSet = function(){
		return pitchSet;
	}
	polyModule.enable = function(){
		if (!intervalToggle){
			intervalToggle = window.setInterval(function() { 
				update();
			}, updateRateMs);
		}
	};
	polyModule.disable = function(){
		if (intervalToggle){
			window.clearInterval(intervalToggle);
			intervalToggle = undefined;
		}
	};

	// callback function to run every time we update.
  	// must take in pitch set as argument.
  	polyModule.setUpdateCallback = function(callback){
  		onUpdateCallback = callback;
  	}

	var instance;
  	return {
  		getInstance: function(){
  			if (!instance){
  				instance = polyModule;
  			}
  			return instance;
  		}
  	}
})();