exports.config = {
  name: 'noitu',
  version: '1.1.1',
  hasPermssion: 0,
  credits: 'DC-Nam',
  description: 'Games nối chữ!',
  commandCategory: 'Game',
  usages: 'noitu',
  cooldowns: 3
};

let fs = require('fs');
let path = __dirname + '/bot/noitu.txt';
let data = [];
let save = () => fs.writeFileSync(path, data.join(','), 'utf8');
let word_valid = (word) => /^[a-zA-Zà-ỹÀ-Ỹ]+ [a-zA-Zà-ỹÀ-Ỹ]+$/.test(word);

exports.onLoad = async function() {
  if (!fs.existsSync(path)) {
    data = (await require('axios').get(`https://raw.githubusercontent.com/J-JRT/api2/mainV2/linkword.json`)).data.split(',').filter(word_valid);
  } else {
    data = fs.readFileSync(path, 'utf8').split(',').filter(word_valid);
  }
  save();
};

exports.handleReply = async function(o) {
  let _ = o.handleReply;
  if (o.event.senderID != _.event.senderID) return;

  let word = (o.event.body || '').split(' ');
  let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, callback == 0 ? undefined : o.event.messageID);

  if (!word_valid(word.join(' '))) return send(`[⚜️] ➜ Từ nối không hợp lệ!`);
  o.api.unsendMessage(_.messageID);

  if (_.type == 'player_vs_bot') {
    if (word[0].toLowerCase() != _.word_bot.split(' ')[1].toLowerCase()) {
      send(`=== 『 GAME NỐI TỪ 』 ===\n━━━━━━━━━━━━━━━━\n[❎] ➜ Bạn đã thua\n[❗] ➜ Số câu đã nối: ${_.loop}`, 0);
      send(`[👎] ➜ Chúc mừng bạn đã thua!`);
      return;
    }

    let word_matching = data.filter($ => $.split(' ')[0].toLowerCase() == word[1].toLowerCase());
    let random_word_ = word_matching[Math.floor(Math.random() * word_matching.length)];

    if (!word_valid(random_word_)) {
      if (!data.includes(word.join(' '))) {
        data.push(word.join(' '));
        save();
      }
      send(`=== 『 GAME NỐI TỪ 』 ===\n━━━━━━━━━━━━━━━━\n[✅] ➜ Bạn đã thắng\n[❗] ➜ Số câu đã nối được: ${_.loop}`);
      send(`[👏] ➜ Chúc mừng bạn đã thắng bot!`);
    } else {
      send(`=== 『 GAME NỐI TỪ 』 ===\n━━━━━━━━━━━━━━━━\n[📝] ➜ Bot nối tiếp: ${random_word_}\n[💬] ➜ Phản hồi bot để trả lời\n[❗] ➜ Số lần đã nối: ${_.loop + 1}`, (err, res) => {
        res.type = 'player_vs_bot';
        res.name = exports.config.name;
        res.event = o.event;
        res.word_bot = random_word_;
        res.loop = _.loop + 1;
        client.handleReply.push(res);
      });
    }
  }
};

exports.run = async function(o) {
  let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
  let word_bot = data[Math.floor(Math.random() * data.length)];

  send(`=== 『 GAME NỐI TỪ 』 ===\n━━━━━━━━━━━━━━━━\n[📝] ➜ Bot bắt đầu với từ: ${word_bot}\n[💬] ➜ Phản hồi bot để nối chữ\n[❗] ➜ Số lần đã nối: 0`, (err, res) => {
    res.type = 'player_vs_bot';
    res.name = exports.config.name;
    res.event = o.event;
    res.word_bot = word_bot;
    res.loop = 0;
    client.handleReply.push(res);
  });
};