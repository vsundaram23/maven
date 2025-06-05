const express = require("express");
const router = express.Router();
const pool = require("../config/db.config"); // Included for pattern consistency, though not directly used here
const UserService = require("../services/userService"); // Included for pattern consistency, though not directly used here

const {
    generateInviteToken,
    getInviteDetails,
    registerWithInvite,
    acceptInviteExistingUser,
} = require("../controllers/inviteController"); // Adjust path as needed

// Note: The resolveClerkIdToInternalId helper from your communities.js
// is effectively handled within the controller functions now by directly using UserService.getOrCreateUser.
// If you have other pre-controller processing needs for Clerk IDs for these routes,
// you could add a similar helper here or as middleware.

router.post("/communities/:communityId/invites", async (req, res) => {
    const { communityId } = req.params;
    console.log("Received communityId for invite generation:", communityId);
    const {
        actingUserClerkId,
        expires_at,
        max_uses,
        emailAddresses,
        firstName,
        lastName,
        phoneNumbers,
    } = req.body;

    if (!actingUserClerkId) {
        return res.status(401).json({
            success: false,
            error: "User authentication required (actingUserClerkId missing).",
        });
    }
    if (!communityId) {
        return res
            .status(400)
            .json({ success: false, error: "Community ID is required." });
    }

    try {
        const tokenInfo = await generateInviteToken(
            communityId,
            actingUserClerkId,
            expires_at,
            max_uses,
            emailAddresses,
            firstName,
            lastName,
            phoneNumbers
        );
        const invite_url = `https://triedandtrusted.ai/invite/${tokenInfo.token_string}`;
        res.status(201).json({
            success: true,
            invite_url: invite_url,
            token_string: tokenInfo.token_string,
            expires_at: tokenInfo.expires_at,
            max_uses: tokenInfo.max_uses,
        });
    } catch (error) {
        if (error.message.includes("Not authorized")) {
            return res
                .status(403)
                .json({ success: false, error: error.message });
        }
        if (error.message.includes("not found")) {
            return res
                .status(404)
                .json({ success: false, error: error.message });
        }
        console.error(
            "Error in POST /communities/:communityId/invites route:",
            error
        );
        res.status(500).json({
            success: false,
            error: error.message || "Server error generating invite token.",
        });
    }
});

// Get invite details
router.get("/:tokenString", async (req, res) => {
    const { tokenString } = req.params;

    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT i.*, c.name as community_name, c.description as community_description,
                    u.name as invited_by_name
             FROM invite_tokens i
             JOIN communities c ON i.community_id = c.id
             JOIN users u ON i.generated_by_user_id = u.id
             WHERE i.token_string = $1 AND i.status = 'active'`,
            [tokenString]
        );
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Invalid or expired invite",
            });
        }

        const invite = result.rows[0];

        // Check if expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                error: "Invite has expired",
            });
        }

        // Check max uses
        if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
            return res.status(400).json({
                success: false,
                error: "Invite has reached maximum uses",
            });
        }

        res.json({
            success: true,
            details: {
                community_name: invite.community_name,
                community_description: invite.community_description,
                invited_by_name: invite.invited_by_name,
                expires_at: invite.expires_at,
                max_uses: invite.max_uses,
                remaining_uses: invite.max_uses
                    ? invite.max_uses - invite.use_count
                    : null,
            },
        });
    } catch (error) {
        console.error("Error fetching invite details:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch invite details",
        });
    }
});

router.post("/auth/register-with-invite", async (req, res) => {
    const {
        name,
        email,
        password,
        clerk_id: newUserClerkId,
        invite_token_string,
    } = req.body;
    if (!name || !email || !password || !invite_token_string) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields: name, email, password, and invite_token_string.",
        });
    }
    try {
        const result = await registerWithInvite(
            name,
            email,
            password,
            newUserClerkId,
            invite_token_string
        );
        // Session/JWT creation would typically happen here in a real app by your auth system
        res.status(201).json({
            success: true,
            data: result,
            message: `Registration successful for ${email}.`,
        });
    } catch (error) {
        if (
            error.message.includes("Invalid invite token") ||
            error.message.includes("no longer valid")
        ) {
            return res
                .status(400)
                .json({ success: false, error: error.message });
        }
        if (error.message.includes("already registered")) {
            return res
                .status(409)
                .json({ success: false, error: error.message });
        }
        if (
            error.message.includes(
                "needs a defined local account creation strategy"
            )
        ) {
            return res
                .status(400)
                .json({ success: false, error: error.message });
        }
        console.error("Error in POST /auth/register-with-invite route:", error);
        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Server error during registration with invite.",
        });
    }
});

// Accept invite
router.post("/:tokenString/accept", async (req, res) => {
    const { tokenString } = req.params;
    const { actingUserClerkId, email, firstName, lastName } = req.body;

    if (!actingUserClerkId || !email) {
        return res.status(401).json({
            success: false,
            error: "User authentication and email required",
        });
    }

    try {
        const result = await acceptInviteExistingUser(tokenString, {
            id: actingUserClerkId,
            emailAddresses: [{ emailAddress: email }],
            firstName,
            lastName,
        });
        res.json(result);
    } catch (error) {
        console.error("Error accepting invite:", error);
        res.status(
            error.message.includes("Invalid") ||
                error.message.includes("expired")
                ? 400
                : 500
        ).json({
            success: false,
            error: error.message || "Failed to accept invite",
        });
    }
});

module.exports = router;
