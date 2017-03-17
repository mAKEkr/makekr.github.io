const Webpack = require('webpack');
const Path = require('path');

module.exports = {
    entry: './sources/index.js',

    output: {
        filename: './module.js',
    },
    module: {
        rules: [
            {
                test: /\.html$/,
                use: 'vue-template-loader'
            }
        ]
    },
    watch: true
}