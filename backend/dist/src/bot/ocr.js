"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOCR = void 0;
const tesseract_js_1 = require("tesseract.js");
const sharp_1 = __importDefault(require("sharp"));
const runOCR = async (buffer) => {
    // Предобработка: увеличиваем разрешение, grayscale, нормализация контраста
    const processed = await (0, sharp_1.default)(buffer)
        .resize(1440, null, { withoutEnlargement: false, fit: 'inside' })
        .grayscale()
        .normalize()
        .jpeg({ quality: 90 })
        .toBuffer();
    const worker = await (0, tesseract_js_1.createWorker)('rus+eng');
    const ret = await worker.recognize(processed);
    await worker.terminate();
    return ret.data.text;
};
exports.runOCR = runOCR;
