const assert = require('node:assert/strict');
const { it } = require('node:test');
const { boot, activityQuery } = require('./runtime-helper.cjs');
for (const variant of ['control','intervention']) {
  it(`${variant}: refuses unversioned and wrong-version calendar links`, async () => {
    for (const version of ['', 'old-26']) {
      const app = await boot({variant, search:activityQuery({curriculum:version}), allowSetupRedirect:true});
      assert.equal(app.run('state.participantUnlocked'),false);
      assert.equal(app.run('state.linkedActivity'),null);
      assert.match(app.nodes.get('#participantUnlockStatus').textContent,/earlier study version/);
    }
  });
  it(`${variant}: accepts 13/13 and rejects 14 and the old /26 denominator`, async () => {
    const last = await boot({variant,search:activityQuery({activity:'13/13'}),now:'2026-10-31T15:00:00Z'});
    assert.equal(last.observations.visible.sequenceNumber,13);
    for (const activity of ['14','1/26']) {
      const bad=await boot({variant,search:activityQuery({activity}),allowSetupRedirect:true});
      assert.equal(bad.run('state.participantUnlocked'),false);
    }
  });
  it(`${variant}: keeps the entered visit date before, on or after the final activity`, async () => {
    const app=await boot({variant, search:activityQuery(),forbidPlan:false});
    app.run('downloadTextFile = (text) => { observations.download = text; }');
    for (const day of ['2026-10-30','2026-10-31','2026-11-06']) {
      app.nodes.get('#followUpDateInput').value=day;
      await app.nodes.get('#downloadCalendarButton').listeners.click();
      assert.match(app.nodes.get('#exportStatus').textContent,/Calendar file downloaded/);
      const ics = app.observations.download.replace(/\r\n /g, '');
      assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 15);
      assert.ok(ics.includes('DTSTART;TZID=America/Chicago:' + day.replaceAll('-', '') + 'T103000'));
    }
  });
  it(`${variant}: retains exactly 13 complete questions and 15/60-minute calendar slots`, async () => {
    const app=await boot({variant,search:activityQuery(),forbidPlan:false});
    const bank=app.json('CONTENT_BANK');
    assert.equal(bank.length,13);
    for(const card of bank){
      assert.equal(card.format,'Question');assert.equal(card.choices.length,4);
      assert.ok(Number.isInteger(card.correctIndex)&&card.correctIndex>=0&&card.correctIndex<4);
      assert.deepEqual(card.rationale.split('\n').filter(x=>/^[A-D]:/.test(x)).map(x=>x.slice(0,2)),['A:','B:','C:','D:']);
    }
    app.run('refreshPlanForCalendarExport()');
    const ics=app.run('makeCalendarICS()').replace(/\r\n /g,'');
    assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,15);
    assert.equal((ics.match(/BEGIN:VALARM/g)||[]).length,15);
    assert.match(ics,/DTSTART;TZID=America\/Chicago:20260808T100000\r\nDTEND;TZID=America\/Chicago:20260808T101500/);
    assert.match(ics,/DTSTART;TZID=America\/Chicago:20261106T103000\r\nDTEND;TZID=America\/Chicago:20261106T113000/);
    assert.equal((ics.match(/curriculum=questions-13-v1/g)||[]).length,26); // URL and description for each activity
  });
}
