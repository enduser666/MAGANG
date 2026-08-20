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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
var api_response_1 = require("@/lib/api-response");
var AnalyticsService_1 = require("@/services/AnalyticsService");
var auth_1 = require("@/lib/auth");
var db_1 = require("@/db");
exports.GET = (0, auth_1.withAuth)(function (request, user) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, searchParams, requestedTableName, dbType, dbConfig, db, datasetMode, targetTable, columnMapping, unitColumn, datasetId, datasetName, rows, ds, service, _customWhere, clientUnitId, validatedUnitVal, uRows, data, d, pieMatches, barMatches, trendMatches, isConsistent, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                startTime = Date.now();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                searchParams = new URL(request.url).searchParams;
                requestedTableName = searchParams.get('tableName');
                dbType = request.headers.get('x-db-type') || 'sandbox';
                dbConfig = request.headers.get('x-db-config');
                db = (0, db_1.getDbClient)(dbType, dbConfig);
                datasetMode = 'LEGACY_RELATIONAL';
                targetTable = requestedTableName || 'lhp';
                columnMapping = null;
                unitColumn = 'unit_id';
                datasetId = null;
                datasetName = null;
                if (!db.pool) return [3 /*break*/, 3];
                return [4 /*yield*/, db.pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1')];
            case 2:
                rows = (_a.sent())[0];
                if (rows.length > 0) {
                    ds = rows[0];
                    datasetId = ds.id;
                    datasetName = ds.dataset_name;
                    datasetMode = ds.dataset_mode;
                    targetTable = ds.table_name || targetTable;
                    columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
                    if (datasetMode === 'DYNAMIC_FLAT_TABLE' && columnMapping && columnMapping.unit) {
                        unitColumn = columnMapping.unit.column;
                    }
                }
                _a.label = 3;
            case 3:
                service = new AnalyticsService_1.AnalyticsService(dbType, dbConfig);
                _customWhere = undefined;
                if (!(user.accessScope === 'OWN_UNIT' && user.unitId)) return [3 /*break*/, 4];
                if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
                    _customWhere = { sql: "`".concat(unitColumn, "` = ?"), values: [user.unitKode] };
                }
                else {
                    if (targetTable === 'lhp') {
                        _customWhere = { sql: 'unit_id = ?', values: [user.unitId] };
                    }
                    else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
                        _customWhere = { sql: 'id_lhp IN (SELECT id FROM lhp WHERE unit_id = ?)', values: [user.unitId] };
                    }
                    else if (targetTable === 'rekomendasi') {
                        _customWhere = { sql: 'id_temuan IN (SELECT t.id FROM temuan t JOIN lhp l ON t.id_lhp = l.id WHERE l.unit_id = ?)', values: [user.unitId] };
                    }
                }
                return [3 /*break*/, 7];
            case 4:
                if (!(user.accessScope === 'ALL_UNITS')) return [3 /*break*/, 7];
                clientUnitId = searchParams.get('unit_id');
                if (!(clientUnitId && clientUnitId !== 'all')) return [3 /*break*/, 7];
                validatedUnitVal = clientUnitId;
                if (!db.pool) return [3 /*break*/, 6];
                return [4 /*yield*/, db.pool.query('SELECT id, kode_unit FROM sys_units WHERE id = ? OR kode_unit = ? LIMIT 1', [clientUnitId, clientUnitId])];
            case 5:
                uRows = (_a.sent())[0];
                if (uRows.length > 0) {
                    if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
                        validatedUnitVal = uRows[0].kode_unit;
                    }
                    else {
                        validatedUnitVal = uRows[0].id;
                    }
                }
                _a.label = 6;
            case 6:
                if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
                    _customWhere = { sql: "`".concat(unitColumn, "` = ?"), values: [validatedUnitVal] };
                }
                else {
                    if (targetTable === 'lhp') {
                        _customWhere = { sql: 'unit_id = ?', values: [validatedUnitVal] };
                    }
                    else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
                        _customWhere = { sql: 'id_lhp IN (SELECT id FROM lhp WHERE unit_id = ?)', values: [validatedUnitVal] };
                    }
                    else if (targetTable === 'rekomendasi') {
                        _customWhere = { sql: 'id_temuan IN (SELECT t.id FROM temuan t JOIN lhp l ON t.id_lhp = l.id WHERE l.unit_id = ?)', values: [validatedUnitVal] };
                    }
                }
                _a.label = 7;
            case 7: return [4 /*yield*/, service.getDashboardAnalytics(targetTable, _customWhere, datasetMode, columnMapping)];
            case 8:
                data = _a.sent();
                if (db.pool && datasetId && data.diagnosticLogs) {
                    d = data.diagnosticLogs;
                    pieMatches = d.pieTotal === d.distinctFinding;
                    barMatches = d.barTotal === d.distinctFinding;
                    trendMatches = d.trendTotal === d.distinctFinding;
                    isConsistent = pieMatches && barMatches && trendMatches;
                    console.log('==============================');
                    console.log('Logging Sementara (Analytics)');
                    console.log('==============================');
                    console.log('Endpoint:', request.url);
                    console.log('Dataset:', datasetName || datasetId);
                    console.log('Mode:', datasetMode);
                    console.log('Table:', targetTable);
                    console.log('Column Mapping Keys:', columnMapping ? Object.keys(columnMapping) : 'None');
                    console.log('SQL Check:', _customWhere ? _customWhere.sql : 'None');
                    console.log('Rows:', d.rawRows);
                    console.log('Execution Time:', "".concat(Date.now() - startTime, "ms"));
                    console.log('');
                    console.log('--- Chart Verification ---');
                    console.log('Entity Dashboard: TEMUAN');
                    console.log('Executive Overview :', d.distinctFinding);
                    console.log('Pie Chart :', d.pieTotal);
                    console.log('Bar Chart :', d.barTotal);
                    console.log('Trend :', d.trendTotal);
                    if (isConsistent) {
                        console.log('CONSISTENCY CHECK: PASS');
                    }
                    else {
                        console.log('CONSISTENCY CHECK: FAIL');
                    }
                    console.log('==============================');
                }
                return [2 /*return*/, api_response_1.ApiResponse.success(data, 'Dashboard analytics data fetched successfully')];
            case 9:
                error_1 = _a.sent();
                return [2 /*return*/, api_response_1.ApiResponse.error(error_1.message || 'Gagal mengambil data analitik.', error_1, 500)];
            case 10: return [2 /*return*/];
        }
    });
}); });
