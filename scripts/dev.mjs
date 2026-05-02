import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

function run(name, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    if (signal) {
      console.log(`[${name}] exited via signal ${signal}`);
      shutdown(0);
    } else if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    } else {
      console.log(`[${name}] exited`);
      shutdown(0);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('price-api', process.execPath, ['server/price-api.mjs']);
run('vite', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:web']);
