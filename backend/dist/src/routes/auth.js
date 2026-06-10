"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const LoginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
// POST /api/auth/login
router.post('/login', (req, res) => {
    const username = process.env.APP_USERNAME;
    const password = process.env.APP_PASSWORD;
    if (!username || !password) {
        res.status(500).json({ error: 'APP_USERNAME или APP_PASSWORD не заданы в переменных окружения' });
        return;
    }
    if (!auth_1.JWT_SECRET) {
        res.status(500).json({ error: 'JWT_SECRET не задан в переменных окружения' });
        return;
    }
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: 'Введите имя пользователя и пароль' });
        return;
    }
    const { username: reqUsername, password: reqPassword } = result.data;
    if (reqUsername !== username || reqPassword !== password) {
        res.status(401).json({ error: 'Неверный логин или пароль' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ username }, auth_1.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
});
exports.default = router;
