const pool = require('../config/db.config');
const userService = require('../services/userService');

const getRecommendationsByUserId = async (req, res) => {
    const clerkUserId = req.params.id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required"
        });
    }

    try {
        // Convert Clerk ID to internal user ID
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || ""
        });

        const recommendationsResult = await pool.query(`
            SELECT 
                sp.id,
                sp.business_name,
                sp.description,
                sp.city,
                sp.state,
                sp.zip_code,
                sp.service_scope,
                sp.email,
                sp.phone_number,
                sp.tags,
                sp.date_of_recommendation, 
                sp.recommender_message,
                s.name as service_type,
                c.name as category_name 
            FROM service_providers sp
            JOIN services s ON sp.service_id = s.service_id
            JOIN service_categories c ON s.category_id = c.service_id
            WHERE sp.recommended_by = $1
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
        `, [internalUserId]);

        const userResult = await pool.query(`
            SELECT 
                name, 
                phone_number, 
                email 
            FROM users 
            WHERE id = $1
        `, [internalUserId]);

        const userData = userResult.rows[0] || {};

        res.json({
            success: true,
            recommendations: recommendationsResult.rows,
            userName: userData.name || 'User',
            userPhone: userData.phone_number || null,
            userEmail: userData.email || null
        });
    } catch (err) {
        console.error('Error fetching user recommendations:', err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: err.message
        });
    }
};

module.exports = {
    getRecommendationsByUserId
};
