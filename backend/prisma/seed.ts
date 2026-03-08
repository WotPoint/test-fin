import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const today = new Date();

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function subMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.goalContribution.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();

  // Categories
  const categories = [
    { id: 'cat-transport',  name: 'Транспорт',       type: 'expense', color: '#3b82f6', icon: 'Car',         isDefault: true, isArchived: false, order: 0 },
    { id: 'cat-food',       name: 'Еда',              type: 'expense', color: '#f59e0b', icon: 'Utensils',    isDefault: true, isArchived: false, order: 1 },
    { id: 'cat-digital',    name: 'Цифровые услуги',  type: 'expense', color: '#8b5cf6', icon: 'Wifi',        isDefault: true, isArchived: false, order: 2 },
    { id: 'cat-health',     name: 'Здоровье',         type: 'expense', color: '#ef4444', icon: 'Heart',       isDefault: true, isArchived: false, order: 3 },
    { id: 'cat-beauty',     name: 'Красота',          type: 'expense', color: '#ec4899', icon: 'Sparkles',    isDefault: true, isArchived: false, order: 4 },
    { id: 'cat-credit',     name: 'Кредиты',          type: 'expense', color: '#dc2626', icon: 'Landmark',    isDefault: true, isArchived: false, order: 5 },
    { id: 'cat-housing',    name: 'Квартира',         type: 'expense', color: '#06b6d4', icon: 'Home',        isDefault: true, isArchived: false, order: 6 },
    { id: 'cat-entertain',  name: 'Развлечения',      type: 'expense', color: '#a855f7', icon: 'Gamepad2',    isDefault: true, isArchived: false, order: 7 },
    { id: 'cat-travel',     name: 'Путешествия',      type: 'expense', color: '#0ea5e9', icon: 'Plane',       isDefault: true, isArchived: false, order: 8 },
    { id: 'cat-home',       name: 'Быт',              type: 'expense', color: '#84cc16', icon: 'ShoppingBag', isDefault: true, isArchived: false, order: 9 },
    { id: 'cat-clothing',   name: 'Одежда',           type: 'expense', color: '#f97316', icon: 'Shirt',       isDefault: true, isArchived: false, order: 10 },
    { id: 'cat-gifts',      name: 'Подарки',          type: 'expense', color: '#fb923c', icon: 'Gift',        isDefault: true, isArchived: false, order: 11 },
    { id: 'cat-small',      name: 'Мелкие расходы',  type: 'expense', color: '#6b7280', icon: 'Coins',       isDefault: true, isArchived: false, order: 12 },
    { id: 'cat-education',  name: 'Образование',      type: 'expense', color: '#10b981', icon: 'BookOpen',    isDefault: true, isArchived: false, order: 13 },
    { id: 'cat-cigarettes', name: 'Сигареты',         type: 'expense', color: '#78716c', icon: 'Wind',        isDefault: true, isArchived: false, order: 14 },
    { id: 'cat-cat',        name: 'Кот',              type: 'expense', color: '#f472b6', icon: 'PawPrint',    isDefault: true, isArchived: false, order: 15 },
    { id: 'cat-salary',     name: 'Зарплата',         type: 'income',  color: '#22c55e', icon: 'Briefcase',   isDefault: true, isArchived: false, order: 16 },
    { id: 'cat-freelance',  name: 'Фриланс',          type: 'income',  color: '#34d399', icon: 'Laptop',      isDefault: true, isArchived: false, order: 17 },
    { id: 'cat-investment', name: 'Инвестиции',       type: 'income',  color: '#a3e635', icon: 'TrendingUp',  isDefault: true, isArchived: false, order: 18 },
    { id: 'cat-gift-inc',   name: 'Подарки',          type: 'income',  color: '#fb923c', icon: 'Gift',        isDefault: true, isArchived: false, order: 19 },
    { id: 'cat-other-inc',  name: 'Другое',           type: 'income',  color: '#94a3b8', icon: 'Plus',        isDefault: true, isArchived: false, order: 20 },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  console.log('Categories created');

  // Subcategories
  await prisma.subcategory.createMany({
    data: [
      { id: 'sub-taxi',      name: 'Такси',           categoryId: 'cat-transport' },
      { id: 'sub-public',    name: 'Общественный',    categoryId: 'cat-transport' },
      { id: 'sub-cafe',      name: 'Кафе',            categoryId: 'cat-food' },
      { id: 'sub-grocery',   name: 'Продукты',        categoryId: 'cat-food' },
      { id: 'sub-work-food', name: 'Рабочая еда',     categoryId: 'cat-food' },
      { id: 'sub-subs',      name: 'Подписки',        categoryId: 'cat-digital' },
      { id: 'sub-phone',     name: 'Телефон',         categoryId: 'cat-digital' },
      { id: 'sub-internet',  name: 'Интернет',        categoryId: 'cat-digital' },
      { id: 'sub-utilities', name: 'ЖКХ',             categoryId: 'cat-housing' },
      { id: 'sub-rent',      name: 'Аренда',          categoryId: 'cat-housing' },
    ],
  });
  console.log('Subcategories created');

  // Accounts
  await prisma.account.createMany({
    data: [
      { id: 'acc-cash',    name: 'Наличные',        type: 'cash',    currency: 'RUB', initialBalance: 15000,  color: '#f59e0b', icon: 'Banknote',   isArchived: false },
      { id: 'acc-card',    name: 'Дебетовая карта', type: 'card',    currency: 'RUB', initialBalance: 85000,  color: '#3b82f6', icon: 'CreditCard', isArchived: false },
      { id: 'acc-savings', name: 'Накопительный',   type: 'savings', currency: 'RUB', initialBalance: 200000, color: '#10b981', icon: 'PiggyBank',  isArchived: false },
    ],
  });
  console.log('Accounts created');

  // Transactions
  const genTx = (days: number, type: string, amount: number, categoryId: string, accountId: string, comment?: string, subcategoryId?: string) => ({
    id: uuidv4(),
    type,
    amount,
    categoryId,
    subcategoryId: subcategoryId || null,
    accountId,
    toAccountId: null,
    date: subDays(today, days),
    comment: comment || null,
    tags: '[]',
    recurringId: null,
  });

  const transactions = [
    genTx(0,  'income',  95000, 'cat-salary',    'acc-card',  'Зарплата за февраль'),
    genTx(1,  'expense',  3200, 'cat-food',       'acc-card',  'Пятёрочка',         'sub-grocery'),
    genTx(2,  'expense',   850, 'cat-transport',  'acc-card',  'Яндекс Такси',      'sub-taxi'),
    genTx(3,  'expense', 12000, 'cat-housing',    'acc-card',  'Аренда квартиры',   'sub-rent'),
    genTx(4,  'expense',  1500, 'cat-digital',    'acc-card',  'Netflix, Spotify',  'sub-subs'),
    genTx(5,  'expense',  2800, 'cat-food',       'acc-cash',  'Обед в кафе',       'sub-cafe'),
    genTx(6,  'expense',  4500, 'cat-health',     'acc-card',  'Стоматолог'),
    genTx(7,  'income',  15000, 'cat-freelance',  'acc-card',  'Проект верстки'),
    genTx(8,  'expense',   890, 'cat-transport',  'acc-card',  'Метро на месяц',    'sub-public'),
    genTx(9,  'expense',  6700, 'cat-food',       'acc-card',  'ВкусВилл',          'sub-grocery'),
    genTx(10, 'expense',  3200, 'cat-clothing',   'acc-card',  'Джинсы Zara'),
    genTx(11, 'expense',  1200, 'cat-entertain',  'acc-cash',  'Кино'),
    genTx(12, 'expense',  2400, 'cat-food',       'acc-card',  'Рабочий обед',      'sub-work-food'),
    genTx(13, 'expense',   600, 'cat-digital',    'acc-card',  'Телефон МТС',       'sub-phone'),
    genTx(14, 'expense',  5800, 'cat-housing',    'acc-card',  'ЖКХ',               'sub-utilities'),
    genTx(15, 'expense',  1800, 'cat-health',     'acc-card',  'Аптека'),
    genTx(16, 'income',   3500, 'cat-gift-inc',   'acc-cash',  'Подарок на ДР'),
    genTx(17, 'expense',  2400, 'cat-beauty',     'acc-card',  'Парикмахерская'),
    genTx(18, 'expense',  4200, 'cat-food',       'acc-card',  'Перекрёсток',       'sub-grocery'),
    genTx(19, 'expense',   350, 'cat-transport',  'acc-cash',  'Автобус',           'sub-public'),
    genTx(20, 'expense',  8900, 'cat-education',  'acc-card',  'Курс по React'),
    genTx(21, 'expense',   450, 'cat-cigarettes', 'acc-cash',  'Сигареты'),
    genTx(22, 'expense',  1200, 'cat-cat',        'acc-card',  'Корм и лоток'),
    genTx(23, 'expense',   700, 'cat-home',       'acc-cash',  'Моющие средства'),
    genTx(24, 'expense',   980, 'cat-small',      'acc-cash',  'Мелочи'),
    genTx(35, 'income',  95000, 'cat-salary',     'acc-card',  'Зарплата за январь'),
    genTx(36, 'expense',  2900, 'cat-food',       'acc-card',  'Магнит',            'sub-grocery'),
    genTx(37, 'expense', 12000, 'cat-housing',    'acc-card',  'Аренда',            'sub-rent'),
    genTx(38, 'expense',  3100, 'cat-transport',  'acc-card',  'Такси',             'sub-taxi'),
    genTx(39, 'expense',   500, 'cat-digital',    'acc-card',  'Интернет',          'sub-internet'),
    genTx(40, 'expense',  5600, 'cat-food',       'acc-card',  'Азбука Вкуса',      'sub-grocery'),
    genTx(42, 'expense',  1500, 'cat-digital',    'acc-card',  'Подписки',          'sub-subs'),
    genTx(44, 'expense',  2200, 'cat-clothing',   'acc-card',  'H&M'),
    genTx(46, 'income',   8000, 'cat-freelance',  'acc-card',  'Малый проект'),
    genTx(48, 'expense',  4100, 'cat-housing',    'acc-card',  'ЖКХ',              'sub-utilities'),
    genTx(49, 'expense',  1500, 'cat-beauty',     'acc-card',  'Маникюр'),
    genTx(50, 'expense',  1100, 'cat-health',     'acc-card',  'Аптека'),
    genTx(52, 'expense',   400, 'cat-cigarettes', 'acc-cash',  'Сигареты'),
    genTx(53, 'expense',   800, 'cat-cat',        'acc-card',  'Ветеринар'),
    genTx(55, 'expense',  7500, 'cat-entertain',  'acc-card',  'Концерт'),
    genTx(58, 'expense',  3300, 'cat-food',       'acc-cash',  'Рынок',            'sub-grocery'),
    genTx(60, 'expense',  2800, 'cat-food',       'acc-card',  'Кафе с друзьями',  'sub-cafe'),
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx });
  }
  console.log('Transactions created');

  // Goals
  const goal1Id = uuidv4();
  const goal2Id = uuidv4();
  const goal3Id = uuidv4();

  await prisma.goal.createMany({
    data: [
      {
        id: goal1Id,
        name: 'Отпуск на море',
        description: 'Турция в июле',
        targetAmount: 150000,
        currentAmount: 45000,
        deadline: new Date(today.getFullYear(), 5, 30),
        icon: 'Plane',
        color: '#3b82f6',
        isCompleted: false,
        createdAt: subMonths(today, 2),
      },
      {
        id: goal2Id,
        name: 'Резервный фонд',
        description: '6 месяцев расходов',
        targetAmount: 300000,
        currentAmount: 200000,
        deadline: null,
        icon: 'Shield',
        color: '#10b981',
        isCompleted: false,
        createdAt: subMonths(today, 6),
      },
      {
        id: goal3Id,
        name: 'Новый ноутбук',
        description: 'MacBook Pro M3',
        targetAmount: 200000,
        currentAmount: 80000,
        deadline: new Date(today.getFullYear(), 8, 1),
        icon: 'Laptop',
        color: '#8b5cf6',
        isCompleted: false,
        createdAt: subMonths(today, 1),
      },
    ],
  });

  // Goal contributions
  await prisma.goalContribution.createMany({
    data: [
      { id: uuidv4(), goalId: goal1Id, amount: 20000, date: subMonths(today, 2) },
      { id: uuidv4(), goalId: goal1Id, amount: 25000, date: subMonths(today, 1) },
      { id: uuidv4(), goalId: goal2Id, amount: 100000, date: subMonths(today, 6) },
      { id: uuidv4(), goalId: goal2Id, amount: 100000, date: subMonths(today, 3) },
      { id: uuidv4(), goalId: goal3Id, amount: 50000, date: subMonths(today, 1) },
      { id: uuidv4(), goalId: goal3Id, amount: 30000, date: subDays(today, 15) },
    ],
  });
  console.log('Goals created');

  // Recurring transactions
  await prisma.recurringTransaction.createMany({
    data: [
      {
        id: uuidv4(),
        name: 'Зарплата',
        type: 'income',
        amount: 95000,
        categoryId: 'cat-salary',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 5),
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Аренда квартиры',
        type: 'expense',
        amount: 12000,
        categoryId: 'cat-housing',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'ЖКХ',
        type: 'expense',
        amount: 5000,
        categoryId: 'cat-housing',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 10),
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Подписки (Netflix, Spotify)',
        type: 'expense',
        amount: 1200,
        categoryId: 'cat-digital',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Телефон',
        type: 'expense',
        amount: 600,
        categoryId: 'cat-digital',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 20),
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Интернет',
        type: 'expense',
        amount: 500,
        categoryId: 'cat-digital',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 20),
        isActive: true,
      },
    ],
  });
  console.log('Recurring transactions created');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
