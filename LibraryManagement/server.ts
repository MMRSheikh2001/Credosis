import express, { Request, Response } from 'express';
import cors from 'cors';
import { sequelize } from './config/database';
import  './models';
import userRoutes from './routes/user.routes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.send('Library Management API is running');
});

app.use('/api/users', userRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found.' });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Connected to SQLite successfully.');

    await sequelize.sync({ alter: true });
    console.log('Database tables synced.');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

start();