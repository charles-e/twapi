import twt from '../../dist/index.js';
import test from 'tape';
import moment from 'moment';

const main = async (t) => {
  test.skip('to markdown', (t) => {
    t.plan(1);
    let input = {
      id: 0,
      description: 'test2 of add task',
      end: '20201230T193817Z',
      entry: '20201026T070000Z',
      modified: '20201230T193817Z',
      status: 'deleted',
      uuid: '3d3f46c1-72aa-4682-96a8-d5afc5b5481e',
      urgency: 0.367123,
    };

    let res = twt.toMD(input);
    console.log(res);
    t.equals(
      res,
      '- [*] test2 of add task {id:3d3f46c1-72aa-4682-96a8-d5afc5b5481e}'
    );
  });

  test.skip('from markdown', (t) => {
    t.plan(1);
    let input = `
- [x] test 1
- [*] test 2
- [ ] test 3
- [ ] test #tag`;
    let res = twt.findAll(input, 'test');
    t.equals(res.length, 4, 'correct count');
  });

  test.skip('add new task', (t) => {
    t.plan(3);
    let taskTxt = `test ${Date.now()}`;
    const task = {
      description: taskTxt,
      tags: ['tag1', 'tag2'],
      complete: false,
    };
    const added = twt.upsert(task, 'test');
    console.log(`tnum = ${added.uuid}`);
    //  const tw = twt.get(added.uuid)[0];
    t.equals(added.description, taskTxt, 'description ok');
    t.equals(added.status, 'pending', 'status ok');
    t.equals(added.uuid.length, 36, 'task id is set');
    twt.rem(added.uuid);
  });

  test.skip('update task', (t) => {
    const task = {
      description: 'tape test 1',
      tags: ['tag1', 'tag2'],
      complete: false,
    };
    const added = twt.upsert(task, 'test');
    console.log(`tnum = ${added.uuid}`);
    //  const tw = twt.get(added.uuid)[0];
    t.plan(4);

    let old = twt.last();
    console.log(`tnum = ${old.uuid}`);
    (old.description = 'tape test upsert'),
      (old.tags = ['tag3', 'tag4']),
      (old.status = 'completed');

    const tw = twt.upsert(old);
    t.equals(tw.description, 'tape test upsert', 'description ok');
    t.equals(tw.status, 'completed', 'status ok');
    t.equals(tw.tags.length, 2, 'tags ok');
    t.equals(tw.uuid.length, 36, 'task id is set');
    twt.rem(old.uuid);
  });

  test.skip('findall', (t) => {
    t.plan(4);
    let input = `
- [x] test 1
- [*] test 2
- [ ] test 3
- [ ] test #tag`;
    let found = twt.findAll(input, 'test');
    t.equals(found.length, 4, '4 tasks');
    t.equals(found[0].tags.length, 1, '1 tag on entry 1');
    t.equals(found[3].status, 'completed', 'entry 4 complete');
    t.equals(found[2].status, 'deleted', 'entry 3 is deleted');
  });

  await test.skip('add all ', (t) => {
    t.plan(5);
    let input = `
- [ ] test 1
- [ ] test 2
- [ ] test 3
- [ ] test #tag`;
    let found = twt.findAll(input, 'test');
    let newItems = twt.upsertAll(found, 'test');
    let output = twt.replaceAllMD(input, newItems);
    t.equals(output.length, 222, 'correct output length');
    for (var n in newItems) {
      t.equals(newItems[n].uuid.length, 36, 'has uuid');
      try {
        twt.rem(newItems[n].uuid);
      } catch (e) {}
    }
  });

  await test.skip('replaceAll 2', (t) => {
    t.plan(4);
    let input = `
- [x] test 1
- [*] test 2
- [ ] test 3
- [ ] test #tag`;
    let found = twt.findAll(input, 'test');

    let newItems = twt.upsertAll(found, 'test');
    let output = twt.replaceAllMD(input, newItems);
    for (var n in newItems) {
      t.equals(newItems[n].uuid.length, 36, 'has uuid');
      try {
        twt.rem(newItems[n].uuid);
      } catch (e) {}
      twt.rem(newItems[n].uuid);
    }
  });

  test.skip('fetch tasks', (t) => {
    t.plan(3);
    const task = {
      item: 'tape test 3',
      tags: ['tag5', 'tag6'],
      complete: false,
    };
    const tnum = twt.add(task);
    console.log(`tnum = ${tnum}`);
    const twtask = twt.get(tnum)[0];
    const list = twt.active();
    t.equals(task.uuid.length, 36, 'task id is set');
    t.equals(list.length, 1, '1 task good');

    twt.rem(twtask.uuid);
    const list2 = twt.active();
    t.equals(list2.length, 0, '0 task good');
  });

  test('harder tasks', (t) => {
    t.plan(13);
    let input = `- [ ] pills #daily {id:70f77d17-d428-49b5-86d8-67b0b6cadcff}
  - [ ] typing practice #daily {id:1788137b-1cd4-42ed-8bc1-6715bf2fe102}
  - [ ] #daily #pain journal  {id:51d5738a-4035-4951-ae82-e6efd7365b80}
  - [x] meditate #daily {id:8914b6cf-0a23-4888-a9f7-78bcb97b2fa1} {ok:123456}
  - [ ] inject {id:fb6de7d6-6d9d-4db6-b93b-bc203f9ee380} `;

    let res = twt.findAll(input, 'test');
    t.equals(res.length, 5, 'correct count');
    t.equals(res[4].uuid, '70f77d17-d428-49b5-86d8-67b0b6cadcff', 'good uuid');
    t.equals(res[4].description, 'pills');
    t.equals(res[4].tags[0], 'daily');
    t.equals(res[3].uuid, '1788137b-1cd4-42ed-8bc1-6715bf2fe102', 'good uuid');
    t.equals(res[0].uuid, 'fb6de7d6-6d9d-4db6-b93b-bc203f9ee380', 'good uuid');
    t.equals(res[1].status, 'completed', 'correct status');
    t.equals(res[1].description, 'meditate', 'correct description');
    t.equals(res[1].uuid, '8914b6cf-0a23-4888-a9f7-78bcb97b2fa1', 'good uuid');
    t.equals(res[2].uuid, '51d5738a-4035-4951-ae82-e6efd7365b80', 'good uuid');
    t.equals(res[2].description, 'journal');
    t.equals(res[2].tags[0], 'daily');
    t.equals(res[2].tags[1], 'pain');
  });
};

main();
