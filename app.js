const STORAGE_KEY = "taskia.tasks.v2";
const LEGACY_STORAGE_KEY = "taskia.tasks.v1";
const REWARD_STORAGE_KEY = "taskia.rewards.v1";
const LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
const ACHIEVEMENTS = [
  {
    id: "first_task",
    title: "Primer paso",
    description: "Completa tu primera tarea.",
    isUnlocked: ({ completedCount }) => completedCount >= 1,
  },
  {
    id: "three_tasks",
    title: "Dia productivo",
    description: "Completa 3 tareas.",
    isUnlocked: ({ completedCount }) => completedCount >= 3,
  },
  {
    id: "high_priority",
    title: "Enfoque total",
    description: "Completa una tarea de alta prioridad.",
    isUnlocked: ({ highCompleted }) => highCompleted >= 1,
  },
  {
    id: "streak_three",
    title: "Constancia",
    description: "Mantiene una racha de 3 dias.",
    isUnlocked: ({ streak }) => streak >= 3,
  },
  {
    id: "ten_tasks",
    title: "Modo serio",
    description: "Completa 10 tareas.",
    isUnlocked: ({ completedCount }) => completedCount >= 10,
  },
  {
    id: "five_hundred_xp",
    title: "Impulso acumulado",
    description: "Alcanza 500 XP.",
    isUnlocked: ({ xp }) => xp >= 500,
  },
];

const form = document.querySelector("[data-task-form]");
const taskList = document.querySelector("[data-task-list]");
const emptyState = document.querySelector("[data-empty-state]");
const totalCounter = document.querySelector("[data-total]");
const pendingCounter = document.querySelector("[data-pending]");
const timeLeftCounter = document.querySelector("[data-time-left]");
const progressLabel = document.querySelector("[data-progress-label]");
const progressBar = document.querySelector("[data-progress-bar]");
const focusTitle = document.querySelector("[data-focus-title]");
const focusMeta = document.querySelector("[data-focus-meta]");
const focusReason = document.querySelector("[data-focus-reason]");
const planButton = document.querySelector("[data-plan-button]");
const planBox = document.querySelector("[data-plan-box]");
const aiButton = document.querySelector("[data-ai-button]");
const aiDiagnosis = document.querySelector("[data-ai-diagnosis]");
const aiSubtasks = document.querySelector("[data-ai-subtasks]");
const aiStrategy = document.querySelector("[data-ai-strategy]");
const aiJson = document.querySelector("[data-ai-json]");
const authForm = document.querySelector("[data-auth-form]");
const authSubmit = document.querySelector("[data-auth-submit]");
const authTabs = document.querySelectorAll("[data-auth-mode]");
const authEmail = document.querySelector("[data-auth-email]");
const authPassword = document.querySelector("[data-auth-password]");
const authHelp = document.querySelector("[data-auth-help]");
const passwordToggle = document.querySelector("[data-password-toggle]");
const logoutButton = document.querySelector("[data-logout-button]");
const syncButton = document.querySelector("[data-sync-button]");
const authStatus = document.querySelector("[data-auth-status]");
const cloudMessage = document.querySelector("[data-cloud-message]");
const cloudDot = document.querySelector("[data-cloud-dot]");
const levelLabel = document.querySelector("[data-level-label]");
const xpLabel = document.querySelector("[data-xp-label]");
const xpBar = document.querySelector("[data-xp-bar]");
const nextLevelLabel = document.querySelector("[data-next-level]");
const streakCount = document.querySelector("[data-streak-count]");
const streakText = document.querySelector("[data-streak-text]");
const achievementCount = document.querySelector("[data-achievement-count]");
const nextAchievement = document.querySelector("[data-next-achievement]");
const rewardToast = document.querySelector("[data-reward-toast]");
const filterButtons = document.querySelectorAll("[data-filter]");
const matrixLists = document.querySelectorAll("[data-matrix]");
const viewTabs = document.querySelectorAll("[data-view-tab]");
const viewSections = document.querySelectorAll("[data-view]");

let tasks = loadTasks();
let rewards = loadRewards();
let currentFilter = "all";
let toastTimer;
let syncTimer;
let supabaseClient = null;
let currentUser = null;
let cloudReady = false;
let authMode = "login";

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = String(formData.get("title")).trim();

  if (!title) return;

  const task = {
    id: createId(),
    title,
    note: String(formData.get("note")).trim(),
    category: String(formData.get("category")),
    time: Number(formData.get("time")),
    dueDate: String(formData.get("dueDate")),
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: "",
    rewardClaimed: false,
  };

  tasks = [task, ...tasks];
  form.reset();
  saveAndRender();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    render();
  });
});

planButton.addEventListener("click", () => {
  renderPlan();
});

aiButton.addEventListener("click", () => {
  renderAiAnalysis();
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  authMode === "login" ? signIn() : signUp();
});

logoutButton.addEventListener("click", () => {
  signOut();
});

syncButton.addEventListener("click", () => {
  syncCloudState();
});

authTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode);
  });
});

viewTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.viewTab);
  });
});

passwordToggle.addEventListener("click", () => {
  const isPassword = authPassword.type === "password";
  authPassword.type = isPassword ? "text" : "password";
  passwordToggle.textContent = isPassword ? "Ocultar" : "Mostrar";
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const item = event.target.closest("[data-task-id]");

  if (!button || !item) return;

  const taskId = item.dataset.taskId;
  const action = button.dataset.action;

  if (action === "start") updateTaskStatus(taskId, "progress");
  if (action === "done") updateTaskStatus(taskId, "done");
  if (action === "reopen") updateTaskStatus(taskId, "pending");
  if (action === "delete") {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveAndRender();
  }
});

render();
initCloud();

function loadTasks() {
  const saved = readStoredTasks(STORAGE_KEY) ?? readStoredTasks(LEGACY_STORAGE_KEY) ?? [];

  return saved.map((task) => ({
    ...task,
    note: task.note ?? "",
    status: task.status ?? (task.done ? "done" : "pending"),
    completedAt: task.completedAt ?? "",
    rewardClaimed: task.rewardClaimed ?? Boolean(task.done || task.status === "done"),
  }));
}

function loadRewards() {
  const saved = readStoredTasks(REWARD_STORAGE_KEY);

  return {
    ...createEmptyRewards(),
    ...saved,
  };
}

function createEmptyRewards() {
  return {
    xp: 0,
    streak: 0,
    lastCompletionDate: "",
    unlockedAchievements: [],
  };
}

function readStoredTasks(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function resetLocalState() {
  window.clearTimeout(syncTimer);
  tasks = [];
  rewards = createEmptyRewards();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(REWARD_STORAGE_KEY);
  render();
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(rewards));
}

function saveAndRender({ sync = true } = {}) {
  persistLocalState();
  render();

  if (sync && currentUser) {
    scheduleCloudSync();
  }
}

function scheduleCloudSync() {
  window.clearTimeout(syncTimer);
  cloudMessage.textContent = "Guardando cambios en la nube...";

  syncTimer = window.setTimeout(() => {
    syncCloudState("Progreso guardado automaticamente.");
  }, 800);
}

async function initCloud() {
  const config = window.TASKIA_SUPABASE;

  if (!config?.url || !config?.anonKey) {
    updateAuthUi("Modo local", "Tu progreso se guarda en este navegador. Completa supabase-config.js para activar login y base de datos.", false);
    return;
  }

  try {
    if (!window.supabase?.createClient) {
      updateAuthUi("Modo local", "No se pudo cargar la libreria de Supabase. Revisa tu conexion o prueba desde GitHub Pages.", false);
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    cloudReady = true;

    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user ?? null;

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user ?? null;
      updateAuthUiForUser();

      if (currentUser) {
        loadCloudState();
      }
    });

    updateAuthUiForUser();

    if (currentUser) {
      await loadCloudState();
    }
  } catch (error) {
    updateAuthUi("Modo local", `No se pudo cargar Supabase. La app seguira usando localStorage. Detalle: ${error.message}`, false);
  }
}

async function signUp() {
  if (!ensureCloudReady()) return;

  const { email, password } = getAuthCredentials();
  if (!email || !password) return;

  setAuthLoading(true, "Creando...");
  const { error } = await supabaseClient.auth.signUp({ email, password });
  setAuthLoading(false);

  if (error) {
    cloudMessage.textContent = `No se pudo crear la cuenta: ${error.message}`;
    return;
  }

  cloudMessage.textContent = "Cuenta creada. Revisa tu correo si Supabase pide confirmacion.";
}

async function signIn() {
  if (!ensureCloudReady()) return;

  const { email, password } = getAuthCredentials();
  if (!email || !password) return;

  setAuthLoading(true, "Ingresando...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setAuthLoading(false);

  if (error) {
    cloudMessage.textContent = `No se pudo iniciar sesion: ${error.message}`;
    return;
  }

  currentUser = data.user;
  updateAuthUiForUser();
  await loadCloudState();
}

async function signOut() {
  if (!ensureCloudReady()) return;

  setButtonLoading(logoutButton, true, "Cerrando...");
  window.clearTimeout(syncTimer);

  if (currentUser) {
    const saved = await syncCloudState("Progreso guardado antes de cerrar sesion.");

    if (!saved) {
      setButtonLoading(logoutButton, false);
      cloudMessage.textContent = "No se cerro sesion porque no se pudo guardar la ultima version en la nube.";
      return;
    }
  }

  await supabaseClient.auth.signOut();
  setButtonLoading(logoutButton, false);
  currentUser = null;
  resetLocalState();
  updateAuthUiForUser();
  cloudMessage.textContent = "Sesion cerrada. Las tareas y recompensas locales se limpiaron de este navegador.";
}

async function loadCloudState() {
  if (!currentUser || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("taskia_state")
    .select("tasks,rewards")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    cloudMessage.textContent = `No se pudo cargar progreso remoto: ${error.message}`;
    return;
  }

  if (!data) {
    await syncCloudState("Tu cuenta esta lista. Se subio tu progreso local inicial.");
    return;
  }

  tasks = Array.isArray(data.tasks) ? data.tasks : [];
  rewards = {
    xp: data.rewards?.xp ?? 0,
    streak: data.rewards?.streak ?? 0,
    lastCompletionDate: data.rewards?.lastCompletionDate ?? "",
    unlockedAchievements: data.rewards?.unlockedAchievements ?? [],
  };

  saveAndRender({ sync: false });
  cloudMessage.textContent = "Progreso cargado desde la nube.";
}

async function syncCloudState(successMessage = "Progreso sincronizado con la nube.") {
  if (!ensureCloudReady()) return false;

  if (!currentUser) {
    cloudMessage.textContent = "Inicia sesion para sincronizar tu progreso.";
    return false;
  }

  setButtonLoading(syncButton, true, "Sincronizando...");
  const { error } = await supabaseClient.from("taskia_state").upsert({
    user_id: currentUser.id,
    tasks,
    rewards,
    updated_at: new Date().toISOString(),
  });
  setButtonLoading(syncButton, false);

  cloudMessage.textContent = error ? `No se pudo sincronizar: ${error.message}` : successMessage;
  return !error;
}

function ensureCloudReady() {
  if (cloudReady && supabaseClient) return true;

  cloudMessage.textContent = "Primero configura Supabase en supabase-config.js.";
  return false;
}

function getAuthCredentials() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !email.includes("@")) {
    cloudMessage.textContent = "Ingresa un correo valido.";
    authEmail.focus();
    return { email: "", password: "" };
  }

  if (!password || password.length < 6) {
    cloudMessage.textContent = "La contrasena debe tener al menos 6 caracteres.";
    authPassword.focus();
    return { email: "", password: "" };
  }

  return { email, password };
}

function updateAuthUiForUser() {
  if (currentUser) {
    updateAuthUi("Sesion activa", `Conectado como ${currentUser.email}. Puedes sincronizar tu progreso.`, true);
    return;
  }

  updateAuthUi("Modo local", "Inicia sesion para guardar tareas, XP, racha y logros en la nube.", false);
}

function updateAuthUi(status, message, isOnline) {
  authStatus.textContent = status;
  authStatus.classList.toggle("is-online", isOnline);
  cloudDot.classList.toggle("is-online", isOnline);
  cloudMessage.textContent = message;
  logoutButton.disabled = !isOnline;
  syncButton.disabled = !isOnline;
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";

  authTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });

  authSubmit.textContent = isLogin ? "Ingresar" : "Crear cuenta";
  authHelp.textContent = isLogin
    ? "Ingresa con tu correo para recuperar tareas, XP, racha y logros."
    : "Crea una cuenta para guardar tu progreso y sincronizarlo con Supabase.";
  authPassword.autocomplete = isLogin ? "current-password" : "new-password";
}

function setActiveView(view) {
  viewTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTab === view);
  });

  viewSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });
}

function setAuthLoading(isLoading, label = "") {
  setButtonLoading(authSubmit, isLoading, label);
  authTabs.forEach((button) => {
    button.disabled = isLoading;
  });
}

function setButtonLoading(button, isLoading, label = "") {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }

  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.textContent = isLoading ? label : button.dataset.defaultText;
}

function render() {
  const rankedTasks = getRankedTasks();
  const visibleTasks = rankedTasks.filter((task) => {
    if (currentFilter === "active") return task.status === "pending";
    if (currentFilter === "progress") return task.status === "progress";
    if (currentFilter === "done") return task.status === "done";
    return true;
  });

  taskList.innerHTML = visibleTasks.map(createTaskTemplate).join("");
  emptyState.classList.toggle("is-hidden", visibleTasks.length > 0);

  updateDashboard();
  updateRewards();
  updateFocus(rankedTasks);
  renderMatrix(rankedTasks);
  updateAiEmptyState(rankedTasks);
}

function getRankedTasks() {
  return [...tasks].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
}

function createTaskTemplate(task) {
  const priority = getPriority(task);
  const dueText = task.dueDate ? formatDate(task.dueDate) : "Sin fecha";
  const doneClass = task.status === "done" ? " is-done" : "";
  const note = task.note ? `<p class="task-note">${escapeHtml(task.note)}</p>` : "";
  const tags = getTags(task)
    .map((tag) => `<span class="badge">${tag}</span>`)
    .join("");

  return `
    <li class="task-item${doneClass}" data-task-id="${task.id}" data-priority="${priority.level}">
      <div>
        <p class="task-title">${escapeHtml(task.title)}</p>
        ${note}
        <div class="task-meta">
          <span class="badge badge--${priority.level}">${priority.label}</span>
          <span class="badge badge--status">${getStatusLabel(task.status)}</span>
          <span class="badge">${escapeHtml(task.category)}</span>
          <span class="badge">${task.time} min</span>
          <span class="badge">${dueText}</span>
        </div>
        <div class="task-tags">${tags}</div>
      </div>
      <div class="task-actions">
        ${createActionButtons(task)}
      </div>
    </li>
  `;
}

function createActionButtons(task) {
  if (task.status === "done") {
    return `
      <button class="task-action" type="button" data-action="reopen">Reabrir</button>
      <button class="task-action" type="button" data-action="delete">Eliminar</button>
    `;
  }

  if (task.status === "progress") {
    return `
      <button class="task-action" type="button" data-action="done">Completar</button>
      <button class="task-action" type="button" data-action="reopen">Pausar</button>
      <button class="task-action" type="button" data-action="delete">Eliminar</button>
    `;
  }

  return `
    <button class="task-action" type="button" data-action="start">Iniciar</button>
    <button class="task-action" type="button" data-action="done">Completar</button>
    <button class="task-action" type="button" data-action="delete">Eliminar</button>
  `;
}

function updateTaskStatus(taskId, status) {
  let earnedReward = null;

  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;

    const isFirstCompletion = status === "done" && task.status !== "done" && !task.rewardClaimed;
    const reward = isFirstCompletion ? calculateReward(task) : null;

    if (reward) {
      earnedReward = reward;
      applyReward(reward);
    }

    return {
      ...task,
      status,
      completedAt: status === "done" ? new Date().toISOString() : "",
      rewardClaimed: task.rewardClaimed || Boolean(reward),
    };
  });

  saveAndRender();

  if (earnedReward) {
    const unlocked = syncAchievements();
    saveAndRender();
    showRewardToast(earnedReward, unlocked);
  }
}

function updateDashboard() {
  const pendingTasks = tasks.filter((task) => task.status !== "done");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const totalMinutes = pendingTasks.reduce((sum, task) => sum + task.time, 0);
  const progress = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  totalCounter.textContent = tasks.length;
  pendingCounter.textContent = pendingTasks.length;
  timeLeftCounter.textContent = formatMinutes(totalMinutes);
  progressLabel.textContent = `${progress}%`;
  progressBar.style.width = `${progress}%`;
}

function updateRewards() {
  const level = getLevel(rewards.xp);
  const currentLevelXp = LEVELS[level - 1] ?? 0;
  const nextLevelXp = LEVELS[level] ?? currentLevelXp + 600;
  const levelProgress = Math.min(
    100,
    Math.round(((rewards.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100),
  );
  const lockedAchievement = ACHIEVEMENTS.find(
    (achievement) => !rewards.unlockedAchievements.includes(achievement.id),
  );

  levelLabel.textContent = `Nivel ${level}`;
  xpLabel.textContent = `${rewards.xp} XP`;
  xpBar.style.width = `${levelProgress}%`;
  nextLevelLabel.textContent = `${Math.max(nextLevelXp - rewards.xp, 0)} XP para el siguiente nivel`;
  streakCount.textContent = rewards.streak;
  streakText.textContent = rewards.streak
    ? `Llevas ${rewards.streak} dia(s) completando tareas.`
    : "Completa una tarea hoy para iniciar tu cadena.";
  achievementCount.textContent = `${rewards.unlockedAchievements.length}/${ACHIEVEMENTS.length}`;
  nextAchievement.textContent = lockedAchievement
    ? `${lockedAchievement.title}: ${lockedAchievement.description}`
    : "Todos los logros iniciales estan desbloqueados.";
}

function updateFocus(rankedTasks) {
  const focusTask = rankedTasks.find((task) => task.status !== "done");

  if (!focusTask) {
    focusTitle.textContent = tasks.length
      ? "Todo completado. Buen avance."
      : "Agrega tareas para activar el modo enfoque.";
    focusMeta.textContent = tasks.length
      ? "No tienes pendientes activos en este momento."
      : "Focora elegira la tarea con mejor combinacion de urgencia, impacto y esfuerzo.";
    focusReason.textContent = "";
    return;
  }

  const priority = getPriority(focusTask);
  const tags = getTags(focusTask).join(", ");

  focusTitle.textContent = focusTask.title;
  focusMeta.textContent = `${priority.label} - ${focusTask.category} - ${formatMinutes(focusTask.time)}`;
  focusReason.textContent = `Motivo: ${getPriorityReason(focusTask)}${tags ? ` Etiquetas: ${tags}.` : ""}`;
}

function renderPlan() {
  const activeTasks = getRankedTasks()
    .filter((task) => task.status !== "done")
    .slice(0, 6);

  if (activeTasks.length === 0) {
    planBox.textContent = tasks.length
      ? "No hay tareas pendientes para planificar."
      : "Agrega tareas pendientes y genera una agenda sugerida.";
    return;
  }

  let startMinutes = 9 * 60;

  planBox.innerHTML = activeTasks
    .map((task, index) => {
      const endMinutes = startMinutes + task.time;
      const timeRange = `${formatClock(startMinutes)} - ${formatClock(endMinutes)}`;
      const html = `
        <div class="plan-item">
          <span class="plan-time">${timeRange}</span>
          <span>${escapeHtml(task.title)}</span>
        </div>
      `;

      startMinutes = endMinutes + (index < activeTasks.length - 1 ? 10 : 0);
      return html;
    })
    .join("");
}

function renderAiAnalysis() {
  const analysis = buildAiAnalysis();

  if (!analysis) {
    aiDiagnosis.textContent = "Agrega tareas pendientes para generar un analisis inteligente.";
    aiSubtasks.innerHTML = "<li>Sin tareas pendientes.</li>";
    aiStrategy.textContent = "Crea una tarea pequena y completala para iniciar el flujo.";
    aiJson.textContent = "{}";
    return;
  }

  aiDiagnosis.textContent = analysis.diagnosis;
  aiSubtasks.innerHTML = analysis.subtasks
    .map((subtask) => `<li>${escapeHtml(subtask)}</li>`)
    .join("");
  aiStrategy.textContent = analysis.strategy;
  aiJson.textContent = JSON.stringify(analysis.apiPayload, null, 2);
}

function updateAiEmptyState(rankedTasks) {
  if (rankedTasks.some((task) => task.status !== "done")) return;

  aiDiagnosis.textContent = tasks.length
    ? "No hay tareas pendientes para analizar."
    : "Agrega tareas y genera un analisis para ver el diagnostico.";
  aiSubtasks.innerHTML = tasks.length
    ? "<li>Todo esta completado por ahora.</li>"
    : "<li>Sin subtareas sugeridas todavia.</li>";
  aiStrategy.textContent = tasks.length
    ? "Buen cierre. Registra una nueva tarea cuando aparezca el siguiente pendiente."
    : "Focora sugerira una forma concreta de empezar.";
  aiJson.textContent = "{}";
}

function buildAiAnalysis() {
  const activeTasks = getRankedTasks().filter((task) => task.status !== "done");
  const focusTask = activeTasks[0];

  if (!focusTask) return null;

  const priority = getPriority(focusTask);
  const tags = getTags(focusTask).filter((tag) => tag !== "sin etiqueta");
  const matrixGroup = getMatrixGroup(focusTask);
  const subtasks = suggestSubtasks(focusTask);
  const plan = buildSuggestedPlan(activeTasks.slice(0, 4));
  const strategy = getAntiProcrastinationStrategy(focusTask, matrixGroup);
  const diagnosis = [
    `La tarea mas conveniente para empezar es "${focusTask.title}".`,
    `Nivel detectado: ${priority.label.toLowerCase()}.`,
    `Motivo principal: ${getPriorityReason(focusTask)}.`,
  ].join(" ");

  return {
    diagnosis,
    subtasks,
    strategy,
    apiPayload: {
      selectedTask: {
        title: focusTask.title,
        category: focusTask.category,
        priority: priority.label,
        effortMinutes: focusTask.time,
        tags,
        reason: getPriorityReason(focusTask),
      },
      suggestedSubtasks: subtasks,
      antiProcrastinationStrategy: strategy,
      suggestedPlan: plan,
      nextApiStep:
        "Enviar este payload a un backend seguro para reemplazar el motor local por una API real de IA.",
    },
  };
}

function suggestSubtasks(task) {
  const text = normalizeText(`${task.title} ${task.note ?? ""}`);

  if (text.includes("examen") || text.includes("parcial") || text.includes("final")) {
    return [
      "Revisar los temas que entran en la evaluacion.",
      "Separar los conceptos que dominas y los que debes reforzar.",
      "Resolver ejercicios o preguntas de practica.",
      "Hacer una revision final de 15 minutos.",
    ];
  }

  if (text.includes("reporte") || text.includes("informe")) {
    return [
      "Definir estructura del documento.",
      "Reunir fuentes o datos necesarios.",
      "Redactar un primer borrador sin buscar perfeccion.",
      "Revisar formato, claridad y entrega final.",
    ];
  }

  if (text.includes("programar") || text.includes("codigo") || text.includes("app")) {
    return [
      "Definir el comportamiento minimo que debe funcionar.",
      "Crear o revisar la estructura de archivos.",
      "Implementar una primera version funcional.",
      "Probar el flujo principal y corregir errores visibles.",
    ];
  }

  if (text.includes("investigar")) {
    return [
      "Escribir la pregunta principal de investigacion.",
      "Buscar 3 fuentes utiles.",
      "Extraer ideas clave.",
      "Convertir hallazgos en un resumen accionable.",
    ];
  }

  return [
    "Abrir la tarea y definir el primer paso minimo.",
    "Trabajar 10 minutos sin cambiar de contexto.",
    "Registrar el avance conseguido.",
    "Decidir si continuar, pausar o completar.",
  ];
}

function getAntiProcrastinationStrategy(task, matrixGroup) {
  if (task.time >= 120) {
    return "Divide la tarea en un bloque inicial de 25 minutos. El objetivo no es terminarla, sino romper la resistencia de inicio.";
  }

  if (matrixGroup === "quick") {
    return "Cierrala de inmediato con una regla de 15 a 30 minutos. Es una victoria rapida que aumenta impulso.";
  }

  if (matrixGroup === "urgent") {
    return "Empieza por el entregable minimo aceptable. Primero asegura avance visible; despues mejoras calidad.";
  }

  return "Usa una cuenta regresiva de 10 minutos y empieza por la parte mas pequena. Si al terminar tienes energia, continua otro bloque.";
}

function buildSuggestedPlan(tasksToPlan) {
  let startMinutes = 9 * 60;

  return tasksToPlan.map((task, index) => {
    const endMinutes = startMinutes + task.time;
    const block = {
      time: `${formatClock(startMinutes)} - ${formatClock(endMinutes)}`,
      task: task.title,
    };

    startMinutes = endMinutes + (index < tasksToPlan.length - 1 ? 10 : 0);
    return block;
  });
}

function renderMatrix(rankedTasks) {
  const groups = {
    urgent: [],
    important: [],
    quick: [],
    later: [],
  };

  rankedTasks
    .filter((task) => task.status !== "done")
    .forEach((task) => {
      groups[getMatrixGroup(task)].push(task);
    });

  matrixLists.forEach((list) => {
    const group = list.dataset.matrix;
    const items = groups[group].slice(0, 4);

    list.innerHTML = items.length
      ? items.map((task) => `<li>${escapeHtml(task.title)}</li>`).join("")
      : "<li>Sin tareas</li>";
  });
}

function getMatrixGroup(task) {
  const score = getPriorityScore(task);
  const daysLeft = task.dueDate ? getDaysLeft(task.dueDate) : 99;
  const isUrgent = daysLeft <= 2 || score >= 80;
  const isQuick = task.time <= 30;

  if (isUrgent && score >= 60) return "urgent";
  if (isQuick) return "quick";
  if (score >= 45) return "important";
  return "later";
}

function getPriority(task) {
  const score = getPriorityScore(task);

  if (score >= 75) return { level: "high", label: "Alta prioridad" };
  if (score >= 45) return { level: "medium", label: "Prioridad media" };
  return { level: "low", label: "Prioridad baja" };
}

function calculateReward(task) {
  const priority = getPriority(task);
  const baseXp = getBaseXp(task.time);
  const priorityBonus = priority.level === "high" ? 25 : priority.level === "medium" ? 10 : 0;
  const progressBonus = task.status === "progress" ? 10 : 0;
  const totalXp = baseXp + priorityBonus + progressBonus;

  return {
    xp: totalXp,
    title: task.title,
    detail: `${baseXp} XP base${priorityBonus ? ` + ${priorityBonus} XP por prioridad` : ""}${progressBonus ? " + 10 XP por terminar una tarea iniciada" : ""}`,
  };
}

function getBaseXp(minutes) {
  if (minutes >= 180) return 100;
  if (minutes >= 120) return 70;
  if (minutes >= 60) return 40;
  if (minutes >= 30) return 20;
  return 10;
}

function applyReward(reward) {
  rewards.xp += reward.xp;
  updateStreak();
}

function updateStreak() {
  const today = getDateKey(new Date());
  const yesterday = getDateKey(new Date(Date.now() - 86400000));

  if (rewards.lastCompletionDate === today) return;

  rewards.streak = rewards.lastCompletionDate === yesterday ? rewards.streak + 1 : 1;
  rewards.lastCompletionDate = today;
}

function syncAchievements() {
  const snapshot = getAchievementSnapshot();
  const unlocked = [];

  ACHIEVEMENTS.forEach((achievement) => {
    if (
      !rewards.unlockedAchievements.includes(achievement.id) &&
      achievement.isUnlocked(snapshot)
    ) {
      rewards.unlockedAchievements.push(achievement.id);
      unlocked.push(achievement);
    }
  });

  return unlocked;
}

function getAchievementSnapshot() {
  const completedTasks = tasks.filter((task) => task.status === "done");
  const highCompleted = completedTasks.filter((task) => getPriorityScore(task, false) >= 75).length;

  return {
    xp: rewards.xp,
    streak: rewards.streak,
    completedCount: completedTasks.length,
    highCompleted,
  };
}

function getLevel(xp) {
  let level = 1;

  LEVELS.forEach((threshold, index) => {
    if (xp >= threshold) level = index + 1;
  });

  return level;
}

function showRewardToast(reward, unlockedAchievements) {
  const achievementText = unlockedAchievements.length
    ? `Logro desbloqueado: ${unlockedAchievements.map((item) => item.title).join(", ")}.`
    : "Sigue completando tareas para desbloquear logros.";

  rewardToast.innerHTML = `
    <strong>+${reward.xp} XP por completar</strong>
    <span>${escapeHtml(reward.title)}</span>
    <span>${reward.detail}</span>
    <span>${achievementText}</span>
  `;
  rewardToast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    rewardToast.classList.remove("is-visible");
  }, 4200);
}

function getPriorityScore(task, includeDonePenalty = true) {
  const text = normalizeText(`${task.title} ${task.note ?? ""}`);
  let score = 20;

  const highWords = ["urgente", "examen", "entrega", "parcial", "final", "hoy", "manana"];
  const mediumWords = ["practica", "tarea", "reporte", "avance", "proyecto", "leer", "estudiar"];

  highWords.forEach((word) => {
    if (text.includes(word)) score += 28;
  });

  mediumWords.forEach((word) => {
    if (text.includes(word)) score += 14;
  });

  if (task.category === "Universidad" || task.category === "Proyecto") score += 10;
  if (task.status === "progress") score += 18;
  if (task.time >= 120) score += 12;
  if (task.time <= 30) score += 6;

  if (task.dueDate) {
    const daysLeft = getDaysLeft(task.dueDate);

    if (daysLeft <= 0) score += 35;
    else if (daysLeft <= 1) score += 28;
    else if (daysLeft <= 3) score += 18;
    else if (daysLeft <= 7) score += 8;
  }

  if (includeDonePenalty && task.status === "done") score -= 100;

  return score;
}

function getPriorityReason(task) {
  const reasons = [];
  const text = normalizeText(`${task.title} ${task.note ?? ""}`);

  if (task.status === "progress") reasons.push("ya esta en progreso");
  if (task.dueDate && getDaysLeft(task.dueDate) <= 2) reasons.push("tiene fecha limite cercana");
  if (["Universidad", "Proyecto"].includes(task.category)) reasons.push("impacta tu avance academico");
  if (task.time <= 30) reasons.push("puede cerrarse rapido");
  if (["examen", "entrega", "urgente", "final"].some((word) => text.includes(word))) {
    reasons.push("contiene palabras de alta prioridad");
  }

  return reasons.length ? reasons.join(", ") : "tiene buena relacion entre prioridad y esfuerzo";
}

function getTags(task) {
  const text = normalizeText(`${task.title} ${task.note ?? ""}`);
  const tags = [];
  const rules = [
    ["examen", "evaluacion"],
    ["parcial", "evaluacion"],
    ["final", "evaluacion"],
    ["entrega", "deadline"],
    ["urgente", "urgente"],
    ["leer", "lectura"],
    ["estudiar", "estudio"],
    ["programar", "codigo"],
    ["codigo", "codigo"],
    ["reporte", "documento"],
    ["investigar", "investigacion"],
  ];

  rules.forEach(([word, tag]) => {
    if (text.includes(word) && !tags.includes(tag)) tags.push(tag);
  });

  if (task.dueDate && getDaysLeft(task.dueDate) <= 2) tags.push("cercana");
  if (task.time <= 30) tags.push("rapida");

  return tags.length ? tags : ["sin etiqueta"];
}

function getStatusLabel(status) {
  if (status === "progress") return "En progreso";
  if (status === "done") return "Completada";
  return "Pendiente";
}

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDaysLeft(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${dateString}T00:00:00`);
  const diff = dueDate.getTime() - today.getTime();

  return Math.ceil(diff / 86400000);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
