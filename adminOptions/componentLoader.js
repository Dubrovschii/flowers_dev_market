import { ComponentLoader } from 'adminjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentLoader = new ComponentLoader();

// Регистрируем только наши кастомные компоненты
const Components = {
    Dashboard: componentLoader.add('Dashboard', path.join(__dirname, '../adminOptions/components/imageAdd.jsx')),

};

export { componentLoader, Components };