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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.Logger = exports.requestContextStorage = void 0;
exports.withRequestContext = withRequestContext;
var node_async_hooks_1 = require("node:async_hooks");
var crypto_1 = __importDefault(require("crypto"));
var server_1 = require("next/server");
var errors_1 = require("./errors");
exports.requestContextStorage = new node_async_hooks_1.AsyncLocalStorage();
var Logger = /** @class */ (function () {
    function Logger() {
    }
    Logger.getContext = function () {
        return exports.requestContextStorage.getStore();
    };
    Logger.formatLog = function (level, message, meta) {
        if (meta === void 0) { meta = null; }
        var store = this.getContext();
        var payload = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            requestId: (store === null || store === void 0 ? void 0 : store.requestId) || 'N/A',
            endpoint: (store === null || store === void 0 ? void 0 : store.endpoint) || 'N/A',
            userId: (store === null || store === void 0 ? void 0 : store.userId) || 'anonymous',
            executionTimeMs: store ? Date.now() - store.startTime : 0
        };
        if (meta) {
            if (meta instanceof Error) {
                payload.error = {
                    message: meta.message,
                    stack: meta.stack,
                    name: meta.name
                };
            }
            else {
                payload.meta = meta;
            }
        }
        return JSON.stringify(payload);
    };
    Logger.info = function (message, meta) {
        if (meta === void 0) { meta = null; }
        console.log(this.formatLog('INFO', message, meta));
    };
    Logger.warn = function (message, meta) {
        if (meta === void 0) { meta = null; }
        console.warn(this.formatLog('WARN', message, meta));
    };
    Logger.error = function (message, meta, error) {
        if (meta === void 0) { meta = null; }
        if (error === void 0) { error = null; }
        console.error(this.formatLog('ERROR', message, error || meta));
    };
    Logger.audit = function (action, details, user, status) {
        if (status === void 0) { status = 'SUCCESS'; }
        console.log(this.formatLog('AUDIT', "".concat(action, ": ").concat(details), { action: action, details: details, user: user, status: status }));
    };
    return Logger;
}());
exports.Logger = Logger;
var MetricsCollector = /** @class */ (function () {
    function MetricsCollector() {
        this.totalRequests = 0;
        this.totalDuration = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.startTime = Date.now();
    }
    MetricsCollector.prototype.recordRequest = function (duration) {
        this.totalRequests++;
        this.totalDuration += duration;
    };
    MetricsCollector.prototype.recordCacheHit = function () {
        this.cacheHits++;
    };
    MetricsCollector.prototype.recordCacheMiss = function () {
        this.cacheMisses++;
    };
    MetricsCollector.prototype.getMetrics = function () {
        return {
            totalRequests: this.totalRequests,
            averageRequestDurationMs: this.totalRequests > 0 ? this.totalDuration / this.totalRequests : 0,
            cacheHitCount: this.cacheHits,
            cacheMissCount: this.cacheMisses,
            memoryUsage: process.memoryUsage(),
            uptimeSeconds: (Date.now() - this.startTime) / 1000,
            timestamp: new Date().toISOString()
        };
    };
    return MetricsCollector;
}());
exports.metricsCollector = new MetricsCollector();
function withRequestContext(handler) {
    var _this = this;
    return function (request) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var startTime, clientRequestId, requestId, url, context;
            var _this = this;
            return __generator(this, function (_a) {
                startTime = Date.now();
                clientRequestId = request.headers.get('x-request-id');
                requestId = clientRequestId || crypto_1.default.randomUUID();
                url = new URL(request.url);
                context = {
                    requestId: requestId,
                    startTime: startTime,
                    endpoint: url.pathname
                };
                return [2 /*return*/, exports.requestContextStorage.run(context, function () { return __awaiter(_this, void 0, void 0, function () {
                        var response, duration, err_1, duration, appErr, errorString, res;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, handler.apply(void 0, __spreadArray([request], args, false))];
                                case 1:
                                    response = _a.sent();
                                    duration = Date.now() - startTime;
                                    exports.metricsCollector.recordRequest(duration);
                                    Logger.info("Request completed: ".concat(request.method, " ").concat(url.pathname, " (").concat(response.status, ")"), {
                                        method: request.method,
                                        status: response.status,
                                        durationMs: duration
                                    });
                                    response.headers.set('x-request-id', requestId);
                                    return [2 /*return*/, response];
                                case 2:
                                    err_1 = _a.sent();
                                    duration = Date.now() - startTime;
                                    exports.metricsCollector.recordRequest(duration);
                                    appErr = errors_1.AppError.from(err_1);
                                    Logger.error("Request failed: ".concat(request.method, " ").concat(url.pathname, " (").concat(appErr.statusCode, ")"), appErr);
                                    errorString = appErr instanceof Error ? appErr.message : String(appErr);
                                    res = server_1.NextResponse.json({
                                        success: false,
                                        data: null,
                                        message: appErr.message,
                                        error: errorString,
                                        meta: {
                                            timestamp: new Date().toISOString(),
                                            requestId: requestId
                                        }
                                    }, { status: appErr.statusCode });
                                    res.headers.set('x-request-id', requestId);
                                    return [2 /*return*/, res];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
}
