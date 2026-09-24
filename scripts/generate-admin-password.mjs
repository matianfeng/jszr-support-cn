import { randomBytes } from 'node:crypto';
import { generatePasswordHash } from '../src/admin-auth.js';

async function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error('请在交互式PowerShell终端中运行此脚本');
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  let value = '';
  return new Promise((resolve, reject) => {
    function cleanup() { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); }
    function onData(character) {
      if (character === '\u0003') { cleanup(); reject(new Error('已取消')); return; }
      if (character === '\r' || character === '\n') { cleanup(); resolve(value); return; }
      if (character === '\u007f' || character === '\b') { if (value.length) value = value.slice(0, -1); return; }
      if (character >= ' ') value += character;
    }
    process.stdin.on('data', onData);
  });
}

if (process.argv.includes('--session-secret')) {
  console.log(randomBytes(48).toString('base64url'));
  process.exit(0);
}

console.log('密码建议至少12位，并组合大小写字母、数字和符号。输入内容不会显示或写入文件。');
const first = await readHidden('请输入管理员密码：');
if (first.length < 12) throw new Error('密码长度至少为12位');
const second = await readHidden('请再次输入管理员密码：');
if (first !== second) throw new Error('两次输入的密码不一致');
console.log(await generatePasswordHash(first));
