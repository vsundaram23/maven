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
const financialProviderRoutes = require('./routes/financialProviders');
const communityRoutes = require('./routes/communities');


const app = express();

// CORS configuration
// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3001',
            'http://34.214.248.192:8080',  // Your Lightsail IP
            'https://maven-frontend.onrender.com'
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);  // For debugging
            callback(null, true);  // Allow all origins in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
};

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Welcome endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the Trust Platform API');
});

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
app.use('/api/financialProviders', financialProviderRoutes);
app.use('/api/communities', communityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
});



// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// // Import routes
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

// // CORS configuration for both development and production
// const corsOptions = {
//     origin: ['http://localhost:3001', 'https://maven-frontend.onrender.com'],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// };

// // Enable pre-flight requests for all routes
// app.options('*', cors(corsOptions));

// // Apply CORS to all routes
// app.use(cors(corsOptions));

// app.use(express.json());

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//     res.status(200).json({ status: 'OK', message: 'Server is running' });
// });

// // Welcome endpoint
// app.get('/', (req, res) => {
//     res.send('Welcome to the Trust Platform API');
// });

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

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ 
//         error: 'Something went wrong!',
//         message: err.message 
//     });
// });

// // Handle 404 errors
// app.use((req, res) => {
//     res.status(404).json({ error: 'Route not found' });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Health check available at http://localhost:${PORT}/api/health`);
// });



// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// // Import routes
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

// // CORS configuration for both development and production
// app.use(cors({
//     origin: [
//         'http://localhost:3001',
//         'https://maven-frontend.onrender.com'
//     ],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//     res.status(200).json({ status: 'OK', message: 'Server is running' });
// });

// // Welcome endpoint
// app.get('/', (req, res) => {
//     res.send('Welcome to the Trust Platform API');
// });

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

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ 
//         error: 'Something went wrong!',
//         message: err.message 
//     });
// });

// // Handle 404 errors
// app.use((req, res) => {
//     res.status(404).json({ error: 'Route not found' });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Health check available at http://localhost:${PORT}/api/health`);
// });



// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// // Import routes
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

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// app.get('/', (req, res) => {
//     res.send('Welcome to the Trust Platform API');
// });


// // const express = require('express');
// // const cors = require('cors');
// // const authRoutes = require('./routes/auth');
// // const providerRoutes = require('./routes/providers');
// // const connectionsRoutes = require('./routes/connections');
// // const reviewsRouter = require('./routes/reviews');
// // const applianceProviderRoutes = require('./routes/applianceProviders');
// // const cleaningProviderRoutes = require('./routes/cleaningProviders');
// // const utilitiesProviderRoutes = require('./routes/utilitiesProviders');
// // const repairProviderRoutes = require('./routes/repairProviders');
// // const outdoorProviderRoutes = require('./routes/outdoorProviders');
// // const movingProviderRoutes = require('./routes/movingProviders');
// // const recommendationRoutes = require('./routes/recommendations');

// // const app = express();

// // // Enable CORS for frontend requests
// // app.use(cors());
// // app.use(express.json());

// // // Mount the routes
// // app.use('/api/auth', authRoutes);
// // app.use('/api/providers', providerRoutes);
// // app.use('/api/connections', connectionsRoutes);
// // app.use('/api/reviews', reviewsRouter);
// // app.use('/api/applianceProviders', applianceProviderRoutes);
// // app.use('/api/cleaningProviders', cleaningProviderRoutes);
// // app.use('/api/utilitiesProviders', utilitiesProviderRoutes);
// // app.use('/api/repairProviders', repairProviderRoutes);
// // app.use('/api/outdoorProviders', outdoorProviderRoutes);
// // app.use('/api/movingProviders', movingProviderRoutes);
// // app.use('/api/recommendations', recommendationRoutes);

// // const PORT = 3000;
// // app.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`);
// // });

// // app.get('/', (req, res) => {
// //     res.send('Welcome to the Trust Platform API');
// // });


// // // server.js
// // const express = require('express');
// // const cors = require('cors');
// // const authRoutes = require('./api/routes/auth.js');
// // const providersRouter = require('./api/routes/providers');

// // const app = express();

// // // Middleware
// // app.use(cors({
// //   origin: 'http://localhost:3001', // Assuming frontend runs on 3001
// //   credentials: true
// // }));
// // app.use(express.json());

// // // Routes
// // app.use('/api/auth', authRoutes);
// // app.use('/api/providers', providersRouter);

// // // Base route
// // app.get('/', (req, res) => {
// //   res.send('Welcome to the Trust Platform API');
// // });

// // // Error handling middleware
// // app.use((err, req, res, next) => {
// //   console.error(err.stack);
// //   res.status(500).json({ error: 'Something went wrong!' });
// // });

// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => {
// //   console.log(`Server running on port ${PORT}`);
// // });


// // // const express = require('express');
// // // const cors = require('cors');
// // // const authRoutes = require('./routes/auth');
// // // const providersRouter = require('./api/routes/providers');

// // // const app = express();

// // // // Enable CORS for frontend requests
// // // app.use(cors());
// // // app.use(express.json());

// // // // Mount the auth routes
// // // app.use('/api/auth', authRoutes);
// // // app.use('/api/providers', providerRoutes);

// // // const PORT = 3000; 
// // // app.listen(PORT, () => {
// // //     console.log(`Server running on port ${PORT}`);
// // // });

// // // app.get('/', (req, res) => {
// // //     res.send('Welcome to the Trust Platform API');
// // // });