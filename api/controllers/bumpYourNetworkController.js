const pool = require("../config/db.config");

const suggestRecommenders = async (req, res) => {
    const { asker_id, ask_details } = req.body;
    const { query } = ask_details || {};

    if (!asker_id) {
        return res.status(400).json({ error: "asker_id is required" });
    }

    try {
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [asker_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asker not found for the provided clerk_id' });
        }
        const internal_asker_id = userResult.rows[0].id;

        const queryText = `
            WITH first_degree AS (
                -- Only people the asker is following (outbound connections)
                SELECT connected_user_id as user_id FROM user_connections WHERE user_id = $1 AND status = 'accepted'
            ),
            second_degree AS (
                -- People followed by people the asker follows (2nd degree outbound)
                SELECT uc.connected_user_id AS user_id
                FROM user_connections uc
                JOIN first_degree fd ON uc.user_id = fd.user_id
                WHERE uc.connected_user_id != $1 AND uc.connected_user_id NOT IN (SELECT user_id FROM first_degree) AND uc.status = 'accepted'
            ),
            all_connections AS (
                SELECT user_id, 1 AS degree FROM first_degree
                UNION
                SELECT user_id, 2 AS degree FROM second_degree
            ),
            asker_info AS (
                SELECT state, location FROM users WHERE id = $1
            )
            SELECT
                u.id,
                u.name as name,
                u.user_score,
                u.last_sign_in_at,
                u.profile_image,
                u.state,
                u.location,
                ac.degree,
                u.response_rate,
                ai.state as asker_state,
                ai.location as asker_location,
                (SELECT COUNT(*) FROM reviews r JOIN service_providers sp ON r.provider_id = sp.id WHERE r.user_id = u.id AND $2 = ANY(sp.tags)) as relevant_reviews
            FROM users u
            JOIN all_connections ac ON u.id = ac.user_id
            CROSS JOIN asker_info ai
            ORDER BY ac.degree, u.response_rate DESC NULLS LAST;
        `;

        const { rows } = await pool.query(queryText, [internal_asker_id, query || '']);

        const recommenders = rows.map(row => {
            let score = 0;
            let reasons = [];

            if (row.last_sign_in_at) {
                const daysSinceLogin = (new Date() - new Date(row.last_sign_in_at)) / (1000 * 60 * 60 * 24);
                if (daysSinceLogin <= 7) {
                    score += 25;
                    reasons.push({ score: 25, text: 'Was recently active.' });
                } else if (daysSinceLogin <= 30) {
                    score += 10;
                    reasons.push({ score: 10, text: 'Active in the last month.' });
                }
            }

            if (row.relevant_reviews > 0) {
                score += 25;
                reasons.push({ score: 25, text: `Has recommended a service for "${query}" before.` });
            }

            if (row.user_score) {
                const userScorePoints = row.user_score * 0.20;
                score += userScorePoints;
                reasons.push({ score: userScorePoints, text: 'Has a high trust score.' });
            }

            if (row.asker_state && row.state && row.asker_state === row.state) {
                score += 10;
                reasons.push({ score: 10, text: `Lives in the same state: ${row.state}.` });
                if (row.asker_location && row.location && row.asker_location === row.location) {
                    score += 5;
                    reasons.push({ score: 5, text: `Lives in the same area: ${row.location}.` });
                }
            }

            if (row.degree === 1) {
                score += 10;
                reasons.push({ score: 10, text: 'You follow them directly (1st degree).' });
            } else {
                score += 3;
                reasons.push({ score: 3, text: 'Followed by someone you follow (2nd degree).' });
            }
            
            if (row.response_rate && row.response_rate > 0.8) {
                const responseScore = (row.response_rate - 0.8) * 25;
                score += responseScore;
                reasons.push({ score: responseScore, text: 'Typically responds quickly.' });
            }
            
            const bestReason = reasons.sort((a, b) => b.score - a.score)[0]?.text || 'Is a connection in your network.';
            score = Math.min(Math.ceil(score), 100);

            return {
                id: row.id,
                name: row.name,
                score,
                reason: bestReason,
                has_profile_image: !!row.profile_image,
                degree: row.degree,
            };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        res.status(200).json({ recommenders });
    } catch (error) {
        console.error("Error suggesting recommenders:", error);
        res.status(500).json({ error: "Failed to suggest recommenders" });
    }
};

const createAsk = async (req, res) => {
    const { asker_id, selected_recipients, ask_details } = req.body;
    // Mapped query to title and context to description to match schema
    const { query: title, context: description } = ask_details || {};

    if (!asker_id || !selected_recipients || selected_recipients.length === 0) {
        return res.status(400).json({ error: "Asker ID and at least one recipient are required." });
    }

    try {
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [asker_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asker not found for the provided clerk_id' });
        }
        const internal_asker_id = userResult.rows[0].id;

        const insertAskQuery = `
            INSERT INTO asks (asker_id, recipients, title, description, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *;
        `;
        const { rows } = await pool.query(insertAskQuery, [internal_asker_id, selected_recipients, title, description]);
        
        res.status(201).json({ success: true, message: "Ask successfully created.", ask: rows[0] });

    } catch (error) {
        console.error("Error creating ask:", error);
        res.status(500).json({ error: "Failed to create ask" });
    }
};

const processRecommendationSubmission = async (req, res) => {
    const { ask_id, recommender_id, provider_details, review_details } = req.body;

    if (!ask_id || !recommender_id || !provider_details || !review_details) {
        return res.status(400).json({ error: "Missing required fields for recommendation submission." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let providerId;
        if (provider_details.email) {
            const existingProvider = await client.query('SELECT id FROM service_providers WHERE email = $1', [provider_details.email]);
            if (existingProvider.rows.length > 0) {
                providerId = existingProvider.rows[0].id;
            }
        }
        
        if (!providerId) {
            // Corrected column names: phone -> phone_number, address -> street_address
            const { business_name, email, phone, address, city, state, zip_code, tags } = provider_details;
            const newProviderQuery = `
                INSERT INTO service_providers (business_name, email, phone_number, street_address, city, state, zip_code, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;`;
            const newProviderResult = await client.query(newProviderQuery, [business_name, email, phone, address, city, state, zip_code, tags]);
            providerId = newProviderResult.rows[0].id;
        }

        const { rating, content } = review_details; // Removed tags from review_details
        const insertReviewQuery = `
            INSERT INTO reviews (user_id, provider_id, rating, content)
            VALUES ($1, $2, $3, $4) RETURNING id;`;
        const reviewResult = await client.query(insertReviewQuery, [recommender_id, providerId, rating, content]);
        
        const updateAskQuery = `
            UPDATE asks SET status = 'fulfilled', recommendation_id = $1
            WHERE id = $2 AND $3 = ANY(recipients);`;
        await client.query(updateAskQuery, [providerId, ask_id, recommender_id]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "Recommendation submitted successfully." });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error processing recommendation submission:", error);
        res.status(500).json({ error: "Failed to process recommendation submission" });
    } finally {
        client.release();
    }
};

const declineAsk = async (req, res) => {
    const { ask_id, user_id } = req.body;
    
    if (!ask_id || !user_id) {
        return res.status(400).json({ error: "ask_id and user_id are required." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userResult = await client.query('SELECT id FROM users WHERE clerk_id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const internalUserId = userResult.rows[0].id;
        
        const updateDeclineQuery = `
            UPDATE asks
            SET declined_by = array_append(COALESCE(declined_by, ARRAY[]::uuid[]), $2)
            WHERE id = $1 AND $2 = ANY(recipients);
        `;
        const { rowCount } = await client.query(updateDeclineQuery, [ask_id, internalUserId]);

        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Ask not found or user is not a recipient." });
        }
        
        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Ask declined successfully." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error declining ask:", error);
        res.status(500).json({ error: "Failed to decline ask" });
    } finally {
        client.release();
    }
};

const calculateMatchScore = async (req, res) => {
    const { asker_id, recipient_id, ask_details } = req.body;
    const { query } = ask_details || {};

    if (!asker_id || !recipient_id) {
        return res.status(400).json({ error: "asker_id and recipient_id are required" });
    }

    try {
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [asker_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asker not found for the provided clerk_id' });
        }
        const internal_asker_id = userResult.rows[0].id;

        const queryText = `
            WITH first_degree AS (
                -- Only people the asker is following (outbound connections)
                SELECT connected_user_id as user_id FROM user_connections WHERE user_id = $1 AND status = 'accepted'
            ),
            second_degree AS (
                -- People followed by people the asker follows (2nd degree outbound)
                SELECT uc.connected_user_id AS user_id
                FROM user_connections uc
                JOIN first_degree fd ON uc.user_id = fd.user_id
                WHERE uc.connected_user_id != $1 AND uc.connected_user_id NOT IN (SELECT user_id FROM first_degree) AND uc.status = 'accepted'
            ),
            connection_degree AS (
                SELECT
                    CASE
                        WHEN $2 IN (SELECT user_id FROM first_degree) THEN 1
                        WHEN $2 IN (SELECT user_id FROM second_degree) THEN 2
                        ELSE 0
                    END as degree
            ),
            asker_info AS (
                SELECT state, location FROM users WHERE id = $1
            )
            SELECT
                u.user_score,
                u.last_sign_in_at,
                u.response_rate,
                u.state,
                u.location,
                cd.degree,
                ai.state as asker_state,
                ai.location as asker_location,
                (SELECT COUNT(*) FROM reviews r JOIN service_providers sp ON r.provider_id = sp.id WHERE r.user_id = u.id AND $3 = ANY(sp.tags)) as relevant_reviews
            FROM users u, connection_degree cd, asker_info ai
            WHERE u.id = $2;
        `;
        
        const { rows } = await pool.query(queryText, [internal_asker_id, recipient_id, query || '']);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recipient not found.' });
        }

        const row = rows[0];
        let score = 0;

        if (row.last_sign_in_at) {
            const daysSinceLogin = (new Date() - new Date(row.last_sign_in_at)) / (1000 * 60 * 60 * 24);
            if (daysSinceLogin <= 7) {
                score += 25;
            } else if (daysSinceLogin <= 30) {
                score += 10;
            }
        }

        if (row.relevant_reviews > 0) {
            score += 25;
        }

        if (row.user_score) {
            score += row.user_score * 0.20;
        }

        if (row.asker_state && row.state && row.asker_state === row.state) {
            score += 10;
            if (row.asker_location && row.location && row.asker_location === row.location) {
                score += 5;
            }
        }
        
        if (row.degree === 1) {
            score += 10;
        } else if (row.degree === 2) {
            score += 3;
        }
        
        if (row.response_rate && row.response_rate > 0.8) {
            score += (row.response_rate - 0.8) * 25;
        }
        
        score = Math.min(Math.ceil(score), 100);

        res.status(200).json({ score });

    } catch (error) {
        console.error("Error calculating match score:", error);
        res.status(500).json({ error: "Failed to calculate match score" });
    }
};

// New helper to fetch inbound recommendation asks for a given recipient
const getInboundAsks = async (req, res) => {
    const { recipient_id } = req.query;

    if (!recipient_id) {
        return res.status(400).json({ error: "recipient_id is required" });
    }

    try {
        // Translate Clerk ID to internal numeric user id
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [recipient_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Recipient not found for the provided clerk_id" });
        }
        const internalRecipientId = userResult.rows[0].id;

        const inboundQuery = `
            WITH user_responses AS (
                SELECT 
                    ask_id, 
                    json_agg(json_build_object('text', response_text, 'created_at', responded_at, 'user_name', u.name) ORDER BY asks_responses.responded_at ASC) as responses
                FROM asks_responses
                JOIN users u ON asks_responses.responder_id = u.id
                WHERE asks_responses.responder_id = $1
                GROUP BY ask_id
            )
            SELECT 
                a.id, a.title, a.description, a.created_at,
                u.name as asker_name,
                u.location as asker_location,
                u.state as asker_state,
                CASE
                    WHEN ur.responses IS NOT NULL THEN 'responded'
                    ELSE a.status
                END as status,
                ur.responses
            FROM asks a
            JOIN users u ON a.asker_id = u.id
            LEFT JOIN user_responses ur ON a.id = ur.ask_id
            WHERE $1 = ANY(a.recipients) AND (a.declined_by IS NULL OR NOT($1 = ANY(a.declined_by)))
            ORDER BY a.created_at DESC;
        `;

        const { rows } = await pool.query(inboundQuery, [internalRecipientId]);
        
        const processedRows = rows.map(row => ({
            ...row,
            responses: row.responses || []
        }));

        res.status(200).json({ requests: processedRows });
    } catch (error) {
        console.error('Error fetching inbound asks:', error);
        return res.status(500).json({ error: 'Failed to fetch inbound asks' });
    }
};

const getOutboundAsks = async (req, res) => {
    const { asker_id } = req.query;

    if (!asker_id) {
        return res.status(400).json({ error: "asker_id is required" });
    }

    try {
        // translate clerk id to internal id
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [asker_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asker not found for the provided clerk_id' });
        }
        const internalAskerId = userResult.rows[0].id;

        const outboundQuery = `
            WITH ask_responses AS (
                SELECT
                    ar.ask_id,
                    json_agg(
                        json_build_object(
                            'text', ar.response_text,
                            'created_at', ar.responded_at,
                            'user_name', u.name
                        ) ORDER BY ar.responded_at ASC
                    ) as responses
                FROM asks_responses ar
                JOIN users u ON ar.responder_id = u.id
                GROUP BY ar.ask_id
            )
            SELECT 
                a.id,
                a.title,
                a.description,
                CASE
                    WHEN res.responses IS NOT NULL THEN 'responded'
                    ELSE a.status
                END as status,
                a.created_at,
                a.recipients,
                ARRAY(SELECT name FROM users WHERE id = ANY(a.recipients)) AS recipient_names,
                res.responses
            FROM asks a
            LEFT JOIN ask_responses res ON a.id = res.ask_id
            WHERE a.asker_id = $1
            ORDER BY a.created_at DESC;
        `;
        const { rows } = await pool.query(outboundQuery, [internalAskerId]);
        
        const processedRows = rows.map(row => ({
            ...row,
            responses: row.responses || []
        }));

        return res.status(200).json({ requests: processedRows });
    } catch (error) {
        console.error('Error fetching outbound asks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const submitAskResponse = async (req, res) => {
    const { ask_id, user_id, text } = req.body; // user_id is clerk_id

    if (!ask_id || !user_id || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userResult = await pool.query('SELECT id, name FROM users WHERE clerk_id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Responder not found' });
        }
        const internalUserId = userResult.rows[0].id;
        const userName = userResult.rows[0].name;

        const insertQuery = `
            INSERT INTO asks_responses (ask_id, responder_id, response_text, response_type)
            VALUES ($1, $2, $3, 'comment')
            RETURNING id, response_text, responded_at;
        `;
        const { rows } = await pool.query(insertQuery, [ask_id, internalUserId, text]);
        
        const newResponse = rows[0];

        const formattedResponse = {
            text: newResponse.response_text,
            created_at: newResponse.responded_at,
            user_name: userName,
        };

        res.status(201).json(formattedResponse);
    } catch (error) {
        console.error('Error submitting ask response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAskResponses = async (req, res) => {
    const { askId } = req.params;
    try {
        const query = `
            SELECT ar.id, ar.response_text as text, ar.responded_at as created_at, u.name as user_name, u.profile_image
            FROM asks_responses ar
            JOIN users u ON ar.responder_id = u.id
            WHERE ar.ask_id = $1
            ORDER BY ar.responded_at ASC;
        `;
        const { rows } = await pool.query(query, [askId]);
        res.status(200).json({ responses: rows });
    } catch (error) {
        console.error('Error fetching ask responses:', error);
        res.status(500).json({ error: 'Failed to fetch responses.' });
    }
};

const deleteAsk = async (req, res) => {
    const { askId } = req.params;
    const { user_id } = req.body; // clerk_id

    if (!askId || !user_id) {
        return res.status(400).json({ error: 'askId and user_id are required.' });
    }

    try {
        const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
        const userResult = await pool.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asker not found.' });
        }
        const internalAskerId = userResult.rows[0].id;

        const deleteQuery = 'DELETE FROM asks WHERE id = $1 AND asker_id = $2 RETURNING id';
        const deleteResult = await pool.query(deleteQuery, [askId, internalAskerId]);

        if (deleteResult.rowCount === 0) {
            return res.status(403).json({ error: 'Ask not found or user is not authorized to delete.' });
        }

        res.status(200).json({ success: true, message: 'Ask deleted successfully.' });

    } catch (error) {
        console.error('Error deleting ask:', error);
        res.status(500).json({ error: 'Failed to delete ask.' });
    }
};

module.exports = {
    suggestRecommenders,
    createAsk,
    processRecommendationSubmission,
    declineAsk,
    calculateMatchScore,
    getInboundAsks,
    getOutboundAsks,
    submitAskResponse,
    getAskResponses,
    deleteAsk,
};