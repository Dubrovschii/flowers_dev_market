import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/sequelize';
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { Sequelize } from 'sequelize';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// import fs from 'fs';
import { AdminJSOptions } from './adminOptions/index.js';
import { componentLoader } from './adminOptions/componentLoader.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORTAdmin || 8080;
// Настройки CORS

app.use(cors({
    origin: ['https://flowers-dev-market.onrender.com', 'http://localhost:3000', 'http://app.vetro.md'],
    credentials: true,
}));
// app.use(cors());

// Парсинг JSON
app.use(express.json());

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 86400000, // по умолчанию 24 часа
    },
}));

// Подключение к базе данных через Sequelize
const sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marketpro',
    dialect: 'mysql',
    logging: (sql, timing) => {
        console.log(`[SQL] ${sql}`);
        if (timing) console.log(`[Execution time: ${timing}ms]`);
    },
    benchmark: true,
    dialectOptions: {
        connectTimeout: 60000,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

// Подключение адаптера AdminJS для Sequelize
AdminJS.registerAdapter({ Database, Resource });

// Настройка AdminJS
const adminJs = new AdminJS({
    componentLoader,
    ...AdminJSOptions,
    rootPath: '/admin',
    assets: {
        styles: ['/custom.css'],
    },
});

// Учетные данные администратора
// const DEFAULT_ADMIN = {
//     email: 'admin@example.com',
//     password: 'password',
// };

// // Аутентификация администратора
// const authenticate = async (email, password) => {
//     if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
//         return Promise.resolve(DEFAULT_ADMIN);
//     }
//     return null;
// };
const authenticate = async (email, password) => {
    // Получаем значения из переменных окружения
    const DEFAULT_ADMIN = {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    };

    // Проверяем email и пароль
    if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        return Promise.resolve(DEFAULT_ADMIN);
    }

    return null;
};
// Запуск сервера
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established');

        const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
            adminJs,
            { authenticate, cookiePassword: process.env.COOKIE_SECRET || 'super-secret-cookie' },
            null,
            {
                resave: false,
                saveUninitialized: false,
                secret: process.env.SESSION_SECRET || 'super-secret',
                cookie: {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    // domain: process.env.NODE_ENV === 'production' ? '.vetro.md' : undefined
                },
                name: 'adminjs',
            }
        );

        app.use(adminJs.options.rootPath, adminRouter);


        app.use('/', express.static('build'));
        app.use('/shop', express.static('build'));
        // API endpoints
        app.get('/api/', async (req, res) => {
            try {
                const [results] = await sequelize.query('SELECT * FROM backend_slider');
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.get('/api/category', async (req, res) => {
            try {
                const [results] = await sequelize.query('SELECT * FROM backend_category');
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        app.get('/api/subcategory', async (req, res) => {
            try {
                const [results] = await sequelize.query('SELECT * FROM backend_subcategory');
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        app.get('/api/product', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const perPage = parseInt(req.query.perPage) || 10;
                const offset = (page - 1) * perPage;

                const [[{ total }]] = await sequelize.query('SELECT COUNT(*) AS total FROM backend_product');
                const [results] = await sequelize.query(`SELECT * FROM backend_product LIMIT ${perPage} OFFSET ${offset}`);

                res.status(200).json({
                    data: results,
                    total,
                    page,
                    perPage,
                    totalProducts: total,
                    totalPages: Math.ceil(total / perPage),
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // app.get('/api/product', async (req, res) => {
        //     try {
        //         const [results] = await sequelize.query('SELECT * FROM backend_product');
        //         res.status(200).json(results);
        //     } catch (err) {
        //         res.status(500).json({ error: err.message });
        //     }
        // });
        app.get('/api/locations', async (req, res) => {
            try {
                const [results] = await sequelize.query('SELECT * FROM backend_locations');
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.use('/uploads/promoslider', express.static(path.join(__dirname, 'public', 'uploads/promoslider')));
        app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
        app.use('/admin/components.bundle.js', express.static(path.join(__dirname, 'public', 'js', 'components.bundle.js')));

        adminJs.watch()

        app.listen(PORT, () => {
            console.log(PORT);
            // console.log('Server is running on http://localhost:3000');
            // console.log('AdminJS is running at http://localhost:3001/admin');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
