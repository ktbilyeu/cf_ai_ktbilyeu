const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function resolveWorkerName(root, env) {
  const privatePath = path.join(root, '.worker-deploy.local.json');
  let privateName;
  if (fs.existsSync(privatePath)) {
    try {
      privateName = JSON.parse(fs.readFileSync(privatePath, 'utf8')).workerName;
    } catch {
      throw new Error('Cannot read .worker-deploy.local.json as JSON.');
    }
    if (typeof privateName !== 'string' || !privateName) {
      throw new Error('The private deployment file must contain workerName.');
    }
  }
  const environmentName = env.CF_WORKER_NAME;
  if (privateName && environmentName !== undefined && privateName !== environmentName) {
    throw new Error('CF_WORKER_NAME conflicts with the private deployment file.');
  }
  const name = environmentName ?? privateName;
  if (typeof name !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) {
    throw new Error('Set the existing Worker name in .worker-deploy.local.json or CF_WORKER_NAME before deploying.');
  }
  if (env.WRANGLER_CI_OVERRIDE_NAME !== undefined && env.WRANGLER_CI_OVERRIDE_NAME !== name) {
    throw new Error('Wrangler CI attempts to override the private Worker name.');
  }
  return name;
}

function deploymentArgs(root, env, extraArgs) {
  const args = ['deploy', '--config', path.join(root, 'wrangler.toml'), '--name', resolveWorkerName(root, env)];
  for (let i = 0; i < extraArgs.length; i++) {
    const argument = extraArgs[i];
    if (argument === '--dry-run') {
      args.push(argument);
    } else if (argument === '--outdir' && extraArgs[i + 1] && !extraArgs[i + 1].startsWith('-')) {
      args.push(argument, extraArgs[++i]);
    } else {
      throw new Error('Only --dry-run and --outdir <directory> are supported by the deploy wrapper.');
    }
  }
  return args;
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const args = deploymentArgs(root, process.env, process.argv.slice(2));
    const wrangler = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
    const child = spawnSync(process.execPath, [wrangler, ...args], { cwd: root, stdio: 'inherit', shell: false });
    if (child.error) throw child.error;
    process.exitCode = child.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { resolveWorkerName, deploymentArgs };
