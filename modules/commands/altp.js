const fs = require("fs");
const path = require("path");

// Bảng tiền thưởng 15 câu
const PRIZE_MONEY = [
    10000, 20000, 30000, 50000, 100000,
    200000, 360000, 600000, 800000, 1500000,
    2500000, 3500000, 5000000, 8000000, 12000000
];

// Biến toàn cục để theo dõi các trò chơi đang diễn ra
const activeGames = new Map(); // Lưu trạng thái trò chơi theo threadID

// Hàm hiển thị câu hỏi với xáo trộn đáp án
function showQuestion(question, questionNum, totalMoney, helps, api, event, handleReply) {
    const currentPrize = PRIZE_MONEY[questionNum - 1].toLocaleString();
    const safeHaven = questionNum >= 5 ? PRIZE_MONEY[4].toLocaleString() : "0";

    // Tạo mảng chứa các đáp án
    let answers = [
        { key: 'A', value: question.A },
        { key: 'B', value: question.B },
        { key: 'C', value: question.C },
        { key: 'D', value: question.D }
    ];

    // Xáo trộn mảng đáp án (Fisher-Yates shuffle)
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    // Tạo ánh xạ để kiểm tra đáp án sau khi xáo trộn
    const answerMap = {};
    answers.forEach((ans, index) => {
        answerMap[['A', 'B', 'C', 'D'][index]] = ans.key; // Ánh xạ vị trí mới sang key gốc
    });

    // Cập nhật đáp án đúng theo vị trí mới
    const newCorrectAnswer = Object.keys(answerMap).find(key => answerMap[key] === question.dapan.toUpperCase());

    let helpText = "TRỢ GIÚP (chọn số):\n";
    if (!helps.used1) helpText += "1. 50/50\n";
    if (!helps.used2) helpText += "2. Trường quay\n";
    if (!helps.used3) helpText += "3. Khán giả\n";
    if (!helps.used4) helpText += "4. Gọi người nhà\n";

    const message = `
🎯 CÂU ${questionNum} - ${currentPrize} VND
${question.cauhoi}

A: ${answers[0].value}
B: ${answers[1].value}
C: ${answers[2].value}
D: ${answers[3].value}

${helpText}
⏳ Bạn có 40 giây để trả lời!
⏳ Mốc an toàn: ${safeHaven} VND
    `;

    api.sendMessage(message, event.threadID, (err, info) => {
        const timeoutID = setTimeout(async () => {
            // Thu hồi tin nhắn câu hỏi
            await api.unsendMessage(info.messageID);
            const finalPrize = questionNum >= 5 ? PRIZE_MONEY[4] : 0;
            await api.sendMessage(
                `⏰ HẾT GIỜ! Bạn thua do không trả lời trong 40 giây.\n` +
                `Đáp án đúng: ${newCorrectAnswer}\n` +
                `Giải thích: ${question.giaithich}\n` +
                `Bạn nhận được ${finalPrize.toLocaleString()} VND!`,
                event.threadID
            );
            if (finalPrize > 0) await global.Currencies.increaseMoney(event.senderID, finalPrize);
            activeGames.delete(event.threadID); // Kết thúc trò chơi để người khác có thể chơi
            // Xóa handleReply để tránh xử lý thêm
            global.client.handleReply = global.client.handleReply.filter(reply => reply.messageID !== info.messageID);
        }, 40000); // 40 giây

        global.client.handleReply.push({
            ...handleReply,
            messageID: info.messageID,
            step: "answering",
            timeoutID: timeoutID,
            answerMap: answerMap, // Lưu ánh xạ để kiểm tra đáp án
            newCorrectAnswer: newCorrectAnswer // Lưu đáp án đúng mới
        });
    });
}

module.exports.config = {
    name: "altp",
    version: "4.1.0", // Cập nhật version để đánh dấu tính năng xáo trộn đáp án
    hasPermssion: 0,
    credits: "Niio-team (Vtuan) - Enhanced by D-Jukie, ChatGPT & Grok",
    description: "Game Ai Là Triệu Phú",
    commandCategory: "Game",
    usages: "altp",
    cooldowns: 0,
};

module.exports.run = async function ({ api, event }) {
    const { threadID, senderID } = event;

    // Kiểm tra xem có trò chơi nào đang diễn ra trong thread này không
    if (activeGames.has(threadID)) {
        const currentPlayer = activeGames.get(threadID).author;
        if (currentPlayer !== senderID) {
            return api.sendMessage(
                "⛔ Hiện tại đang có người chơi trong nhóm này. Vui lòng đợi họ hoàn thành trước khi bắt đầu!",
                threadID
            );
        }
    }

    const message = `
─────────────────────────
[ 🏆 ] AI LÀ TRIỆU PHÚ [ 🏆 ]
─────────────────────────

[ 📚 ] Luật chơi:
- 15 câu hỏi, tiền thưởng tăng dần
- 4 trợ giúp (mỗi loại dùng 1 lần)
- Bạn có 40 giây để trả lời mỗi câu hỏi, nếu không câu hỏi sẽ bị thu hồi và bạn thua!
- Các đáp án sẽ được xáo trộn ngẫu nhiên mỗi khi câu hỏi được hiển thị.

[ 💰 ] CƠ CẤU TIỀN THƯỞNG VÀ MỐC AN TOÀN:

• Mốc Câu Hỏi: Câu 1-4
- Tiền Thưởng: 10,000 - 50,000 VND
- Mốc An Toàn: 0 VND
- Nếu Sai/Thua Sẽ Nhận: 0 VND

• Mốc Câu Hỏi: Câu 5
- Tiền Thưởng: 100,000 VND
- Mốc An Toàn: 100,000 VND
- Nếu Sai/Thua Sẽ Nhận: 100,000 VND

• Mốc Câu Hỏi: Câu 6-15
- Tiền Thưởng: 200,000 - 12,000,000 VND
- Mốc An Toàn: 100,000 VND
- Nếu Sai/Thua Sẽ Nhận: 100,000 VND

- (Mốc An Toàn là số tiền tối thiểu bạn nhận khi vượt mốc đó, kể cả khi sai hoặc thua ở câu tiếp theo.)

─────────────────────────

[ 🎮 ] Chọn:
- Gõ "play" để bắt đầu chơi
- (Gõ "dừng" để giữ tiền) `;

    api.sendMessage(message, threadID, (error, info) => {
        // Lưu trạng thái trò chơi
        activeGames.set(threadID, { author: senderID });
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            step: "choosing",
            questionNum: 0,
            totalMoney: 0,
            helps: {
                used1: false,
                used2: false,
                used3: false,
                used4: false
            },
            askedQuestions: []
        });
    });
}

module.exports.handleReply = async function ({ handleReply, event, api, Currencies }) {
    const { body, threadID, messageID, senderID } = event;
    const { step, question, questionNum, totalMoney, helps, askedQuestions, timeoutID, answerMap, newCorrectAnswer } = handleReply;

    // Kiểm tra người chơi
    if (senderID !== handleReply.author) {
        return api.sendMessage("⛔ Không phải lượt của bạn!", threadID);
    }

    // Hủy timeout khi nhận được phản hồi
    clearTimeout(timeoutID);

    api.unsendMessage(handleReply.messageID);

    // Helper function để tạo khóa duy nhất cho một câu hỏi
    const generateQuestionKey = (q) => {
        return `${q.cauhoi.trim()}|||${q.dapan.trim()}`;
    };

    // Lấy câu hỏi ngẫu nhiên
    const getQuestion = (difficulty, currentAskedQuestions) => {
        const file = path.join(__dirname, "Game", "altp.json");
        let data;
        try {
            data = JSON.parse(fs.readFileSync(file, "utf8"));
        } catch (e) {
            console.error(`[ALTP] Lỗi đọc hoặc parse file altp.json: ${e.message}`);
            api.sendMessage("Đã xảy ra lỗi khi đọc dữ liệu câu hỏi. Vui lòng kiểm tra file altp.json hoặc liên hệ admin.", threadID);
            return null;
        }

        const allQuestionsForDifficulty = data[difficulty] || [];
        const availableQuestions = allQuestionsForDifficulty.filter(q => {
            const qKey = generateQuestionKey(q);
            return !currentAskedQuestions.includes(qKey);
        });

        if (availableQuestions.length === 0) {
            console.warn(`[ALTP] Hết câu hỏi cho độ khó: ${difficulty} hoặc tất cả đã được hỏi.`);
            return null;
        }

        const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        return selectedQuestion;
    };

    // Xử lý lệnh dừng
    if (body.toLowerCase().includes("dừng")) {
        const finalPrize = questionNum >= 5 ? PRIZE_MONEY[4] : 0;
        const wonAmount = (questionNum > 0 && questionNum <= PRIZE_MONEY.length) ? PRIZE_MONEY[questionNum - 1] : 0;
        const actualWon = Math.max(wonAmount, finalPrize);

        if (actualWon > 0) await Currencies.increaseMoney(senderID, actualWon);
        activeGames.delete(threadID); // Kết thúc trò chơi
        return api.sendMessage(
            `🎉 Bạn dừng cuộc chơi tại câu ${questionNum} và nhận ${actualWon.toLocaleString()} VND!`,
            threadID
        );
    }

    // Chọn chế độ
    if (step === "choosing" && body.toLowerCase() === "play") {
        const firstQuestion = getQuestion("de", askedQuestions);
        if (!firstQuestion) {
            activeGames.delete(threadID); // Xóa trạng thái nếu không có câu hỏi
            return api.sendMessage("Xin lỗi, không thể bắt đầu game. Không có câu hỏi nào sẵn sàng.", threadID);
        }

        askedQuestions.push(generateQuestionKey(firstQuestion));

        showQuestion(firstQuestion, 1, 0, helps, api, event, {
            ...handleReply,
            question: firstQuestion,
            step: "answering",
            questionNum: 1,
            askedQuestions: askedQuestions
        });
        return;
    }

    // Xử lý trợ giúp (1-4)
    if (step === "answering" && /^[1-4]$/.test(body)) {
        const helpNum = parseInt(body);
        const helpKey = `used${helpNum}`;

        if (helps[helpKey]) {
            return api.sendMessage("⚠️ Bạn đã dùng trợ giúp này rồi!", threadID);
        }

        helps[helpKey] = true;
        let result = "";

        // Khai báo allOptions dựa trên đáp án đã xáo trộn
        const allOptions = ['A', 'B', 'C', 'D'];

        switch (helpNum) {
            case 1: // 50/50
                const correct = newCorrectAnswer; // Sử dụng đáp án đúng mới
                const wrong = allOptions.filter(a => a !== correct);
                const removed = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
                result = `50/50: Loại ${removed.join(", ")}\nCòn lại: ${correct} và ${allOptions.find(a => a !== correct && !removed.includes(a))}`;
                break;

            case 2: // Trường quay
                const correctAnsStudio = newCorrectAnswer;
                const isStudioCorrect = Math.random() < 0.7;

                let studioSuggestions = [];
                let mainAnswerPercent;
                let otherAnswerPercent;
                let otherAnswer;

                if (isStudioCorrect) {
                    mainAnswerPercent = Math.floor(Math.random() * 21) + 60;
                    otherAnswerPercent = 100 - mainAnswerPercent;
                    const incorrectOptions = allOptions.filter(o => o !== correctAnsStudio);
                    otherAnswer = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];
                    studioSuggestions.push({ ans: correctAnsStudio, percent: mainAnswerPercent });
                    studioSuggestions.push({ ans: otherAnswer, percent: otherAnswerPercent });
                } else {
                    const incorrectOptions = allOptions.filter(o => o !== correctAnsStudio);
                    const mainIncorrectAns = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];
                    mainAnswerPercent = Math.floor(Math.random() * 21) + 50;
                    otherAnswerPercent = 100 - mainAnswerPercent;
                    otherAnswer = correctAnsStudio;
                    studioSuggestions.push({ ans: mainIncorrectAns, percent: mainAnswerPercent });
                    studioSuggestions.push({ ans: otherAnswer, percent: otherAnswerPercent });
                }

                studioSuggestions.sort((a, b) => b.percent - a.percent);
                result = `🎤 Trường quay:\n` + studioSuggestions.map(s => `${s.ans}: ${s.percent}%`).join('\n');
                break;

            case 3: // Khán giả
                const correctPercent = Math.floor(Math.random() * 31) + 40; // 40-70% cho đáp án đúng
                const remainingPercent = 100 - correctPercent; // Phần trăm còn lại
                const correctAnswer = newCorrectAnswer;
                const wrongOptions = allOptions.filter(a => a !== correctAnswer);

                // Phân bổ phần trăm cho các đáp án sai
                let distribution = [0, 0, 0];
                let currentSum = 0;
                for (let i = 0; i < 2; i++) {
                    distribution[i] = Math.floor(Math.random() * (remainingPercent - currentSum) / (3 - i));
                    currentSum += distribution[i];
                }
                distribution[2] = remainingPercent - currentSum;

                // Gán phần trăm cho từng đáp án theo thứ tự A, B, C, D
                const percentages = {};
                allOptions.forEach((option, index) => {
                    if (option === correctAnswer) {
                        percentages[option] = correctPercent;
                    } else {
                        percentages[option] = distribution[wrongOptions.indexOf(option)] || 0;
                    }
                });

                // Hiển thị theo thứ tự A, B, C, D
                result = "📊 Khán giả bình chọn:\n" +
                    `A: ${percentages['A'] || 0}%\n` +
                    `B: ${percentages['B'] || 0}%\n` +
                    `C: ${percentages['C'] || 0}%\n` +
                    `D: ${percentages['D'] || 0}%`;
                break;

            case 4: // Người nhà
                const isRight = Math.random() < 0.7;
                const answer = isRight
                    ? newCorrectAnswer
                    : allOptions.filter(a => a !== newCorrectAnswer)[Math.floor(Math.random() * 3)];
                result = `📞 Người nhà: "${isRight ? 'Chắc chắn' : 'Nghiêng về'} ${answer}"`;
                break;
        }

        await api.sendMessage(result, threadID);
        showQuestion(question, questionNum, totalMoney, helps, api, event, handleReply);
        return;
    }

    // Xử lý trả lời
    if (step === "answering" && /^[a-dA-D]$/.test(body)) {
        const userAnswer = body.toUpperCase();
        const correctAnswer = newCorrectAnswer; // Sử dụng đáp án đúng mới

        if (userAnswer === correctAnswer) {
            const newTotal = PRIZE_MONEY[questionNum - 1];

            if (questionNum === 15) {
                await Currencies.increaseMoney(senderID, newTotal);
                activeGames.delete(threadID); // Kết thúc trò chơi
                return api.sendMessage(
                    `🏆 CHÚC MỪNG! Bạn đã chiến thắng với 12,000,000 VND!\n` +
                    `Đáp án: ${correctAnswer}\nGiải thích: ${question.giaithich}`,
                    threadID
                );
            }

            const nextQuestion = getQuestion(
                questionNum < 5 ? "de" :
                questionNum < 10 ? "binhthuong" :
                questionNum < 13 ? "kho" : "sieukho",
                askedQuestions
            );

            if (!nextQuestion) {
                await Currencies.increaseMoney(senderID, newTotal);
                activeGames.delete(threadID); // Kết thúc trò chơi
                return api.sendMessage(
                    `🏆 CHÚC MỪNG! Bạn đã trả lời đúng ${questionNum} câu và không còn câu hỏi nào để tiếp tục. Bạn nhận được ${newTotal.toLocaleString()} VND!`,
                    threadID
                );
            }

            askedQuestions.push(generateQuestionKey(nextQuestion));

            await api.sendMessage(
                `✅ ĐÚNG! (+${newTotal.toLocaleString()} VND)\nGiải thích: ${question.giaithich}`,
                threadID
            );

            showQuestion(nextQuestion, questionNum + 1, newTotal, helps, api, event, {
                ...handleReply,
                question: nextQuestion,
                questionNum: questionNum + 1,
                totalMoney: newTotal,
                askedQuestions: askedQuestions
            });
        } else {
            const finalPrize = questionNum >= 5 ? PRIZE_MONEY[4] : 0;
            await api.sendMessage(
                `❌ SAI! Đáp án: ${correctAnswer}\nGiải thích: ${question.giaithich}\n` +
                `Bạn nhận được ${finalPrize.toLocaleString()} VND!`,
                threadID
            );
            if (finalPrize > 0) await Currencies.increaseMoney(senderID, finalPrize);
            activeGames.delete(threadID); // Kết thúc trò chơi
        }
    }
};