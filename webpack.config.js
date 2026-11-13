const path = require('path');
const { execSync } = require('child_process');
const webpack = require('webpack');

// Shown in the UI and logged at startup, so a bug report tells which build
// the user ran (an old copy pasted from cache is a common cause of reports).
const buildVersion = (() => {
    let sha = (process.env.GITHUB_SHA || '').slice(0, 7);
    try {
        sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        // Not a git checkout: fall back to the CI variable, or "dev".
    }
    return `${sha || 'dev'} · ${new Date().toISOString().slice(0, 10)}`;
})();

module.exports = {
    entry: './src/main.tsx',
    module: {
        rules: [
            {
                test: /\.ts|\.tsx$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            __BUILD_VERSION__: JSON.stringify(buildVersion),
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
        },
    },
    output: {
        filename: 'dist.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
        },
    },
};
