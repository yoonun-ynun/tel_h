var fetch = require('node-fetch')
var fs = require('fs')
var FormData = require('form-data')

var key = process.env.BOT_KEY;
var bot_addr = 'https://api.telegram.org/bot' + key + '/';


var Action = {
	sendMessage: function(chat_id, text, reply_markup){
		var msg = {"chat_id": chat_id, "text": text};
		if(reply_markup){
			msg["reply_markup"] = reply_markup;
		}
		fetch(bot_addr + 'sendMessage',{
                        method: "POST",
                        headers:{"Content-Type": "application/json"},
                        body: JSON.stringify(msg)
                })
		.then((response) => response.json())
		.then((data) => logResponse(data))
	},
	createNewStickerSet: createNewStickerSet,
	getStickerSet: async function(name){
		var msg = {"name": name}
		var result = await fetch(bot_addr + 'getStickerSet', {
			method: "POST",
			headers:{"Content-Type": "application/json"},
			body: JSON.stringify(msg)
		})
		var res_json = await result.json()
		logResponse(res_json)
		return res_json
	},
	sendSticker: async function(chat_id, sticker){
		var msg = {"chat_id": chat_id, "sticker": sticker}
		var result = await fetch(bot_addr + 'sendSticker', {
			method: "POST",
			headers:{"Content-Type": "application/json"},
			body: JSON.stringify(msg)
		})
		result.json().then((data) => logResponse(data))
	},
	sendPhoto: sendPhoto,
	editMessagePhoto: editMessagePhoto,
	sendMediaGroup: sendMediaGroup,
	editMessageText: editMessageText
}

function editMessageText(chat_id, message_id, text, reply_markup){
	var msg = {chat_id: chat_id, message_id: message_id, text: text};
	if(reply_markup){
		msg["reply_markup"] = reply_markup;
	}
	fetch(bot_addr + 'editMessageText',{
        method: "POST",
        headers:{"Content-Type": "application/json"},
        body: JSON.stringify(msg)
    })
	.then((response) => response.json())
	.then((data) => logResponse(data))
}

async function sendMediaGroup(chat_id, media, files){
	var form = new FormData();
	form.append('chat_id', chat_id);
	form.append('media', JSON.stringify(media));
	for(var i = 0;i<files.length;i++){
		var temp = `search_${i}`;
		form.append(temp, files[i],{filename: `hitomi.webp`,contentType: 'image/webp'});
	}
	var res = await fetch(bot_addr+'sendMediaGroup',{
		method: "POST",
		body: form
	})
	var data = await res.json();
	var ids = [];
	var messages = data.result;
	for(var i = 0;i<messages.length;i++){
		ids.push(messages[i].message_id);
	}
	logResponse(data);
	return ids;
}

async function createNewStickerSet(user_id, name, title, stickers, sticker_format, inputpath){
	var form = new FormData()
	form.append('user_id', user_id)
	form.append('name', name)
	form.append('title', title)
	form.append('stickers', JSON.stringify(stickers))
	form.append('sticker_format', sticker_format)
	for(var i = 0;i<inputpath.length;i++){
		form.append(`${i}dccon`, fs.createReadStream(inputpath[i]), {filename: `${i}.webm`, contentType:'video/VP9'})
	}
	var res = await fetch(bot_addr + 'createNewStickerSet',{
		method:"POST",
		body: form
	})
	res.json().then((data) => logResponse(data))
}

function editMessagePhoto(chat_id, message_id, buffer, reply_markup){
	var form = new FormData();
	form.append('chat_id', chat_id);
	form.append('message_id', message_id);
	var inputMediaPhoto = {
		'type': 'photo',
		'media': 'attach://Hwebp'
	}
	if(reply_markup){
	form.append('reply_markup', JSON.stringify(reply_markup));
	}
	form.append('media', JSON.stringify(inputMediaPhoto));
	form.append('Hwebp', buffer, {filename: 'hitomi.webp', contentType:'image/webp'})
	fetch(bot_addr + 'editMessageMedia', {
		method: "POST",
		body: form
	}).then((res) => res.json()).then((data) => logResponse(data));
}

function sendPhoto(chat_id ,buffer, reply_markup){
	var form = new FormData();
	form.append('photo', buffer, {filename: 'hitomi.webp', contentType:'image/webp'});
	form.append('chat_id', chat_id);
	if(reply_markup){
		form.append('reply_markup', JSON.stringify(reply_markup));
	}
	fetch(bot_addr + 'sendPhoto', {
		method: "POST",
		body: form
	}).then((res) => res.json()).then((data) => logResponse(data));
}


function logResponse(data){
  var getdate = new Date();
  var date = getdate.getFullYear() + '-' + ('0' + (getdate.getMonth() + 1)).slice(-2) + '-' + ('0' + getdate.getDate()).slice(-2)
  var time = `${('0' + getdate.getHours()).slice(-2)}:${('0' + getdate.getMinutes()).slice(-2)}:${('0' + getdate.getSeconds()).slice(-2)}`;
  console.log('[log/' + date  + '/' + time +']: response json logged in logs folder');
  var file_name = "./logs/response_log_" + date + ".log"
  fs.appendFile(file_name, `[${time}]: ${JSON.stringify(data)}\n`, (err) => {if(err) throw err;});	
} 		

module.exports = Action;
