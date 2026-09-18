const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { boot, activityQuery, profile, testTiming } = require('./runtime-helper.cjs');

for (const variant of ['intervention', 'control']) {
  describe(`${variant} participant visits`, () => {
    const visit = (options = {}) => boot({ variant, ...options });
    const expectedContent = variant === 'control' ? 'control-content-020' : 'content-020';
    const setupUrl = `https://example.test/hctk-refresher-pwa/${variant === 'control' ? '2/' : ''}`;
    function assertFreshSetupAfterInvalidLink(app) {
      for (const selector of ['#studyIdInput', '#followUpDateInput', '#followUpTimeInput']) {
        assert.equal(app.nodes.get(selector).value, '');
      }
      assert.equal(app.nodes.get('#enrollmentDateInput').value, '2026-10-10');
      assert.equal(app.nodes.get('#participantUnlockButton').disabled, false);
      assert.equal(app.nodes.get('#nextDueMeta').textContent, '');
      assert.equal(app.run('state.participantUnlocked'), false);
      assert.equal(app.run('state.linkedActivity'), null);
      assert.equal(app.run('state.calendarLinkStatus'), null);
      assert.equal(app.run('state.scheduleSettings.mode'), 'production');
      assert.equal(app.observations.visible, null);
      assert.equal(app.run('window.location.href'), setupUrl);
      assert.deepEqual(app.observations.replacedUrls, [setupUrl]);
    }

    it('opens fresh setup with storage unavailable and reinitializes on back/forward restoration', async () => {
      const app = await visit();
      for (const selector of ['#studyIdInput', '#followUpDateInput', '#followUpTimeInput']) {
        assert.equal(app.nodes.get(selector).value, '');
      }
      assert.equal(app.nodes.get('#enrollmentDateInput').value, '2026-10-10');
      assert.equal(app.run('state.participantUnlocked'), false);
      assert.equal(app.observations.visible, null);
      app.nodes.get('#studyIdInput').value = 'DRAFT';
      app.run('saveProfileFromForm()');
      assert.equal(app.run('state.profile.studyId'), 'DRAFT');
      app.windowListeners.pageshow({ persisted: true });
      assert.equal(app.observations.reload, true);
      const fresh = await visit();
      assert.equal(fresh.nodes.get('#studyIdInput').value, '');
    });

    it('loads Activity 20 without generating or reading a schedule', async () => {
      const app = await visit({ search: activityQuery() });
      assert.equal(app.observations.visible.sequenceNumber, 20);
      assert.equal(app.observations.visible.contentId, expectedContent);
      assert.deepEqual(app.observations.replacedUrls, []);
      assert.equal(app.run('window.location.search'), activityQuery());
      assert.equal(app.run('state.profile.studyId'), 'LOCAL-A');
      assert.equal(app.run('state.calendarLinkStatus.kind'), 'valid');
      assert.equal(app.run('openedFromCalendarNotificationValue(state.linkedActivity.id)'), 'Yes');
    });

    it('uses content sequence rather than array position', async () => {
      const app = await visit({ search: activityQuery() });
      app.run('CONTENT_BANK.reverse()');
      assert.equal(app.run('directActivity(20).contentId'), expectedContent);
    });

    for (const [name, overrides, now, sequence, date] of [
      ['before first reminder', {}, '2026-05-27T15:00:00Z', 1, '2026-05-30'],
      ['Friday night in Central Time', {}, '2026-10-10T04:59:59Z', 20, '2026-10-10'],
      ['Saturday before 10 AM', {}, '2026-10-10T14:59:59Z', 20, '2026-10-10'],
      ['Saturday at 10 AM', {}, '2026-10-10T15:00:00Z', 21, '2026-10-17'],
      ['Sunday', {}, '2026-10-11T15:00:00Z', 21, '2026-10-17'],
      ['Saturday enrollment starts the following week', { enrollment_date: '2026-09-12' }, '2026-09-12T12:00:00Z', 1, '2026-09-19'],
      ['spring daylight-saving change', { enrollment_date: '2026-03-02' }, '2026-03-08T08:00:00Z', 2, '2026-03-14'],
      ['fall daylight-saving change', { enrollment_date: '2026-10-26' }, '2026-11-01T07:00:00Z', 2, '2026-11-07'],
      ['before final reminder', {}, '2026-11-21T15:59:59Z', 26, '2026-11-21'],
      ['at final reminder', {}, '2026-11-21T16:00:00Z', null, null],
      ['after final reminder', {}, '2026-11-22T15:00:00Z', null, null]
    ]) {
      it(`calculates the next Saturday reminder without a schedule: ${name}`, async () => {
        const app = await visit({ search: activityQuery(overrides), now });
        const next = app.json('nextCalendarActivity()');
        assert.equal(next?.sequenceNumber ?? null, sequence);
        assert.equal(next?.date ?? null, date);
        if (next) assert.equal(next.localTime, '10:00');
        assert.equal(app.run('state.linkedActivity.sequenceNumber'), 20);
        if (next) {
          assert.equal(app.nodes.get('#nextDueMeta').textContent,
            app.run('`Next activity: ${formatScheduleDateTime(nextCalendarActivity())}.`'));
        } else {
          assert.equal(app.nodes.get('#nextDueMeta').textContent, 'No remaining activities are scheduled.');
        }
      });
    }

    for (const [now, sequence, dueAt] of [
      ['2026-09-08T14:59:59Z', 1, '2026-09-08T15:00:00.000Z'],
      ['2026-09-08T15:56:59Z', 20, '2026-09-08T15:57:00.000Z'],
      ['2026-09-08T15:57:00Z', 21, '2026-09-08T16:00:00.000Z'],
      ['2026-09-08T16:14:59Z', 26, '2026-09-08T16:15:00.000Z'],
      ['2026-09-08T16:15:00Z', null, null]
    ]) {
      it(`calculates the next accelerated reminder without a schedule: ${now}`, async () => {
        const app = await visit({ search: activityQuery(testTiming), now });
        const next = app.json('nextCalendarActivity()');
        assert.equal(next?.sequenceNumber ?? null, sequence);
        assert.equal(next?.dueAt ?? null, dueAt);
        assert.equal(app.run('state.linkedActivity.sequenceNumber'), 20);
      });
    }

    it('shows the next Saturday after setup without creating a schedule', async () => {
      const app = await visit({ now: '2026-09-09T15:00:00Z' });
      assert.equal(app.run('nextCalendarActivity()'), null);
      app.nodes.get('#studyIdInput').value = 'NEW';
      app.nodes.get('#followUpDateInput').value = '2027-03-09';
      app.nodes.get('#followUpTimeInput').value = '10:30';
      app.nodes.get('#participantPasswordInput').value = 'tkhcpass';
      await app.run('unlockParticipant()');
      assert.equal(app.observations.visible, null);
      assert.equal(app.run('nextCalendarActivity().date'), '2026-09-12');
      assert.match(app.nodes.get('#nextDueMeta').textContent, /^Next activity: Sat, Sep 12, 2026 at 10:00 AM Central\.$/);
    });

    it('recovers incomplete links to usable setup and reloads without another redirect', async () => {
      const app = await visit({ search: '?activity=20#stale', allowSetupRedirect: true });
      assertFreshSetupAfterInvalidLink(app);
      assert.equal(app.run('nextCalendarActivity()'), null);
      const fresh = await visit({ search: app.run('window.location.search') });
      assert.deepEqual(fresh.observations.replacedUrls, []);
      assert.equal(fresh.nodes.get('#studyIdInput').value, '');
      app.nodes.get('#studyIdInput').value = 'TEST';
      app.nodes.get('#followUpDateInput').value = '2027-04-10';
      app.nodes.get('#followUpTimeInput').value = '10:00';
      app.nodes.get('#participantPasswordInput').value = 'tkhcpass';
      await app.run('unlockParticipant()');
      assert.equal(app.run('state.participantUnlocked'), true);
      assert.equal(app.run('state.profile.studyId'), 'TEST');
      assert.equal(app.run('state.linkedActivity'), null);
      assert.equal(app.observations.visible, null);
      assert.equal(app.run('window.location.href'), setupUrl);
    });

    it('updates the next reminder on tab return while the linked activity remains blocked', async () => {
      const app = await visit({ search: activityQuery(), now: '2026-09-11T15:00:00Z' });
      assert.equal(app.observations.visible, null);
      assert.match(app.nodes.get('#nextDueMeta').textContent, /Sep 12, 2026/);
      app.clock.now = '2026-09-12T15:00:00Z';
      app.documentListeners.visibilitychange();
      assert.match(app.nodes.get('#nextDueMeta').textContent, /Sep 19, 2026/);
      assert.equal(app.observations.visible, null);
      assert.equal(app.run('state.linkedActivity.sequenceNumber'), 20);
    });

    for (const [name, overrides, now, available] of [
      ['before production date', {}, '2026-10-10T04:59:59Z', false],
      ['at production midnight', {}, '2026-10-10T05:00:00Z', true],
      ['end of production date', {}, '2026-10-11T04:59:59Z', true],
      ['after production date', {}, '2026-10-11T05:00:00Z', false],
      ['before standard-time midnight', { activity: 1, enrollment_date: '2026-11-02' }, '2026-11-07T05:59:59Z', false],
      ['at standard-time midnight', { activity: 1, enrollment_date: '2026-11-02' }, '2026-11-07T06:00:00Z', true],
      ['Saturday before spring shift', { activity: 1, enrollment_date: '2026-03-02' }, '2026-03-07T06:00:00Z', true],
      ['Saturday after spring shift', { activity: 2, enrollment_date: '2026-03-02' }, '2026-03-14T05:00:00Z', true]
    ]) {
      it(`enforces Central Time availability: ${name}`, async () => {
        const app = await visit({ search: activityQuery(overrides), now });
        assert.equal(Boolean(app.observations.visible), available);
      });
    }

    for (const [now, available] of [
      ['2026-09-08T15:56:59Z', false],
      ['2026-09-08T15:57:00Z', true],
      ['2026-09-08T18:00:00Z', true]
    ]) {
      it(`enforces test due time with earlier activities skipped: ${now}`, async () => {
        const app = await visit({ search: activityQuery(testTiming), now });
        assert.equal(Boolean(app.observations.visible), available);
        if (available) assert.equal(app.observations.visible.sequenceNumber, 20);
      });
    }

    for (const [name, overrides] of [
      ['out-of-range activity', { activity: '27' }],
      ['empty activity', { activity: '' }],
      ['blank Study ID', { study_id: ' ' }],
      ['impossible enrollment date', { enrollment_date: '2026-02-30' }],
      ['invalid follow-up date', { follow_up_date: '2026-13-01' }],
      ['invalid follow-up time', { follow_up_time: '25:00' }],
      ['unknown schedule mode', { schedule_mode: 'unknown' }],
      ['unsupported test interval', { ...testTiming, test_interval: '4' }],
      ['missing test start', { ...testTiming, test_started_at: '' }],
      ['impossible test start date', { ...testTiming, test_started_at: '2026-02-30T10:00:00Z' }],
      ['test start without timezone', { ...testTiming, test_started_at: '2026-09-08T10:00:00' }]
    ]) {
      it(`returns to fresh setup for ${name}`, async () => {
        const app = await visit({ search: activityQuery(overrides), allowSetupRedirect: true });
        assertFreshSetupAfterInvalidLink(app);
      });
    }

    for (const search of ['?activity=20', '?schedule=hctk-2026-10-10-020']) {
      it(`returns to fresh setup for incomplete legacy link ${search}`, async () => {
        const app = await visit({ search, allowSetupRedirect: true });
        assertFreshSetupAfterInvalidLink(app);
      });
    }

    it('accepts supported camelCase profile and schedule aliases', async () => {
      const app = await visit({
        search: '?activity=20&studyId=ALIAS&enrollmentDate=2026-05-27&followUpDate=2026-11-27&followUpTime=10:30&scheduleMode=production'
      });
      assert.equal(app.observations.visible.sequenceNumber, 20);
      assert.equal(app.run('state.profile.studyId'), 'ALIAS');
    });

    it('keeps answers, Qualtrics prefills and CSV in the visit without a schedule or storage', async () => {
      const app = await visit({ search: activityQuery() });
      app.run(`recordEvent('question_answered', 'Selected answer', {
        scheduleId: state.linkedActivity.id,
        contentId: state.linkedActivity.contentId,
        choiceIndex: 1, choiceLetter: 'B', choiceText: 'LOCAL ANSWER'
      })`);
      await app.run('refreshAll()');
      await app.run('recordParticipantCompletionAndLaunchForm(state.linkedActivity)');
      const url = new URL(app.observations.href);
      const fields = app.json('COMPLETION_FORM_FIELDS');
      assert.equal(url.searchParams.get(fields.studyId), 'LOCAL-A');
      assert.equal(url.searchParams.get(fields.activityNumber), '20/26');
      assert.equal(url.searchParams.get(fields.openedFromCalendarNotification), 'Yes');
      assert.equal(url.searchParams.get(fields.completionDate), '2026-10-10');
      assert.equal(url.searchParams.get(fields.learningActivityAnswer), 'B: LOCAL ANSWER');
      const rows = app.json('buildActivityTrackingRows()');
      assert.equal(rows.length, 1);
      assert.equal(rows[0].learning_activity_number, '20/26');
      assert.equal(rows[0].learning_activity_completion_date, '2026-10-10');
      const fresh = await visit({ search: activityQuery() });
      assert.equal(fresh.run("state.events.filter(e => ['content_completed', 'question_answered'].includes(e.kind)).length"), 0);
    });

    it('keeps two participant tabs independent', async () => {
      const first = await visit({ search: activityQuery() });
      const second = await visit({
        search: activityQuery({ study_id: 'LOCAL-B', activity: 19, enrollment_date: '2026-06-03' })
      });
      assert.equal(first.run('state.profile.studyId'), 'LOCAL-A');
      assert.equal(second.run('state.profile.studyId'), 'LOCAL-B');
      assert.equal(first.observations.visible.sequenceNumber, 20);
      assert.equal(second.observations.visible.sequenceNumber, 19);
    });

    it('rechecks eligibility after the scheduled date', async () => {
      const app = await visit({ search: activityQuery() });
      app.clock.now = '2026-10-11T06:00:00Z';
      await app.run('refreshAll()');
      assert.equal(app.observations.visible, null);
    });

    it('preserves feedback on tab return until availability changes', async () => {
      const app = await visit({ search: activityQuery() });
      app.run(`
        let refreshCalls = 0;
        const realRefresh = refreshAll;
        refreshAll = async () => { refreshCalls++; await realRefresh(); };
      `);
      app.documentListeners.visibilitychange();
      await Promise.resolve();
      assert.equal(app.run('refreshCalls'), 0);
      app.clock.now = '2026-10-11T06:00:00Z';
      app.documentListeners.visibilitychange();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(app.run('refreshCalls'), 1);
      assert.equal(app.observations.visible, null);
    });

    it('exports all 26 activity links and both follow-ups, and round-trips each activity', async () => {
      const app = await visit({ search: activityQuery(), forbidPlan: false });
      app.run('refreshPlanForCalendarExport()');
      const calendar = app.run('makeCalendarICS()').replace(/\r\n /g, '');
      assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 28);
      const links = [...calendar.matchAll(/URL;VALUE=URI:(https:\/\/example\.test[^\r\n]+)/g)]
        .map((match) => new URL(match[1]));
      assert.equal(links.length, 26);
      for (const link of links) {
        const sequence = Number(link.searchParams.get('activity'));
        const due = app.run(`state.plan[${sequence - 1}].date`);
        assert.equal(link.pathname, variant === 'control' ? '/hctk-refresher-pwa/2/' : '/hctk-refresher-pwa/');
        const reopened = await visit({ search: link.search, now: due + 'T15:00:00Z' });
        assert.equal(reopened.observations.visible.sequenceNumber, sequence);
      }
    });

    it('matches exported timestamps for every test interval across fall daylight saving', async () => {
      const app = await visit({ forbidPlan: false });
      app.run('state.profile = ' + JSON.stringify(profile));
      for (const minutes of [3, 5, 10, 15]) {
        app.run(`state.scheduleSettings = {
          mode: 'test', testIntervalMinutes: ${minutes}, testStartedAt: '2026-11-01T05:30:00.000Z'
        }`);
        assert.deepEqual(
          app.json('Array.from({ length: 26 }, (_, i) => directActivity(i + 1))'),
          app.json('generatePlan(state.profile, state.scheduleSettings)')
        );
      }
    });

    it('preserves the participant URL and restores Activity 20 after an Admin preview', async () => {
      const app = await visit({ search: activityQuery(), forbidPlan: false });
      app.nodes.get('#adminPasswordInput').value = 'tkhcadmin';
      await app.run('unlockAdmin()');
      app.run('ensureAdminPlan()');
      assert.equal(app.run('state.plan.length'), 26);
      const originalUrl = app.run('window.location.href');
      await app.run('selectAdminSchedule(state.plan[0].id)');
      assert.equal(app.observations.visible.sequenceNumber, 1);
      assert.equal(app.run('window.location.href'), originalUrl);
      await app.run('exitAdminMode()');
      assert.equal(app.observations.visible.sequenceNumber, 20);
      assert.equal(app.run('window.location.href'), originalUrl);
    });

    it('does not generate a schedule during setup unlock, only on explicit export', async () => {
      const app = await visit({ forbidPlan: false });
      app.run(`
        let planCalls = 0;
        const realPlan = generatePlan;
        generatePlan = (...args) => { planCalls++; return realPlan(...args); };
      `);
      app.nodes.get('#studyIdInput').value = 'NEW';
      app.nodes.get('#followUpDateInput').value = '2027-04-10';
      app.nodes.get('#followUpTimeInput').value = '10:30';
      app.nodes.get('#participantPasswordInput').value = 'tkhcpass';
      await app.run('unlockParticipant()');
      assert.equal(app.run('state.participantUnlocked'), true);
      assert.equal(app.run('planCalls'), 0);
      app.run('refreshPlanForCalendarExport()');
      assert.equal(app.run('planCalls'), 1);
      assert.equal((app.run('makeCalendarICS()').match(/BEGIN:VEVENT/g) || []).length, 28);
    });

    it('previews Admin test presets without changing the original link', async () => {
      const app = await visit({ search: activityQuery(), forbidPlan: false });
      app.nodes.get('#adminPasswordInput').value = 'tkhcadmin';
      await app.run('unlockAdmin()');
      const originalUrl = app.run('window.location.href');
      await app.run("applySchedulePreset('test', 5)");
      assert.equal(app.run('state.plan.length'), 26);
      assert.equal(app.observations.visible.sequenceNumber, 1);
      assert.equal(app.run('state.scheduleSettings.testIntervalMinutes'), 5);
      assert.equal(app.run('window.location.href'), originalUrl);
      await app.run('exitAdminMode()');
      assert.equal(app.observations.visible.sequenceNumber, 20);
    });
  });
}
