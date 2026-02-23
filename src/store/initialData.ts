import { v4 as uuidv4 } from 'uuid';
import { Account, Category, Subcategory, Transaction, Goal, RecurringTransaction } from '../types';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export const defaultCategories: Category[] = [
  // Расходы
  { id: 'cat-food', name: 'Продукты', type: 'expense', color: '#f59e0b', icon: 'ShoppingCart', isDefault: true, isArchived: false },
  { id: 'cat-transport', name: 'Транспорт', type: 'expense', color: '#3b82f6', icon: 'Car', isDefault: true, isArchived: false },
  { id: 'cat-entertainment', name: 'Развлечения', type: 'expense', color: '#8b5cf6', icon: 'Gamepad2', isDefault: true, isArchived: false },
  { id: 'cat-housing', name: 'Жильё', type: 'expense', color: '#06b6d4', icon: 'Home', isDefault: true, isArchived: false },
  { id: 'cat-health', name: 'Здоровье', type: 'expense', color: '#ef4444', icon: 'Heart', isDefault: true, isArchived: false },
  { id: 'cat-education', name: 'Образование', type: 'expense', color: '#10b981', icon: 'BookOpen', isDefault: true, isArchived: false },
  { id: 'cat-clothing', name: 'Одежда', type: 'expense', color: '#ec4899', icon: 'Shirt', isDefault: true, isArchived: false },
  { id: 'cat-other-exp', name: 'Другое', type: 'expense', color: '#6b7280', icon: 'MoreHorizontal', isDefault: true, isArchived: false },
  // Доходы
  { id: 'cat-salary', name: 'Зарплата', type: 'income', color: '#22c55e', icon: 'Briefcase', isDefault: true, isArchived: false },
  { id: 'cat-freelance', name: 'Фриланс', type: 'income', color: '#34d399', icon: 'Laptop', isDefault: true, isArchived: false },
  { id: 'cat-investment', name: 'Инвестиции', type: 'income', color: '#a3e635', icon: 'TrendingUp', isDefault: true, isArchived: false },
  { id: 'cat-gift', name: 'Подарки', type: 'income', color: '#fb923c', icon: 'Gift', isDefault: true, isArchived: false },
  { id: 'cat-other-inc', name: 'Другое', type: 'income', color: '#94a3b8', icon: 'Plus', isDefault: true, isArchived: false },
];

export const defaultSubcategories: Subcategory[] = [
  { id: 'sub-grocery', name: 'Супермаркет', categoryId: 'cat-food' },
  { id: 'sub-restaurant', name: 'Ресторан/Кафе', categoryId: 'cat-food' },
  { id: 'sub-delivery', name: 'Доставка еды', categoryId: 'cat-food' },
  { id: 'sub-public', name: 'Общественный транспорт', categoryId: 'cat-transport' },
  { id: 'sub-taxi', name: 'Такси', categoryId: 'cat-transport' },
  { id: 'sub-fuel', name: 'Топливо', categoryId: 'cat-transport' },
  { id: 'sub-cinema', name: 'Кино/Театр', categoryId: 'cat-entertainment' },
  { id: 'sub-streaming', name: 'Подписки', categoryId: 'cat-entertainment' },
  { id: 'sub-sport', name: 'Спорт/Фитнес', categoryId: 'cat-entertainment' },
  { id: 'sub-rent', name: 'Аренда', categoryId: 'cat-housing' },
  { id: 'sub-utilities', name: 'Коммунальные', categoryId: 'cat-housing' },
  { id: 'sub-repair', name: 'Ремонт', categoryId: 'cat-housing' },
  { id: 'sub-pharmacy', name: 'Аптека', categoryId: 'cat-health' },
  { id: 'sub-doctor', name: 'Врач', categoryId: 'cat-health' },
  { id: 'sub-courses', name: 'Курсы', categoryId: 'cat-education' },
  { id: 'sub-books', name: 'Книги', categoryId: 'cat-education' },
];

export const defaultAccounts: Account[] = [
  { id: 'acc-cash', name: 'Наличные', type: 'cash', currency: 'RUB', initialBalance: 15000, color: '#f59e0b', icon: 'Banknote', isArchived: false, createdAt: fmt(today) },
  { id: 'acc-card', name: 'Дебетовая карта', type: 'card', currency: 'RUB', initialBalance: 85000, color: '#3b82f6', icon: 'CreditCard', isArchived: false, createdAt: fmt(today) },
  { id: 'acc-savings', name: 'Накопительный', type: 'savings', currency: 'RUB', initialBalance: 200000, color: '#10b981', icon: 'PiggyBank', isArchived: false, createdAt: fmt(today) },
];

const genTx = (days: number, type: 'income' | 'expense', amount: number, categoryId: string, accountId: string, comment?: string, subcategoryId?: string): Transaction => ({
  id: uuidv4(),
  type,
  amount,
  categoryId,
  subcategoryId,
  accountId,
  date: fmt(subDays(today, days)),
  comment,
  createdAt: new Date().toISOString(),
});

export const sampleTransactions: Transaction[] = [
  // Текущий месяц
  genTx(0, 'income', 95000, 'cat-salary', 'acc-card', 'Зарплата за февраль'),
  genTx(1, 'expense', 3200, 'cat-food', 'acc-card', 'Пятёрочка', 'sub-grocery'),
  genTx(2, 'expense', 850, 'cat-transport', 'acc-card', 'Яндекс Такси', 'sub-taxi'),
  genTx(3, 'expense', 12000, 'cat-housing', 'acc-card', 'Аренда квартиры', 'sub-rent'),
  genTx(4, 'expense', 1500, 'cat-entertainment', 'acc-card', 'Netflix, Spotify', 'sub-streaming'),
  genTx(5, 'expense', 2800, 'cat-food', 'acc-cash', 'Обед в кафе', 'sub-restaurant'),
  genTx(6, 'expense', 4500, 'cat-health', 'acc-card', 'Стоматолог', 'sub-doctor'),
  genTx(7, 'income', 15000, 'cat-freelance', 'acc-card', 'Проект верстки'),
  genTx(8, 'expense', 890, 'cat-transport', 'acc-card', 'Метро на месяц', 'sub-public'),
  genTx(9, 'expense', 6700, 'cat-food', 'acc-card', 'ВкусВилл', 'sub-grocery'),
  genTx(10, 'expense', 3200, 'cat-clothing', 'acc-card', 'Джинсы Zara'),
  genTx(11, 'expense', 1200, 'cat-entertainment', 'acc-cash', 'Кино', 'sub-cinema'),
  genTx(12, 'expense', 2400, 'cat-food', 'acc-card', 'Яндекс Еда', 'sub-delivery'),
  genTx(14, 'expense', 5800, 'cat-housing', 'acc-card', 'Коммунальные платежи', 'sub-utilities'),
  genTx(15, 'expense', 1800, 'cat-health', 'acc-card', 'Аптека', 'sub-pharmacy'),
  genTx(16, 'income', 3500, 'cat-gift', 'acc-cash', 'Подарок на день рождения'),
  genTx(17, 'expense', 990, 'cat-education', 'acc-card', 'Книги O\'Reilly', 'sub-books'),
  genTx(18, 'expense', 4200, 'cat-food', 'acc-card', 'Перекрёсток', 'sub-grocery'),
  genTx(19, 'expense', 350, 'cat-transport', 'acc-cash', 'Автобус', 'sub-public'),
  genTx(20, 'expense', 8900, 'cat-education', 'acc-card', 'Курс по React', 'sub-courses'),
  // Прошлый месяц
  genTx(35, 'income', 95000, 'cat-salary', 'acc-card', 'Зарплата за январь'),
  genTx(36, 'expense', 2900, 'cat-food', 'acc-card', 'Магнит', 'sub-grocery'),
  genTx(37, 'expense', 12000, 'cat-housing', 'acc-card', 'Аренда', 'sub-rent'),
  genTx(38, 'expense', 3100, 'cat-transport', 'acc-card', 'Такси', 'sub-taxi'),
  genTx(40, 'expense', 5600, 'cat-food', 'acc-card', 'Азбука Вкуса', 'sub-grocery'),
  genTx(42, 'expense', 1500, 'cat-entertainment', 'acc-card', 'Подписки', 'sub-streaming'),
  genTx(44, 'expense', 2200, 'cat-clothing', 'acc-card', 'H&M'),
  genTx(46, 'income', 8000, 'cat-freelance', 'acc-card', 'Малый проект'),
  genTx(48, 'expense', 4100, 'cat-housing', 'acc-card', 'Коммунальные', 'sub-utilities'),
  genTx(50, 'expense', 1100, 'cat-health', 'acc-card', 'Аптека', 'sub-pharmacy'),
  genTx(55, 'expense', 7500, 'cat-entertainment', 'acc-card', 'Спортзал 3 мес.', 'sub-sport'),
  genTx(58, 'expense', 3300, 'cat-food', 'acc-cash', 'Рынок', 'sub-grocery'),
  genTx(60, 'expense', 2800, 'cat-food', 'acc-card', 'Ресторан', 'sub-restaurant'),
];

export const defaultGoals: Goal[] = [
  {
    id: uuidv4(),
    name: 'Отпуск на море',
    description: 'Турция в июле',
    targetAmount: 150000,
    currentAmount: 45000,
    deadline: fmt(new Date(today.getFullYear(), 5, 30)),
    icon: 'Plane',
    color: '#3b82f6',
    isCompleted: false,
    createdAt: fmt(subMonths(today, 2)),
  },
  {
    id: uuidv4(),
    name: 'Резервный фонд',
    description: '6 месяцев расходов',
    targetAmount: 300000,
    currentAmount: 200000,
    deadline: undefined,
    icon: 'Shield',
    color: '#10b981',
    isCompleted: false,
    createdAt: fmt(subMonths(today, 6)),
  },
  {
    id: uuidv4(),
    name: 'Новый ноутбук',
    description: 'MacBook Pro M3',
    targetAmount: 200000,
    currentAmount: 80000,
    deadline: fmt(new Date(today.getFullYear(), 8, 1)),
    icon: 'Laptop',
    color: '#8b5cf6',
    isCompleted: false,
    createdAt: fmt(subMonths(today, 1)),
  },
];

export const defaultRecurring: RecurringTransaction[] = [
  {
    id: uuidv4(),
    name: 'Зарплата',
    type: 'income',
    amount: 95000,
    categoryId: 'cat-salary',
    accountId: 'acc-card',
    frequency: 'monthly',
    startDate: fmt(startOfMonth(today)),
    nextDate: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 5)),
    isActive: true,
  },
  {
    id: uuidv4(),
    name: 'Аренда квартиры',
    type: 'expense',
    amount: 12000,
    categoryId: 'cat-housing',
    subcategoryId: 'sub-rent',
    accountId: 'acc-card',
    frequency: 'monthly',
    startDate: fmt(startOfMonth(today)),
    nextDate: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
    isActive: true,
  },
  {
    id: uuidv4(),
    name: 'Коммунальные',
    type: 'expense',
    amount: 5000,
    categoryId: 'cat-housing',
    subcategoryId: 'sub-utilities',
    accountId: 'acc-card',
    frequency: 'monthly',
    startDate: fmt(startOfMonth(today)),
    nextDate: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 10)),
    isActive: true,
  },
  {
    id: uuidv4(),
    name: 'Netflix',
    type: 'expense',
    amount: 699,
    categoryId: 'cat-entertainment',
    subcategoryId: 'sub-streaming',
    accountId: 'acc-card',
    frequency: 'monthly',
    startDate: fmt(startOfMonth(today)),
    nextDate: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
    isActive: true,
  },
];
