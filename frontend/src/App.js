import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const css = `
*{box-sizing:border-box}
html,body,#root{min-height:100%}
body{margin:0;background:#f8f6ff;color:#1c1233;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,select,textarea{font:inherit}
button{border:0;border-radius:12px;cursor:pointer;font-weight:800;min-height:40px;padding:0 12px;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
button:hover{transform:translateY(-1px)}
input,select,textarea{background:#fff;border:1px solid #ded4fb;border-radius:12px;color:#1c1233;min-height:42px;outline:none;padding:0 12px;width:100%}
textarea{min-height:78px;padding-top:10px;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:#5b16ef;box-shadow:0 0 0 3px rgba(91,22,239,.14)}
.app{min-height:100vh;padding:14px 14px 190px;transition:background .22s ease,color .22s ease}
.dark{background:#12091f;color:#f9f5ff}
.primary{background:#5b16ef;color:#fff}.ghost{background:#efe8ff;color:#4b277d}.danger{background:#fee2e2;color:#b91c1c}
.top{align-items:center;display:flex;gap:10px;justify-content:space-between;margin:0 auto 12px;max-width:1280px}
.brand{align-items:center;display:flex;gap:10px}.brand h1{color:#5b16ef;font-size:28px;margin:0}
.brand-mark{align-items:center;background:#5b16ef;border-radius:16px;color:#fff;display:flex;font-weight:950;height:44px;justify-content:center;width:44px}
.menu{background:#fff;border:1px solid #e8ddff;display:grid;gap:4px;padding:11px;width:44px}.menu span{background:#5b16ef;border-radius:8px;height:3px}
.actions{display:flex;flex-wrap:wrap;gap:8px}.overlay{background:rgba(20,10,40,.22);bottom:0;left:0;position:fixed;right:0;top:0;z-index:20}
.drawer{background:#1b1b1f;color:#f5f5f7;border-radius:22px;box-shadow:0 22px 70px rgba(25,15,44,.28);height:calc(100vh - 28px);left:14px;max-width:320px;overflow:auto;padding:16px;position:fixed;top:14px;transform:translateX(-120%);transition:transform .24s ease;z-index:30;width:calc(100vw - 28px)}
.drawer.open{transform:translateX(0)}.drawer-head{align-items:center;display:flex;justify-content:space-between}.drawer h2{font-size:20px;margin:0}.drawer-profile{background:#2a2a2f;border-radius:18px;margin:14px 0;padding:14px}
.drawer-avatar{align-items:center;border-radius:18px;color:#fff;display:flex;font-size:22px;font-weight:950;height:52px;justify-content:center;margin-bottom:10px;width:52px}
.nav{display:grid;gap:8px;margin:14px 0}.nav button{background:#2a2a2f;color:#d9d9de;text-align:left}.nav button.active{background:#5b16ef;color:#fff}
.notice{animation:fadeIn .25s ease;background:#edfdf4;border:1px solid #bbf7d0;border-radius:16px;color:#166534;font-weight:800;margin:0 auto 12px;max-width:1280px;padding:10px}.error{background:#fff1f2;border-color:#fecdd3;color:#be123c}
.calendar-card,.panel,.metric,.profile-card{animation:rise .24s ease;background:#fff;border:1px solid #e8ddff;border-radius:22px;box-shadow:0 14px 42px rgba(57,28,101,.08);overflow:hidden}
.calendar-head{align-items:center;border-bottom:1px solid #efe8ff;display:flex;gap:10px;justify-content:space-between;padding:12px}.calendar-head h2{font-size:22px;margin:0}
.view-toggle{background:#f0e9ff;border-radius:14px;display:flex;padding:4px}.view-toggle button{background:transparent;color:#6b578e}.view-toggle .active{background:#5b16ef;color:#fff}
.month-grid{display:grid;grid-template-columns:repeat(7,minmax(92px,1fr));overflow-x:auto}.month-day{border-bottom:1px solid #efe8ff;border-right:1px solid #efe8ff;min-height:108px;padding:7px;transition:background .16s ease}.month-day:hover{background:#fbf9ff}.month-day.drop-target{background:#eee5ff}.month-day.today{background:#f1eaff}.weekday{background:#fbf9ff;color:#786890;font-size:12px;font-weight:900;min-height:auto;text-align:center;text-transform:uppercase}.day-number{align-items:center;display:flex;font-size:13px;font-weight:900;justify-content:space-between}.day-number b{align-items:center;border-radius:999px;display:flex;height:28px;justify-content:center;width:28px}.today .day-number b{background:#5b16ef;color:#fff}
.event{align-items:center;border-radius:8px;color:#fff;display:flex;font-size:10.5px;font-weight:850;gap:4px;line-height:1.1;margin-top:4px;min-height:20px;overflow:hidden;padding:3px 5px;text-overflow:ellipsis;white-space:nowrap;transition:transform .16s ease,opacity .16s ease}.event:hover,.habit-block:hover{transform:scale(1.015)}.event input,.habit-block input{-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.9);border-radius:3px;display:inline-grid;height:11px;min-height:11px;place-content:center;width:11px}.event input:checked,.habit-block input:checked{background:#fff}.event input:checked:after,.habit-block input:checked:after{border:solid #5b16ef;border-width:0 1.5px 1.5px 0;content:"";height:5px;transform:rotate(45deg);width:2px}.event.done,.habit-block.done{opacity:.55;text-decoration:line-through}
.week-grid{display:grid;grid-template-columns:54px repeat(7,minmax(118px,1fr));overflow:auto}.cell{border-bottom:1px solid #efe8ff;border-right:1px solid #efe8ff;min-height:42px;padding:4px;position:relative}.cell.drop-target{background:#eee5ff}.hour{background:#fbf9ff;color:#7a6d91;font-size:11px;font-weight:900;text-align:right}.week-head{background:#fbf9ff;font-size:12px;font-weight:900;min-height:48px}.week-head.today{background:#f1eaff;color:#5b16ef}
.habit-block{align-items:flex-start;border-radius:9px;color:#fff;display:grid;font-size:11px;font-weight:850;gap:4px;line-height:1.1;margin-bottom:4px;min-height:26px;overflow:hidden;padding:5px;transition:transform .16s ease}
.ai-dock{background:#fff;border:1px solid #e8ddff;border-radius:22px 22px 0 0;bottom:0;box-shadow:0 -14px 42px rgba(57,28,101,.12);left:50%;max-width:1280px;padding:10px 12px;position:fixed;transform:translateX(-50%);width:calc(100% - 24px);z-index:15}.ai-dock-head{align-items:center;display:flex;justify-content:space-between}.ai-dock h2{font-size:16px;margin:0}.chat-log{display:grid;gap:7px;max-height:92px;overflow:auto}.bubble{border-radius:14px;line-height:1.35;padding:8px}.bubble.you{background:#5b16ef;color:#fff;margin-left:28px}.bubble.ai{background:#f0e8ff;color:#2a174e;margin-right:28px}.chat-box{display:grid;gap:8px;grid-template-columns:1fr auto;margin-top:8px}
.suggestions{display:grid;gap:8px;margin:0 auto 12px;max-width:1280px}.suggestion-card{animation:fadeIn .24s ease;background:#2a174e;border:1px solid #5b16ef;border-left:6px solid #9c6bff;border-radius:16px;color:#fff;font-weight:800;line-height:1.4;padding:12px 14px;box-shadow:0 14px 32px rgba(42,23,78,.18)}
.modal-backdrop{align-items:center;animation:fadeIn .18s ease;backdrop-filter:blur(8px);background:rgba(18,9,31,.48);bottom:0;display:flex;justify-content:center;left:0;padding:16px;position:fixed;right:0;top:0;z-index:40}.modal{animation:pop .2s ease;background:#fff;border:1px solid #e8ddff;border-radius:24px;box-shadow:0 24px 80px rgba(44,20,80,.28);max-height:92vh;max-width:520px;overflow:auto;padding:18px;width:100%}.modal h2{font-size:22px;margin:0 0 12px}.form label{color:#3d2d5f;display:grid;font-size:12px;font-weight:900;gap:7px;margin-bottom:12px;text-transform:uppercase}.two{display:grid;gap:8px;grid-template-columns:1fr 1fr}.segmented{background:#f0e9ff;border-radius:14px;display:grid;grid-template-columns:1fr 1fr;margin-bottom:12px;padding:4px}.segmented button{background:transparent;color:#6b578e}.segmented .active{background:#5b16ef;color:#fff}.colors{display:flex;flex-wrap:wrap;gap:8px}.swatch{border:3px solid transparent;border-radius:999px;height:34px;width:34px}.swatch.active{border-color:#1c1233}
.auth,.welcome{align-items:center;display:grid;min-height:100vh;padding:20px}.card{background:#fff;border:1px solid #e8ddff;border-radius:26px;box-shadow:0 22px 70px rgba(67,36,122,.16);margin:auto;max-width:430px;padding:24px;width:100%}.hero-visual{background:linear-gradient(135deg,#5b16ef,#9c6bff);border-radius:26px;color:#fff;display:grid;font-size:48px;font-weight:950;height:190px;place-items:center}.muted{color:#75658f;line-height:1.45}
.tracking-page,.profile-page,.settings-page{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));max-width:1280px;margin:0 auto}.metric,.profile-card{padding:16px}.metric strong{color:#5b16ef;font-size:34px}.bars{align-items:end;display:flex;gap:8px;height:140px}.bar{background:#5b16ef;border-radius:10px 10px 0 0;flex:1;min-height:12px}.year-grid{display:grid;gap:4px;grid-template-columns:repeat(26,1fr)}.year-grid span{aspect-ratio:1;background:#e8ddff;border-radius:4px}.year-grid .left{background:#5b16ef}
.profile-header{align-items:center;display:flex;gap:14px}.profile-avatar{align-items:center;border-radius:24px;color:#fff;display:flex;font-size:34px;font-weight:950;height:82px;justify-content:center;width:82px}.profile-title h2{font-size:26px;margin:0}.profile-stats{display:grid;gap:10px;grid-template-columns:repeat(3,1fr);margin-top:16px}.profile-stat{background:#f7f2ff;border-radius:18px;padding:12px;text-align:center}.profile-stat strong{color:#5b16ef;display:block;font-size:26px}.profile-goal{background:#f7f2ff;border-radius:18px;margin-top:14px;padding:14px}.streak-badge{background:#5b16ef;border-radius:999px;color:#fff;display:inline-flex;font-weight:900;margin-top:10px;padding:8px 12px}
.dark .calendar-card,.dark .panel,.dark .modal,.dark .metric,.dark .card,.dark .profile-card,.dark .ai-dock{background:#211338;border-color:#3b255d}.dark .suggestion-card{background:#6d28d9;border-color:#c4b5fd;color:#fff}.dark input,.dark select,.dark textarea{background:#160c27;border-color:#3b255d;color:#fff}.dark .month-day,.dark .cell,.dark .calendar-head{border-color:#3b255d}.dark .weekday,.dark .hour,.dark .week-head{background:#1a102c}.dark .month-day.today,.dark .week-head.today{background:#2a1748}.dark .drawer-profile .muted{color:#f1e9ff}.dark .profile-goal,.dark .profile-stat{background:#2a1748;color:#f8f6ff}.dark .muted{color:#d8c8f4}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@media(max-width:900px){.app{padding:10px 10px 210px}.month-grid{grid-template-columns:repeat(7,72px)}.month-day{min-height:92px;padding:5px}.event{font-size:10px;min-height:18px;padding:3px 4px}.week-grid{grid-template-columns:44px repeat(7,96px)}.top{align-items:flex-start}.actions{justify-content:flex-end}.calendar-head{align-items:flex-start;flex-direction:column}.two{grid-template-columns:1fr}.year-grid{grid-template-columns:repeat(18,1fr)}.profile-stats{grid-template-columns:1fr}.ai-dock{width:100%;border-radius:18px 18px 0 0}}
`;

const translations = {
  en: {
    calendar: "Calendar", tracking: "Tracking", profile: "Profile", settings: "Settings", close: "Close", logout: "Log out", new: "New", today: "Today",
    month: "Month", week: "Week", prev: "Prev", next: "Next", sharpAi: "Sharp AI", ask: "Ask Sharp...", send: "Send", hide: "Hide", show: "Show",
    createTitle: "Create a new task or habit", task: "Task", habit: "Habit", title: "Title", date: "Date", optionalTime: "Optional time",
    startTime: "Start time", endTime: "End time", repeat: "Repeat", color: "Color", reminder: "Reminder", minutesBefore: "Minutes before",
    notes: "Notes", create: "Create", save: "Save", cancel: "Cancel", delete: "Delete", theme: "Theme", language: "Language",
    defaultView: "Default calendar view", reminders: "Reminders", allowNotifications: "Allow browser notifications", editProfile: "Edit profile",
    goal: "Goal", displayName: "Display name", avatarColor: "Avatar color", saveProfile: "Save profile", bestStreak: "Best streak",
    completed: "Completed", currentStreak: "Current streak", yearProgress: "Year progress", daysLeft: "days left before the year ends",
  },
  fr: {
    calendar: "Calendrier", tracking: "Suivi", profile: "Profil", settings: "Reglages", close: "Fermer", logout: "Deconnexion", new: "Nouveau", today: "Aujourd'hui",
    month: "Mois", week: "Semaine", prev: "Prec.", next: "Suiv.", sharpAi: "IA Sharp", ask: "Demander a Sharp...", send: "Envoyer", hide: "Masquer", show: "Afficher",
    createTitle: "Creer une nouvelle tache ou habitude", task: "Tache", habit: "Habitude", title: "Titre", date: "Date", optionalTime: "Heure optionnelle",
    startTime: "Debut", endTime: "Fin", repeat: "Repetition", color: "Couleur", reminder: "Rappel", minutesBefore: "Minutes avant",
    notes: "Notes", create: "Creer", save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", theme: "Theme", language: "Langue",
    defaultView: "Vue par defaut", reminders: "Rappels", allowNotifications: "Autoriser les notifications", editProfile: "Modifier le profil",
    goal: "Objectif", displayName: "Nom affiche", avatarColor: "Couleur avatar", saveProfile: "Enregistrer", bestStreak: "Meilleure serie",
    completed: "Termines", currentStreak: "Serie actuelle", yearProgress: "Progression annuelle", daysLeft: "jours avant la fin de l'annee",
  },
  es: {
    calendar: "Calendario", tracking: "Progreso", profile: "Perfil", settings: "Ajustes", close: "Cerrar", logout: "Salir", new: "Nuevo", today: "Hoy",
    month: "Mes", week: "Semana", prev: "Ant.", next: "Sig.", sharpAi: "IA Sharp", ask: "Pregunta a Sharp...", send: "Enviar", hide: "Ocultar", show: "Mostrar",
    createTitle: "Crear una tarea o habito", task: "Tarea", habit: "Habito", title: "Titulo", date: "Fecha", optionalTime: "Hora opcional",
    startTime: "Inicio", endTime: "Fin", repeat: "Repetir", color: "Color", reminder: "Recordatorio", minutesBefore: "Minutos antes",
    notes: "Notas", create: "Crear", save: "Guardar", cancel: "Cancelar", delete: "Eliminar", theme: "Tema", language: "Idioma",
    defaultView: "Vista predeterminada", reminders: "Recordatorios", allowNotifications: "Permitir notificaciones", editProfile: "Editar perfil",
    goal: "Meta", displayName: "Nombre", avatarColor: "Color avatar", saveProfile: "Guardar perfil", bestStreak: "Mejor racha",
    completed: "Completados", currentStreak: "Racha actual", yearProgress: "Progreso anual", daysLeft: "dias antes de fin de ano",
  },
};

const colors = ["#5b16ef", "#21a67a", "#1d8fe3", "#f59e0b", "#ef4444", "#9333ea", "#0f766e"];
const recurrences = [["none", "One time"], ["daily", "Daily"], ["weekly", "Weekly"], ["weekdays", "Weekdays"], ["weekends", "Weekends"], ["monthly", "Monthly"], ["yearly", "Yearly"], ["custom", "Personalized"]];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return formatDate(new Date());
}

function dateObj(date) {
  return new Date(`${date}T12:00:00`);
}

function addDays(date, days) {
  const next = dateObj(date);
  next.setDate(next.getDate() + days);
  return formatDate(next);
}

function monthStart(date) {
  const d = dateObj(date);
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1, 12));
}

function calendarStart(date) {
  const start = dateObj(monthStart(date));
  start.setDate(start.getDate() - start.getDay());
  return formatDate(start);
}

function monthTitle(date, language) {
  return dateObj(date).toLocaleDateString(language, { month: "long", year: "numeric" });
}

function dayTitle(date, language) {
  return dateObj(date).toLocaleDateString(language, { weekday: "short", day: "numeric" });
}

function hourOf(item) {
  return Number((item.time || "24:00").split(":")[0]);
}

function minutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function blankItem() {
  return {
    kind: "task", title: "", startDate: todayISO(), time: "", endTime: "", recurrence: "none",
    customIntervalDays: 2, customLabel: "", color: "#5b16ef", reminderEnabled: true, reminderMinutesBefore: 10, notes: "",
  };
}

function App() {
  const [onboarded, setOnboarded] = useState(localStorage.getItem("sharpOnboarded") === "yes");
  const [slide, setSlide] = useState(0);
  const [token, setToken] = useState(localStorage.getItem("sharpToken") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [settings, setSettings] = useState({ theme: "light", language: "en", calendarView: "week", remindersEnabled: true, showAiSuggestions: true });
  const [profile, setProfile] = useState({ displayName: "", avatarColor: "#5b16ef", goal: "" });
  const [active, setActive] = useState("calendar");
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState("week");
  const [focusDate, setFocusDate] = useState(todayISO());
  const [modal, setModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blankItem());
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState("");

  const api = useMemo(() => axios.create({ baseURL: API_URL, headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token]);
  const language = settings.language || "en";
  const dict = translations[language] || translations.en;
  const t = (key) => dict[key] || translations.en[key] || key;
  const start = view === "month" ? calendarStart(focusDate) : focusDate;
  const days = view === "month" ? 42 : 7;
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);

  async function load() {
    if (!token) return;
    try {
      const [me, itemRes, statRes, insightRes] = await Promise.all([
        api.get("/me"),
        api.get(`/items?start=${start}&days=${days}`),
        api.get("/stats"),
        api.get("/insights"),
      ]);
      setUser(me.data.user);
      setSettings({ ...settings, ...(me.data.user.settings || {}) });
      setProfile(me.data.user.profile || profile);
      setItems(itemRes.data);
      setStats(statRes.data);
      setInsights(insightRes.data.suggestions || []);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) logout();
      else setError("Could not load Sharp. Check MongoDB/Render backend.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, focusDate, view]);

  useEffect(() => {
    if (!settings.remindersEnabled || !("Notification" in window)) return;
    const timers = items
      .filter((item) => item.reminderEnabled && !item.completed && item.time && item.date === todayISO())
      .map((item) => {
        const due = new Date(`${item.date}T${item.time}`).getTime() - Number(item.reminderMinutesBefore || 10) * 60000;
        const delay = due - Date.now();
        if (delay <= 0 || delay > 2147483647) return null;
        return setTimeout(() => Notification.permission === "granted" && new Notification("Sharp reminder", { body: item.title }), delay);
      })
      .filter(Boolean);
    return () => timers.forEach(clearTimeout);
  }, [items, settings.remindersEnabled]);

  function finishWelcome() {
    localStorage.setItem("sharpOnboarded", "yes");
    setOnboarded(true);
  }

  async function submitAuth() {
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
      const res = await axios.post(`${API_URL}${endpoint}`, auth);
      localStorage.setItem("sharpToken", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setSettings({ ...settings, ...(res.data.user.settings || {}) });
      setProfile(res.data.user.profile || profile);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not sign in.");
    }
  }

  function logout() {
    localStorage.removeItem("sharpToken");
    setToken("");
    setUser(null);
  }

  function openCreate(date = focusDate) {
    setForm({ ...blankItem(), startDate: date });
    setEditingId("");
    setModal(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      kind: item.kind, title: item.title, startDate: item.startDate || item.date, time: item.time || "",
      endTime: item.endTime || "", recurrence: item.recurrence || "none", customIntervalDays: item.customIntervalDays || 2,
      customLabel: item.customLabel || "", color: item.color || "#5b16ef", reminderEnabled: item.reminderEnabled !== false,
      reminderMinutesBefore: item.reminderMinutesBefore || 10, notes: item.notes || "",
    });
    setModal(true);
  }

  async function saveItem() {
    if (!form.title.trim()) return setError("Add a title first.");
    const payload = form.kind === "task" ? { ...form, endTime: "", recurrence: "none" } : form;
    if (editingId) await api.put(`/items/${editingId}`, payload);
    else await api.post("/items", payload);
    setModal(false);
    await load();
  }

  async function deleteItem() {
    if (!editingId) return;
    await api.delete(`/items/${editingId}`);
    setModal(false);
    await load();
  }

  async function toggle(item) {
    await api.post(`/items/${item.id}/toggle`, { date: item.date, start });
    await load();
  }

  async function moveItem(id, date) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    await api.put(`/items/${id}`, { ...item, startDate: date });
    setDragOver("");
    await load();
  }

  async function sendMessage() {
    if (!message.trim()) return;
    const text = message;
    setMessage("");
    try {
      const res = await api.post("/chat", { message: text });
      setChat((current) => [...current, { role: "you", text }, { role: "ai", text: res.data.reply }]);
      await load();
    } catch {
      setChat((current) => [...current, { role: "you", text }, { role: "ai", text: "I could not reach the planner backend." }]);
    }
  }

  async function saveSettings(next) {
    setSettings(next);
    if (next.calendarView) setView(next.calendarView);
    await api.put("/settings", next);
  }

  async function saveProfile() {
    const res = await api.put("/profile", { name: profile.displayName || user.name, profile });
    setUser(res.data.user);
    setProfile(res.data.user.profile || profile);
    setProfileModal(false);
    setNotice("Profile updated.");
  }

  async function deleteAccount() {
    const confirmed = window.confirm("Delete your Sharp account and all tasks/habits permanently?");
    if (!confirmed) return;
    await api.delete("/account");
    logout();
  }

  if (!onboarded) {
    const slides = [
      ["Plan with clarity", "Create tasks without end times and habits with real time blocks."],
      ["See your month at a glance", "A compact calendar keeps your day readable."],
      ["Track your discipline", "Stats, streaks, colors, reminders, and year progress live in one place."],
    ];
    return (
      <>
        <style>{css}</style>
        <main className="welcome">
          <section className="card">
            <div className="hero-visual">SHARP</div>
            <h1>{slides[slide][0]}</h1>
            <p className="muted">{slides[slide][1]}</p>
            <div className="actions">
              <button className="ghost" onClick={() => setSlide(Math.max(0, slide - 1))}>Back</button>
              {slide < slides.length - 1 ? <button className="primary" onClick={() => setSlide(slide + 1)}>Next</button> : <button className="primary" onClick={finishWelcome}>Start</button>}
            </div>
          </section>
        </main>
      </>
    );
  }

  if (!token || !user) {
    return (
      <>
        <style>{css}</style>
        <main className="auth">
          <section className="card">
            <div className="brand"><div className="brand-mark">S</div><h1>SHARP</h1></div>
            <p className="muted">Use your account to keep tasks, habits, and preferences synced with MongoDB.</p>
            {error && <p className="notice error">{error}</p>}
            {authMode === "signup" && <label>Name<input value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} /></label>}
            <label>Email<input value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} /></label>
            <label>Password<input type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} /></label>
            <div className="actions"><button className="primary" onClick={submitAuth}>{authMode === "login" ? "Log in" : "Sign up"}</button><button className="ghost" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Create account" : "Have account"}</button></div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <main className={`app ${settings.theme === "dark" ? "dark" : ""}`}>
        {drawer && <div className="overlay" onClick={() => setDrawer(false)} />}
        <aside className={`drawer ${drawer ? "open" : ""}`}>
          <div className="drawer-head"><h2>SHARP</h2><button className="ghost" onClick={() => setDrawer(false)}>{t("close")}</button></div>
          <div className="drawer-profile">
            <div className="drawer-avatar" style={{ background: profile.avatarColor || "#5b16ef" }}>{(profile.displayName || user.name || "S")[0]}</div>
            <strong>{profile.displayName || user.name}</strong>
            <p className="muted">{profile.goal || "Your discipline profile starts here."}</p>
          </div>
          <nav className="nav">
            {["calendar", "tracking", "profile", "settings"].map((key) => <button key={key} className={active === key ? "active" : ""} onClick={() => { setActive(key); setDrawer(false); }}>{t(key)}</button>)}
          </nav>
          <button className="danger" onClick={logout}>{t("logout")}</button>
        </aside>

        <header className="top">
          <div className="brand">
            <button className="menu" onClick={() => setDrawer(true)} aria-label="Open navigation"><span /><span /><span /></button>
            <div className="brand-mark">S</div>
            <h1>SHARP</h1>
          </div>
          <div className="actions">
            <button className="primary" onClick={() => openCreate(todayISO())}>{t("new")}</button>
            <button className="ghost" onClick={() => setFocusDate(todayISO())}>{t("today")}</button>
          </div>
        </header>

        {notice && <p className="notice">{notice}</p>}
        {error && <p className="notice error">{error}</p>}
        {active === "calendar" && settings.showAiSuggestions !== false && <Insights insights={insights} />}

        {active === "calendar" && (
          <section className="calendar-card">
            <div className="calendar-head">
              <h2>{monthTitle(focusDate, language)}</h2>
              <div className="actions">
                <div className="view-toggle"><button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>{t("week")}</button><button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>{t("month")}</button></div>
                <button className="ghost" onClick={() => setFocusDate(addDays(focusDate, view === "month" ? -30 : -7))}>{t("prev")}</button>
                <button className="ghost" onClick={() => setFocusDate(addDays(focusDate, view === "month" ? 30 : 7))}>{t("next")}</button>
              </div>
            </div>
            {view === "month" ? <MonthCalendar dates={dates} items={items} language={language} dragOver={dragOver} setDragOver={setDragOver} onDropItem={moveItem} onToggle={toggle} onEdit={openEdit} onCreate={openCreate} /> : <WeekCalendar dates={dates} items={items} language={language} dragOver={dragOver} setDragOver={setDragOver} onDropItem={moveItem} onToggle={toggle} onEdit={openEdit} onCreate={openCreate} />}
          </section>
        )}

        {active === "tracking" && <Tracking stats={stats} t={t} />}
        {active === "profile" && <Profile user={user} profile={profile} stats={stats} t={t} onEdit={() => setProfileModal(true)} />}
        {active === "settings" && <Settings settings={settings} saveSettings={saveSettings} onDeleteAccount={deleteAccount} t={t} />}

        <AiDock chat={chat} message={message} setMessage={setMessage} sendMessage={sendMessage} settings={settings} saveSettings={saveSettings} t={t} />

        {modal && <ItemModal form={form} setForm={setForm} editingId={editingId} onClose={() => setModal(false)} onSave={saveItem} onDelete={deleteItem} t={t} />}
        {profileModal && <ProfileModal profile={profile} setProfile={setProfile} onClose={() => setProfileModal(false)} onSave={saveProfile} t={t} />}
      </main>
    </>
  );
}

function Insights({ insights }) {
  return <section className="suggestions">{insights.map((text, index) => <article className="suggestion-card" key={index}>{text}</article>)}</section>;
}

function MonthCalendar({ dates, items, language, dragOver, setDragOver, onDropItem, onToggle, onEdit, onCreate }) {
  const weekdays = Array.from({ length: 7 }, (_, i) => dateObj(addDays("2026-02-01", i)).toLocaleDateString(language, { weekday: "short" }));
  return <div className="month-grid">{weekdays.map((d) => <div className="month-day weekday" key={d}>{d}</div>)}{dates.map((date) => <div className={`month-day ${date === todayISO() ? "today" : ""} ${dragOver === date ? "drop-target" : ""}`} key={date} onDragOver={(e) => { e.preventDefault(); setDragOver(date); }} onDragLeave={() => setDragOver("")} onDrop={(e) => onDropItem(e.dataTransfer.getData("text/plain"), date)}><div className="day-number"><b>{dateObj(date).getDate()}</b><button className="ghost" onClick={() => onCreate(date)}>+</button></div>{items.filter((item) => item.date === date).slice(0, 4).map((item) => <Event key={`${item.id}-${date}`} item={item} onToggle={onToggle} onEdit={onEdit} />)}</div>)}</div>;
}

function WeekCalendar({ dates, items, language, dragOver, setDragOver, onDropItem, onToggle, onEdit, onCreate }) {
  return <div className="week-grid"><div className="cell hour" />{dates.map((date) => <div className={`cell week-head ${date === todayISO() ? "today" : ""}`} key={date}>{dayTitle(date, language)}</div>)}<div className="cell hour">All day</div>{dates.map((date) => <div className={`cell ${dragOver === `${date}-all` ? "drop-target" : ""}`} key={`${date}-all`} onDoubleClick={() => onCreate(date)} onDragOver={(e) => { e.preventDefault(); setDragOver(`${date}-all`); }} onDragLeave={() => setDragOver("")} onDrop={(e) => onDropItem(e.dataTransfer.getData("text/plain"), date)}>{items.filter((item) => item.date === date && item.kind === "task" && !item.time).map((item) => <Event key={`${item.id}-${date}`} item={item} onToggle={onToggle} onEdit={onEdit} week />)}</div>)}{Array.from({ length: 17 }, (_, i) => i + 6).map((hour) => <React.Fragment key={hour}><div className="cell hour">{String(hour).padStart(2, "0")}:00</div>{dates.map((date) => <div className={`cell ${dragOver === `${date}-${hour}` ? "drop-target" : ""}`} key={`${date}-${hour}`} onDoubleClick={() => onCreate(date)} onDragOver={(e) => { e.preventDefault(); setDragOver(`${date}-${hour}`); }} onDragLeave={() => setDragOver("")} onDrop={(e) => onDropItem(e.dataTransfer.getData("text/plain"), date)}>{items.filter((item) => item.date === date && ((item.kind === "habit" && hourOf(item) === hour) || (item.kind === "task" && item.time && hourOf(item) === hour))).map((item) => <Event key={`${item.id}-${date}`} item={item} onToggle={onToggle} onEdit={onEdit} week />)}</div>)}</React.Fragment>)}</div>;
}

function Event({ item, onToggle, onEdit, week }) {
  const height = week && item.kind === "habit" && item.time && item.endTime ? Math.max(26, ((minutes(item.endTime) - minutes(item.time)) / 60) * 42) : undefined;
  return <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)} className={`${week ? "habit-block" : "event"} ${item.kind} ${item.completed ? "done" : ""}`} style={{ background: item.color, minHeight: height }} onClick={() => onEdit(item)}><input type="checkbox" checked={item.completed} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(item)} /><span>{item.title}{item.kind === "habit" && item.time ? ` ${item.time}-${item.endTime}` : item.time ? ` ${item.time}` : ""}</span></div>;
}

function AiDock({ chat, message, setMessage, sendMessage, settings, saveSettings, t }) {
  return <section className="ai-dock"><div className="ai-dock-head"><h2>{t("sharpAi")}</h2><button className="ghost" onClick={() => saveSettings({ ...settings, showAiSuggestions: settings.showAiSuggestions === false })}>{settings.showAiSuggestions === false ? t("show") : t("hide")} suggestions</button></div><div className="chat-log">{chat.length === 0 && <p className="muted">Try asking Sharp to review your week, not just create tasks.</p>}{chat.map((entry, index) => <div key={index} className={`bubble ${entry.role}`}>{entry.text}</div>)}</div><div className="chat-box"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={t("ask")} /><button className="primary" onClick={sendMessage}>{t("send")}</button></div></section>;
}

function ItemModal({ form, setForm, editingId, onClose, onSave, onDelete, t }) {
  return <div className="modal-backdrop"><section className="modal form"><h2>{t("createTitle")}</h2><div className="segmented"><button className={form.kind === "task" ? "active" : ""} onClick={() => setForm({ ...form, kind: "task", endTime: "", recurrence: "none" })}>{t("task")}</button><button className={form.kind === "habit" ? "active" : ""} onClick={() => setForm({ ...form, kind: "habit", recurrence: form.recurrence === "none" ? "daily" : form.recurrence, time: form.time || "08:00", endTime: form.endTime || "09:00" })}>{t("habit")}</button></div><label>{t("title")}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Water plants" /></label><label>{t("date")}<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>{form.kind === "task" ? t("optionalTime") : t("startTime")}<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>{form.kind === "habit" && <label>{t("endTime")}<input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>}<label>{t("repeat")}<select disabled={form.kind === "task"} value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>{recurrences.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>{form.recurrence === "custom" && <div className="two"><label>Every N days<input type="number" min="1" value={form.customIntervalDays} onChange={(e) => setForm({ ...form, customIntervalDays: e.target.value })} /></label><label>Label<input value={form.customLabel} onChange={(e) => setForm({ ...form, customLabel: e.target.value })} placeholder="Exam season" /></label></div>}<label>{t("color")}<div className="colors">{colors.map((color) => <button type="button" className={`swatch ${form.color === color ? "active" : ""}`} style={{ background: color }} key={color} onClick={() => setForm({ ...form, color })} />)}</div></label><div className="two"><label>{t("reminder")}<select value={String(form.reminderEnabled)} onChange={(e) => setForm({ ...form, reminderEnabled: e.target.value === "true" })}><option value="true">On</option><option value="false">Off</option></select></label><label>{t("minutesBefore")}<input type="number" value={form.reminderMinutesBefore} onChange={(e) => setForm({ ...form, reminderMinutesBefore: e.target.value })} /></label></div><label>{t("notes")}<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><div className="actions"><button className="primary" onClick={onSave}>{editingId ? t("save") : t("create")}</button>{editingId && <button className="danger" onClick={onDelete}>{t("delete")}</button>}<button className="ghost" onClick={onClose}>{t("cancel")}</button></div></section></div>;
}

function Tracking({ stats, t }) {
  const now = new Date();
  const end = new Date(now.getFullYear(), 11, 31);
  const dayOfYear = Math.ceil((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const left = Math.ceil((end - now) / 86400000);
  const weekly = stats?.weekly || [];
  const max = Math.max(1, ...weekly.map((entry) => entry.count));
  return <section className="tracking-page"><div className="metric"><h2>{t("completed")}</h2><strong>{stats?.completions || 0}</strong><div className="bars">{weekly.map((entry) => <span className="bar" title={entry.date} style={{ height: `${Math.max(8, (entry.count / max) * 100)}%` }} key={entry.date} />)}</div></div><div className="metric"><h2>{t("bestStreak")}</h2><strong>{stats?.bestStreak || 0}</strong><p className="muted">{stats?.reward || "Build your first streak."}</p></div><div className="metric"><h2>{t("yearProgress")}</h2><strong>{left}</strong><p className="muted">{t("daysLeft")}</p><div className="year-grid">{Array.from({ length: 52 }, (_, i) => <span key={i} className={i < Math.round(dayOfYear / 7) ? "left" : ""} />)}</div></div></section>;
}

function Profile({ user, profile, stats, t, onEdit }) {
  const name = profile.displayName || user.name;
  return <section className="profile-page"><article className="profile-card"><div className="profile-header"><div className="profile-avatar" style={{ background: profile.avatarColor || "#5b16ef" }}>{(name || "S")[0]}</div><div className="profile-title"><h2>{name}</h2><p className="muted">{profile.goal || "No goal set yet"}</p><span className="streak-badge">{stats?.currentStreak || 0}-day streak</span></div></div><div className="profile-stats"><div className="profile-stat"><strong>{stats?.bestStreak || 0}</strong><span>{t("bestStreak")}</span></div><div className="profile-stat"><strong>{stats?.completions || 0}</strong><span>{t("completed")}</span></div><div className="profile-stat"><strong>{stats?.habits || 0}</strong><span>{t("habit")}</span></div></div><div className="profile-goal"><strong>{t("goal")}</strong><p className="muted">{profile.goal || "Start your first habit and give Sharp something to protect."}</p></div><button className="primary" onClick={onEdit}>{t("editProfile")}</button></article></section>;
}

function ProfileModal({ profile, setProfile, onClose, onSave, t }) {
  return <div className="modal-backdrop"><section className="modal form"><h2>{t("editProfile")}</h2><label>{t("displayName")}<input value={profile.displayName || ""} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label><label>{t("goal")}<textarea value={profile.goal || ""} onChange={(e) => setProfile({ ...profile, goal: e.target.value })} /></label><label>{t("avatarColor")}<input type="color" value={profile.avatarColor || "#5b16ef"} onChange={(e) => setProfile({ ...profile, avatarColor: e.target.value })} /></label><div className="actions"><button className="primary" onClick={onSave}>{t("saveProfile")}</button><button className="ghost" onClick={onClose}>{t("cancel")}</button></div></section></div>;
}

function Settings({ settings, saveSettings, onDeleteAccount, t }) {
  return <section className="settings-page"><div className="panel form"><h2>{t("settings")}</h2><label>{t("theme")}<select value={settings.theme || "light"} onChange={(e) => saveSettings({ ...settings, theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>{t("language")}<select value={settings.language || "en"} onChange={(e) => saveSettings({ ...settings, language: e.target.value })}><option value="en">English</option><option value="fr">Francais</option><option value="es">Espanol</option></select></label><label>{t("defaultView")}<select value={settings.calendarView || "week"} onChange={(e) => saveSettings({ ...settings, calendarView: e.target.value })}><option value="week">{t("week")}</option><option value="month">{t("month")}</option></select></label><label>{t("reminders")}<select value={String(settings.remindersEnabled !== false)} onChange={(e) => saveSettings({ ...settings, remindersEnabled: e.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label><button className="primary" onClick={() => "Notification" in window && Notification.requestPermission()}>{t("allowNotifications")}</button><button className="danger" onClick={onDeleteAccount}>Delete account</button></div></section>;
}

export default App;
