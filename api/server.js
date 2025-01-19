const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const connectionsRoutes = require('./routes/connections');
const reviewsRouter = require('./routes/reviews');
const applianceProviderRoutes = require('./routes/applianceProviders');
const cleaningProviderRoutes = require('./routes/cleaningProviders');
const utilitiesProviderRoutes = require('./routes/utilitiesProviders');
const repairProviderRoutes = require('./routes/repairProviders');
const outdoorProviderRoutes = require('./routes/outdoorProviders');
const movingProviderRoutes = require('./routes/movingProviders');
const recommendationRoutes = require('./routes/recommendations');

const app = express();

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Mount the routes
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/reviews', reviewsRouter);
app.use('/api/applianceProviders', applianceProviderRoutes);
app.use('/api/cleaningProviders', cleaningProviderRoutes);
app.use('/api/utilitiesProviders', utilitiesProviderRoutes);
app.use('/api/repairProviders', repairProviderRoutes);
app.use('/api/outdoorProviders', outdoorProviderRoutes);
app.use('/api/movingProviders', movingProviderRoutes);
app.use('/api/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.send('Welcome to the Trust Platform API');
});


// const express = require('express');
// const cors = require('cors');
// const authRoutes = require('./routes/auth');
// const providerRoutes = require('./routes/providers');
// const connectionsRoutes = require('./routes/connections');
// const reviewsRouter = require('./routes/reviews');
// const applianceProviderRoutes = require('./routes/applianceProviders');
// const cleaningProviderRoutes = require('./routes/cleaningProviders');
// const utilitiesProviderRoutes = require('./routes/utilitiesProviders');
// const repairProviderRoutes = require('./routes/repairProviders');
// const outdoorProviderRoutes = require('./routes/outdoorProviders');
// const movingProviderRoutes = require('./routes/movingProviders');
// const recommendationRoutes = require('./routes/recommendations');

// const app = express();

// // Enable CORS for frontend requests
// app.use(cors());
// app.use(express.json());

// // Mount the routes
// app.use('/api/auth', authRoutes);
// app.use('/api/providers', providerRoutes);
// app.use('/api/connections', connectionsRoutes);
// app.use('/api/reviews', reviewsRouter);
// app.use('/api/applianceProviders', applianceProviderRoutes);
// app.use('/api/cleaningProviders', cleaningProviderRoutes);
// app.use('/api/utilitiesProviders', utilitiesProviderRoutes);
// app.use('/api/repairProviders', repairProviderRoutes);
// app.use('/api/outdoorProviders', outdoorProviderRoutes);
// app.use('/api/movingProviders', movingProviderRoutes);
// app.use('/api/recommendations', recommendationRoutes);

// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// app.get('/', (req, res) => {
//     res.send('Welcome to the Trust Platform API');
// });


// // server.js
// const express = require('express');
// const cors = require('cors');
// const authRoutes = require('./api/routes/auth.js');
// const providersRouter = require('./api/routes/providers');

// const app = express();

// // Middleware
// app.use(cors({
//   origin: 'http://localhost:3001', // Assuming frontend runs on 3001
//   credentials: true
// }));
// app.use(express.json());

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/providers', providersRouter);

// // Base route
// app.get('/', (req, res) => {
//   res.send('Welcome to the Trust Platform API');
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Something went wrong!' });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// // const express = require('express');
// // const cors = require('cors');
// // const authRoutes = require('./routes/auth');
// // const providersRouter = require('./api/routes/providers');

// // const app = express();

// // // Enable CORS for frontend requests
// // app.use(cors());
// // app.use(express.json());

// // // Mount the auth routes
// // app.use('/api/auth', authRoutes);
// // app.use('/api/providers', providerRoutes);

// // const PORT = 3000; 
// // app.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`);
// // });

// // app.get('/', (req, res) => {
// //     res.send('Welcome to the Trust Platform API');
// // });