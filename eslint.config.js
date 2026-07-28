import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'android', 'ios', 'node_modules'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-refresh/only-export-components': 'off',
      // Uygulama saniyelik tick ile yeniden render olur; render içinde Date.now()
      // kullanımı bilinçli bir tasarım (geri sayım). Nefes egzersizi sayacı da
      // dokümante edilmiş, kasıtlı bir setState-in-effect desenidir.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Node'da çalışanlar: testler, yapılandırma ve tema regresyon düzeneği
    // (tools/theme-check — uygulamanın parçası değil, dist'e girmez).
    files: ['**/*.test.mjs', '*.config.js', 'vite.config.js', 'tools/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
]
