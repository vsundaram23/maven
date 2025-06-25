const pool = require("../config/db.config");
const userService = require("../services/userService");
const multer = require("multer");

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Not an image! Please upload an image."), false);
    }
};
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 },
});
const uploadProfileImageMiddleware = upload.single("profileImageFile");

async function getInternalUserIdFromClerk(clerkData) {
    return await userService.getOrCreateUser({
        id: clerkData.id,
        emailAddresses: clerkData.emailAddresses || [],
        firstName: clerkData.firstName || "",
        lastName: clerkData.lastName || "",
        phoneNumbers: clerkData.phoneNumbers || [],
    });
}

const getCurrentUserRecommendations = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const firstName = req.query.firstName || "";
    const lastName = req.query.lastName || "";
    const phoneNumber = req.query.phoneNumber;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required in query parameters.",
        });
    }

    try {
        const internalUserId = await getInternalUserIdFromClerk({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName,
            lastName,
            phoneNumbers: phoneNumber ? [{ phoneNumber: phoneNumber }] : [],
        });

        const recommendationsResult = await pool.query(
            `
            SELECT
                sp.id, sp.business_name, sp.description, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.email, sp.phone_number, sp.tags, sp.date_of_recommendation, sp.website, sp.business_contact, 
                sp.recommender_message, sp.images, sp.initial_rating, sp.visibility,
                s.name as service_type, c.name as category_name,
                EXISTS (
                    SELECT 1
                    FROM public.recommendation_likes rl
                    WHERE rl.recommendation_id = sp.id AND rl.user_id = $1
                ) AS "currentUserLiked",
                COALESCE(
                    (
                        SELECT array_agg(cs.community_id)
                        FROM public.community_shares cs
                        WHERE cs.service_provider_id = sp.id
                    ),
                    '{}'::uuid[]
                ) AS trust_circle_ids
            FROM service_providers sp
            LEFT JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN service_categories c ON s.category_id = c.service_id
            WHERE sp.recommended_by = $1
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
            `,
            [internalUserId]
        );

        const userResult = await pool.query(
            `SELECT id, name, username, phone_number, email, bio FROM users WHERE id = $1`,
            [internalUserId]
        );
        const userData = userResult.rows[0] || {};

        res.json({
            success: true,
            recommendations: recommendationsResult.rows,
            userId: userData.id,
            userName: userData.name || "User",
            userUsername: userData.username || null,
            userPhone: userData.phone_number || null,
            userEmail: userData.email || null,
            userBio: userData.bio || null,
        });
    } catch (err) {
        console.error(
            "Error fetching current user recommendations:",
            err.message,
            err.stack
        );
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const updateCurrentUserProfile = async (req, res) => {
    const clerkUserId = req.query.user_id || req.body.user_id;
    const userEmail = req.query.email || req.body.email;
    const queryFirstName = req.query.firstName || req.body.firstName || "";
    const queryLastName = req.query.lastName || req.body.lastName || "";
    const queryPhoneNumber = req.query.phoneNumber || req.body.phoneNumber;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required to update profile.",
        });
    }

    try {
        const internalUserId = await getInternalUserIdFromClerk({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: queryFirstName,
            lastName: queryLastName,
            phoneNumbers: queryPhoneNumber
                ? [{ phoneNumber: queryPhoneNumber }]
                : [],
        });

        req.params.id = internalUserId;

        return await updateUserProfileById(req, res);
    } catch (err) {
        console.error(
            "Error preparing to update current user profile:",
            err.message,
            err.stack
        );
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: "Internal server error during current user profile update",
                message: err.message,
            });
        }
    }
};

const getPublicUserProfile = async (req, res) => {
    // 1. Get the generic identifier from the route parameter
    const { username } = req.params; 
    const loggedInClerkId = req.query.loggedInUserId || (req.auth ? req.auth.userId : null);

    if (!username) {
        return res.status(400).json({
            success: false,
            message: "User identifier is required.",
        });
    }

    try {
        let loggedInUserUuid = null;
        if (loggedInClerkId) {
            const viewerResult = await pool.query(`SELECT id FROM users WHERE clerk_id = $1`, [loggedInClerkId]);
            if (viewerResult.rows.length > 0) {
                loggedInUserUuid = viewerResult.rows[0].id;
            }
        }
        
        let userQuery;
        let queryParams = [username];
        
        userQuery = `SELECT id, name, email, phone_number, bio, clerk_id FROM users WHERE username = $1`;
        
        const userResult = await pool.query(userQuery, queryParams);

        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        
        const userData = userResult.rows[0];
        const profileOwnerUserId = userData.id;

        const recommendationsQuery = `
            SELECT
                sp.id, sp.business_name, sp.description, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.email, sp.phone_number, sp.tags, sp.date_of_recommendation, sp.num_likes, sp.website, sp.business_contact, 
                sp.recommender_message, sp.images,
                s.name as service_type, c.name as category_name,
                u.phone_number AS recommender_phone,
                u.email AS recommender_email,
                u.name AS recommender_name,
                sp.recommended_by AS recommender_user_id,
                CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS "currentUserLiked"
            FROM service_providers sp
            LEFT JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN service_categories c ON s.category_id = c.service_id
            LEFT JOIN users u ON sp.recommended_by = u.id
            LEFT JOIN recommendation_likes l ON l.recommendation_id = sp.id AND l.user_id = $2
            WHERE sp.recommended_by = $1 AND (
                $1 = $2 OR -- The user is viewing their own profile
                sp.visibility = 'public' OR
                (sp.visibility = 'connections' AND EXISTS (
                    SELECT 1 FROM user_connections
                    WHERE status = 'accepted' AND 
                    ((user_id = $1 AND connected_user_id = $2) OR (user_id = $2 AND connected_user_id = $1))
                )) OR
                (sp.visibility = 'communities' AND EXISTS (
                    SELECT 1 FROM community_shares cs
                    JOIN community_memberships cm ON cs.community_id = cm.community_id
                    WHERE cs.service_provider_id = sp.id AND cm.user_id = $2 AND cm.status = 'approved'
                ))
            )
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
        `;
        const recommendationsResult = await pool.query(recommendationsQuery, [
            profileOwnerUserId,
            loggedInUserUuid,
        ]);
        const profileImagePath = `/api/users/${userData.id}/profile/image`;

        res.json({
            success: true,
            userId: userData.id,
            userName: userData.name,
            userBio: userData.bio,
            userEmail: userData.email,
            userPhone: userData.phone_number,
            clerkId: userData.clerk_id,
            profileImage: profileImagePath,
            recommendations: recommendationsResult.rows,
        });
    } catch (err) {
        console.error(
            "Error fetching public user profile:",
            err.message,
            err.stack
        );
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const serveCurrentUserProfileImage = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const firstName = req.query.firstName || "";
    const lastName = req.query.lastName || "";
    const phoneNumber = req.query.phoneNumber;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required in query parameters to serve profile image.",
        });
    }

    try {
        const internalUserId = await getInternalUserIdFromClerk({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName,
            lastName,
            phoneNumbers: phoneNumber ? [{ phoneNumber: phoneNumber }] : [],
        });

        req.params.id = internalUserId;
        return await serveUserProfileImageById(req, res);
    } catch (err) {
        console.error(
            "Error preparing to serve current user profile image:",
            err.message,
            err.stack
        );
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: "Internal server error",
                message: err.message,
            });
        }
    }
};

const getCurrentUserProfileData = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const firstName = req.query.firstName || "";
    const lastName = req.query.lastName || "";
    const phoneNumber = req.query.phoneNumber;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required in query parameters to fetch profile data.",
        });
    }

    try {
        const internalUserId = await getInternalUserIdFromClerk({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName,
            lastName,
            phoneNumbers: phoneNumber ? [{ phoneNumber: phoneNumber }] : [],
        });

        const userResult = await pool.query(
            `SELECT id, name, phone_number, email, bio FROM users WHERE id = $1`,
            [internalUserId]
        );

        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User profile not found." });
        }
        const userData = userResult.rows[0];

        res.json({
            success: true,
            user: {
                id: userData.id,
                name: userData.name || "User",
                phone: userData.phone_number || null,
                email: userData.email || null,
                bio: userData.bio || null,
            },
        });
    } catch (err) {
        console.error(
            "Error fetching current user profile data:",
            err.message,
            err.stack
        );
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const getRecommendationsByUserId = async (req, res) => {
    const { id } = req.params;
    try {
        const recommendationsResult = await pool.query(
            `
            SELECT sp.id, sp.business_name, sp.description, sp.city, sp.state, sp.zip_code, sp.service_scope,
                   sp.email, sp.phone_number, sp.tags, sp.date_of_recommendation, sp.recommender_message,
                   s.name as service_type, c.name as category_name
            FROM service_providers sp
            LEFT JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN service_categories c ON s.category_id = c.service_id
            WHERE sp.recommended_by = $1 ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
        `,
            [id]
        );

        const userResult = await pool.query(
            `SELECT id, name, phone_number, email, bio FROM users WHERE id = $1`,
            [id]
        );
        const userData = userResult.rows[0] || {};

        res.json({
            success: true,
            recommendations: recommendationsResult.rows,
            userId: userData.id,
            userName: userData.name || "User",
            userPhone: userData.phone_number || null,
            userEmail: userData.email || null,
            userBio: userData.bio || null,
        });
    } catch (err) {
        console.error(
            "Error fetching user recommendations and profile:",
            err.message,
            err.stack
        );
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const updateUserProfileById = async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;
    const bodyFirstName = req.body.firstName;
    const bodyLastName = req.body.lastName;

    let newProfileImageBuffer = null;
    let newProfileImageMimetype = null;

    if (req.file) {
        newProfileImageBuffer = req.file.buffer;
        newProfileImageMimetype = req.file.mimetype;
    }

    if (
        bio === undefined &&
        !req.file &&
        bodyFirstName === undefined &&
        bodyLastName === undefined
    ) {
        return res
            .status(400)
            .json({ success: false, message: "No data provided for update." });
    }

    let queryFieldsToUpdate = [];
    let queryValues = [];
    let queryParamIndex = 1;

    if (bio !== undefined) {
        queryFieldsToUpdate.push(`bio = $${queryParamIndex++}`);
        queryValues.push(bio);
    }

    let nameToUpdate;
    if (bodyFirstName !== undefined || bodyLastName !== undefined) {
        const currentNameResult = await pool.query(
            "SELECT name FROM users WHERE id = $1",
            [id]
        );
        const currentName =
            currentNameResult.rows.length > 0
                ? currentNameResult.rows[0].name
                : "";
        const nameParts = currentName ? currentName.split(" ") : ["", ""];

        const finalFirstName =
            bodyFirstName !== undefined ? bodyFirstName : nameParts[0];
        const finalLastName =
            bodyLastName !== undefined
                ? bodyLastName
                : nameParts.length > 1
                ? nameParts.slice(1).join(" ")
                : "";

        nameToUpdate = `${finalFirstName} ${finalLastName}`.trim();

        if (nameToUpdate && nameToUpdate !== currentName) {
            queryFieldsToUpdate.push(`name = $${queryParamIndex++}`);
            queryValues.push(nameToUpdate);
        } else if (!nameToUpdate && currentName) {
            queryFieldsToUpdate.push(`name = $${queryParamIndex++}`);
            queryValues.push(null);
        }
    }

    if (newProfileImageBuffer && newProfileImageMimetype) {
        queryFieldsToUpdate.push(`profile_image = $${queryParamIndex++}`);
        queryValues.push(newProfileImageBuffer);
        queryFieldsToUpdate.push(
            `profile_image_mimetype = $${queryParamIndex++}`
        );
        queryValues.push(newProfileImageMimetype);
    }

    if (queryFieldsToUpdate.length === 0) {
        const userResult = await pool.query(
            "SELECT id, name, email, bio FROM users WHERE id = $1",
            [id]
        );
        const currentUserData = userResult.rows[0] || {};
        return res.json({
            success: true,
            message:
                "No valid fields to update or no changes detected, profile remains unchanged.",
            user: {
                id: currentUserData.id,
                name: currentUserData.name,
                email: currentUserData.email,
                bio: currentUserData.bio,
            },
        });
    }

    queryValues.push(id);

    const updateUserQuery = `
        UPDATE users
        SET ${queryFieldsToUpdate.join(", ")}
        WHERE id = $${queryParamIndex}
        RETURNING id, name, email, bio;
    `;

    try {
        const result = await pool.query(updateUserQuery, queryValues);
        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const updatedUser = result.rows[0];
        res.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                bio: updatedUser.bio,
            },
        });
    } catch (err) {
        console.error("Error updating user profile:", err.message, err.stack);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const serveUserProfileImageById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT profile_image, profile_image_mimetype FROM users WHERE id = $1",
            [id]
        );

        if (
            result.rows.length === 0 ||
            !result.rows[0].profile_image ||
            !result.rows[0].profile_image_mimetype
        ) {
            return res.status(404).send("Image not found.");
        }

        const imageBuffer = result.rows[0].profile_image;
        const mimetype = result.rows[0].profile_image_mimetype;

        res.setHeader("Content-Type", mimetype);
        res.setHeader("Content-Length", imageBuffer.length);
        res.send(imageBuffer);
    } catch (err) {
        console.error("Error serving profile image:", err.message, err.stack);
        res.status(500).send("Error serving image.");
    }
};

const getOnboardingStatus = async (req, res) => {
    const { email } = req.query;

    try {
        const result = await pool.query(
            "SELECT has_completed_onboarding FROM users WHERE email = $1",
            [email]
        );

        res.json({
            hasCompletedOnboarding:
                result.rows[0]?.has_completed_onboarding || false,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to check onboarding status",
        });
    }
};

const saveOnboardingData = async (req, res) => {
    const { userId, email, preferredName, phoneNumber, location, state, interests, username } =
        req.body;

    if (!email || !userId) {
        return res.status(400).json({
            error: "Email and userId are required",
        });
    }

    try {
        const internalUserId = await userService.getOrCreateUser({
            id: userId,
            emailAddresses: [{ emailAddress: email }],
            firstName: preferredName || "",
            lastName: "",
            phoneNumbers: phoneNumber ? [{ phoneNumber }] : [],
        });

        const interestsArray = Array.isArray(interests) ? interests : [];

        const result = await pool.query(
            `UPDATE users
             SET preferred_name = $1,
                 phone_number = $2,
                 location = $3,
                 interests = $4,
                 username = $5,
                 has_completed_onboarding = true,
                 updated_at = NOW(),
                 state = $7
             WHERE id = $6
             RETURNING *`,
            [
                preferredName || null,
                phoneNumber || null,
                location || null,
                interestsArray,
                username || null,
                internalUserId,
                state || null,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Failed to update user after creation",
            });
        }

        res.json({
            success: true,
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Error saving onboarding data:", {
            error: error.message,
            stack: error.stack,
            email,
            userId,
            preferredName,
            username,
            state,
        });

        res.status(500).json({
            error: "Failed to save onboarding data",
            details: error.message,
        });
    }
};

const getPreferredName = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({
            error: "Email is required",
        });
    }

    try {
        const result = await pool.query(
            "SELECT preferred_name, user_score, location, state, clerk_id FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.json({
                preferredName: null,
                userScore: null,
                location: null,
                state: null,
            });
        }

        res.json({
            preferredName: result.rows[0]?.preferred_name || null,
            userScore: result.rows[0]?.user_score || null,
            location: result.rows[0]?.location || null,
            state: result.rows[0]?.state || null,
            clerkId: result.rows[0]?.clerk_id || null,
        });
    } catch (error) {
        console.error("Error fetching preferred name and location:", error);
        res.status(500).json({
            error: "Failed to fetch user data",
        });
    }
};

const updateUserLocation = async (req, res) => {
    const { email, location, state } = req.body;

    if (!email || !location || !state) {
        return res.status(400).json({ success: false, message: "Email, location, and state are required." });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET location = $1, state = $2 WHERE email = $3 RETURNING id",
            [location, state, email]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "Location updated successfully." });
    } catch (error) {
        console.error("Error updating user location:", error);
        res.status(500).json({ success: false, message: "Failed to update location." });
    }
};

const getUserPublicProfileByUsername = async (req, res) => {
    const { username } = req.params;
    
    const loggedInClerkId = req.auth ? req.auth.userId : null;

    if (!username) {
        return res.status(400).json({
            success: false,
            message: "Username is required.",
        });
    }

    try {
        let loggedInUserUuid = null;
        if (loggedInClerkId) {
            const viewerResult = await pool.query(`SELECT id FROM users WHERE clerk_id = $1`, [loggedInClerkId]);
            if (viewerResult.rows.length > 0) {
                loggedInUserUuid = viewerResult.rows[0].id;
            }
        }
        
        let userQuery;
        let queryParams = [username];
        
        userQuery = `SELECT id, name, email, bio FROM users WHERE username = $1`;
        
        const userResult = await pool.query(userQuery, queryParams);

        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        
        const userData = userResult.rows[0];
        const profileOwnerUserId = userData.id;

        const recommendationsQuery = `
            SELECT
                sp.id, sp.business_name, sp.description, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.email, sp.phone_number, sp.tags, sp.date_of_recommendation, sp.num_likes, sp.website, sp.business_contact, 
                sp.recommender_message, sp.images,
                s.name as service_type, c.name as category_name,
                u.phone_number AS recommender_phone,
                u.email AS recommender_email,
                u.name AS recommender_name,
                sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username,
                CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS "currentUserLiked"
            FROM service_providers sp
            LEFT JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN service_categories c ON s.category_id = c.service_id
            LEFT JOIN users u ON sp.recommended_by = u.id
            LEFT JOIN recommendation_likes l ON l.recommendation_id = sp.id AND l.user_id = $2
            LEFT JOIN users rec_user ON sp.recommended_by = rec_user.id
            WHERE sp.recommended_by = $1 AND (
                $1 = $2 OR -- The user is viewing their own profile
                sp.visibility = 'public' OR
                (sp.visibility = 'connections' AND EXISTS (
                    SELECT 1 FROM user_connections
                    WHERE status = 'accepted' AND 
                    ((user_id = $1 AND connected_user_id = $2) OR (user_id = $2 AND connected_user_id = $1))
                )) OR
                (sp.visibility = 'communities' AND EXISTS (
                    SELECT 1 FROM community_shares cs
                    JOIN community_memberships cm ON cs.community_id = cm.community_id
                    WHERE cs.service_provider_id = sp.id AND cm.user_id = $2 AND cm.status = 'approved'
                ))
            )
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
        `;
        const recommendationsResult = await pool.query(recommendationsQuery, [
            profileOwnerUserId,
            loggedInUserUuid,
        ]);
        const profileImagePath = `/api/users/${userData.id}/profile/image`;

        res.json({
            success: true,
            userId: userData.id,
            userName: userData.name,
            userBio: userData.bio,
            userEmail: userData.email,
            profileImage: profileImagePath,
            recommendations: recommendationsResult.rows,
        });

    } catch (err) {
        console.error(
            "Error fetching public user profile by username:",
            err.message,
            err.stack
        );
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

const checkUsernameAvailability = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({
            success: false,
            message: "Username is required.",
        });
    }

    if (!/^[a-z0-9]{3,20}$/.test(username)) {
        return res.status(400).json({
            success: false,
            available: false,
            message: "Username must be 3-20 characters long and contain only lowercase letters and numbers.",
        });
    }

    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );

        const isAvailable = result.rows.length === 0;

        res.json({
            success: true,
            available: isAvailable,
            username: username,
        });
    } catch (err) {
        console.error("Error checking username availability:", err.message, err.stack);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
        });
    }
};

module.exports = {
    getCurrentUserRecommendations,
    getRecommendationsByUserId,
    updateUserProfileById,
    getPublicUserProfile,
    serveUserProfileImageById,
    uploadProfileImageMiddleware,
    updateCurrentUserProfile,
    serveCurrentUserProfileImage,
    getCurrentUserProfileData,
    getOnboardingStatus,
    saveOnboardingData,
    getPreferredName,
    updateUserLocation,
    getUserPublicProfileByUsername,
    checkUsernameAvailability,
};
