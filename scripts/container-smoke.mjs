import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers';
import console from 'node:console';
const { fetch } = globalThis;
let snapshot;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/snapshot');
    snapshot = await response.json();
    if (snapshot.points[0].observation.quality === 'good') break;
  } catch {
    /* bounded startup polling */
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.equal(snapshot?.schemaVersion, 1);
assert.equal(snapshot?.points[0].observation.quality, 'good');
assert.equal(snapshot?.points[0].observation.source, 'ntp-fixture');
assert.ok(Math.abs(snapshot.points[0].observation.value - Date.now()) < 5000);
assert.equal(snapshot.widgets[0].size.width, 1);
assert.equal(snapshot.widgets[0].size.height, 1);
const html = await (await fetch('http://127.0.0.1:3000/')).text();
assert.ok(html.includes('id="root"'));
const asset = html.match(/src="([^"]+\.js)"/)[1];
assert.equal((await fetch(`http://127.0.0.1:3000${asset}`)).status, 200);
assert.equal((await fetch('http://127.0.0.1:3000/healthz')).status, 200);
console.log(
  'Container smoke passed: NTP UDP, API, widget manifest, HTML and JS',
);
