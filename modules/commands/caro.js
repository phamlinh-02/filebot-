const fs = require("fs-extra");
const Jimp = require("jimp");

module.exports.config = {
    name: "caro",
    version: "2.0.5",
    hasPermssion: 0,
    credits: "Tùng (fix reply + smaller X/O)",
    description: "Game cờ caro với ảnh Jimp (link online)",
    commandCategory: "Game",
    usages: "@tag | stop",
    cooldowns: 5
};

let games = {};

const BOARD_SIZE = 10;   // đổi sang 12 nếu muốn 12x12
const WIN_LENGTH = 5;   // đổi sang 5 nếu muốn luật 5 ô

const EMPTY = 0;
const X = 1;
const O = 2;

// Link ảnh ô trống, X, O
const IMG_EMPTY = "https://files.catbox.moe/m4ytd6.png"; // ô trống
const IMG_X = "https://files.catbox.moe/1qfisj.png";     // ô X
const IMG_O = "https://files.catbox.moe/ce334f.jpeg";    // ô O

function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

async function renderBoardImage(board) {
    const cellSize = 50;
    const piecePadding = 8;
    const pieceSize = Math.max(8, cellSize - piecePadding * 2);

    const marginTop = 35;    // tăng ô dấu lên 35px
    const marginLeft = 35;

    const boardWidthPx = BOARD_SIZE * cellSize;
    const boardHeightPx = BOARD_SIZE * cellSize;

    const imgWidth = boardWidthPx + marginLeft;
    const imgHeight = boardHeightPx + marginTop;

    const img = new Jimp(imgWidth, imgHeight, 0xffffffff);

    const emptyCell = await Jimp.read(IMG_EMPTY);
    const xCell = await Jimp.read(IMG_X);
    const oCell = await Jimp.read(IMG_O);

    const xResized = xCell.clone().resize(pieceSize, pieceSize);
    const oResized = oCell.clone().resize(pieceSize, pieceSize);

    // Tạo ảnh ô dấu kích thước 35x35
    const emptyCellSmall = emptyCell.clone().resize(marginLeft, marginTop);

    // Tải font 32px (gần với 27px)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // Vẽ nền ô dấu hàng ngang
    for (let x = 0; x < BOARD_SIZE; x++) {
        const px = marginLeft + x * cellSize;
        img.composite(emptyCellSmall, px, 0);
    }

    // Vẽ nền ô dấu hàng dọc
    for (let y = 0; y < BOARD_SIZE; y++) {
        const py = marginTop + y * cellSize;
        img.composite(emptyCellSmall, 0, py);
    }

    // Góc trên trái
    img.composite(emptyCellSmall, 0, 0);

    // Vẽ chữ hàng ngang (chữ màu đỏ thì in chữ đen rồi tô đè màu đỏ)
    for (let x = 0; x < BOARD_SIZE; x++) {
        const letter = String.fromCharCode(65 + x);
        const xPos = marginLeft + x * cellSize + Math.floor(cellSize / 2) - 15; // canh chỉnh
        const yPos = 2;
        img.print(font, xPos, yPos, letter);
    }

    // Vẽ chữ hàng dọc
    for (let y = 0; y < BOARD_SIZE; y++) {
        const number = (y + 1).toString();
        const xPos = 2;
        const yPos = marginTop + y * cellSize + Math.floor(cellSize / 2) - 22;
        img.print(font, xPos, yPos, number);
    }

    // Thay đổi màu chữ thành đỏ bằng cách scan pixel (cách này đơn giản)
    img.scan(0, 0, img.bitmap.width, marginTop, function(x, y, idx) {
        // idx là vị trí pixel bắt đầu (RGBA)
        // Tô đỏ nếu pixel gần màu đen
        if (this.bitmap.data[idx] < 50 && this.bitmap.data[idx + 1] < 50 && this.bitmap.data[idx + 2] < 50) {
            this.bitmap.data[idx] = 255;     // R
            this.bitmap.data[idx + 1] = 0;   // G
            this.bitmap.data[idx + 2] = 0;   // B
        }
    });
    img.scan(0, 0, marginLeft, img.bitmap.height, function(x, y, idx) {
        if (this.bitmap.data[idx] < 50 && this.bitmap.data[idx + 1] < 50 && this.bitmap.data[idx + 2] < 50) {
            this.bitmap.data[idx] = 255;
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
        }
    });

    // Vẽ bàn cờ chính
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let px = marginLeft + x * cellSize;
            let py = marginTop + y * cellSize;
            img.composite(emptyCell, px, py);
            if (board[y][x] === X) {
                const cx = px + Math.floor((cellSize - pieceSize) / 2);
                const cy = py + Math.floor((cellSize - pieceSize) / 2);
                img.composite(xResized, cx, cy);
            } else if (board[y][x] === O) {
                const cx = px + Math.floor((cellSize - pieceSize) / 2);
                const cy = py + Math.floor((cellSize - pieceSize) / 2);
                img.composite(oResized, cx, cy);
            }
        }
    }

    const path = __dirname + `/cache/board_${Date.now()}.png`;
    await img.writeAsync(path);
    return path;
}
function checkWin(board, x, y, symbol) {
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];
    for (let [dx, dy] of directions) {
        let count = 1;
        for (let dir of [-1, 1]) {
            let nx = x, ny = y;
            while (true) {
                nx += dx * dir;
                ny += dy * dir;
                if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
                if (board[ny][nx] === symbol) count++;
                else break;
            }
        }
        if (count >= WIN_LENGTH) return true;
    }
    return false;
}

module.exports.run = async ({ api, event, args }) => {
    const gameID = event.threadID;

    // Lệnh hủy ván
    if (args[0] && args[0].toLowerCase() === "stop") {
        const game = games[gameID];
        if (!game) return api.sendMessage("Hiện tại không có ván cờ nào đang diễn ra.", event.threadID);

        // cho phép người chơi hoặc admin nhóm hủy
        const threadInfo = await api.getThreadInfo(event.threadID);
        const isAdmin = (threadInfo.adminIDs || []).some(e => String(e.id) === String(event.senderID));

        if (!game.players.includes(String(event.senderID)) && !isAdmin) {
            return api.sendMessage("Bạn không có quyền hủy ván này.", event.threadID);
        }

        // thử thu hồi ảnh cuối cùng nếu có
        if (game.lastMsg) {
            try { await api.unsendMessage(game.lastMsg); } catch (e) {}
        }

        delete games[gameID];
        return api.sendMessage("Ván cờ đã bị hủy.", event.threadID);
    }

    // Bắt đầu ván mới (tag 1 người)
    if (event.mentions && Object.keys(event.mentions).length === 1) {
        let opponentID = Object.keys(event.mentions)[0];
        if (String(opponentID) === String(event.senderID)) return api.sendMessage("Không thể chơi với chính mình.", event.threadID);

        games[gameID] = {
            board: createBoard(),
            players: [String(event.senderID), String(opponentID)],
            turn: 0,
            lastMsg: null
        };

        const imgPath = await renderBoardImage(games[gameID].board);
        let name = (await api.getUserInfo(event.senderID))[event.senderID].name;

        api.sendMessage({
            body: `🩷 Bắt đầu cờ caro 🩷\nLượt của ${name} (❌)`,
            attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
            if (!err && info && info.messageID) games[gameID].lastMsg = info.messageID;
            try { fs.unlinkSync(imgPath); } catch(e){ }
        });
    } else {
        api.sendMessage("Vui lòng tag 1 người để chơi hoặc dùng `caro stop` để hủy.", event.threadID);
    }
};

module.exports.handleEvent = async ({ api, event }) => {
    const game = games[event.threadID];
    if (!game) return;

    // chỉ xử lý khi là lượt người đó (so sánh string)
    if (String(event.senderID) !== game.players[game.turn]) return;

    const body = (event.body || "").toUpperCase().trim();
    if (!body) return;

    // parse dạng Letter + Number (ví dụ A1, B10)
    const m = body.match(/^([A-Z])(\d{1,2})$/);
    if (!m) return; // không phải nước đi hợp lệ

    const x = m[1].charCodeAt(0) - 65;
    const y = parseInt(m[2], 10) - 1;

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
        return api.sendMessage(`Nước đi không hợp lệ. Bảng hiện có ${BOARD_SIZE} cột và ${BOARD_SIZE} hàng. Ví dụ: A1`, event.threadID);
    }

    const { board, players, turn, lastMsg } = game;

    if (board[y][x] !== EMPTY) return api.sendMessage("Ô này đã được đánh.", event.threadID);

    const symbol = turn === 0 ? X : O;
    board[y][x] = symbol;

    // thu hồi ảnh cũ (nếu có)
    if (game.lastMsg) {
        try { await api.unsendMessage(game.lastMsg); } catch (e) {}
        game.lastMsg = null;
    }

    // kiểm tra thắng
    if (checkWin(board, x, y, symbol)) {
        const imgPath = await renderBoardImage(board);
        let winnerName = (await api.getUserInfo(players[turn]))[players[turn]].name;
        api.sendMessage({
            body: `Người chơi ${winnerName} (${symbol === X ? "❌" : "⭕"}) thắng!`,
            attachment: fs.createReadStream(imgPath)
        }, event.threadID, () => {
            try { fs.unlinkSync(imgPath); } catch(e){}
        });
        delete games[event.threadID];
        return;
    }

    // chuyển lượt
    game.turn = 1 - turn;
    const imgPath = await renderBoardImage(board);
    let nextName = (await api.getUserInfo(players[game.turn]))[players[game.turn]].name;
    api.sendMessage({
        body: `Lượt của ${nextName} (${game.turn === 0 ? "❌" : "⭕"})`,
        attachment: fs.createReadStream(imgPath)
    }, event.threadID, (err, info) => {
        if (!err && info && info.messageID) game.lastMsg = info.messageID;
        try { fs.unlinkSync(imgPath); } catch(e){}
    });
};