// scripts/bell-dev.mjs
import { spawn, execSync } from 'child_process';
import https from 'https';

const TARGET_URL = 'https://admin.culturemarketing.co.kr';
const CHECK_INTERVAL = 30000; // 30초마다 체크

const playSound = (type = 'local') => {
  // local: 기본 알림, deploy: 딩동댕 느낌의 알림 (3번 반복)
  const soundPath_local = 'C:\\Windows\\Media\\notify.wav';
  const soundPath_deploy = 'C:\\Windows\\Media\\tada.wav';

  const command = type === 'deploy'
    ? `for ($i=0; $i -lt 3; $i++) { (New-Object Media.SoundPlayer '${soundPath_deploy}').PlaySync(); Start-Sleep -Milliseconds 200 }`
    : `(New-Object Media.SoundPlayer '${soundPath_local}').PlaySync();`;

  spawn('powershell', ['-Command', command], { shell: true, windowsHide: true });
};

// --- Deployment Watcher ---
let isSystemDown = false;
let isMonitoring = false; // 기본적으로 감시 중지 상태
let monitoringStartTime = null;
const MONITOR_TIMEOUT = 30 * 60 * 1000; // 30분 후 자동 감시 중지 제한

const getRemoteHash = () => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
    return execSync(`git rev-parse origin/${branch}`, { stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return null;
  }
};

let lastRemoteHash = getRemoteHash();

const checkDeployment = () => {
  if (!isMonitoring) {
    const currentHash = getRemoteHash();
    if (currentHash && lastRemoteHash && currentHash !== lastRemoteHash) {
      isMonitoring = true;
      monitoringStartTime = Date.now();
      lastRemoteHash = currentHash;
      console.log(`\n[${new Date().toLocaleTimeString()}] 🔄 Github Push 감지! 실서버 배포 감시를 시작합니다: ${TARGET_URL}`);
    } else {
      if (currentHash) lastRemoteHash = currentHash;
      return; // 푸시가 감지되지 않으면 종료
    }
  }

  // 감시 시간이 30분을 초과하면 자동 종료
  if (isMonitoring && (Date.now() - monitoringStartTime > MONITOR_TIMEOUT)) {
    console.log(`[${new Date().toLocaleTimeString()}] ⏳ 설정된 감시 최대 시간(30분) 초과로 배포 감시를 중단합니다.`);
    isMonitoring = false;
    isSystemDown = false;
    return;
  }

  https.get(TARGET_URL, (res) => {
    // 200~399 사이의 응답이 오면 정상 운영 중으로 판단
    console.log(`[${new Date().toLocaleTimeString()}] 실서버 배포 감시중...`);
    const isUp = res.statusCode >= 200 && res.statusCode < 400;
    if (!isUp && !isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] 🚀 배포 시작 감지 (서버 다운)`);
      isSystemDown = true;
    } else if (isUp && isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ 배포 완료 감지! 알람을 울립니다.`);
      playSound('deploy');
      isSystemDown = false;
      isMonitoring = false; // 배포 완료 후 감시 종료
    }
  }).on('error', () => {
    if (!isSystemDown) {
      console.log(`[${new Date().toLocaleTimeString()}] 🚀 배포 시작 감지 (연결 실패)`);
      isSystemDown = true;
    }
  });
};

// 30초마다 실서버 상태 체크 시작
console.log(`[${new Date().toLocaleTimeString()}] 📡 Github Push 대기 중... 배포는 푸시 후 자동으로 감시합니다.`);
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
