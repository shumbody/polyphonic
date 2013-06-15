$(document).ready(function(){
	AudioController.initialize('freq-display');

	$('#play-btn').click(function(){
		AudioController.run();
	});
});