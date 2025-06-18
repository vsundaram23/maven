const userService = require("../services/userService");
const pool = require("../config/db.config");

// Simple in-memory cache for notification counts (in production, use Redis)
const notificationCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds
const userRateLimits = new Map();

// Rate limiting helper
const isRateLimited = (userId) => {
    const now = Date.now();
    const userLimit = userRateLimits.get(userId);
    
    if (!userLimit) {
        userRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }
    
    if (now > userLimit.resetTime) {
        userRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }
    
    if (userLimit.count >= 3) { // Max 3 requests per 10 seconds
        return true;
    }
    
    userLimit.count++;
    return false;
};

// Cache helper functions
const getCacheKey = (userId, type) => `${userId}_${type}`;

const getCachedData = (cacheKey) => {
    const cached = notificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
};

const setCachedData = (cacheKey, data) => {
    notificationCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (notificationCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of notificationCache.entries()) {
            if (now - value.timestamp > CACHE_DURATION * 2) {
                notificationCache.delete(key);
            }
        }
    }
};

// Helper function to get internal user ID by email (same pattern as providerController)
const getInternalUserIdByEmail = async (userEmail, clerkUserIdFallback, additionalParams = {}) => {
    if (!userEmail && !clerkUserIdFallback) return null;

    let internalId = null;
    if (userEmail) {
        try {
            const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [userEmail]);
            if (userRes.rows.length > 0) {
                internalId = userRes.rows[0].id;
            }
        } catch (error) {
            console.error("Error fetching internal user ID by email:", error);
            throw error; 
        }
    }

    if (!internalId && clerkUserIdFallback) {
        try {
            const createParams = { 
                id: clerkUserIdFallback, 
                ...(userEmail && { emailAddresses: [{ emailAddress: userEmail }] }),
                ...additionalParams
            };
            internalId = await userService.getOrCreateUser(createParams);
        } catch (error) {
            console.error("Error in getOrCreateUser during fallback:", error);
            throw error;
        }
    }
    return internalId;
};

// Get unread notification count for a user
const getUnreadNotificationCount = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });

        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        // Check rate limiting
        if (isRateLimited(internalUserId)) {
            return res.status(429).json({ 
                success: false, 
                message: "Too many requests. Please wait before checking notifications again.",
                retryAfter: 10
            });
        }

        // Check cache first
        const cacheKey = getCacheKey(internalUserId, 'unread_count');
        const cachedCount = getCachedData(cacheKey);
        
        if (cachedCount !== null) {
            return res.json({ 
                success: true, 
                unreadCount: cachedCount,
                cached: true 
            });
        }

        const result = await pool.query(`
            SELECT COUNT(*)::integer as count
            FROM public.notifications
            WHERE user_id = $1 AND is_read = false
        `, [internalUserId]);

        const count = parseInt(result.rows[0].count, 10) || 0;
        
        // Cache the result
        setCachedData(cacheKey, count);
        
        res.json({ success: true, unreadCount: count, cached: false });
    } catch (error) {
        console.error("Error getting unread notification count:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching unread notification count", 
            error: error.message 
        });
    }
};

// Get list of notifications for a user
const getNotifications = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const limit = parseInt(req.query.limit, 10) || 20;
    const unreadOnly = req.query.unread_only === 'true';

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });

        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        let query = `
            SELECT
                id,
                type,
                content,
                link_url,
                is_read,
                created_at
            FROM public.notifications
            WHERE user_id = $1
        `;

        const queryParams = [internalUserId];

        if (unreadOnly) {
            query += ` AND is_read = false`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1}`;
        queryParams.push(limit);

        const result = await pool.query(query, queryParams);
        res.json({ success: true, notifications: result.rows });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching notifications", 
            error: error.message 
        });
    }
};

// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (req, res) => {
    const { userId: clerkUserId, userEmail } = req.body;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId);

        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        const result = await pool.query(`
            UPDATE public.notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
            RETURNING id
        `, [internalUserId]);

        const updatedCount = result.rows.length;
        
        // Invalidate cache when notifications are marked as read
        const cacheKey = getCacheKey(internalUserId, 'unread_count');
        notificationCache.delete(cacheKey);
        
        res.json({ 
            success: true, 
            message: `Marked ${updatedCount} notifications as read`,
            updatedCount 
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error marking notifications as read", 
            error: error.message 
        });
    }
};

// Mark single notification as read
const markNotificationAsRead = async (req, res) => {
    const { id: notificationId } = req.params;
    const { userId: clerkUserId, userEmail } = req.body;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    if (!notificationId) {
        return res.status(400).json({ success: false, message: "Notification ID is required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId);

        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        const result = await pool.query(`
            UPDATE public.notifications
            SET is_read = true
            WHERE id = $1 AND user_id = $2 AND is_read = false
            RETURNING id
        `, [notificationId, internalUserId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Notification not found, already read, or does not belong to user" 
            });
        }

        // Invalidate cache when notification is marked as read
        const cacheKey = getCacheKey(internalUserId, 'unread_count');
        notificationCache.delete(cacheKey);

        res.json({ 
            success: true, 
            message: "Notification marked as read",
            notificationId: result.rows[0].id
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error marking notification as read", 
            error: error.message 
        });
    }
};

module.exports = {
    getUnreadNotificationCount,
    getNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead
};