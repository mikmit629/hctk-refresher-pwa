const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { boot, activityQuery, testTiming } = require('./runtime-helper.cjs');

// Model an ICS importer that unfolds lines and preserves DESCRIPTION but drops URL.
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
        const events = calendarEvents(app.run('makeCalendarICS()'));
        assert.equal(events.length, 28);
        const ids = new Set();
        for (let i = 0; i < events.length; i++) {
          const { fields, notes } = events[i];
          const link = notes.match(/^https:\/\/\S+$/m)?.[0];
          assert.equal(link, fields['URL;VALUE=URI']);
          assert.ok(notes.startsWith(i < 26 ? 'Open activity:\n' : 'Open follow-up form:\n'));
          assert.ok(notes.split('\n').slice(3).join('\n').length > 0);
          ids.add(fields.UID);
          if (i < 26) {
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
        assert.equal(ids.size, 28);
      });
    }

    it('downloads one compatible file through the calendar button', async () => {
      const app = await boot({ variant, search: activityQuery(), forbidPlan: false });
      app.run('downloadTextFile = (text, filename, type) => { observations.download = { text, filename, type }; }');
      await app.nodes.get('#downloadCalendarButton').listeners.click({ type: 'click' });
      assert.equal(app.observations.download.filename, 'TKHC.ics');
      assert.equal(app.observations.download.type, 'text/calendar');
      const events = calendarEvents(app.observations.download.text);
      assert.equal(events.length, 28);
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
