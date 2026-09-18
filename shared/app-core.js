const HCTK_CONFIG = window.HCTK_VARIANT_CONFIG || {};
const HCTK_LABELS = {
  todayTitle: 'Learning Card',
  noDueHeading: 'No learning card due today',
  noDueBody: '',
  blockedHeading: 'No learning card due from this link',
  blockedBody: 'This calendar link is outside its scheduled participant due window. Cards are available only during their scheduled due window.',
  contentFallback: 'Learning card',
  contentTypeFallback: 'Placeholder content type',
  contentViewedDetail: 'Participant viewed the current learning card.',
  contentCompletedDetail: 'Participant marked the scheduled refresher complete.',
  adminPreviewDetail: 'Admin opened a scheduled learning card preview.',
  calendarName: 'TKHC',
  followUpConfirmationSummary: '6-Month Follow-Up Date Confirmation',
  followUpVisitSummary: '6-Month Follow-Up Visit',
  icsFilename: 'TKHC.ics',
  testIcsFilename: 'TKHC.ics',
  ...(HCTK_CONFIG.labels || {})
};

const STUDY_DURATION_DAYS = 183;
const REMINDER_HOUR = 10;
const REMINDER_MINUTE = 0;
const REMINDER_DURATION_MINUTES = 15;
const FOLLOW_UP_VISIT_DURATION_MINUTES = 60;
const CENTRAL_TIME_ZONE = 'America/Chicago';
const SCHEDULE_POLICY_VERSION = 'weekly-saturday-v1';
const TEST_SCHEDULE_POLICY_VERSION = 'admin-minute-test-v1';
const SCHEDULE_MODE_PRODUCTION = 'production';
const SCHEDULE_MODE_TEST = 'test';
const TEST_INTERVAL_OPTIONS = [3, 5, 10, 15];
const ACTIVITY_COUNT = 26;
const CONTENT_BANK_VERSION = window.HCTK_CONTENT_BANK_VERSION || 'local-content';
const SCHEDULE_ID_PREFIX = HCTK_CONFIG.scheduleIdPrefix || 'hctk';
const COMPLETION_FORM_URL = 'https://vcom.qualtrics.com/jfe/form/SV_4Orwv8tDt1AWIsu';
const COMPLETION_FORM_FIELDS = {
  studyId: 'study_id',
  studyGroup: 'study_group',
  completionDate: 'completion_date',
  activityNumber: 'activity_number',
  openedFromCalendarNotification: 'calendar_link',
  learningActivityAnswer: 'answer'
};
const FOLLOW_UP_FORM_URL = 'https://vcom.qualtrics.com/jfe/form/SV_01EQl66mgcZtwbk';
const PARTICIPANT_PASSWORD = 'tkhcpass';
const ADMIN_PASSWORD = 'tkhcadmin';
const DEFAULT_MEDIA_PATH = 'assets/blank-card.svg';
const CONTENT_BANK = Array.isArray(window.HCTK_CONTENT_BANK) ? window.HCTK_CONTENT_BANK : [];

const elements = {
  appShell: document.querySelector('#appShell'),
  workSurface: document.querySelector('#workSurface'),
  participantSetupContent: document.querySelector('#participantSetupContent'),
  adminAccessPanel: document.querySelector('#adminAccessPanel'),
  studyIdInput: document.querySelector('#studyIdInput'),
  enrollmentDateInput: document.querySelector('#enrollmentDateInput'),
  followUpDateInput: document.querySelector('#followUpDateInput'),
  followUpTimeInput: document.querySelector('#followUpTimeInput'),
  participantGate: document.querySelector('#participantGate'),
  participantPasswordInput: document.querySelector('#participantPasswordInput'),
  participantUnlockButton: document.querySelector('#participantUnlockButton'),
  participantUnlockStatus: document.querySelector('#participantUnlockStatus'),
  adminOpenButton: document.querySelector('#adminOpenButton'),
  adminExitButton: document.querySelector('#adminExitButton'),
  adminGate: document.querySelector('#adminGate'),
  adminPasswordInput: document.querySelector('#adminPasswordInput'),
  adminUnlockButton: document.querySelector('#adminUnlockButton'),
  adminUnlockStatus: document.querySelector('#adminUnlockStatus'),
  tabButtons: [...document.querySelectorAll('.tab-button')],
  tabPanels: [...document.querySelectorAll('.tab-panel')],
  adminOnlyElements: [...document.querySelectorAll('.admin-only')],
  noDueBox: document.querySelector('#noDueBox'),
  learningCard: document.querySelector('#learningCard'),
  todayTitle: document.querySelector('#todayTitle'),
  cardMeta: document.querySelector('#cardMeta'),
  nextDueMeta: document.querySelector('#nextDueMeta'),
  contentMedia: document.querySelector('#contentMedia'),
  contentType: document.querySelector('#contentType'),
  contentTitle: document.querySelector('#contentTitle'),
  contentPrompt: document.querySelector('#contentPrompt'),
  answerChoices: document.querySelector('#answerChoices'),
  feedbackBox: document.querySelector('#feedbackBox'),
  sourceAttributions: document.querySelector('#sourceAttributions'),
  completeButton: document.querySelector('#completeButton'),
  participantFormLinkBox: document.querySelector('#participantFormLinkBox'),
  participantCompletionFormLink: document.querySelector('#participantCompletionFormLink'),
  regeneratePlanButton: document.querySelector('#regeneratePlanButton'),
  scheduleModeStatus: document.querySelector('#scheduleModeStatus'),
  scheduleActionStatus: document.querySelector('#scheduleActionStatus'),
  schedulePresetButtons: [...document.querySelectorAll('.schedule-preset-button')],
  plannedCount: document.querySelector('#plannedCount'),
  completedCount: document.querySelector('#completedCount'),
  viewedCount: document.querySelector('#viewedCount'),
  scheduleList: document.querySelector('#scheduleList'),
  activityList: document.querySelector('#activityList'),
  adminProfileSummary: document.querySelector('#adminProfileSummary'),
  refreshActivityButton: document.querySelector('#refreshActivityButton'),
  activityRefreshStatus: document.querySelector('#activityRefreshStatus'),
  adminReviewSelect: document.querySelector('#adminReviewSelect'),
  adminReviewButton: document.querySelector('#adminReviewButton'),
  adminGenerateFormLinkButton: document.querySelector('#adminGenerateFormLinkButton'),
  adminFormLinkBox: document.querySelector('#adminFormLinkBox'),
  adminCompletionFormLink: document.querySelector('#adminCompletionFormLink'),
  adminCompletionFormUrl: document.querySelector('#adminCompletionFormUrl'),
  adminReviewStatus: document.querySelector('#adminReviewStatus'),
  cardsList: document.querySelector('#cardsList'),
  downloadCalendarButton: document.querySelector('#downloadCalendarButton'),
  downloadCsvButton: document.querySelector('#downloadCsvButton'),
  exportStatus: document.querySelector('#exportStatus')
};

const state = {
  linkedActivity: null,
  adminPreviewItem: null,
  adminPlanKey: null,
  profile: null,
  plan: [],
  events: [],
  scheduleSettings: defaultScheduleSettings(),
  pendingScheduleSettings: defaultScheduleSettings(),
  adminCompletionLink: null,
  calendarOpenScheduleIds: new Set(),
  calendarLinkStatus: null,
  selectedScheduleId: null,
  participantUnlocked: false,
  adminUnlocked: false
};

document.addEventListener('DOMContentLoaded', init);

function initializeVisit() {
  state.events = [];
  state.plan = [];
  state.profile = defaultProfile();
  state.scheduleSettings = defaultScheduleSettings();
  state.participantUnlocked = false;
  state.adminUnlocked = false;
  state.linkedActivity = null;
  state.calendarLinkStatus = null;
  state.selectedScheduleId = null;
  state.adminPreviewItem = null;
  state.adminPlanKey = null;
  state.calendarOpenScheduleIds.clear();
  const params = new URLSearchParams(window.location.search);
  if (params.has('activity') || params.has('schedule')) {
    try {
      const sequence = parseActivitySequence(params.get('activity'));
      if (!sequence || !CONTENT_BANK.some((content) => content.sequence === sequence)) {
        throw new Error('This link must identify an activity from 1 to 26. Open the latest calendar event or return to Participant Setup.');
      }
      const profile = calendarLinkProfile(params);
      if (!profile?.studyId?.trim() || !isCalendarDate(profile.enrollmentDate) ||
          !isCalendarDate(profile.followUpDate) || !isLocalTime(profile.followUpTime)) {
        throw new Error('This calendar link has missing or invalid participant details. Open the latest calendar event or return to Participant Setup to create a new calendar.');
      }
      const mode = params.get('schedule_mode') || params.get('scheduleMode') || SCHEDULE_MODE_PRODUCTION;
      let settings = defaultScheduleSettings();
      if (mode === SCHEDULE_MODE_TEST) {
        const interval = Number(params.get('test_interval') || params.get('testInterval'));
        const startedAt = params.get('test_started_at') || params.get('testStartedAt') || '';
        if (!TEST_INTERVAL_OPTIONS.includes(interval) || !isCalendarTimestamp(startedAt)) {
          throw new Error('This test link needs a valid reminder interval and start time. Export a new test calendar.');
        }
        settings = { mode, testIntervalMinutes: interval, testStartedAt: startedAt };
      } else if (mode !== SCHEDULE_MODE_PRODUCTION) {
        throw new Error('This calendar link has an unrecognized schedule mode. Open the latest calendar event.');
      }
      const participantProfile = sanitizeProfile(profile);
      const item = directActivity(sequence, participantProfile, settings);
      state.profile = participantProfile;
      state.scheduleSettings = settings;
      state.linkedActivity = item;
      state.participantUnlocked = true;
    } catch {
      window.history.replaceState(null, '', new URL('./', window.location.href).href);
    }
  }
  state.pendingScheduleSettings = { ...state.scheduleSettings };
}

function isCalendarDate(value) {
  return isISODate(value) && toISODate(parseISODate(value)) === value;
}

function isCalendarTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    isCalendarDate(value.slice(0, 10)) && isLocalTime(value.slice(11, 16)) &&
    Number(value.slice(17, 19)) < 60 && isValidDate(value);
}

function directActivity(sequence, profile = state.profile, settings = state.scheduleSettings) {
  const content = CONTENT_BANK.find((entry) => entry.sequence === sequence);
  if (!content) return null;
  if (isTestScheduleSettings(settings)) {
    const dueAt = new Date(new Date(settings.testStartedAt).getTime() +
      (sequence - 1) * settings.testIntervalMinutes * 60 * 1000).toISOString();
    const stamp = compactChicagoDateTimeFromTimestamp(settings.testStartedAt).slice(0, 13);
    return {
      id: `${SCHEDULE_ID_PREFIX}-test-${stamp}-${String(sequence).padStart(3, '0')}`,
      sequenceNumber: sequence, contentId: content.id, dueAt,
      date: chicagoISODateFromTimestamp(dueAt), localTime: chicagoTimeFromTimestamp(dueAt),
      testIntervalMinutes: settings.testIntervalMinutes
    };
  }
  const firstSaturdayOffset = (6 - dayOfWeek(profile.enrollmentDate) + 7) % 7 || 7;
  const date = addDaysToISODate(profile.enrollmentDate, firstSaturdayOffset + (sequence - 1) * 7);
  return {
    id: `${SCHEDULE_ID_PREFIX}-${date}-${String(sequence).padStart(3, '0')}`,
    sequenceNumber: sequence, contentId: content.id, date,
    localTime: `${String(REMINDER_HOUR).padStart(2, '0')}:${String(REMINDER_MINUTE).padStart(2, '0')}`
  };
}

function currentParticipantScheduleItem() {
  if (!state.participantUnlocked) return null;
  if (state.linkedActivity) return isScheduleItemAccessible(state.linkedActivity) ? state.linkedActivity : null;
  let sequence;
  if (isTestScheduleMode()) {
    const elapsed = Date.now() - new Date(state.scheduleSettings.testStartedAt).getTime();
    if (elapsed < 0) return null;
    sequence = Math.min(ACTIVITY_COUNT, Math.floor(elapsed / (state.scheduleSettings.testIntervalMinutes * 60 * 1000)) + 1);
  } else {
    const first = directActivity(1);
    const days = (parseISODate(todayChicagoISODate()) - parseISODate(first.date)) / 86400000;
    if (days < 0 || days % 7 !== 0) return null;
    sequence = days / 7 + 1;
  }
  return sequence >= 1 && sequence <= ACTIVITY_COUNT ? directActivity(sequence) : null;
}

function selectParticipantActivity() {
  const item = state.linkedActivity;
  if (!item) {
    state.calendarLinkStatus = null;
    state.selectedScheduleId = currentParticipantScheduleItem()?.id || null;
    return false;
  }
  const available = isScheduleItemAccessible(item);
  state.calendarLinkStatus = {
    kind: available ? 'valid' : state.adminUnlocked ? 'adminOverride' : 'blocked',
    scheduleId: item.id
  };
  state.selectedScheduleId = available || state.adminUnlocked ? item.id : null;
  if (available) state.calendarOpenScheduleIds.add(item.id);
  return available || state.adminUnlocked;
}

function adminPlanKey() {
  return JSON.stringify([state.profile.enrollmentDate, state.scheduleSettings, CONTENT_BANK_VERSION]);
}

function ensureAdminPlan() {
  if (!state.adminUnlocked) return;
  const key = adminPlanKey();
  if (state.adminPlanKey === key) return;
  state.plan = generatePlan(state.profile, state.scheduleSettings);
  state.adminPlanKey = key;
}

async function init() {
  initializeVisit();
  hydrateProfileForm();
  bindEvents();
  await setupServiceWorker();
  selectParticipantActivity();
  recordEvent('app_opened', 'PWA opened.', {
    scheduleId: state.selectedScheduleId || '',
    openedFromCalendarNotification: state.selectedScheduleId ? openedFromCalendarNotificationValue(state.selectedScheduleId) : 'No'
  });
  renderAccessState();
  await refreshAll();
  await recordDueCardAccessIfVisible();
}

function bindEvents() {
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.adminUnlocked) return;
    if ((currentParticipantScheduleItem()?.id || null) !== state.selectedScheduleId) {
      refreshAll();
    } else {
      renderNextDueMeta();
    }
  });
  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });

  [elements.studyIdInput, elements.enrollmentDateInput, elements.followUpDateInput, elements.followUpTimeInput].forEach((input) => {
    input.addEventListener('change', saveProfileFromForm);
    input.addEventListener('blur', saveProfileFromForm);
  });

  elements.participantPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlockParticipant();
  });
  elements.participantUnlockButton.addEventListener('click', unlockParticipant);

  elements.adminOpenButton.addEventListener('click', () => {
    elements.adminGate.classList.toggle('hidden');
    elements.adminUnlockStatus.textContent = '';
  });
  elements.adminExitButton.addEventListener('click', exitAdminMode);
  elements.adminPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlockAdmin();
  });
  elements.adminUnlockButton.addEventListener('click', unlockAdmin);

  elements.regeneratePlanButton.addEventListener('click', async () => {
    await applySchedulePreset(state.pendingScheduleSettings.mode, state.pendingScheduleSettings.testIntervalMinutes);
  });

  elements.schedulePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.pendingScheduleSettings = scheduleSettingsFromPresetButton(button);
      renderSchedulePresetButtons();
    });
  });

  elements.completeButton.addEventListener('click', async () => {
    const item = currentVisibleScheduleItem();
    if (!item || !isScheduleItemAccessible(item)) return;
    await recordParticipantCompletionAndLaunchForm(item);
  });

  elements.refreshActivityButton.addEventListener('click', refreshActivityView);
  elements.adminReviewButton.addEventListener('click', reviewSelectedAdminCard);
  elements.adminGenerateFormLinkButton.addEventListener('click', generateAdminCompletionLink);
  elements.downloadCalendarButton.addEventListener('click', () => downloadCalendar());
  elements.downloadCsvButton.addEventListener('click', downloadCSV);
}

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Service worker registration failed:', error);
  }
}

async function unlockParticipant() {
  saveProfileFromForm();
  if (elements.participantPasswordInput.value !== PARTICIPANT_PASSWORD) {
    elements.participantUnlockStatus.textContent = 'Incorrect study password.';
    return;
  }
  if (!profileReadyForParticipantUnlock(state.profile)) {
    elements.participantUnlockStatus.textContent = 'Enter Study ID, Follow-up Date, and Follow-up Time before unlocking.';
    return;
  }

  state.participantUnlocked = true;
  recordEvent('participant_unlocked', 'Participant unlocked learning content.', {});
  elements.participantPasswordInput.value = '';
  elements.participantUnlockStatus.textContent = '';
  renderAccessState();
  activateTab('today');
  await refreshAll();
  await recordDueCardAccessIfVisible();
}

async function unlockAdmin() {
  if (elements.adminPasswordInput.value !== ADMIN_PASSWORD) {
    elements.adminUnlockStatus.textContent = 'Incorrect admin password.';
    return;
  }

  state.adminUnlocked = true;
  elements.adminPasswordInput.value = '';
  elements.adminUnlockStatus.textContent = '';
  elements.adminGate.classList.add('hidden');
  recordEvent('admin_unlocked', 'Admin view unlocked for this visit.', {});
  const selectedFromCalendarLink = selectParticipantActivity();
  if (state.calendarLinkStatus?.kind === 'adminOverride') {
    recordEvent('admin_calendar_link_override_viewed', 'Admin revealed a calendar-linked activity outside the participant due window.', {
      scheduleId: state.calendarLinkStatus.scheduleId,
      adminTest: true
    });
  }
  renderAccessState();
  activateTab(selectedFromCalendarLink ? 'today' : 'cards');
  await refreshAll();
}

async function exitAdminMode() {
  state.adminUnlocked = false;
  state.adminCompletionLink = null;
  state.calendarLinkStatus = null;
  elements.adminGate.classList.add('hidden');
  elements.adminUnlockStatus.textContent = '';
  elements.adminReviewStatus.textContent = '';
  if (elements.scheduleActionStatus) elements.scheduleActionStatus.textContent = '';
  if (elements.activityRefreshStatus) elements.activityRefreshStatus.textContent = '';
  state.adminPreviewItem = null;
  selectParticipantActivity();
  renderAccessState();
  activateTab('today');
  await refreshAll();
}

function renderAccessState() {
  elements.participantUnlockButton.disabled = false;
  const canUseApp = state.participantUnlocked || state.adminUnlocked;
  elements.appShell.classList.toggle('locked', !canUseApp);
  elements.appShell.classList.toggle('participant-unlocked', state.participantUnlocked);
  elements.appShell.classList.toggle('admin-mode', state.adminUnlocked);
  elements.workSurface.classList.toggle('hidden', !canUseApp);
  elements.participantSetupContent.classList.toggle('hidden', state.participantUnlocked);
  elements.adminAccessPanel.classList.toggle('admin-standalone', state.participantUnlocked);
  elements.participantGate.classList.toggle('hidden', state.participantUnlocked);
  elements.adminOpenButton.classList.toggle('hidden', state.adminUnlocked);
  elements.adminOnlyElements.forEach((element) => {
    element.classList.toggle('hidden', !state.adminUnlocked);
  });

  if (!state.adminUnlocked && ['schedule', 'activity', 'cards'].includes(activeTabName())) {
    activateTab('today');
  }
}

function activateTab(tabName) {
  const requestedAdminTab = ['schedule', 'activity', 'cards'].includes(tabName);
  const nextTab = requestedAdminTab && !state.adminUnlocked ? 'today' : tabName;

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === nextTab;
    button.classList.toggle('active', isActive);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `${nextTab}Tab`);
  });
  if (state.adminUnlocked && ['schedule', 'cards'].includes(nextTab)) {
    ensureAdminPlan();
    renderSchedule();
    renderAdminReviewPicker();
    renderCards();
    renderMetrics();
  }
}

function activeTabName() {
  const active = elements.tabButtons.find((button) => button.classList.contains('active'));
  return active?.dataset.tab || 'today';
}

function hydrateProfileForm() {
  elements.studyIdInput.value = state.profile.studyId || '';
  elements.enrollmentDateInput.value = state.profile.enrollmentDate || todayChicagoISODate();
  elements.followUpDateInput.value = state.profile.followUpDate || '';
  elements.followUpTimeInput.value = state.profile.followUpTime || '';
}

function saveProfileFromForm() {
  const previousEnrollmentDate = state.profile.enrollmentDate;
  state.profile = sanitizeProfile({
    studyId: elements.studyIdInput.value.trim().toUpperCase(),
    enrollmentDate: elements.enrollmentDateInput.value || todayChicagoISODate(),
    followUpDate: elements.followUpDateInput.value || '',
    followUpTime: elements.followUpTimeInput.value || ''
  });
  if (previousEnrollmentDate !== state.profile.enrollmentDate) {
    state.plan = [];
    state.adminPlanKey = null;
    state.adminPreviewItem = null;
  }
}

async function applySchedulePreset(mode, intervalMinutes) {
  if (!state.adminUnlocked) return;
  const normalizedMode = mode === SCHEDULE_MODE_TEST ? SCHEDULE_MODE_TEST : SCHEDULE_MODE_PRODUCTION;
  const normalizedInterval = TEST_INTERVAL_OPTIONS.includes(Number(intervalMinutes)) ? Number(intervalMinutes) : 0;
  state.scheduleSettings = normalizedMode === SCHEDULE_MODE_TEST
    ? {
      mode: SCHEDULE_MODE_TEST,
      testIntervalMinutes: normalizedInterval || TEST_INTERVAL_OPTIONS[0],
      testStartedAt: new Date().toISOString()
    }
    : defaultScheduleSettings();
  state.pendingScheduleSettings = { ...state.scheduleSettings };
  state.plan = generatePlan(state.profile, state.scheduleSettings);
  state.adminPlanKey = adminPlanKey();
  state.adminPreviewItem = null;
  state.selectedScheduleId = currentParticipantScheduleItem()?.id || state.plan[0]?.id || null;
  state.adminPreviewItem = state.plan.find((item) => item.id === state.selectedScheduleId) || state.plan[0] || null;
  state.selectedScheduleId = state.adminPreviewItem?.id || null;
  state.adminCompletionLink = null;
  recordEvent('schedule_preset_applied', scheduleCreationDetail(), {
    scheduleMode: state.scheduleSettings.mode,
    testIntervalMinutes: state.scheduleSettings.testIntervalMinutes || '',
    testStartedAt: state.scheduleSettings.testStartedAt || ''
  });
  await refreshAll();
  showActionStatus(elements.scheduleActionStatus, `Schedule regenerated: ${scheduleModeLabel()}.`);
}

async function selectAdminSchedule(scheduleId) {
  if (!state.adminUnlocked) return;
  const item = state.plan.find((planItem) => planItem.id === scheduleId);
  if (!item) return;
  state.selectedScheduleId = scheduleId;
  state.calendarLinkStatus = null;
  state.adminPreviewItem = item;
  recordEvent('admin_test_card_previewed', HCTK_LABELS.adminPreviewDetail, {
    scheduleId: item.id,
    contentId: item.contentId,
    adminTest: true,
    activityNumber: formatActivityNumber(item)
  });
  activateTab('today');
  await refreshAll();
}

async function reviewSelectedAdminCard() {
  if (!state.adminUnlocked) return;
  const scheduleId = elements.adminReviewSelect.value;
  if (!scheduleId) return;
  await selectAdminSchedule(scheduleId);
}

async function generateAdminCompletionLink() {
  if (!state.adminUnlocked) return;
  saveProfileFromForm();
  const item = selectedAdminReviewItem();
  if (!item) return;

  if (!state.profile.studyId) {
    elements.adminReviewStatus.textContent = 'Set a Study ID before generating the progress check-in form link.';
    return;
  }

  const generatedAt = new Date().toISOString();
  const completionFormUrl = buildCompletionFormUrl(generatedAt, item, { adminTest: true });
  state.adminCompletionLink = {
    scheduleId: item.id,
    generatedAt,
    url: completionFormUrl
  };
  state.selectedScheduleId = item.id;
  elements.adminReviewSelect.value = item.id;
  renderAdminReviewPicker();
  renderCards();

  recordEvent('admin_test_completion_link_created', 'Admin generated a test progress check-in form link.', {
    scheduleId: item.id,
    contentId: item.contentId,
    completionFormUrl,
    adminTest: true,
    activityNumber: formatActivityNumber(item)
  });

  renderActivity();
  elements.adminReviewStatus.textContent = `Form link ready for Activity ${formatActivityNumber(item)}.`;
}

async function refreshActivityView() {
  await refreshAll();
  showActionStatus(elements.activityRefreshStatus, `Activity log refreshed at ${formatDateTime(new Date().toISOString())}.`);
}

async function recordParticipantCompletionAndLaunchForm(item) {
  const completionFormWindow = openBlankCompletionFormWindow();
  const completedAt = new Date().toISOString();
  const completionFormUrl = buildCompletionFormUrl(completedAt, item);
  recordEvent('content_completed', HCTK_LABELS.contentCompletedDetail, {
    scheduleId: item.id,
    contentId: item.contentId,
    completionFormUrl
  });
  await refreshAll();
  launchCompletionForm(completionFormWindow, completedAt, item);
}

async function refreshAll() {
  if (!state.adminPreviewItem) selectParticipantActivity();
  renderLearningCard();
  renderNextDueMeta();
  if (!state.adminUnlocked) return;
  renderMetrics();
  renderScheduleModeStatus();
  renderActivity();
  renderAdminProfileSummary();
  if (['schedule', 'cards'].includes(activeTabName())) {
    ensureAdminPlan();
    renderSchedule();
    renderAdminReviewPicker();
    renderCards();
  }
}

function renderLearningCard() {
  const item = currentVisibleScheduleItem();
  const content = item ? contentById(item.contentId) : null;

  if (!item || !content) {
    elements.learningCard.classList.add('hidden');
    elements.noDueBox.classList.remove('hidden');
    renderNoDueState();
    return;
  }

  const adminPreview = state.adminUnlocked && state.selectedScheduleId === item.id;
  const participantInteract = !adminPreview && state.participantUnlocked && isScheduleItemAccessible(item);
  const canAnswer = participantInteract || adminPreview;
  elements.learningCard.classList.remove('hidden');
  elements.noDueBox.classList.add('hidden');
  elements.todayTitle.textContent = `Activity ${formatActivityNumber(item)}`;
  elements.cardMeta.textContent = nextActivityDueText(item);
  elements.cardMeta.classList.remove('hidden');
  elements.nextDueMeta.classList.add('hidden');
  renderContentMedia(content);
  elements.contentType.textContent = content.format;
  elements.contentType.classList.add('hidden');
  elements.contentTitle.textContent = content.title;
  elements.contentPrompt.textContent = content.prompt;
  elements.contentPrompt.classList.toggle('hidden', !content.prompt);
  elements.feedbackBox.classList.add('hidden');
  elements.feedbackBox.textContent = '';
  elements.answerChoices.innerHTML = '';
  const choices = Array.isArray(content.choices) ? content.choices : [];
  const completionEvent = latestEventForSchedule(item.id, ['content_completed']);
  const participantCompleted = participantInteract && Boolean(completionEvent);
  const participantAnswerEvent = latestEventForSchedule(item.id, ['question_answered']);
  const needsParticipantAnswer = participantInteract && choices.length > 0;
  elements.completeButton.classList.toggle('hidden', !participantInteract || participantCompleted || (needsParticipantAnswer && !participantAnswerEvent));
  renderParticipantCompletionLink(item, participantCompleted ? completionEvent : null);
  renderSourceAttributions(content);

  if (choices.length) {
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = choice;
      button.disabled = !canAnswer;
      button.addEventListener('click', async () => {
        if (!canAnswer) return;
        if (!adminPreview && !isScheduleItemAccessible(item)) {
          await refreshAll();
          return;
        }
        const isCorrect = index === content.correctIndex;
        [...elements.answerChoices.children].forEach((child) => child.classList.remove('selected'));
        button.classList.add('selected');
        renderQuestionFeedback({
          adminPreview,
          isCorrect,
          rationale: content.rationale
        });
        elements.feedbackBox.classList.remove('hidden');

        recordEvent(adminPreview ? 'admin_test_question_answered' : 'question_answered', `${adminPreview ? 'Admin test selected' : 'Selected'} choice ${index + 1}.`, {
          scheduleId: item.id,
          contentId: content.id,
          choiceIndex: index + 1,
          choiceLetter: choiceLetter(index),
          choiceText: choice,
          correct: isCorrect,
          adminTest: adminPreview,
          activityNumber: adminPreview ? formatActivityNumber(item) : ''
        });
        if (state.adminUnlocked) {
          renderMetrics();
          renderSchedule();
          renderActivity();
        }
        if (!adminPreview && participantInteract) {
          elements.completeButton.classList.remove('hidden');
        }
      });
      elements.answerChoices.appendChild(button);
    });
  }
}

function renderQuestionFeedback({ isCorrect, rationale }) {
  elements.feedbackBox.innerHTML = '';

  const status = document.createElement('p');
  status.className = 'feedback-status';
  status.textContent = isCorrect ? 'Correct.' : 'Incorrect.';
  elements.feedbackBox.appendChild(status);

  const explanation = buildFeedbackExplanation(rationale);
  if (explanation) {
    elements.feedbackBox.appendChild(explanation);
  }
}

function buildFeedbackExplanation(rationale) {
  const lines = String(rationale || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'feedback-explanation';
  let list = null;

  const hasChoiceList = lines.filter((line) => feedbackChoiceLine(line)).length >= 2;

  lines.forEach((line) => {
    if (hasChoiceList && /^Correct answer:\s*[A-D]\b/i.test(line)) return;

    const match = feedbackChoiceLine(line);
    if (match) {
      if (!list) {
        list = document.createElement('ul');
        wrapper.appendChild(list);
      }
      const item = document.createElement('li');
      item.textContent = formatFeedbackChoiceLine(match);
      list.appendChild(item);
      return;
    }

    list = null;
    const paragraph = document.createElement('p');
    paragraph.textContent = line.replace(/^(Correct answer:\s*[A-D]\.\s*)Correct\.\s*/i, '$1');
    wrapper.appendChild(paragraph);
  });

  return wrapper;
}

function feedbackChoiceLine(line) {
  return String(line || '').match(/^([A-D]|[-*•])[:.)]?\s+(.+)$/i);
}

function formatFeedbackChoiceLine(match) {
  if (!/^[A-D]$/i.test(match[1])) return match[2];
  const label = match[1].toUpperCase();
  const text = match[2].replace(/^Correct\.\s*/i, '');
  return `${label}: ${text}`;
}

function renderContentMedia(content) {
  if (!elements.contentMedia) return;
  elements.contentMedia.innerHTML = '';
  elements.learningCard.classList.toggle('no-media', !contentHasMedia(content));
  elements.contentMedia.classList.toggle('hidden', !contentHasMedia(content));

  if (!contentHasMedia(content)) return;

  if (content.mediaType === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.src = content.mediaPath;
    video.setAttribute('aria-label', content.mediaAlt);
    video.addEventListener('error', () => renderFallbackMedia(content.mediaAlt));
    elements.contentMedia.appendChild(video);
    return;
  }

  if (content.mediaType === 'link') {
    const panel = document.createElement('div');
    panel.className = 'media-link-panel';
    const copy = document.createElement('p');
    copy.textContent = content.mediaAlt || 'Placeholder media link';
    const link = document.createElement('a');
    link.className = 'primary-button form-link-button';
    link.href = content.mediaPath;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open Media';
    panel.append(copy, link);
    elements.contentMedia.appendChild(panel);
    return;
  }

  const image = document.createElement('img');
  image.src = content.mediaPath || DEFAULT_MEDIA_PATH;
  image.alt = content.mediaAlt;
  image.addEventListener('error', () => {
    if (image.getAttribute('src') === DEFAULT_MEDIA_PATH) return;
    image.src = DEFAULT_MEDIA_PATH;
  });
  elements.contentMedia.appendChild(image);
}

function renderFallbackMedia(altText) {
  if (!elements.contentMedia) return;
  elements.contentMedia.innerHTML = '';
  const image = document.createElement('img');
  image.src = DEFAULT_MEDIA_PATH;
  image.alt = altText || 'Placeholder media';
  elements.contentMedia.appendChild(image);
}

function contentHasMedia(content) {
  return Boolean(content?.mediaPath);
}

function renderNoDueState() {
  const heading = elements.noDueBox.querySelector('h3');
  const body = elements.noDueBox.querySelector('p');
  const status = state.calendarLinkStatus;
  elements.todayTitle.textContent = HCTK_LABELS.todayTitle;
  elements.cardMeta.classList.remove('hidden');
  elements.nextDueMeta.classList.remove('hidden');
  elements.cardMeta.textContent = `Today in Central Time: ${formatDisplayDate(todayChicagoISODate())}`;

  if (!heading || !body) return;
  body.classList.remove('hidden');

  if (status?.kind === 'blocked') {
    heading.textContent = HCTK_LABELS.blockedHeading;
    body.textContent = HCTK_LABELS.blockedBody;
    return;
  }

  heading.textContent = HCTK_LABELS.noDueHeading;
  body.textContent = HCTK_LABELS.noDueBody;
  body.classList.toggle('hidden', !HCTK_LABELS.noDueBody);
}

function renderParticipantCompletionLink(item, completionEvent) {
  if (!completionEvent) {
    elements.participantFormLinkBox.classList.add('hidden');
    elements.participantCompletionFormLink.removeAttribute('href');
    return;
  }

  const url = completionEvent.completionFormUrl || buildCompletionFormUrl(completionEvent.timestamp, item);
  elements.participantFormLinkBox.classList.remove('hidden');
  elements.participantCompletionFormLink.href = url;
}

function renderSourceAttributions(content) {
  if (!elements.sourceAttributions) return;
  elements.sourceAttributions.innerHTML = '';

  const references = citationReferenceLines(content);
  if (!references.length) {
    elements.sourceAttributions.classList.add('hidden');
    return;
  }

  const heading = document.createElement('h4');
  heading.textContent = 'Sources';
  const list = document.createElement('ul');
  list.role = 'list';
  references.forEach((reference) => {
    const item = document.createElement('li');
    appendLinkedText(item, reference);
    list.appendChild(item);
  });

  elements.sourceAttributions.append(heading, list);
  elements.sourceAttributions.classList.remove('hidden');
}

function citationReferenceLines(content) {
  return String(content?.citationReferences || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function appendLinkedText(element, text) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  String(text || '').replace(urlPattern, (match, _unused, offset) => {
    if (offset > lastIndex) {
      element.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
    }
    const link = document.createElement('a');
    link.href = match;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = match;
    element.appendChild(link);
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) {
    element.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderNextDueMeta() {
  if (state.calendarLinkStatus?.kind === 'adminOverride' && state.adminUnlocked) {
    elements.nextDueMeta.textContent = 'Admin override is showing this calendar-linked activity outside the participant due window.';
    return;
  }
  if (!profileReadyForParticipantUnlock(state.profile)) {
    elements.nextDueMeta.textContent = '';
    return;
  }
  const next = nextCalendarActivity();
  elements.nextDueMeta.textContent = next
    ? `Next activity: ${formatScheduleDateTime(next)}.`
    : 'No remaining activities are scheduled.';
}

function nextCalendarActivity(now = new Date()) {
  if (!profileReadyForParticipantUnlock(state.profile) ||
      !isCalendarDate(state.profile.enrollmentDate)) return null;
  let sequence;
  if (isTestScheduleMode()) {
    const elapsed = now.getTime() - new Date(state.scheduleSettings.testStartedAt).getTime();
    sequence = Math.max(1, Math.floor(elapsed / (state.scheduleSettings.testIntervalMinutes * 60 * 1000)) + 2);
  } else {
    const first = directActivity(1);
    const today = todayChicagoISODate(now);
    const days = (parseISODate(today) - parseISODate(first.date)) / 86400000;
    sequence = Math.max(1, Math.ceil(days / 7) + 1);
    if (days >= 0 && days % 7 === 0 && chicagoTimeFromTimestamp(now.toISOString()) >= first.localTime) {
      sequence += 1;
    }
  }
  return sequence <= ACTIVITY_COUNT ? directActivity(sequence) : null;
}

function nextActivityDueText(item) {
  return `Scheduled: ${formatScheduleDateTime(item)}`;
}

function renderMetrics() {
  const completed = eventSet('content_completed', 'scheduleId');
  const viewed = eventSet('content_viewed', 'scheduleId');
  elements.plannedCount.textContent = String(state.plan.length);
  elements.completedCount.textContent = String(completed.size);
  elements.viewedCount.textContent = String(viewed.size);
}

function renderSchedule() {
  const completed = eventSet('content_completed', 'scheduleId');
  const viewed = eventSet('content_viewed', 'scheduleId');
  const today = todayChicagoISODate();

  elements.scheduleList.innerHTML = '';
  state.plan.forEach((item) => {
    const content = contentById(item.contentId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'schedule-card';
    card.addEventListener('click', () => selectAdminSchedule(item.id));

    const status = scheduleStatusLabel(item, completed, viewed, today);
    card.innerHTML = `
      <div class="schedule-date">${escapeHTML(formatScheduleShortLabel(item))}</div>
      <div>
        <h3>${escapeHTML(content?.title || HCTK_LABELS.contentFallback)}</h3>
      </div>
      <span class="schedule-status ${status === 'Complete' ? 'done' : ''}">${escapeHTML(status)}</span>
    `;
    elements.scheduleList.appendChild(card);
  });
}

function renderScheduleModeStatus() {
  if (!elements.scheduleModeStatus) return;
  const testMode = isTestScheduleMode();
  elements.scheduleModeStatus.textContent = testMode
    ? `Testing: every ${state.scheduleSettings.testIntervalMinutes} minutes, started ${formatDateTime(state.scheduleSettings.testStartedAt)}.`
    : `Production weekly Saturdays at ${formatReminderTime()} Central.`;
  renderSchedulePresetButtons();
}

function renderSchedulePresetButtons() {
  const pending = state.pendingScheduleSettings || state.scheduleSettings;
  const pendingTestMode = isTestScheduleSettings(pending);
  elements.schedulePresetButtons.forEach((button) => {
    const buttonMode = button.dataset.scheduleMode === SCHEDULE_MODE_PRODUCTION ? SCHEDULE_MODE_PRODUCTION : SCHEDULE_MODE_TEST;
    const interval = Number(button.dataset.testInterval || 0);
    const active = pendingTestMode
      ? buttonMode === SCHEDULE_MODE_TEST && interval === pending.testIntervalMinutes
      : buttonMode === SCHEDULE_MODE_PRODUCTION;
    button.classList.toggle('active', active);
  });
}

function renderActivity() {
  elements.activityList.innerHTML = '';
  if (!state.events.length) {
    elements.activityList.innerHTML = '<div class="activity-row"><strong>No activity yet</strong><p>Events will appear after app use.</p></div>';
    return;
  }

  state.events.slice().reverse().slice(0, 120).forEach((event) => {
    const row = document.createElement('div');
    row.className = 'activity-row';
    row.innerHTML = `
      <strong>${escapeHTML(labelForEvent(event.kind))}</strong>
      <p>${escapeHTML(formatDateTime(event.timestamp))}</p>
      <p>${escapeHTML(event.detail || '')}</p>
    `;
    elements.activityList.appendChild(row);
  });
}

function renderCards() {
  elements.cardsList.innerHTML = '';

  if (!state.plan.length) {
    elements.cardsList.innerHTML = '<div class="activity-row"><strong>No scheduled activities</strong><p>Regenerate the schedule after setting an enrollment date.</p></div>';
    return;
  }

  state.plan.forEach((item) => {
    const content = contentById(item.contentId);
    const card = document.createElement('article');
    const classes = ['content-bank-card', 'scheduled-activity-card'];
    if (item.id === state.selectedScheduleId) classes.push('selected');
    if (!contentHasMedia(content)) classes.push('no-media');
    card.className = classes.join(' ');
    const promptHTML = content?.prompt ? `<p>${escapeHTML(content.prompt)}</p>` : '';
    card.innerHTML = `
      ${adminCardMediaHTML(content)}
      <div>
        <p class="content-type">${escapeHTML(content?.format || HCTK_LABELS.contentTypeFallback)}</p>
        <h3>Activity ${escapeHTML(formatActivityNumber(item))}: ${escapeHTML(content?.title || HCTK_LABELS.contentFallback)}</h3>
        <p><strong>Due:</strong> ${escapeHTML(formatScheduleDateTime(item))}</p>
        ${promptHTML}
        <div class="scheduled-card-actions"></div>
      </div>
    `;
    const actions = card.querySelector('.scheduled-card-actions');
    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'secondary-button';
    previewButton.textContent = 'Preview';
    previewButton.addEventListener('click', () => selectAdminSchedule(item.id));

    const linkButton = document.createElement('button');
    linkButton.type = 'button';
    linkButton.className = 'secondary-button';
    linkButton.textContent = 'Form Link';
    linkButton.addEventListener('click', async () => {
      elements.adminReviewSelect.value = item.id;
      await generateAdminCompletionLink();
    });

    actions.append(previewButton, linkButton);
    elements.cardsList.appendChild(card);
  });
}

function adminCardMediaHTML(content) {
  if (!contentHasMedia(content)) return '';
  if (content.mediaType === 'video') {
    return `<video src="${escapeHTML(content.mediaPath)}" aria-label="${escapeHTML(content.mediaAlt)}" muted preload="metadata"></video>`;
  }
  if (content.mediaType === 'link') {
    return `<div class="content-bank-media-placeholder"><p>${escapeHTML(content.mediaAlt || 'Placeholder media link')}</p></div>`;
  }
  return `<img src="${escapeHTML(content.mediaPath || DEFAULT_MEDIA_PATH)}" alt="${escapeHTML(content.mediaAlt)}">`;
}

function renderAdminReviewPicker() {
  elements.adminReviewSelect.innerHTML = '';

  state.plan.forEach((item) => {
    const content = contentById(item.contentId);
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `Reminder ${item.sequenceNumber}/26 · ${formatScheduleShortLabel(item)} · ${content?.title || HCTK_LABELS.contentFallback}`;
    option.selected = item.id === state.selectedScheduleId;
    elements.adminReviewSelect.appendChild(option);
  });

  elements.adminReviewButton.disabled = !state.plan.length;
  elements.adminGenerateFormLinkButton.disabled = !state.plan.length;
  renderAdminCompletionLink();
}

function renderAdminCompletionLink() {
  const link = state.adminCompletionLink;
  const selectedScheduleId = elements.adminReviewSelect.value;
  if (!link || link.scheduleId !== selectedScheduleId) {
    elements.adminFormLinkBox.classList.add('hidden');
    elements.adminCompletionFormLink.removeAttribute('href');
    elements.adminCompletionFormUrl.textContent = '';
    return;
  }

  elements.adminFormLinkBox.classList.remove('hidden');
  elements.adminCompletionFormLink.href = link.url;
  elements.adminCompletionFormUrl.textContent = link.url;
}

function selectedAdminReviewItem() {
  return state.plan.find((item) => item.id === elements.adminReviewSelect.value) ||
    state.plan.find((item) => item.id === state.selectedScheduleId) ||
    state.plan[0] ||
    null;
}

function renderAdminProfileSummary() {
  elements.adminProfileSummary.innerHTML = `
    <div><strong>Study ID</strong><span>${escapeHTML(state.profile.studyId || 'Not set')}</span></div>
    <div><strong>Enrollment Date</strong><span>${escapeHTML(state.profile.enrollmentDate)}</span></div>
    <div><strong>Follow-up Date</strong><span>${escapeHTML(state.profile.followUpDate || 'Not set')}</span></div>
    <div><strong>Follow-up Time</strong><span>${escapeHTML(formatFollowUpTime())}</span></div>
    <div><strong>Schedule Mode</strong><span>${escapeHTML(scheduleModeLabel())}</span></div>
    <div><strong>Schedule Policy</strong><span>${escapeHTML(activeSchedulePolicyVersion())}</span></div>
    <div><strong>Central Date Today</strong><span>${escapeHTML(todayChicagoISODate())}</span></div>
  `;
}

async function downloadCalendar() {
  saveProfileFromForm();
  if (!profileReadyForParticipantUnlock(state.profile)) {
    elements.exportStatus.textContent = 'Set Study ID, Follow-up Date, and Follow-up Time before downloading the calendar.';
    return;
  }
  refreshPlanForCalendarExport();
  const ics = makeCalendarICS();
  const filename = isTestScheduleMode() ? HCTK_LABELS.testIcsFilename : HCTK_LABELS.icsFilename;
  downloadTextFile(ics, filename, 'text/calendar');
  recordEvent('calendar_export_created', 'Generated reminder calendar file.', {
    scheduleMode: state.scheduleSettings.mode,
    testIntervalMinutes: state.scheduleSettings.testIntervalMinutes || ''
  });
  elements.exportStatus.textContent = 'Calendar file downloaded. Import it into the device calendar to schedule reminders.';
  await refreshAll();
}

function refreshPlanForCalendarExport() {
  const selectedScheduleId = state.selectedScheduleId;
  state.plan = generatePlan(state.profile, state.scheduleSettings);
  if (!state.plan.some((item) => item.id === selectedScheduleId)) {
    state.selectedScheduleId = currentParticipantScheduleItem()?.id || null;
  }
}

async function downloadCSV() {
  recordEvent('csv_export_created', 'Generated current-visit activity CSV export.', {});
  const csv = makeCSV();
  downloadTextFile(csv, `hctk-activity-export-${todayChicagoISODate()}.csv`, 'text/csv;charset=utf-8');
  elements.exportStatus.textContent = 'CSV export downloaded.';
  await refreshAll();
}

function makeCalendarICS() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `PRODID:${HCTK_CONFIG.prodId || '-//HCTK//PWA//EN'}`,
    `X-WR-CALNAME:${escapeICS(HCTK_LABELS.calendarName)}`,
    'BEGIN:VTIMEZONE',
    `TZID:${CENTRAL_TIME_ZONE}`,
    `X-LIC-LOCATION:${CENTRAL_TIME_ZONE}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  state.plan.forEach((item) => {
    const content = contentById(item.contentId);
    const link = reminderLink(item);
    const calendarContent = calendarContentForEvent(content);
    const descriptionLines = calendarDescriptionLines(content);
    descriptionLines.unshift('Open activity:', link, '');
    const start = calendarEventStart(item);
    const endDate = calendarEventEnd(item);
    const summary = `${formatActivityNumber(item)}: ${calendarContent.summary}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@${HCTK_CONFIG.uidDomain || 'hctk-pwa'}`,
      `DTSTAMP:${compactUTCDateTime(new Date())}`,
      `DTSTART;TZID=${CENTRAL_TIME_ZONE}:${start}`,
      `DTEND;TZID=${CENTRAL_TIME_ZONE}:${endDate}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(descriptionLines.join('\n'))}`,
      `URL;VALUE=URI:${link}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-PT0M',
      `DESCRIPTION:${escapeICS(summary)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  addFollowUpCalendarEvents(lines);
  lines.push('END:VCALENDAR');
  return lines.map(foldICSLine).join('\r\n') + '\r\n';
}

function addFollowUpCalendarEvents(lines) {
  if (!isISODate(state.profile.followUpDate) || !isLocalTime(state.profile.followUpTime)) return;

  const link = FOLLOW_UP_FORM_URL;
  const uidStudyId = String(state.profile.studyId || 'participant').replace(/[^a-z0-9-]/gi, '') || 'participant';
  const confirmationDate = addDaysToISODate(state.profile.followUpDate, -7);
  const confirmationStart = compactLocalDateTime(confirmationDate, REMINDER_HOUR, REMINDER_MINUTE);
  const confirmationEnd = addMinutesToLocalDate(confirmationDate, REMINDER_HOUR, REMINDER_MINUTE, REMINDER_DURATION_MINUTES);
  const confirmationDescription = [
    `Study ID: ${state.profile.studyId || ''}`,
    `Follow-up Visit: ${formatFollowUpDateTime()}`
  ];
  confirmationDescription.unshift('Open follow-up form:', link, '');

  lines.push(
    'BEGIN:VEVENT',
    `UID:${SCHEDULE_ID_PREFIX}-follow-up-confirmation-${state.profile.followUpDate}-${uidStudyId}@${HCTK_CONFIG.uidDomain || 'hctk-pwa'}`,
    `DTSTAMP:${compactUTCDateTime(new Date())}`,
    `DTSTART;TZID=${CENTRAL_TIME_ZONE}:${confirmationStart}`,
    `DTEND;TZID=${CENTRAL_TIME_ZONE}:${confirmationEnd}`,
    `SUMMARY:${escapeICS(HCTK_LABELS.followUpConfirmationSummary)}`,
    `DESCRIPTION:${escapeICS(confirmationDescription.join('\n'))}`,
    `URL;VALUE=URI:${link}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT0M',
    `DESCRIPTION:${escapeICS(HCTK_LABELS.followUpConfirmationSummary)}`,
    'END:VALARM',
    'END:VEVENT'
  );

  const [visitHour, visitMinute] = parseLocalTime(state.profile.followUpTime);
  const visitStart = compactLocalDateTime(state.profile.followUpDate, visitHour, visitMinute);
  const visitEnd = addMinutesToLocalDate(state.profile.followUpDate, visitHour, visitMinute, FOLLOW_UP_VISIT_DURATION_MINUTES);
  const visitDescription = [
    `Study ID: ${state.profile.studyId || ''}`,
    `Follow-up Visit: ${formatFollowUpDateTime()}`
  ];
  visitDescription.unshift('Open follow-up form:', link, '');

  lines.push(
    'BEGIN:VEVENT',
    `UID:${SCHEDULE_ID_PREFIX}-follow-up-visit-${state.profile.followUpDate}-${uidStudyId}@${HCTK_CONFIG.uidDomain || 'hctk-pwa'}`,
    `DTSTAMP:${compactUTCDateTime(new Date())}`,
    `DTSTART;TZID=${CENTRAL_TIME_ZONE}:${visitStart}`,
    `DTEND;TZID=${CENTRAL_TIME_ZONE}:${visitEnd}`,
    `SUMMARY:${escapeICS(HCTK_LABELS.followUpVisitSummary)}`,
    `DESCRIPTION:${escapeICS(visitDescription.join('\n'))}`,
    `URL;VALUE=URI:${link}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT0M',
    `DESCRIPTION:${escapeICS(HCTK_LABELS.followUpVisitSummary)}`,
    'END:VALARM',
    'END:VEVENT'
  );
}

function calendarContentForEvent(content) {
  const title = cleanCalendarText(content?.title, HCTK_LABELS.contentFallback);

  return {
    summary: title
  };
}

function calendarDescriptionLines(content) {
  const lines = [];
  const detailText = cleanCalendarText(content?.prompt, '');
  const choices = Array.isArray(content?.choices) ? content.choices.map((choice) => cleanCalendarText(choice, '')) : [];
  const realChoices = choices.filter(Boolean);

  if (detailText) {
    lines.push(detailText);
  }

  if (realChoices.length) {
    lines.push('Choices:');
    realChoices.forEach((choice, index) => {
      lines.push(`- ${String.fromCharCode(65 + index)}: ${choice}`);
    });
  }

  return lines;
}

function cleanCalendarText(value, fallback) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback || '';
}

function makeCSV() {
  const columns = [
    'opened_from_calendar_notification',
    'study_id',
    'learning_activity_completion_date',
    'learning_activity_number'
  ];
  const rows = [columns];

  buildActivityTrackingRows().forEach((row) => {
    rows.push(columns.map((column) => row[column] ?? ''));
  });

  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

function buildActivityTrackingRows() {
  const participantEvents = state.events.filter((event) =>
    ['content_viewed', 'question_answered', 'content_completed'].includes(event.kind));
  return [...new Set(participantEvents.map((event) => event.scheduleId))].map((id) => {
    const first = participantEvents.find((event) => event.scheduleId === id);
    const completed = firstEventForSchedule(id, ['content_completed']);
    return {
      opened_from_calendar_notification: openedFromCalendarNotificationValue(id),
      study_id: first.studyId,
      learning_activity_completion_date: completed ? chicagoISODateFromTimestamp(completed.timestamp) : '',
      learning_activity_number: first.activityNumber
    };
  });
}

async function recordDueCardAccessIfVisible() {
  if (!state.participantUnlocked) return;
  const item = currentVisibleScheduleItem();
  if (!item) return;
  recordEvent('content_viewed', HCTK_LABELS.contentViewedDetail, {
    scheduleId: item.id,
    contentId: item.contentId
  });
  if (state.adminUnlocked) renderMetrics();
}

function recordEvent(kind, detail, extra) {
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    kind,
    detail,
    studyId: state.profile?.studyId || '',
    ...extra
  };
  if (!event.activityNumber && event.contentId) {
    const content = contentById(event.contentId);
    event.activityNumber = content ? `${content.sequence}/${ACTIVITY_COUNT}` : '';
  }
  state.events.push(event);
  state.events.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  return event;
}

function generatePlan(profile, settings = state.scheduleSettings) {
  return isTestScheduleSettings(settings)
    ? generateTestPlan(settings)
    : generateProductionPlan(profile);
}

function generateProductionPlan(profile) {
  const enrollmentDate = profile.enrollmentDate || todayChicagoISODate();
  const plan = [];
  let cursor = addDaysToISODate(enrollmentDate, 1);
  let sequence = 1;

  while (dayOfWeek(cursor) !== 6) {
    cursor = addDaysToISODate(cursor, 1);
  }

  while (sequence <= ACTIVITY_COUNT) {
    const content = CONTENT_BANK[(sequence - 1) % CONTENT_BANK.length];
    plan.push({
      id: `${SCHEDULE_ID_PREFIX}-${cursor}-${String(sequence).padStart(3, '0')}`,
      sequenceNumber: sequence,
      date: cursor,
      localTime: `${String(REMINDER_HOUR).padStart(2, '0')}:${String(REMINDER_MINUTE).padStart(2, '0')}`,
      contentId: content.id
    });
    cursor = addDaysToISODate(cursor, 7);
    sequence += 1;
  }

  return plan;
}

function generateTestPlan(settings) {
  const interval = TEST_INTERVAL_OPTIONS.includes(Number(settings.testIntervalMinutes))
    ? Number(settings.testIntervalMinutes)
    : TEST_INTERVAL_OPTIONS[0];
  const startedAt = isValidDate(settings.testStartedAt) ? settings.testStartedAt : new Date().toISOString();
  const startDate = new Date(startedAt);
  const plan = [];
  const idStamp = compactChicagoDateTimeFromTimestamp(startedAt).slice(0, 13);

  for (let sequence = 1; sequence <= ACTIVITY_COUNT; sequence += 1) {
    const dueAt = new Date(startDate.getTime() + ((sequence - 1) * interval * 60 * 1000)).toISOString();
    const content = CONTENT_BANK[(sequence - 1) % CONTENT_BANK.length];
    plan.push({
      id: `${SCHEDULE_ID_PREFIX}-test-${idStamp}-${String(sequence).padStart(3, '0')}`,
      sequenceNumber: sequence,
      date: chicagoISODateFromTimestamp(dueAt),
      localTime: chicagoTimeFromTimestamp(dueAt),
      dueAt,
      testIntervalMinutes: interval,
      contentId: content.id
    });
  }

  return plan;
}

function currentVisibleScheduleItem() {
  if (state.adminUnlocked && state.adminPreviewItem) return state.adminPreviewItem;
  if (state.adminUnlocked && state.linkedActivity) return state.linkedActivity;
  if (state.calendarLinkStatus && state.calendarLinkStatus.kind !== 'valid') return null;
  return currentParticipantScheduleItem();
}

function isItemDueToday(item) {
  return item?.date === todayChicagoISODate();
}

function isScheduleItemAccessible(item) {
  if (!item) return false;
  if (isTestScheduleItem(item)) {
    return new Date(item.dueAt).getTime() <= Date.now();
  }
  return isItemDueToday(item);
}

function isTestScheduleItem(item) {
  return Boolean(item?.dueAt || item?.id?.startsWith(`${SCHEDULE_ID_PREFIX}-test-`));
}

function contentById(id) {
  return CONTENT_BANK.find((item) => item.id === id);
}

function eventSet(kind, field) {
  return new Set(state.events.filter((event) => event.kind === kind && event[field]).map((event) => event[field]));
}

function firstEventForSchedule(scheduleId, kinds) {
  return state.events
    .filter((event) => event.scheduleId === scheduleId && kinds.includes(event.kind))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))[0] || null;
}

function latestEventForSchedule(scheduleId, kinds) {
  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];
    if (event.scheduleId === scheduleId && kinds.includes(event.kind)) return event;
  }
  return null;
}

function labelForEvent(kind) {
  return String(kind || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function reminderLink(item) {
  const url = new URL(defaultAppUrl());
  url.searchParams.set('activity', String(item.sequenceNumber));
  url.searchParams.set('study_id', state.profile.studyId || '');
  url.searchParams.set('enrollment_date', state.profile.enrollmentDate || '');
  url.searchParams.set('follow_up_date', state.profile.followUpDate || '');
  url.searchParams.set('follow_up_time', state.profile.followUpTime || '');
  url.searchParams.set('schedule_mode', state.scheduleSettings.mode || SCHEDULE_MODE_PRODUCTION);
  if (isTestScheduleMode()) {
    url.searchParams.set('test_interval', String(state.scheduleSettings.testIntervalMinutes || ''));
    url.searchParams.set('test_started_at', state.scheduleSettings.testStartedAt || '');
  }
  return url.toString();
}

function parseActivitySequence(value) {
  const match = String(value || '').trim().match(/^0*([1-9]|1\d|2[0-6])(?:\/26)?$/);
  return match ? Number(match[1]) : 0;
}

function calendarLinkProfile(params) {
  const profile = {};
  const studyId = params.get('study_id') || params.get('studyId') || '';
  const enrollmentDate = params.get('enrollment_date') || params.get('enrollmentDate') || '';
  const followUpDate = params.get('follow_up_date') || params.get('followUpDate') || '';
  const followUpTime = params.get('follow_up_time') || params.get('followUpTime') || '';
  if (studyId) profile.studyId = studyId;
  if (isISODate(enrollmentDate)) profile.enrollmentDate = enrollmentDate;
  if (isISODate(followUpDate)) profile.followUpDate = followUpDate;
  if (isLocalTime(followUpTime)) profile.followUpTime = followUpTime;
  return Object.keys(profile).length ? profile : null;
}

function openBlankCompletionFormWindow() {
  try {
    const targetWindow = window.open('', '_blank');
    if (targetWindow) {
      targetWindow.opener = null;
    }
    return targetWindow;
  } catch {
    return null;
  }
}

function launchCompletionForm(targetWindow, completedAt, item) {
  const url = buildCompletionFormUrl(completedAt, item);
  try {
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch {
    window.location.href = url;
  }
}

function buildCompletionFormUrl(completedAt, item, options = {}) {
  const url = new URL(COMPLETION_FORM_URL);
  url.searchParams.set(COMPLETION_FORM_FIELDS.studyId, state.profile.studyId || '');
  url.searchParams.set(COMPLETION_FORM_FIELDS.studyGroup, HCTK_CONFIG.submissionGroupCode);
  url.searchParams.set(COMPLETION_FORM_FIELDS.completionDate, chicagoISODateFromTimestamp(completedAt));
  url.searchParams.set(COMPLETION_FORM_FIELDS.activityNumber, formatActivityNumber(item));
  url.searchParams.set(COMPLETION_FORM_FIELDS.openedFromCalendarNotification, openedFromCalendarNotificationValue(item?.id));
  url.searchParams.set(COMPLETION_FORM_FIELDS.learningActivityAnswer, learningActivityAnswerValue(item, options));
  return formUrlString(url);
}

function formUrlString(url) {
  return url.toString().replace(/\+/g, '%20');
}

function formatActivityNumber(item) {
  if (!item?.sequenceNumber) return '';
  return `${item.sequenceNumber}/${ACTIVITY_COUNT}`;
}

function learningActivityAnswerValue(item, options = {}) {
  const content = item ? contentById(item.contentId) : null;
  const choices = Array.isArray(content?.choices) ? content.choices : [];
  if (!choices.length) return '';

  const answerKinds = options.adminTest ? ['admin_test_question_answered'] : ['question_answered'];
  const answerEvent = latestEventForSchedule(item.id, answerKinds);
  const index = Number(answerEvent?.choiceIndex || 0) - 1;
  const choice = answerEvent?.choiceText || choices[index] || '';
  const letter = answerEvent?.choiceLetter || choiceLetter(index);
  if (!choice && !letter) return '';
  return choice ? `${letter}: ${choice}` : letter;
}

function choiceLetter(index) {
  return Number.isInteger(index) && index >= 0 ? String.fromCharCode(65 + index) : '';
}

function openedFromCalendarNotificationValue(scheduleId) {
  return scheduleId && state.calendarOpenScheduleIds.has(scheduleId) ? 'Yes' : 'No';
}

function defaultScheduleSettings() {
  return {
    mode: SCHEDULE_MODE_PRODUCTION,
    testIntervalMinutes: 0,
    testStartedAt: ''
  };
}

function scheduleSettingsFromPresetButton(button) {
  const mode = button.dataset.scheduleMode === SCHEDULE_MODE_PRODUCTION ? SCHEDULE_MODE_PRODUCTION : SCHEDULE_MODE_TEST;
  if (mode === SCHEDULE_MODE_PRODUCTION) return defaultScheduleSettings();
  const interval = TEST_INTERVAL_OPTIONS.includes(Number(button.dataset.testInterval))
    ? Number(button.dataset.testInterval)
    : TEST_INTERVAL_OPTIONS[0];
  return {
    mode: SCHEDULE_MODE_TEST,
    testIntervalMinutes: interval,
    testStartedAt: ''
  };
}

function isTestScheduleMode() {
  return isTestScheduleSettings(state.scheduleSettings);
}

function isTestScheduleSettings(settings) {
  return settings?.mode === SCHEDULE_MODE_TEST;
}

function activeSchedulePolicyVersion(settings = state.scheduleSettings) {
  return isTestScheduleSettings(settings)
    ? `${TEST_SCHEDULE_POLICY_VERSION}-${settings.testIntervalMinutes}m`
    : SCHEDULE_POLICY_VERSION;
}

function scheduleModeLabel() {
  return isTestScheduleMode()
    ? `Testing every ${state.scheduleSettings.testIntervalMinutes} minutes`
    : 'Production weekly Saturdays';
}

function scheduleCreationDetail() {
  return isTestScheduleMode()
    ? `Testing schedule generated: every ${state.scheduleSettings.testIntervalMinutes} minutes.`
    : 'Weekly Saturday calendar reminder plan generated.';
}

function scheduleStatusLabel(item, completed, viewed, today) {
  if (completed.has(item.id)) return 'Complete';
  if (viewed.has(item.id)) return 'Viewed';
  if (isTestScheduleItem(item)) {
    return isScheduleItemAccessible(item) ? 'Available' : 'Locked';
  }
  if (item.date < today) return 'Missed';
  if (item.date === today) return 'Due Today';
  return 'Planned';
}

function formatScheduleShortLabel(item) {
  if (isTestScheduleItem(item)) {
    return `${formatDisplayDate(item.date)} ${item.localTime || ''}`.trim();
  }
  return formatDisplayDate(item.date);
}

function formatFollowUpTime() {
  if (!isLocalTime(state.profile.followUpTime)) return 'Not set';
  const [hour, minute] = parseLocalTime(state.profile.followUpTime);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix} Central`;
}

function formatFollowUpDateTime() {
  if (!state.profile.followUpDate || !state.profile.followUpTime) return 'Not set';
  return `${state.profile.followUpDate} at ${formatFollowUpTime()}`;
}

function chicagoISODateFromTimestamp(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function defaultProfile() {
  return {
    studyId: '',
    enrollmentDate: todayChicagoISODate(),
    followUpDate: '',
    followUpTime: '',
    durationDays: STUDY_DURATION_DAYS
  };
}

function sanitizeProfile(profile) {
  const fallback = defaultProfile();
  return {
    studyId: String(profile?.studyId || '').trim().toUpperCase(),
    enrollmentDate: isISODate(profile?.enrollmentDate) ? profile.enrollmentDate : fallback.enrollmentDate,
    followUpDate: isISODate(profile?.followUpDate) ? profile.followUpDate : fallback.followUpDate,
    followUpTime: isLocalTime(profile?.followUpTime) ? profile.followUpTime : fallback.followUpTime,
    durationDays: STUDY_DURATION_DAYS
  };
}

function profileReadyForParticipantUnlock(profile) {
  return Boolean(profile?.studyId && profile?.followUpDate && profile?.followUpTime);
}

function defaultAppUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function downloadTextFile(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showActionStatus(element, message) {
  if (!element) return;
  element.textContent = message;
}

function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function addDaysToISODate(value, days) {
  const next = parseISODate(value);
  next.setUTCDate(next.getUTCDate() + days);
  return toISODate(next);
}

function dayOfWeek(value) {
  return parseISODate(value).getUTCDay();
}

function isISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isLocalTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = parseLocalTime(value);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseLocalTime(value) {
  return String(value || '').split(':').map(Number);
}

function todayChicagoISODate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDisplayDate(value) {
  return parseISODate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function formatScheduleDateTime(item) {
  if (isTestScheduleItem(item)) {
    return `${formatDateTime(item.dueAt)} Central`;
  }
  const date = parseISODate(item.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
  return `${date} at ${formatReminderTime()} Central`;
}

function formatReminderTime() {
  const suffix = REMINDER_HOUR >= 12 ? 'PM' : 'AM';
  const hour = REMINDER_HOUR % 12 || 12;
  return `${hour}:${String(REMINDER_MINUTE).padStart(2, '0')} ${suffix}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: CENTRAL_TIME_ZONE
  });
}

function compactLocalDateTime(date, hour, minute) {
  return date.replaceAll('-', '') + `T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
}

function calendarEventStart(item) {
  if (isTestScheduleItem(item)) {
    return compactChicagoDateTimeFromTimestamp(item.dueAt);
  }
  return compactLocalDateTime(item.date, REMINDER_HOUR, REMINDER_MINUTE);
}

function calendarEventEnd(item) {
  if (isTestScheduleItem(item)) {
    const interval = item.testIntervalMinutes || state.scheduleSettings.testIntervalMinutes || REMINDER_DURATION_MINUTES;
    return compactChicagoDateTimeFromTimestamp(new Date(new Date(item.dueAt).getTime() + Math.min(interval, REMINDER_DURATION_MINUTES) * 60 * 1000).toISOString());
  }
  return addMinutesToLocalDate(item.date, REMINDER_HOUR, REMINDER_MINUTE, REMINDER_DURATION_MINUTES);
}

function addMinutesToLocalDate(date, hour, minute, addMinutes) {
  const local = parseISODate(date);
  local.setUTCHours(hour, minute + addMinutes, 0, 0);
  return [
    local.getUTCFullYear(),
    String(local.getUTCMonth() + 1).padStart(2, '0'),
    String(local.getUTCDate()).padStart(2, '0')
  ].join('') + `T${String(local.getUTCHours()).padStart(2, '0')}${String(local.getUTCMinutes()).padStart(2, '0')}00`;
}

function compactUTCDateTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function compactChicagoDateTimeFromTimestamp(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}T${values.hour}${values.minute}${values.second}`;
}

function chicagoTimeFromTimestamp(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function csvEscape(value) {
  const text = String(value ?? '');
  const escaped = text.replaceAll('"', '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function escapeICS(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');
}

function foldICSLine(line) {
  const limit = 74;
  if (line.length <= limit) return line;
  const chunks = [];
  let remaining = line;
  while (remaining.length > limit) {
    chunks.push(remaining.slice(0, limit));
    remaining = remaining.slice(limit);
  }
  chunks.push(remaining);
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join('\r\n');
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
