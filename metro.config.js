const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (
      moduleName === './components/ImageItem/ImageItem' &&
      context.originModulePath.includes('react-native-image-viewing')
    ) {
      return context.resolveRequest(
        context,
        './components/ImageItem/ImageItem.ios',
        platform
      );
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
