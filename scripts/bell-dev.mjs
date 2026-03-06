// scripts/bell-dev.mjs
import { spawn } from 'child_process';
import https from 'https';

const TARGET_URL = 'https://admin.culturemarketing.co.kr/admin';
const CHECK_INTERVAL = 30000; // 30초마다 체크

const playSound = (type = 'local') => {
  // local: 기본 알림, deploy: 딩동댕 느낌의 알림 (3번 반복)
  const soundPath = 'C:\\Windows\\Media\\notify.wav';
  const repeat = type === 'deploy' ? 3 : 1;

  const command = type === 'deploy'
    ? `for ($i=0; $i -lt 3; $i++) { (New-Object Media.SoundPlayer '${soundPath}').PlaySync(); Start-Sleep -Milliseconds 200 }`
    : `(New-Object Media.SoundPlayer '${soundPath}').PlaySync();`;

  spawn('powershell', ['-Command', command], { shell: true });
};

// --- Deployment Watcher ---
let isSystemDown = false;

const checkDeployment = () => {
  https.get(TARGET_URL, (res) => {
    // 200~399 사이의 응답이 오면 정상 운영 중으로 판단
    const isUp = res.statusCode >= 200 && res.statusCode < 400;

    if (!isUp && !isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] 🚀 배포 시작 감지 (서버 다운)`);
      isSystemDown = true;
    } else if (isUp && isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ 배포 완료 감지! 알람을 울립니다.`);
      playSound('deploy');
      isSystemDown = false;
    }
  }).on('error', () => {
    if (!isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] 🚀 배포 시작 감지 (연결 실패)`);
      isSystemDown = true;
    }
  });
};

// 30초마다 실서버 상태 체크 시작
console.log(`[${new Date().toLocaleTimeString()}] 📡 실서버 배포 감시 시작: ${TARGET_URL}`);
setInterval(checkDeployment, CHECK_INTERVAL);

// --- Local Dev Server ---
const child = spawn('npm', ['run', 'dev'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});

const onData = (data) => {
  const line = data.toString();
  process.stdout.write(line);

  if (/started successfully|One more thing/i.test(line)) {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🔔 로컬 빌드 완료!`);
    playSound('local');
  }
};

child.stdout.on('data', onData);
child.stderr.on('data', onData);
