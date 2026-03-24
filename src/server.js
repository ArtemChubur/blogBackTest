const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const errorHandler = require('./middleware/errorHandler');
const { swaggerUi, specs } = require('./config/swagger');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/user', userRoutes);
app.use('/post', postRoutes);

app.use(errorHandler);

const checkTables = async () => {
  try {
    const tables = ['users', 'posts', 'reactions', 'hashtags', 'post_hashtags', 'refresh_tokens'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);
      if (result.rows[0].exists) {
        console.log(`вњ“ Table '${table}' exists`);
      } else {
        console.log(`вњ— Table '${table}' does not exist`);
      }
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  }
};

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api-docs`);
  await checkTables();
});
