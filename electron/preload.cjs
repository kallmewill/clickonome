const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Placeholder for future IPC methods
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
  selectAudioFile: () => ipcRenderer.invoke("dialog:openFile"),
  setlist: {
    save: (filename, data) =>
      ipcRenderer.invoke("setlist:save", filename, data),
    list: () => ipcRenderer.invoke("setlist:list"),
    load: (filename) => ipcRenderer.invoke("setlist:load", filename),
    delete: (filename) => ipcRenderer.invoke("setlist:delete", filename),
  },
  songbank: {
    save: (songs) => ipcRenderer.invoke("songbank:save", songs),
    load: () => ipcRenderer.invoke("songbank:load"),
  },
  settings: {
    save: (settings) => ipcRenderer.invoke("settings:save", settings),
    load: () => ipcRenderer.invoke("settings:load"),
  },
  loadSoundByPath: (filePath) =>
    ipcRenderer.invoke("sound:loadByPath", filePath),
});
