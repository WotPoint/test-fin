import app from './app';
import { startBot } from './bot';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`FinTrack backend running on http://localhost:${PORT}`);
  if (process.env.TELEGRAM_BOT_TOKEN) {
    startBot();
  }
});
