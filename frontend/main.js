const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let backendProcess = null;
const BACKEND_PORT = 5000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    title: 'AI Library - Personal Database Assistant'
  });

  // Load the React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '..', 'backend');
    const pythonPath = path.join(backendPath, 'venv', 'bin', 'python');
    const appPath = path.join(backendPath, 'app.py');
    
    // Check if files exist
    if (!fs.existsSync(pythonPath) || !fs.existsSync(appPath)) {
      console.error('Backend files not found');
      reject(new Error('Backend files not found'));
      return;
    }

    console.log('🚀 Starting backend server...');
    
    backendProcess = spawn(pythonPath, [appPath], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Wait for backend to be ready
    const checkBackend = async () => {
      try {
        await axios.get(`${BACKEND_URL}/health`);
        console.log('✅ Backend is ready');
        resolve();
      } catch (error) {
        setTimeout(checkBackend, 1000);
      }
    };

    setTimeout(checkBackend, 2000);
  });
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('Failed to start backend:', error);
    // Show error dialog
    dialog.showErrorBox('Startup Error', 'Failed to start the AI Library backend. Please check the installation.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Backend communication handlers
ipcMain.handle('save-config', async (event, config) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/config`, config);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
});

ipcMain.handle('load-config', async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/config`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
});

ipcMain.handle('start-catalog-build', async (event, directoryPath, aiConfig) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/catalog/start`, {
      directoryPath,
      aiConfig
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start catalog build: ${error.message}`);
  }
});

ipcMain.handle('get-catalog-progress', async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/catalog/progress`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get catalog progress: ${error.message}`);
  }
});

ipcMain.handle('search-files', async (event, query) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/search`, { query });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to search files: ${error.message}`);
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to open file: ${error.message}`);
  }
});

