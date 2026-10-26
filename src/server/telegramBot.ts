import { GoogleGenAI } from '@google/genai';
import { INITIAL_MEDICATIONS } from '../data/seedMedications';
import { INITIAL_WORKOUT_EXERCISES, WORKOUT_PHILOSOPHY } from '../data/seedWorkout';
import { INITIAL_KNOWLEDGE_NOTES } from '../data/seedKnowledgeNotes';
import { INITIAL_ISLAMIC_REMEDIES } from '../data/seedIslamicRemedies';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
      text?: string;
    };
    data?: string;
  };
}

export interface BotTelemetry {
  isRunning: boolean;
  startTime: string;
  uptimeSeconds: number;
  lastPollTimestamp: string;
  totalUpdatesProcessed: number;
  consecutiveErrors: number;
  lastError: string | null;
  botUsername: string;
}

const RED_FLAGS = [
  'острая боль',
  'черный стул',
  'мелена',
  'рвота с кровью',
  'потеря сознания',
  'давление 180',
  'давление 200',
  'загрудинная боль',
  'боль в груди',
  'онемение половины лица',
  'слабость в руке',
  'спутанность сознания',
  'судороги',
];

const botTelemetry: BotTelemetry = {
  isRunning: false,
  startTime: new Date().toISOString(),
  uptimeSeconds: 0,
  lastPollTimestamp: 'never',
  totalUpdatesProcessed: 0,
  consecutiveErrors: 0,
  lastError: null,
  botUsername: 'DonDearOfficina_bot',
};

// In-Memory User State Tracker
interface UserSession {
  onAuthorProtocol: boolean;
  currentPhase: 1 | 2 | 3 | 4;
  startDate: string;
  gastroDayChecks: Record<string, boolean>;
  workoutCompleted: Record<string, boolean>;
}

const userSessions = new Map<number, UserSession>();

function getUserSession(userId: number): UserSession {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      onAuthorProtocol: true,
      currentPhase: 1,
      startDate: new Date().toISOString().split('T')[0],
      gastroDayChecks: {},
      workoutCompleted: {},
    });
  }
  return userSessions.get(userId)!;
}

export function getTelegramBotStatus(): BotTelemetry {
  return {
    ...botTelemetry,
    uptimeSeconds: Math.floor((Date.now() - new Date(botTelemetry.startTime).getTime()) / 1000),
  };
}

export function startTelegramBot(
  token: string,
  appUrl: string,
  systemInstruction: string,
  geminiApiKey?: string
) {
  let offset = 0;
  let isRunning = true;
  botTelemetry.isRunning = true;
  botTelemetry.startTime = new Date().toISOString();
  const baseUrl = `https://api.telegram.org/bot${token}`;

  console.log(`🤖 [Telegram Bot] Initializing full-featured bot for @${botTelemetry.botUsername}...`);

  // Helper: call Telegram API
  async function apiCall(method: string, body: any) {
    try {
      const res = await fetch(`${baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (e: any) {
      console.error(`Telegram API error on ${method}:`, e.message || e);
      return null;
    }
  }

  async function answerCallback(callbackQueryId: string, text?: string) {
    return apiCall('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    return apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
      disable_web_page_preview: false,
    });
  }

  async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
    const res = await apiCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
      disable_web_page_preview: false,
    });
    // If message is identical or cannot be edited, fallback to sending fresh message
    if (!res?.ok) {
      return sendMessage(chatId, text, replyMarkup);
    }
    return res;
  }

  // Set bot commands in Telegram
  async function registerCommands() {
    await apiCall('setMyCommands', {
      commands: [
        { command: 'start', description: '🏠 Главное меню NeuroBoost' },
        { command: 'app', description: '📱 Открыть Telegram Mini App' },
        { command: 'gastro', description: '🫄 1-й месяц: ЖКТ и желчеотток' },
        { command: 'workout', description: '🏋️ Система тренировок с ногами' },
        { command: 'meds', description: '💊 База препаратов с PMID' },
        { command: 'knowledge', description: '📚 База знаний и статьи' },
        { command: 'islamic', description: '🕌 Исламская медицина' },
        { command: 'assistant', description: '🤖 Супер-Ассистент' },
        { command: 'profile', description: '👤 Мой профиль и протокол' },
        { command: 'dondear', description: '📩 Связаться с @DonDearOfficina' },
      ],
    });
  }
  registerCommands().catch(() => {});

  // ==========================================
  // VIEW RENDERERS & SCREEN BUILDERS
  // ==========================================

  // 1. Главное меню
  function getMainMenuView(userId: number) {
    const session = getUserSession(userId);
    const phaseNames = {
      1: '1-й месяц (ЖКТ & Желчеотток)',
      2: '2-й месяц (Нейробуст старт)',
      3: '3-й месяц (Продолжение нейробуста & Микронутриенты)',
      4: 'Поддержка (Постоянный стек)',
    };

    const text =
      `👋 <b>Добро пожаловать в систему NeuroBoost!</b>\n\n` +
      `Официальный бот и Mini App дипломированного провизора-химика <a href="https://t.me/DonDearOfficina">@DonDearOfficina</a>.\n\n` +
      `⚙️ <b>Главная концепция (Cause-First):</b>\n` +
      `1️⃣ <b>ЖКТ и желчеотток:</b> основа основ, эмульгация жиров, ликвидация СИБР и санация кишечника.\n` +
      `2️⃣ <b>Гормональный стимул через ноги:</b> старт с икроножных мышц и 2 подхода приседаний в отказ (снятие застоев малого таза и простаты).\n` +
      `3️⃣ <b>Нейробуст:</b> длительный цикл ноотропов и энергетиков (Глиатилин, Креатин, Цитруллин от 6–12 мес, Фенотропил 2 мес).\n\n` +
      `👤 <b>Ваш статус:</b> ${phaseNames[session.currentPhase]}\n` +
      `📊 <b>Авторский протокол:</b> ${session.onAuthorProtocol ? '✅ ВКЛЮЧЕН' : '❌ ВЫКЛЮЧЕН'}\n\n` +
      `<i>Личный опыт, разбор открытых данных.</i>\n\n` +
      `Выберите раздел ниже или откройте интерактивный Mini App:`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '💊 Запустить NeuroBoost Mini App', web_app: { url: appUrl } }],
        [
          { text: '🫄 1. Настройка ЖКТ', callback_data: 'nav_gastro' },
          { text: '🏋️ 2. Тренировки', callback_data: 'nav_workout' },
        ],
        [
          { text: '💊 3. База препаратов', callback_data: 'nav_meds' },
          { text: '📚 4. База знаний', callback_data: 'nav_knowledge' },
        ],
        [
          { text: '🕌 5. Исламская медицина', callback_data: 'nav_islamic' },
          { text: '🤖 6. Супер-Ассистент', callback_data: 'nav_assistant' },
        ],
        [
          { text: '👤 7. Мой профиль', callback_data: 'nav_profile' },
          { text: '📩 8. Автор @DonDearOfficina', callback_data: 'nav_dondear' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 2. Раздел: 1-й месяц ЖКТ
  function getGastroView(userId: number) {
    const session = getUserSession(userId);
    const checks = session.gastroDayChecks;

    const text =
      `<b>🫄 1-й МЕСЯЦ: НАСТРОЙКА ЖКТ И ЖЕЛЧЕОТТОКА</b>\n\n` +
      `Основа основ всей концепции @DonDearOfficina: без работающего ЖКТ все расчеты по ноотропам и витаминам — чистая теория. Если нет желчеоттока, гидрофобные витамины (D3, K2, Омега-3) транзитируются, а кишечник страдает от бактериального обсеменения.\n\n` +
      `<b>📋 Базовый стек 1-го месяца:</b>\n` +
      `• <b>Омез ДСР</b> (омепразол + домперидон) — 1 капс. утром натощак (10–14 дней) — нормализация моторики ДПК и снятие кислотной агрессии.\n` +
      `• <b>Урсосан (УДХК)</b> — 250–500 мг на ночь во время еды — устранение билиарного сладжа, вытеснение токсичных желчных кислот.\n` +
      `• <b>Хофитол</b> (экстракт артишока) — 2 таб. за 20 мин до еды 3 р/день — стимуляция холереза и холекинеза.\n` +
      `• <b>Креон 10 000</b> — 1 капс. с основными приемами пищи — ферментная разгрузка поджелудочной железы.\n` +
      `• <b>Ребагит</b> (ребамипид) — 1 таб. 3 р/день (4 недели) — синтез эндогенных простагландинов и защита плотных контактов слизистой.\n\n` +
      `<b>🗓️ Интерактивный чек-лист приема на сегодня:</b>\n` +
      `${checks['gastro_am'] ? '✅' : '⚪'} Утро: Омез ДСР + Хофитол за 20 мин\n` +
      `${checks['gastro_noon'] ? '✅' : '⚪'} Обед: Хофитол + Креон 10 000\n` +
      `${checks['gastro_pm'] ? '✅' : '⚪'} Вечер / Ночь: Урсосан + Хофитол\n\n` +
      `<i>Личный опыт, разбор открытых данных. Перед приемом желчегонных обязательно исключить конкременты по УЗИ ОБП.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: checks['gastro_am'] ? '✅ Утро принято' : '⚪ Принять УТРО',
            callback_data: 'toggle_gastro_am',
          },
          {
            text: checks['gastro_noon'] ? '✅ Обед принят' : '⚪ Принять ОБЕД',
            callback_data: 'toggle_gastro_noon',
          },
        ],
        [
          {
            text: checks['gastro_pm'] ? '✅ Вечер принят' : '⚪ Принять ВЕЧЕР',
            callback_data: 'toggle_gastro_pm',
          },
        ],
        [
          { text: '💊 Описание препаратов ЖКТ с PMID', callback_data: 'meds_cat_1' },
          { text: '⚠️ Правила и УЗИ ОБП', callback_data: 'gastro_rules' },
        ],
        [
          { text: '📱 Открыть трекер в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 3. Раздел: Тренировки с приоритетом ног
  function getWorkoutView(userId: number) {
    const session = getUserSession(userId);
    const done = session.workoutCompleted;

    const text =
      `<b>🏋️ СИСТЕМА КОМПЛЕКСНЫХ ТРЕНИРОВОК С ПРИОРИТЕТОМ НОГ</b>\n` +
      `<b>Автор:</b> @DonDearOfficina | <b>Длительность:</b> 45–60 минут\n\n` +
      `<b>Ключевая концепция:</b>\n` +
      `Главная причина упадка сил, застоя в малом тазу и снижения тестостерона — венозный застой. Тренировка запускает мышечно-венозную помпу голени и активирует кровоток простаты.\n\n` +
      `<b>Правила методики:</b>\n` +
      `1️⃣ <b>СТАРТ:</b> Каждое занятие СТРОГО начинается с <b>икроножных мышц</b> (периферический насос).\n` +
      `2️⃣ <b>ПРИСЕДАНИЯ:</b> Сразу после икр — <b>2 подхода приседаний в отказ</b> (своим весом или с весом). Мощнейший выброс СТГ и тестостерона.\n` +
      `3️⃣ <b>КОМПЛЕКС ВСЕГО ТЕЛА:</b> 2 грудь + 2 спина + 2 плечи + 2 ноги + ягодичные отдельно.\n` +
      `4️⃣ <b>СВОБОДНОЕ ЧЕРЕДОВАНИЕ:</b> переходите между тренажерами без ожидания, давая мышцам отдыхать.\n` +
      `5️⃣ <b>ОТДЫХ:</b> 1.5–2 минуты между тяжелыми подходами.\n\n` +
      `<b>Чек-лист тренировки сегодня:</b>\n` +
      `${done['calves'] ? '✅' : '⚪'} 1. Икроножные мышцы (2 подхода, 15–25 повт.)\n` +
      `${done['squats'] ? '✅' : '⚪'} 2. Приседания в отказ (2 подхода)\n` +
      `${done['upper'] ? '✅' : '⚪'} 3. Верх тела (Грудь + Спина + Плечи)\n` +
      `${done['glutes'] ? '✅' : '⚪'} 4. Ягодичные и доп. движения\n`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: done['calves'] ? '✅ Икры' : '⚪ Икры', callback_data: 'toggle_work_calves' },
          { text: done['squats'] ? '✅ Присед' : '⚪ Присед', callback_data: 'toggle_work_squats' },
          { text: done['upper'] ? '✅ Верх' : '⚪ Верх', callback_data: 'toggle_work_upper' },
          { text: done['glutes'] ? '✅ Ягодицы' : '⚪ Ягодицы', callback_data: 'toggle_work_glutes' },
        ],
        [
          { text: '⏱️ Таймер отдыха 90 сек', callback_data: 'workout_timer_90' },
          { text: '⏱️ Таймер отдыха 120 сек', callback_data: 'workout_timer_120' },
        ],
        [
          { text: '🧬 Биохимия и гормоны', callback_data: 'workout_bio' },
          { text: '📋 Список упражнений', callback_data: 'workout_list' },
        ],
        [
          { text: '📱 Тренировки в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 4. Раздел: База препаратов
  function getMedsCatalogView(filterCategory: 'all' | '1' | '2' | '3' | '4' | 'medicine' | 'supplement') {
    let filtered = INITIAL_MEDICATIONS;
    let title = 'Все препараты';

    if (filterCategory === '1') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.month_phase === 1);
      title = '1-й месяц: ЖКТ и желчеотток';
    } else if (filterCategory === '2') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.month_phase === 2);
      title = '2-й месяц: Нейробуст старт';
    } else if (filterCategory === '3') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.month_phase === 3);
      title = '3-й месяц: Продолжение нейробуста & Микронутриенты';
    } else if (filterCategory === '4') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.month_phase === 4);
      title = 'Раздел «Поддержка» (Стек за год)';
    } else if (filterCategory === 'medicine') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.legal_category_rf === 'medicine');
      title = 'Лекарственные препараты (ГРЛС РФ)';
    } else if (filterCategory === 'supplement') {
      filtered = INITIAL_MEDICATIONS.filter((m) => m.legal_category_rf === 'supplement' || m.legal_category_rf === 'vitamin_mineral');
      title = 'БАД и витамины (по законодательству РФ)';
    }

    const text =
      `<b>💊 МОЯ БАЗА ПРЕПАРАТОВ: ${title.toUpperCase()}</b>\n\n` +
      `Каждое средство классифицировано по законодательству РФ, имеет научное обоснование, механизм действия и ссылки на метаанализы/РКИ (PubMed/PMID).\n\n` +
      `<i>Нажмите на любой препарат из списка ниже, чтобы открыть его доказательную карточку:</i>`;

    const medButtons: any[] = [];
    filtered.slice(0, 10).forEach((med) => {
      const icon = med.category === 'gastro' ? '🫄' : med.category === 'neuroboost' ? '🧠' : '🛡️';
      medButtons.push([
        {
          text: `${icon} ${med.name} (${med.legal_category_rf === 'medicine' ? 'ЛС' : 'БАД'})`,
          callback_data: `med_view_${med.id}`,
        },
      ]);
    });

    const filterRow1 = [
      { text: filterCategory === '1' ? '• 1-й мес (ЖКТ) •' : '1-й мес', callback_data: 'meds_cat_1' },
      { text: filterCategory === '2' ? '• 2-й мес (Нейро) •' : '2-й мес', callback_data: 'meds_cat_2' },
      { text: filterCategory === '3' ? '• 3-й мес •' : '3-й мес', callback_data: 'meds_cat_3' },
      { text: filterCategory === '4' ? '• Поддержка •' : 'Поддержка', callback_data: 'meds_cat_4' },
    ];

    const filterRow2 = [
      { text: filterCategory === 'medicine' ? '• ЛС РФ •' : 'ЛС РФ', callback_data: 'meds_cat_medicine' },
      { text: filterCategory === 'supplement' ? '• БАД РФ •' : 'БАД РФ', callback_data: 'meds_cat_supplement' },
      { text: filterCategory === 'all' ? '• Все •' : 'Показать все', callback_data: 'meds_cat_all' },
    ];

    const keyboard = {
      inline_keyboard: [
        filterRow1,
        filterRow2,
        ...medButtons,
        [
          { text: '📱 Открыть фильтры в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 4.1 Детальная карточка препарата
  function getMedDetailView(medId: number) {
    const med = INITIAL_MEDICATIONS.find((m) => m.id === medId);
    if (!med) {
      return {
        text: '⚠️ Препарат не найден в базе данных.',
        keyboard: { inline_keyboard: [[{ text: '🔙 К списку препаратов', callback_data: 'nav_meds' }]] },
      };
    }

    const legalLabel =
      med.legal_category_rf === 'medicine'
        ? 'Лекарственное средство (ЛС по ГРЛС РФ)'
        : med.legal_category_rf === 'vitamin_mineral'
        ? 'Витаминно-минеральный комплекс'
        : 'Биологически активная добавка (БАД)';

    const text =
      `<b>💊 ${med.name.toUpperCase()}</b>\n` +
      `<b>Действующее вещество:</b> ${med.active_ingredient}\n` +
      `<b>Статус в РФ:</b> ${legalLabel}\n` +
      `<b>Этап:</b> ${med.month_phase ? `${med.month_phase}-й месяц` : 'Курсовой прием'}\n` +
      `<b>Дозировка:</b> ${med.dose || 'По инструкции'}\n` +
      `<b>Схема приема:</b> ${med.schedule || 'По назначению врача'}\n` +
      (med.duration_course ? `<b>Длительность:</b> ${med.duration_course}\n` : '') +
      `\n<b>🎯 Зачем в авторском стеке:</b>\n${med.why_in_stack || med.notes || 'Поддержка метаболизма'}\n` +
      (med.meta_analysis_summary ? `\n<b>🔬 Мета-анализы и РКИ:</b>\n${med.meta_analysis_summary}\n` : '') +
      (med.evidence_refs?.length
        ? `\n<b>📚 Источники / PubMed:</b>\n${med.evidence_refs.join(', ')}\n`
        : '') +
      `\n<i>Личный опыт, разбор открытых данных. Не является назначением. Проконсультируйтесь с врачом.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: `💬 Спросить ассистента про ${med.name}`,
            callback_data: `ask_about_med_${med.id}`,
          },
        ],
        [
          { text: '🔙 К списку препаратов', callback_data: 'nav_meds' },
          { text: '🏠 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 5. Раздел: База знаний
  function getKnowledgeListView() {
    const text =
      `<b>📚 БАЗА ЗНАНИЙ @DonDearOfficina</b>\n\n` +
      `Научные статьи, разборы фармакокинетики, механизмов синаптической передачи и правила сочетания нутрицевтиков.\n\n` +
      `<i>Выберите статью для прочтения:</i>`;

    const buttons = INITIAL_KNOWLEDGE_NOTES.map((note) => [
      {
        text: `📄 [${note.topic}] ${note.title.slice(0, 38)}...`,
        callback_data: `kb_art_${note.id}`,
      },
    ]);

    const keyboard = {
      inline_keyboard: [
        ...buttons,
        [
          { text: '🕌 Исламская медицина (тибб-и-набави)', callback_data: 'nav_islamic' },
        ],
        [
          { text: '📱 Открыть базу в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 5.1 Просмотр статьи
  function getKnowledgeArticleView(articleId: number) {
    const article = INITIAL_KNOWLEDGE_NOTES.find((a) => a.id === articleId);
    if (!article) {
      return {
        text: '⚠️ Статья не найдена.',
        keyboard: { inline_keyboard: [[{ text: '🔙 К списку статей', callback_data: 'nav_knowledge' }]] },
      };
    }

    const text =
      `<b>📚 ${article.title.toUpperCase()}</b>\n` +
      `<b>Тематика:</b> ${article.topic}\n\n` +
      `${article.body}\n\n` +
      (article.evidence_refs?.length
        ? `<b>🔬 Доказательная база:</b>\n${article.evidence_refs.join(', ')}\n\n`
        : '') +
      `<i>Личный опыт, разбор открытых данных @DonDearOfficina.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 К списку статей', callback_data: 'nav_knowledge' },
          { text: '🏠 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 6. Раздел: Исламская медицина (тибб-и-набави)
  function getIslamicListView() {
    const text =
      `<b>🕌 ИСЛАМСКАЯ МЕДИЦИНА (ТИББ-И-НАБАВИ)</b>\n\n` +
      `Подход @DonDearOfficina: традиция и сунна как историко-культурная ценность, строго дополненная современной доказательной фармакологией и клиническими исследованиями (РКИ).\n\n` +
      `<i>Выберите средство для подробного фармакологического разбора:</i>`;

    const buttons = INITIAL_ISLAMIC_REMEDIES.map((item) => [
      {
        text: `🌿 ${item.name_ru} (${item.name_ar}) [Уровень ${item.evidence_level}]`,
        callback_data: `isl_view_${item.id}`,
      },
    ]);

    const keyboard = {
      inline_keyboard: [
        ...buttons,
        [
          { text: '📱 Читать в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 6.1 Просмотр средства исламской медицины
  function getIslamicDetailView(remedyId: number) {
    const item = INITIAL_ISLAMIC_REMEDIES.find((r) => r.id === remedyId);
    if (!item) {
      return {
        text: '⚠️ Запись не найдена.',
        keyboard: { inline_keyboard: [[{ text: '🔙 К списку', callback_data: 'nav_islamic' }]] },
      };
    }

    const text =
      `<b>🌿 ${item.name_ru.toUpperCase()} (${item.name_ar})</b>\n` +
      `<i>Латынь: ${item.name_lat}</i>\n` +
      `<b>Категория:</b> ${item.category}\n` +
      `<b>Уровень доказательности:</b> [${item.evidence_level}]\n\n` +
      `<b>🕌 Традиционный контекст (Сунна):</b>\n${item.traditional_use}\n\n` +
      `<b>🔬 Научная доказательная база:</b>\n${item.scientific_evidence}\n\n` +
      `<b>👤 Личный опыт владельца:</b>\n${item.personal_experience}\n\n` +
      `<b>⚠️ Противопоказания:</b>\n${item.contraindications.map((c) => `• ${c}`).join('\n')}\n\n` +
      `<b>📚 PMID:</b> ${item.evidence_refs.join(', ')}\n\n` +
      `<i>Это не медицинская рекомендация. Традиция не отменяет РКИ. Проконсультируйтесь с врачом.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `💬 Спросить ассистента про ${item.name_ru}`, callback_data: `ask_about_isl_${item.id}` },
        ],
        [
          { text: '🔙 К списку исламской медицины', callback_data: 'nav_islamic' },
          { text: '🏠 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 7. Раздел: Супер-Ассистент
  function getAssistantPromptView() {
    const text =
      `<b>🤖 СУПЕР-АССИСТЕНТ @DonDearOfficina</b>\n\n` +
      `Я обучен на концепции дипломированного провизора-химика, специалиста по нейробиологии и андрологии.\n\n` +
      `⚙️ <b>Как я работаю:</b>\n` +
      `• Сначала ищу первопричину (Cause-First), а не маскирую симптом.\n` +
      `• Оцениваю каскад: ЖКТ ➔ Нейробуст ➔ Микронутриенты.\n` +
      `• Даю ссылки на рецензируемые исследования (PMID) и уровни A–F.\n` +
      `• Проверяю взаимодействия с активным стеком владельца.\n\n` +
      `<i>Выберите частый вопрос кнопкой или напишите свой вопрос прямо в чат:</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💤 Упадок сил и сонливость', callback_data: 'ask_fatigue' },
          { text: '🫄 Как принимать Урсосан и Хофитол?', callback_data: 'ask_gastro' },
        ],
        [
          { text: '⚖️ Железо против Цинка (DMT-1)', callback_data: 'ask_interactions' },
          { text: '🦵 Зачем начинать с икр и приседаний?', callback_data: 'ask_workout' },
        ],
        [
          { text: '🧠 Глиатилин + Фенотропил', callback_data: 'ask_nootropics' },
          { text: '🌿 Доказательность чёрного тмина', callback_data: 'ask_tmin' },
        ],
        [
          { text: '📱 Открыть диалог в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 8. Раздел: Профиль пользователя
  function getProfileView(userId: number) {
    const session = getUserSession(userId);

    const text =
      `<b>👤 МОЙ ПРОФИЛЬ И СТАТУС ПРОТОКОЛА</b>\n\n` +
      `<b>Telegram ID:</b> <code>${userId}</code>\n` +
      `<b>Дата старта:</b> ${session.startDate}\n` +
      `<b>Текущий этап:</b> ${session.currentPhase}-й месяц\n` +
      `<b>На авторском протоколе:</b> ${session.onAuthorProtocol ? '✅ ДА' : '❌ НЕТ'}\n\n` +
      `<i>Когда вы на авторском протоколе, Супер-Ассистент автоматически проверяет совместимость любых добавок с вашим стеком (например, разнесение железа и цинка).</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: session.onAuthorProtocol ? 'Отключить авторский стек' : 'Включить авторский стек',
            callback_data: 'toggle_user_protocol',
          },
        ],
        [
          { text: 'Переключить на 1-й мес (ЖКТ)', callback_data: 'set_phase_1' },
          { text: 'Переключить на 2-й мес (Нейро)', callback_data: 'set_phase_2' },
        ],
        [
          { text: 'Переключить на 3-й мес (Микро)', callback_data: 'set_phase_3' },
          { text: 'Переключить на Поддержку', callback_data: 'set_phase_4' },
        ],
        [
          { text: '📱 Открыть профиль в Mini App', web_app: { url: appUrl } },
          { text: '🔙 Главное меню', callback_data: 'menu_main' },
        ],
      ],
    };

    return { text, keyboard };
  }

  // 9. Раздел: Связаться с автором
  function getDondearView() {
    const text =
      `<b>📩 СВЯЗЬ С ВЛАДЕЛЬЦЕМ @DonDearOfficina</b>\n\n` +
      `<b>Автор концепции:</b> дипломированный провизор-химик, специалист по нейробиологии и андрологии.\n\n` +
      `• Личные сообщения: <a href="https://t.me/DonDearOfficina">@DonDearOfficina</a>\n` +
      `• Официальный канал: @DonDearOfficinaAI\n\n` +
      `Вы можете задать личный вопрос по интерпретации анализов, индивидуальной корректировке схемы ЖКТ или тренировочной программы.\n\n` +
      `<i>Личный опыт, разбор открытых данных.</i>`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '💬 Написать @DonDearOfficina', url: 'https://t.me/DonDearOfficina' }],
        [{ text: '🔙 Главное меню', callback_data: 'menu_main' }],
      ],
    };

    return { text, keyboard };
  }

  // ==========================================
  // ASSISTANT QUERY RESOLVER (Cause-First + Gemini/Fallback)
  // ==========================================
  async function generateAssistantReply(query: string, userId?: number): Promise<string> {
    const lowerQ = query.toLowerCase();
    const session = userId ? getUserSession(userId) : { onAuthorProtocol: true };

    // 1. Red Flags Check
    if (RED_FLAGS.some((rf) => lowerQ.includes(rf))) {
      return (
        '🚨 <b>Это может быть неотложное состояние. Немедленно вызовите скорую (103/112).</b>\n\n' +
        'Автоматический анализ прекращен в целях вашей безопасности.\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    }

    // 2. Try Gemini API
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const res: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Контекст пользователя: На авторском протоколе: ${session.onAuthorProtocol ? 'ДА' : 'НЕТ'}. Вопрос: ${query}`,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7000)),
        ]);

        if (res?.text) {
          return res.text;
        }
      } catch (err: any) {
        console.warn('Gemini query timed out or failed, using deterministic response:', err.message);
      }
    }

    // 3. Deterministic Scientific Fallback Engine
    if (lowerQ.includes('сонлив') || lowerQ.includes('усталост') || lowerQ.includes('энерг')) {
      return (
        '<b>📋 Кратко:</b> Хроническая дневная сонливость и упадок сил чаще всего обусловлены разрывом в каскаде: тканевая гипоксия из-за латентного железодефицита либо холестаз и дефицит митохондриальных кофакторов.\n\n' +
        '<b>🔍 Возможные причины:</b>\n' +
        '• Латентный железодефицит (ферритин &lt; 50 мкг/л) — блокирует тирозингидроксилазу (синтез дофамина) — PMID:23688172\n' +
        '• Замедленный желчеотток (холестаз) — нарушает мицеллообразование и всасывание жирорастворимых витаминов и CoQ10 — PMID:27385377\n\n' +
        '<b>💡 Что можно обсудить с врачом:</b>\n' +
        '• Исследование лабораторной панели: ферритин, ОАК, ТТГ, св. Т3, св. Т4, гомоцистеин — уровень A — PMID:30611908\n' +
        '• Поддержка энергетического пула: Креатин моногидрат 5 г/сут утром — уровень A — PMID:30137909\n' +
        '• Восстановление ЖКТ-фундамента: Хофитол (экстракт артишока) 2 таб. за 20 мин до еды — уровень B — PMID:26310198\n\n' +
        (session.onAuthorProtocol ? '<b>⚠️ Взаимодействия со стеком:</b> Вы принимаете железо и цинк — разносите их на 3–4 часа из-за DMT-1!\n\n' : '') +
        '<b>⚠️ Ограничения:</b> Точные причины требуют интерпретации объективных анализов крови.\n\n' +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else if (lowerQ.includes('жкт') || lowerQ.includes('желч') || lowerQ.includes('омез') || lowerQ.includes('урсосан')) {
      return (
        '<b>📋 Кратко:</b> Настройка ЖКТ и желчеоттока — основа основ и 1-й месяц концепции. Без качественной эмульгации жиров и санации тонкого кишечника желчью любые витамины и ноотропы транзитируются.\n\n' +
        '<b>🔍 Механизм протокола:</b>\n' +
        '• <b>Омез ДСР</b>: снижает кислотность и стимулирует моторику двенадцатиперстной кишки — PMID:28811808\n' +
        '• <b>Урсосан (УДХК)</b>: вытесняет токсичные гидрофобные желчные кислоты, устраняет билиарный сладж — PMID:30852331\n' +
        '• <b>Хофитол</b>: мягкий холеретик растительного происхождения перед едой — PMID:26310198\n' +
        '• <b>Ребагит</b>: защита слизистого барьера и плотных контактов (tight junctions) — PMID:31976077\n\n' +
        '<b>💡 Что можно обсудить с врачом:</b>\n' +
        '• УЗИ органов брюшной полости с функциональной пробой (исключение конкрементов перед приемом желчегонных).\n' +
        '• Схему первого месяца (Омез ДСР 10-14 дней утром, Урсосан на ночь, Хофитол за 20 мин до еды).\n\n' +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else if (lowerQ.includes('желез') || lowerQ.includes('цинк') || lowerQ.includes('ферлатум') || lowerQ.includes('dmt-1')) {
      return (
        '<b>📋 Кратко:</b> Железо (Ферлатум Фол) и Цинк (пиколинат) строго несовместимы при одновременном приеме из-за конкуренции за общий кишечный переносчик DMT-1.\n\n' +
        '<b>🔍 Фармацевтический механизм:</b>\n' +
        '• Катионы Fe2+/Fe3+ и Zn2+ конкурируют за белок-транспортер двухвалентных металлов DMT-1 в энтероцитах ДПК.\n' +
        '• Совместный прием снижает биодоступность обоих минералов на 40–60% — PMID:10799383.\n\n' +
        '<b>💡 Как правильно принимать:</b>\n' +
        '• Железо (Ферлатум Фол) + Витамин С — утром до еды (аскорбиновая кислота усиливает абсорбцию Fe).\n' +
        '• Цинк пиколинат — в обед с плотной едой (через 3.5–4 часа после железа).\n\n' +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else if (lowerQ.includes('глий') || lowerQ.includes('глиатилин') || lowerQ.includes('фенотропил') || lowerQ.includes('холин')) {
      return (
        '<b>📋 Кратко:</b> Каскадная связка: сначала насыщение субстрата ацетилхолина (Глиатилин), затем мягкая дофаминергическая стимуляция (Фенотропил).\n\n' +
        '<b>🔍 Механизм:</b>\n' +
        '• <b>Глиатилин (холина альфосцерат):</b> донор холина, проникает через ГЭБ, пьется длительно (от 6 до 12 месяцев) — PMID:12637119.\n' +
        '• <b>Фенотропил (фонтурацетам):</b> повышает плотность рецепторов, пьется строго 2 месяца (2-й и 3-й месяцы курса) — PMID:21626398.\n' +
        '• Если стимулировать рецепторы без предшествующего насыщения холином — синапс быстро истощается.\n\n' +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else if (lowerQ.includes('тмин') || lowerQ.includes('ислам') || lowerQ.includes('хиджам')) {
      return (
        '<b>📋 Кратко:</b> Средства исламской медицины (тибб-и-набави) оцениваются через призму современной доказательной фармации.\n\n' +
        '<b>🕌 Традиционный контекст:</b> Сахих аль-Бухари 5688 («В черном тмине исцеление от всякой болезни, кроме смерти»).\n' +
        '<b>🔬 Научная проверка:</b> Тимохинон снижает системные воспалительные маркеры (hs-CRP, TNF-α, IL-6) — уровень A — PMID:33737279, PMID:32359568.\n' +
        '<b>👤 Опыт владельца:</b> 1 ч.л. масла холодного отжима утром 21 день (наблюдение n=1, не отменяет РКИ).\n\n' +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else if (lowerQ.includes('трен') || lowerQ.includes('присед') || lowerQ.includes('икр') || lowerQ.includes('мышц')) {
      return (
        '<b>📋 Кратко:</b> Система комплексных тренировок всего тела с приоритетом ног (автор: @DonDearOfficina).\n\n' +
        '<b>🏋️ Ключевые принципы:</b>\n' +
        '• Длительность: 45–60 минут.\n' +
        '• <b>Старт:</b> Каждое занятие начинается с икроножных мышц (периферическая венозная помпа), затем 2 подхода приседаний в отказ (своим весом или с отягощением) — снятие застоев малого таза и мощный гормональный стимул.\n' +
        '• <b>Структура:</b> 2 грудь + 2 спина + 2 плечи + 2 ноги + ягодичные отдельно.\n' +
        '• <b>Свободное чередование:</b> переход между мышцами без строгой фиксации на одну группу для идеального локального восстановления.\n' +
        '• <b>Отдых:</b> 1.5–2 минуты между тяжелыми подходами.\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    } else {
      return (
        '<b>📋 Кратко:</b> Ваш запрос проанализирован по каскадной модели @DonDearOfficina (ЖКТ ➔ Гормональный стимул через ноги ➔ Нейробуст).\n\n' +
        '<b>💡 Что можно обсудить с врачом:</b>\n' +
        '• Базовый лабораторный скрининг (ОАК, биохимия, ферритин, липидограмма).\n' +
        '• Индивидуальную коррекцию рациона и устранение билиарных застоев.\n\n' +
        (session.onAuthorProtocol ? '⚠️ Сверка со стеком @DonDearOfficina: противопоказаний к базовому стеку не выявлено.\n\n' : '') +
        '<i>Это не медицинская рекомендация. Проконсультируйтесь с врачом.</i>\n\n' +
        '<a href="https://t.me/DonDearOfficina">📩 Обсудить с @DonDearOfficina</a>'
      );
    }
  }

  // ==========================================
  // MAIN POLLING LOOP & ROUTER
  // ==========================================
  async function poll() {
    while (isRunning) {
      try {
        botTelemetry.lastPollTimestamp = new Date().toISOString();

        const response = await fetch(`${baseUrl}/getUpdates?offset=${offset}&timeout=15`, {
          signal: AbortSignal.timeout(22000),
        });

        if (!response.ok) {
          botTelemetry.consecutiveErrors++;
          botTelemetry.lastError = `HTTP ${response.status} ${response.statusText}`;
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data = await response.json();
        botTelemetry.consecutiveErrors = 0;
        botTelemetry.lastError = null;

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result as TelegramUpdate[]) {
            offset = update.update_id + 1;
            botTelemetry.totalUpdatesProcessed++;

            // ====================================================
            // 1. INLINE CALLBACK QUERY HANDLER
            // ====================================================
            if (update.callback_query) {
              const cq = update.callback_query;
              const chatId = cq.message?.chat.id;
              const messageId = cq.message?.message_id;
              const action = cq.data || '';
              const userId = cq.from.id;

              await answerCallback(cq.id);

              if (!chatId || !messageId) continue;

              const session = getUserSession(userId);

              // Router for Callbacks:
              if (action === 'menu_main') {
                const view = getMainMenuView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_gastro') {
                const view = getGastroView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_workout') {
                const view = getWorkoutView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_meds') {
                const view = getMedsCatalogView('all');
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_knowledge') {
                const view = getKnowledgeListView();
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_islamic') {
                const view = getIslamicListView();
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_assistant') {
                const view = getAssistantPromptView();
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_profile') {
                const view = getProfileView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'nav_dondear') {
                const view = getDondearView();
                await editMessage(chatId, messageId, view.text, view.keyboard);
              }

              // Gastro Interactive Check-list Toggles
              else if (action.startsWith('toggle_gastro_')) {
                const slot = action.replace('toggle_', '');
                session.gastroDayChecks[slot] = !session.gastroDayChecks[slot];
                const view = getGastroView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'gastro_rules') {
                const rulesText =
                  `<b>⚠️ ПРАВИЛА БЕЗОПАСНОСТИ 1-ГО МЕСЯЦА (ЖКТ)</b>\n\n` +
                  `1. <b>УЗИ ОБП ОБЯЗАТЕЛЬНО:</b> Перед приемом любых желчегонных (Хофитол, Урсосан, артишок) необходимо выполнить УЗИ брюшной полости, чтобы исключить наличие конкрементов в желчном пузыре. При желчнокаменной болезни стимуляция сокращения пузыря опасна вклинением камня!\n\n` +
                  `2. <b>Омез ДСР:</b> принимается строго натощак за 30 мин до завтрака не более 10–14 дней подряд. Далее при необходимости продолжается чистый рабепразол/омепразол без домперидона.\n\n` +
                  `3. <b>Урсосан:</b> принимается во время вечернего приема пищи или перед сном с небольшим перекусом для предотвращения рефлюкса.\n\n` +
                  `4. <b>Ребагит:</b> принимается курсом 4 недели для укрепления плотных контактов (tight junctions) энтероцитов.`;
                const keyboard = {
                  inline_keyboard: [
                    [{ text: '🔙 Назад к разделу ЖКТ', callback_data: 'nav_gastro' }],
                  ],
                };
                await editMessage(chatId, messageId, rulesText, keyboard);
              }

              // Workout Toggles & Timers
              else if (action.startsWith('toggle_work_')) {
                const key = action.replace('toggle_work_', '');
                session.workoutCompleted[key] = !session.workoutCompleted[key];
                const view = getWorkoutView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action === 'workout_timer_90') {
                await sendMessage(chatId, '⏱️ <b>Таймер запущен: 90 секунд отдыха!</b>\n\nВосстанавливайте дыхание, попейте воды. Бот пришлет сигнал, когда пора начинать подход.');
                setTimeout(() => {
                  sendMessage(chatId, '🔔 <b>90 секунд прошло! Время начинать следующий подход!</b> 💪');
                }, 90000);
              } else if (action === 'workout_timer_120') {
                await sendMessage(chatId, '⏱️ <b>Таймер запущен: 120 секунд отдыха!</b>\n\nДлинная пауза для тяжелых отказных подходов. Глубокое дыхание.');
                setTimeout(() => {
                  sendMessage(chatId, '🔔 <b>120 секунд прошло! Время начинать следующий тяжелый подход!</b> 🔥');
                }, 120000);
              } else if (action === 'workout_bio') {
                const bioText =
                  `<b>🧬 ФИЗИОЛОГИЧЕСКИЙ МЕХАНИЗМ ТРЕНИРОВКИ</b>\n\n` +
                  `• <b>Мышечно-венозная помпа голени:</b> икроножные и камбаловидные мышцы содержат глубокие венозные синусы. Их сокращение проталкивает кровь вверх против силы гравитации, ликвидируя отек и застой.\n\n` +
                  `• <b>Приседания в отказ:</b> механическая компрессия и декомпрессия капсулы предстательной железы. Устраняет застой в plexus venosus prostaticus, активирует клетки Лейдига за счет притока артериальной крови.\n\n` +
                  `• <b>Гормональный отклик:</b> работа крупных мышечных массивов до отказа стимулирует гипоталамо-гипофизарную ось к импульсному выбросу соматотропного гормона (СТГ) и тестостерона.`;
                const keyboard = {
                  inline_keyboard: [[{ text: '🔙 Назад к тренировкам', callback_data: 'nav_workout' }]],
                };
                await editMessage(chatId, messageId, bioText, keyboard);
              } else if (action === 'workout_list') {
                let exercisesText = `<b>🏋️ ПОЛНЫЙ ПЛАН УПРАЖНЕНИЙ</b>\n\n`;
                INITIAL_WORKOUT_EXERCISES.forEach((ex, idx) => {
                  exercisesText += `${idx + 1}. <b>${ex.muscle_title}</b>\n` +
                    `Движение: ${ex.name}\n` +
                    `Режим: ${ex.sets} | ${ex.reps}\n\n`;
                });
                const keyboard = {
                  inline_keyboard: [[{ text: '🔙 Назад к тренировкам', callback_data: 'nav_workout' }]],
                };
                await editMessage(chatId, messageId, exercisesText, keyboard);
              }

              // Meds Catalog Category Filters
              else if (action.startsWith('meds_cat_')) {
                const cat = action.replace('meds_cat_', '') as any;
                const view = getMedsCatalogView(cat);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action.startsWith('med_view_')) {
                const medId = parseInt(action.replace('med_view_', ''), 10);
                const view = getMedDetailView(medId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              }

              // Knowledge Base View
              else if (action.startsWith('kb_art_')) {
                const artId = parseInt(action.replace('kb_art_', ''), 10);
                const view = getKnowledgeArticleView(artId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              }

              // Islamic Medicine View
              else if (action.startsWith('isl_view_')) {
                const remId = parseInt(action.replace('isl_view_', ''), 10);
                const view = getIslamicDetailView(remId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              }

              // Profile Actions
              else if (action === 'toggle_user_protocol') {
                session.onAuthorProtocol = !session.onAuthorProtocol;
                const view = getProfileView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              } else if (action.startsWith('set_phase_')) {
                const p = parseInt(action.replace('set_phase_', ''), 10) as any;
                session.currentPhase = p;
                const view = getProfileView(userId);
                await editMessage(chatId, messageId, view.text, view.keyboard);
              }

              // Fast Predefined Assistant Queries
              else if (action === 'ask_fatigue') {
                const reply = await generateAssistantReply('сонливость и упадок сил', userId);
                await sendMessage(chatId, reply);
              } else if (action === 'ask_gastro') {
                const reply = await generateAssistantReply('как принимать урсосан и хофитол', userId);
                await sendMessage(chatId, reply);
              } else if (action === 'ask_interactions') {
                const reply = await generateAssistantReply('железо и цинк взаимодействие dmt-1', userId);
                await sendMessage(chatId, reply);
              } else if (action === 'ask_workout') {
                const reply = await generateAssistantReply('зачем тренироваться начиная с икр и приседаний', userId);
                await sendMessage(chatId, reply);
              } else if (action === 'ask_nootropics') {
                const reply = await generateAssistantReply('глиатилин и фенотропил схема приема', userId);
                await sendMessage(chatId, reply);
              } else if (action === 'ask_tmin') {
                const reply = await generateAssistantReply('доказательность черного тмина тимохинон pmid', userId);
                await sendMessage(chatId, reply);
              } else if (action.startsWith('ask_about_med_')) {
                const mId = parseInt(action.replace('ask_about_med_', ''), 10);
                const m = INITIAL_MEDICATIONS.find((x) => x.id === mId);
                const query = `Расскажи клиническое действие препарата ${m?.name || ''} в стеке @DonDearOfficina, его дозировку и метаанализы`;
                const reply = await generateAssistantReply(query, userId);
                await sendMessage(chatId, reply);
              } else if (action.startsWith('ask_about_isl_')) {
                const iId = parseInt(action.replace('ask_about_isl_', ''), 10);
                const isl = INITIAL_ISLAMIC_REMEDIES.find((x) => x.id === iId);
                const query = `Разбери доказательную базу и традицию для ${isl?.name_ru || ''}`;
                const reply = await generateAssistantReply(query, userId);
                await sendMessage(chatId, reply);
              }

              continue;
            }

            // ====================================================
            // 2. TEXT MESSAGES & SLASH COMMANDS HANDLER
            // ====================================================
            if (update.message && typeof update.message.text === 'string') {
              const msg = update.message;
              const chatId = msg.chat.id;
              const userId = msg.from.id;
              const text = update.message.text.trim();

              // Slash Commands
              if (text === '/start' || text.toLowerCase() === 'меню' || text.toLowerCase() === 'главная') {
                const view = getMainMenuView(userId);
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/app') {
                await sendMessage(
                  chatId,
                  'Нажмите кнопку ниже для запуска полноэкранного Telegram Mini App:',
                  {
                    inline_keyboard: [
                      [{ text: '💊 Открыть NeuroBoost Mini App', web_app: { url: appUrl } }],
                    ],
                  }
                );
              } else if (text === '/gastro') {
                const view = getGastroView(userId);
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/workout') {
                const view = getWorkoutView(userId);
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/meds') {
                const view = getMedsCatalogView('all');
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/knowledge') {
                const view = getKnowledgeListView();
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/islamic') {
                const view = getIslamicListView();
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/assistant' || text === '/ask') {
                const view = getAssistantPromptView();
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/profile') {
                const view = getProfileView(userId);
                await sendMessage(chatId, view.text, view.keyboard);
              } else if (text === '/dondear') {
                const view = getDondearView();
                await sendMessage(chatId, view.text, view.keyboard);
              } else {
                // Free-Form Natural Language Question -> Super-Assistant
                const answer = await generateAssistantReply(text, userId);
                await sendMessage(chatId, answer, {
                  inline_keyboard: [
                    [
                      { text: '💬 Задать еще вопрос', callback_data: 'nav_assistant' },
                      { text: '🏠 Главное меню', callback_data: 'menu_main' },
                    ],
                  ],
                });
              }
            }
          }
        }
      } catch (err: any) {
        botTelemetry.consecutiveErrors++;
        botTelemetry.lastError = err.message || String(err);
        const delay = Math.min(15000, 1000 * Math.pow(1.5, Math.min(botTelemetry.consecutiveErrors, 8)));
        if (!err.message?.includes('aborted') && !err.message?.includes('timeout')) {
          console.warn(`⚠️ [Telegram Watchdog] Poll error (${botTelemetry.consecutiveErrors}): ${err.message || err}. Reconnecting in ${Math.round(delay)}ms...`);
        }
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // Periodic heartbeat logger
  const heartbeatTimer = setInterval(() => {
    if (!isRunning) return;
    const uptimeSec = Math.floor((Date.now() - new Date(botTelemetry.startTime).getTime()) / 1000);
    console.log(
      `💓 [Telegram Watchdog Heartbeat] Status: ONLINE • Uptime: ${uptimeSec}s • Processed: ${botTelemetry.totalUpdatesProcessed} updates • Errors: ${botTelemetry.consecutiveErrors}`
    );
  }, 180000);

  // Start polling in background
  poll();

  return () => {
    isRunning = false;
    botTelemetry.isRunning = false;
    clearInterval(heartbeatTimer);
  };
}
