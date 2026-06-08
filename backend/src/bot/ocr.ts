import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

export const runOCR = async (buffer: Buffer): Promise<string> => {
  // Предобработка: увеличиваем разрешение, grayscale, нормализация контраста
  const processed = await sharp(buffer)
    .resize(1440, null, { withoutEnlargement: false, fit: 'inside' })
    .grayscale()
    .normalize()
    .jpeg({ quality: 90 })
    .toBuffer();

  const worker = await createWorker('rus+eng');
  const ret = await worker.recognize(processed);
  await worker.terminate();

  return ret.data.text;
};
