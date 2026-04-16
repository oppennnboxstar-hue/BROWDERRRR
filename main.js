const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const tmp = require('tmp');
const TorController = require('./tor-controller');

let mainWindow;
let torProcess = null;
let torController = null;
let torReady = false;

const TOR_SOCKS_PORT = 9050;
const TOR_CONTROL_PORT = 9051;

async function startTor() {
  return new Promise(async (resolve, reject) => {
    try {
      const torBinaryPath = getTorBinaryPath();
      
      const torDataDir = tmp.dirSync({ unsafeCleanup: true });
      
      const torrcContent = `
SOCKSPort ${TOR_SOCKS_PORT}
ControlPort ${TOR_CONTROL_PORT}
DataDirectory ${torDataDir.name}
Log notice stdout
      `;
      
      const torrcPath = path.join(torDataDir.name, 'torrc');
      fs.writeFileSync(torrcPath, torrcContent);
      
      torProcess = spawn(torBinaryPath, ['-f', torrcPath]);
      
      torProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Tor: ${output}`);
        if (output.includes('Bootstrapped 100%')) {
          torReady = true;
          resolve();
        }
      });
      
      torProcess.stderr.on('data', (data) => {
        console.error(`Tor Error: ${data}`);
      });
      
      torProcess.on('close', (code) => {
        console.log(`Tor process exited with code ${code}`);
        torReady = false;
      });
      
      setTimeout(() => {
        if (!torReady) reject(new Error('Tor startup timeout'));
      }, 30000);
      
      torController = new TorController('127.0.0.1', TOR_CONTROL_PORT);
      
    } catch (error) {
      reject(error);
    }
  });
}

function getTorBinaryPath() {
  const platform = process.platform;
  
  const torPaths = {
    win32: path.join(process.resourcesPath, 'tor', 'tor.exe'),
    darwin: path.join(process.resourcesPath, 'tor', 'tor'),
    linux: path.join(process.resourcesPath, 'tor', 'tor')
  };
  
  let torPath = torPaths[platform];
  
  if (fs.existsSync(torPath)) return torPath;
  
  const systemPaths = {
    win32: 'tor.exe',
    darwin: '/usr/local/bin/tor',
    linux: '/usr/bin/tor'
  };
  
  return systemPaths[platform];
}

async function setupProxy() {
  const proxyRules = `socks5://127.0.0.1:${TOR_SOCKS_PORT}`;
  
  await session.defaultSession.setProxy({
    proxyRules: proxyRules,
    proxyBypassRules: '<local>'
  });
  
  console.log('Proxy configured to use Tor');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      spellcheck: false
    },
    backgroundColor: '#0A0A0F',
    show: false
  });
  
  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });
  
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.webContents.send('new-tab', url);
  });
}

ipcMain.handle('get-tor-status', () => {
  return torReady;
});

ipcMain.handle('get-new-identity', async () => {
  if (torController) {
    try {
      await torController.signalNewnym();
      return true;
    } catch (error) {
      console.error('Failed to get new identity:', error);
      return false;
    }
  }
  return false;
});

ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

app.whenReady().then(async () => {
  try {
    await startTor();
    await setupProxy();
  } catch (error) {
    console.error('Failed to start Tor:', error);
  }
  
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (torProcess) {
    torProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (torProcess) {
    torProcess.kill();
  }
});
