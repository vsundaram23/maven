const express = require("express");
const router = express.Router();

const {
    getUnreadNotificationCount,
    getNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead
} = require("../controllers/notificationController");

// GET routes
router.get('/unread-count', getUnreadNotificationCount);
router.get('/', getNotifications);

// POST routes
router.post('/mark-all-read', markAllNotificationsAsRead);
router.post('/:id/mark-read', markNotificationAsRead);

module.exports = router;