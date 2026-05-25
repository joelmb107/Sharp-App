require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const CORS_ORIGINS = process.env.CORS_ORIGINS || "";
const JWT_SECRET = process.env.JWT_SECRET || "sharp-dev-secret-change-me";

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const allowedOrigins = new Set([...parseOrigins(FRONTEND_URL), ...parseOrigins(CORS_ORIGINS)]);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has("*") || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from ${origin}. Add it to FRONTEND_URL or CORS_ORIGINS.`);
    return callback(null, false);
  },
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "missing-key",
  defaultHeaders: {
    "HTTP-Referer": FRONTEND_URL,
    "X-Title": "Sharp",
  },
});

mongoose.set("bufferCommands", false);

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Add it in Render Environment Variables.");
} else {
  mongoose
    .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log("MongoDB connected"))
    .catch((error) => console.error("MongoDB connection failed:", error.message));
}

const settingsSchema = new mongoose.Schema(
  {
    theme: { type: String, default: "light" },
    language: { type: String, default: "en" },
    remindersEnabled: { type: Boolean, default: true },
    calendarView: { type: String, default: "week" },
    showAiSuggestions: { type: Boolean, default: true },
    weekStartsOn: { type: String, default: "monday" },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    displayName: String,
    avatarColor: { type: String, default: "#5b16ef" },
    goal: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    profile: { type: profileSchema, default: () => ({}) },
    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["task", "habit"], default: "task" },
    title: { type: String, required: true },
    notes: { type: String, default: "" },
    startDate: { type: String, required: true },
    time: { type: String, default: "" },
    endTime: { type: String, default: "" },
    recurrence: { type: String, enum: ["none", "daily", "weekly", "weekdays", "weekends", "monthly", "yearly", "custom"], default: "none" },
    customIntervalDays: { type: Number, default: 1 },
    customLabel: { type: String, default: "" },
    color: { type: String, default: "#5b16ef" },
    reminderEnabled: { type: Boolean, default: true },
    reminderMinutesBefore: { type: Number, default: 10 },
    completions: { type: Map, of: Boolean, default: {} },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Item = mongoose.model("Item", itemSchema);

function todayISO() {
  return formatLocalDate(new Date());
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return formatLocalDate(next);
}

function toMinutes(time) {
  if (!time) return 24 * 60;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
}

function parseClockTime(raw) {
  const text = String(raw || "").toLowerCase();
  if (text.includes("midnight")) return "00:00";
  if (text.includes("noon")) return "12:00";
  if (text.includes("morning")) return "08:00";
  if (text.includes("afternoon")) return "14:00";
  if (text.includes("evening")) return "18:00";
  if (text.includes("night")) return "21:00";
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)?\b/);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (match[3] === "pm" && hours !== 12) hours += 12;
  if (match[3] === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDuration(raw) {
  const text = String(raw || "").toLowerCase();
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s?(hour|hours|hr|hrs)\b/);
  const minuteMatch = text.match(/(\d+)\s?(minute|minutes|min|mins)\b/);
  let total = 0;
  if (hourMatch) total += Math.round(Number(hourMatch[1]) * 60);
  if (minuteMatch) total += Number(minuteMatch[1]);
  return total || 60;
}

function parseRecurrence(raw) {
  const text = String(raw || "").toLowerCase();
  if (text.includes("every day") || text.includes("daily")) return "daily";
  if (text.includes("weekday")) return "weekdays";
  if (text.includes("weekend")) return "weekends";
  if (text.includes("weekly") || text.includes("every week")) return "weekly";
  if (text.includes("monthly") || text.includes("every month")) return "monthly";
  if (text.includes("yearly") || text.includes("annually") || text.includes("every year")) return "yearly";
  return "none";
}

function parseDateIntent(raw) {
  const text = String(raw || "").toLowerCase();
  const explicit = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (explicit) return explicit[0];
  if (/\b(tomorrow|tomorow|tmrw|tmr)\b/.test(text)) return addDays(todayISO(), 1);
  if (/\b(today)\b/.test(text)) return todayISO();
  if (/\bnext week\b/.test(text)) return addDays(todayISO(), 7);
  const inDays = text.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) return addDays(todayISO(), Number(inDays[1]));
  const weekdayMatch = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = days.indexOf(weekdayMatch[2]);
    const current = new Date(`${todayISO()}T12:00:00`).getDay();
    let diff = (target - current + 7) % 7;
    if (diff === 0 || weekdayMatch[1]) diff += 7;
    return addDays(todayISO(), diff);
  }
  return "";
}

function parseTimeRange(raw) {
  const text = String(raw || "").toLowerCase();
  if (text.includes("midnight") && /\b(to|until|-|from)\b/.test(text)) {
    const end = text.match(/(?:to|until|-)\s*(\d{1,2})(?::(\d{2}))?\s?(am|pm)?/);
    return { time: "00:00", endTime: end ? parseClockTime(end[0]) || "01:00" : "01:00" };
  }

  const range = text.match(/\b(?:from\s*)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?\s?(am|pm)?\b/);
  if (!range) return null;

  const firstMeridiem = range[3] || range[6] || "";
  const secondMeridiem = range[6] || firstMeridiem;
  const start = parseClockTime(`${range[1]}${range[2] ? `:${range[2]}` : ""}${firstMeridiem}`);
  const end = parseClockTime(`${range[4]}${range[5] ? `:${range[5]}` : ""}${secondMeridiem}`);
  return start && end ? { time: start, endTime: end } : null;
}

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/\b(i will|i want to|i need to|please|create|add|schedule|make|remind me to|remind me|habit|task|taks)\b/gi, "")
    .replace(/\bfrom\b.*$/i, "")
    .replace(/\b(?:on|for)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\bin\s+\d+\s+days?\b/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s?(am|pm)?/gi, "")
    .replace(/\bfrom\s+\d{1,2}(?::\d{2})?\s?(am|pm)?\s*(to|until|-)\s*\d{1,2}(?::\d{2})?\s?(am|pm)?/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s?(am|pm)?\s*(to|until|-)\s*\d{1,2}(?::\d{2})?\s?(am|pm)?/gi, "")
    .replace(/\bfor\s+\d+(?:\.\d+)?\s?(hour|hours|hr|hrs|minute|minutes|min|mins)\b/gi, "")
    .replace(/\bevery\s+(day|week|month|weekday|weekend)\b/gi, "")
    .replace(/\bdaily|weekly|monthly|weekdays|weekends\b/gi, "")
    .replace(/\b(today|tomorrow|tomorow|tmrw|tmr|next week)\b/gi, "")
    .replace(/\b(a|an|the|for|to|on)\b/gi, "")
    .replace(/\bmidnight|noon|morning|afternoon|evening|night\b/gi, "")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    settings: user.settings,
  };
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database unavailable. Check MONGODB_URI on Render, then redeploy the backend." });
  }
  next();
}

async function requireUser(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) return requireDatabase(req, res, next);
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "Please log in first." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Please log in first." });
  }
}

function dateMatches(item, date) {
  if (date < item.startDate) return false;
  const start = new Date(`${item.startDate}T12:00:00`);
  const current = new Date(`${date}T12:00:00`);
  const diffDays = Math.round((current - start) / 86400000);
  const day = current.getDay();
  if (item.recurrence === "none") return diffDays === 0;
  if (item.recurrence === "daily") return true;
  if (item.recurrence === "weekly") return diffDays % 7 === 0;
  if (item.recurrence === "weekdays") return day >= 1 && day <= 5;
  if (item.recurrence === "weekends") return day === 0 || day === 6;
  if (item.recurrence === "monthly") return current.getDate() === start.getDate();
  if (item.recurrence === "yearly") return current.getMonth() === start.getMonth() && current.getDate() === start.getDate();
  if (item.recurrence === "custom") return diffDays % Math.max(1, Number(item.customIntervalDays || 1)) === 0;
  return false;
}

function isCompleted(item, date) {
  return Boolean(item.completions?.get?.(date) || item.completions?.[date]);
}

function serialize(item, date = todayISO()) {
  const data = item.toObject ? item.toObject() : item;
  return {
    ...data,
    id: data._id?.toString() || data.id,
    date,
    completed: isCompleted(item, date),
  };
}

async function rangeItems(userId, start, days) {
  const source = await Item.find({ userId }).sort({ time: 1, createdAt: 1 });
  const dates = Array.from({ length: days }, (_, index) => addDays(start, index));
  return dates.flatMap((date) => source.filter((item) => dateMatches(item, date)).map((item) => serialize(item, date)));
}

function normalizePayload(payload) {
  const text = payload.text || "";
  const parsedTime = parseClockTime(text);
  const parsedRange = parseTimeRange(text);
  const kind = payload.kind === "habit" ? "habit" : "task";
  const recurrence = payload.recurrence || parseRecurrence(text) || "none";
  const time = isTime(payload.time) ? payload.time : parsedRange?.time || parsedTime;
  const duration = parseDuration(text);
  const endTime = kind === "habit" ? (isTime(payload.endTime) ? payload.endTime : parsedRange?.endTime || (time ? fromMinutes(toMinutes(time) + duration) : "")) : "";
  return {
    kind,
    title: String(payload.title || cleanTitle(text) || "Untitled").trim(),
    notes: String(payload.notes || ""),
    startDate: payload.startDate || payload.date || parseDateIntent(text) || todayISO(),
    time: time || "",
    endTime,
    recurrence: kind === "habit" ? recurrence : "none",
    customIntervalDays: Number(payload.customIntervalDays || 1),
    customLabel: String(payload.customLabel || ""),
    color: payload.color || (kind === "habit" ? "#5b16ef" : "#21a67a"),
    reminderEnabled: Boolean(payload.reminderEnabled ?? true),
    reminderMinutesBefore: Number(payload.reminderMinutesBefore ?? 10),
  };
}

function reward(items) {
  const best = items.reduce((winner, item) => (item.streak > winner.streak ? item : winner), { streak: 0 });
  if (best.streak >= 90) return `Congrats, you are healthier than 30% of people because you kept "${best.title}" going for 3 months.`;
  if (best.streak >= 30) return `One month strong on "${best.title}".`;
  if (best.streak >= 7) return `Seven-day streak on "${best.title}". Keep protecting that rhythm.`;
  return "";
}

function completionDates(item) {
  if (!item.completions) return [];
  if (item.completions instanceof Map) return Array.from(item.completions.keys());
  return Object.keys(item.completions);
}

function currentStreak(items) {
  let streak = 0;
  let cursor = todayISO();
  const completed = new Set(items.flatMap((item) => completionDates(item)));
  while (completed.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function weeklyCompletions(items) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(todayISO(), index - 6);
    return {
      date,
      count: items.reduce((total, item) => total + (completionDates(item).includes(date) ? 1 : 0), 0),
    };
  });
}

function insightText(language, key) {
  const messages = {
    en: {
      emptyRecovery: "Tomorrow is empty. Based on your packed schedule today, Sharp suggests protecting it as a lighter recovery day.",
      startStreak: "Your habit streak can start today. Pick one small habit and check it off before adding more.",
      lateWork: "You have something scheduled very late. Moving focus work to the afternoon may make it easier to repeat.",
      balanced: "Your plan looks balanced. Keep the next action visible and simple.",
    },
    fr: {
      emptyRecovery: "Demain est vide. Vu ton planning charge aujourd'hui, Sharp te conseille de le garder comme jour plus leger.",
      startStreak: "Ta serie peut commencer aujourd'hui. Choisis une petite habitude et coche-la avant d'en ajouter d'autres.",
      lateWork: "Une activite est prevue tres tard. Deplacer le travail de concentration vers l'apres-midi pourrait aider.",
      balanced: "Ton planning semble equilibre. Garde la prochaine action simple et visible.",
    },
    es: {
      emptyRecovery: "Manana esta libre. Segun tu agenda cargada de hoy, Sharp sugiere protegerla como un dia mas ligero.",
      startStreak: "Tu racha puede empezar hoy. Elige un habito pequeno y marcalo antes de agregar mas.",
      lateWork: "Tienes algo programado muy tarde. Mover el trabajo de enfoque a la tarde puede hacerlo mas sostenible.",
      balanced: "Tu plan se ve equilibrado. Manten la siguiente accion visible y simple.",
    },
  };
  return (messages[language] || messages.en)[key];
}

function buildInsights(items, language = "en") {
  const tomorrow = addDays(todayISO(), 1);
  const tomorrowItems = items.filter((item) => dateMatches(item, tomorrow));
  const timedToday = items.filter((item) => dateMatches(item, todayISO()) && item.time).length;
  const habits = items.filter((item) => item.kind === "habit");
  const suggestions = [];

  if (tomorrowItems.length === 0 && timedToday >= 3) {
    suggestions.push(insightText(language, "emptyRecovery"));
  }
  if (habits.length > 0 && currentStreak(items) === 0) {
    suggestions.push(insightText(language, "startStreak"));
  }
  if (items.some((item) => item.time && Number(item.time.slice(0, 2)) < 5)) {
    suggestions.push(insightText(language, "lateWork"));
  }
  if (suggestions.length === 0) {
    suggestions.push(insightText(language, "balanced"));
  }

  return suggestions;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = String(raw || "").match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withoutUndefined(values) {
  return Object.fromEntries(Object.entries(values || {}).filter(([, value]) => value !== undefined && value !== ""));
}

function localCommand(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();
  const range = parseTimeRange(text);
  const time = range?.time || parseClockTime(text);
  const recurrence = parseRecurrence(text);
  const date = parseDateIntent(text) || todayISO();
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(lower.trim())) {
    return { action: "suggest", reply: "Hello. Tell me what you want to plan, adjust, or review." };
  }
  if (/\b(review|analy[sz]e|suggest|advice|recommend|improve)\b/.test(lower)) {
    return { action: "suggest", reply: "Sharp will review your plan and suggest a better rhythm based on your calendar." };
  }
  if (/^(delete|remove)\s+/.test(lower)) return { action: "delete_item", title: cleanTitle(text.replace(/^(delete|remove)\s+/i, "")) };
  if (/^(complete|done|check|finish)\s+/.test(lower)) return { action: "complete_item", title: cleanTitle(text.replace(/^(complete|done|check|finish)\s+/i, "")) };
  const editMatch = lower.match(/^(move|edit|change|reschedule)\s+(.+?)(?:\s+(?:to|for|on|at)\s+.+)?$/);
  if (editMatch) {
    return {
      action: "edit_item",
      title: cleanTitle(editMatch[2]),
      changes: {
        text,
        startDate: date,
        time,
        endTime: range?.endTime,
        recurrence: recurrence === "none" ? undefined : recurrence,
      },
    };
  }
  const creationLanguage = /\b(add|create|schedule|remind|plan|make|put|set|i will|i need to|i have to|i want to|todo|task|taks|habit|run|read|workout|study|water|call|email|buy|clean|write|practice|meditate)\b/.test(lower);
  if (!creationLanguage) {
    return { action: "suggest", reply: "I can help you create, move, review, or improve your plan. Try: add reading tomorrow at 2pm." };
  }
  const inferredKind = lower.includes("habit") || recurrence !== "none" || range?.endTime ? "habit" : "task";
  const title = cleanTitle(text);
  if (!title) {
    return { action: "suggest", reply: "What should I call this task or habit?" };
  }
  return {
    action: "create_item",
    item: {
      text,
      kind: inferredKind,
      title,
      startDate: date,
      recurrence,
      time,
      endTime: range?.endTime || (inferredKind === "habit" && time ? fromMinutes(toMinutes(time) + parseDuration(text)) : ""),
    },
  };
}

async function aiCommand(message) {
  const deterministic = localCommand(message);
  if (deterministic.action !== "suggest" || /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(String(message || "").trim().toLowerCase())) {
    return { command: deterministic };
  }
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(String(message || "").trim().toLowerCase())) {
    return { command: localCommand(message) };
  }
  if (!process.env.OPENROUTER_API_KEY) return { command: localCommand(message), warning: "OpenRouter key missing." };
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Return ONLY JSON. If the user only greets you or chats casually, use {"action":"suggest","reply":"Hello. Tell me what you want to plan."}. Shapes: {"action":"create_item","item":{"kind":"task","title":"Water plants","startDate":"2026-05-24","time":"","color":"#21a67a"}} or {"action":"create_item","item":{"kind":"habit","title":"Run","startDate":"2026-05-24","time":"06:00","endTime":"07:00","recurrence":"daily","color":"#5b16ef"}} or {"action":"delete_item","title":"Run"} or {"action":"complete_item","title":"Run"}. Tasks never need endTime. Habits can have start and end time. Recurrence supports none,daily,weekly,weekdays,weekends,monthly,yearly,custom. Respect date words like tomorrow by setting startDate.',
        },
        { role: "user", content: message },
      ],
    });
    return { command: parseJson(completion.choices[0].message.content) || localCommand(message) };
  } catch (error) {
    console.error("AI failed, using local parser:", error.message);
    return { command: localCommand(message), warning: error.message };
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "Sharp API running",
    mongoConnected: mongoose.connection.readyState === 1,
    corsOrigins: Array.from(allowedOrigins),
  });
});

app.post("/auth/signup", requireDatabase, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required." });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Account already exists." });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, profile: { displayName: name } });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/login", requireDatabase, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Wrong email or password." });
  res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.get("/me", requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.put("/profile", requireUser, async (req, res) => {
  req.user.name = req.body.name || req.user.name;
  req.user.profile = { ...req.user.profile?.toObject?.(), ...req.body.profile };
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

app.put("/settings", requireUser, async (req, res) => {
  req.user.settings = { ...req.user.settings?.toObject?.(), ...req.body };
  await req.user.save();
  res.json(req.user.settings);
});

app.get("/items", requireUser, async (req, res) => {
  res.json(await rangeItems(req.user._id, req.query.start || todayISO(), Number(req.query.days || 42)));
});

app.post("/items", requireUser, async (req, res) => {
  const item = await Item.create({ ...normalizePayload(req.body), userId: req.user._id });
  res.status(201).json({ item: serialize(item), items: await rangeItems(req.user._id, req.body.start || todayISO(), 42) });
});

app.put("/items/:id", requireUser, async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, userId: req.user._id });
  if (!item) return res.status(404).json({ error: "Item not found." });
  Object.assign(item, normalizePayload({ ...item.toObject(), ...req.body }));
  await item.save();
  res.json({ item: serialize(item), items: await rangeItems(req.user._id, req.body.start || todayISO(), 42) });
});

app.delete("/items/:id", requireUser, async (req, res) => {
  await Item.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.json({ items: await rangeItems(req.user._id, req.query.start || todayISO(), 42) });
});

app.delete("/account", requireUser, async (req, res) => {
  await Item.deleteMany({ userId: req.user._id });
  await User.deleteOne({ _id: req.user._id });
  res.json({ ok: true });
});

app.post("/items/:id/toggle", requireUser, async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, userId: req.user._id });
  if (!item) return res.status(404).json({ error: "Item not found." });
  const date = req.body.date || todayISO();
  if (isCompleted(item, date)) {
    item.completions.delete(date);
    item.streak = Math.max(0, item.streak - 1);
  } else {
    item.completions.set(date, true);
    item.streak += 1;
    item.bestStreak = Math.max(item.bestStreak, item.streak);
  }
  await item.save();
  res.json({ item: serialize(item, date), items: await rangeItems(req.user._id, req.body.start || todayISO(), 42) });
});

app.get("/stats", requireUser, async (req, res) => {
  const source = await Item.find({ userId: req.user._id });
  const completions = source.reduce((sum, item) => sum + completionDates(item).length, 0);
  const habits = source.filter((item) => item.kind === "habit");
  const tasks = source.filter((item) => item.kind === "task");
  res.json({
    total: source.length,
    tasks: tasks.length,
    habits: habits.length,
    completions,
    currentStreak: currentStreak(source),
    bestStreak: Math.max(0, ...source.map((item) => item.bestStreak || 0)),
    weekly: weeklyCompletions(source),
    reward: reward(source),
  });
});

app.get("/insights", requireUser, async (req, res) => {
  const items = await Item.find({ userId: req.user._id });
  res.json({ suggestions: buildInsights(items, req.user.settings?.language || "en") });
});

app.post("/chat", requireUser, async (req, res) => {
  const { command, warning } = await aiCommand(req.body.message);
  let reply = "Done.";
  if (command.action === "create_item") {
    const item = await Item.create({ ...normalizePayload({ text: req.body.message, ...(command.item || {}) }), userId: req.user._id });
    reply = `${item.kind === "habit" ? "Habit" : "Task"} created.`;
  }
  if (command.action === "delete_item") {
    await Item.deleteOne({ userId: req.user._id, title: new RegExp(escapeRegex(command.title), "i") });
    reply = "Deleted.";
  }
  if (command.action === "edit_item") {
    const item = await Item.findOne({ userId: req.user._id, title: new RegExp(escapeRegex(command.title), "i") });
    if (item) {
      Object.assign(item, normalizePayload({ ...item.toObject(), ...withoutUndefined(command.changes || {}) }));
      await item.save();
      reply = "Updated.";
    } else {
      reply = "I could not find that item to update.";
    }
  }
  if (command.action === "complete_item") {
    const item = await Item.findOne({ userId: req.user._id, title: new RegExp(escapeRegex(command.title), "i") });
    if (item) {
      item.completions.set(todayISO(), true);
      item.streak += 1;
      item.bestStreak = Math.max(item.bestStreak, item.streak);
      await item.save();
      reply = "Checked off.";
    }
  }
  if (command.action === "suggest") {
    reply = command.reply || "I can help you improve the plan.";
  }
  res.json({ reply, warning, items: await rangeItems(req.user._id, todayISO(), 42) });
});

app.listen(PORT, () => console.log(`Sharp backend running on port ${PORT}`));
