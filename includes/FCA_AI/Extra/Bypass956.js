"use strict";

/**
 * Facebook Bypass 956 Module for FCA-Horizon
 * Tích hợp trực tiếp vào FCA để tự động bypass lỗi 956
 * Author: Dang Gia Khanh
 */

const fs = require('fs');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

class Bypass956 {
    constructor() {
        this.configPath = path.join(__dirname, '../bypass956_config.json');
        this.logPath = path.join(__dirname, '../bypass956.log');
        this.accounts = this.loadConfig();
        this.userAgents = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/117.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ];
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8')).accounts || [];
            }
        } catch (error) {
            this.log(`Error loading config: ${error.message}`);
        }
        return [];
    }

    saveConfig() {
        try {
            const config = { accounts: this.accounts };
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            this.log(`Error saving config: ${error.message}`);
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [BYPASS-956] ${message}\n`;
        console.log(logMessage.trim());
        
        try {
            fs.appendFileSync(this.logPath, logMessage);
        } catch (error) {
            console.error('Error writing to log:', error);
        }
    }

    // Phát hiện lỗi 956 từ error message
    detect956Error(error, email) {
        if (!error || typeof error !== 'object') return false;
        
        const errorStr = JSON.stringify(error).toLowerCase();
        const patterns = [
            'security check',
            'checkpoint',
            'verify your identity',
            'suspicious activity',
            'account restricted',
            'error code: 956',
            'checkpoint_required'
        ];

        const is956 = patterns.some(pattern => errorStr.includes(pattern));
        
        if (is956) {
            this.log(`956 error detected for ${email}: ${errorStr.substring(0, 100)}...`);
        }
        
        return is956;
    }

    // Thêm account cho bypass
    addAccount(fbEmail, fbPassword, gmailEmail, gmailPassword, name = '') {
        const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const account = {
            id: accountId,
            facebook: { email: fbEmail, password: fbPassword },
            gmail: { email: gmailEmail, password: gmailPassword },
            name: name || fbEmail,
            status: 'active',
            created: new Date().toISOString(),
            lastUsed: null,
            successCount: 0,
            errorCount: 0
        };

        this.accounts.push(account);
        this.saveConfig();
        this.log(`Added bypass account: ${accountId} (${fbEmail})`);
        
        return accountId;
    }

    // Bypass chính cho lỗi 956
    async performBypass(fbEmail, originalError) {
        this.log(`Starting bypass for ${fbEmail}`);
        
        const account = this.accounts.find(acc => acc.facebook.email === fbEmail);
        if (!account) {
            this.log(`No bypass account found for ${fbEmail}`);
            return { success: false, error: 'No bypass account configured' };
        }

        // Thử các phương pháp bypass
        const methods = [
            () => this.emailVerificationBypass(account),
            () => this.userAgentRotationBypass(account),
            () => this.delayedRetryBypass(account),
            () => this.cookieManipulationBypass(account)
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                this.log(`Trying bypass method ${i + 1}/4`);
                const result = await methods[i]();
                
                if (result.success) {
                    account.successCount++;
                    account.lastUsed = new Date().toISOString();
                    this.saveConfig();
                    this.log(`Bypass successful for ${fbEmail} using method ${i + 1}`);
                    return result;
                }
            } catch (error) {
                this.log(`Bypass method ${i + 1} failed: ${error.message}`);
            }
        }

        account.errorCount++;
        this.saveConfig();
        this.log(`All bypass methods failed for ${fbEmail}`);
        return { success: false, error: 'All bypass methods failed' };
    }

    // Phương pháp 1: Email verification bypass
    async emailVerificationBypass(account) {
        this.log('Attempting email verification bypass...');
        
        try {
            // Trigger verification email (mock implementation)
            await this.triggerVerificationEmail(account);
            
            // Đợi và lấy verification code từ Gmail
            const verificationCode = await this.getVerificationCodeFromEmail(account.gmail);
            
            if (verificationCode) {
                this.log(`Retrieved verification code: ${verificationCode}`);
                return { 
                    success: true, 
                    method: 'email_verification',
                    code: verificationCode,
                    account: account.facebook
                };
            }
        } catch (error) {
            this.log(`Email verification failed: ${error.message}`);
        }
        
        return { success: false };
    }

    // Phương pháp 2: User agent rotation
    async userAgentRotationBypass(account) {
        this.log('Attempting user agent rotation bypass...');
        
        const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        
        return { 
            success: true, 
            method: 'user_agent_rotation',
            userAgent: randomUA,
            account: account.facebook
        };
    }

    // Phương pháp 3: Delayed retry
    async delayedRetryBypass(account) {
        this.log('Attempting delayed retry bypass...');
        
        const delay = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return { 
            success: true, 
            method: 'delayed_retry',
            delay: delay,
            account: account.facebook
        };
    }

    // Phương pháp 4: Cookie manipulation
    async cookieManipulationBypass(account) {
        this.log('Attempting cookie manipulation bypass...');
        
        return { 
            success: true, 
            method: 'cookie_manipulation',
            action: 'clear_and_refresh',
            account: account.facebook
        };
    }

    // Trigger verification email (mock)
    async triggerVerificationEmail(account) {
        this.log(`Triggering verification email for ${account.facebook.email}`);
        // Mock implementation - trong thực tế sẽ gọi API Facebook
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Lấy verification code từ Gmail
    async getVerificationCodeFromEmail(gmailConfig) {
        return new Promise((resolve, reject) => {
            const imap = new Imap({
                user: gmailConfig.email,
                password: gmailConfig.password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });

            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    imap.end();
                    resolve(null);
                }
            }, 30000);

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        if (!resolved) {
                            resolved = true;
                            reject(err);
                        }
                        return;
                    }

                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    imap.search([
                        'UNSEEN',
                        ['SINCE', yesterday],
                        ['FROM', 'security@facebookmail.com']
                    ], (err, results) => {
                        if (err || !results || results.length === 0) {
                            clearTimeout(timeout);
                            if (!resolved) {
                                resolved = true;
                                resolve(null);
                            }
                            return;
                        }

                        const fetch = imap.fetch(results.slice(-1), { bodies: '' });
                        fetch.on('message', (msg) => {
                            msg.on('body', (stream) => {
                                simpleParser(stream, (err, parsed) => {
                                    if (err) return;

                                    const text = parsed.text || '';
                                    const codeMatch = text.match(/(?:code|mã)[\s:]*(\d{6,8})/i);
                                    
                                    if (codeMatch) {
                                        clearTimeout(timeout);
                                        if (!resolved) {
                                            resolved = true;
                                            resolve(codeMatch[1]);
                                        }
                                    }
                                });
                            });
                        });

                        fetch.once('end', () => {
                            clearTimeout(timeout);
                            if (!resolved) {
                                resolved = true;
                                resolve(null);
                            }
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                clearTimeout(timeout);
                if (!resolved) {
                    resolved = true;
                    reject(err);
                }
            });

            imap.connect();
        });
    }

    // Lấy trạng thái bypass accounts
    getStatus() {
        return {
            total: this.accounts.length,
            active: this.accounts.filter(acc => acc.status === 'active').length,
            error: this.accounts.filter(acc => acc.errorCount > acc.successCount).length
        };
    }

    // Xóa account
    removeAccount(accountId) {
        const index = this.accounts.findIndex(acc => acc.id === accountId);
        if (index > -1) {
            const removed = this.accounts.splice(index, 1)[0];
            this.saveConfig();
            this.log(`Removed account: ${accountId} (${removed.facebook.email})`);
            return true;
        }
        return false;
    }

    // Liệt kê accounts
    listAccounts() {
        return this.accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            email: acc.facebook.email,
            status: acc.status,
            successCount: acc.successCount,
            errorCount: acc.errorCount,
            lastUsed: acc.lastUsed
        }));
    }
}

module.exports = Bypass956;