// src/components/ShareRecommendation/ShareRecommendation.jsx

import { useUser } from "@clerk/clerk-react";
import {
    DocumentTextIcon,
    SparklesIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CsvImportForm from "../../components/ShareRecommendation/CsvImportForm";
import ListRecommendationForm from "../../components/ShareRecommendation/ListRecommendationForm";
import SingleRecommendationForm from "../../components/ShareRecommendation/SingleRecommendationForm";

import "./ShareRecommendation.css";

// No other imports needed from the original large file, as they are now within the specific form components or constants.

export default function ShareRecommendation() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();

    const [mode, setMode] = useState("single");

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            navigate("/");
            return;
        }
    }, [isLoaded, isSignedIn, navigate]);

    if (!isLoaded || !isSignedIn) {
        return <div className="loading-state">Loading user data...</div>; // Simple loading state
    }

    // Pass user email and ID to child components as needed
    const userEmail = user.primaryEmailAddress?.emailAddress;
    const userId = user.id;

    return (
        <div id="share-recommendation-page">
            <div className="recommendation-wrapper modern-ui">
                <div className="recommendation-container">
                    <div className="mode-switcher">
                        <button
                            className={`mode-button ${
                                mode === "single" ? "active" : ""
                            }`}
                            onClick={() => setMode("single")}
                        >
                            <SparklesIcon /> Add Single
                        </button>
                        <button
                            className={`mode-button ${
                                mode === "list" ? "active" : ""
                            }`}
                            onClick={() => setMode("list")}
                        >
                            <UsersIcon /> Add List
                        </button>
                        <button
                            className={`mode-button ${
                                mode === "csv" ? "active" : ""
                            }`}
                            onClick={() => setMode("csv")}
                        >
                            <DocumentTextIcon /> Import CSV
                        </button>
                    </div>
                    {mode === "single" && (
                        <SingleRecommendationForm userEmail={userEmail} navigate={navigate} />
                    )}
                    {mode === "list" && (
                        <ListRecommendationForm userEmail={userEmail} userId={userId} navigate={navigate} />
                    )}
                    {mode === "csv" && (
                        <CsvImportForm userEmail={userEmail} userId={userId} navigate={navigate} />
                    )}
                </div>
            </div>
        </div>
    );
}