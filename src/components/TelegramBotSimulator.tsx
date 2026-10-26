import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  BookOpen,
  Pill,
  Award,
  Bot,
  MessageSquare,
  Search,
  ExternalLink,
  Dumbbell,
  Activity,
  Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IslamicRemedy, KnowledgeNote, Medication, WorkoutExercise } from '../types';

interface BotMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  buttons?: { text: string; action: () => void; variant?: 'default' | 'danger' | 'success' | 'outline' }[];
  isRedFlag?: boolean;
}

export const TelegramBotSimulator: React.FC = () => {
  const {
    currentUser,
    medications,
    islamicRemedies,
    knowledgeNotes,
    workoutExercises,
    workoutPhilosophy,
    toggleWorkoutExercise,
    toggleAuthorProtocol,
    grantConsent,
    revokeConsent,
    lastAssistantSummary,
    setLastAssistantSummary,
    queryAssistant,
    checkRedFlags,
    consumeInvite,
    triggerFunnel,
    funnelStages,
    funnelTriggers,
    funnelLeads,
    advanceFunnelStep,
  } = useApp();

  const [simChannel, setSimChannel] = useState<'telegram' | 'instagram'>('telegram');
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeSubView, setActiveSubView] = useState<string>('idle');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Instagram Direct Messages State
  const [igMessages, setIgMessages] = useState<
    Array<{
      id: string;
      sender: 'user' | 'dondear';
      text: string;
      timestamp: string;
      leadMagnet?: {
        title: string;
        description: string;
        pdfName: string;
        ctaText: string;
        startArg: string;
      };
    }>
  >([
    {
      id: 'ig-seed-1',
      sender: 'user',
      text: 'СТЕК',
      timestamp: '11:20',
    },
    {
      id: 'ig-seed-2',
      sender: 'dondear',
      text: 'Приветствую! На связи @DonDearOfficina — дипломированный провизор.\n\nВы запросили доступ к авторской схеме буста нервной системы (33 препарата и добавки). Ниже ссылка на мгновенное открытие полного протокола:',
      timestamp: '11:20',
      leadMagnet: {
        title: '🎁 Авторский протокол буста нервной системы',
        description: 'Каскадная триада: ЖКТ-фундамент ➔ Холин/Креатин ➔ Мягкая стимуляция. Дозировки, время приема, биомаркеры.',
        pdfName: 'Авторский_протокол_DonDearOfficina_33_препарата.pdf',
        ctaText: '🚀 Открыть в Telegram-боте @DonDearOfficinaAI',
        startArg: 'ig_stack',
      },
    },
  ]);
  const [igInput, setIgInput] = useState('');
  const [igIsTyping, setIgIsTyping] = useState(false);
  const igChatEndRef = useRef<HTMLDivElement>(null);

  const scrollToIgBottom = () => {
    igChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (simChannel === 'instagram') {
      scrollToIgBottom();
    }
  }, [igMessages, igIsTyping, simChannel]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addBotMessage = (
    text: string,
    buttons?: { text: string; action: () => void; variant?: 'default' | 'danger' | 'success' | 'outline' }[],
    isRedFlag = false
  ) => {
    const newMsg: BotMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buttons,
      isRedFlag,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const addUserMessage = (text: string) => {
    const newMsg: BotMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Main 7-item Menu according to Author's Strict Priority
  const getMainButtons = (): { text: string; action: () => void; variant?: 'default' | 'danger' | 'success' | 'outline' }[] => [
    { text: '🤖 Супер-ассистент', action: () => handleSelectSection('assistant'), variant: 'success' },
    { text: '📚 База знаний', action: () => handleSelectSection('knowledge') },
    { text: '💊 Моя база препаратов', action: () => handleSelectSection('medications') },
    { text: '🏋️‍♂️ Система тренировок', action: () => handleSelectSection('workout') },
    { text: '🌿 1-й месяц: Настройка ЖКТ', action: () => handleSelectSection('gastro_month1') },
    { text: '📩 Связаться с @DonDearOfficina', action: () => handleSelectSection('dondear') },
    { text: '⚙️ Профиль', action: () => handleSelectSection('profile') },
  ];

  const getBackButton = () => ({
    text: '◀️ В главное меню',
    action: () => returnToMainMenu(),
    variant: 'outline' as const,
  });

  const returnToMainMenu = () => {
    setActiveSubView('idle');
    addUserMessage('◀️ В меню');
    addBotMessage('🏛 <b>Главное меню @DonDearOfficinaAI</b>\n\n<i>Выберите раздел:</i>', getMainButtons());
  };

  const handleStartCommand = (customArgs?: string) => {
    setMessages([]);
    setActiveSubView('idle');
    addUserMessage(customArgs ? `/start ${customArgs}` : '/start');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let inviteResult = '';
      let isInstagramTransition = false;
      let funnelInfo = '';

      if (customArgs && customArgs.startsWith('inv_')) {
        const raw = customArgs.replace('inv_', '');
        const res = consumeInvite(raw);
        inviteResult = res.success ? `\n\n🎉 ${res.message}` : `\n\n⚠️ ${res.message}`;
      } else if (customArgs && customArgs.startsWith('ig_')) {
        isInstagramTransition = true;
        const kw = customArgs.replace('ig_', '').toUpperCase();
        funnelInfo =
          `\n\n🚀 <b>ПЕРЕХОД ИЗ INSTAGRAM DIRECT ЗАФИКСИРОВАН!</b>\n` +
          `Триггер: <code>${kw}</code>. Авторский протокол буста доставлен в сессию.\n\n` +
          `Автоворонка переведена на <b>Шаг 2: Основа основ (Настройка ЖКТ ➔ Снятие застоев ➔ Нейробуст)</b>.`;

        // If lead exists, advance step
        const lead = funnelLeads.find((l) => l.channel === 'instagram');
        if (lead) {
          advanceFunnelStep(lead.id);
        }
      }

      const welcomeText =
        `👋 Здравствуйте, <b>${currentUser.first_name}</b>!\n\n` +
        `Добро пожаловать в Telegram-бот <b>@DonDearOfficinaAI</b>.\n` +
        `Автор системы: <b>@DonDearOfficina</b> (дипломированный провизор).\n\n` +
        `<b>КОНЦЕПЦИЯ СИСТЕМЫ (CAUSE-FIRST):</b>\n` +
        `Основа основ всей системы — <b>настройка работы ЖКТ</b> и <b>ликвидация венозно-лимфатических застоев</b>. ` +
        `Пока не восстановлен желчеотток и эпителий кишечника, а также сохраняется венозный застой в малом тазу, стимулировать нервную систему бессмысленно и вредно.\n\n` +
        `<b>ПОШАГОВЫЙ ПЛАН ПРОХОЖДЕНИЯ СИСТЕМЫ:</b>\n` +
        `🌿 <b>1. Первое задание (1-й месяц):</b> Настройка работы ЖКТ (Хофитол + Энтерол) — запуск эмульгации и регенерация щеточной каймы энтероцитов.\n` +
        `🏋️‍♂️ <b>2. Система тренировок:</b> Запуск гормонального фона через устранение застоев в малом тазу, активация простаты и моторики ЖКТ (старт: приседы в отказ + икры + фулбоди).\n` +
        `💊 <b>3. Мой стек препаратов:</b> 33 препарата с детальным разбором мета-анализов РКИ и биохимических механизмов.\n\n` +
        `⚠️ <b>ДИСКЛЕЙМЕР:</b>\n` +
        `Личный опыт, разбор открытых данных.${inviteResult}${funnelInfo}\n\n` +
        `<i>Начните с 1-го месяца или выберите раздел:</i>`;

      if (isInstagramTransition) {
        addBotMessage(welcomeText, [
          { text: '🌿 Начать 1-й месяц: Настройка ЖКТ', action: () => handleSelectSection('gastro_month1'), variant: 'success' },
          { text: '🏋️‍♂️ Система тренировок (Снятие застоев)', action: () => handleSelectSection('workout') },
          { text: '💊 Мой стек препаратов (с мета-анализами)', action: () => handleSelectSection('medications') },
          { text: '🤖 Супер-ассистент (Gemini AI)', action: () => handleSelectSection('assistant') },
          getBackButton(),
        ]);
      } else {
        addBotMessage(welcomeText, [
          { text: '🌿 Начать 1-й месяц: Настройка ЖКТ', action: () => handleSelectSection('gastro_month1'), variant: 'success' },
          ...getMainButtons(),
        ]);
      }
    }, 350);
  };

  useEffect(() => {
    handleStartCommand();
  }, []);

  // Section Routing
  const handleSelectSection = (section: string) => {
    if (section === 'assistant') {
      addUserMessage('🤖 Супер-ассистент');
      renderSuperAssistantHub();
    } else if (section === 'knowledge') {
      addUserMessage('📚 База знаний');
      renderKnowledgeNotesHub();
    } else if (section === 'medications') {
      addUserMessage('💊 Моя база препаратов');
      renderMedicationsHub();
    } else if (section === 'workout') {
      addUserMessage('🏋️‍♂️ Система тренировок');
      renderWorkoutHub();
    } else if (section === 'gastro_month1') {
      addUserMessage('🌿 1-й месяц: Настройка ЖКТ');
      renderGastroMonth1Hub();
    } else if (section === 'dondear') {
      addUserMessage('📩 Связаться с @DonDearOfficina');
      renderDonDearContactHub();
    } else if (section === 'profile') {
      addUserMessage('⚙️ Профиль');
      renderProfileHub();
    }
  };

  // ==========================================
  // 1. РАЗДЕЛ «1-Й МЕСЯЦ: НАСТРОЙКА ЖКТ» (ОСНОВА ОСНОВ)
  // ==========================================
  const renderGastroMonth1Hub = () => {
    const text =
      '🌿 <b>1-Й МЕСЯЦ: НАСТРОЙКА РАБОТЫ ЖКТ (ОСНОВА ОСНОВ)</b>\n\n' +
      '<b>ПОЧЕМУ ВСЁ НАЧИНАЕТСЯ С ЖКТ:</b>\n' +
      'Как дипломированный провизор утверждаю: <i>любые ноотропы, микроэлементы и прекурсоры нейромедиаторов бессильны, если нарушена биодоступность в тонком кишечнике.</i>\n\n' +
      '1. <b>Желчеотток и эмульгация липидов:</b> При холестазе не формируются смешанные мицеллы. Жирорастворимые кофакторы (витамин D, омега-3, коэнзим Q10) транзитом покидают организм, вызывая гниение и дисбиоз.\n' +
      '2. <b>Барьер слизистой (Leaky Gut):</b> Воспаление щеточной каймы энтероцитов приводит к прорыву бактериального липополисахарида (LPS) в портальный кровоток, вызывая системное микроглиальное нейровоспаление.\n\n' +
      '<b>ПРЕПАРАТЫ 1-ГО МЕСЯЦА, КОТОРЫЕ Я ИСПОЛЬЗОВАЛ И ИСПОЛЬЗУЮ:</b>\n\n' +
      '1️⃣ <b>Хофитол</b> (стандартизованный сухой водный экстракт листьев артишока)\n' +
      '• <i>Режим:</i> 2 таб. × 3 р/сут за 20 мин до еды.\n' +
      '• <i>Зачем в стеке:</i> Нормализует реологию желчи, раскрывает сфинктер Одди, запускает мицеллообразование и выводит токсические метаболиты.\n' +
      '• <i>Мета-анализы (РКИ):</i> Достоверное улучшение билиарной эвакуации, снижение холестерина и диспепсии — <code>PMID:27385377, PMID:30844446</code>.\n\n' +
      '2️⃣ <b>Энтерол</b> (Saccharomyces boulardii CNCM I-745)\n' +
      '• <i>Режим:</i> 250 мг 2 р/сут за 1 час до еды (курс 14–30 дней).\n' +
      '• <i>Зачем в стеке:</i> Восстановление плотных контактов (tight junctions: окклюдин, зонулин-1), синтез секреторного IgA, блокада бактериального эндотоксикоза (LPS).\n' +
      '• <i>Мета-анализы (РКИ):</i> Уровень доказательности A в защите кишечного барьера и подавлении патобиоты — <code>PMID:31430198, PMID:25157183</code>.\n\n' +
      '⚠️ <i>Личный опыт, разбор открытых данных.</i>';

    addBotMessage(text, [
      {
        text: '💊 Карточка: Хофитол (детали & мета-анализ)',
        action: () => {
          const m = medications.find((x) => x.name.toLowerCase().includes('хофитол'));
          if (m) renderSingleMedCard(m);
        },
      },
      {
        text: '💊 Карточка: Энтерол (детали & мета-анализ)',
        action: () => {
          const m = medications.find((x) => x.name.toLowerCase().includes('энтерол'));
          if (m) renderSingleMedCard(m);
        },
      },
      {
        text: '🏋️‍♂️ Шаг 2: Перейти к тренировкам (снятие застоев)',
        action: () => handleSelectSection('workout'),
        variant: 'success',
      },
      {
        text: '🤖 Спросить ассистента по ЖКТ-протоколу',
        action: () => handleAskAssistant('Объясни подробнее биохимию первого месяца настройки ЖКТ: Хофитол и Энтерол с метаанализами'),
      },
      getBackButton(),
    ]);
  };

  // ==========================================
  // 2. РАЗДЕЛ «СИСТЕМА ТРЕНИРОВОК» (ГОРМОНАЛЬНЫЙ ЗАПУСК & СНЯТИЕ ЗАСТОЕВ)
  // ==========================================
  const renderWorkoutHub = () => {
    const completedCount = workoutExercises.filter((e) => e.is_completed).length;
    const text =
      '🏋️‍♂️ <b>СИСТЕМА КОМПЛЕКСНЫХ ТРЕНИРОВОК С ПРИОРИТЕТОМ НОГ</b>\n' +
      '<i>Продолжительность: 45–60 минут | Автор: @DonDearOfficina</i>\n\n' +
      '<b>ОСНОВНАЯ КОНЦЕПЦИЯ:</b>\n' +
      'Методика основана на комплексной силовой тренировке всего тела продолжительностью 45–60 минут. ' +
      'Её ключевые особенности — <b>начало с икроножных мышц и приседаний</b>, высокая интенсивность, ' +
      '<b>свободное чередование упражнений</b> на разные мышечные группы и постепенное увеличение рабочих весов.\n\n' +
      '<b>ПРИНЦИПЫ И СТРУКТУРА:</b>\n' +
      '1. <b>Начало тренировки:</b>\n' +
      '   • <b>1. Икроножные мышцы:</b> 2 рабочих подхода (15–25 повт., пауза 2 сек вверху). Периферический венозный насос голени.\n' +
      '   • <b>2. Приседания:</b> 2 рабочих подхода <b>В ОТКАЗ</b> своим весом или с отягощением (с разминочными сетами перед тяжелыми движениями). Запуск кровотока малого таза, дренаж простаты, выброс тестостерона.\n' +
      '2. <b>Комплексная проработка мышц (Фулбоди):</b>\n' +
      '   • 2 упражнения на грудь (по 2 подхода)\n' +
      '   • 2 упражнения на спину (по 2 подхода)\n' +
      '   • 2 упражнения на плечи (по 2 подхода)\n' +
      '   • <b>2 дополнительных упражнения на ноги</b> (разгибания/сгибания голени по 2 подхода)\n' +
      '   • <b>Ягодичные мышцы прорабатываются отдельно</b> (мостик с фиксацией 2–3 сек)\n' +
      '   • Дополнительно (по целям и времени): руки (бицепс/трицепс), пресс.\n' +
      '3. <b>Свободное чередование упражнений:</b>\n' +
      '   Тренировка не требует жесткого завершения всех подходов одной группы подряд. ' +
      '   Вы можете свободно переходить между тренажерами по мере доступности и усталости, используя паузы как <i>активный отдых</i> для мышц-антагонистов.\n' +
      '4. <b>Интенсивность:</b> 2 предельно интенсивных подхода на каждое упражнение с ориентацией на мышечный отказ.\n\n' +
      `Прогресс выполнения сегодня: <b>${completedCount} из ${workoutExercises.length}</b>\n\n` +
      '<i>Выберите упражнение для разбора техники и отметки:</i>';

    addBotMessage(text, [
      {
        text: '🦶 1. СТАРТ: Икроножные мышцы (2 подхода)',
        action: () => renderWorkoutExerciseDetail('ex_calves'),
        variant: 'success',
      },
      {
        text: '🦵 2. СТАРТ: Приседания (2 подхода В ОТКАЗ)',
        action: () => renderWorkoutExerciseDetail('ex_squats'),
        variant: 'success',
      },
      { text: '💪 3. Грудные мышцы (2 упр.)', action: () => renderWorkoutGroup('chest') },
      { text: '🔙 4. Мышцы спины (2 упр.)', action: () => renderWorkoutGroup('back') },
      { text: '🎯 5. Плечевой пояс (2 упр.)', action: () => renderWorkoutGroup('shoulders') },
      { text: '🦵 6. Доп. упражнения на ноги (2 упр.)', action: () => renderWorkoutGroup('legs_additional') },
      { text: '🍑 7. Ягодичные мышцы (отдельно)', action: () => renderWorkoutExerciseDetail('ex_glutes_1') },
      { text: '🔥 8. Дополнительно: Руки / Пресс', action: () => renderWorkoutExerciseDetail('ex_optional_arms_core') },
      {
        text: '🌿 1-й месяц: Настройка ЖКТ',
        action: () => handleSelectSection('gastro_month1'),
      },
      getBackButton(),
    ]);
  };

  const renderWorkoutGroup = (group: 'chest' | 'back' | 'shoulders' | 'legs_additional') => {
    const titles = {
      chest: 'Грудные мышцы (2 упражнения)',
      back: 'Мышцы спины (2 упражнения)',
      shoulders: 'Плечевой пояс (2 упражнения)',
      legs_additional: 'Дополнительные упражнения на ноги (2 упражнения)',
    };
    addUserMessage(`Упражнения: ${titles[group]}`);
    const items = workoutExercises.filter((e) => e.muscle_group === group);

    const buttons = items.map((ex) => ({
      text: `${ex.is_completed ? '✅' : '⚪️'} ${ex.name.slice(0, 34)}...`,
      action: () => renderWorkoutExerciseDetail(ex.id),
    }));
    buttons.push({ text: '◀️ К плану тренировки', action: () => renderWorkoutHub() });
    buttons.push(getBackButton());

    addBotMessage(`Блок «<b>${titles[group]}</b>» (по 2 рабочих подхода в отказ, свободное чередование):\nВыберите упражнение:`, buttons);
  };

  const renderWorkoutExerciseDetail = (exerciseId: string) => {
    const ex = workoutExercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    addUserMessage(ex.name);

    const text =
      `🏋️‍♂️ <b>${ex.muscle_title.toUpperCase()}</b>\n` +
      `<b>${ex.name}</b>\n\n` +
      `• <b>Подходы:</b> ${ex.sets}\n` +
      `• <b>Повторения:</b> ${ex.reps}\n` +
      `• <b>Техника и регламент автора:</b> ${ex.notes}\n\n` +
      `⚡ <b>ФИЗИОЛОГИЧЕСКИЙ & ГОРМОНАЛЬНЫЙ МЕХАНИЗМ:</b>\n${ex.hormonal_mechanism}\n\n` +
      `Статус: <b>${ex.is_completed ? '✅ Выполнено' : '⚪️ Не выполнено'}</b>\n\n` +
      `⚠️ <i>Личный опыт, разбор открытых данных.</i>`;

    addBotMessage(text, [
      {
        text: ex.is_completed ? 'Снять отметку о выполнении' : '✅ Отметить выполненным',
        action: () => {
          toggleWorkoutExercise(ex.id);
          addUserMessage(ex.is_completed ? 'Отменить выполнение' : 'Отмечено выполненным');
          setTimeout(() => renderWorkoutExerciseDetail(ex.id), 150);
        },
        variant: ex.is_completed ? 'outline' : 'success',
      },
      { text: '◀️ К структуре тренировок', action: () => renderWorkoutHub() },
      getBackButton(),
    ]);
  };

  // ==========================================
  // 3. РАЗДЕЛ «МОЯ БАЗА ПРЕПАРАТОВ» (АВТОРСКИЙ СТЕК С МЕТА-АНАЛИЗАМИ)
  // ==========================================
  const renderMedicationsHub = () => {
    const text =
      '💊 <b>МОЯ БАЗА ПРЕПАРАТОВ (АВТОРСКИЙ СТЕК)</b>\n\n' +
      '<b>ВЕКТОР:</b> <i>1. ЖКТ-фундамент ➔ 2. Старт нейробуста ➔ 3. Микронутриенты & Продолжение нейробуста ➔ 4. Раздел «Поддержка».</i>\n\n' +
      'Контур сужен на <b>мой личный стек</b> препаратов, витаминов и БАД, которые я использовал и использую.\n' +
      'Каждое вещество классифицировано по <b>законодательству РФ</b> (Лекарственные препараты в ГРЛС / Витамины и минералы / БАД) ' +
      'с доказательной информацией из <b>мета-анализов РКИ со ссылками на PubMed/DOI</b>.\n\n' +
      `Статус авторского протокола в вашем профиле: <b>${
        currentUser.on_author_protocol ? '💎 Активен (on_author_protocol=true)' : '⚪️ Не активен'
      }</b>`;

    addBotMessage(text, [
      { text: '🌿 1-й месяц: ЖКТ-фундамент (Хофитол, Энтерол)', action: () => renderMedPhaseList(1), variant: 'success' },
      { text: '🧠 2-й месяц: Нейробуст старт (Фенотропил, Глиатилин, Креатин, Цитруллин)', action: () => renderMedPhaseList(2) },
      { text: '🛡 3-й месяц: Микронутриенты & Продолжение нейробуста', action: () => renderMedPhaseList(3), variant: 'success' },
      { text: '📦 Раздел «Поддержка» (Вспомогательный стек за год)', action: () => renderMedPhaseList(4) },
      { text: '⚖️ Регистрация в законодательстве РФ (ЛС / Витамины / БАД)', action: () => renderRfLegalClassificationList() },
      { text: '📊 Доказательная база мета-анализов (РКИ)', action: () => renderMetaAnalysisEvidenceList() },
      { text: '🟢 Все препараты стека (@DonDearOfficina)', action: () => renderMedSubcategory('active') },
      {
        text: currentUser.on_author_protocol ? 'Отключить флаг следования' : '🚀 Следовать авторскому стеку',
        action: () => {
          toggleAuthorProtocol();
          addUserMessage('Сменить статус следования стеку');
          addBotMessage(
            `Статус следования стеку: <b>${
              !currentUser.on_author_protocol ? 'Активирован' : 'Отключен'
            }</b>. Супер-ассистент будет автоматически сверять взаимодействия с этим стеком!`,
            [getBackButton()]
          );
        },
        variant: currentUser.on_author_protocol ? 'outline' : 'success',
      },
      getBackButton(),
    ]);
  };

  const renderMedPhaseList = (phase: 1 | 2 | 3 | 4) => {
    const titles: Record<number, string> = {
      1: '🌿 1-й месяц: ЖКТ-фундамент',
      2: '🧠 2-й месяц: Нейробуст & Энергия (Старт)',
      3: '🛡 3-й месяц: Микронутриенты & Продолжение нейробуста',
      4: '📦 Раздел «Поддержка»: Дополнительные препараты и БАД за год',
    };
    addUserMessage(titles[phase]);

    const items = medications.filter((m) => m.month_phase === phase);

    let content = `<b>${titles[phase].toUpperCase()}</b>\n\n`;

    if (phase === 3) {
      content +=
        '💡 <b>РЕГЛАМЕНТ 3-ГО МЕСЯЦА (ПРОДОЛЖЕНИЕ НЕЙРОБУСТА + МИКРОНУТРИЕНТЫ):</b>\n' +
        '• <b>Фенотропил:</b> продолжается 2-й месяц (курс рассчитан строго на 2 месяца: 2-й и 3-й месяцы).\n' +
        '• <b>Глиатилин, Креатин и L-Цитруллин:</b> базовый постоянный стек — принимаются <b>минимум от 6 месяцев до 1 года</b>!\n' +
        '• <b>Микронутриентный пул:</b> Ферлатум Фол (железо) утром с витамином С, Цинк в обед (разносить с железом на 4 часа из-за DMT-1), Селен вечером, Витамин D3 и Йодомарин.\n\n';
    } else if (phase === 4) {
      content +=
        '📦 <b>РАЗДЕЛ «ПОДДЕРЖКА»:</b>\n' +
        'Вспомогательные препараты, витамины и БАД, которые использовались автором в течение года либо могут подключаться ситуационно/курсами с разбором законодательного статуса РФ и мета-анализов.\n\n';
    }

    if (items.length === 0) {
      content += '<i>В этой фазе препараты не найдены.</i>\n';
    } else {
      items.forEach((m, idx) => {
        const legalTag =
          m.legal_category_rf === 'medicine'
            ? '💊 Лекарственный препарат (ГРЛС)'
            : m.legal_category_rf === 'vitamin_mineral'
            ? '🟢 Витамины и минералы'
            : '🟡 БАД к пище';

        const metaRefs = m.meta_analysis_refs?.length
          ? m.meta_analysis_refs.join(', ')
          : 'PMID: ' + (m.evidence_refs?.join(', ') || 'Ограничены');

        content +=
          `<b>${idx + 1}. ${m.name}</b> [${legalTag}]\n` +
          `• <b>Действующее вещество:</b> ${m.active_ingredient || '—'}\n` +
          `• <b>Режим & Дозировка:</b> ${m.dose || '—'} (${m.schedule || '—'})\n` +
          (m.duration_course ? `• <b>Курс приема:</b> <i>${m.duration_course}</i>\n` : '') +
          (m.why_in_stack ? `• <b>Зачем в моем стеке:</b> ${m.why_in_stack}\n` : `• <b>Зачем:</b> ${m.notes || '—'}\n`) +
          (m.meta_analysis_summary ? `• <b>Мета-анализы (РКИ):</b> ${m.meta_analysis_summary}\n` : '') +
          `• <b>PMID/DOI:</b> <code>${metaRefs}</code>\n\n`;
      });
    }

    content += '⚠️ <i>Личный опыт, разбор открытых данных.</i>';

    const buttons = items.map((m) => ({
      text: `🔍 Карточка: ${m.name.slice(0, 30)}`,
      action: () => renderSingleMedCard(m),
    }));
    buttons.push({ text: '◀️ К разделам препаратов', action: () => renderMedicationsHub() });
    buttons.push(getBackButton());

    addBotMessage(content, buttons);
  };

  const renderRfLegalClassificationList = () => {
    addUserMessage('⚖️ Классификация по законодательству РФ');

    const medicines = medications.filter((m) => m.legal_category_rf === 'medicine');
    const vitamins = medications.filter((m) => m.legal_category_rf === 'vitamin_mineral');
    const supplements = medications.filter((m) => m.legal_category_rf === 'supplement');

    const content =
      '⚖️ <b>КЛАССИФИКАЦИЯ ПРЕПАРАТОВ ПО ЗАКОНОДАТЕЛЬСТВУ РФ</b>\n' +
      '<i>Государственный реестр лекарственных средств (ГРЛС) и реестр БАД:</i>\n\n' +
      '💊 <b>1. ЛЕКАРСТВЕННЫЕ ПРЕПАРАТЫ (ГРЛС):</b>\n' +
      medicines.map((m) => `• <b>${m.name}</b> (${m.active_ingredient}) — ${m.duration_course || m.dose || 'по назначению'}`).join('\n') +
      '\n\n' +
      '🟢 <b>2. ВИТАМИНЫ И МИНЕРАЛЫ (Фармацевтические формы & монопрепараты):</b>\n' +
      vitamins.map((m) => `• <b>${m.name}</b> (${m.active_ingredient}) — ${m.duration_course || m.dose || 'курсовой'}`).join('\n') +
      '\n\n' +
      '🟡 <b>3. БАД (Биологически активные добавки к пище):</b>\n' +
      supplements.map((m) => `• <b>${m.name}</b> (${m.active_ingredient}) — ${m.duration_course || m.dose || 'длительно'}`).join('\n') +
      '\n\n' +
      '⚠️ <i>Личный опыт, разбор открытых данных.</i>';

    addBotMessage(content, [
      { text: '🛡 3-й месяц (Микронутриенты & Нейробуст)', action: () => renderMedPhaseList(3), variant: 'success' },
      { text: '📦 Раздел «Поддержка»', action: () => renderMedPhaseList(4) },
      { text: '◀️ К разделам препаратов', action: () => renderMedicationsHub() },
      getBackButton(),
    ]);
  };

  const renderMetaAnalysisEvidenceList = () => {
    addUserMessage('📊 Мета-анализы и доказательная база');
    const itemsWithMeta = medications.filter((m) => m.meta_analysis_summary || (m.meta_analysis_refs && m.meta_analysis_refs.length > 0));

    let content =
      '📊 <b>ДОКАЗАТЕЛЬНАЯ БАЗА МЕТА-АНАЛИЗОВ ПО ПРЕПАРАТАМ СТЕКА</b>\n\n' +
      'Каждое назначение в авторском стеке подтверждено мета-анализами рандомизированных контролируемых исследований (РКИ, уровень A–B):\n\n';

    itemsWithMeta.forEach((m, idx) => {
      const refs = m.meta_analysis_refs?.join(', ') || m.evidence_refs?.join(', ') || '';
      content +=
        `<b>${idx + 1}. ${m.name}</b> (${m.active_ingredient || '—'})\n` +
        `• <b>Вывод мета-анализов:</b> ${m.meta_analysis_summary || m.notes}\n` +
        `• <b>Ссылки (PMID/DOI):</b> <code>${refs}</code>\n\n`;
    });

    content += '⚠️ <i>Личный опыт, разбор открытых данных.</i>';

    addBotMessage(content, [
      { text: '◀️ К разделам препаратов', action: () => renderMedicationsHub() },
      getBackButton(),
    ]);
  };

  const renderSingleMedCard = (m: Medication) => {
    addUserMessage(m.name);
    const refs = m.meta_analysis_refs?.length ? m.meta_analysis_refs.join(', ') : m.evidence_refs?.join(', ') || 'Данные ограничены';
    const dates = m.start_date ? ` (старт: ${m.start_date}${m.end_date ? `, до: ${m.end_date}` : ''})` : '';

    const phaseLabel =
      m.month_phase === 1
        ? '🌿 1-й месяц (ЖКТ-фундамент)'
        : m.month_phase === 2
        ? '🧠 2-й месяц (Нейробуст старт)'
        : m.month_phase === 3
        ? '🛡 3-й месяц (Микронутриенты & Продолжение нейробуста)'
        : m.month_phase === 4
        ? '📦 Раздел «Поддержка»'
        : 'Курсовой препарат';

    const rfLabel =
      m.legal_category_rf === 'medicine'
        ? '💊 Лекарственный препарат (ГРЛС)'
        : m.legal_category_rf === 'vitamin_mineral'
        ? '🟢 Витамины и минералы'
        : '🟡 БАД к пище';

    const content =
      `💊 <b>${m.name}</b>\n` +
      `[<b>${phaseLabel}</b> | <b>${rfLabel}</b>]\n\n` +
      `• <b>Действующее вещество:</b> ${m.active_ingredient || 'Не указано'}\n` +
      `• <b>Дозировка и режим:</b> ${m.dose || '—'} (${m.schedule || '—'})${dates}\n` +
      (m.duration_course ? `• <b>Курс приема:</b> <i>${m.duration_course}</i>\n` : '') +
      (m.why_in_stack ? `• <b>Зачем в моем стеке:</b> ${m.why_in_stack}\n` : `• <b>Зачем:</b> ${m.notes || '—'}\n`) +
      (m.meta_analysis_summary ? `• <b>Доказательная база мета-анализов:</b> ${m.meta_analysis_summary}\n` : '') +
      `• <b>Ссылки на мета-анализы / PMID:</b> <code>${refs}</code>\n` +
      (m.clarification_note ? `• <b>Примечание автора:</b> <i>${m.clarification_note}</i>\n` : '') +
      `\n⚠️ <i>Личный опыт, разбор открытых данных.</i>`;

    addBotMessage(content, [
      {
        text: '🤖 Проверить взаимодействия с этим препаратом',
        action: () => handleAskAssistant(`Расскажи о совместимости и взаимодействиях препарата ${m.name} (${m.active_ingredient}) с другими добавками стека`),
      },
      { text: '◀️ К списку препаратов', action: () => renderMedicationsHub() },
      getBackButton(),
    ]);
  };

  const renderMedSubcategory = (status: 'active' | 'pending' | 'archive' | 'needs_clarification') => {
    const statusTitles = {
      active: '🟢 Активные препараты стека',
      pending: '⏳ Ожидающие старта',
      archive: '📁 Архивные и курсовые препараты',
      needs_clarification: '❓ Требующие уточнения (needs_clarification)',
    };
    addUserMessage(statusTitles[status]);

    const items = medications.filter((m) => m.status === status);

    let content = `<b>${statusTitles[status]}</b>\n\n`;
    if (status === 'needs_clarification') {
      content += '<i>⚠️ Препараты с неуточненным составом не включаются в active до верификации формулы:</i>\n\n';
    }

    if (items.length === 0) {
      content += '<i>В этой категории сейчас нет записей.</i>\n';
    } else {
      items.forEach((m, idx) => {
        const refs = m.meta_analysis_refs?.length ? m.meta_analysis_refs.join(', ') : m.evidence_refs?.join(', ') || 'Данные ограничены';
        content +=
          `<b>${idx + 1}. ${m.name}</b>\n` +
          `• <b>Действующее вещество:</b> ${m.active_ingredient || 'Не указано'}\n` +
          `• <b>Доза и время:</b> ${m.dose || '—'} (${m.schedule || '—'})\n` +
          (m.why_in_stack ? `• <b>Зачем в стеке:</b> ${m.why_in_stack}\n` : `• <b>Зачем:</b> ${m.notes || '—'}\n`) +
          `• <b>PMID/DOI:</b> <code>${refs}</code>\n\n`;
      });
    }

    content += '⚠️ <i>Личный опыт, разбор открытых данных.</i>';

    addBotMessage(content, [
      { text: '◀️ К разделам препаратов', action: () => renderMedicationsHub() },
      getBackButton(),
    ]);
  };

  // ==========================================
  // 4. РАЗДЕЛ «БАЗА ЗНАНИЙ» (ВКЛЮЧАЯ ИСЛАМСКУЮ МЕДИЦИНУ)
  // ==========================================
  const renderKnowledgeNotesHub = () => {
    const text =
      '📚 <b>БАЗА ЗНАНИЙ @DonDearOfficina</b>\n\n' +
      'Личные экспертные заметки владельца (дипломированный провизор): ' +
      'настройка ЖКТ, нейромедиаторы, андрология, доказательная фармация, а также доказательный разбор средств исламской медицины.\n\n' +
      '<i>Выберите тему:</i>';

    const topics = [
      'Все темы',
      'ЖКТ и всасывание',
      'Исламская медицина (доказательный разбор)',
      'Нейробиология',
      'Андрология',
      'Фармакология',
      'Биохакинг',
      'Протоколы',
    ];
    const buttons: { text: string; action: () => void; variant?: 'default' | 'danger' | 'success' | 'outline' }[] = topics.map((t) => ({
      text: t === 'ЖКТ и всасывание' ? '🌿 ЖКТ и всасывание' : t === 'Исламская медицина (доказательный разбор)' ? '🕌 Исламская медицина' : t,
      action: () => renderKnowledgeTopic(t),
    }));
    buttons.push({
      text: '🕌 Монографии исламской медицины (10 средств с РКИ)',
      action: () => renderIslamicMedicineInKnowledgeHub(),
      variant: 'success',
    });
    buttons.push(getBackButton());

    addBotMessage(text, buttons);
  };

  const renderKnowledgeTopic = (topic: string) => {
    addUserMessage(`Тема: ${topic}`);
    const filtered =
      topic === 'Все темы' ? knowledgeNotes : knowledgeNotes.filter((n) => n.topic === topic);

    if (filtered.length === 0) {
      addBotMessage(
        `В теме «${topic}» пока нет заметок.`,
        [{ text: '◀️ К темам', action: () => renderKnowledgeNotesHub() }, getBackButton()]
      );
      return;
    }

    const buttons = filtered.map((n) => ({
      text: `📖 ${n.title.slice(0, 34)}...`,
      action: () => renderKnowledgeCard(n),
    }));
    buttons.push({ text: '◀️ К темам базы знаний', action: () => renderKnowledgeNotesHub() });
    buttons.push(getBackButton());

    addBotMessage(`Заметок в разделе [${topic}]: <b>${filtered.length}</b>`, buttons);
  };

  const renderKnowledgeCard = (note: KnowledgeNote) => {
    addUserMessage(note.title);
    const content =
      `📚 <b>[${note.topic.toUpperCase()}]</b>\n` +
      `<b>${note.title}</b>\n\n` +
      `${note.body}\n\n` +
      `🔬 <b>Источники / PMID:</b> <code>${note.evidence_refs.join(', ')}</code>\n\n` +
      `<i>Автор: @DonDearOfficina (дипломированный провизор).</i>\n\n` +
      `⚠️ <i>Личный опыт, разбор открытых данных.</i>`;

    addBotMessage(content, [
      {
        text: '💬 Задать вопрос автору лично',
        action: () => window.open('https://t.me/DonDearOfficina', '_blank'),
        variant: 'success',
      },
      { text: '◀️ Назад к базе знаний', action: () => renderKnowledgeNotesHub() },
      getBackButton(),
    ]);
  };

  // Evidence-based Islamic Medicine Monographs inside Knowledge Base
  const renderIslamicMedicineInKnowledgeHub = () => {
    addUserMessage('🕌 Монографии исламской медицины');
    const text =
      '🕌 <b>ИСЛАМСКАЯ МЕДИЦИНА (ДОКАЗАТЕЛЬНЫЙ РАЗБОР)</b>\n\n' +
      '<b>ПРАВИЛО РАЗДЕЛА:</b>\n' +
      'Религиозные тексты приводятся исключительно как историко-культурный контекст. ' +
      'Клиническая ценность и механизмы оцениваются строго по международным уровням РКИ (A–F) со ссылками на PubMed/OpenFDA.\n\n' +
      '<i>Выберите средство для клинического разбора:</i>';

    const buttons = islamicRemedies.map((item) => ({
      text: `${item.name_ru} (${item.name_ar || ''}) [${item.evidence_level}]`,
      action: () => renderIslamicCard(item),
    }));
    buttons.push({ text: '◀️ Назад к базе знаний', action: () => renderKnowledgeNotesHub() });
    buttons.push(getBackButton());

    addBotMessage(text, buttons);
  };

  const renderIslamicCard = (item: IslamicRemedy) => {
    addUserMessage(item.name_ru);
    const text =
      `🌿 <b>${item.name_ru}</b> ${item.name_ar ? `(араб. <i>${item.name_ar}</i>)` : ''}\n` +
      `<i>${item.name_lat || ''}</i> • [<b>Уровень доказательности: ${item.evidence_level}</b>]\n\n` +
      `• <b>Активные молекулы:</b> ${item.active_components}\n` +
      `• <b>Научная база РКИ:</b> ${item.scientific_evidence}\n` +
      `• <b>Источники (PMID/DOI):</b> <code>${item.evidence_refs.join(', ')}</code>\n\n` +
      `⚠️ <b>Противопоказания (OpenFDA):</b>\n` +
      item.contraindications.map((c) => `  - ${c}`).join('\n') +
      `\n\n` +
      `🕌 <b>Традиционный контекст (исторический, НЕ efficacy):</b>\n${item.traditional_use}\n\n` +
      (item.personal_experience
        ? `👤 <b>Личный опыт владельца (@DonDearOfficina, не РКИ):</b>\n${item.personal_experience}\n• <i>Режим:</i> ${
            item.personal_dose || '—'
          }\n`
        : '👤 <i>Владелец не включал данное средство в личный активный стек.</i>\n') +
      `\n⚠️ <i>Личный опыт, разбор открытых данных.</i>`;

    addBotMessage(text, [
      { text: '◀️ К списку средств исламской медицины', action: () => renderIslamicMedicineInKnowledgeHub() },
      { text: '📚 В базу знаний', action: () => renderKnowledgeNotesHub() },
      getBackButton(),
    ]);
  };

  // ==========================================
  // 4. РАЗДЕЛ «СУПЕР-АССИСТЕНТ» (ЯДРО)
  // ==========================================
  const renderSuperAssistantHub = () => {
    const text =
      '🤖 <b>СУПЕР-АССИСТЕНТ @DonDearOfficina (Gemini 3.8 Flash)</b>\n\n' +
      '<b>ФИЛОСОФИЯ (CAUSE-FIRST):</b>\n' +
      'Сначала выявляем разрыв в каскаде (ЖКТ ➔ нейромедиаторы ➔ микронутриенты), затем подбираем действия доказательного ряда A–F.\n\n' +
      '• Каждое утверждение — со ссылкой на <b>PMID/DOI</b>.\n' +
      '• Автоматическая сверка взаимодействий с активным стеком владельца.\n' +
      '• Красные флаги (острая боль, судороги, одышка) ➔ немедленный вызов 112.\n\n' +
      '<i>Выберите частый клинический вопрос или напишите свой симптом в строку ввода:</i>';

    addBotMessage(text, [
      {
        text: '❓ «Хроническая сонливость и туман в голове»',
        action: () => handleAskAssistant('Хроническая дневная сонливость, упадок энергии и туман в голове'),
      },
      {
        text: '❓ «Как правильно совмещать железо и цинк?»',
        action: () => handleAskAssistant('Как правильно совмещать железо (Ферлатум) и цинк, чтобы не блокировать всасывание?'),
      },
      {
        text: '❓ «Чёрный тмин: механизм и тимохинон»',
        action: () => handleAskAssistant('Расскажи о доказательной базе черного тмина и тимохинона с PMID'),
      },
      {
        text: '🚨 Тест Красного Флага (Боль за грудиной)',
        action: () => handleAskAssistant('Острая давящая боль за грудиной, одышка в покое и слабость'),
        variant: 'danger',
      },
      getBackButton(),
    ]);
  };

  const handleAskAssistant = async (queryText: string) => {
    addUserMessage(queryText);
    setIsTyping(true);

    try {
      const result = await queryAssistant(queryText);
      setIsTyping(false);

      if (result.isRedFlag) {
        addBotMessage(
          result.answer,
          [
            {
              text: '🚑 ВЫЗВАТЬ СКОРУЮ ПОМОЩЬ (112)',
              action: () => window.open('tel:112', '_self'),
              variant: 'danger',
            },
            getBackButton(),
          ],
          true
        );
        return;
      }

      addBotMessage(result.answer, [
        {
          text: '📋 Скопировать выжимку для @DonDearOfficina',
          action: () => copyAssistantSummaryToClipboard(result.summary || result.answer),
          variant: 'success',
        },
        {
          text: '📩 Обсудить с @DonDearOfficina лично',
          action: () => window.open('https://t.me/DonDearOfficina', '_blank'),
          variant: 'success',
        },
        { text: '❓ Задать другой вопрос', action: () => renderSuperAssistantHub() },
        getBackButton(),
      ]);
    } catch (e) {
      setIsTyping(false);
      addBotMessage('⚠️ Ошибка обработки запроса. Пожалуйста, повторите попытку.', [getBackButton()]);
    }
  };

  const copyAssistantSummaryToClipboard = (summary: string) => {
    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // ==========================================
  // 5. РАЗДЕЛ «СВЯЗАТЬСЯ С @DonDearOfficina»
  // ==========================================
  const renderDonDearContactHub = () => {
    const text =
      '📩 <b>СВЯЗАТЬСЯ С ЭКСПЕРТОМ @DonDearOfficina</b>\n\n' +
      '<b>Владелец и системный эксперт:</b>\n' +
      'Квалификация: <i>Дипломированный провизор.</i>\n\n' +
      '⚠️ <i>Ограничение Telegram API: бот не может писать пациентам первым. ' +
      'Вы можете написать владельцу напрямую в Telegram для живого обсуждения вашего случая.</i>\n\n' +
      `<b>Последняя сформированная ассистентом выжимка:</b>\n` +
      `<i>«${lastAssistantSummary}»</i>`;

    addBotMessage(text, [
      {
        text: '📩 Написать @DonDearOfficina в Telegram',
        action: () => window.open('https://t.me/DonDearOfficina', '_blank'),
        variant: 'success',
      },
      {
        text: copiedSummary ? '✅ Выжимка скопирована!' : '📋 Скопировать выжимку для чата',
        action: () => copyAssistantSummaryToClipboard(lastAssistantSummary),
      },
      {
        text: '📚 Личные заметки эксперта (Раздел 5)',
        action: () => renderKnowledgeNotesHub(),
      },
      getBackButton(),
    ]);
  };

  // ==========================================
  // 6. РАЗДЕЛ «ПРОФИЛЬ»
  // ==========================================
  const renderProfileHub = () => {
    const p = currentUser.profile;
    const text =
      '⚙️ <b>МОЙ ПРОФИЛЬ & GDPR-КОНФИДЕНЦИАЛЬНОСТЬ</b>\n\n' +
      `• Telegram ID: <code>${currentUser.telegram_id}</code>\n` +
      `• Имя: <b>${currentUser.first_name}</b> (@${currentUser.username || 'нет'})\n` +
      `• Возраст: <b>${p.age || 'не указан'}</b> | Пол: <b>${p.gender || 'не указан'}</b>\n` +
      `• Аллергии: <b>${p.allergies?.length ? p.allergies.join(', ') : 'нет'}</b>\n` +
      `• Хронические патологии: <b>${p.chronicDiseases?.length ? p.chronicDiseases.join(', ') : 'нет'}</b>\n` +
      `• Беременность / Лактация: <b>${p.isPregnant ? 'Да' : 'Нет'}</b>\n\n` +
      `• <b>Статус следования авторскому протоколу:</b> ${
        currentUser.on_author_protocol ? '💎 <b>АКТИВЕН (on_author_protocol=true)</b>' : '⚪️ Не активен'
      }\n` +
      `• <b>Согласие GDPR:</b> ${
        currentUser.consent_granted_at ? `✅ Предоставлено (${currentUser.consent_version})` : '❌ Не предоставлено'
      }\n\n` +
      '<i>Данные используются супер-ассистентом для проверки межлекарственных взаимодействий (например, железо + цинк).</i>';

    addBotMessage(text, [
      {
        text: currentUser.on_author_protocol ? 'Отключить авторский протокол' : '💎 Следовать авторскому протоколу',
        action: () => {
          toggleAuthorProtocol();
          addUserMessage('Переключить флаг авторского протокола');
          setTimeout(() => renderProfileHub(), 200);
        },
      },
      {
        text: currentUser.consent_granted_at ? 'Отозвать согласие GDPR' : 'Дать согласие GDPR',
        action: () => {
          if (currentUser.consent_granted_at) {
            revokeConsent();
            addUserMessage('Отозвать согласие');
          } else {
            grantConsent();
            addUserMessage('Предоставить согласие');
          }
          setTimeout(() => renderProfileHub(), 200);
        },
        variant: currentUser.consent_granted_at ? 'danger' : 'success',
      },
      getBackButton(),
    ]);
  };

  // Handle Free-Text Messages
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      handleStartCommand(parts[1]);
      return;
    }

    if (text.toLowerCase() === '/menu' || text.toLowerCase() === 'меню') {
      returnToMainMenu();
      return;
    }

    // Default route: route free-text straight into Super-Assistant
    handleAskAssistant(text);
  };

  const handleSendInstagramDM = (triggerWord: string) => {
    if (!triggerWord.trim()) return;
    const kw = triggerWord.trim().toUpperCase();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'ig-u-' + Date.now();
    setIgMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: kw, timestamp: time }]);
    setIgInput('');
    setIgIsTyping(true);

    const res = triggerFunnel('instagram', kw, currentUser.username || 'user', currentUser.first_name);

    setTimeout(() => {
      setIgIsTyping(false);
      const stage = res.stage || funnelStages[0];
      setIgMessages((prev) => [
        ...prev,
        {
          id: 'ig-d-' + Date.now(),
          sender: 'dondear',
          text: stage.body,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          leadMagnet: {
            title: stage.title,
            description: stage.lead_magnet_name || 'Персональный гайд от дипломированного провизора',
            pdfName: stage.lead_magnet_name || 'Гайд_буст_DonDearOfficina.pdf',
            ctaText: stage.cta_text || '🚀 Открыть в боте @DonDearOfficinaAI',
            startArg: `ig_${kw.toLowerCase()}`,
          },
        },
      ]);
    }, 450);
  };

  const bridgeFromInstagramToTelegram = (startArg: string) => {
    setSimChannel('telegram');
    handleStartCommand(startArg);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* Left Column: Authentic Smartphone Frame with Channel Switcher */}
      <div className="w-full lg:w-[480px] flex-shrink-0 flex flex-col items-center">
        {/* Channel Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-3 w-full max-w-[420px]">
          <button
            onClick={() => setSimChannel('telegram')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              simChannel === 'telegram'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📱 Telegram-бот @DonDearOfficinaAI</span>
          </button>
          <button
            onClick={() => setSimChannel('instagram')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              simChannel === 'instagram'
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📸 Instagram Direct (Воронка)</span>
          </button>
        </div>

        <div className="w-full max-w-[420px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700/80 flex flex-col h-[760px]">
          {/* Top Notch */}
          <div className="w-full flex justify-between items-center px-5 pt-1 pb-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">12:30</span>
            <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            </div>
            <div className="flex items-center gap-1">
              <span>5G</span>
              <div className="w-4 h-2 border border-slate-400 rounded-xs flex p-0.5">
                <div className="w-full h-full bg-slate-300" />
              </div>
            </div>
          </div>

          {simChannel === 'telegram' ? (
            /* TELEGRAM INTERFACE */
            <>
              {/* Telegram Header */}
              <div className="bg-slate-800/90 backdrop-blur rounded-2xl px-4 py-3 flex items-center justify-between border border-slate-700/50 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-cyan-400/30">
                    DD
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-white">@DonDearOfficinaAI</h3>
                      <Award className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-cyan-400 font-medium">Дипломированный провизор • Gemini AI</p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartCommand()}
                  title="Перезапустить бота (/start)"
                  className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto px-2 space-y-3 pr-1 text-sm scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : msg.isRedFlag
                          ? 'bg-rose-950/80 text-rose-200 border border-rose-600/80 rounded-bl-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      <div
                        className="prose prose-invert prose-sm max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}
                      />
                      <div className="text-[10px] text-right mt-1 opacity-60">{msg.timestamp}</div>
                    </div>

                    {/* Inline Buttons attached to message */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="w-[88%] mt-2 space-y-1.5">
                        {msg.buttons.map((btn, bIdx) => {
                          let btnStyle =
                            'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-700/80';
                          if (btn.variant === 'danger') {
                            btnStyle = 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600';
                          } else if (btn.variant === 'success') {
                            btnStyle =
                              'bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-600';
                          } else if (btn.variant === 'outline') {
                            btnStyle = 'bg-transparent hover:bg-slate-800 text-slate-400 border border-slate-700';
                          }

                          return (
                            <button
                              key={bIdx}
                              onClick={btn.action}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between group active:scale-[0.98] ${btnStyle}`}
                            >
                              <span className="line-clamp-1">{btn.text}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 rounded-2xl w-28 text-slate-400 text-xs">
                    <span className="text-[10px] text-cyan-400 font-semibold mr-1">Gemini AI</span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Telegram Input Bar */}
              <div className="pt-2">
                <div className="flex items-center gap-2 bg-slate-800/90 rounded-2xl px-3 py-1.5 border border-slate-700">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Спросите супер-ассистента..."
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white flex items-center justify-center transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center px-2 pt-1 text-[11px] text-slate-500">
                  <span>Модель: Gemini 3.8 Flash</span>
                  <button onClick={() => handleStartCommand()} className="text-cyan-400 hover:underline">
                    /start
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* INSTAGRAM DIRECT INTERFACE */
            <>
              {/* Instagram Direct Header */}
              <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 rounded-2xl px-4 py-2.5 flex items-center justify-between border border-purple-800/40 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      DD
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs text-white">DonDearOfficina</h3>
                      <div className="w-3.5 h-3.5 bg-cyan-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                        ✓
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Дипломированный провизор • Direct</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Автоворонка
                </span>
              </div>

              {/* Quick Trigger Chips */}
              <div className="px-2 pb-2">
                <p className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Нажмите триггер или отправьте слово:</span>
                  <span className="text-pink-400 font-mono">Instant Reply</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {funnelTriggers.map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => handleSendInstagramDM(tr.keyword)}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-[11px] font-semibold text-purple-200 transition active:scale-95 flex items-center gap-1"
                    >
                      <span>💬</span>
                      <span>{tr.keyword}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instagram Messages Feed */}
              <div className="flex-1 overflow-y-auto px-2 space-y-3 pr-1 text-sm scrollbar-thin scrollbar-thumb-slate-700">
                {igMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.text}</div>
                      <div className="text-[9px] text-right mt-1 opacity-50">{msg.timestamp}</div>
                    </div>

                    {/* Lead Magnet CTA Card */}
                    {msg.leadMagnet && (
                      <div className="w-[88%] mt-2 p-3 bg-gradient-to-br from-slate-800 to-purple-950/50 rounded-2xl border border-purple-500/40 shadow-lg">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">📄</span>
                          <span className="text-xs font-bold text-white leading-tight">
                            {msg.leadMagnet.pdfName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mb-2.5 leading-snug">
                          {msg.leadMagnet.description}
                        </p>
                        <button
                          onClick={() => bridgeFromInstagramToTelegram(msg.leadMagnet!.startArg)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <span>{msg.leadMagnet.ctaText}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {igIsTyping && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 rounded-2xl w-28 text-slate-400 text-xs">
                    <span className="text-[10px] text-pink-400 font-semibold mr-1">Direct bot</span>
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
                <div ref={igChatEndRef} />
              </div>

              {/* Instagram Input Bar */}
              <div className="pt-2">
                <div className="flex items-center gap-2 bg-slate-800/90 rounded-2xl px-3 py-1.5 border border-purple-800/50">
                  <input
                    type="text"
                    value={igInput}
                    onChange={(e) => setIgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInstagramDM(igInput)}
                    placeholder="Напишите в Direct (например, СТЕК)..."
                    className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendInstagramDM(igInput)}
                    disabled={!igInput.trim()}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 text-white flex items-center justify-center transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center px-2 pt-1 text-[10px] text-slate-500">
                  <span>Instagram Graph Webhook ➔ Telegram @DonDearOfficinaAI</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Column: Interactive Diagnostic & Assistant Controls */}
      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Auto-Funnel Cross-Platform Station */}
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 rounded-2xl p-5 border border-purple-500/30 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 mb-2">
                <span>🚀</span>
                <span>Автоворонка: Instagram Direct ➔ Telegram @DonDearOfficinaAI</span>
              </span>
              <h2 className="text-lg font-bold text-white">Кросс-платформенная воронка лидогенерации</h2>
              <p className="text-slate-300 text-xs mt-1">
                Пользователь пишет кодовое слово в Instagram Direct или комментариях ➔ мгновенная выдача авторского PDF-гайда ➔
                бесшовный переход в Telegram-бот <b>@DonDearOfficinaAI</b> с автоматическим запуском каскадного онбординга.
              </p>
            </div>
            <button
              onClick={() => {
                setSimChannel('instagram');
                handleSendInstagramDM('СТЕК');
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            >
              <span>⚡ Тест воронки «СТЕК»</span>
            </button>
          </div>

          {/* 4 Pipeline Stages Progress */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-purple-800/40 text-xs">
            {funnelStages.map((st) => (
              <div key={st.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-cyan-400">Шаг {st.step_number}</span>
                    <span className="text-[9px] text-slate-500">{st.delay_label}</span>
                  </div>
                  <h4 className="font-semibold text-slate-200 text-[11px] line-clamp-1">{st.name}</h4>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{st.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Testing Station Header */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Studio • Gemini 3.8 Flash • Cause-First Каскад
              </span>
              <h2 className="text-xl font-bold text-white">Интерактивный научный ассистент @DonDearOfficina</h2>
              <p className="text-slate-400 text-sm mt-1">
                Система ищет корневые причины нарушений (ЖКТ ➔ нейромедиаторы ➔ микронутриенты),
                опирается на PubMed/OpenFDA и строго проверяет взаимодействия с активным стеком.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs text-slate-400">Пользователь:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-700">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">{currentUser.first_name}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <button
              onClick={() => handleSelectSection('gastro_month1')}
              className="px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-2 transition"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>🌿 1-й месяц: Настройка ЖКТ</span>
            </button>
            <button
              onClick={() => handleSelectSection('workout')}
              className="px-3 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-medium border border-amber-500/30 flex items-center gap-2 transition"
            >
              <Dumbbell className="w-4 h-4 text-amber-400" />
              <span>🏋️‍♂️ Система тренировок</span>
            </button>
            <button
              onClick={() => handleSelectSection('medications')}
              className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-cyan-300 text-xs font-medium border border-cyan-500/30 flex items-center gap-2 transition"
            >
              <Pill className="w-4 h-4 text-cyan-400" />
              <span>💊 Моя база препаратов</span>
            </button>
            <button
              onClick={() => handleSelectSection('knowledge')}
              className="px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium border border-indigo-500/30 flex items-center gap-2 transition"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>📚 База знаний</span>
            </button>
            <button
              onClick={() => handleAskAssistant('Хроническая дневная сонливость, упадок энергии и туман в голове')}
              className="px-3 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-medium border border-cyan-500/30 flex items-center gap-2 transition"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>🤖 Тест: Супер-ассистент</span>
            </button>
            <button
              onClick={() => handleAskAssistant('Острая боль в груди, давит за грудиной и онемение руки')}
              className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-2 transition"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>🚨 Тест: Red Flag (112)</span>
            </button>
          </div>
        </div>

        {/* Copyable Assistant Summary Station */}
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Краткая выжимка ответа ассистента (для отправки владельцу в Telegram)</span>
            </h3>
            <button
              onClick={() => copyAssistantSummaryToClipboard(lastAssistantSummary)}
              className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center gap-1.5 transition"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-700/80 font-mono">
            {lastAssistantSummary}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Используется для быстрого копирования и пересылки в чат <code>@DonDearOfficina</code>.</span>
            <a
              href="https://t.me/DonDearOfficina"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Открыть диалог t.me/DonDearOfficina</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Guidelines & Safety Compliance Matrix */}
        <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Жесткие правила и самопроверка ассистента:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>• <b>Cause-first каскад:</b> ЖКТ ➔ нейромедиаторы ➔ микронутриенты.</div>
            <div>• <b>PMID/DOI:</b> обязательны для каждого медицинского утверждения.</div>
            <div>• <b>Уровни доказательности:</b> A–F для каждого предлагаемого действия.</div>
            <div>• <b>Красные флаги:</b> боль в груди, судороги ➔ 112 + прекращение анализа.</div>
            <div>• <b>Исламская медицина:</b> религиозный текст — исторический контекст, не efficacy.</div>
            <div>• <b>Ограничение Telegram API:</b> бот не пишет пользователю первым.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
