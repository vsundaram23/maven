const express = require("express");
const router = express.Router();

const {
    getCurrentUserRecommendations,
    getRecommendationsByUserId,
    updateUserProfileById,
    serveUserProfileImageById,
    uploadProfileImageMiddleware,
    updateCurrentUserProfile,
    serveCurrentUserProfileImage,
    getCurrentUserProfileData
} = require("../controllers/userController");

router.get(
    "/me/recommendations",
    getCurrentUserRecommendations
);

router.get(
    "/me/profile",
    getCurrentUserProfileData
);

router.put(
    "/me/profile",
    uploadProfileImageMiddleware,
    updateCurrentUserProfile
);

router.get(
    "/me/profile/image",
    serveCurrentUserProfileImage
);

router.get(
    "/:id/recommendations",
    getRecommendationsByUserId
);

router.put(
    "/:id/profile",
    uploadProfileImageMiddleware,
    updateUserProfileById
);

router.get(
    "/:id/profile/image",
    serveUserProfileImageById
);

module.exports = router;

// working 5/19 post clerk
// const express = require("express");
// const router = express.Router();
// const {
//     getCurrentUserRecommendations,
//     getRecommendationsByUserId,
// } = require("../controllers/userController");

// // Route for current user's recommendations
// router.get("/me/recommendations", getCurrentUserRecommendations);

// // Route for other users' recommendations
// router.get("/:id/recommendations", getRecommendationsByUserId);

// module.exports = router;
