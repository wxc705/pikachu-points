/** @type {import('tailwindcss').Config} */
export default {
 content: [
 './index.html',
 './src/**/*.{vue,js,ts,jsx,tsx}'
 ],
 theme: {
 extend: {
 // 主题色：CSS 变量驱动（运行时由 themes/index.js 注入到 :root）
 colors: {
 primary: 'var(--color-primary)',
 'primary-soft': 'var(--color-primary-soft)',
 secondary: 'var(--color-secondary)',
 accent: 'var(--color-accent)',
 surface: 'var(--color-surface)',
 'bg-theme': 'var(--color-bg)',
 // 文字色
 ink: 'var(--color-ink)',
 'ink-soft': 'var(--color-ink-soft)'
 }
 }
 },
 plugins: []
}
