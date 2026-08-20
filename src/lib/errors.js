"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.AppError = void 0;
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(message, statusCode, details) {
        if (statusCode === void 0) { statusCode = 500; }
        if (details === void 0) { details = null; }
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.name = _this.constructor.name;
        _this.statusCode = statusCode;
        _this.details = details;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    AppError.from = function (err) {
        if (err instanceof AppError)
            return err;
        return new InternalServerError((err === null || err === void 0 ? void 0 : err.message) || 'Internal Server Error', err);
    };
    return AppError;
}(Error));
exports.AppError = AppError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, details) {
        if (details === void 0) { details = null; }
        return _super.call(this, message, 400, details) || this;
    }
    return ValidationError;
}(AppError));
exports.ValidationError = ValidationError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message, details) {
        if (message === void 0) { message = 'Unauthorized access. Session token required or expired.'; }
        if (details === void 0) { details = null; }
        return _super.call(this, message, 401, details) || this;
    }
    return UnauthorizedError;
}(AppError));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message, details) {
        if (message === void 0) { message = 'Access forbidden. Insufficient permissions.'; }
        if (details === void 0) { details = null; }
        return _super.call(this, message, 403, details) || this;
    }
    return ForbiddenError;
}(AppError));
exports.ForbiddenError = ForbiddenError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message, details) {
        if (message === void 0) { message = 'Resource not found.'; }
        if (details === void 0) { details = null; }
        return _super.call(this, message, 404, details) || this;
    }
    return NotFoundError;
}(AppError));
exports.NotFoundError = NotFoundError;
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message, details) {
        if (details === void 0) { details = null; }
        return _super.call(this, message, 409, details) || this;
    }
    return ConflictError;
}(AppError));
exports.ConflictError = ConflictError;
var InternalServerError = /** @class */ (function (_super) {
    __extends(InternalServerError, _super);
    function InternalServerError(message, details) {
        if (message === void 0) { message = 'Internal Server Error.'; }
        if (details === void 0) { details = null; }
        return _super.call(this, message, 500, details) || this;
    }
    return InternalServerError;
}(AppError));
exports.InternalServerError = InternalServerError;
