const pool = require("../config/db.config");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const uploadListCover = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fieldSize: 30 * 1024 * 1024,
    },
}).single("coverImage");

// Helper to get internal user id
async function getInternalUserId({ clerkUserId, userEmail }) {
    const userResult = await pool.query(
        "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
        [clerkUserId, userEmail]
    );
    if (userResult.rows.length === 0) {
        throw new Error("User not found.");
    }
    return userResult.rows[0].id;
}

const getList = async (req, res) => {
    const { listId } = req.params;
    const { user_id: clerkUserId, email: userEmail } = req.query;
    try {
        let creatorUserId = null;
        if (clerkUserId || userEmail) {
            try {
                creatorUserId = await getInternalUserId({
                    clerkUserId,
                    userEmail,
                });
            } catch (e) {}
        }

        const listRes = await pool.query(
            `SELECT l.*, u.preferred_name AS owner_name
             FROM lists l
             JOIN users u ON l.user_id = u.id
             WHERE l.id = $1`,
            [listId]
        );
        if (listRes.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "List not found." });
        }
        const list = listRes.rows[0];
        const isOwner = creatorUserId && list.user_id === creatorUserId;

        const recsRes = await pool.query(
            `SELECT sp.* FROM list_reviews lr
             JOIN service_providers sp ON lr.provider_id = sp.id
             WHERE lr.list_id = $1`,
            [listId]
        );

        res.json({
            success: true,
            list: { ...list, isOwner },
            recommendations: recsRes.rows,
        });
    } catch (err) {
        if (err.message === "User not found.") {
            return res
                .status(404)
                .json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

const getUserLists = async (req, res) => {
    const { user_id: clerkUserId, email: userEmail } = req.query;
    try {
        const creatorUserId = await getInternalUserId({
            clerkUserId,
            userEmail,
        });

        const listRes = await pool.query(
            `SELECT * FROM lists WHERE user_id = $1 ORDER BY created_at DESC`,
            [creatorUserId]
        );
        res.json({ success: true, lists: listRes.rows });
    } catch (err) {
        if (err.message === "User not found.") {
            return res
                .status(404)
                .json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

const createList = async (req, res) => {
    uploadListCover(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: "Error uploading cover image",
                detail: err.message,
            });
        }

        const { title, description, user_id, email, visibility } = req.body;
        let providerIds = req.body.providerIds || [];
        let trustCircleIds =
            req.body.trustCircleIds || req.body.trust_circle_ids || [];
        if (!Array.isArray(providerIds)) {
            providerIds = [providerIds].filter(Boolean);
        }
        if (!Array.isArray(trustCircleIds)) {
            trustCircleIds = [trustCircleIds].filter(Boolean);
        }

        if (!title || !Array.isArray(providerIds) || providerIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Title and at least one provider are required.",
            });
        }

        let client;
        try {
            client = await pool.connect();
            await client.query("BEGIN");

            const userResult = await client.query(
                "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
                [user_id, email]
            );
            if (userResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return res
                    .status(404)
                    .json({ success: false, message: "User not found." });
            }
            const creatorUserId = userResult.rows[0].id;

            let coverImageJson = null;
            if (req.file) {
                coverImageJson = {
                    id: uuidv4(),
                    data: req.file.buffer,
                    contentType: req.file.mimetype,
                    size: req.file.size,
                    originalname: req.file.originalname,
                    createdAt: new Date().toISOString(),
                };
            }

            const listId = uuidv4();
            await client.query(
                `INSERT INTO lists (id, title, description, user_id, cover_image, visibility) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    listId,
                    title,
                    description || null,
                    creatorUserId,
                    coverImageJson ? JSON.stringify(coverImageJson) : null,
                    visibility || "connections",
                ]
            );

            if (visibility === "communities" && trustCircleIds.length > 0) {
                for (const communityId of trustCircleIds) {
                    await client.query(
                        `INSERT INTO list_community_shares (id, list_id, community_id, shared_by_user_id, shared_at)
                         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                        [uuidv4(), listId, communityId, creatorUserId]
                    );
                }
            }

            for (const providerId of providerIds) {
                await client.query(
                    `INSERT INTO list_reviews (list_id, provider_id) VALUES ($1, $2)`,
                    [listId, providerId]
                );
            }

            await client.query("COMMIT");
            res.status(201).json({ success: true, listId });
        } catch (err) {
            if (client) await client.query("ROLLBACK");
            res.status(500).json({ success: false, error: err.message });
        } finally {
            if (client) client.release();
        }
    });
};

const deleteList = async (req, res) => {
    const listId = req.params.listId;
    const { user_id: clerkUserId, email: userEmail } = req.body;

    if (!clerkUserId || !userEmail) {
        return res.status(401).json({
            success: false,
            message: "User authentication details (ID and email) required.",
        });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        const userId = userResult.rows[0].id;

        const listRes = await client.query(
            "SELECT * FROM lists WHERE id = $1",
            [listId]
        );
        if (listRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "List not found.",
            });
        }
        const list = listRes.rows[0];
        if (list.user_id !== userId) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                success: false,
                message: "Only the list owner can delete this list.",
            });
        }

        await client.query("DELETE FROM list_reviews WHERE list_id = $1", [
            listId,
        ]);

        const deletedList = await client.query(
            "DELETE FROM lists WHERE id = $1 RETURNING *",
            [listId]
        );

        await client.query("COMMIT");
        res.json({
            success: true,
            message: "List and associations deleted successfully",
            deletedList: deletedList.rows[0],
        });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            error: "Server error deleting list",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

// New code for document upload and extraction
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// Single file upload for document extraction
const uploadSingleDoc = multer({ storage: multer.memoryStorage() }).single(
    "file"
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractTextFromFile(file) {
    const { originalname, mimetype, buffer } = file;
    if (mimetype === "application/pdf" || originalname.endsWith(".pdf")) {
        const data = await pdfParse(buffer);
        return data.text;
    } else if (
        mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        originalname.endsWith(".docx")
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else if (mimetype === "text/plain" || originalname.endsWith(".txt")) {
        return buffer.toString("utf8");
    } else if (mimetype === "text/csv" || originalname.endsWith(".csv")) {
        return buffer.toString("utf8");
    } else {
        throw new Error("Unsupported file type");
    }
}

async function extractRecommendationsWithGemini(text) {
    const prompt = `
Extract up to 10 recommendations from the following text. For each, return a JSON array of objects with these fields:
- businessName
- recommendationBlurb
- rating (1-5, if available)
- providerContactName
- website
- phoneNumber
- tags (array of strings)

Text:
"""${text}"""
Return ONLY the JSON array.
    `.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    let recommendations = [];
    try {
        recommendations = JSON.parse(content);
    } catch (err) {
        // Try to extract JSON substring if Gemini added extra text
        const match = content.match(/\[.*\]/s);
        if (match) {
            recommendations = JSON.parse(match[0]);
        } else {
            throw new Error("Could not parse Gemini output as JSON");
        }
    }
    return recommendations;
}

const listFileUpload = async (req, res) => {
    uploadSingleDoc(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: "Upload error",
                detail: err.message,
            });
        }
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, message: "No file uploaded" });
        }
        try {
            const text = await extractTextFromFile(req.file);
            const recommendations = await extractRecommendationsWithGemini(
                text
            );
            res.json({
                success: true,
                recommendations: recommendations.slice(0, 10),
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to extract recommendations",
                detail: error.message,
            });
        }
    });
};

const updateList = async (req, res) => {
    const listId = req.params.listId;
    const {
        title,
        description,
        visibility,
        trustCircleIds = [],
        recommendationIds = [],
        user_id: clerkUserId,
        email: userEmail,
    } = req.body;

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Get user
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const userId = userResult.rows[0].id;

        // Get list and check ownership
        const listRes = await client.query(
            "SELECT * FROM lists WHERE id = $1",
            [listId]
        );
        if (listRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "List not found." });
        }
        const list = listRes.rows[0];
        if (list.user_id !== userId) {
            await client.query("ROLLBACK");
            return res
                .status(403)
                .json({
                    success: false,
                    message: "Only the list owner can edit this list.",
                });
        }

        // Update list fields
        await client.query(
            "UPDATE lists SET title = $1, description = $2, visibility = $3 WHERE id = $4",
            [title, description, visibility, listId]
        );

        // Update list_community_shares
        await client.query(
            "DELETE FROM list_community_shares WHERE list_id = $1",
            [listId]
        );
        if (
            (visibility === "communities" || visibility === "specific") &&
            trustCircleIds.length > 0
        ) {
            for (const communityId of trustCircleIds) {
                await client.query(
                    `INSERT INTO list_community_shares (id, list_id, community_id, shared_by_user_id, shared_at)
                     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                    [uuidv4(), listId, communityId, userId]
                );
            }
        }

        // Update list_reviews (remove all, then add current)
        await client.query("DELETE FROM list_reviews WHERE list_id = $1", [
            listId,
        ]);
        for (const providerId of recommendationIds) {
            await client.query(
                `INSERT INTO list_reviews (list_id, provider_id) VALUES ($1, $2)`,
                [listId, providerId]
            );
        }

        // Now, for each recommendation, ensure its visibility is at least as open as the list
        for (const providerId of recommendationIds) {
            // Get rec's current visibility and communities
            const recRes = await client.query(
                "SELECT visibility FROM service_providers WHERE id = $1",
                [providerId]
            );
            if (recRes.rows.length === 0) continue;
            const recVis = recRes.rows[0].visibility;

            // Visibility levels
            const levels = {
                private: 0,
                connections: 1,
                communities: 2,
                public: 3,
            };
            const recLevel = levels[recVis] ?? 0;
            const listLevel = levels[visibility] ?? 0;

            // If list is more open than rec, update rec
            if (listLevel > recLevel) {
                // Update rec visibility
                await client.query(
                    "UPDATE service_providers SET visibility = $1 WHERE id = $2",
                    [visibility, providerId]
                );
                // If communities, update community_shares
                if (visibility === "communities" || visibility === "specific") {
                    // Remove old shares for this rec by this user
                    await client.query(
                        "DELETE FROM community_shares WHERE service_provider_id = $1 AND shared_by_user_id = $2",
                        [providerId, userId]
                    );
                    // Add new shares
                    for (const communityId of trustCircleIds) {
                        await client.query(
                            `INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at)
                             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                            [uuidv4(), providerId, communityId, userId]
                        );
                    }
                }
            } else if (
                recVis === "communities" &&
                (visibility === "communities" || visibility === "specific")
            ) {
                // If rec is already communities, but list has additional communities, add those
                // Get current communities for this rec
                const recCommsRes = await client.query(
                    "SELECT community_id FROM community_shares WHERE service_provider_id = $1 AND shared_by_user_id = $2",
                    [providerId, userId]
                );
                const recComms = recCommsRes.rows.map(
                    (row) => row.community_id
                );
                for (const communityId of trustCircleIds) {
                    if (!recComms.includes(communityId)) {
                        await client.query(
                            `INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at)
                             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                            [uuidv4(), providerId, communityId, userId]
                        );
                    }
                }
            }
        }

        await client.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (client) client.release();
    }
};

const addRecommendationsToList = async (req, res) => {
    const listId = req.params.listId;
    const {
        recommendationIds = [],
        user_id: clerkUserId,
        email: userEmail,
    } = req.body;

    if (!Array.isArray(recommendationIds) || recommendationIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No recommendations provided.",
        });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Get user
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const userId = userResult.rows[0].id;

        // Get list and check ownership
        const listRes = await client.query(
            "SELECT * FROM lists WHERE id = $1",
            [listId]
        );
        if (listRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "List not found." });
        }
        const list = listRes.rows[0];
        if (list.user_id !== userId) {
            await client.query("ROLLBACK");
            return res
                .status(403)
                .json({
                    success: false,
                    message: "Only the list owner can add recommendations.",
                });
        }

        // Get trust circles for the list if needed
        let trustCircleIds = [];
        if (
            list.visibility === "communities" ||
            list.visibility === "specific"
        ) {
            const commRes = await client.query(
                "SELECT community_id FROM list_community_shares WHERE list_id = $1",
                [listId]
            );
            trustCircleIds = commRes.rows.map((row) => row.community_id);
        }

        // Add recommendations to list_reviews if not already present
        for (const providerId of recommendationIds) {
            await client.query(
                `INSERT INTO list_reviews (list_id, provider_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [listId, providerId]
            );
        }

        // Now, for each recommendation, ensure its visibility is at least as open as the list
        for (const providerId of recommendationIds) {
            // Get rec's current visibility and communities
            const recRes = await client.query(
                "SELECT visibility FROM service_providers WHERE id = $1",
                [providerId]
            );
            if (recRes.rows.length === 0) continue;
            const recVis = recRes.rows[0].visibility;

            // Visibility levels
            const levels = {
                private: 0,
                connections: 1,
                communities: 2,
                public: 3,
            };
            const recLevel = levels[recVis] ?? 0;
            const listLevel = levels[list.visibility] ?? 0;

            // If list is more open than rec, update rec
            if (listLevel > recLevel) {
                // Update rec visibility
                await client.query(
                    "UPDATE service_providers SET visibility = $1 WHERE id = $2",
                    [list.visibility, providerId]
                );
                // If communities, update community_shares
                if (
                    list.visibility === "communities" ||
                    list.visibility === "specific"
                ) {
                    // Remove old shares for this rec by this user
                    await client.query(
                        "DELETE FROM community_shares WHERE service_provider_id = $1 AND shared_by_user_id = $2",
                        [providerId, userId]
                    );
                    // Add new shares
                    for (const communityId of trustCircleIds) {
                        await client.query(
                            `INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at)
                             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                            [uuidv4(), providerId, communityId, userId]
                        );
                    }
                }
            } else if (
                recVis === "communities" &&
                (list.visibility === "communities" ||
                    list.visibility === "specific")
            ) {
                // If rec is already communities, but list has additional communities, add those
                const recCommsRes = await client.query(
                    "SELECT community_id FROM community_shares WHERE service_provider_id = $1 AND shared_by_user_id = $2",
                    [providerId, userId]
                );
                const recComms = recCommsRes.rows.map(
                    (row) => row.community_id
                );
                for (const communityId of trustCircleIds) {
                    if (!recComms.includes(communityId)) {
                        await client.query(
                            `INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at)
                             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                            [uuidv4(), providerId, communityId, userId]
                        );
                    }
                }
            }
        }

        await client.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (client) client.release();
    }
};

const removeRecommendationsFromList = async (req, res) => {
    const listId = req.params.listId;
    const {
        recommendationIds = [],
        user_id: clerkUserId,
        email: userEmail,
    } = req.body;

    if (!Array.isArray(recommendationIds) || recommendationIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No recommendations provided.",
        });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Get user
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const userId = userResult.rows[0].id;

        // Get list and check ownership
        const listRes = await client.query(
            "SELECT * FROM lists WHERE id = $1",
            [listId]
        );
        if (listRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "List not found." });
        }
        const list = listRes.rows[0];
        if (list.user_id !== userId) {
            await client.query("ROLLBACK");
            return res
                .status(403)
                .json({
                    success: false,
                    message: "Only the list owner can remove recommendations.",
                });
        }

        // Remove recommendations from list_reviews
        await client.query(
            `DELETE FROM list_reviews WHERE list_id = $1 AND provider_id = ANY($2::uuid[])`,
            [listId, recommendationIds]
        );

        await client.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    getList,
    getUserLists,
    createList,
    deleteList,
    listFileUpload,
    updateList,
    addRecommendationsToList,
    removeRecommendationsFromList,
};
