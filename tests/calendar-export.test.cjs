const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { boot, activityQuery, testTiming } = require('./runtime-helper.cjs');

function calendarEvents(calendar) {
  return calendar.replace(/\r\n[ \t]/g, '').split('BEGIN:VEVENT\r\n').slice(1).map((block) => {
    const event = block.split('END:VEVENT')[0];
    const fields = Object.fromEntries(event.split('BEGIN:VALARM')[0].trim().split('\r\n').map((line) => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon), line.slice(colon + 1)];
    }));
    const notes = fields.DESCRIPTION.replace(/\\([\\;,nN])/g, (_, char) => /[nN]/.test(char) ? '\n' : char);
    return { event, fields, notes };
  });
}

for (const variant of ['intervention', 'control']) {
  describe(`${variant} universal calendar export`, () => {
    for (const mode of ['production', 'test']) {
      it(`${mode}: preserves all events and round-trips links from notes without a URL field`, async () => {
        const profileOverrides = { study_id: 'LOCAL + & / Ü,;\\' };
        const app = await boot({ variant, search: activityQuery({ ...profileOverrides, ...(mode === 'test' ? testTiming : {}) }), forbidPlan: false });
        app.run('refreshPlanForCalendarExport()');
        const exported = app.run('makeCalendarICS()');
        for (const line of exported.split('\r\n')) {
          assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `Calendar line exceeds 75 bytes: ${line}`);
        }
        const events = calendarEvents(exported);
        assert.equal(events.length, 15);
        const ids = new Set();
        for (let i = 0; i < events.length; i++) {
          const { fields, notes } = events[i];
          const link = notes.match(/^https:\/\/\S+$/m)?.[0];
          assert.equal(link, fields['URL;VALUE=URI']);
          assert.ok(notes.startsWith(i < 13 ? 'Open activity:\n' : 'Open follow-up form:\n'));
          assert.ok(notes.split('\n').slice(3).join('\n').length > 0);
          ids.add(fields.UID);
          assert.equal((events[i].event.match(/BEGIN:VALARM/g) || []).length, 1);
          if (i < 13) {
            const content = app.json(`CONTENT_BANK[${i}]`);
            const summary = fields.SUMMARY.replace(/\\([\\;,nN])/g, (_, char) => /[nN]/.test(char) ? '\n' : char);
            assert.ok(summary.includes(content.title.replace(/\s+/g, ' ').trim()));
            for (const choice of content.choices) assert.ok(notes.includes(choice));
            if (mode === 'production') {
              assert.match(fields['DTSTART;TZID=America/Chicago'], /^\d{8}T100000$/);
              assert.match(fields['DTEND;TZID=America/Chicago'], /^\d{8}T101500$/);
              assert.match(events[i].event, /TRIGGER:-PT0M/);
            }
            const url = new URL(link);
            assert.equal(url.searchParams.get('activity'), String(i + 1));
            assert.equal(url.searchParams.get('study_id'), profileOverrides.study_id.toUpperCase());
            assert.equal(url.searchParams.get('schedule_mode'), mode);
            assert.equal(url.pathname, variant === 'control' ? '/hctk-refresher-pwa/2/' : '/hctk-refresher-pwa/');
            const when = app.run(`state.plan[${i}].dueAt || (state.plan[${i}].date + 'T15:00:00Z')`);
            const reopened = await boot({ variant, search: url.search, now: when });
            assert.equal(reopened.observations.visible.sequenceNumber, i + 1);
          } else {
            assert.equal(link, 'https://vcom.qualtrics.com/jfe/form/SV_01EQl66mgcZtwbk');
            assert.equal(new URL(link).search, '');
          }
        }
        assert.equal(ids.size, 15);
      });
    }

    it('folds Unicode at character boundaries and unfolds without changing text', async () => {
      const app = await boot({ variant });
      for (const input of [
        '', 'A'.repeat(74), 'A'.repeat(75), 'A'.repeat(148),
        'A'.repeat(73) + 'é', 'A'.repeat(72) + '’', 'A'.repeat(71) + '🩹',
        'DESCRIPTION:' + 'Ü 中 🩹 e\u0301 responder’s '.repeat(12)
      ]) {
        const folded = app.run(`foldICSLine(${JSON.stringify(input)})`);
        assert.equal(folded.replace(/\r\n /g, ''), input);
        for (const [index, line] of folded.split('\r\n').entries()) {
          assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
          if (index) assert.ok(line.startsWith(' '));
          assert.equal(Buffer.from(line, 'utf8').toString('utf8'), line);
        }
      }
      assert.equal(app.run(`foldICSLine(${JSON.stringify('A'.repeat(75))})`), 'A'.repeat(74) + '\r\n A');
    });

    it('preserves Unicode participant details in all exported activity links', async () => {
      const studyId = 'AUDIT Ü 中文 🩹 e\u0301';
      const app = await boot({ variant, search: activityQuery({ study_id: studyId }), forbidPlan: false });
      app.run('refreshPlanForCalendarExport()');
      const exported = app.run('makeCalendarICS()');
      assert.ok(exported.split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 75));
      const events = calendarEvents(exported);
      for (const { fields, notes } of events.slice(0, 13)) {
        assert.equal(new URL(fields['URL;VALUE=URI']).searchParams.get('study_id'), studyId.toUpperCase());
        assert.ok(notes.includes(fields['URL;VALUE=URI']));
      }
      for (const { notes } of events.slice(13)) {
        assert.ok(notes.includes(`Study ID: ${studyId.toUpperCase()}`));
      }
    });

    it('downloads one compatible file through the calendar button', async () => {
      const app = await boot({ variant, search: activityQuery(), forbidPlan: false });
      app.run('downloadTextFile = (text, filename, type) => { observations.download = { text, filename, type }; }');
      await app.nodes.get('#downloadCalendarButton').listeners.click({ type: 'click' });
      assert.equal(app.observations.download.filename, 'TKHC.ics');
      assert.equal(app.observations.download.type, 'text/calendar');
      const events = calendarEvents(app.observations.download.text);
      assert.equal(events.length, 15);
      assert.ok(events[0].notes.startsWith('Open activity:\nhttps://'));
      assert.match(app.nodes.get('#exportStatus').textContent, /calendar.*downloaded/i);
    });

    it('requires complete setup before downloading', async () => {
      const app = await boot({ variant, forbidPlan: false });
      app.run("downloadTextFile = () => { throw new Error('Downloaded incomplete setup'); }");
      await app.nodes.get('#downloadCalendarButton').listeners.click({ type: 'click' });
      assert.match(app.nodes.get('#exportStatus').textContent, /Set Study ID, Follow-up Date, and Follow-up Time/);
      assert.equal(app.run('state.plan.length'), 0);
    });
  });
}
