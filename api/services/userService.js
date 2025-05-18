const pool = require("../config/db.config");
const { v4: uuidv4 } = require("uuid");

class UserService {
    async getOrCreateUser(clerkUser) {
        const {
            id: clerkId,
            emailAddresses,
            firstName,
            lastName,
            phoneNumbers,
        } = clerkUser;

        const primaryEmail = emailAddresses[0]?.emailAddress;
        const primaryPhone = phoneNumbers?.[0]?.phoneNumber;

        try {
            // First check if user exists by email
            const existingUser = await pool.query(
                "SELECT id FROM users WHERE clerk_id = $1",
                [clerkId]
            );

            if (existingUser.rows.length > 0) {
                return existingUser.rows[0].id;
            }

            // Then try to find by email
            const existingUserByEmail = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [primaryEmail]
            );

            if (existingUserByEmail.rows.length > 0) {
                // Update existing user with clerk_id
                await pool.query(
                    "UPDATE users SET clerk_id = $1 WHERE id = $2",
                    [clerkId, existingUserByEmail.rows[0].id]
                );
                return existingUserByEmail.rows[0].id;
            }

            // Create new user matching your schema
            const newUser = await pool.query(
                `INSERT INTO users (
          id,
          email,
          name,
          profile_image,
          created_at,
          phone_number,
          preferred_name,
          clerk_id,
          email_verified,
          last_sign_in_at
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW()) 
        RETURNING id`,
                [
                    uuidv4(), // id
                    primaryEmail, // email
                    `${firstName || ""} ${lastName || ""}`.trim(), // name
                    null, // profile_image
                    primaryPhone || null, // phone_number
                    firstName || null, // preferred_name
                    clerkId, // clerk_id
                    false, // email_verified
                ]
            );

            return newUser.rows[0].id;
        } catch (error) {
            console.error("Error in getOrCreateUser:", error);
            throw error;
        }
    }
}

module.exports = new UserService();
