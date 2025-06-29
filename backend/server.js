import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Appointment route
app.post('/api/appointments', (req, res) => {
  const { name, phone, date, service } = req.body;
  console.log('📆 Appointment booked:', { name, phone, date, service });

  // TODO: Save to DB here (MongoDB, Supabase, etc.)
  res.status(200).json({ message: 'Appointment received' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
