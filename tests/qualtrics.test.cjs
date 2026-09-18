const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { boot, activityQuery, testTiming } = require('./runtime-helper.cjs');

const destination = 'https://vcom.qualtrics.com/jfe/form/SV_4Orwv8tDt1AWIsu';
const expectedKeys = ['activity_number', 'answer', 'calendar_link', 'completion_date', 'study_group', 'study_id'];

for (const [variant, groupCode] of [['intervention', 'A'], ['control', 'B']]) {
  const visit = (options = {}) => boot({variant, search: activityQuery(testTiming), ...options});
  describe(`${variant} Qualtrics submissions`, () => {
    it('sends all 26 activities and every answer with Study ID and a neutral group code, without storage or a plan', async () => {
      for (let sequence = 1; sequence <= 26; sequence++) {
        const app = await visit({search:activityQuery({...testTiming, activity:sequence})});
        const content = app.json('contentById(state.linkedActivity.contentId)');
        assert.equal(content.sequence, sequence);
        const choices = content.choices.length ? content.choices : [''];
        for (let index = 0; index < choices.length; index++) {
          if (content.choices.length) {
            app.run(`recordEvent('question_answered', 'Test selection', {
              scheduleId:state.linkedActivity.id, contentId:state.linkedActivity.contentId,
              choiceIndex:${index + 1}, choiceLetter:choiceLetter(${index}),
              choiceText:${JSON.stringify(choices[index])}
            })`);
          }
          const url = new URL(app.run('buildCompletionFormUrl(new Date().toISOString(), state.linkedActivity)'));
          assert.equal(url.origin + url.pathname, destination);
          assert.deepEqual([...url.searchParams.keys()].sort(), expectedKeys);
          assert.deepEqual(Object.fromEntries(url.searchParams), {
            study_id:'LOCAL-A', study_group:groupCode, completion_date:'2026-10-10',
            activity_number:`${sequence}/26`, calendar_link:'Yes',
            answer:content.choices.length ? `${'ABCD'[index]}: ${choices[index]}` : ''
          });
        }
      }
    });

    it('uses the app group code for participant and Admin links, ignoring incoming group parameters', async () => {
      for (const suppliedGroup of ['A', 'B', 'intervention', 'control']) {
        const app = await visit({search:activityQuery({...testTiming, study_group:suppliedGroup})});
        for (const adminTest of [false, true]) {
          const url = new URL(app.run(`buildCompletionFormUrl(new Date().toISOString(), state.linkedActivity, {adminTest:${adminTest}})`));
          assert.equal(url.searchParams.get('study_group'), groupCode);
          assert.equal(url.searchParams.get('study_id'), 'LOCAL-A');
          assert.deepEqual([...url.searchParams.keys()].sort(), expectedKeys);
        }
      }
    });

    it('uses the last answer when timestamps tie and keeps Admin answers separate', async () => {
      const app = await visit();
      for (const [kind,letter] of [['question_answered','A'],['question_answered','B'],['admin_test_question_answered','C']]) {
        app.run(`recordEvent(${JSON.stringify(kind)}, 'Test', {
          scheduleId:state.linkedActivity.id, contentId:state.linkedActivity.contentId,
          choiceLetter:${JSON.stringify(letter)}, choiceText:${JSON.stringify('answer ' + letter)}
        })`);
      }
      assert.equal(app.run('learningActivityAnswerValue(state.linkedActivity)'), 'B: answer B');
      assert.equal(app.run('learningActivityAnswerValue(state.linkedActivity, {adminTest:true})'), 'C: answer C');
      await app.run('recordParticipantCompletionAndLaunchForm(state.linkedActivity)');
      const launched = new URL(app.observations.href);
      assert.equal(launched.searchParams.get('answer'), 'B: answer B');
      assert.equal(launched.searchParams.get('study_group'), groupCode);
      app.run("renderParticipantCompletionLink(state.linkedActivity, firstEventForSchedule(state.linkedActivity.id, ['content_completed']))");
      const retry = new URL(app.nodes.get('#participantCompletionFormLink').href);
      assert.equal(retry.href, launched.href);
    });

    it('renders the reopen link for the latest handoff after changed answers, tied timestamps and midnight', async () => {
      const app = await visit({renderParticipant:true});
      const content = app.json('contentById(state.linkedActivity.contentId)');
      const times = ['2026-10-11T04:59:00Z', '2026-10-11T04:59:00Z', '2026-10-11T05:01:00Z'];
      let latestUrl;
      for (let index = 0; index < times.length; index++) {
        app.clock.now = times[index];
        app.run(`recordEvent('question_answered','Changed answer', {
          scheduleId:state.linkedActivity.id, contentId:state.linkedActivity.contentId,
          choiceIndex:${index + 1}, choiceLetter:choiceLetter(${index}),
          choiceText:${JSON.stringify(content.choices[index])}
        })`);
        await app.run('recordParticipantCompletionAndLaunchForm(state.linkedActivity)');
        latestUrl = app.observations.href;
        assert.equal(app.nodes.get('#participantCompletionFormLink').href, latestUrl);
        const fields = new URL(latestUrl).searchParams;
        assert.equal(fields.get('answer'), `${'ABC'[index]}: ${content.choices[index]}`);
        assert.equal(fields.get('completion_date'), index < 2 ? '2026-10-10' : '2026-10-11');
        assert.equal(fields.get('study_group'), groupCode);
        assert.equal(fields.get('activity_number'), '20/26');
      }
      // A later selection without another handoff must not rewrite the link
      // that reopens the participant's already prepared submission.
      app.run(`recordEvent('question_answered','Not handed off', {
        scheduleId:state.linkedActivity.id, choiceLetter:'D', choiceText:'Unsent answer'
      })`);
      await app.run('refreshAll()');
      assert.equal(app.nodes.get('#participantCompletionFormLink').href, latestUrl);
    });

    it('encodes punctuation and uses a Central calendar date without Microsoft date quotes', async () => {
      const id = 'LOCAL + & / ü';
      const answer = 'B: pressure & gauze + cloth / “yes” #1?';
      const app = await visit({search:activityQuery({...testTiming, study_id:id})});
      app.run(`recordEvent('question_answered','Test',{
        scheduleId:state.linkedActivity.id, choiceLetter:'B', choiceText:${JSON.stringify(answer.slice(3))}
      })`);
      for (const [timestamp,date] of [
        ['2026-03-08T05:59:59Z','2026-03-07'],
        ['2026-03-08T06:00:00Z','2026-03-08'],
        ['2026-11-02T05:59:59Z','2026-11-01'],
        ['2026-11-02T06:00:00Z','2026-11-02']
      ]) {
        const url = new URL(app.run(`buildCompletionFormUrl(${JSON.stringify(timestamp)},state.linkedActivity)`));
        assert.equal(url.searchParams.get('study_id'), id.toUpperCase());
        assert.equal(url.searchParams.get('answer'), answer);
        assert.equal(url.searchParams.get('completion_date'), date);
      }
    });

    it('clears activity answers on reopening', async () => {
      const app = await visit();
      app.run(`recordEvent('question_answered','Test',{scheduleId:state.linkedActivity.id,choiceLetter:'A',choiceText:'Earlier answer'})`);
      const fresh = await visit();
      const url = new URL(fresh.run('buildCompletionFormUrl(new Date().toISOString(),state.linkedActivity)'));
      assert.equal(url.searchParams.get('answer'),'');
      assert.equal(url.searchParams.get('activity_number'),'20/26');
      fresh.run('state.calendarOpenScheduleIds.clear()');
      assert.equal(new URL(fresh.run('buildCompletionFormUrl(new Date().toISOString(),state.linkedActivity)')).searchParams.get('calendar_link'),'No');
    });

    it('exports both follow-up events with the exact survey URL, no prefills, 10 AM confirmation and the entered visit time', async () => {
      const id = 'LOCAL + & / Ü';
      const app = await visit({search:activityQuery({study_id:id}),forbidPlan:false});
      app.run('refreshPlanForCalendarExport()');
      const calendar = app.run('makeCalendarICS()').replace(/\r\n /g, '');
      const events = calendar.split('BEGIN:VEVENT\r\n').slice(1);
      assert.equal(events.length,28);
      const followUps = events.filter(event => event.includes('SUMMARY:6-Month Follow-Up'));
      assert.equal(followUps.length,2);
      for (const event of followUps) {
        const url = new URL(event.match(/URL;VALUE=URI:([^\r\n]+)/)[1]);
        assert.equal(url.href,'https://vcom.qualtrics.com/jfe/form/SV_01EQl66mgcZtwbk');
        assert.equal(url.search,'');
        assert.match(event,/TRIGGER:-PT0M/);
      }
      assert.match(followUps[0],/DTSTART;TZID=America\/Chicago:20261120T100000/);
      assert.match(followUps[1],/DTSTART;TZID=America\/Chicago:20261127T103000/);
      assert.equal(events.filter(event => /URL;VALUE=URI:https:\/\/example\.test/.test(event)).length,26);
      assert.equal(calendar.includes('forms.office.com'),false);
      const activityForm = new URL(app.run('buildCompletionFormUrl(new Date().toISOString(),state.linkedActivity)'));
      assert.equal(activityForm.origin + activityForm.pathname,destination);
    });
  });
}
