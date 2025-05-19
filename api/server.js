const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const providerRoutes = require("./routes/providers");
const connectionsRoutes = require("./routes/connections");
const reviewsRouter = require("./routes/reviews");
const applianceProviderRoutes = require("./routes/applianceProviders");
const cleaningProviderRoutes = require("./routes/cleaningProviders");
const utilitiesProviderRoutes = require("./routes/utilitiesProviders");
const repairProviderRoutes = require("./routes/repairProviders");
const outdoorProviderRoutes = require("./routes/outdoorProviders");
const movingProviderRoutes = require("./routes/movingProviders");
const recommendationRoutes = require("./routes/recommendations");
const financialProviderRoutes = require("./routes/financialProviders");
const communityRoutes = require("./routes/communities");
const userRoutes = require("./routes/users");
const autoProviderRoutes = require("./routes/autoProviders");
const quoteRoutes = require("./routes/quotes");

const app = express();

// Update the corsOptions configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            "http://localhost:3001",
            "http://34.214.248.192:8080",
            "https://maven-frontend.onrender.com",
            "https://triedandtrusted.ai", // Add your production domain
            "https://www.triedandtrusted.ai", // Add www subdomain as well
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("Blocked origin:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Origin",
        "X-Requested-With",
        "Accept",
    ],
};

// Apply CORS middleware before routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Add headers middleware for additional CORS support
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (corsOptions.origin(origin, () => true)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is running" });
});

// Welcome route
app.get("/", (req, res) => {
    res.send("Welcome to the Trust Platform API");
});

// Mount all routes
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/reviews", reviewsRouter);
app.use("/api/applianceProviders", applianceProviderRoutes);
app.use("/api/cleaningProviders", cleaningProviderRoutes);
app.use("/api/utilitiesProviders", utilitiesProviderRoutes);
app.use("/api/repairProviders", repairProviderRoutes);
app.use("/api/outdoorProviders", outdoorProviderRoutes);
app.use("/api/movingProviders", movingProviderRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/financialProviders", financialProviderRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/users", userRoutes);
app.use("/api/autoProviders", autoProviderRoutes);
app.use("/api/quotes", quoteRoutes);

// 500 handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message: err.message,
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Run in HTTP (NOT HTTPS)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running over HTTP on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
