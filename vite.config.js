import path from 'path'
import { createStyleImportPlugin } from 'vite-plugin-style-import'

export default {
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
      {
        find: /^@antmjs\/vantui$/,
        replacement: path.resolve(
          __dirname,
          'node_modules/@antmjs/vantui/es/index.js',
        ),
      },
    ],
  },
  plugins: [
    createStyleImportPlugin({
      libs: [
        {
          libraryName: '@antmjs/vantui',
          esModule: true,
          resolveStyle: (name) => `@antmjs/vantui/es/${name}/style`,
        },
      ],
    }),
  ],
}
