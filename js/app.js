$(document).ready(function () {
	try {
		$('.loader_dots').show();
		setSettings();
	} catch (e) {
		console.log('+++ Exeption +++', e);
	}
});