const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

function simi(type, data) {
  const dataSimPath = path.join(__dirname, 'data', 'sim.json');
  const dataSim = require(dataSimPath);

  if (type === 'ask') {
    var ask = encodeURI(data);
    var msg = dataSim.map(id => id.ask);
    var checker = stringSimilarity.findBestMatch(decodeURI(ask), msg);

    if (checker.bestMatch.rating >= 0.5) {
      var search = checker.bestMatch.target;
    }

    if (search == undefined) {
      return { answer: 'Ơi, cậu nói gì cơ? Tớ không hiểu ý cậu lắm. 🤔 Cậu có thể nói rõ hơn được không?\n(Mình sẽ cố gắng hết sức để giúp cậu, nhưng mà nhớ nói chuyện tử tế với mình nha, không mình giận á! 😉)' };
    }

    function recoverKey() {
      var data = dataSim.filter(i => i.ask.toLowerCase() == search.toLowerCase());
      return data;
    }

    var find = recoverKey();
    var f2 = find[Math.floor(Math.random() * find.length)];
    var a = f2.ans[Math.floor(Math.random() * f2.ans.length)];

    return { answer: a };
  } else if (type === 'teach') {
    var ask = data.ask;
    var ans = data.ans;

    if (!ask || !ans) {
      return { error: 'Thiếu dữ liệu để thực thi lệnh' };
    }

    var existingQuestion = dataSim.find(i => i.ask == ask);

    if (existingQuestion !== undefined) {
      if (existingQuestion.ans.includes(ans)) {
        return { error: 'Câu trả lời đã tồn tại!' };
      }
      existingQuestion.ans.push(ans);
    } else {
      dataSim.push({
        id: dataSim.length,
        ask,
        ans: [ans]
      });
    }

    fs.writeFileSync(dataSimPath, JSON.stringify(dataSim, null, 2), 'utf-8');

    return {
      msg: 'Dạy sim thành công',
      data: {
        ask,
        ans
      }
    };
  }
}

module.exports = { simi };