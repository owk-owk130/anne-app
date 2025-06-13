import express from 'express';

const app = express();
const port = 3000;

app.get('/hello', (_req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
