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
                sp.recommender_message, sp.images,
                s.name as service_type, c.name as category_name,
                EXISTS (
                    SELECT 1
                    FROM public.recommendation_likes rl
                    WHERE rl.recommendation_id = sp.id AND rl.user_id = $1
                ) AS "currentUserLiked"
            FROM service_providers sp
            LEFT JOIN services s ON sp.service_id = s.service_id
            LEFT JOIN service_categories c ON s.category_id = c.service_id
            WHERE sp.recommended_by = $1
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
            `,
            [internalUserId]
        );

        const userResult = await pool.query(
            `SELECT id, name, phone_number, email, bio FROM users WHERE id = $1`,
            [internalUserId]
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
    const { userId } = req.params; // This is the ID of the profile being viewed

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "User ID is required.",
        });
    }

    try {
        // Fetch basic user data
        const userQuery = `SELECT id, name, email, bio FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        const loggedInUserId = req.auth ? req.auth.userId : null;

        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const userData = userResult.rows[0];

        // Fetch user's recommendations
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
            WHERE sp.recommended_by = $1
            ORDER BY sp.date_of_recommendation DESC, sp.created_at DESC
        `;
        // THIS IS THE CORRECT CODE YOU NEED
        const recommendationsResult = await pool.query(recommendationsQuery, [
            userId,
            loggedInUserId,
        ]);

        // Construct profile image URL (to be fetched separately by the client if needed, or direct path)
        const profileImage = `/api/users/${userId}/profile/image`; // Path for frontend to request

        res.json({
            success: true,
            userId: userData.id, // Return the ID for consistency
            userName: userData.name,
            userBio: userData.bio,
            userEmail: userData.email, // Assuming email is public or you'll handle privacy
            profileImage: profileImage, // Path to the image
            recommendations: recommendationsResult.rows,
            // Note: 'connections' count is NOT included here
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
            // Only update if there's a change
            queryFieldsToUpdate.push(`name = $${queryParamIndex++}`);
            queryValues.push(nameToUpdate);
        } else if (!nameToUpdate && currentName) {
            // If cleared and was not empty
            queryFieldsToUpdate.push(`name = $${queryParamIndex++}`);
            queryValues.push(null); // Or "" depending on DB schema
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
    const { userId, email, preferredName, phoneNumber, location, interests } =
        req.body;

    if (!email) {
        return res.status(400).json({
            error: "Email is required",
        });
    }

    try {
        // Ensure interests is an array and convert to PostgreSQL array format
        const interestsArray = Array.isArray(interests) ? interests : [];

        const result = await pool.query(
            `UPDATE users 
             SET preferred_name = $1, 
                 phone_number = $2, 
                 location = $3, 
                 interests = $4,
                 has_completed_onboarding = true,
                 updated_at = NOW()
             WHERE email = $5
             RETURNING *`,
            [
                preferredName || null,
                phoneNumber || null,
                location || null,
                interestsArray,
                email,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "User not found with provided email",
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
            preferredName,
            interests,
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
            error: "Email is required"
        });
    }

    try {
        const result = await pool.query(
            'SELECT preferred_name FROM users WHERE email = $1',
            [email]
        );

        res.json({
            preferredName: result.rows[0]?.preferred_name || null
        });
    } catch (error) {
        console.error("Error fetching preferred name:", error);
        res.status(500).json({
            error: "Failed to fetch preferred name"
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
    getPreferredName
};
