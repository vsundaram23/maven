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
    getCurrentUserProfileData,
    getPublicUserProfile,
    getOnboardingStatus,
    saveOnboardingData,
    getPreferredName,
    getUserPublicProfileByUsername,
} = require("../controllers/userController");

router.get("/me/recommendations", getCurrentUserRecommendations);

router.get("/me/profile", getCurrentUserProfileData);

router.put(
    "/me/profile",
    uploadProfileImageMiddleware,
    updateCurrentUserProfile
);

router.get("/me/profile/image", serveCurrentUserProfileImage);

router.get("/public-profile/:identifier", getPublicUserProfile);

router.get("/:id/recommendations", getRecommendationsByUserId);

router.put("/:id/profile", uploadProfileImageMiddleware, updateUserProfileById);

router.get("/:id/profile/image", serveUserProfileImageById);

router.post("/onboarding", saveOnboardingData);

router.get("/onboarding-status", getOnboardingStatus);

router.get("/preferred-name", getPreferredName);

router.get("/username/:username", getUserPublicProfileByUsername);

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
