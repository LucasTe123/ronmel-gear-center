const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // Esto le dice a Webpack: "Cuando veas esta librería, usa el archivo principal ya compilado"
    config.resolve.alias = {
        ...config.resolve.alias,
        'react-native-image-viewing': require.resolve('react-native-image-viewing/dist/index.js'),
    };

    return config;
};