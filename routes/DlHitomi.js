var fetch = require('node-fetch')
var JSZIP = require('jszip')
var fs = require('fs')

async function page(number, page){
	var res = await fetch(`https://ltn.hitomi.la/galleries/${number}.js`);
	var body = await res.text();
	body = body.substr(18);
	var galleryinfo;
	try{
		galleryinfo = JSON.parse(body);
	}catch(err){
		return;
	}
	if(!galleryinfo){
		return;
	}
	try{
	var hash = galleryinfo.files[page-1].hash;
	}catch(err){
		return;
	}
	var addr = await Get_Address(hash);
	if(!addr){
		return;
	}

	var buffer;

	async function dl(){
		var img = await fetch(addr, {
			method: "GET",
			headers:{'Referer': `https://hitomi.la/reader/${number}.html#1`}
		})
		if(img.ok){
			buffer = await img.buffer();
		}else if(img.status == 503){
			await dl();
		}
	}
	await dl();
	
	return buffer;
}

async function comic(number, send_res){
	var res = await fetch(`https://ltn.hitomi.la/galleries/${number}.js`);
	var body = await res.text();
	body = body.substr(18);
	var galleryinfo;
	try{
		galleryinfo = JSON.parse(body);
	}catch(err){
		return;
	}
	if(!galleryinfo){
		return;
	}
	var length = galleryinfo.files.length;
	var count = 0;
	var zip = new JSZIP();
	for(var i = 0;i<length;i++){
		function success(buffer, num){
			zip.file(num+1 + '.webp', buffer);
			count++;
			if(count == length){
				zip
				.generateNodeStream({type:'nodebuffer',streamFiles:true})
				.pipe(fs.createWriteStream(`./hitomi/${number}.zip`))
				.on('finish', function () {
    				send_res()
				});
			}
		}
		async function dl(num){
			var hash = galleryinfo.files[num].hash;
			var addr = await Get_Address(hash);
			if(!addr){
				return;
			}
			fetch(addr, {
				method: "GET",
				headers:{'Referer': `https://hitomi.la/reader/${number}.html#1`}
			}).then((result) => {
				if(result.ok){
					result.arrayBuffer().then((buffer) => success(buffer, num))
				}else if(result.status == 503){
					dl(num);
				}else{
					count++;
				}
			});
		}
		dl(i)
		
	}
	return true;
}

async function Get_Address(hash){
	var key = parseInt(hash.charAt(hash.length-1) + hash.charAt(hash.length-3) + hash.charAt(hash.length-2), 16)
	var fres = await fetch(`https://ltn.hitomi.la/gg.js`);
	var body = await fres.text();
	var result = parseInt(body.substr(46, 1));
	body = body.substr(61);
	var num;
	var check_numbers;
	try{
		num = parseInt(body.slice(-16,-5));
		var temp = body.slice(0, -143).split(':');
		check_numbers = temp.map((x) => parseInt(x.substr(6)));
	}catch(err){
		console.log("gg.js가 존재하지 않거나 형식이 변경된것 같습니다.")
		return;
	}

	for(var i = 0;i<check_numbers.length;i++){
		if(check_numbers[i] === key){
			result = result===1 ? 0 : 1;
		}
	}

	if(result == 0){
		return `https://aa.hitomi.la/webp/${num}/${key}/${hash}.webp`
	}else{
		return `https://ba.hitomi.la/webp/${num}/${key}/${hash}.webp`
	}
}

async function getInfo(number){
	var res = await fetch(`https://ltn.hitomi.la/galleries/${number}.js`);
	var body = await res.text();
	body = body.substr(18);
	var galleryinfo;
	try{
		galleryinfo = JSON.parse(body);
	}catch(err){
		return;
	}
	if(!galleryinfo){
		return;
	}
	var title = galleryinfo.title;
	var lang = galleryinfo.language_localname;
	var group = galleryinfo?.groups?.[0]?.group;
	var artist = galleryinfo?.artists?.[0]?.artist;
	var tag_res = []
	if(!galleryinfo.tags){
		galleryinfo.tags = []
	}
	for(var i = 0;i<galleryinfo.tags.length;i++){
		var tagname = galleryinfo.tags[i].tag;
		if(galleryinfo.tags[i].male == 1){
			tagname = "male: " + tagname;
		}
		if(galleryinfo.tags[i].female == 1){
			tagname = "famale: " + tagname;
		}
		tag_res[i] = tagname;
	}
	return {title: title, tags: tag_res, lang: lang, group: group, artist: artist}
}

async function searchTag(tags){
	var result = [];
	for(const category in tags){
		var is_n = (category=='artist') || (category == 'type');
		var gender = "";
		var language = "all";
		var sub_ca = category;
		if((category == 'female') || (category == 'male')){
			gender = category + ":";
			sub_ca = "tag";
		}
		if(category == 'language'){
			language = tags[category][0];
			tags[category] = ["index"];
		}
		for(var item of tags[category]){
			if(!item)	return;
			item = item.replaceAll("_", "%20");
			var addr = "https://ltn.hitomi.la";
			if(is_n)	addr+='/n';
			addr = language=='all' ? `${addr}/${sub_ca}/${gender}${item}-all.nozomi` : `${addr}/index-${language}.nozomi`
			var searched = await fetch(addr);
			if(!searched.ok)	return;
			var byte_arr = await searched.arrayBuffer();
			var res = new Set();
			var view = new DataView(byte_arr);
			var total = view.byteLength/4;
			for(var i = 0;i<total;i++){
				res.add(view.getInt32(i*4, false));
			}

			result.push(res);
		}
	}
	return result;
}

function indexing(searched){
	var min_size = searched[0].size;
	var pointer = 0;
	for(var i = 0;i<searched.length;i++){
		var size = searched[i].size;
		if(min_size>size){
			min_size = size;
			pointer = i;
		}
	}
	var temp = searched[0];
	searched[0] = searched[pointer];
	searched[pointer] = temp;
	var result = [];
	for(const item of searched[0]){
		var check = true;
		for(var i = 1;i<searched.length;i++){
			if(!searched[i].has(item))	check = false;
		}
		if(check)	result.push(item);
	}
	return result;
}


module.exports = {'page': page, 'comic': comic, 'getInfo': getInfo, 'searchTag': searchTag, 'indexing': indexing}
