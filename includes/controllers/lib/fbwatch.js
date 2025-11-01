const axios = require('axios');
const cheerio = require('cheerio');

async function fbwatch(url) {
  try {
    const response1 = await axios({
      method: 'POST',
      url: 'https://snapsave.app/action.php?lang=vn',
      headers: {
        "accept": "*/*",
        "accept-language": "vi,en-US;q=0.9,en;q=0.8",
        "content-type": "multipart/form-data",
        "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "Referer": "https://snapsave.app/vn",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      data: {
        url
      }
    });

    let html;
    const evalCode = response1.data.replace('return decodeURIComponent', 'html = decodeURIComponent');
    eval(evalCode);
    html = html.split('innerHTML = "')[1].split('";\n')[0].replace(/\\"/g, '"');

    const $ = cheerio.load(html);
    const download = [];

    const tbody = $('table').find('tbody');
    const trs = tbody.find('tr');

trs.each(function (i, elem) {
  const trElement = $(elem);
  const tds = trElement.children();
  const quality = $(tds[0]).text().trim();
  const url = $(tds[2]).children('a').attr('href');
  if (url != undefined) {
    download.push({
      quality,
      url
    });
  }
});

return {
  success: true,
  download
};
} catch (err) {
return {
  success: false
};
}
}

module.exports = { fbwatch };