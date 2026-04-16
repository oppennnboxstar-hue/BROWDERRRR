module.exports = {
  appId: 'com.comet.browser',
  productName: 'Comet Browser',
  directories: {
    output: 'dist',           // меняем с 'release' на 'dist' для совместимости
    buildResources: 'build'   // папка с иконками и дополнительными ресурсами
  },
  files: [
    'main.js',
    'preload.js',
    'index.html',
    'style.css',
    'renderer.js',
    'tor-controller.js',
    'node_modules/**/*'
  ],
  extraResources: [
    {
      from: 'tor-binaries/',
      to: 'tor/',
      filter: ['**/*']
    }
  ],
  win: {
    target: 'nsis',
    icon: 'build/icon.ico'
  },
  mac: {
    target: 'dmg',
    icon: 'build/icon.icns',
    category: 'public.app-category.productivity'
  },
  linux: {
    target: 'AppImage',
    icon: 'build/icon.png',
    category: 'Network'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  // Дополнительные настройки для предотвращения ошибок
  publish: null,              // отключаем публикацию
  npmRebuild: false,          // не пересобирать нативные модули (если не нужны)
  removePackageScripts: true  // удалить скрипты из package.json в сборке
};
