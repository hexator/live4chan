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

var auto_post = false;
var last_post = "";
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;
var admin_pass = ""; // pass to auth with server for admin commands, set by /admin command
var highlight_regex = /.^/; // matches nothing
var hidden = {tripcodes:false,users:[]};

var socket = null;

var html5 = false;
try {
    html5 = (window.localStorage !== undefined && window.localStorage !== null);
} catch (e) {
    html5 = false;
}
var submit_beta = false;

var default_theme = "/style.css";

var submit_file = null;
var submit_filename = "";
var audio_recorder = null;

navigator.getMedia = (
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia
);


/* stuff to do on load */
$(document).ready(function () {
    "use strict";

    /* set up socket */
    socket = io.connect('/', {secure: (location.protocol === "https:")});
    socket.on('chat', function(data) {on_chat(data); if (chat_id === 'moderate') prompt_password(enable_admin_mode);});
    socket.on('alert', div_alert);
    socket.on('refresh', function() {setTimeout(function(){location.reload();},5000);});
    
    socket.on('disconnect', function(){create_server_post('You have been disconnected from the server, attempting to reconnect...');});
    socket.on('reconnect', function(){var old_id = chat_id; chat_id = "home"; set_channel(old_id); setTimeout(function(){create_server_post('Reconnected!')}, 2*1000);});
    socket.on('user_count', function(data){
        var s = data == 1 ? "" : "s";
        $("#user_count").text(data+" user"+s+" online");
    });

    $(document).bind('click', function(e){
        $('.settings_nav:first').hide('slow');
    });

    $('#settings_button').bind('click', function(e){
        e.stopPropagation();
        $('.settings_nav:first').toggle('slow');
        $('.settings_nav').bind('click', function(e2){
             e2.stopPropagation();
        });

    });

    $('#theme_select').change(function () {
        get_css($(this).val());
        if (html5) localStorage.theme = $(this).val().replace("null", default_theme);
        setTimeout(scroll, 300);
    });

    $('#spoilers').change(function () {
        if (html5) localStorage.spoilers = $(this).prop("checked");
        $('.spoiler').toggleClass('spoiled', !$(this).prop("checked"));
    });

    $('#volume').change(function () {
        if (html5) localStorage.volume = $(this).val();
    });

    $('#board_select').change(function () {
        var board = $(this).val();
        if (board=="")
            return;
        set_channel(board);
    });

    var prev_thumbnail_mode = $("#thumbnail_mode").val();
    $("#thumbnail_mode").change(function () {
        var new_value = $(this).val();
        if (prev_thumbnail_mode === "links-only") {
            $('.chat_img_cont').show('slow', function(){
                scroll();
            });
            if (new_value === "static") $('.thumb_static').show('slow');
            if (new_value === "animated") $('.thumb_anim').show('slow');
        } else if (new_value === "links-only") {
            $('.chat_img_cont').hide('slow');
            if (prev_thumbnail_mode === "static") $('.thumb_static').hide('slow');
            if (prev_thumbnail_mode === "animated") $('.thumb_anim').hide('slow');
        } else {
            $('.thumb_static').css("display", (new_value === "static") ? "inline" : "none");
            $('.thumb_anim').css("display", (new_value === "animated") ? "inline" : "none");
        }
        prev_thumbnail_mode = new_value;
    });

    set_up_html();

    $('#clearconvo').change(function() {
        if (html5) {
            if($(this).prop("checked"))
                localStorage.clearConvo = "true";
            else
                localStorage.clearConvo = "false";
        }
    });

    user_setup();

 if (chat_id  === 'moderate')
 {
     prompt_password(enable_admin_mode);
 }
});

if (chat_id === 'moderate')
{
    prompt_password(enable_admin_mode);
}

function create_server_post(status)
{
    var data = {};
    data.count = 0;
    data.convo = "";
    data.body = status;
    data.name = "";
    data.date = (new Date()).toString();
    data.trip = admins[0];
    console.log(data);
    update_chat(data, true);
    scroll();
}

/* convert uri to blob */
function data_URI_to_Blob(dataURI, dataTYPE) {
    var binary = atob(dataURI.split(',')[1]), array = [];
    for(var i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));
    return new Blob([new Uint8Array(array)], {type: dataTYPE});
}

/* load up css into the page */
function get_css(file) {
    "use strict";
    if ($('#css_new')) {
        $('#css_new').remove();
    }
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = 'css_new';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/css'+file;
    link.media = 'all';
    $('head').append(link);
    if ($('#css_highlight_new')) {
        $('#css_highlight_new').remove();
    }
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = 'css_highlight_new';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/plugins/code_highlight/css'+file;
    link.media = 'all';
    $('head').append(link);
}

function set_up_html(){
    if (html5) {
        /* set up only html5 local storage stuff */
        my_ids = localStorage.my_ids;
        if (my_ids) {
            my_ids = JSON.parse(my_ids);
        } else {
            my_ids = [];
        }
        
        ignored_ids = localStorage.ignored_ids;
        if (ignored_ids) {
	        ignored_ids = JSON.parse(ignored_ids);
        } else {
	        ignored_ids = [];
        }

        contribs = localStorage.contribs;
        if (contribs) {
            contribs = JSON.parse(contribs);
        } else {
            contribs = default_contribs;
        }
        
        /*if (!localStorage.theme || localStorage.theme === "null") {
            localStorage.theme = "/style.css";
        }*/


        if (localStorage.name !== undefined) $("#name").val(localStorage.name);
        if (localStorage.spoilers !== undefined) $("#spoilers").prop("checked", localStorage.spoilers === "true");
        if (localStorage.theme !== undefined) $("#theme_select").val(localStorage.theme);
        if (localStorage.clearConvo !== undefined) $("#clearconvo").prop("checked", localStorage.clearConvo === "true");
        if (localStorage.volume !== undefined) $("#volume").val(localStorage.volume);
		if (localStorage.hidden !== undefined) hidden = localStorage.hidden;
		if (localStorage.highlight_regex !== undefined) highlight_regex = localStorage.highlight_regex;
        if (localStorage.max_chats !== undefined) max_chats = localStorage.max_chats;

        cool_down_timer = localStorage.cool_down_timer ? parseInt(localStorage.cool_down_timer) : 0;
    }

    if (cool_down_timer>0)
        init_cool_down();
    if (!$("#theme_select").val() || $("#theme_select").val() === "null" || !$("#theme_select").val().replace(/^\s+|\s+$/gm, '')) {
        $("#theme_select").val(default_theme);
    }
    get_css($("#theme_select").val());

	// set up banners
	var banners = ["1.png", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg",
				   "9.jpg", "10.jpg", "11.png", "12.jpg", "13.jpg", "14.png", "15.png",
				   "16.jpg", "17.gif", "18.jpg", "19.gif", "20.jpg", "21.jpg", "22.jpg",
				   "23.png", "24.gif", "25.png"];
	
	$(".sidebar_banner").html(
			$("<img>").attr("src",
				"/images/banners/"+
				banners[(new Date).getTime() % banners.length])
			.css({width:"100%",height:"100%",marginBottom:"-3px"})
		)
		.click(function(){
			$(this).find("img")
			.attr("src", "/images/banners/"+banners[(new Date).getTime() % banners.length])	
		});

    var board = window.location.pathname.match(/[^\/]*$/)[0];
    var matched_link = window.location.hash.match(/^#(\d+)$/);
    set_channel(board, matched_link ? matched_link[1] : "");
}

/* give me captcha TODO: clean this up and make it work better */
function captcha_div() {
    "use strict";
    return '<span>Please enter the captcha</span><br><img src="/captcha.jpg#' + new Date().getTime() + '" alt="Lynx is best browser" /><form action="/login" method="post" target="miframe" style="padding:0;"><input type="text" name="digits" style="display:inline;" /><input style="display:inline;" type="submit"/></form>';
}

/* gets cookie, use this function instead of document.cookie */
function get_cookie(cname) {
    "use strict";
    var name = cname + "=";
    var ca = document.cookie.split(';');
    var i = 0;
    var c = null;
    for (i = 0; i < ca.length; i++) {
        c = ca[i].replace(/^\s+|\s+$/gm, '');
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/* alert whatever error was given to you by the server */
function div_alert(message, add_button, div_id) {
    "use strict";
    if (add_button === undefined) {
        add_button = true;
    }
    if (div_id === undefined) {
        div_id = "";
    }
    var alert_div = $("<aside class='alert_div'/>");
    alert_div.toggleClass("shown", chat_id !== 'home' && chat_id !== 'all' && chat_id !== 'moderate');
    alert_div.attr('id', 'alert_div_' + div_id);
    var button = $("<button class='alert_button'>X</button>");
    button.click(function() {
        alert_div.remove();
        $("#submit_button").prop("disabled", false);
    });
    /*if (!add_button) {
        button = [];
    }*/
    var alert_message = $("<article class='alert_message'/>");
    alert_message.html(message.replace(/\r?\n/g, '<br />'));
    alert_div.append(button, alert_message);
    alert_div.css({
        position: 'fixed',
        width: 'auto',
        bottom: '160px',
        left: document.width / 2 - 150,
        zIndex: 1000
    });
    $('.chats:first').append(alert_div);
}



/* clear input fields */
function clear_fields() {
    "use strict";
    clear_file_field();
    $("#body").val('');
    $("#sum").val('');
    if($("#clearconvo").prop("checked")
       && $('#convo_filter').val() !== 'filter') {
        $("#convo").val('');
    }
}

/* clear file field */
function clear_file_field() {
    if (audio_recorder) {
        audio_recorder.onstop = function(e) {};
        audio_recorder.stop();
        audio_recorder = null;
    }
    submit_file = null;
    submit_filename = "";
    $("#image").val('').show();
    $("#recording").remove();
    $('#record_button').toggle(navigator.getMedia != undefined && window.MediaRecorder != undefined);
    $('#stop_button').hide();
}

/* the cool down function (DO NOT CALL THIS DIRECTLY) */
function cool_down() {
    "use strict";
    if (html5) {
        localStorage.cool_down_timer = cool_down_timer;
    }
    if (cool_down_timer <= 0) {
        clearInterval(cool_down_interval);
        $("#cool_down").text("");
        $("#submit_button").prop("disabled", false);
        if (auto_post) {
            submit_chat();
        }
    } else {
        $("#cool_down").text(cool_down_timer);
        $("#submit_button").prop("disabled", true);
        cool_down_timer--;
    }
}

/* start a cool down, resets the interval, so no worries about calling ti twice */
function init_cool_down(){
    $("#submit_button").prop("disabled", true);
    clearInterval(cool_down_timer);
    cool_down();
    cool_down_interval = setInterval(cool_down, 1000);
}

/* simply ask for the captcha TODO: this is buggy, needs to be fixed */
function submit_captcha(){
    div_alert(captcha_div(), false, "captcha");
    $("#alert_div_captcha .alert_message form input")[0].focus();
    $("#submit_button").prop("disabled", true);
    cool_down_timer = 0;
}

/* prompt for admin password */
function prompt_password(callback) {
    var pw_div = $("<div style='position: absolute; z-index: 1000; text-align: center; background: white;'>Admin password:<br><input type='password'></div>");
    pw_div.css({
        top: ($(window).height()-pw_div.height())/2 + "px",
        left: ($(window).width()-pw_div.width())/2 + "px"
    });
    var pw_field = pw_div.find('input');
    pw_div.keypress(function(e) {
        if (e.keyCode === 13) { // enter
            pw_div.remove();
            callback(pw_field.val());
        }
    });
    pw_div.keyup(function(e) {
        if (e.keyCode === 27) { // escape
            pw_div.remove();
            callback(null);
        }
    });
    pw_field.blur(function(e) {
        pw_div.remove();
        callback(null);
    });
    $("body").append(pw_div);
    pw_field.focus();
}

function enable_admin_mode(password)
{
    if(!password || password.length <= 0)
        return;
    $( "<style>.chat_mod_tools {display: inline}</style>" ).appendTo( "head" )
    admin_pass = password;
}

function mod_delete_post(id, password)
{
    if(!password || password.length <= 0 || !id || id.length <= 0)
    {
        console.log("mod_delete_post: invalid param");
        return;
    }
        
    $.ajax({
        type: "POST",
        url: '/delete',
        data: {password: password, id: id}
    }).done(function (data_delete) {
        if(data_delete.success)
            div_alert("success");
        else
            div_alert("failure");
    });
}

function mod_warn_poster(id, password)
{
    if(!password || password.length <= 0 || !id || id.length <= 0)
    {
        console.log("mod_warn_poster: invalid param");
        return;
    }
    
    var reason = window.prompt("Warning reason","");
    reason = "<div style='background:red;padding:30px;margin:0;'><b>Warning from admin:</b><br><br>"+reason+"<br></div>"
    $.ajax({
        type: "POST",
        url: '/warn',
        data: {password: password, id: id, reason: reason}
    }).done(function (data_warn) {
        console.log(data_warn);
        if(data_warn.success)
            div_alert("success");
        else if (data_warn.failure)
            div_alert("failure:", data_warn.failure);
        else
            div_alert("failure");
    });
}

function mod_move_post(id, password)
{
    if(!password || password.length <= 0 || !id || id.length <= 0)
    {
        console.log("mod_warn_poster: invalid param");
        return;
    }
    
    var chat_room = window.prompt("Channel to move to","");
    $.ajax({
        type: "POST",
        url: '/move',
        data: {password: password, id: id, chat_room: chat_room}
    }).done(function (post_move) {
        if(post_move.success)
            div_alert("success");
        else
            div_alert("failure");
    });
}

function mod_ban_poster(id, board, password)
{
    if(!password || password.length <= 0 || !id || id.length <= 0 || !board || board.length <= 0)
    {
        console.log("mod_ban_poster: invalid param");
        return;
    }
    
    $.ajax({
        type: "POST",
        url: '/ban',
        data: {password: password, board: board, id: id}
    }).done(function (data_ban) {
        if(data_ban.success)
            div_alert("success");
        else
            div_alert("failure");
    });
}


function handle_post_response(resp) {
    if (resp.failure && resp.failure === "session_expiry") {
        $("#body").val(last_post);
        submit_captcha();
    } else if (resp.failure && resp.failure === "ban_violation") {
        div_alert("You've been banned.<br><br>  To appeal the ban send an email to <a href='mailto:mod.livechan@gmail.com'>a moderator</a>.  Please include your IP.");
        init_cool_down();
    } else if (resp.failure) {
        div_alert(resp.failure);
        init_cool_down();
    } else if (resp.id && $.inArray(resp.id, my_ids) < 0) {
        clear_fields();
        init_cool_down();
        my_ids.push(resp.id);
        if (html5) {
            localStorage.my_ids = JSON.stringify(my_ids);
        }
        if (quote_links_to[resp.id]) {
            $.each(quote_links_to[resp.id], function() {
                $(this).text($(this).text() + " (You)");
            });
        }
    } else if (resp.success === "captcha") {
        $("#submit_button").prop("disabled", false);
        $("#alert_div_captcha").remove();
        if (auto_post) {
            setTimeout(function(){submit_chat();}, 200);
        }
    }
}

