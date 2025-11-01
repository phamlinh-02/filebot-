const yahooFinance = require('yahoo-finance2').default;
let createCanvas, loadImage;
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
} catch (error) {
  console.log('Canvas module not available, using text mode');
  createCanvas = null;
  loadImage = null;
}
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  config: {
    name: "ck",
    version: "3.3",
    credits: "Neon team",
    description: "Hệ thống chứng khoán tích hợp với tiền bot Mirai và lưu data",
    commandCategory: "Tài Chính",
    cooldowns: 3
  },

  users: {},
  stocksData: {},
  stockHistory: {},
  tradingHistory: {},
  marketData: {},
  hotStocks: ['VIC.HM', 'AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'FPT.HM', 'HPG.HM', 'GAS.HM', 'VCB.HM'],
  cryptoStocks: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'ADA-USD'],
  connections: new Map(),
  updateInterval: 5000,
  serverStarted: false,
  lastUpdateTime: 0,
  conversionRate: 0.000043, // 1 USD = ~23,256 VND
  dataPath: path.join(__dirname, 'stock_data'),

  initializeData: function() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    this.loadUserData();
    this.loadStockHistory();
    this.loadTradingHistory();
    this.loadMarketData();

    setInterval(() => this.saveAllData(), 300000);
  },

  loadUserData: function() {
    const userDataPath = path.join(this.dataPath, 'users.json');
    try {
      if (fs.existsSync(userDataPath)) {
        const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        this.users = data || {};
        console.log(`📁 Loaded ${Object.keys(this.users).length} user accounts`);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.users = {};
    }
  },

  saveUserData: function() {
    const userDataPath = path.join(this.dataPath, 'users.json');
    try {
      fs.writeFileSync(userDataPath, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  loadStockHistory: function() {
    const stockHistoryPath = path.join(this.dataPath, 'stock_history.json');
    try {
      if (fs.existsSync(stockHistoryPath)) {
        const data = JSON.parse(fs.readFileSync(stockHistoryPath, 'utf8'));
        this.stockHistory = data || {};
        console.log(`📈 Loaded stock history for ${Object.keys(this.stockHistory).length} symbols`);
      }
    } catch (error) {
      console.error('Error loading stock history:', error);
      this.stockHistory = {};
    }
  },

  saveStockHistory: function() {
    const stockHistoryPath = path.join(this.dataPath, 'stock_history.json');
    try {
      const trimmedHistory = {};
      Object.entries(this.stockHistory).forEach(([symbol, history]) => {
        trimmedHistory[symbol] = history.slice(-100);
      });
      fs.writeFileSync(stockHistoryPath, JSON.stringify(trimmedHistory, null, 2));
    } catch (error) {
      console.error('Error saving stock history:', error);
    }
  },

  loadTradingHistory: function() {
    const tradingHistoryPath = path.join(this.dataPath, 'trading_history.json');
    try {
      if (fs.existsSync(tradingHistoryPath)) {
        const data = JSON.parse(fs.readFileSync(tradingHistoryPath, 'utf8'));
        this.tradingHistory = data || {};
        console.log(`📊 Loaded trading history`);
      }
    } catch (error) {
      console.error('Error loading trading history:', error);
      this.tradingHistory = {};
    }
  },

  saveTradingHistory: function() {
    const tradingHistoryPath = path.join(this.dataPath, 'trading_history.json');
    try {
      fs.writeFileSync(tradingHistoryPath, JSON.stringify(this.tradingHistory, null, 2));
    } catch (error) {
      console.error('Error saving trading history:', error);
    }
  },

  loadMarketData: function() {
    const marketDataPath = path.join(this.dataPath, 'market_data.json');
    try {
      if (fs.existsSync(marketDataPath)) {
        const data = JSON.parse(fs.readFileSync(marketDataPath, 'utf8'));
        this.marketData = data || {
          totalTrades: 0,
          totalVolume: 0,
          totalUsers: 0,
          dailyStats: {},
          topTraders: []
        };
      }
    } catch (error) {
      console.error('Error loading market data:', error);
      this.marketData = {
        totalTrades: 0,
        totalVolume: 0,
        totalUsers: 0,
        dailyStats: {},
        topTraders: []
      };
    }
  },

  saveMarketData: function() {
    const marketDataPath = path.join(this.dataPath, 'market_data.json');
    try {
      fs.writeFileSync(marketDataPath, JSON.stringify(this.marketData, null, 2));
    } catch (error) {
      console.error('Error saving market data:', error);
    }
  },

  saveAllData: function() {
    try {
      this.saveUserData();
      this.saveStockHistory();
      this.saveTradingHistory();
      this.saveMarketData();
      console.log(`💾 Auto-saved all data at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error in auto-save:', error);
    }
  },

  addTradingRecord: function(userId, action, symbol, amount, price, totalCost) {
    if (!this.tradingHistory[userId]) {
      this.tradingHistory[userId] = [];
    }

    const record = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      date: new Date().toISOString(),
      action: action.toUpperCase(),
      symbol: symbol,
      amount: amount,
      price: price,
      totalCost: totalCost,
      totalCostVND: Math.floor(totalCost / this.conversionRate)
    };

    this.tradingHistory[userId].push(record);

    if (this.tradingHistory[userId].length > 1000) {
      this.tradingHistory[userId] = this.tradingHistory[userId].slice(-500);
    }

    this.updateMarketStats(userId, action, totalCost);
  },

  updateMarketStats: function(userId, action, totalCost) {
    this.marketData.totalTrades++;
    this.marketData.totalVolume += totalCost;

    const today = new Date().toDateString();
    if (!this.marketData.dailyStats[today]) {
      this.marketData.dailyStats[today] = {
        trades: 0,
        volume: 0,
        users: new Set()
      };
    }

    this.marketData.dailyStats[today].trades++;
    this.marketData.dailyStats[today].volume += totalCost;
    this.marketData.dailyStats[today].users.add(userId);

    this.marketData.dailyStats[today].uniqueUsers = this.marketData.dailyStats[today].users.size;
  },

  calculateTotalValue: async function(user, userId, Currencies) {
    const botMoney = (await Currencies.getData(userId)).money || 0;
    const botMoneyUSD = botMoney * this.conversionRate;
    let stockValue = 0;

    Object.entries(user.portfolio).forEach(([symbol, amount]) => {
      if (amount > 0 && this.stocksData[symbol]) {
        stockValue += this.stocksData[symbol].regularMarketPrice * amount;
      }
    });

    return botMoneyUSD + stockValue;
  },

  startServer: function() {
    if (this.serverStarted) return;

    this.initializeData();

    try {
      const wss = new WebSocket.Server({ port: 8080 });

      wss.on('connection', (ws, req) => {
        const userId = req.url?.split('=')[1] || 'anonymous';
        this.connections.set(userId, ws);

        this.sendInitialData(ws, userId);

        ws.on('close', () => {
          this.connections.delete(userId);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.connections.delete(userId);
        });
      });

      setInterval(() => this.broadcastUpdates(), this.updateInterval);
      this.serverStarted = true;
      console.log('📡 Stock WebSocket Server started on port 8080');
    } catch (error) {
      console.error('Error starting WebSocket server:', error);
    }
  },

  sendInitialData: async function(ws, userId) {
    try {
      if (Object.keys(this.stocksData).length === 0) {
        await this.updateStockData();
      }

      if (this.users[userId]) {
        const canvas = this.createUserDashboard(userId);
        const imagePath = await this.sendCanvasToFile(canvas, `dashboard_${userId}_${Date.now()}.png`);
        const buffer = fs.readFileSync(imagePath);
        ws.send(JSON.stringify({
          type: 'dashboard',
          data: buffer.toString('base64'),
          timestamp: Date.now()
        }));
        this.cleanupFile(imagePath);
      }
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  },

  broadcastUpdates: async function() {
    if (Date.now() - this.lastUpdateTime < 4000) return;

    try {
      await this.updateStockData();
      this.lastUpdateTime = Date.now();

      this.connections.forEach(async (ws, userId) => {
        if (this.users[userId] && ws.readyState === WebSocket.OPEN) {
          try {
            const canvas = this.createUserDashboard(userId);
            const imagePath = await this.sendCanvasToFile(canvas, `update_${userId}_${Date.now()}.png`);
            const buffer = fs.readFileSync(imagePath);
            ws.send(JSON.stringify({
              type: 'update',
              data: buffer.toString('base64'),
              timestamp: Date.now()
            }));
            this.cleanupFile(imagePath);
          } catch (error) {
            console.error(`Error sending update to ${userId}:`, error);
          }
        }
      });
    } catch (error) {
      console.error('Broadcast update error:', error);
    }
  },

  updateStockData: async function() {
    const allStocks = [...this.hotStocks, ...this.cryptoStocks];
    this.stocksData = await this.fetchStockData(allStocks);

    const timestamp = Date.now();
    Object.entries(this.stocksData).forEach(([symbol, data]) => {
      if (!this.stockHistory[symbol]) this.stockHistory[symbol] = [];
      this.stockHistory[symbol].push({
        time: timestamp,
        price: data.regularMarketPrice,
        change: data.regularMarketChangePercent
      });

      if (this.stockHistory[symbol].length > 100) {
        this.stockHistory[symbol] = this.stockHistory[symbol].slice(-100);
      }
    });
  },

  run: async function({ api, event, args, Currencies, Users }) {
    if (!this.serverStarted) {
      this.startServer();
    }

    const [action, ...params] = args;

    switch(action?.toLowerCase()) {
      case 'đăngký':
      case 'register':
        return this.register(api, event, params, Users);
      case 'đăngnhập':
      case 'login':
        return this.login(api, event, params, Users);
      case 'xem':
      case 'view':
        return this.viewRealTimeStocks(api, event, Currencies);
      case 'top':
        return this.viewTopStocks(api, event, Currencies);
      case 'crypto':
        return this.viewCrypto(api, event, Currencies);
      case 'portfolio':
      case 'pf':
        return this.viewPortfolio(api, event, Currencies, Users);
      case 'chart':
        return this.viewChart(api, event, params[0]);
      case 'news':
        return this.getStockNews(api, event, params[0]);
      case 'ai':
        return this.aiAnalysis(api, event, params[0]);
      case 'leaderboard':
      case 'bxh':
        return this.viewLeaderboard(api, event, Currencies, Users);
      case 'reset':
        return this.resetAccount(api, event, Currencies);
      case 'donate':
        return this.donateCoins(api, event, params, Currencies, Users);
      case 'sync':
        return this.syncBotMoney(api, event, Currencies);
      default:
        return this.showMenu(api, event);
    }
  },

  register: async function(api, event, [username, password], Users) {
    if (!username || !password) {
      return api.sendMessage("❌ Cú pháp: ck đăngký [username] [password]", event.threadID);
    }

    const userId = event.senderID;
    if (this.users[userId]) {
      return api.sendMessage("❌ Bạn đã có tài khoản!", event.threadID);
    }

    const existingUser = Object.values(this.users).find(u => u.username === username);
    if (existingUser) {
      return api.sendMessage("❌ Tên người dùng đã tồn tại!", event.threadID);
    }

    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    const userName = await Users.getNameUser(userId);

    this.users[userId] = { 
      username, 
      password: hashedPassword, 
      realName: userName,
      portfolio: {},
      totalProfit: 0,
      trades: 0,
      joinDate: new Date().toISOString(),
      lastActive: Date.now(),
      achievements: [],
      settings: {
        notifications: true,
        autoSave: true,
        riskLevel: 'medium'
      },
      statistics: {
        totalBought: 0,
        totalSold: 0,
        bestTrade: 0,
        worstTrade: 0,
        longestHold: 0,
        favoriteSymbol: null
      }
    };

    this.marketData.totalUsers++;
    this.saveUserData();
    this.saveMarketData();

    try {
      const canvas = this.createRegistrationCanvas(username, userName, this.marketData.totalUsers);
      const attachment = await this.sendCanvas(api, event, canvas);

      return api.sendMessage({
        body: `✅ Đăng ký thành công!
👤 Tài khoản: ${username}
📱 Tên thật: ${userName}
💰 Sử dụng tiền bot hiện có
🎯 Chúc bạn đầu tư thành công!
📊 Bạn là thành viên thứ ${this.marketData.totalUsers}!`,
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      return api.sendMessage(`✅ Đăng ký thành công!
👤 Tài khoản: ${username}
📱 Tên thật: ${userName}
💰 Sử dụng tiền bot hiện có
🎯 Chúc bạn đầu tư thành công!
📊 Bạn là thành viên thứ ${this.marketData.totalUsers}!`, event.threadID);
    }
  },

  login: async function(api, event, [username, password], Users) {
    const userId = event.senderID;
    if (!username || !password) {
      return api.sendMessage("❌ Cú pháp: ck đăngnhập [username] [password]", event.threadID);
    }

    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    if (this.users[userId] && this.users[userId].password === hashedPassword) {
      this.users[userId].lastActive = Date.now();
      const userName = await Users.getNameUser(userId);

      this.users[userId].realName = userName;
      this.saveUserData();

      const daysSinceJoin = Math.floor((Date.now() - new Date(this.users[userId].joinDate).getTime()) / (1000 * 60 * 60 * 24));

      try {
        const canvas = this.createLoginCanvas(username, userName, daysSinceJoin, this.users[userId].trades);
        const attachment = await this.sendCanvas(api, event, canvas);

        return api.sendMessage({
          body: `✅ Đăng nhập thành công!
🎉 Chào mừng trở lại ${username}!
📱 ${userName}
📅 Đã tham gia ${daysSinceJoin} ngày
🔄 Tổng giao dịch: ${this.users[userId].trades}`,
          attachment: attachment
        }, event.threadID);
      } catch (error) {
        return api.sendMessage(`✅ Đăng nhập thành công!
🎉 Chào mừng trở lại ${username}!
📱 ${userName}
📅 Đã tham gia ${daysSinceJoin} ngày
🔄 Tổng giao dịch: ${this.users[userId].trades}`, event.threadID);
      }
    }
    return api.sendMessage("❌ Sai tên đăng nhập hoặc mật khẩu", event.threadID);
  },

  viewRealTimeStocks: async function(api, event, Currencies) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước! Dùng: ck đăngký [username] [password]", event.threadID);
    }

    // Ensure stock data is available
    if (!this.stocksData || Object.keys(this.stocksData).length === 0) {
      console.log('Initializing stock data...');
      await this.updateStockData();
    }
    
    try {
      const canvas = await this.createAdvancedStockCanvas(this.stocksData, "📊 BẢNG GIÁ REAL-TIME", userId, Currencies);
      const botMoney = (await Currencies.getData(userId)).money || 0;
      
      const message = `📡 Kết nối real-time thành công!
🔗 WebSocket: ws://0.0.0.0:8080?userId=${userId}
📱 Cập nhật mỗi 5 giây
💰 Số dư bot: ${botMoney.toLocaleString()} VND
💡 Reply: mua [STT] [SL] hoặc bán [STT] [SL]

⚡ Các lệnh nhanh:
• ck top - Top cổ phiếu hot
• ck crypto - Thị trường crypto  
• ck portfolio - Danh mục của bạn`;

      const attachment = await this.sendCanvas(api, event, canvas);

      return api.sendMessage({
        body: message,
        attachment: attachment
      }, event.threadID, (error, info) => {
        if (!error && info) {
          console.log(`✅ Setting up handleReply for message ${info.messageID}`);
          global.client.handleReply.push({
            type: "stock_trading",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            stocksData: this.stocksData,
            allStocks: [...this.hotStocks, ...this.cryptoStocks]
          });
        } else {
          console.error('Error sending message:', error);
        }
      });
    } catch (error) {
      console.error('Canvas error:', error);
      
      const botMoney = (await Currencies.getData(userId)).money || 0;
      let stockList = '';
      let index = 1;
      
      const allStocks = [...this.hotStocks, ...this.cryptoStocks];
      for (const symbol of allStocks) {
        const stock = this.stocksData[symbol];
        if (stock) {
          const priceVND = Math.floor(stock.regularMarketPrice / this.conversionRate);
          const changeIcon = stock.regularMarketChangePercent >= 0 ? '📈' : '📉';
          stockList += `${index}. ${symbol.replace('.HM', '')} - $${stock.regularMarketPrice.toFixed(2)} (${priceVND.toLocaleString()} VND) ${changeIcon}${stock.regularMarketChangePercent.toFixed(2)}%\n`;
          index++;
        }
      }

      const message = `📊 BẢNG GIÁ REAL-TIME

💰 Số dư bot: ${botMoney.toLocaleString()} VND
🔄 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}

${stockList}

💡 Reply: mua [STT] [SL] hoặc bán [STT] [SL]`;

      return api.sendMessage(message, event.threadID, (error, info) => {
        if (!error && info) {
          global.client.handleReply.push({
            type: "stock_trading",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            stocksData: this.stocksData,
            allStocks: [...this.hotStocks, ...this.cryptoStocks]
          });
        }
      });
    }
  },

  viewTopStocks: async function(api, event, Currencies) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    await this.updateStockData();

    const sortedStocks = Object.entries(this.stocksData)
      .filter(([symbol, data]) => !symbol.includes('-USD'))
      .sort((a, b) => Math.abs(b[1].regularMarketChangePercent) - Math.abs(a[1].regularMarketChangePercent))
      .slice(0, 8);

    const topStocksData = {};
    sortedStocks.forEach(([symbol, data]) => {
      topStocksData[symbol] = data;
    });

    try {
      const canvas = await this.createAdvancedStockCanvas(topStocksData, "🔥 TOP CỔ PHIẾU HOT", userId, Currencies);
      const attachment = await this.sendCanvas(api, event, canvas);
      
      return api.sendMessage({
        body: "🚀 Cổ phiếu biến động mạnh nhất hôm nay!",
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      let topList = '';
      let index = 1;
      sortedStocks.forEach(([symbol, data]) => {
        const priceVND = Math.floor(data.regularMarketPrice / this.conversionRate);
        const changeIcon = data.regularMarketChangePercent >= 0 ? '📈' : '📉';
        topList += `${index}. ${symbol.replace('.HM', '')} - $${data.regularMarketPrice.toFixed(2)} (${priceVND.toLocaleString()} VND) ${changeIcon}${data.regularMarketChangePercent.toFixed(2)}%\n`;
        index++;
      });

      return api.sendMessage(`🔥 TOP CỔ PHIẾU HOT

${topList}

🚀 Cổ phiếu biến động mạnh nhất hôm nay!`, event.threadID);
    }
  },

  viewCrypto: async function(api, event, Currencies) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    await this.updateStockData();

    const cryptoData = {};
    this.cryptoStocks.forEach(symbol => {
      if (this.stocksData[symbol]) {
        cryptoData[symbol] = this.stocksData[symbol];
      }
    });

    try {
      const canvas = await this.createCryptoCanvas(cryptoData, userId, Currencies);
      const attachment = await this.sendCanvas(api, event, canvas);
      
      return api.sendMessage({
        body: "₿ Thị trường tiền điện tử 24/7",
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      let cryptoList = '';
      let index = 1;
      Object.entries(cryptoData).forEach(([symbol, data]) => {
        const cleanSymbol = symbol.replace('-USD', '');
        const priceVND = Math.floor(data.regularMarketPrice / this.conversionRate);
        const changeIcon = data.regularMarketChangePercent >= 0 ? '📈' : '📉';
        cryptoList += `${index}. ${cleanSymbol} - $${data.regularMarketPrice.toLocaleString()} (${priceVND.toLocaleString()} VND) ${changeIcon}${data.regularMarketChangePercent.toFixed(2)}%\n`;
        index++;
      });

      return api.sendMessage(`₿ THỊ TRƯỜNG CRYPTO 24/7

${cryptoList}

💰 Thị trường tiền điện tử luôn mở!`, event.threadID);
    }
  },

  viewPortfolio: async function(api, event, Currencies, Users) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký/đăng nhập trước!", event.threadID);
    }

    const user = this.users[userId];
    
    try {
      const canvas = await this.createPortfolioCanvas(user, userId, Currencies, Users);
      const attachment = await this.sendCanvas(api, event, canvas);
      
      return api.sendMessage({
        body: "📈 Danh mục đầu tư cá nhân",
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      const totalValue = await this.calculateTotalValue(user, userId, Currencies);
      const botMoney = (await Currencies.getData(userId)).money || 0;
      const realName = await Users.getNameUser(userId);
      
      const holdings = Object.entries(user.portfolio).filter(([, amount]) => amount > 0);
      
      if (holdings.length === 0) {
        return api.sendMessage(`📈 DANH MỤC ĐẦU TƯ CÁ NHÂN

👤 ${user.username} (${realName})
💰 Tiền bot: ${botMoney.toLocaleString()} VND
📊 Tổng tài sản: $${totalValue.toLocaleString()}

📭 Chưa có cổ phiếu nào trong danh mục
💡 Hãy mua cổ phiếu đầu tiên của bạn!`, event.threadID);
      }

      let portfolioList = '';
      holdings.forEach(([symbol, amount]) => {
        const stock = this.stocksData[symbol];
        if (stock) {
          const currentValue = stock.regularMarketPrice * amount;
          const portfolioPercent = (currentValue / totalValue) * 100;
          const priceVND = Math.floor(stock.regularMarketPrice / this.conversionRate);
          portfolioList += `• ${symbol.replace('.HM', '')}: ${amount} cổ phiếu - $${currentValue.toFixed(0)} (${portfolioPercent.toFixed(1)}%)\n`;
        }
      });

      return api.sendMessage(`📈 DANH MỤC ĐẦU TƯ CÁ NHÂN

👤 ${user.username} (${realName})
💰 Tiền bot: ${botMoney.toLocaleString()} VND
📊 Tổng tài sản: $${totalValue.toLocaleString()}

📋 DANH MỤC:
${portfolioList}

🏢 Số mã cổ phiếu: ${holdings.length}`, event.threadID);
    }
  },

  viewChart: async function(api, event, symbol) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    if (!symbol) {
      return api.sendMessage("❌ Vui lòng chỉ định mã cổ phiếu. Ví dụ: ck chart AAPL", event.threadID);
    }

    const symbolUpper = symbol.toUpperCase();
    if (!this.stockHistory[symbolUpper] || this.stockHistory[symbolUpper].length < 5) {
      return api.sendMessage("❌ Chưa có đủ dữ liệu lịch sử cho " + symbolUpper, event.threadID);
    }

    try {
      const canvas = this.createChartCanvas(symbolUpper);
      const attachment = await this.sendCanvas(api, event, canvas);
      
      return api.sendMessage({
        body: `📊 Biểu đồ giá ${symbolUpper} (${this.stockHistory[symbolUpper].length} điểm dữ liệu)`,
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      const history = this.stockHistory[symbolUpper];
      const prices = history.map(h => h.price);
      const currentPrice = prices[prices.length - 1];
      const firstPrice = prices[0];
      const totalChange = currentPrice - firstPrice;
      const totalChangePercent = (totalChange / firstPrice) * 100;

      return api.sendMessage(`📊 BIỂU ĐỒ GIÁ ${symbolUpper}

📈 Giá hiện tại: $${currentPrice.toFixed(2)}
📊 Thay đổi: ${totalChange >= 0 ? '+' : ''}$${totalChange.toFixed(2)} (${totalChangePercent.toFixed(2)}%)
📋 Điểm dữ liệu: ${history.length}

⚠️ Không thể tạo biểu đồ canvas`, event.threadID);
    }
  },

  getStockNews: async function(api, event, symbol) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    if (!symbol) {
      return api.sendMessage("❌ Vui lòng chỉ định mã cổ phiếu. Ví dụ: ck news AAPL", event.threadID);
    }

    try {
      const news = [
        `📰 ${symbol}: Báo cáo tài chính Q4 vượt dự báo`,
        `🔥 ${symbol}: CEO công bố kế hoạch mở rộng thị trường châu Á`,
        `⚡ ${symbol}: Đầu tư 5 tỷ USD vào công nghệ AI`,
        `📈 ${symbol}: Dự báo tăng trưởng 15% năm sau`
      ];

      const randomNews = news.sort(() => 0.5 - Math.random()).slice(0, 3);

      return api.sendMessage(`📰 TIN TỨC MỚI NHẤT - ${symbol.toUpperCase()}

${randomNews.map((item, i) => `${i + 1}. ${item}`).join('\n')}

⚠️ Lưu ý: Đây là tin tức mô phỏng. Vui lòng tham khảo nguồn chính thức trước khi đầu tư.`, event.threadID);
    } catch (error) {
      return api.sendMessage("❌ Không thể lấy tin tức lúc này", event.threadID);
    }
  },

  aiAnalysis: async function(api, event, symbol) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    if (!symbol) {
      return api.sendMessage("❌ Vui lòng chỉ định mã cổ phiếu. Ví dụ: ck ai AAPL", event.threadID);
    }

    const symbolUpper = symbol.toUpperCase();
    const stock = this.stocksData[symbolUpper];

    if (!stock) {
      return api.sendMessage("❌ Không tìm thấy dữ liệu cho " + symbolUpper, event.threadID);
    }

    const analysis = this.generateAIAnalysis(symbolUpper, stock);

    return api.sendMessage(`🤖 PHÂN TÍCH AI - ${symbolUpper}

${analysis}

⚠️ Lưu ý: Đây là phân tích tự động. Không phải lời khuyên đầu tư. Hãy nghiên cứu kỹ trước khi quyết định!`, event.threadID);
  },

  generateAIAnalysis: function(symbol, stock) {
    const price = stock.regularMarketPrice;
    const change = stock.regularMarketChangePercent;
    const volume = stock.regularMarketVolume || 0;

    let trend = "Trung tính";
    let recommendation = "Nắm giữ";
    let riskLevel = "Trung bình";

    if (change > 5) {
      trend = "Tăng mạnh";
      recommendation = "Cân nhắc bán chốt lời";
      riskLevel = "Cao";
    } else if (change > 2) {
      trend = "Tăng nhẹ";
      recommendation = "Có thể mua thêm";
      riskLevel = "Thấp";
    } else if (change < -5) {
      trend = "Giảm mạnh";
      recommendation = "Cơ hội mua vào";
      riskLevel = "Cao";
    } else if (change < -2) {
      trend = "Giảm nhẹ";
      recommendation = "Quan sát thêm";
      riskLevel = "Trung bình";
    }

    const priceVND = Math.floor(price / this.conversionRate);

    return `📊 Giá hiện tại: $${price.toFixed(2)} (${priceVND.toLocaleString()} VND)
📈 Biến động: ${change.toFixed(2)}% (${trend})
📊 Khối lượng: ${volume.toLocaleString()}
🎯 Khuyến nghị: ${recommendation}
⚡ Mức rủi ro: ${riskLevel}

💡 Phân tích kỹ thuật:
• RSI: ${(50 + Math.random() * 40).toFixed(1)} (${Math.random() > 0.5 ? 'Quá mua' : 'Quá bán'})
• MACD: ${change > 0 ? 'Tín hiệu mua' : 'Tín hiệu bán'}
• MA20: ${change > 0 ? 'Trên đường MA' : 'Dưới đường MA'}`;
  },

  viewLeaderboard: async function(api, event, Currencies, Users) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Vui lòng đăng ký trước!", event.threadID);
    }

    const leaderboardPromises = Object.entries(this.users).map(async ([uid, user]) => {
      const totalValue = await this.calculateTotalValue(user, uid, Currencies);
      const realName = await Users.getNameUser(uid);
      return {
        ...user,
        userId: uid,
        totalValue,
        realName
      };
    });

    const leaderboard = (await Promise.all(leaderboardPromises))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    if (leaderboard.length === 0) {
      return api.sendMessage("📊 Chưa có dữ liệu bảng xếp hạng!", event.threadID);
    }

    try {
      const canvas = this.createLeaderboardCanvas(leaderboard);
      const attachment = await this.sendCanvas(api, event, canvas);
      
      return api.sendMessage({
        body: "🏆 BẢNG XẾP HẠNG NHÀ ĐẦU TƯ",
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      let leaderText = '🏆 BẢNG XẾP HẠNG NHÀ ĐẦU TƯ\n\n';
      leaderboard.forEach((trader, index) => {
        let medal = '🥉';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';

        leaderText += `${medal} ${index + 1}. ${trader.username} (${trader.realName})
💰 $${trader.totalValue.toLocaleString()} - ${trader.trades || 0} giao dịch\n\n`;
      });

      return api.sendMessage(leaderText, event.threadID);
    }
  },

  resetAccount: async function(api, event, Currencies) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Bạn chưa có tài khoản!", event.threadID);
    }

    this.users[userId].portfolio = {};
    this.users[userId].totalProfit = 0;
    this.users[userId].trades = 0;

    try {
      const canvas = this.createResetCanvas();
      const attachment = await this.sendCanvas(api, event, canvas);

      return api.sendMessage({
        body: "✅ Đã reset danh mục cổ phiếu! (Tiền bot giữ nguyên)",
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      return api.sendMessage("✅ Đã reset danh mục cổ phiếu! (Tiền bot giữ nguyên)", event.threadID);
    }
  },

  donateCoins: async function(api, event, [targetUser, amount], Currencies, Users) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Bạn chưa có tài khoản!", event.threadID);
    }

    if (!targetUser || !amount) {
      return api.sendMessage("❌ Cú pháp: ck donate [tên_user] [số_tiền_VND]", event.threadID);
    }

    const donateAmount = parseFloat(amount);
    if (isNaN(donateAmount) || donateAmount <= 0) {
      return api.sendMessage("❌ Số tiền không hợp lệ!", event.threadID);
    }

    const targetUserId = Object.keys(this.users).find(id => 
      this.users[id].username.toLowerCase() === targetUser.toLowerCase()
    );

    if (!targetUserId) {
      return api.sendMessage("❌ Không tìm thấy người dùng!", event.threadID);
    }

    const senderMoney = (await Currencies.getData(userId)).money || 0;

    if (senderMoney < donateAmount) {
      return api.sendMessage("❌ Số dư không đủ!", event.threadID);
    }

    await Currencies.decreaseMoney(userId, donateAmount);
    await Currencies.increaseMoney(targetUserId, donateAmount);

    const targetName = await Users.getNameUser(targetUserId);
    
    try {
      const canvas = this.createDonationCanvas(donateAmount, targetName, this.users[targetUserId].username);
      const attachment = await this.sendCanvas(api, event, canvas);

      return api.sendMessage({
        body: `✅ Đã chuyển ${donateAmount.toLocaleString()} VND cho ${targetName} (${this.users[targetUserId].username})!`,
        attachment: attachment
      }, event.threadID);
    } catch (error) {
      return api.sendMessage(`✅ Đã chuyển ${donateAmount.toLocaleString()} VND cho ${targetName} (${this.users[targetUserId].username})!`, event.threadID);
    }
  },

  syncBotMoney: async function(api, event, Currencies) {
    const userId = event.senderID;
    if (!this.users[userId]) {
      return api.sendMessage("❌ Bạn chưa có tài khoản!", event.threadID);
    }

    try {
      const botMoney = (await Currencies.getData(userId)).money || 0;
      const botMoneyUSD = Math.floor(botMoney * this.conversionRate);

      try {
        const canvas = this.createSyncCanvas(botMoney, botMoneyUSD, Math.floor(1/this.conversionRate));
        const attachment = await this.sendCanvas(api, event, canvas);

        return api.sendMessage({
          body: `💰 ĐỒNG BỘ THÀNH CÔNG!
📱 Tiền bot: ${botMoney.toLocaleString()} VND
💵 Quy đổi USD: $${botMoneyUSD.toLocaleString()}
🔄 Tỷ giá: 1 USD = ${Math.floor(1/this.conversionRate).toLocaleString()} VND`,
          attachment: attachment
        }, event.threadID);
      } catch (error) {
        return api.sendMessage(`💰 ĐỒNG BỘ THÀNH CÔNG!
📱 Tiền bot: ${botMoney.toLocaleString()} VND
💵 Quy đổi USD: $${botMoneyUSD.toLocaleString()}
🔄 Tỷ giá: 1 USD = ${Math.floor(1/this.conversionRate).toLocaleString()} VND`, event.threadID);
      }
    } catch (error) {
      return api.sendMessage("❌ Lỗi đồng bộ tiền!", event.threadID);
    }
  },

  fetchStockData: async function(symbols) {
    const stocks = {};
    
    // Ensure we always have fallback data
    symbols.forEach(symbol => {
      stocks[symbol] = this.getFallbackData(symbol);
    });

    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          const data = await yahooFinance.quote(symbol);
          
          if (data && data.regularMarketPrice && data.regularMarketPrice > 0) {
            return { symbol, data };
          } else {
            console.warn(`Invalid data for ${symbol}, using fallback`);
            return { symbol, data: this.getFallbackData(symbol) };
          }
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e.message);
          return { symbol, data: this.getFallbackData(symbol) };
        }
      });

      try {
        const results = await Promise.all(promises);
        results.forEach(result => {
          if (result && result.data && result.data.regularMarketPrice > 0) {
            stocks[result.symbol] = result.data;
          }
        });
      } catch (error) {
        console.error('Batch fetch error:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return stocks;
  },

  getFallbackData: function(symbol) {
    const fallbackPrices = {
      'VIC.HM': { price: 85000, change: 1.2 },
      'FPT.HM': { price: 125000, change: -0.8 },
      'HPG.HM': { price: 28500, change: 2.1 },
      'GAS.HM': { price: 95000, change: -1.5 },
      'VCB.HM': { price: 89000, change: 0.7 },
      'AAPL': { price: 195.50, change: 1.8 },
      'TSLA': { price: 248.42, change: -2.3 },
      'MSFT': { price: 421.92, change: 0.9 },
      'NVDA': { price: 140.15, change: 3.2 },
      'GOOGL': { price: 175.84, change: -0.6 },
      'AMZN': { price: 186.29, change: 1.1 },
      'META': { price: 563.27, change: -1.2 },
      'BTC-USD': { price: 97500, change: 2.5 },
      'ETH-USD': { price: 3450, change: 1.8 },
      'BNB-USD': { price: 695, change: -0.9 },
      'ADA-USD': { price: 1.05, change: 3.1 }
    };

    const fallback = fallbackPrices[symbol] || { price: 100, change: 0 };
    const basePrice = fallback.price * (symbol.includes('.HM') ? this.conversionRate : 1);
    
    return {
      regularMarketPrice: basePrice,
      regularMarketChange: basePrice * (fallback.change / 100),
      regularMarketChangePercent: fallback.change,
      regularMarketVolume: Math.floor(Math.random() * 1000000) + 100000,
      symbol: symbol,
      shortName: symbol.replace('.HM', ''),
      longName: symbol.replace('.HM', '') + ' Corporation'
    };
  },

  createAdvancedStockCanvas: async function(stocks, title, userId, Currencies) {
    if (!createCanvas) {
      throw new Error('Canvas not available');
    }
    const canvas = createCanvas(1200, 700 + Object.keys(stocks).length * 70);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 50);

    const botMoney = (await Currencies.getData(userId)).money || 0;
    const botMoneyUSD = Math.floor(botMoney * this.conversionRate);

    ctx.font = '18px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`💰 ${botMoney.toLocaleString()} VND ($${botMoneyUSD.toLocaleString()}) | Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`, canvas.width / 2, 80);

    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#e2e8f0';
    let yPos = 130;

    ctx.fillText('STT', 30, yPos);
    ctx.fillText('Mã CK', 80, yPos);
    ctx.fillText('Giá ($)', 200, yPos);
    ctx.fillText('VND', 300, yPos);
    ctx.fillText('Thay đổi', 400, yPos);
    ctx.fillText('% Thay đổi', 520, yPos);
    ctx.fillText('Khối lượng', 650, yPos);
    ctx.fillText('Thao tác', 800, yPos);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, yPos + 10);
    ctx.lineTo(canvas.width - 20, yPos + 10);
    ctx.stroke();

    yPos += 40;

    Object.entries(stocks).forEach(([symbol, data], index) => {
      const changeColor = data.regularMarketChangePercent >= 0 ? '#22c55e' : '#ef4444';
      const bgColor = index % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.5)';

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, yPos - 25, canvas.width, 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`${index + 1}`, 30, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(symbol.replace('.HM', ''), 80, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.fillText(`$${data.regularMarketPrice.toFixed(2)}`, 200, yPos);

      const priceVND = Math.floor(data.regularMarketPrice / this.conversionRate);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px Arial';
      ctx.fillText(`${priceVND.toLocaleString()}`, 300, yPos);

      ctx.fillStyle = changeColor;
      const change = data.regularMarketChange || 0;
      ctx.fillText(`${change >= 0 ? '+' : ''}${change.toFixed(2)}`, 400, yPos);

      ctx.fillStyle = changeColor;
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`${data.regularMarketChangePercent >= 0 ? '+' : ''}${data.regularMarketChangePercent.toFixed(2)}%`, 520, yPos);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Arial';
      const volume = data.regularMarketVolume || 0;
      ctx.fillText(this.formatNumber(volume), 650, yPos);

      this.drawButton(ctx, 800, yPos - 20, 80, 35, '#16a34a', 'MUA', '#ffffff');
      this.drawButton(ctx, 900, yPos - 20, 80, 35, '#dc2626', 'BÁN', '#ffffff');

      if (this.stockHistory[symbol] && this.stockHistory[symbol].length > 3) {
        this.drawMiniChart(ctx, 1000, yPos - 20, 100, 35, this.stockHistory[symbol]);
      }

      yPos += 60;
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💡 Reply: mua [số] [số lượng] | bán [số] [số lượng]', canvas.width / 2, yPos + 30);

    return canvas;
  },

  createCryptoCanvas: async function(cryptoData, userId, Currencies) {
    const canvas = createCanvas(1200, 600);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f7931a';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('₿ THỊ TRƯỜNG CRYPTO 24/7', canvas.width / 2, 60);

    const botMoney = (await Currencies.getData(userId)).money || 0;
    const botMoneyUSD = Math.floor(botMoney * this.conversionRate);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Arial';
    ctx.fillText(`💰 ${botMoney.toLocaleString()} VND ($${botMoneyUSD.toLocaleString()})`, canvas.width / 2, 90);

    let yPos = 130;
    Object.entries(cryptoData).forEach(([symbol, data], index) => {
      const cleanSymbol = symbol.replace('-USD', '');
      const changeColor = data.regularMarketChangePercent >= 0 ? '#00d4aa' : '#ff6b6b';

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.roundRect(ctx, 50, yPos - 30, canvas.width - 100, 80, 15);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(cleanSymbol, 80, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`$${data.regularMarketPrice.toLocaleString()}`, 250, yPos);

      const priceVND = Math.floor(data.regularMarketPrice / this.conversionRate);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '20px Arial';
      ctx.fillText(`${priceVND.toLocaleString()} VND`, 450, yPos);

      ctx.fillStyle = changeColor;
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${data.regularMarketChangePercent >= 0 ? '+' : ''}${data.regularMarketChangePercent.toFixed(2)}%`, 650, yPos);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Arial';
      const marketCap = data.regularMarketPrice * 1000000;
      ctx.fillText(`Cap: $${this.formatNumber(marketCap)}`, 850, yPos);

      yPos += 100;
    });

    return canvas;
  },

  createUserDashboard: async function(userId) {
    const user = this.users[userId];
    if (!user) return createCanvas(800, 600);

    const canvas = createCanvas(1400, 900);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e293b');
    gradient.addColorStop(1, '#334155');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 DASHBOARD REAL-TIME', canvas.width/2, 50);

    const totalValue = await this.calculateTotalValue(user, userId, global.data.currencies);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    this.roundRect(ctx, 50, 80, canvas.width - 100, 120, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`👤 ${user.username}`, 80, 120);

    const botMoney = (await global.data.currencies.getData(userId)).money || 0;
    const botMoneyUSD = Math.floor(botMoney * this.conversionRate);
    ctx.fillText(`💰 Tiền bot: ${botMoney.toLocaleString()} VND ($${botMoneyUSD.toLocaleString()})`, 80, 150);
    ctx.fillText(`📊 Tổng tài sản: $${totalValue.toLocaleString()}`, 400, 120);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Arial';
    ctx.fillText(`🔄 Giao dịch: ${user.trades || 0}`, 80, 180);
    ctx.fillText(`⏰ Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`, 400, 180);

    let yPos = 250;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('📊 BẢNG GIÁ THỜI GIAN THỰC', 50, yPos);

    yPos += 40;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('STT', 50, yPos);
    ctx.fillText('Mã CK', 120, yPos);
    ctx.fillText('Giá ($)', 220, yPos);
    ctx.fillText('VND', 320, yPos);
    ctx.fillText('Thay đổi (%)', 420, yPos);
    ctx.fillText('Sở hữu', 550, yPos);
    ctx.fillText('Giá trị', 650, yPos);
    ctx.fillText('Thao tác', 750, yPos);

    yPos += 30;

    Object.entries(this.stocksData).forEach(([symbol, data], index) => {
      if (index >= 8) return;

      const changeColor = data.regularMarketChangePercent >= 0 ? '#22c55e' : '#ef4444';
      const owned = user.portfolio[symbol] || 0;
      const value = owned * data.regularMarketPrice;

      const bgColor = index % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(15, 23, 42, 0.3)';
      ctx.fillStyle = bgColor;
      ctx.fillRect(30, yPos - 20, canvas.width - 60, 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Arial';
      ctx.fillText(`${index + 1}`, 50, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(symbol.replace('.HM', ''), 120, yPos);

      ctx.fillText(`$${data.regularMarketPrice.toFixed(2)}`, 220, yPos);

      const priceVND = Math.floor(data.regularMarketPrice / this.conversionRate);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '14px Arial';
      ctx.fillText(`${priceVND.toLocaleString()}`, 320, yPos);

      ctx.fillStyle = changeColor;
      ctx.font = '16px Arial';
      ctx.fillText(`${data.regularMarketChangePercent >= 0 ? '+' : ''}${data.regularMarketChangePercent.toFixed(2)}%`, 420, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText(owned.toString(), 550, yPos);
      ctx.fillText(`$${value.toFixed(0)}`, 650, yPos);

      if (owned > 0) {
        this.drawButton(ctx, 750, yPos - 15, 60, 25, '#dc2626', 'BÁN', '#ffffff');
        this.drawButton(ctx, 820, yPos - 15, 60, 25, '#16a34a', 'MUA', '#ffffff');
      } else {
        this.drawButton(ctx, 750, yPos - 15, 60, 25, '#16a34a', 'MUA', '#ffffff');
      }

      yPos += 40;
    });

    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    this.roundRect(ctx, 50, yPos + 20, canvas.width - 100, 100, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('📊 TỔNG KẾT DANH MỤC', 80, yPos + 50);

    const portfolioCount = Object.values(user.portfolio).filter(amount => amount > 0).length;
    ctx.font = '18px Arial';
    ctx.fillText(`📋 Số mã đang nắm giữ: ${portfolioCount}`, 80, yPos + 80);

    const stockValue = totalValue - botMoneyUSD;
    const stockPercent = totalValue > 0 ? (stockValue / totalValue * 100) : 0;
    ctx.fillText(`💼 Tỷ trọng cổ phiếu: ${stockPercent.toFixed(1)}%`, 400, yPos + 80);

    return canvas;
  },

  createPortfolioCanvas: async function(user, userId, Currencies, Users) {
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📈 DANH MỤC ĐẦU TƯ CÁ NHÂN', canvas.width / 2, 50);

    const totalValue = await this.calculateTotalValue(user, userId, Currencies);
    const botMoney = (await Currencies.getData(userId)).money || 0;
    const botMoneyUSD = Math.floor(botMoney * this.conversionRate);
    const realName = await Users.getNameUser(userId);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.roundRect(ctx, 50, 80, canvas.width - 100, 100, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`👤 Investor: ${user.username}`, 80, 120);
    ctx.fillText(`📱 ${realName}`, 80, 150);

    ctx.fillText(`💰 Tiền bot: ${botMoney.toLocaleString()} VND ($${botMoneyUSD.toLocaleString()})`, 500, 120);
    ctx.fillText(`📊 Tổng tài sản: $${totalValue.toLocaleString()}`, 500, 150);

    let yPos = 230;
    const holdings = Object.entries(user.portfolio).filter(([, amount]) => amount > 0);

    if (holdings.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📭 Chưa có cổ phiếu nào trong danh mục', canvas.width / 2, 350);
      ctx.fillText('💡 Hãy mua cổ phiếu đầu tiên của bạn!', canvas.width / 2, 380);
      return canvas;
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Mã CK', 80, yPos);
    ctx.fillText('Số lượng', 200, yPos);
    ctx.fillText('Giá hiện tại', 320, yPos);
    ctx.fillText('VND', 450, yPos);
    ctx.fillText('Giá trị', 550, yPos);
    ctx.fillText('% Danh mục', 680, yPos);

    yPos += 40;

    holdings.forEach(([symbol, amount], index) => {
      const stock = this.stocksData[symbol];
      if (!stock) return;

      const currentValue = stock.regularMarketPrice * amount;
      const portfolioPercent = (currentValue / totalValue) * 100;

      const bgColor = index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillStyle = bgColor;
      ctx.fillRect(50, yPos - 25, canvas.width - 100, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(symbol.replace('.HM', ''), 80, yPos);

      ctx.font = '18px Arial';
      ctx.fillText(amount.toString(), 200, yPos);
      ctx.fillText(`$${stock.regularMarketPrice.toFixed(2)}`, 320, yPos);

      const priceVND = Math.floor(stock.regularMarketPrice / this.conversionRate);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px Arial';
      ctx.fillText(`${priceVND.toLocaleString()}`, 450, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.fillText(`$${currentValue.toLocaleString()}`, 550, yPos);
      ctx.fillText(`${portfolioPercent.toFixed(1)}%`, 680, yPos);

      yPos += 45;
    });

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    this.roundRect(ctx, 50, yPos + 20, canvas.width - 100, 80, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('📊 TỔNG KẾT', 80, yPos + 50);
    ctx.font = '18px Arial';
    ctx.fillText(`🏢 Số mã cổ phiếu: ${holdings.length}`, 80, yPos + 75);

    const stockValue = totalValue - botMoneyUSD;
    const stockPercent = totalValue > 0 ? (stockValue / totalValue * 100) : 0;
    ctx.fillText(`💼 Tỷ trọng đầu tư: ${stockPercent.toFixed(1)}%`, 400, yPos + 75);

    return canvas;
  },

  createChartCanvas: function(symbol) {
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext('2d');
    const history = this.stockHistory[symbol] || [];

    if (history.length < 2) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Không đủ dữ liệu để vẽ biểu đồ', canvas.width / 2, canvas.height / 2);
      return canvas;
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`📊 BIỂU ĐỒ GIÁ ${symbol}`, canvas.width / 2, 40);

    const chartX = 80;
    const chartY = 80;
    const chartWidth = canvas.width - 160;
    const chartHeight = canvas.height - 160;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const x = chartX + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, chartY);
      ctx.lineTo(x, chartY + chartHeight);
      ctx.stroke();
    }

    for (let i = 0; i <= 5; i++) {
      const y = chartY + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    history.forEach((point, index) => {
      const x = chartX + (chartWidth / (history.length - 1)) * index;
      const y = chartY + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    history.forEach((point, index) => {
      const x = chartX + (chartWidth / (history.length - 1)) * index;
      const y = chartY + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = chartY + (chartHeight / 5) * i + 5;
      ctx.fillText(`$${price.toFixed(2)}`, chartX - 10, y);

      const priceVND = Math.floor(price / this.conversionRate);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px Arial';
      ctx.fillText(`${priceVND.toLocaleString()}`, chartX - 120, y);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial';
    }

    const currentPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const totalChange = currentPrice - firstPrice;
    const totalChangePercent = (totalChange / firstPrice) * 100;
    const changeColor = totalChange >= 0 ? '#22c55e' : '#ef4444';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Giá hiện tại: $${currentPrice.toFixed(2)}`, chartX, canvas.height - 60);

    const currentPriceVND = Math.floor(currentPrice / this.conversionRate);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '18px Arial';
    ctx.fillText(`${currentPriceVND.toLocaleString()} VND`, chartX, canvas.height - 40);

    ctx.fillStyle = changeColor;
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Thay đổi: ${totalChange >= 0 ? '+' : ''}$${totalChange.toFixed(2)} (${totalChangePercent.toFixed(2)}%)`, chartX + 400, canvas.height - 40);

    return canvas;
  },

  createRegistrationCanvas: function(username, realName, totalUsers) {
    const canvas = createCanvas(1000, 500);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(1, '#16a34a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✅ ĐĂNG KÝ THÀNH CÔNG!', canvas.width / 2, 80);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`👤 ${username}`, canvas.width / 2, 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '24px Arial';
    ctx.fillText(`📱 ${realName}`, canvas.width / 2, 180);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('🎯 Chúc mừng bạn trở thành nhà đầu tư!', canvas.width / 2, 240);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px Arial';
    ctx.fillText(`📊 Thành viên thứ ${totalUsers} của hệ thống`, canvas.width / 2, 280);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('💰 Sẵn sàng đầu tư với tiền bot!', canvas.width / 2, 320);

    return canvas;
  },

  createLoginCanvas: function(username, realName, daysSinceJoin, totalTrades) {
    const canvas = createCanvas(1000, 500);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 CHÀO MỪNG TRỞ LẠI!', canvas.width / 2, 80);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`👤 ${username}`, canvas.width / 2, 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '24px Arial';
    ctx.fillText(`📱 ${realName}`, canvas.width / 2, 180);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`📅 Đã tham gia ${daysSinceJoin} ngày`, canvas.width / 2, 240);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`🔄 Tổng giao dịch: ${totalTrades || 0}`, canvas.width / 2, 280);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🚀 Sẵn sàng giao dịch!', canvas.width / 2, 340);

    return canvas;
  },

  createResetCanvas: function() {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f59e0b');
    gradient.addColorStop(1, '#d97706');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✅ RESET THÀNH CÔNG!', canvas.width / 2, 100);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🔄 Đã reset danh mục cổ phiếu', canvas.width / 2, 160);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '22px Arial';
    ctx.fillText('💰 Tiền bot được giữ nguyên', canvas.width / 2, 200);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🎯 Bắt đầu hành trình mới!', canvas.width / 2, 260);

    return canvas;
  },

  createDonationCanvas: function(amount, targetName, targetUsername) {
    const canvas = createCanvas(1000, 500);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✅ CHUYỂN TIỀN THÀNH CÔNG!', canvas.width / 2, 80);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`💰 ${amount.toLocaleString()} VND`, canvas.width / 2, 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '24px Arial';
    ctx.fillText(`📤 Đã chuyển cho: ${targetName}`, canvas.width / 2, 200);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px Arial';
    ctx.fillText(`👤 (${targetUsername})`, canvas.width / 2, 230);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('🤝 Cảm ơn bạn đã chia sẻ!', canvas.width / 2, 300);

    return canvas;
  },

  createSyncCanvas: function(botMoney, botMoneyUSD, exchangeRate) {
    const canvas = createCanvas(1000, 500);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(1, '#0891b2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💰 ĐỒNG BỘ THÀNH CÔNG!', canvas.width / 2, 80);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`📱 ${botMoney.toLocaleString()} VND`, canvas.width / 2, 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`💵 $${botMoneyUSD.toLocaleString()} USD`, canvas.width / 2, 180);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '22px Arial';
    ctx.fillText(`🔄 Tỷ giá: 1 USD = ${exchangeRate.toLocaleString()} VND`, canvas.width / 2, 240);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('✅ Sẵn sàng giao dịch chứng khoán!', canvas.width / 2, 300);

    return canvas;
  },

  createLeaderboardCanvas: function(leaderboard) {
    const canvas = createCanvas(1000, 700);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.3, '#16213e');
    gradient.addColorStop(0.7, '#0f3460');
    gradient.addColorStop(1, '#533a03');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 BẢNG XẾP HẠNG NHÀ ĐẦU TƯ', canvas.width / 2, 50);

    let yPos = 120;

    leaderboard.forEach((trader, index) => {
      let medalColor = '#cd7f32';
      let medal = '🥉';
      if (index === 0) { medalColor = '#ffd700'; medal = '🥇'; }
      else if (index === 1) { medalColor = '#c0c0c0'; medal = '🥈'; }

      const bgOpacity = Math.max(0.1, 0.3 - index * 0.02);
      ctx.fillStyle = `rgba(255, 255, 255, ${bgOpacity})`;
      this.roundRect(ctx, 50, yPos - 25, canvas.width - 100, 50, 10);
      ctx.fill();

      ctx.fillStyle = medalColor;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${medal} ${index + 1}`, 70, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${trader.username} (${trader.realName})`, 150, yPos);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText(`$${trader.totalValue.toLocaleString()}`, 500, yPos);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Arial';
      ctx.fillText(`${trader.trades || 0} giao dịch`, 700, yPos);

      yPos += 55;
    });

    return canvas;
  },

  drawButton: function(ctx, x, y, width, height, bgColor, text, textColor) {
    ctx.fillStyle = bgColor;
    this.roundRect(ctx, x, y, width, height, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 5);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width/2, y + height/2 + 4);
  },

  drawMiniChart: function(ctx, x, y, width, height, history) {
    if (!history || history.length < 2) return;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    ctx.strokeStyle = prices[prices.length - 1] > prices[0] ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    prices.forEach((price, index) => {
      const plotX = x + (width / (prices.length - 1)) * index;
      const plotY = y + height - ((price - minPrice) / priceRange) * height;

      if (index === 0) {
        ctx.moveTo(plotX, plotY);
      } else {
        ctx.lineTo(plotX, plotY);
      }
    });

    ctx.stroke();
  },

  roundRect: function(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    return ctx;
  },

  formatNumber: function(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  sendCanvasToFile: async function(canvas, filename) {
    try {
      const buffer = canvas.toBuffer('image/png');
      const filepath = path.join(__dirname, filename);
      await fs.writeFile(filepath, buffer);
      return filepath;
    } catch (error) {
      console.error('Error saving canvas to file:', error);
      throw error;
    }
  },

  sendCanvas: async function(api, event, canvas) {
    try {
      const filename = `stock_${Date.now()}_${uuidv4()}.png`;
      const filepath = await this.sendCanvasToFile(canvas, filename);
      const attachment = fs.createReadStream(filepath);
      
      attachment.on('end', () => {
        this.cleanupFile(filepath);
      });
      
      return attachment;
    } catch (error) {
      console.error('Error sending canvas:', error);
      return null;
    }
  },

  cleanupFile: function(filepath) {
    try {
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 5000);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  },

  showMenu: function(api, event) {
    const menu = `📊 HỆ THỐNG CHỨNG KHOÁN TÍCH HỢP BOT 📊

🔐 QUẢN LÝ TÀI KHOẢN:
• ck đăngký [username] [password] - Tạo tài khoản
• ck đăngnhập [username] [password] - Đăng nhập

📈 XEM DỮ LIỆU:
• ck xem - Bảng giá real-time với WebSocket
• ck top - Top cổ phiếu hot nhất
• ck crypto - Thị trường tiền điện tử
• ck portfolio - Danh mục đầu tư cá nhân

📊 PHÂN TÍCH:
• ck chart [mã] - Biểu đồ giá lịch sử
• ck news [mã] - Tin tức cổ phiếu  
• ck ai [mã] - Phân tích AI tự động

🏆 CỘNG ĐỒNG:
• ck leaderboard - Bảng xếp hạng
• ck donate [user] [số_tiền_VND] - Chuyển tiền bot

⚙️ KHÁC:
• ck reset - Reset danh mục
• ck sync - Đồng bộ tiền bot
• mua [STT] [số lượng] - Mua cổ phiếu
• bán [STT] [số lượng] - Bán cổ phiếu

💰 Sử dụng tiền bot Mirai - Tỷ giá: 1 USD = ${Math.floor(1/this.conversionRate).toLocaleString()} VND`;

    return api.sendMessage(menu, event.threadID);
  },

  handleReply: async function({ api, event, handleReply, Currencies, Users }) {
    console.log(`🔄 HandleReply called: ${event.body}`);
    console.log(`📊 HandleReply data:`, JSON.stringify(handleReply, null, 2));
    
    if (!handleReply || handleReply.type !== "stock_trading") {
      console.log(`❌ HandleReply type mismatch: ${handleReply?.type}`);
      return api.sendMessage("❌ Lỗi hệ thống handleReply. Hãy gõ 'ck xem' lại để refresh!", event.threadID);
    }

    if (!this.users[event.senderID]) {
      return api.sendMessage("❌ Vui lòng đăng ký/đăng nhập trước!", event.threadID);
    }

    const input = event.body.toLowerCase().trim().split(' ');
    const [action, indexStr, amountStr] = input;
    
    if (!['mua', 'buy', 'bán', 'ban', 'sell'].includes(action)) {
      return api.sendMessage("❌ Cú pháp: mua [STT] [số lượng] hoặc bán [STT] [số lượng]", event.threadID);
    }

    const stockIndex = parseInt(indexStr) - 1;
    const shareAmount = parseInt(amountStr) || 1;
    const allStocks = handleReply.allStocks || [...this.hotStocks, ...this.cryptoStocks];

    if (isNaN(stockIndex) || stockIndex < 0 || stockIndex >= allStocks.length) {
      return api.sendMessage(`❌ STT không hợp lệ! Chọn từ 1-${allStocks.length}`, event.threadID);
    }

    if (shareAmount <= 0 || shareAmount > 1000000) {
      return api.sendMessage("❌ Số lượng phải từ 1-1,000,000!", event.threadID);
    }

    const symbol = allStocks[stockIndex];
    
    // Make sure we have current stock data
    if (!this.stocksData || Object.keys(this.stocksData).length === 0) {
      await this.updateStockData();
    }

    let stock = this.stocksData[symbol] || handleReply.stocksData?.[symbol];

    if (!stock || !stock.regularMarketPrice || stock.regularMarketPrice <= 0) {
      console.log(`❌ No valid data for ${symbol}, using fallback`);
      stock = this.getFallbackData(symbol);
      this.stocksData[symbol] = stock; // Store fallback data
      console.log(`✅ Using fallback price $${stock.regularMarketPrice} for ${symbol}`);
    }

    console.log(`💰 Stock data for ${symbol}: $${stock.regularMarketPrice}`);

    const user = this.users[event.senderID];
    const totalCostUSD = stock.regularMarketPrice * shareAmount;
    const totalCostVND = Math.floor(totalCostUSD / this.conversionRate);

    if (['mua', 'buy'].includes(action)) {
      try {
        const botMoney = (await Currencies.getData(event.senderID)).money || 0;

        if (botMoney < totalCostVND) {
          const needed = totalCostVND - botMoney;
          return api.sendMessage(`❌ Không đủ tiền!
💰 Cần thêm: ${needed.toLocaleString()} VND
💳 Số dư hiện tại: ${botMoney.toLocaleString()} VND
📊 Chi phí giao dịch: ${totalCostVND.toLocaleString()} VND`, event.threadID);
        }

        // Execute purchase
        await Currencies.decreaseMoney(event.senderID, totalCostVND);
        
        // Initialize portfolio if not exists
        if (!user.portfolio) {
          user.portfolio = {};
        }
        
        user.portfolio[symbol] = (user.portfolio[symbol] || 0) + shareAmount;
        user.trades = (user.trades || 0) + 1;

        this.addTradingRecord(event.senderID, 'BUY', symbol, shareAmount, stock.regularMarketPrice, totalCostUSD);
        this.saveUserData();

        const userName = await Users.getNameUser(event.senderID);
        const newBalance = (await Currencies.getData(event.senderID)).money || 0;
        
        return api.sendMessage(`✅ MUA THÀNH CÔNG!
👤 ${userName} (${user.username})
📊 Mã: ${symbol.replace('.HM', '')}
📈 Số lượng: ${shareAmount.toLocaleString()} cổ phiếu
💰 Chi phí: $${totalCostUSD.toFixed(2)} (${totalCostVND.toLocaleString()} VND)
📈 Giá mua: $${stock.regularMarketPrice.toFixed(2)}
💳 Số dư còn lại: ${newBalance.toLocaleString()} VND
📊 Tổng sở hữu ${symbol.replace('.HM', '')}: ${user.portfolio[symbol].toLocaleString()} cổ phiếu`, event.threadID);

      } catch (error) {
        console.error('Purchase error:', error);
        return api.sendMessage(`❌ Lỗi khi mua cổ phiếu: ${error.message}`, event.threadID);
      }

    } else if (['bán', 'ban', 'sell'].includes(action)) {
      try {
        const owned = user.portfolio?.[symbol] || 0;
        if (owned < shareAmount) {
          return api.sendMessage(`❌ Không đủ cổ phiếu!
📊 Đang sở hữu: ${owned.toLocaleString()} ${symbol.replace('.HM', '')}
📉 Muốn bán: ${shareAmount.toLocaleString()}`, event.threadID);
        }

        // Execute sale
        await Currencies.increaseMoney(event.senderID, totalCostVND);
        user.portfolio[symbol] -= shareAmount;
        user.trades = (user.trades || 0) + 1;

        this.addTradingRecord(event.senderID, 'SELL', symbol, shareAmount, stock.regularMarketPrice, totalCostUSD);
        this.saveUserData();

        const userName = await Users.getNameUser(event.senderID);
        const newBalance = (await Currencies.getData(event.senderID)).money || 0;
        
        return api.sendMessage(`✅ BÁN THÀNH CÔNG!
👤 ${userName} (${user.username})
📊 Mã: ${symbol.replace('.HM', '')}
📉 Số lượng: ${shareAmount.toLocaleString()} cổ phiếu
💰 Thu về: $${totalCostUSD.toFixed(2)} (${totalCostVND.toLocaleString()} VND)
📉 Giá bán: $${stock.regularMarketPrice.toFixed(2)}
💳 Số dư hiện tại: ${newBalance.toLocaleString()} VND
📊 Còn lại ${symbol.replace('.HM', '')}: ${user.portfolio[symbol].toLocaleString()} cổ phiếu`, event.threadID);

      } catch (error) {
        console.error('Sale error:', error);
        return api.sendMessage(`❌ Lỗi khi bán cổ phiếu: ${error.message}`, event.threadID);
      }
    }
  },

  onReply: async function({ api, event, handleReply, Currencies, Users }) {
    return this.handleReply({ api, event, handleReply, Currencies, Users });
  }
};