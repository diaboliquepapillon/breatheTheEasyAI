require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate Limiting (Max 100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

app.use('/api/mapbox', limiter);
app.use(cors()); // Enable CORS for frontend communication

// Mapbox Proxy API Route
app.get('/api/mapbox', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    // Securely fetch data from Mapbox API
    const response = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`, {
      params: {
        access_token: process.env.MAPBOX_TOKEN
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from Mapbox:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

