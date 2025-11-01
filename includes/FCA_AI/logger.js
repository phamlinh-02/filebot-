'use strict';
/* eslint-disable linebreak-style */

const chalk = require('chalk');
var isHexcolor = require('is-hexcolor');

// Hàm chuyển đổi màu hex sang RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Hàm tạo gradient giữa hai màu
function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return '#000000';

    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
    
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Mảng màu cho gradient
const gradientColors = [
    '#FF0000', // Đỏ
    '#FF00FF', // Hồng
    '#0000FF', // Xanh dương
    '#00FFFF', // Xanh cyan
    '#00FF00'  // Xanh lá
];

function createGradientText(text, startColor, endColor) {
    const chars = text.split('');
    const gradient = chars.map((char, i) => {
        const factor = i / (chars.length - 1);
        const color = interpolateColor(startColor, endColor, factor);
        return chalk.hex(color)(char);
    });
    return gradient.join('');
}

function createMultiGradientText(text) {
    const chars = text.split('');
    const totalColors = gradientColors.length;
    const charsPerSection = Math.ceil(chars.length / (totalColors - 1));
    
    return chars.map((char, i) => {
        const section = Math.floor(i / charsPerSection);
        const colorIndex = Math.min(section, totalColors - 2);
        const factor = (i % charsPerSection) / charsPerSection;
        const color = interpolateColor(
            gradientColors[colorIndex],
            gradientColors[colorIndex + 1],
            factor
        );
        return chalk.hex(color)(char);
    }).join('');
}

var getText = function(/** @type {string[]} */ ...Data) {
    var Main = (Data.splice(0,1)).toString();
    for (let i = 0; i < Data.length; i++) Main = Main.replace(RegExp(`%${i + 1}`, 'g'), Data[i]);
    return Main;
};

/**
 * @param {any} obj
 */
function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

module.exports = {
    Normal: function(/** @type {string} */ Str, /** @type {() => any} */ Data, /** @type {() => void} */ Callback) {
        if (isHexcolor(global.Fca.Require.FastConfig.MainColor) != true) {
            this.Warning(getText(global.Fca.Require.Language.Index.InvaildMainColor, global.Fca.Require.FastConfig.MainColor), process.exit(0));
        }
        else {
            const prefix = chalk.hex(global.Fca.Require.FastConfig.MainColor).bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `);
            const gradientMessage = createMultiGradientText(Str);
            console.log(prefix + gradientMessage);
        }
        if (getType(Data) == 'Function' || getType(Data) == 'AsyncFunction') {
            return Data();
        }
        if (Data) {
            return Data;
        }
        if (getType(Callback) == 'Function' || getType(Callback) == 'AsyncFunction') {
            Callback();
        }
        else return Callback;
    },
    Warning: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
        const gradientMessage = createGradientText(String(str), '#FFD700', '#FFA500'); // Gradient từ vàng sang cam
        console.log(chalk.magenta.bold('[ FCA-WARNING ] > ') + gradientMessage);
        if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
            callback();
        }
        else return callback;
    },
    Error: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
        if (!str) {
            console.log(chalk.magenta.bold('[ FCA-ERROR ] > ') + createGradientText("Already Faulty, Please Contact: Facebook.com/Lazic.Kanzu", '#FF0000', '#8B0000'));
        }
        const gradientMessage = createGradientText(String(str), '#FF0000', '#8B0000'); // Gradient từ đỏ sáng sang đỏ đậm
        console.log(chalk.magenta.bold('[ FCA-ERROR ] > ') + gradientMessage);
        if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
            callback();
        }
        else return callback;
    },
    Success: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
        const gradientMessage = createGradientText(String(str), '#00FF00', '#006400'); // Gradient từ xanh lá sáng sang xanh lá đậm
        console.log(chalk.hex('#9900FF').bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `) + gradientMessage);
        if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
            callback();
        }
        else return callback;
    },
    Info: function(/** @type {unknown} */ str, /** @type {() => void} */ callback) {
        const gradientMessage = createGradientText(String(str), '#00BFFF', '#0000FF'); // Gradient từ xanh dương nhạt sang xanh dương đậm
        console.log(chalk.hex('#9900FF').bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `) + gradientMessage);
        if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
            callback();
        }
        else return callback;
    }
};