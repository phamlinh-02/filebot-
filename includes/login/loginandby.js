const axios = require("axios");
const qs = require("querystring");
const { join } = require("path");
const fs = require("fs-extra");
const logger = require(process.cwd() + '/utils/log.js');
const FacebookLogin = require('./FacebookLogin.js');
const speakeasy = require('speakeasy');

exports.handleRelogin = async function() {
    try {
        const configPath = join(process.cwd(), './config.json');
        if (!fs.existsSync(configPath)) {
            return false;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.facebookAccount || !config.facebookAccount.email || !config.facebookAccount.password || !config.facebookAccount["2FA"]) {
            logger('Thiếu thông tin tài khoản trong config.json', '[ ERROR ]');
            return false;
        }

        const { email, password, "2FA": twoFA } = config.facebookAccount;
        logger('Em đang đănh nhập lại...', '< LOGIN >');
        
        const twoFactorCode = speakeasy.totp({
            secret: twoFA.replace(/\s+/g, '').toLowerCase(),
            encoding: 'base32'
        });           
        const loginResult = await FacebookLogin.getTokenFromCredentials(email, password, twoFA, twoFactorCode);
        
        if (!loginResult.status) {
            logger(`Đăng nhập thất bại: ${loginResult.message}`, '[ ERROR ]');
            return false;
        }

        const cookiePath = join(process.cwd(), './includes/cookie.txt');
        const newCookie = loginResult.data.session_cookies
            .filter(cookie => ['c_user', 'xs', 'fr', 'datr'].includes(cookie.key))
            .map(cookie => `${cookie.key}=${cookie.value}`)
            .join('; ');
        fs.writeFileSync(cookiePath, newCookie);
        logger('Đã cập nhật cookies thành công', '< COOKIE >');
        
        const tokensPath = join(process.cwd(), './includes/tokens.json');
        let tokens = {};
        if (fs.existsSync(tokensPath)) {
            tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        }

        if (loginResult.data.access_token_eaad6v7) {
            logger('Cập nhật token EAAD6V7 thành công ', '< TOKEN >');
            tokens.EAAD6V7 = loginResult.data.access_token_eaad6v7;
            
        }
        if (loginResult.data.access_token) {
            logger('Cập nhật token EAAAAU thành công', '< TOKEN >');
            tokens.EAAAAU = loginResult.data.access_token;
            
        }

        fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
        
        logger('Đăng nhập thành công, Tiến hành khởi động lại  ..', '[ SUCCESS ]');
        
        global.client.commands = new Map();
        global.client.events = new Map();
        
        setTimeout(() => {
            process.exit(1);
        }, 1000);
        
        return true;
    } catch (error) {
        logger(`Lỗi khi đăng nhập lại: ${error.message}`, '< ERROR >');
        return false;
    }
};

exports.handleError = async function(error) {
    const errorStr = JSON.stringify(error);
    if (errorStr.includes("601051028565049")) {
        logger("Phát hiện có cảnh báo, bắt đầu vượt...", "< WARNING >");
        const userId = global.account.cookie.match(/c_user=(\d+)/);
        if (!userId || !userId[1]) {
            return;
        }
        let retryCount = 0;
        const maxRetries = 5;
        const waitForFbDtsg = async () => {
            while (!global.fb_dtsg && retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                retryCount++;
            }
            return global.fb_dtsg;
        };
        const fb_dtsg = await waitForFbDtsg();
        if (!fb_dtsg) {
            return;
        }            
        const formData = {
            'av': userId[1],
            '__user': userId[1],
            '__a': '1',
            '__req': 'a',
            '__hs': '20061.HYP:comet_pkg.2.1..2.1',
            'dpr': '1',
            '__ccg': 'EXCELLENT',
            '__rev': '1018618676',
            '__s': '8mi3v2:j83osx:54zn30',
            '__hsi': '7444677681348919953',
            '__dyn': '7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo19oe8hw2nVE4W099w8G1Dz81s8hwnU2lwv89k2C1Fwc60D8vwRwlE-U2zxe2GewbS361qw8Xwn82Lw5XwSyES1Mw9m0Lo6-1Fw4mwr86C0No7S3m1TwLwHwea',
            '__csr': 'hv4AltzuumXh9GxqiqUmKFosBEyhbzEPCBm2m1lxu2y6UmGfwiUeo0y60QEow8m0Oo4y0Po1CE3UwdO0uafw06wxw1em00w68',
            '__comet_req': '15',
            'fb_dtsg': global.fb_dtsg,
            'jazoest': '25337',
            'lsd': 'RZRQBZoJoKVYZsOHQnjJHA',
            '__spin_r': '1018618676',
            '__spin_b': 'trunk',
            '__spin_t': Math.floor(Date.now() / 1000),
            'fb_api_caller_class': 'RelayModern',
            'fb_api_req_friendly_name': 'FBScrapingWarningMutation',
            'variables': '{"input":{"client_mutation_id":"1","actor_id":"' + userId[1] + '","is_comet":true}}',
            'server_timestamps': 'true',
            'doc_id': '6339492849481770'
        };

        const headers = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'content-type': 'application/x-www-form-urlencoded',
            'cookie': global.account.cookie,
            'origin': 'https://www.facebook.com',
            'priority': 'u=1, i',
            'referer': 'https://www.facebook.com/checkpoint/601051028565049/?next=https%3A%2F%2Fwww.facebook.com%2F',
            'sec-ch-prefers-color-scheme': 'light',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-full-version-list': '"Google Chrome";v="131.0.6778.87", "Chromium";v="131.0.6778.87", "Not_A Brand";v="24.0.0.0"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"15.0.0"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'x-asbd-id': '129477',
            'x-fb-friendly-name': 'FBScrapingWarningMutation',
            'x-fb-lsd': formData.lsd
        };       
        try {
            const response = await axios({
                url: 'https://www.facebook.com/api/graphql/',
                method: 'POST',
                headers: headers,
                data: qs.stringify(formData),
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 303;
                }
            });

            if (response.status === 200 || response.status === 302) {
                if (response.data && response.data.errors) {
                    return false;
                }
                logger("Em đã vượt cảnh báo thành công", "[ SUCCESS ]");
                return true;
            }
            return false;
        } catch (bypassError) {
            logger("Lỗi khi vượt cảnh báo: " + bypassError.message, "[ ERROR ]");
            return false;
        }
    }
    return false;
};
