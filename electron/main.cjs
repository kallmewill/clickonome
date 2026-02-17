const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const userDataPath = app.getPath("userData");
const setlistsPath = path.join(userDataPath, "setlists");

if (!fs.existsSync(setlistsPath)) {
  fs.mkdirSync(setlistsPath, { recursive: true });
}

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "ogg"] }],
  });
  if (!canceled) {
    const buffer = fs.readFileSync(filePaths[0]);
    return {
      name: path.basename(filePaths[0]),
      buffer,
      filePath: filePaths[0],
    };
  }
}

// Settings Persistence
const settingsPath = path.join(userDataPath, "settings.json");

ipcMain.handle("settings:save", async (event, settings) => {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
});

ipcMain.handle("settings:load", async () => {
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }
  return {};
});

ipcMain.handle("sound:loadByPath", async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    return { name: path.basename(filePath), buffer };
  }
  return null;
});

// Setlist Handlers
ipcMain.handle("setlist:save", async (event, filename, data) => {
  const filePath = path.join(setlistsPath, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle("setlist:list", async () => {
  if (!fs.existsSync(setlistsPath)) return [];
  const files = fs.readdirSync(setlistsPath);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
});

ipcMain.handle("setlist:load", async (event, filename) => {
  const filePath = path.join(setlistsPath, `${filename}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
  return null;
});

ipcMain.handle("setlist:delete", async (event, filename) => {
  const filePath = path.join(setlistsPath, `${filename}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});

// Song Bank Handlers
const songBankPath = path.join(userDataPath, "songbank.json");

ipcMain.handle("songbank:save", async (event, songs) => {
  fs.writeFileSync(songBankPath, JSON.stringify(songs, null, 2));
  return true;
});

ipcMain.handle("songbank:load", async () => {
  if (fs.existsSync(songBankPath)) {
    return JSON.parse(fs.readFileSync(songBankPath, "utf-8"));
  }
  return [];
});

function createWindow() {
  ipcMain.handle("dialog:openFile", handleFileOpen);

  const win = new BrowserWindow({
    width: 400,
    height: 700,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Clickonome",
    autoHideMenuBar: true,
    // vibrance: 'under-window', // For Windows 11 acrylic effect (requires extra setup)
    backgroundColor: "#000000",
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
