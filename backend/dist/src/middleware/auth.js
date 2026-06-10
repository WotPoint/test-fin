"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.JWT_SECRET = process.env.JWT_SECRET || '';
function authMiddleware(req, res, next) {
    if (!exports.JWT_SECRET) {
        res.status(500).json({ error: 'JWT_SECRET не задан в переменных окружения' });
        return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Требуется авторизация' });
        return;
    }
    const token = header.slice(7);
    try {
        jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        next();
    }
    catch {
        res.status(401).json({ error: 'Токен недействителен или истёк' });
    }
}
