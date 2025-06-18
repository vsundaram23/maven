const userService = require("../services/userService");
const pool = require("../config/db.config");

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

        const result = await pool.query(`
            SELECT COUNT(*)
            FROM public.notifications
            WHERE user_id = $1 AND is_read = false
        `, [internalUserId]);

        const count = parseInt(result.rows[0].count, 10) || 0;
        res.json({ success: true, unreadCount: count });
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