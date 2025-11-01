const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');
const speakeasy = require('speakeasy');
const fs = require('fs');
const path = require('path');
const logger = require('./../../utils/log.js');

module.exports = class FacebookLogin {
  static async getTokenFromCredentials(username, password, twofactor = '0', _2fa = '0') {
    try {
      const form = {
        adid: uuidv4(),
        email: username,
        password: password,
        format: 'json',
        device_id: uuidv4(),
        cpl: 'true',
        family_device_id: uuidv4(),
        locale: 'en_US',
        client_country_code: 'US',
        credentials_type: 'device_based_login_password',
        generate_session_cookies: '1',
        generate_analytics_claim: '1',
        generate_machine_id: '1',
        currently_logged_in_userid: '0',
        irisSeqID: 1,
        try_num: "1",
        enroll_misauth: "false",
        meta_inf_fbmeta: "NO_FILE",
        source: 'login',
        machine_id: this._randomString(24),
        meta_inf_fbmeta: '',
        fb_api_req_friendly_name: 'authenticate',
        fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
        api_key: '882a8490361da98702bf97a021ddc14d',
        access_token: '350685531728|62f8ce9f74b12f84c123cc23437a4a32'
      };

      form.sig = this._encodeSig(this._sort(form));

      const options = {
        url: 'https://b-graph.facebook.com/auth/login',
        method: 'post',
        data: form,
        transformRequest: [(data) => querystring.stringify(data)],
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-fb-friendly-name': form.fb_api_req_friendly_name,
          'x-fb-http-engine': 'Liger',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        }
      };

      try {
        const response = await axios.request(options);
        const data = response.data;
        
        data.access_token_eaad6v7 = await this._convertToken(data.access_token);
        data.cookies = await this._convertCookie(data.session_cookies);
        data.session_cookies = data.session_cookies.map(e => ({
          key: e.name,
          value: e.value,
          domain: "facebook.com",
          path: e.path,
          hostOnly: false
        }));

        return {
          status: true,
          message: 'Lấy thông tin thành công!',
          data: data
        };
      } catch (error) {
        if (error.response?.data?.error?.code === 401) {
          return {
            status: false,
            message: error.response.data.error.message
          };
        }

        // Handle 2FA
        if (twofactor === '0' && (!_2fa || _2fa === "0")) {
          return {
            status: false,
            message: 'Vui lòng nhập xác thực 2fa'
          };
        }

        const errorData = error.response.data.error.error_data;
        try {
          const twoFactorCode = (_2fa !== "0") ? _2fa : 
            speakeasy.totp({
              secret: twofactor.replace(/\s+/g, '').toLowerCase(),
              encoding: 'base32'
            });

          form.twofactor_code = twoFactorCode;
          form.encrypted_msisdn = "";
          form.userid = errorData.uid;
          form.machine_id = errorData.machine_id;
          form.first_factor = errorData.login_first_factor;
          form.credentials_type = "two_factor";
          form.sig = this._encodeSig(this._sort(form));
          
          options.data = form;
          const response = await axios.request(options);
          const data = response.data;

          data.access_token_eaad6v7 = await this._convertToken(data.access_token);
          data.cookies = await this._convertCookie(data.session_cookies);
          data.session_cookies = data.session_cookies.map(e => ({
            key: e.name,
            value: e.value,
            domain: "facebook.com",
            path: e.path,
            hostOnly: false
          }));

          return {
            status: true,
            message: 'Lấy thông tin thành công!',
            data: data
          };

        } catch (e) {
          return {
            status: false,
            message: 'Mã xác thực 2 lớp khônh hợp lệ'
          };
        }
      }
    } catch (e) {
      return {
        status: false,
        message: 'Vui lòng kiểm tra lại tài khoản, mật khẩu'
      };
    }
  }

  static async _convertCookie(session) {
    return session.map(e => `${e.name}=${e.value}`).join('; ');
  }

  static async _convertToken(token) {
    try {
      const response = await axios.get(
        `https://api.facebook.com/method/auth.getSessionforApp?format=json&access_token=${token}&new_app_id=275254692598279`
      );
      return response.data.error ? undefined : response.data.access_token;
    } catch {
      return undefined;
    }
  }

  static _randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = chars.charAt(Math.floor(Math.random() * 26));
    for (let i = 1; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static _encodeSig(obj) {
    const str = Object.entries(obj)
      .map(([key, value]) => `${key}=${value}`)
      .join('');
    return crypto.createHash('md5')
      .update(str + '62f8ce9f74b12f84c123cc23437a4a32')
      .digest('hex');
  }

  static _sort(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {});
  }
}
