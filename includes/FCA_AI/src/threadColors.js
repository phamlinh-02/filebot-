"use strict";

module.exports = function (_defaultFuncs, _api, _ctx) {
    return JSON.parse(require('fs').readFileSync(__dirname + '/data/color.json'), 'utf8')
  };