const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { resolveWorkerName, deploymentArgs } = require('./deploy.cjs');

function fixture(t, contents) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-deploy-test-'));
  const privateFile = path.join(root, '.worker-deploy.local.json');
  if (contents !== undefined) fs.writeFileSync(privateFile, contents);
  t.after(() => {
    if (fs.existsSync(privateFile)) fs.unlinkSync(privateFile);
    fs.rmdirSync(root);
  });
  return root;
}

test('missing settings fail before starting Wrangler', t => {
  const root = fixture(t);
  assert.throws(() => resolveWorkerName(root, {}), /Set the existing Worker name/);
  const script = path.join(root, 'deploy.cjs');
  fs.copyFileSync(path.join(__dirname, 'deploy.cjs'), script);
  // The wrapper resolves its project root as the parent of its scripts folder.
  const scripts = path.join(root, 'scripts');
  fs.mkdirSync(scripts);
  fs.renameSync(script, path.join(scripts, 'deploy.cjs'));
  const env = { ...process.env };
  delete env.CF_WORKER_NAME;
  delete env.WRANGLER_CI_OVERRIDE_NAME;
  const result = spawnSync(process.execPath, [path.join(scripts, 'deploy.cjs')], { env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set the existing Worker name/);
  assert.doesNotMatch(result.stderr, /Cannot find module/);
  fs.unlinkSync(path.join(scripts, 'deploy.cjs'));
  fs.rmdirSync(scripts);
});

test('private name is passed explicitly with fixed configuration', t => {
  const root = fixture(t, JSON.stringify({ workerName: 'existing-agent' }));
  assert.deepEqual(deploymentArgs(root, {}, ['--dry-run', '--outdir', 'dist']), [
    'deploy', '--config', path.join(root, 'wrangler.toml'), '--name', 'existing-agent', '--dry-run', '--outdir', 'dist'
  ]);
});

test('environment-only settings work but conflicting settings fail', t => {
  const root = fixture(t, JSON.stringify({ workerName: 'existing-agent' }));
  assert.equal(resolveWorkerName(root, { CF_WORKER_NAME: 'existing-agent' }), 'existing-agent');
  assert.throws(() => resolveWorkerName(root, { CF_WORKER_NAME: 'different-agent' }), /conflicts/);
  assert.throws(() => resolveWorkerName(root, { WRANGLER_CI_OVERRIDE_NAME: 'different-agent' }), /override/);
  assert.equal(resolveWorkerName(fixture(t), { CF_WORKER_NAME: 'existing-agent' }), 'existing-agent');
});

test('invalid private files and names fail closed', t => {
  assert.throws(() => resolveWorkerName(fixture(t, '{'), {}), /as JSON/);
  assert.throws(() => resolveWorkerName(fixture(t, '{}'), { CF_WORKER_NAME: 'existing-agent' }), /contain workerName/);
  for (const name of ['', 'bad name', '--name=other', '../other', 'a'.repeat(64)]) {
    assert.throws(() => resolveWorkerName(fixture(t), { CF_WORKER_NAME: name }), /Set the existing Worker name/);
  }
});

test('arguments cannot change Worker, config, environment or deployment namespace', t => {
  const root = fixture(t);
  for (const args of [['--name', 'other'], ['--name=other'], ['--env', 'staging'], ['-e', 'staging'], ['--config', 'other.toml'], ['--dispatch-namespace', 'other'], ['--outdir'], ['--dry-run=false']]) {
    assert.throws(() => deploymentArgs(root, { CF_WORKER_NAME: 'existing-agent' }, args), /Only --dry-run/);
  }
});
