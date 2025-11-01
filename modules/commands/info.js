function convert(time){
var date = new Date(`${time}`);
var year = date.getFullYear();
var month = date.getMonth() + 1;
var day = date.getDate();
var hours = date.getHours();
var minutes = date.getMinutes();
var seconds = date.getSeconds();
var formattedDate = `${ hours < 10 ? "0" + hours : hours}` + ":" + `${ minutes < 10 ? "0" + minutes : minutes}` + ":" + `${ seconds < 10 ? "0" + seconds : seconds}`+` | `+`${ day < 10 ? "0" + day : day}` + "/" +`${ month < 10 ? "0" + month : month}` + "/" + year;
return formattedDate;
};
let d = new Date()
const gio = `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
const request = require("request");
const cheerio = require('cheerio');
const axios = require("axios");
const fs = require("fs");
async function getBio(uid,api) {
			if (!uid) return "Vui lòng nhập UID cần lấy tiểu sử";
			const form = {
					av: api.getCurrentUserID(),
					fb_api_req_friendly_name: "ProfileCometBioTextEditorPrivacyIconQuery",
					fb_api_caller_class: "RelayModern",
					doc_id: "5009284572488938",
					variables: JSON.stringify({
							"id": uid
					})
			};
			var src = await api.httpPost('https://www.facebook.com/api/graphql/', form)
			console.log(src)
			var bio = (JSON.parse(src)).data?.user?.profile_intro_card
			return bio?.bio ? bio.bio?.text : "Không có";
	}

async function getProfileCoverPhoto(uid) {
	console.log(global.cookie)
			var { data } = await axios('https://www.facebook.com/' + uid, {
					headers: {
							cookie: global.cookie
					}
			})
			try {
				const regex = /<img[^>]*data-imgperflogname="profileCoverPhoto"[^>]*src="([^"]+)"/i;
				const matches = data.match(regex);
				if (matches && matches.length > 1) {
					const src = matches[1];
					return src
				} else {
					return 'không có'
				}
			}
			catch(e) {
				return 'Không có'
			}
	}
module.exports.config = {
		name: "info",
		version: "3.0.0",
		hasPermsion: 0,
		credits: "Deku mod by Niio-team và những chú lợn",
		description: "Get info người dùng",
		usages: "[reply/uid/link/@tag] nếu link có sẵn uid thì tách uid ra bot mới có thể đọc được nhé",
		commandCategory: "Tiện ích",
		cooldowns: 0
};
module.exports.run = async function({ api, event, args, client, Users, Currencies, permssion }) {
let path = __dirname + `/cache/info.png`,s=se=>api.sendMessage(se,event.threadID,event.messageID)
let token = global.config.ACCESSTOKEN,id;
if (Object.keys(event.mentions).length > 0){  id =( Object.keys(event.mentions)[0]).replace(/\&mibextid=ZbWKwL/g,'') }
			else id = args[0]!=void 0?(isNaN(args[0])? await global.utils.getUID(args[0]):args[0]) :event.senderID;
			if(event.type == "message_reply") {  id = event.messageReply.senderID }
	 try{
         api.sendMessage('🔄 Đang lấy thông tin...', event.threadID, event.messageID);
	 const resp = await axios.get(`https://graph.facebook.com/${id}?fields=id,is_verified,cover,updated_time,work,education,likes,created_time,work,posts,hometown,username,family,timezone,link,name,locale,location,about,website,birthday,gender,relationship_status,significant_other,quotes,first_name,subscribers.limit(0)&access_token=${token}`);
	 var name = resp.data.name,{log:l}=console
	 var link_profile = resp.data.link;
	 var bio = await getBio(id,api)
	 var uid = resp.data.id;
	 var first_name = resp.data.first_name;
	 var username = resp.data.username || "không có";
	 var created_time = convert(resp.data.created_time);
	 var web = resp.data.website || "không có";
	 var gender = resp.data.gender;
	 var relationship_status = resp.data.relationship_status || "";
	 var rela = resp.data.significant_other?.name;
	 var id_rela = resp.data.significant_other?.id;
	 var bday = resp.data.birthday;
	 var follower = resp.data.subscribers?.summary?.total_count || "❎";
	 var is_verified = resp.data.is_verified;
	 var quotes = resp.data.quotes || "❎";
	 var about = resp.data.about || "❎";
	 var locale = resp.data.locale || "❎";
	 var hometown = !!resp.data.hometown?resp.data.hometown?.name:"❎";
	 var cover = resp.data.cover?.source || "No Cover photo"
	 var ban = global.data.userBanned.has(id) == true ?  "Đang bị ban" : "Không bị ban";
	 var money = ((await Currencies.getData(id)) || {}).money||0;
	 var{work,photos,likes:li,posts:ps,family:fd,educatiomn:ed}=resp.data,lkos='',pst='',fml='',wk='',edc='',k='không có',u=undefined
		if (work==u){wk=k}else{for(var _=0;_<work.length;_++){var wks=work[_],link_work=wks.id,cv=wks['employer']['name'];wk+=`\n│ ${_+1}. `+cv+`\n│ Link: https://www.facebook.com/${link_work}\n│`}}
		if (li==u){lkos=k}else{for(var o=0;o<(li.data.length>5?5:li.data.length);o++){var lks=li.data[o],nm=lks.name,ct=lks.category,link=lks.id,tm=lks.created_time;lkos+=`\n│\n│ ${o+1}. ${nm}\n│ (${ct})\n│ Time follow:\n│ ${convert(tm)}\n│ Link: https://www.facebook.com/profile.php?id=${link}`}}
		if (ps==u){pst=k}else{for(var i=0;i<(ps.data.length>5?5:ps.data.length);i++){var pt=ps.data[i],tm=pt.created_time,nd=pt.message,lk=pt.actions[0].link;pst+=`\n│ ${i+1}.\n│📝 Tiêu đề: `+nd+'\n│⏰ Time: '+convert(tm)+'\n│🔗 Link: '+lk+'\n│'}}
		if (fd==u){fml=k}else{for(var i=0;i<fd.data.length;i++){var fmb=fd.data[i],dc=(await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${fmb.relationship}`)).data[0][0][0],n=fmb.name,uid=fmb.id,rl=fmb.relationship;fml+=`\n│\n│ ${i+1}. `+n+' ('+dc+')\n│ Link: https://www.facebook.com/profile.php?id='+uid}}
		if(ed==u){edc=k}else{for(var i=0;i<ed.length;i++){var edt=ed[i],dc=(await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${edt.type}`)).data[0][0][0],sc=edt.school.name,nm=edt.type;edc+=`\n│ ${sc}\n│ (${dc})`}}
	 var avatar = `https://graph.facebook.com/${id}/picture?width=1500&height=1500&access_token=1174099472704185|0722a7d5b5a4ac06b11450f7114eb2e9`;
	 let cb = function(s) {
         api.sendMessage({body:`
╭─────────────⭓
│ Tên: ${name}
│ Họ: ${first_name}
│ User name: ${username}
│ Ngày tạo acc: ${created_time}
│ Wall link: ${link_profile}
│ Giới tính: ${resp.data.gender == 'male' ? 'Nam' : resp.data.gender == 'female' ? 'Nữ' : '❎'}
│ Mối quan hệ: ${relationship_status} ${rela || ''}${id_rela ? `
│ Link người set: https://www.facebook.com/profile.php?id=${id_rela}`: ''}
│ Tiểu sử: ${bio}
│ Nơi sinh: ${hometown}
│ Trường: ${edc.replace(', ','')}
│ Làm việc tại: ${wk}
│ Web: ${web}
│ Số follow: ${follower.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
├─────────────⭔
│ Thành viên gia đình: ${fml.replace(', ','')}
│
├─────────────⭔
│ Quốc gia: ${locale}
│ Cập nhật lần cuối:
│ ${convert(resp.data.updated_time)}
│ Múi giờ số: ${resp.data.timezone}
├─────────────⭔
│⛔ Kiểm tra cấm: ${ban}
│
╰─────────────⭓
📌 Thả cảm xúc để check bài đăng`, attachment: s.filter($=>$!=null)
						}, event.threadID,(e,info)=>{global.client.handleReaction.push({name:exports.config.name,messageID:info.messageID,author:id})})
				};
		Promise.all([avatar, cover].map($=>require('axios').get($, {
			responseType: 'stream',
		}).then(r=>(r.data.path = 'tmp.jpg', r.data)).catch($=>null))).then(cb);
		} catch (e) {s(e.message)}
}
this.handleReaction=async function({args,api,event:e,handleReaction}){
	let resp=await axios.get(`https://graph.facebook.com/${handleReaction.author}?fields=id,likes,family,posts&access_token=${global.config.ACCESSTOKEN}`)
	let send=msg=>api.sendMessage(msg,e.threadID,e.messageID)
	let {posts,likes,family}=resp.data,p='',l='',f='';
	if(posts==undefined) { return send('❎ Không có bài đăng nào!') }
	else{
	for(i=0;i<posts.data.length;i++) {   let{created_time: c_t, message: ms, actions, privacy, shares, status_type: s_t}=posts.data[i]
		let sr=shares==undefined?0:shares.count,pv=privacy.description,a_l=actions[0].link 
p+=`
╭─────────────⭓
│⏰ Tạo lúc: ${convert(c_t)}
│✏️ Trạng thái: ${pv}
│🔀 Lượt chia sẻ: ${sr}
│ℹ️ Loại trạng thái: ${s_t}
│🔗 Link: ${a_l}
│📝 Nội dung: ${ms}
╰─────────────⭓
`}
return send(`${p}\n`)}
}
