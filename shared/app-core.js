const HCTK_CONFIG = window.HCTK_VARIANT_CONFIG || {};
const HCTK_LABELS = {
  cardsTabLabel: 'Cards',
  itemNoun: 'card',
  itemPlural: 'cards',
  todayTitle: 'Learning Card',
  nextDueLoading: 'Next card: loading...',
  defaultPrompt: 'Placeholder question',
  noDueHeading: 'No learning card due today',
  noDueBody: 'Cards are available only on their scheduled due date through 11:59 PM Central Time.',
  blockedHeading: 'No learning card due from this link',
  blockedBody: 'This calendar link is outside its scheduled participant due window. Cards are available only during their scheduled due window.',
  calendarInvalidBody: 'Regenerate the matching calendar or open a valid activity link.',
  contentFallback: 'Learning card',
  focusFallback: 'Placeholder focus',
  contentTypeFallback: 'Placeholder content type',
  contentViewedDetail: 'Participant viewed the current learning card.',
  contentCompletedDetail: 'Participant marked the scheduled refresher complete.',
  adminPreviewDetail: 'Admin opened a scheduled learning card preview.',
  calendarDescriptionFocusFallback: 'Learning card',
  calendarName: 'HCTK Refresher Reminders',
  followUpConfirmationSummary: '6-Month Follow-Up Date Confirmation',
  followUpVisitSummary: '6-Month Follow-Up Visit',
  icsFilename: 'hctk-six-month-reminders.ics',
  testIcsFilename: 'hctk-test-reminders.ics',
  ...(HCTK_CONFIG.labels || {})
};

const DB_NAME = HCTK_CONFIG.dbName || 'hctk-pwa';
const DB_VERSION = Number(HCTK_CONFIG.dbVersion || 1);
const META_STORE = 'meta';
const EVENT_STORE = 'events';
const STUDY_DURATION_DAYS = 183;
const REMINDER_HOUR = 8;
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
const COMPLETION_FORM_URL = 'https://forms.office.com/Pages/ResponsePage.aspx?id=ex-PmxOwcUSoxJmhXsyLHASfr2nPNIdAniE9JM-Weq5UNlZaUVBRWDgzTjM3S1BJUUJBRURIN0NVTC4u';
const COMPLETION_FORM_FIELDS = {
  studyId: 'r2178fbad41b2426994714509642a02c2',
  completionDate: 'r8cd768648e32429dac3999f87beb88bd',
  activityNumber: 'r3c5305e447944b5f84b8689a2f46204d',
  openedFromCalendarNotification: 'r7946ff1c242b43bc84df050bbb336bb4'
};
const FOLLOW_UP_FORM_URL = 'https://forms.office.com/Pages/ResponsePage.aspx?id=ex-PmxOwcUSoxJmhXsyLHASfr2nPNIdAniE9JM-Weq5UNkJCWUREVVRGU0pVUFFHS1VOVUY5NjU5UC4u';
const FOLLOW_UP_FORM_FIELDS = {
  studyId: 'rf07a9d85d6944c6e966b381943f61c7c',
  followUpDate: 'r1d8f23f5f29a4c549fced07da03b099b'
};
const PARTICIPANT_PASSWORD = 'tkhcpass';
const ADMIN_PASSWORD = 'tkhcadmin';
const DEFAULT_MEDIA_PATH = 'assets/blank-card.svg';
const CONTENT_BANK = Array.isArray(window.HCTK_CONTENT_BANK) ? window.HCTK_CONTENT_BANK : [];

const elements = {
  appShell: document.querySelector('#appShell'),
  workSurface: document.querySelector('#workSurface'),
  participantSetupContent: document.querySelector('#participantSetupContent'),
  adminAccessPanel: document.querySelector('#adminAccessPanel'),
  saveState: document.querySelector('#saveState'),
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
  db: null,
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

async function init() {
  state.db = await openDatabase();
  await deleteLegacyPersistence();
  state.profile = sanitizeProfile(await getMeta('profile'));
  state.scheduleSettings = sanitizeScheduleSettings(await getMeta('scheduleSettings'));
  state.pendingScheduleSettings = { ...state.scheduleSettings };
  state.calendarOpenScheduleIds = new Set(await getMeta('calendarOpenScheduleIds') || []);
  state.participantUnlocked = (await getMeta('unlocked')) === true;
  if (state.participantUnlocked && !profileReadyForParticipantUnlock(state.profile)) {
    state.participantUnlocked = false;
    await setMeta('unlocked', false);
  }

  const savedPolicyVersion = await getMeta('schedulePolicyVersion');
  const savedContentBankVersion = await getMeta('contentBankVersion');
  state.plan = await getMeta('plan') || [];
  if (
    !state.plan.length ||
    savedPolicyVersion !== activeSchedulePolicyVersion() ||
    savedContentBankVersion !== CONTENT_BANK_VERSION ||
    !planUsesCurrentContentBank(state.plan)
  ) {
    state.plan = generatePlan(state.profile, state.scheduleSettings);
    await setMeta('plan', state.plan);
    await setMeta('schedulePolicyVersion', activeSchedulePolicyVersion());
    await setMeta('contentBankVersion', CONTENT_BANK_VERSION);
    await recordEvent('reminder_plan_created', scheduleCreationDetail(), {
      scheduleMode: state.scheduleSettings.mode,
      testIntervalMinutes: state.scheduleSettings.testIntervalMinutes || ''
    });
  }
  await setMeta('scheduleSettings', state.scheduleSettings);

  await setMeta('profile', state.profile);
  state.events = await getAllEvents();
  hydrateProfileForm();
  bindEvents();
  await setupServiceWorker();
  await selectInitialSchedule();
  await recordEvent('app_opened', 'PWA opened.', {
    scheduleId: state.selectedScheduleId || '',
    openedFromCalendarNotification: state.selectedScheduleId ? openedFromCalendarNotificationValue(state.selectedScheduleId) : 'No'
  });
  renderAccessState();
  await refreshAll();
  await recordDueCardAccessIfVisible();
}

function bindEvents() {
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
  elements.downloadCalendarButton.addEventListener('click', downloadCalendar);
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
  await saveProfileFromForm();
  if (elements.participantPasswordInput.value !== PARTICIPANT_PASSWORD) {
    elements.participantUnlockStatus.textContent = 'Incorrect study password.';
    return;
  }
  if (!profileReadyForParticipantUnlock(state.profile)) {
    elements.participantUnlockStatus.textContent = 'Enter Study ID, Follow-up Date, and Follow-up Time before unlocking.';
    return;
  }

  state.participantUnlocked = true;
  await setMeta('unlocked', true);
  await recordEvent('participant_unlocked', 'Participant unlocked learning content.', {});
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
  await recordEvent('admin_unlocked', 'Admin view unlocked on this device.', {});
  const selectedFromCalendarLink = await selectInitialSchedule();
  if (state.calendarLinkStatus?.kind === 'adminOverride') {
    await recordEvent('admin_calendar_link_override_viewed', 'Admin revealed a calendar-linked activity outside the participant due window.', {
      scheduleId: state.calendarLinkStatus.scheduleId,
      adminTest: true
    });
  } else if (state.calendarLinkStatus?.kind === 'invalid') {
    await recordEvent('admin_calendar_link_invalid', 'Admin opened an unrecognized calendar-link schedule ID.', {
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
  state.selectedScheduleId = currentParticipantScheduleItem()?.id || null;
  clearScheduleParam();
  renderAccessState();
  activateTab('today');
  await refreshAll();
}

function renderAccessState() {
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

async function saveProfileFromForm() {
  const previousEnrollmentDate = state.profile.enrollmentDate;
  state.profile = sanitizeProfile({
    studyId: elements.studyIdInput.value.trim().toUpperCase(),
    enrollmentDate: elements.enrollmentDateInput.value || todayChicagoISODate(),
    followUpDate: elements.followUpDateInput.value || '',
    followUpTime: elements.followUpTimeInput.value || ''
  });
  await setMeta('profile', state.profile);

  if (previousEnrollmentDate && previousEnrollmentDate !== state.profile.enrollmentDate) {
    state.plan = generatePlan(state.profile, state.scheduleSettings);
    await setMeta('scheduleSettings', state.scheduleSettings);
    await setMeta('plan', state.plan);
    await setMeta('schedulePolicyVersion', activeSchedulePolicyVersion());
    await setMeta('contentBankVersion', CONTENT_BANK_VERSION);
    state.selectedScheduleId = currentParticipantScheduleItem()?.id || null;
    await recordEvent('reminder_plan_created', 'Weekly Saturday calendar reminder plan regenerated after enrollment date change.', {
      scheduleMode: state.scheduleSettings.mode
    });
    await refreshAll();
  }

  showSaveState('Saved');
}

function showSaveState(message) {
  elements.saveState.textContent = message;
  window.clearTimeout(showSaveState.timer);
  showSaveState.timer = window.setTimeout(() => {
    elements.saveState.textContent = 'Idle';
  }, 1600);
}

async function selectInitialSchedule() {
  const params = new URLSearchParams(window.location.search);
  const scheduleId = params.get('schedule');
  const bySchedule = state.plan.find((item) => item.id === scheduleId);
  const currentItem = currentParticipantScheduleItem();
  state.calendarLinkStatus = null;

  if (!scheduleId) {
    state.selectedScheduleId = currentItem?.id || null;
    return false;
  }

  if (!bySchedule) {
    state.selectedScheduleId = null;
    state.calendarLinkStatus = {
      kind: 'invalid',
      scheduleId
    };
    return true;
  }

  const validParticipantLink = isParticipantScheduleLinkRenderable(bySchedule, currentItem);

  if (state.adminUnlocked) {
    state.selectedScheduleId = bySchedule.id;
    state.calendarLinkStatus = validParticipantLink
      ? {
        kind: 'valid',
        scheduleId: bySchedule.id
      }
      : {
        kind: 'adminOverride',
        scheduleId: bySchedule.id
      };
    return true;
  }

  state.selectedScheduleId = validParticipantLink ? bySchedule.id : null;
  state.calendarLinkStatus = validParticipantLink
    ? {
      kind: 'valid',
      scheduleId: bySchedule.id
    }
    : {
      kind: 'blocked',
      scheduleId: bySchedule.id
    };

  if (validParticipantLink && !state.calendarOpenScheduleIds.has(bySchedule.id)) {
    state.calendarOpenScheduleIds.add(bySchedule.id);
    await setMeta('calendarOpenScheduleIds', [...state.calendarOpenScheduleIds]);
  }

  return validParticipantLink;
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
  state.selectedScheduleId = currentParticipantScheduleItem()?.id || state.plan[0]?.id || null;
  state.adminCompletionLink = null;
  await setMeta('scheduleSettings', state.scheduleSettings);
  await setMeta('plan', state.plan);
  await setMeta('schedulePolicyVersion', activeSchedulePolicyVersion());
  await setMeta('contentBankVersion', CONTENT_BANK_VERSION);
  await recordEvent('schedule_preset_applied', scheduleCreationDetail(), {
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
  const url = new URL(window.location.href);
  url.searchParams.set('schedule', scheduleId);
  window.history.replaceState({}, '', url);
  await recordEvent('admin_test_card_previewed', HCTK_LABELS.adminPreviewDetail, {
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
  await saveProfileFromForm();
  const item = selectedAdminReviewItem();
  if (!item) return;

  if (!state.profile.studyId) {
    elements.adminReviewStatus.textContent = 'Set a Study ID before generating the progress check-in form link.';
    return;
  }

  const generatedAt = new Date().toISOString();
  const completionFormUrl = buildCompletionFormUrl(generatedAt, item);
  state.adminCompletionLink = {
    scheduleId: item.id,
    generatedAt,
    url: completionFormUrl
  };
  state.selectedScheduleId = item.id;
  elements.adminReviewSelect.value = item.id;
  renderAdminReviewPicker();
  renderCards();

  await recordEvent('admin_test_completion_link_created', 'Admin generated a test progress check-in form link.', {
    scheduleId: item.id,
    contentId: item.contentId,
    completionFormUrl,
    adminTest: true,
    activityNumber: formatActivityNumber(item)
  });

  state.events = await getAllEvents();
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
  await recordEvent('content_completed', HCTK_LABELS.contentCompletedDetail, {
    scheduleId: item.id,
    contentId: item.contentId,
    completionFormUrl
  });
  await refreshAll();
  launchCompletionForm(completionFormWindow, completedAt, item);
}

async function refreshAll() {
  state.events = await getAllEvents();
  renderLearningCard();
  renderNextDueMeta();
  renderMetrics();
  renderSchedule();
  renderScheduleModeStatus();
  renderActivity();
  renderAdminReviewPicker();
  renderCards();
  renderAdminProfileSummary();
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
  const completionEvent = firstEventForSchedule(item.id, ['content_completed']);
  const participantCompleted = participantInteract && Boolean(completionEvent);
  elements.completeButton.classList.toggle('hidden', !participantInteract || participantCompleted);
  renderParticipantCompletionLink(item, participantCompleted ? completionEvent : null);

  const choices = Array.isArray(content.choices) ? content.choices : [];
  if (choices.length) {
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = choice;
      button.disabled = !canAnswer;
      button.addEventListener('click', async () => {
        if (!canAnswer) return;
        const isCorrect = index === content.correctIndex;
        [...elements.answerChoices.children].forEach((child) => child.classList.remove('selected'));
        button.classList.add('selected');
        renderQuestionFeedback({
          adminPreview,
          isCorrect,
          rationale: content.rationale
        });
        elements.feedbackBox.classList.remove('hidden');

        await recordEvent(adminPreview ? 'admin_test_question_answered' : 'question_answered', `${adminPreview ? 'Admin test selected' : 'Selected'} choice ${index + 1}.`, {
          scheduleId: item.id,
          contentId: content.id,
          choiceIndex: index + 1,
          correct: isCorrect,
          adminTest: adminPreview,
          activityNumber: adminPreview ? formatActivityNumber(item) : ''
        });
        state.events = await getAllEvents();
        renderMetrics();
        renderSchedule();
        renderActivity();
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

  if (status?.kind === 'invalid') {
    heading.textContent = 'Calendar link not recognized';
    body.textContent = `The schedule link "${status.scheduleId}" was not found in the current local plan. ${HCTK_LABELS.calendarInvalidBody}`;
    return;
  }

  if (status?.kind === 'blocked') {
    heading.textContent = HCTK_LABELS.blockedHeading;
    body.textContent = HCTK_LABELS.blockedBody;
    return;
  }

  heading.textContent = HCTK_LABELS.noDueHeading;
  body.textContent = HCTK_LABELS.noDueBody;
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

function renderNextDueMeta() {
  if (state.calendarLinkStatus?.kind === 'invalid') {
    elements.nextDueMeta.textContent = 'Calendar-link diagnostic: no matching scheduled activity was found.';
    return;
  }
  if (state.calendarLinkStatus?.kind === 'blocked' && !state.adminUnlocked) {
    elements.nextDueMeta.textContent = 'This calendar link is outside the participant due window.';
    return;
  }
  if (state.calendarLinkStatus?.kind === 'adminOverride' && state.adminUnlocked) {
    elements.nextDueMeta.textContent = 'Admin override is showing this calendar-linked activity outside the participant due window.';
    return;
  }
  if (isTestScheduleMode()) {
    const currentItem = currentParticipantScheduleItem();
    const nextLocked = state.plan.find((item) => !isScheduleItemAccessible(item));
    if (currentItem) {
      elements.nextDueMeta.textContent = nextLocked
        ? `Current test activity is available now. Next activity unlocks ${formatScheduleDateTime(nextLocked)}.`
        : 'Current test activity is available now. No additional activities are scheduled.';
      return;
    }
    elements.nextDueMeta.textContent = nextLocked
      ? `Next activity unlocks ${formatScheduleDateTime(nextLocked)}.`
      : 'No remaining activities are scheduled.';
    return;
  }

  const today = todayChicagoISODate();
  const dueToday = pickTodaySchedule();
  const nextFuture = state.plan.find((item) => item.date > today);
  const nextAvailable = dueToday || state.plan.find((item) => item.date >= today);

  if (dueToday) {
    elements.nextDueMeta.textContent = nextFuture
      ? `Current ${HCTK_LABELS.itemNoun} due today until 11:59 PM Central. Next ${HCTK_LABELS.itemNoun}: ${formatScheduleDateTime(nextFuture)}.`
      : `Current ${HCTK_LABELS.itemNoun} due today until 11:59 PM Central. No additional ${HCTK_LABELS.itemPlural} are scheduled.`;
    return;
  }

  elements.nextDueMeta.textContent = nextAvailable
    ? `Next ${HCTK_LABELS.itemNoun}: ${formatScheduleDateTime(nextAvailable)}.`
    : `No remaining ${HCTK_LABELS.itemPlural} are scheduled.`;
}

function nextActivityDueText(item) {
  const next = state.plan.find((planItem) => planItem.sequenceNumber > item.sequenceNumber);
  return next
    ? `Next activity due: ${formatScheduleDateTime(next)}`
    : 'Next activity due: none scheduled';
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
        <p>${escapeHTML(content?.focus || HCTK_LABELS.focusFallback)}</p>
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
    : 'Production weekly Saturdays at 8:00 AM Central.';
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
        <p><strong>Focus:</strong> ${escapeHTML(content?.focus || HCTK_LABELS.focusFallback)}</p>
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
    option.textContent = `Reminder ${item.sequenceNumber}/26 · ${formatScheduleShortLabel(item)} · ${content?.focus || HCTK_LABELS.contentFallback}`;
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
  await saveProfileFromForm();
  if (!profileReadyForParticipantUnlock(state.profile)) {
    elements.exportStatus.textContent = 'Set Study ID, Follow-up Date, and Follow-up Time before downloading the calendar.';
    return;
  }
  const ics = makeCalendarICS();
  const filename = isTestScheduleMode() ? HCTK_LABELS.testIcsFilename : HCTK_LABELS.icsFilename;
  downloadTextFile(ics, filename, 'text/calendar;charset=utf-8');
  await recordEvent('calendar_export_created', 'Generated reminder calendar file.', {
    scheduleMode: state.scheduleSettings.mode,
    testIntervalMinutes: state.scheduleSettings.testIntervalMinutes || ''
  });
  elements.exportStatus.textContent = 'Calendar file downloaded. Import it into the device calendar to schedule reminders.';
  await refreshAll();
}

async function downloadCSV() {
  await recordEvent('csv_export_created', 'Generated local activity CSV export.', {});
  state.events = await getAllEvents();
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
    const descriptionLines = [`Title: ${calendarContent.title}`];
    if (calendarContent.detailText) {
      descriptionLines.push(`${calendarContent.detailLabel}: ${calendarContent.detailText}`);
    }
    descriptionLines.push(
      `Focus: ${content?.focus || HCTK_LABELS.calendarDescriptionFocusFallback}`,
      `Open: ${link}`
    );
    const start = calendarEventStart(item);
    const endDate = calendarEventEnd(item);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@${HCTK_CONFIG.uidDomain || 'hctk-pwa'}`,
      `DTSTAMP:${compactUTCDateTime(new Date())}`,
      `DTSTART;TZID=${CENTRAL_TIME_ZONE}:${start}`,
      `DTEND;TZID=${CENTRAL_TIME_ZONE}:${endDate}`,
      `SUMMARY:${escapeICS(calendarContent.summary)}`,
      `DESCRIPTION:${escapeICS(descriptionLines.join('\n'))}`,
      `URL;VALUE=URI:${link}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-PT0M',
      `DESCRIPTION:${escapeICS(calendarContent.alert)}`,
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

  const link = buildFollowUpFormUrl();
  const uidStudyId = String(state.profile.studyId || 'participant').replace(/[^a-z0-9-]/gi, '') || 'participant';
  const confirmationDate = addDaysToISODate(state.profile.followUpDate, -7);
  const confirmationStart = compactLocalDateTime(confirmationDate, REMINDER_HOUR, REMINDER_MINUTE);
  const confirmationEnd = addMinutesToLocalDate(confirmationDate, REMINDER_HOUR, REMINDER_MINUTE, REMINDER_DURATION_MINUTES);
  const confirmationDescription = [
    `Study ID: ${state.profile.studyId || ''}`,
    `Follow-up Visit: ${formatFollowUpDateTime()}`,
    `Open: ${link}`
  ];

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

  lines.push(
    'BEGIN:VEVENT',
    `UID:${SCHEDULE_ID_PREFIX}-follow-up-visit-${state.profile.followUpDate}-${uidStudyId}@${HCTK_CONFIG.uidDomain || 'hctk-pwa'}`,
    `DTSTAMP:${compactUTCDateTime(new Date())}`,
    `DTSTART;TZID=${CENTRAL_TIME_ZONE}:${visitStart}`,
    `DTEND;TZID=${CENTRAL_TIME_ZONE}:${visitEnd}`,
    `SUMMARY:${escapeICS(HCTK_LABELS.followUpVisitSummary)}`,
    `DESCRIPTION:${escapeICS(visitDescription.join('\n'))}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT0M',
    `DESCRIPTION:${escapeICS(HCTK_LABELS.followUpVisitSummary)}`,
    'END:VALARM',
    'END:VEVENT'
  );
}

function calendarContentForEvent(content) {
  const format = cleanCalendarText(content?.format, HCTK_LABELS.contentTypeFallback);
  const title = cleanCalendarText(content?.title, HCTK_LABELS.contentFallback);
  const detailText = cleanCalendarText(content?.prompt, '');
  const detailLabel = /question/i.test(format) ? 'Question' : 'Detail';

  return {
    title,
    detailLabel,
    detailText,
    summary: title,
    alert: title
  };
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
  return state.plan.map((item) => {
    const firstCompletion = firstEventForSchedule(item.id, ['content_completed']);
    return {
      opened_from_calendar_notification: openedFromCalendarNotificationValue(item.id),
      study_id: state.profile.studyId,
      learning_activity_completion_date: firstCompletion ? chicagoISODateFromTimestamp(firstCompletion.timestamp) : '',
      learning_activity_number: formatActivityNumber(item)
    };
  });
}

async function recordDueCardAccessIfVisible() {
  if (!state.participantUnlocked) return;
  const item = currentVisibleScheduleItem();
  if (!item) return;
  await recordEvent('content_viewed', HCTK_LABELS.contentViewedDetail, {
    scheduleId: item.id,
    contentId: item.contentId
  });
  state.events = await getAllEvents();
  renderMetrics();
}

async function recordEvent(kind, detail, extra) {
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    kind,
    detail,
    studyId: state.profile?.studyId || '',
    ...extra
  };
  await addEvent(event);
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
  if (state.adminUnlocked && state.selectedScheduleId) {
    return state.plan.find((item) => item.id === state.selectedScheduleId) || null;
  }
  if (state.calendarLinkStatus && state.calendarLinkStatus.kind !== 'valid') {
    return null;
  }
  const currentItem = currentParticipantScheduleItem();
  const selected = state.plan.find((item) => item.id === state.selectedScheduleId);
  if (selected && isScheduleItemAccessible(selected) && (!isTestScheduleMode() || currentItem?.id === selected.id)) {
    return selected;
  }
  return currentItem;
}

function currentParticipantScheduleItem() {
  if (!isTestScheduleMode()) {
    return pickTodaySchedule();
  }

  const unlocked = state.plan.filter((item) => isScheduleItemAccessible(item));
  const firstUncompleted = unlocked.find((item) => !firstEventForSchedule(item.id, ['content_completed']));
  if (firstUncompleted) return firstUncompleted;
  return unlocked[unlocked.length - 1] || null;
}

function pickTodaySchedule() {
  const today = todayChicagoISODate();
  return state.plan.find((item) => item.date === today) || null;
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

function isParticipantScheduleLinkRenderable(item, currentItem = currentParticipantScheduleItem()) {
  if (!isScheduleItemAccessible(item)) return false;
  if (!isTestScheduleMode()) return true;
  return currentItem?.id === item.id;
}

function isTestScheduleItem(item) {
  return Boolean(item?.dueAt || item?.id?.startsWith(`${SCHEDULE_ID_PREFIX}-test-`));
}

function planUsesCurrentContentBank(plan) {
  return Array.isArray(plan) &&
    plan.length === ACTIVITY_COUNT &&
    plan.every((item) => contentById(item.contentId));
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

function labelForEvent(kind) {
  return String(kind || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function reminderLink(item) {
  const url = new URL(defaultAppUrl());
  url.searchParams.set('schedule', item.id);
  return url.toString();
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

function buildCompletionFormUrl(completedAt, item) {
  const url = new URL(COMPLETION_FORM_URL);
  url.searchParams.set(COMPLETION_FORM_FIELDS.studyId, state.profile.studyId || '');
  url.searchParams.set(COMPLETION_FORM_FIELDS.completionDate, microsoftPrefillDateFromTimestamp(completedAt));
  url.searchParams.set(COMPLETION_FORM_FIELDS.activityNumber, formatActivityNumber(item));
  url.searchParams.set(COMPLETION_FORM_FIELDS.openedFromCalendarNotification, openedFromCalendarNotificationValue(item?.id));
  return url.toString();
}

function buildFollowUpFormUrl() {
  const url = new URL(FOLLOW_UP_FORM_URL);
  url.searchParams.set(FOLLOW_UP_FORM_FIELDS.studyId, state.profile.studyId || '');
  if (state.profile.followUpDate) {
    url.searchParams.set(FOLLOW_UP_FORM_FIELDS.followUpDate, `"${state.profile.followUpDate}"`);
  }
  return url.toString();
}

function formatActivityNumber(item) {
  if (!item?.sequenceNumber) return '';
  return `${item.sequenceNumber}/${ACTIVITY_COUNT}`;
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

function sanitizeScheduleSettings(settings) {
  if (settings?.mode === SCHEDULE_MODE_TEST) {
    const interval = TEST_INTERVAL_OPTIONS.includes(Number(settings.testIntervalMinutes))
      ? Number(settings.testIntervalMinutes)
      : TEST_INTERVAL_OPTIONS[0];
    return {
      mode: SCHEDULE_MODE_TEST,
      testIntervalMinutes: interval,
      testStartedAt: isValidDate(settings.testStartedAt) ? settings.testStartedAt : new Date().toISOString()
    };
  }
  return defaultScheduleSettings();
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

function formatScheduleWindow(item) {
  if (isTestScheduleItem(item)) {
    return `Available from ${formatScheduleDateTime(item)}`;
  }
  return `Due ${formatDisplayDate(item.date)} until 11:59 PM Central`;
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

function microsoftPrefillDateFromTimestamp(value) {
  return `"${chicagoISODateFromTimestamp(value)}"`;
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

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(EVENT_STORE)) {
        const store = db.createObjectStore(EVENT_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('kind', 'kind');
      }
      const oldQueueStore = ['up', 'loadQueue'].join('');
      if (db.objectStoreNames.contains(oldQueueStore)) {
        db.deleteObjectStore(oldQueueStore);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getMeta(key) {
  return transaction(META_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

function setMeta(key, value) {
  return transaction(META_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteMeta(key) {
  return transaction(META_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteLegacyPersistence() {
  const staleKeys = [
    ['up', 'loadStatus'].join(''),
    ['app', 'InstanceId'].join('')
  ];
  return Promise.all(staleKeys.map((key) => deleteMeta(key)));
}

function addEvent(event) {
  return transaction(EVENT_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.add(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllEvents() {
  return transaction(EVENT_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.index('timestamp').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function transaction(storeName, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    work(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
  });
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

function clearScheduleParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('schedule');
  window.history.replaceState({}, '', url);
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
