import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../lib/prisma';
import { format } from 'date-fns';
import { askAI, clearHistory } from './ai';

// Pending subcategory selection: chatId -> txId (with auto-expiry)
const pendingSubcat = new Map<string, string>();
const pendingSubcatTimers = new Map<string, ReturnType<typeof setTimeout>>();

const setPending = (chatId: string, txId: string) => {
  const existing = pendingSubcatTimers.get(chatId);
  if (existing) clearTimeout(existing);
  pendingSubcat.set(chatId, txId);
  pendingSubcatTimers.set(chatId, setTimeout(() => {
    pendingSubcat.delete(chatId);
    pendingSubcatTimers.delete(chatId);
  }, 5 * 60 * 1000)); // 5 минут
};

const clearPending = (chatId: string) => {
  const timer = pendingSubcatTimers.get(chatId);
  if (timer) clearTimeout(timer);
  pendingSubcat.delete(chatId);
  pendingSubcatTimers.delete(chatId);
};

// Parse date from word: "15.03" or "15.03.2026"
const parseDate = (word: string): string | null => {
  const m = word.match(/^(\d{1,2})\.(\d{2})(?:\.(\d{4}))?$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2];
  const year = m[3] || new Date().getFullYear().toString();
  const d = new Date(`${year}-${month}-${day}`);
  if (isNaN(d.getTime())) return null;
  return `${year}-${month}-${day}`;
};

// Fuzzy category match: exact → startsWith → includes (case-insensitive)
const fuzzyMatch = <T extends { name: string }>(items: T[], word: string): T | undefined => {
  const w = word.toLowerCase();
  return (
    items.find(i => i.name.toLowerCase() === w) ||
    items.find(i => i.name.toLowerCase().startsWith(w)) ||
    items.find(i => i.name.toLowerCase().includes(w))
  );
};

// Parse message: "[+/-]<amount> <words> [#tag1] [#tag2] [dd.mm[.yyyy]]"
const parseMessage = (text: string) => {
  const match = text.trim().match(/^([+-]?)(\d+(?:[.,]\d+)?)\s+(.+)$/s);
  if (!match) return null;

  const sign = match[1];
  const amount = parseFloat(match[2].replace(',', '.'));
  const rest = match[3].trim();

  const tags: string[] = [];
  const words: string[] = [];
  let date: string | null = null;

  rest.split(/\s+/).forEach(w => {
    if (w.startsWith('#') && w.length > 1) {
      tags.push(w.slice(1).toLowerCase());
    } else {
      const parsedDate = parseDate(w);
      if (parsedDate) date = parsedDate;
      else if (w.length > 0) words.push(w);
    }
  });

  const type = sign === '+' ? 'income' : 'expense';

  return { type, amount, words, tags, date };
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';

const computeBalance = (acc: {
  initialBalance: number;
  id: string;
  transactions: { type: string; amount: number; accountId: string }[];
  transfersTo: { amount: number }[];
}) => {
  let bal = acc.initialBalance;
  for (const tx of acc.transactions) {
    if (tx.type === 'income') bal += tx.amount;
    else if (tx.type === 'expense') bal -= tx.amount;
    else if (tx.type === 'transfer' && tx.accountId === acc.id) bal -= tx.amount;
  }
  for (const tx of acc.transfersTo) bal += tx.amount;
  return bal;
};

export const startBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const allowedIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const bot = new Bot(token);

  // Auth middleware
  bot.use(async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    if (!allowedIds.includes(chatId)) {
      await ctx.reply('⛔ Доступ запрещён.');
      return;
    }
    return next();
  });

  bot.command('start', async ctx => {
    await ctx.reply(
      `👋 *FinTrack Bot*\n\nДобавляй транзакции текстом:\n\n` +
      `\`500 Еда\` → Расход 500 ₽, кат. Еда\n` +
      `\`+28000 Зарплата\` → Доход 28000 ₽\n` +
      `\`-1500 ЖКХ Альфа\` → Расход, счёт Альфа\n` +
      `\`500 Кафе #кофе\` → с тегом #кофе\n\n` +
      `*Команды:*\n` +
      `/balance — балансы счетов\n` +
      `/last — последние 5 операций\n` +
      `/categories — список категорий\n` +
      `/analyze — анализ финансов от ИИ\n` +
      `/reset — сбросить диалог с аналитиком\n\n` +
      `*ИИ-аналитик:*\n` +
      `Начни сообщение с \`?\` — задай любой вопрос\n` +
      `\`? сколько я потратил на еду за месяц?\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('balance', async ctx => {
    try {
      const accounts = await prisma.account.findMany({
        where: { isArchived: false },
        include: {
          transactions: { select: { type: true, amount: true, accountId: true } },
          transfersTo: { select: { amount: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (accounts.length === 0) { await ctx.reply('Нет счетов.'); return; }

      const lines = accounts.map(a => {
        const bal = computeBalance(a);
        return `• *${a.name}* (${a.type}): ${fmt(bal)}`;
      });
      const total = accounts.reduce((s, a) => s + computeBalance(a), 0);
      lines.push(`\n💰 *Итого: ${fmt(total)}*`);

      await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Bot /balance error:', e);
      await ctx.reply('❌ Ошибка при получении балансов.');
    }
  });

  bot.command('last', async ctx => {
    try {
      const txs = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          category: { select: { name: true } },
          account: { select: { name: true } },
          subcategory: { select: { name: true } },
        },
      });

      if (txs.length === 0) { await ctx.reply('Нет транзакций.'); return; }

      const lines = txs.map(tx => {
        const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '↔';
        const cat = tx.category?.name || '—';
        const sub = tx.subcategory ? ` › ${tx.subcategory.name}` : '';
        const dateStr = format(new Date(tx.date), 'dd.MM');
        return `${sign}${fmt(tx.amount)} · ${cat}${sub} · ${tx.account.name} · ${dateStr}`;
      });

      await ctx.reply(`*Последние операции:*\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Bot /last error:', e);
      await ctx.reply('❌ Ошибка при получении транзакций.');
    }
  });

  bot.command('categories', async ctx => {
    try {
      const cats = await prisma.category.findMany({
        where: { isArchived: false },
        include: { subcategories: { select: { name: true } } },
        orderBy: { order: 'asc' },
      });

      const formatCat = (c: typeof cats[0]) => {
        const subs = c.subcategories.length > 0
          ? ` _(${c.subcategories.map(s => s.name).join(', ')})_`
          : '';
        return `• ${c.name}${subs}`;
      };

      const income = cats.filter(c => c.type === 'income').map(formatCat).join('\n');
      const expense = cats.filter(c => c.type === 'expense').map(formatCat).join('\n');

      await ctx.reply(
        `*Категории доходов:*\n${income || '—'}\n\n*Категории расходов:*\n${expense || '—'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Bot /categories error:', e);
      await ctx.reply('❌ Ошибка при получении категорий.');
    }
  });

  // Subcategory selection via inline keyboard
  bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data;
    const chatId = String(ctx.chat?.id);

    if (data === 'sub_skip') {
      clearPending(chatId);
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      return;
    }

    if (data.startsWith('sub:')) {
      const subId = data.slice(4);
      const txId = pendingSubcat.get(chatId);

      if (!txId) {
        await ctx.answerCallbackQuery({ text: 'Операция устарела' });
        return;
      }

      const sub = await prisma.subcategory.findUnique({ where: { id: subId } });
      if (!sub) {
        await ctx.answerCallbackQuery({ text: 'Подкатегория не найдена' });
        return;
      }

      await prisma.transaction.update({
        where: { id: txId },
        data: { subcategoryId: subId },
      });

      clearPending(chatId);
      await ctx.answerCallbackQuery({ text: `✅ ${sub.name}` });
      await ctx.editMessageText(
        ctx.callbackQuery.message?.text?.replace('Выберите подкатегорию:', `Подкатегория: *${sub.name}*`) || '',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // AI: /analyze — quick financial snapshot with AI commentary
  bot.command('analyze', async ctx => {
    if (!process.env.GROQ_API_KEY) {
      await ctx.reply('❌ GROQ_API_KEY не задан.');
      return;
    }
    const msg = await ctx.reply('🤔 Анализирую...');
    try {
      const chatId = String(ctx.chat.id);
      const reply = await askAI(chatId, 'Сделай краткий анализ моих финансов за текущий месяц. Укажи на главные проблемы и дай 2–3 конкретных совета с учётом цели закрыть кредиты.');
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, reply);
    } catch (e) {
      console.error('Bot /analyze error:', e);
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, '❌ Ошибка при обращении к ИИ.');
    }
  });

  // AI: /reset — clear conversation history
  bot.command('reset', async ctx => {
    const chatId = String(ctx.chat.id);
    clearHistory(chatId);
    await ctx.reply('🔄 История диалога с аналитиком сброшена.');
  });

  // Text message → transaction or AI chat
  bot.on('message:text', async ctx => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    // If message starts with "?" or "ai " — route to AI
    const isAiQuery = text.startsWith('?') || text.toLowerCase().startsWith('аи ') || text.toLowerCase().startsWith('ai ');
    if (isAiQuery && process.env.GROQ_API_KEY) {
      const query = text.replace(/^(\?|аи |ai )/i, '').trim();
      if (!query) { await ctx.reply('Напиши вопрос после «?»'); return; }
      const typing = await ctx.reply('🤔 Думаю...');
      try {
        const chatId = String(ctx.chat.id);
        const reply = await askAI(chatId, query);
        await ctx.api.editMessageText(ctx.chat.id, typing.message_id, reply);
      } catch (e) {
        console.error('Bot AI error:', e);
        await ctx.api.editMessageText(ctx.chat.id, typing.message_id, '❌ Ошибка при обращении к ИИ.');
      }
      return;
    }

    try {
    const parsed = parseMessage(text);
    if (!parsed) {
      await ctx.reply(
        '❓ Не понял формат. Пример:\n`500 Еда` или `+28000 Зарплата`\nС датой: `500 Еда 15.03`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const { type, amount, words, tags, date: parsedDate } = parsed;

    // Find category by fuzzy match (first word): exact → startsWith → includes
    const allCats = await prisma.category.findMany({
      where: { isArchived: false },
      include: { subcategories: true },
    });
    const catWord = words[0];
    const category = catWord ? fuzzyMatch(allCats, catWord) : undefined;

    // Find account by fuzzy match (second word, if exists)
    const allAccounts = await prisma.account.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'asc' } });
    const accWord = words[1];
    const matchedAccount = accWord ? fuzzyMatch(allAccounts, accWord) : undefined;

    // Fall back to first account
    const account = matchedAccount || allAccounts[0];

    if (!account) {
      await ctx.reply('❌ Нет доступных счетов.');
      return;
    }

    // Build comment from remaining words (after category+account match)
    const commentWords = words.slice(category ? (matchedAccount ? 2 : 1) : 0);
    const comment = commentWords.length > 0 ? commentWords.join(' ') : undefined;

    const txDate = parsedDate || format(new Date(), 'yyyy-MM-dd');

    const tx = await prisma.transaction.create({
      data: {
        type,
        amount,
        categoryId: category?.id || null,
        accountId: account.id,
        date: new Date(txDate),
        comment: comment || null,
        tags: tags.length > 0 ? JSON.stringify(tags) : '[]',
      },
    });

    const typeLabel = type === 'income' ? '📈 Доход' : '📉 Расход';
    const catLabel = category ? category.name : '_(без категории)_';
    const tagsLabel = tags.length > 0 ? ` · #${tags.join(' #')}` : '';

    const confirmText =
      `✅ ${typeLabel} *${fmt(amount)}*\n` +
      `Категория: ${catLabel}\n` +
      `Счёт: ${account.name}${tagsLabel}`;

    // If category has subcategories — ask which one
    const subs = category?.subcategories ?? [];
    if (subs.length > 0) {
      const chatId = String(ctx.chat.id);
      setPending(chatId, tx.id);

      const keyboard = new InlineKeyboard();
      subs.forEach((s, i) => {
        keyboard.text(s.name, `sub:${s.id}`);
        // 2 buttons per row
        if (i % 2 === 1) keyboard.row();
      });
      keyboard.row().text('Пропустить', 'sub_skip');

      await ctx.reply(
        `${confirmText}\n\n📂 Выберите подкатегорию:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    } else {
      await ctx.reply(confirmText, { parse_mode: 'Markdown' });
    }
    } catch (e) {
      console.error('Bot message handler error:', e);
      await ctx.reply('❌ Произошла ошибка при сохранении транзакции. Попробуйте позже.');
    }
  });

  bot.start();
  console.log('Telegram bot started');
};
