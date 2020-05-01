"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var got_1 = require("got");
var tough_cookie_1 = require("tough-cookie");
var tunnel = require('tunnel');
var parse = require('parse-headers');
var cookie = require('cookie');
var index_1 = require("../src/index");
// example helper function
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cookieJar, options, res, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cookieJar = new tough_cookie_1.CookieJar();
                    options = {
                        // use "url: to describe path
                        url: 'http://soap2day.is',
                        cookieJar: cookieJar,
                        // either disable retry or remove status code 503 from retries
                        retry: 0,
                        agent: {
                            https: tunnel.httpOverHttp({
                                proxy: {
                                    host: 'ip',
                                    port: 1256,
                                    // Basic authorization for proxy server if necessary
                                    proxyAuth: '',
                                    // Header fields for proxy server if necessary
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36'
                                    }
                                }
                            })
                        }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, got_1["default"].get(options)];
                case 2:
                    // success without cloudflare?
                    // const res = await cloudscraper({
                    //   method: 'GET',
                    //   url: 'https://rlsbb.ru/support-us',
                    // });
                    res = _a.sent();
                    return [2 /*return*/, res];
                case 3:
                    error_1 = _a.sent();
                    return [4 /*yield*/, index_1.catchCloudflare(error_1, options)];
                case 4:
                    // success with cloudflare?
                    res = _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, cookie.parse(parse(res.req._header).cookie)];
            }
        });
    });
}
main()
    .then(function (res) { return console.log(res); })["catch"](function (err) { return console.error('fail', err); });
