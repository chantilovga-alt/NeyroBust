import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Send,
  RotateCcw,
  Sparkles,
  Pill,
  Dumbbell,
  BookOpen,
  User,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Medication, WorkoutExercise } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (cb: () => void) => void;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
      };
    };
  }
}

export const TelegramMiniApp: React.FC = () => {
  const {
    currentUser,
    medications,
    workoutExercises,
    workoutPhilosophy,
    toggleWorkoutExercise,
    knowledgeNotes,
    queryAssistant,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'gastro' | 'workout' | 'meds' | 'assistant' | 'knowledge' | 'profile'>('gastro');
  const [deviceFrame, setDeviceFrame] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCommands, setCopiedCommands] = useState<boolean>(false);

  // Assistant Chat State
  const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; isRedFlag?: boolean }>>([
    {
      sender: 'assistant',
      text:
        '👋 Мир вам! Я — супер-ассистент приложения @DonDearOfficina (дипломированный провизор-химик, специалист по нейробиологии и андрологии).\n\n' +
        'Моя задача — работать с вами так, как работал бы владелец: сначала причина, потом симптом; каскад ЖКТ → нейробуст → БАД; научная строгость с ссылками на PMID и уважение к вере.\n\n' +
        'Задайте вопрос по ЖКТ, восстановлению энергии, взаимодействиям добавок или авторскому протоколу.',
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Selected med filter
  const [medFilter, setMedFilter] = useState<'all' | '1' | '2' | '3' | '4' | 'medicine' | 'supplement'>('all');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);

  // Initialize Telegram WebApp SDK if inside Telegram client
  const [isInsideTelegram, setIsInsideTelegram] = useState(false);
  const [tgUser, setTgUser] = useState<{ id?: number; first_name?: string; username?: string }>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor('#0f172a');
        tg.setBackgroundColor('#020617');
        tg.enableClosingConfirmation();
      } catch (e) {
        // Ignored on older clients
      }

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setIsInsideTelegram(true);
        setTgUser(user);
      }
    }
  }, []);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch (e) {
      // not in telegram
    }
  };

  const handleSendAssistant = async (overridePrompt?: string) => {
    const q = overridePrompt || assistantInput;
    if (!q.trim() || isAsking) return;

    triggerHaptic('medium');
    setAssistantMessages((prev) => [...prev, { sender: 'user', text: q }]);
    if (!overridePrompt) setAssistantInput('');
    setIsAsking(true);

    try {
      const res = await queryAssistant(q);
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.answer,
          isRedFlag: res.isRedFlag,
        },
      ]);
    } catch (e) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: '⚠️ Не удалось получить ответ. Попробуйте еще раз или напишите напрямую @DonDearOfficina.',
        },
      ]);
    } finally {
      setIsAsking(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-afhybgd6fvdcktfoqqlxqd-955983393021.europe-west2.run.app';

  const copyBotFatherCommands = () => {
    const text =
      `/setmenubutton\n` +
      `@DonDearOfficina_bot\n` +
      `${currentAppUrl}\n` +
      `💊 NeuroBoost App`;
    navigator.clipboard.writeText(text);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2500);
  };

  const copyMiniAppUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered meds
  const filteredMeds = medications.filter((m) => {
    if (medFilter === '1') return m.month_phase === 1;
    if (medFilter === '2') return m.month_phase === 2;
    if (medFilter === '3') return m.month_phase === 3;
    if (medFilter === '4') return m.month_phase === 4;
    if (medFilter === 'medicine') return m.legal_category_rf === 'medicine';
    if (medFilter === 'supplement') return m.legal_category_rf === 'supplement';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Telegram Bot Setup Banner */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 p-5 rounded-2xl border border-sky-600/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Telegram Mini App (TMA): @DonDearOfficinaAI
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Bot Token Подключен
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Полноценное мини-приложение для Telegram на базе <b>Telegram WebApp SDK</b>.
            Поддерживает вызов из меню бота, жесты, системную тему Telegram, нативные кнопки и прямое обращение к AI-суперассистенту.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <button
            onClick={copyMiniAppUrl}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
            <span>{copiedLink ? 'Скопировано!' : 'URL Mini App'}</span>
          </button>

          <button
            onClick={copyBotFatherCommands}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition"
          >
            {copiedCommands ? <Check className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-sky-200" />}
            <span>Настроить в @BotFather</span>
          </button>

          <a
            href="https://t.me/DonDearOfficina_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition"
          >
            <span>Открыть бота (@DonDearOfficina_bot)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {!isInsideTelegram && (
            <button
              onClick={() => setDeviceFrame(!deviceFrame)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
            >
              <span>{deviceFrame ? '🖥 Развернуть' : '📱 Рамка телефона'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container - either Smartphone Mockup or Full Width */}
      <div className={`mx-auto transition-all ${deviceFrame && !isInsideTelegram ? 'max-w-[420px]' : 'max-w-5xl'}`}>
        <div className="bg-slate-950 rounded-[32px] border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[720px] max-h-[880px]">
          {/* Telegram Header Bar */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-sky-500/30">
                DD
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>@DonDearOfficinaAI</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-sky-400">мини-приложение • WebApp</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {isInsideTelegram ? `id: ${tgUser.id || 'TG'}` : 'Web Mode'}
              </span>
            </div>
          </div>

          {/* Quick Tab Switcher inside Mini App */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 px-2 py-1.5 flex items-center gap-1 overflow-x-auto text-[11px] font-semibold scrollbar-none">
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('gastro');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'gastro' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌿</span>
              <span>1-й мес (ЖКТ)</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('workout');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'workout' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏋️‍♂️</span>
              <span>Тренировки</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('meds');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'meds' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>💊</span>
              <span>Препараты</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('assistant');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'assistant' ? 'bg-sky-500 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🤖</span>
              <span>AI-Ассистент</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('knowledge');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'knowledge' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📚</span>
              <span>Знания</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('profile');
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                activeTab === 'profile' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⚙️</span>
              <span>Профиль</span>
            </button>
          </div>

          {/* Mini App Body Views */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. GASTRO MONTH 1 TAB */}
            {activeTab === 'gastro' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-600/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌿</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">1-й месяц: Настройка работы ЖКТ</h3>
                      <p className="text-[10px] text-emerald-400">Основа основ авторской системы @DonDearOfficina</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Пока не восстановлен желчеотток (эмульгация жиров) и не запечатан кишечный барьер (leaky gut),
                    ноотропы и витамины транзитом покидают организм, вызывая интоксикацию и нейровоспаление.
                  </p>
                </div>

                {/* 2 Core Medications */}
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">1. Хофитол (Экстракт артишока)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/40">
                        ЛС (ГРЛС)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      <b>Режим:</b> 2 таблетки × 3 р/сут за 20 мин до еды.
                    </p>
                    <p className="text-[11px] text-cyan-300/90 italic">
                      <b>Зачем в стеке:</b> Стимуляция холереза и холекинеза. Желчные кислоты необходимы для всасывания омега-3, витаминов D3 и ноотропов.
                    </p>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Мета-анализ: 8 РКИ (n=512) — улучшение пассажа на 38% (PMID: 26310198).
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">2. Энтерол (S. boulardii CNCM I-745)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/40">
                        ЛС (ГРЛС)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      <b>Режим:</b> 250 мг 2 раза в сутки за 1 час до еды (14–30 дней).
                    </p>
                    <p className="text-[11px] text-cyan-300/90 italic">
                      <b>Зачем в стеке:</b> Восстановление плотных контактов энтероцитов (tight junctions), синтез секреторного IgA, защита от ЛПС-эндотоксикоза.
                    </p>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Мета-анализ: Cochrane 21 РКИ — доказательность A (PMID: 31430489).
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setActiveTab('workout');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Шаг 2: Перейти к тренировкам (снятие застоев)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. WORKOUT TAB */}
            {activeTab === 'workout' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-600/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏋️‍♂️</span>
                      <div>
                        <h3 className="text-xs font-bold text-white">{workoutPhilosophy.title}</h3>
                        <p className="text-[10px] text-amber-300">Длительность: 45–60 минут • 2 подхода в отказ</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300 space-y-1">
                    <p><b>1. Начало:</b> Икры ➔ Приседания (2 подхода в отказ).</p>
                    <p><b>2. Фулбоди:</b> 2 грудь, 2 спина, 2 плечи, 2 доп. ноги, ягодицы отдельно.</p>
                    <p><b>3. Свободное чередование:</b> ротация тренажеров для активного отдыха.</p>
                  </div>
                </div>

                {/* Workout Exercise Checklist */}
                <div className="space-y-2">
                  {workoutExercises.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => {
                        triggerHaptic('light');
                        toggleWorkoutExercise(ex.id);
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                        ex.is_completed
                          ? 'bg-emerald-950/20 border-emerald-700/60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">
                          {ex.muscle_title}
                        </span>
                        <h5 className="font-bold text-xs text-white mt-0.5">{ex.name}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{ex.notes}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold whitespace-nowrap">
                          {ex.sets}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            ex.is_completed ? 'bg-emerald-500 text-white' : 'border border-slate-700 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MEDICATIONS TAB */}
            {activeTab === 'meds' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-semibold scrollbar-none">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('all');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Все ({medications.length})
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('1');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === '1' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    1-й мес (ЖКТ)
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('2');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === '2' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    2-й мес (Нейро)
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('3');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === '3' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    3-й мес (Микро)
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('4');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === '4' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Поддержка
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMedFilter('medicine');
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                      medFilter === 'medicine' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    ЛС (ГРЛС)
                  </button>
                </div>

                {/* 3rd Month Neuroboost continuation banner */}
                {medFilter === '3' && (
                  <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-700/50 text-[11px] text-slate-200 space-y-1">
                    <div className="font-bold text-indigo-300">💡 3-й месяц: Продолжение нейробуста + Микронутриенты</div>
                    <p>• <b>Фенотропил:</b> продолжается 2-й месяц приема (курс длится строго 2 месяца).</p>
                    <p>• <b>Глиатилин, Креатин и L-Цитруллин:</b> базовый постоянный пул — минимум от 6 месяцев до 1 года!</p>
                  </div>
                )}

                {/* Med List */}
                <div className="space-y-2">
                  {filteredMeds.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedMed(selectedMed?.id === m.id ? null : m);
                      }}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white line-clamp-1">{m.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.legal_category_rf && (
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                m.legal_category_rf === 'medicine'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-700/40'
                                  : m.legal_category_rf === 'vitamin_mineral'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700/40'
                              }`}
                            >
                              {m.legal_category_rf === 'medicine' ? 'ЛС' : m.legal_category_rf === 'vitamin_mineral' ? 'Вит/Мин' : 'БАД'}
                            </span>
                          )}
                          {m.month_phase && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                              {m.month_phase === 4 ? 'Поддержка' : `Фаза ${m.month_phase}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {m.active_ingredient || m.notes}
                      </div>

                      {/* Expanded View */}
                      {selectedMed?.id === m.id && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1 mt-2">
                          <div><b>Режим:</b> {m.dose || '—'} ({m.schedule || '—'})</div>
                          {m.duration_course && <div><b>Курс:</b> {m.duration_course}</div>}
                          {m.why_in_stack && (
                            <div className="text-cyan-300 italic">
                              <b>Зачем в стеке:</b> {m.why_in_stack}
                            </div>
                          )}
                          {m.meta_analysis_summary && (
                            <div className="text-amber-300">
                              <b>Мета-анализ:</b> {m.meta_analysis_summary}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">
                            PMID/DOI: {m.meta_analysis_refs?.join(', ') || m.evidence_refs?.join(', ') || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SUPER-ASSISTANT TAB (USING USER'S PROMPT) */}
            {activeTab === 'assistant' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-sky-600/30 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Супер-ассистент @DonDearOfficina</span>
                  </div>
                  Обучен на каскадной философии владельца (провизор-химик, нейробиология, андрология, исламская мысль).
                  Разбор с PMID, cause-first подход, проверка взаимодействий со стеком.
                </div>

                {/* Messages Feed */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {assistantMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-sky-600 text-white ml-6 rounded-tr-none'
                          : msg.isRedFlag
                          ? 'bg-rose-950/80 text-rose-200 border border-rose-600/60 rounded-tl-none'
                          : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {isAsking && (
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-sky-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      <span>Ассистент анализирует каскад и мета-анализы PubMed...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Prompts */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-1 scrollbar-none">
                  <button
                    onClick={() => handleSendAssistant('Почему нельзя начинать со стимуляторов без настройки ЖКТ и холина?')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-white whitespace-nowrap"
                  >
                    🌿 Почему ЖКТ первичен?
                  </button>
                  <button
                    onClick={() => handleSendAssistant('Объясни правила разнесения железа и цинка из-за DMT-1')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-white whitespace-nowrap"
                  >
                    ⚡ Железо против Цинка
                  </button>
                  <button
                    onClick={() => handleSendAssistant('Научный разбор черного тмина: тимохинон и мета-анализы РКИ')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-white whitespace-nowrap"
                  >
                    🕌 Черный тмин (тибб-и-набави)
                  </button>
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAssistant()}
                    placeholder="Спросить ассистента..."
                    disabled={isAsking}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleSendAssistant()}
                    disabled={isAsking || !assistantInput.trim()}
                    className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 5. KNOWLEDGE TAB */}
            {activeTab === 'knowledge' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Экспертные заметки владельца (@DonDearOfficina):
                </div>

                <div className="space-y-2">
                  {knowledgeNotes.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-sky-400 tracking-wider">
                        [{n.topic}]
                      </span>
                      <h4 className="font-bold text-xs text-white">{n.title}</h4>
                      <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">{n.body}</p>
                      <div className="text-[9px] text-cyan-400 font-mono">
                        {n.evidence_refs.join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {currentUser.first_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {currentUser.first_name} {currentUser.username ? `(@${currentUser.username})` : ''}
                      </h3>
                      <p className="text-[11px] text-cyan-400 font-medium">Роль: {currentUser.role}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Следование авторскому стеку:</span>
                      <span className={currentUser.on_author_protocol ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {currentUser.on_author_protocol ? '💎 Активно' : 'Выключено'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Возраст / Пол:</span>
                      <span>{currentUser.profile.age || '—'} лет • {currentUser.profile.gender || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📩</span>
                    <span>Прямая связь с владельцем</span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Дипломированный провизор @DonDearOfficina: разбор анализов, аудит стека, персональные развилки каскада.
                  </p>
                  <a
                    href="https://t.me/DonDearOfficina"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 rounded-xl text-center text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition"
                  >
                    Написать @DonDearOfficina в Telegram
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Mini App Bottom Bar (Telegram Style) */}
          <div className="bg-slate-900/95 border-t border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Личный опыт, разбор открытых данных</span>
            </div>
            <a
              href="https://t.me/DonDearOfficina"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 font-semibold hover:underline"
            >
              @DonDearOfficina
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
