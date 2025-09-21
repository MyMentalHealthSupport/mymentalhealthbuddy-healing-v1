import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('MyMentalHealthBuddy Healing V1 is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});