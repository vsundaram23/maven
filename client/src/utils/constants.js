// src/utils/constants.js

import {
    DocumentTextIcon,
    GlobeAltIcon,
    UsersIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";

// export const API_URL = "http://localhost:3000";
export const API_URL = "https://api.seanag-recommendations.org:8080"
export const INTRO_TEXT =
    "Share recommendations with your Trust Circle. Let's add one now...";
export const TYPEWRITER_SPEED = 40;

export const PUBLISH_OPTIONS = [
    {
        value: "Full Trust Circle",
        label: "Entire Trust Circle",
        icon: UsersIcon,
    },
    {
        value: "Specific Trust Circles",
        label: "Specific Trust Circles",
        icon: UserCircleIcon, // Re-using UsersIcon, UserCircleIcon was not imported previously by name
    },
    { value: "Public", label: "Public", icon: GlobeAltIcon },
];

export const CSV_HEADERS_SCHEMA = `Business Name, Your Experience, Rating (1-5), Provider Contact Name (Optional), Website (Optional), Phone (Optional), Tags (comma-separated, Optional), Publish Scope (Public/Specific Trust Circles/Full Trust Circle, Optional), Trust Circle IDs (comma-separated if Specific Trust Circles, Optional)`;
