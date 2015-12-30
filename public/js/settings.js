/*
 * Gets the list of boards for the dropdown menu
 */
function get_board_list()
{
    $.ajax({
	type: "POST",
	url: '/boardlist',
	}).done(function (blist) {
	    var parsed = JSON.parse(blist);
	    var sel = document.getElementById('board_select');
	    var fragment = document.createDocumentFragment();

	    for (var b in parsed) {
                if (parsed[b].name == 'all')
                {
		    continue;
		}
		var opt = document.createElement('option');
		opt.innerHTML = '/' + parsed[b].name + ' - (' + parsed[b].desc + ')';
		opt.value = parsed[b].name;
		fragment.appendChild(opt);
	    };
	    sel.appendChild(fragment);
	});
}

get_board_list();
