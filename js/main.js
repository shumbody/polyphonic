$(document).ready(function(){
	AudioController.initialize('freq-display');

	$('#toggle-btn').click(function(){
		AudioController.run();
	});
});