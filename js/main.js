$(document).ready(function(){
	AudioController.initialize('freq-display');

	var parity = 0;
	$('#toggle-btn').click(function(){
		if ($('#intro').is(':visible')){
			$('#intro').hide();
		}

		if (parity === 0){
			AudioController.run();
			$(this).html('Stop');
		} else {
			AudioController.stop();
			$(this).html('Start');
		}
		parity = (parity + 1)%2;
	});
});