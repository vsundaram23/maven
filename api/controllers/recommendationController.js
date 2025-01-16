// controllers/recommendationController.js
const pool = require('../config/db.config');

const createRecommendation = async (req, res) => {
    const { 
        business_name, 
        email, 
        phone_number, 
        category, 
        subcategory,
        description,
        notes 
    } = req.body;
    
    try {
        // Validate required fields
        if (!business_name || !email || !phone_number || !category || !subcategory) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Get user email from request or use anonymous
        const userEmail = req.body.user_email || 'anonymous@user.com';
        
        const insertQuery = `
            INSERT INTO service_providers (
                business_name,
                description,
                category_id,
                recommended_by,
                service_id,
                email,
                phone_number,
                notes,
                created_at
            ) 
            VALUES (
                $1,
                $2,
                (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
                (SELECT u.id FROM users u WHERE u.email = $4),
                (SELECT s.service_id FROM services s WHERE s.name = $5),
                $6,
                $7,
                $8,
                CURRENT_TIMESTAMP
            )
            RETURNING *
        `;
        
        const result = await pool.query(insertQuery, [
            business_name,
            description || '',
            category,
            userEmail,
            subcategory,
            email,
            phone_number,
            notes || ''
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating recommendation:', error);
        res.status(500).json({ error: 'Failed to create recommendation' });
    }
};

const getAllRecommendations = async (req, res) => {
    try {
        const query = `
            SELECT 
                sp.*,
                sc.name as category_name,
                s.name as service_name,
                u.email as recommender_email
            FROM service_providers sp
            JOIN service_categories sc ON sp.category_id = sc.category_id
            JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN users u ON sp.recommended_by = u.id
            ORDER BY sp.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
};

const getRecommendationById = async (req, res) => {
    try {
        const query = `
            SELECT 
                sp.*,
                sc.name as category_name,
                s.name as service_name,
                u.email as recommender_email
            FROM service_providers sp
            JOIN service_categories sc ON sp.category_id = sc.category_id
            JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN users u ON sp.recommended_by = u.id
            WHERE sp.id = $1
        `;
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching recommendation:', error);
        res.status(500).json({ error: 'Failed to fetch recommendation' });
    }
};

const updateRecommendation = async (req, res) => {
    const { 
        business_name, 
        email, 
        phone_number, 
        category, 
        subcategory,
        description,
        notes 
    } = req.body;
    
    try {
        const updateQuery = `
            UPDATE service_providers 
            SET business_name = $1,
                description = $2,
                category_id = (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
                service_id = (SELECT s.service_id FROM services s WHERE s.name = $4),
                email = $5,
                phone_number = $6,
                notes = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            business_name,
            description || '',
            category,
            subcategory,
            email,
            phone_number,
            notes || '',
            req.params.id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating recommendation:', error);
        res.status(500).json({ error: 'Failed to update recommendation' });
    }
};

const deleteRecommendation = async (req, res) => {
    try {
        const query = 'DELETE FROM service_providers WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }
        
        res.json({ message: 'Recommendation removed successfully' });
    } catch (error) {
        console.error('Error deleting recommendation:', error);
        res.status(500).json({ error: 'Failed to delete recommendation' });
    }
};

module.exports = {
    createRecommendation,
    getAllRecommendations,
    getRecommendationById,
    updateRecommendation,
    deleteRecommendation
};
