// scripts/bell-cleanup.mjs
import { execSync } from 'child_process';

console.log('--- CMC Ghost Process Cleanup Start ---');

const cleanProcesses = () => {
  try {
    // 1. Nvidia Streaming 관련 rundll32 프로세스 정리 (rxdiag.dll 관련)
    console.log('1. Cleaning up Nvidia Streaming (rundll32.exe) processes...');
    const rundllTasklist = execSync('tasklist /FI "IMAGENAME eq rundll32.exe" /NH').toString();
    if (rundllTasklist.includes('rundll32.exe')) {
      execSync('taskkill /F /IM rundll32.exe', { stdio: 'inherit' });
      console.log('   ✅ All rundll32 processes terminated.');
    } else {
      console.log('   ℹ️ No rundll32 processes found.');
    }

    // 2. 혹시 남아있을 수 있는 powershell 알람 프로세스 정리 
    console.log('2. Cleaning up residual PowerShell sound processes...');
    try {
      // WMIC을 사용해 SoundPlayer가 포함된 명령만 정밀 타격
      execSync('wmic process where "name=\'powershell.exe\' and CommandLine like \'%SoundPlayer%\'" delete', { stdio: 'ignore' });
      console.log('   ✅ PowerShell sound processes cleaned.');
    } catch (e) {
      console.log('   ℹ️ No matching PowerShell processes.');
    }

    // 3. .bell-dev.pid 파일이 있다면 정리
    console.log('3. Checking for PID file...');
    try {
      execSync('if exist .bell-dev.pid del .bell-dev.pid', { stdio: 'inherit' });
      console.log('   ✅ PID file removed.');
    } catch (e) {}

  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
  }
};

cleanProcesses();
console.log('--- Cleanup Complete ---');
