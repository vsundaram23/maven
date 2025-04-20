const pool = require('../config/db.config');

const getAllMovingProviders = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sp.id,
                sp.business_name,
                sp.description,
                sp.email,
                sp.phone_number,
                sp.date_of_recommendation,
                s.name as service_type,
                u.name as recommended_by_name
            FROM service_providers sp
            JOIN services s ON sp.service_id = s.service_id
            JOIN service_categories sc ON s.category_id = sc.service_id
            JOIN users u ON sp.recommended_by = u.id
            WHERE s.name = 'Moving and Misc'
        `);
        
        console.log('Query result:', result.rows);
        
        res.json({
            success: true,
            providers: result.rows
        });
    } catch (err) {
        console.error('Database error details:', err.message);
        console.error('Full error object:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching moving providers',
            error: err.message
        });
    }
};

const getMovingProviderById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                sp.*,
                sp.date_of_recommendation,
                s.name as service_type,
                ROUND(AVG(r.rating), 2) as average_rating,
                COUNT(r.id) as total_reviews
            FROM service_providers sp
            JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN reviews r ON sp.id = r.provider_id
            WHERE sp.id = $1 AND s.name = 'Moving and Misc'
            GROUP BY sp.id, s.name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appliance provider not found'
            });
        }

        res.json({
            success: true,
            provider: result.rows[0]
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching appliance provider'
        });
    }
};

module.exports = {
    getAllMovingProviders,
    getMovingProviderById
};
