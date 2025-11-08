import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ВАЖНО: Замените '<НАЗВАНИЕ_ВАШЕГО_РЕПОЗИТОРИЯ>' на реальное имя вашего репозитория на GitHub
  // Например, если ваш репозиторий https://github.com/user/my-app, то base будет '/my-app/'
  base: '/<НАЗВАНИЕ_ВАШЕГО_РЕПОЗИТОРИЯ>/', 
});
