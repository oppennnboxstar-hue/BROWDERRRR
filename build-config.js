module.exports = {
  appId: 'com.comet.browser',
  productName: 'Comet Browser',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'package.json'
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
  }
};
