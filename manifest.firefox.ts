const baseManifest = {
  manifest_version: 3,
  name: '__MSG_appName__',
  description: '__MSG_appDescription__',
  default_locale: 'en',
  version: '1.0.0',
  action: {
    default_title: '__MSG_appName__',
    default_popup: 'index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png'
    }
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png'
  }
} as const;

const manifest = {
  ...baseManifest,
  background: {
    scripts: ['src/background-firefox.ts'],
    type: 'module'
  },
  permissions: ['storage'],
  browser_specific_settings: {
    gecko: {
      id: 'pomodoro-cult@d-g-volkovbz',
      strict_min_version: '115.0',
      data_collection_permissions: {
        required: ['none']
      }
    }
  }
};

export default manifest;
