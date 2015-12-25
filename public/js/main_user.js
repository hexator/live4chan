/*
    LiveChan is a live imageboard web application.
    Copyright (C) 2014 LiveChan Team

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
 * Setup for normal users
 */

function user_setup()
{
    /* key bindings for actions */
    $("#name").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#convo").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#body").keydown(function (e) {
        if (!e.shiftKey && e.keyCode === 13) {
            var msg = $("#body").val();
            if ($("#autosubmit").prop('checked') && cool_down_timer <= 0 && !($("#submit_button").prop("disabled"))
                || msg.indexOf('//') !== 0 && msg.indexOf('/') === 0) { /* no delay if command */
                submit_chat();
            } else {
                auto_post = true;
                $("#submit_button").prop("value", "Submit (Auto)");
            }
            return false;
        }
    });

    /* hacky processing request responses */
    $('iframe#miframe').load(function () {
        var resp;
        try {
            resp = JSON.parse($($("#miframe").contents()[0].body).text());
        } catch (e) {
            resp =  {failure:$($("#miframe").contents()[0].body).text()};
        }
        handle_post_response(resp);
    });

	// ensure files are no greater than 10mb
    $("#image").bind('change', function() {
		if (this.files[0].size > 10000000){
			div_alert("File too large. 10MB is the maximum file size.");
			clear_file_field();
		}
	});

    $('#convo, #convo_filter').change(function () {
        apply_filter();
    });

    $('#sidebar_hider').click(toggle_sidebar);

    clear_file_field();

	$('#camera_button').click(function(){
		var cam = $('<div id="my_camera" style="width:320px; height:240px;"></div>');
		cam.css({
			zIndex:1000,
			position:'absolute',
			top:0,
			left:0
		});
		cam.click(function(){
			var data_uri = Webcam.snap();
			var raw_image_data = data_uri.replace(/^data\:image\/\w+\;base64\,/, '');
			submit_file = data_URI_to_Blob(data_uri, 'image/jpeg');
			submit_filename = "webcam.jpeg";
			var recording = $('<img id="recording" controls class="input_button"/>');
            recording.attr("src", data_uri);
            recording.css({height:"25px"});
            recording.insertAfter($("#image"));
			  Webcam.reset();
			cam.remove();
		});
		$('body').append(cam);
		Webcam.attach('#my_camera');
		cam.prepend($("<span>Click the image to take a picture</span>")
			.css({background:"white",textAlign:"center",position:"absolute",top:0,width:"100%"}));
	});

    $('#record_button').click(function() {
        $('#stop_button').show();
        $('#record_button').hide();
        navigator.getMedia(
            {audio: true},
            function(stream) {
                audio_recorder = new MediaRecorder(stream);
                var data = [];
                audio_recorder.ondataavailable = function(e) {
                    data.push(e.data);
                };
                audio_recorder.onstop = function(e) {
                    $("#image").val('').hide();
                    $('#stop_button').hide();
                    submit_file = new Blob(data, {type: 'audio/ogg'});
                    submit_filename = "recording.ogg";
                    var recording = $('<audio id="recording" controls class="input_button"/>');
                    recording.attr("src", URL.createObjectURL(submit_file));
                    recording.insertAfter($("#image"));
                    audio_recorder = null;
                };
                audio_recorder.start();
            },
            function(e) {}
        );
    });

    $('#stop_button').click(function() {
        if (audio_recorder) audio_recorder.stop();
    });

    $('#clear_button').click(clear_file_field);
    $('#submit_button').click(submit_chat);


}

/*
 * Setup for moderators - this should be empty for main_user.js
 */
function moderator_setup()
{
}

/* spawns a plugin */
var plugin;
function spawn_plugin(script_text,elem_html){
	if (!confirm("Livechan is not responsible for the scripts in this plugin. Are you sure you want to continue?")) return;
	if (plugin) {
		plugin.remove();
	}
	plugin = $('<div>');
	plugin.addClass('chat_plugin');
	var close = $('<div>');
	close.addClass('chat_plugin_close link');
	close.text('X');
	close.click(function(){
		plugin.remove();
	})

	var plugin_html = $('<div>');
	var script = $('<script>');

	script.html(script_text);
	plugin_html.html(elem_html);
	
	plugin.prepend(script);
	plugin.append(plugin_html);
	plugin.append(close);

	$('.chats_container').prepend(plugin);
}

function submit_chat() {
    "use strict";

    if($.inArray($("#convo").val(), convos) < 0 && $("#convo").val() !== "")
        cool_down_timer+=14;

    last_post = $("#body").val();
    if (get_cookie("password_livebunker") === '') {
        submit_captcha();
        $("#submit_button").prop("value", "Submit (Auto)");
        auto_post = true;
        return false;
    }

    $("#submit_button").prop("value", "Submit");

    auto_post = false;

    if (html5) {
        localStorage.name = $("#name").val();
        localStorage.theme = $("#theme_select").val();
    }

    if ($("#body").val() === '' && $("#image").val() === '') {
        return;
    }

    var msg = $("#body").val();
    if (msg.indexOf('//') !== 0 && msg.indexOf('/') === 0) {
        var cmdend = msg.indexOf(' ');
        if (cmdend <= 0) {
            cmdend = msg.length;
        }
        var cmd = msg.substring(1, cmdend).replace("\n", '');
        var param = msg.substring(cmdend + 1, msg.length).replace("\n", '');
        $("#body").val('');
        switch (cmd) {
        case "admin":
            if(param) {
                enable_admin_mode(param);
            } else {
                prompt_password(enable_admin_mode);
            }
            break; 
        case "addtryp":
            if (param) {
                contribs.push(param);
                if (html5) {
                    localStorage.contribs = JSON.stringify(contribs);
                }
            } else {
                div_alert("usage: /addtryp !tripcode");
            }
            break;
        case "remtryp":
            if (param) {
                var idx = $.inArray(param, contribs);
                if (idx > -1) {
                    contribs.splice(idx, 1);
                    if (html5) {
                        localStorage.contribs = JSON.stringify(contribs);
                    }
                }
            } else {
                div_alert("usage: /remtryp !tripcode");
            }
            break;
        case "j":
        case "join":
            if (param) {
                window.open('http://' + document.location.host + '/chat/' + param.replace('/', ''));
            } else {
                div_alert("usage: /join /channel");
            }
            break;
        case "stream":
        		var tempName = Math.random().toString(36).substring(2);
        		var options = "";
        		if (param) {
	        		if (param == "webcam") {
		        		options = "&type=1";
	        		} else if (param == "desktop") {
		        		options = "&type=0";
	        		}
        		}
        		window.open('https://' + document.location.host + '/js/stream/cam.html?name=' + tempName + options, tempName, "width=800, height=600");
        		var el = $("#body")[0];
        		var tempHash = Sha256.hash(tempName);
		    		el.value += 'stream: '+'https://' + document.location.host + '/js/stream/cam.html?hash=' + tempHash;
        		break;
        case "s":
        case "switch":
            if (param) {
                set_channel(param.replace('/', ''));
            } else {
                div_alert("usage: /switch /channel");
            }
            break;
        case "h":
        case "highlight":
            if (param) {
                highlight_regex = new RegExp(param);
                if (localStorage) {
	                localStorage.highlight_regex = highlight_regex;
                }
            } else {
                div_alert("usage: /highlight [javascript regex]");
            }
            break;
        case "c":
        case "cache":
            if (param) {
                max_chats = parseInt(param);
                if (!(max_chats > 0)) { max_chats = 100; }
                if (localStorage) {
	                localStorage.max_chats = max_chats;
                }
            } else {
                div_alert("usage: /highlight [javascript regex]");
            }
            break;
        case "t":
        case "tab":
            if (param) {
                set_channel(param.replace('/', ''),null,null,true);
            } else {
                div_alert("usage: /switch /channel");
            }
            break;
        case "plugin":
            var el = $("#body")[0];
		    var text = "[plugin]\n[title]My Plugin[/title]\n"+
		    "[script]\n\n[/script]\n"+
		    "[html]\n\n[/html]\n[/plugin]";
		    el.value = text;
            break;
        case "delete":
            prompt_password(function(password) {
                mod_delete_post(param, password);
            });
            break;
        case "warn":
            prompt_password(function(password) {
                mod_warn_poster(param, password);
            });
            break;
        case "ban":
            prompt_password(function(password) {
                mod_ban_poster(param[0], param[1], password);
            });
            break;
        case "set":
            param = param.split(' ');
            $.ajax({
                type: "POST",
                url: '/set',
                data: {id: param[0], text: param.splice(1).join(' ')}
            }).done(function (data_delete) {
                if(data_delete.success)
                    div_alert("success");
                else
                    div_alert("failure");
            });
            break;
        case "ignore":
        	var chat_count = parseInt(param);
        	if (chat_count !== NaN) {
        		console.log(chat_count, chat[chat_count]);
	        	ignored_ids.push(chat[chat_count].identifier);
	        	localStorage.ignored_ids = JSON.stringify(ignored_ids);
        	}
					break;
				case "unignore":
	        localStorage.ignored_ids = JSON.stringify([]);
	        ignored_ids = [];
					break;
        case "refresh":
            prompt_password(function(password) {
                if (password) {
                    $.ajax({
                        type: "POST",
                        url: '/refresh',
                        data: {password: password}
                    }).done(function (data_delete) {
                        if(data_delete.success)
                            div_alert("success");
                        else
                            div_alert("failure");
                    });
                }
            });
            break;
        case "help":
        default:
            div_alert(
                "/addtryp !tripcode: add emphasis to tripcode\n" +
                "/remtryp !tripcode: remove emphasis from tripcode\n" +
                "/join /channel: join channel\n" +
                "/switch /channel: switch to channel in same window\n" +
                "/help: display this text\n\n" +
                "CONVERSATIONS\n" +
                "==============\n" +
                "On this site threads are known as \"conversations\"\n" +
                "You can change your active conversation from the default \"General\" in the second text box\n" +
                "Setting a conversation allows you filter posts to it by using the dropdown box in the lower right\n\n" +
                "SESSIONS\n" +
                "==============\n" +
                "After logging in by entering a CAPTCHA your session will last for at least 15 minutes\n" +
                "Once your session expires you will be prompted with a new CAPTCHA"
            );
        }
        return;
    } else if (FormData) {
        if (submit_file != null) {
            $("#image").prop("disabled", true);
        }
        var data = new FormData($("#comment-form")[0]);
        if (submit_file != null) {
            $("#image").prop("disabled", false);
            data.append("image", submit_file, submit_filename);
        }
        $.ajax({
            type: "POST",
            url: $("#comment-form").attr("action"),
            dataType: "json",
            data: data,
            contentType: false,
            processData: false
        }).done(handle_post_response);
    } else {
        $("#comment-form").submit();
    }

    if (!admin_mode) {
        cool_down_timer += 7;
        $("#submit_button").prop("disabled", true);
    }

    if (html5) {
        localStorage.cool_down_timer = cool_down_timer;
    }

    return false;
}


/* inserts quoted id at the cursor */
function quote(id) {
    "use strict";

    var el = $("#body")[0];
    var text = ">>" + id + "\n";
    var val = el.value,
        endIndex, range;
    if (el.selectionStart !== undefined && el.selectionEnd !== undefined) {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, el.selectionStart) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length;
    } else if (document.selection !== undefined && document.selection.createRange !== undefined) {
        el.focus();
        range = document.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();
    }

    // set conversation
    if ($.inArray(get_convo(), convos) > -1) {
        $("#convo").val(chat[id].convo);
        apply_filter();
    }
}
