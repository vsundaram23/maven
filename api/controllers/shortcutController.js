const pool = require('../config/db.config');

// const API_URL = 'https://api.seanag-recommendations.org:8080';
const API_URL = "http://localhost:3000";

const findRecommendation = async (req, res) => {
    const { query, userId, userEmail } = req.body;

    if (!query || !userId || !userEmail) {
        return res.status(400).json({ message: 'Missing query, userId, or userEmail in request.' });
    }

    let formattedResponse = '';

    try {
        const searchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`;
        
        const searchRes = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!searchRes.ok) {
            const errorData = await searchRes.json().catch(() => ({ message: `Internal search error: ${searchRes.status}` }));
            formattedResponse = `An error occurred while searching for "${query}". Please try again later.`;
        } else {
            const searchData = await searchRes.json();

            if (searchData.success && searchData.providers && searchData.providers.length > 0) {
                const providers = searchData.providers.slice(0, 3);
                let providerList = providers.map(p => {
                    const rating = parseFloat(p.average_rating || 0).toFixed(1);
                    return `'${p.business_name}' (${rating} stars)`;
                }).join(', ');

                formattedResponse = `Found trusted recommendations for "${query}": ${providerList}. Open the app for more details and contact info!`;
                
            } else {
                formattedResponse = `No recommendations found for "${query}" in your network right now. Try a different search term or use the app to 'Bump Your Network' for broader results!`;
            }
        }
    } catch (error) {
        formattedResponse = `Sorry, something went wrong on our end while searching for "${query}". Please try again.`;
    }

    res.json({ message: formattedResponse });
};

const shareRecommendation = async (req, res) => {
    const { businessName, experience, photoBase64, userId, userEmail } = req.body;

    if (!businessName || !experience || !userId || !userEmail) {
        return res.status(400).json({ message: 'Missing business name, experience, userId, or userEmail.' });
    }

    let formattedResponse = '';

    try {
        // Placeholder for actual recommendation submission logic
        // In a real scenario, you would:
        // 1. Decode photoBase64
        // 2. Upload photo to cloud storage (e.g., S3)
        // 3. Get user_id from userId (Clerk ID)
        // 4. Insert/update recommendation in your database
        // 5. Link photo URL to the recommendation

        formattedResponse = `Thanks for sharing "${businessName}"! Your recommendation has been submitted. We'll process it shortly!`;

    } catch (error) {
        formattedResponse = `Sorry, something went wrong while sharing your recommendation. Please try again.`;
    }

    res.json({ message: formattedResponse });
};

const getUserInfoByPhoneNumber = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    try {
        const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

        const userResult = await pool.query(
            'SELECT clerk_id, email FROM users WHERE phone_number = $1',
            [cleanedPhoneNumber]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found with this phone number.' });
        }

        const user = userResult.rows[0];
        res.json({ success: true, userId: user.clerk_id, userEmail: user.email });

    } catch (error) {
        console.error('Error fetching user info by phone number:', error);
        res.status(500).json({ message: 'Server error fetching user information.' });
    }
};

module.exports = {
  findRecommendation,
  shareRecommendation,
  getUserInfoByPhoneNumber
};