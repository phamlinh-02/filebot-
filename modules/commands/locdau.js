const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "11",
  version: "1.0.0",
  hasPermission: 2,
  credits: "Dgk",
  description: "Tách nội dung từ chuỗi theo dấu nhất định và lưu vào file",
  commandCategory: "Admin",
  usages: "<inputFileName> <outputFilePath> <dấu cần lọc>",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const inputFileName = args[0];
  const outputFileName = args[1];
  const delimiter = args[2];

  if (!inputFileName || !outputFileName || !delimiter) {
    api.sendMessage('❎ Vui lòng nhập đúng định dạng: <inputFileName> <outputFilePath> <dấu cần lọc>', threadID, messageID);
    return;
  }

  const inputFilePath = path.join(__dirname, '../../includes/datajson/', inputFileName);

  let inputFileContent;
  try {
    inputFileContent = fs.readFileSync(inputFilePath, 'utf8');
  } catch (error) {
    api.sendMessage(`⚠️ Lỗi đọc file: ${error.message}`, threadID, messageID);
    return;
  }

  // Tạo biểu thức chính quy dựa trên dấu được cung cấp
  const regex = new RegExp(`\\${delimiter}([^\\${delimiter}]*)\\${delimiter}`, 'g');
  let match = regex.exec(inputFileContent);
  let outputContent = '';

  if (!match) {
    api.sendMessage(`Không có nội dung với dấu "${delimiter}" trong file ${inputFilePath}. Vui lòng kiểm tra lại nội dung.`, threadID, messageID);
    return;
  }

  while (match !== null) {
    const content = match[1];

    if (content.length > 0) {
      outputContent += content + '\n';
    }

    match = regex.exec(inputFileContent);
  }

  fs.writeFileSync(outputFileName, outputContent.trim());
  api.sendMessage(`Đã tách nội dung theo dấu "${delimiter}" và lưu vào file ${outputFileName}.`, threadID, messageID);
};