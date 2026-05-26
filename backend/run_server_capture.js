const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'workspace_backend_logs.txt');
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

logStream.write(`=== SERVER START AT ${new Date().toLocaleString()} ===\n`);

// Use absolute path to Node.js executable
const nodePath = 'C:\\Program Files\\nodejs\\node.exe';
const child = spawn(nodePath, ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, PATH: process.env.PATH + ';C:\\Program Files\\nodejs' }
});

child.stdout.on('data', (data) => {
  logStream.write(data);
});

child.stderr.on('data', (data) => {
  logStream.write(`[STDERR] ${data}`);
});

child.on('close', (code) => {
  logStream.write(`\n=== SERVER EXITED WITH CODE ${code} AT ${new Date().toLocaleString()} ===\n`);
  logStream.end();
});

// Exit runner when child process terminates
child.on('exit', () => {
  process.exit(0);
});
