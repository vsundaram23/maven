import React, { useState } from "react";
import "./OnboardingModal.css";
import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    XMarkIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const OnboardingModal = ({ isOpen, onComplete, user }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        preferredName: user?.firstName || "", // Changed from firstName/lastName
        phoneNumber: user?.primaryPhoneNumber?.phoneNumber || "",
        location: "",
        interests: [],
    });

    if (!isOpen) return null;

    const totalSteps = 5;

    const validateStep = (currentStep) => {
        setError("");
        switch (currentStep) {
            case 1:
                if (!formData.preferredName.trim()) {
                    setError("Preferred name is required");
                    return false;
                }
                break;
            case 2:
                if (!formData.phoneNumber.trim()) {
                    setError("Phone number is required");
                    return false;
                }
                const phoneRegex = /^\d{10}$/;
                if (!phoneRegex.test(formData.phoneNumber.replace(/\D/g, ""))) {
                    setError("Please enter a valid 10-digit phone number");
                    return false;
                }
                break;
            case 3:
                // Location validation if needed
                break;
            case 4:
                if (formData.interests.length === 0) {
                    setError("Please select at least one area of interest");
                    return false;
                }
                break;
        }
        return true;
    };

    const formatPhoneNumber = (value) => {
        // Remove all non-digits
        const numbers = value.replace(/\D/g, "");

        // Format the number as (XXX) XXX-XXXX
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6)
            return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(
            6,
            10
        )}`;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setStep((prev) => prev - 1);
        setError("");
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        if (validateStep(4)) {
            try {
                const response = await fetch(
                    "http://localhost:3000/api/users/onboarding",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userId: user.id,
                            email: user.primaryEmailAddress?.emailAddress,
                            ...formData,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to save onboarding data");
                }

                // Move to success step instead of closing
                setStep(5);
            } catch (error) {
                console.error("Onboarding error:", error);
            }
        }
    };

    const handleFinish = () => {
        onComplete();
        navigate("/trustcircles?tab=discover");
    };

    return (
        <div className="onboarding-modal-overlay">
            <div className="onboarding-modal">
                <div className="onboarding-progress">
                    <div
                        className="onboarding-progress-bar"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="onboarding-content">
                    {error && <div className="onboarding-error">{error}</div>}

                    {step === 1 && (
                        <div className="onboarding-step">
                            <h2>Welcome to Tried & Trusted! 👋</h2>
                            <p>Let's get to know you better</p>
                            <div className="onboarding-form">
                                <div className="form-group">
                                    <label>Preferred Name *</label>
                                    <input
                                        type="text"
                                        value={formData.preferredName}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                preferredName: e.target.value,
                                            }))
                                        }
                                        placeholder="What should we call you?"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="onboarding-buttons">
                                <button
                                    className="onboarding-back-btn"
                                    style={{ visibility: "hidden" }} // Hide but preserve space
                                >
                                    Back
                                </button>
                                <button
                                    className="onboarding-next-btn"
                                    onClick={handleNext}
                                >
                                    Next <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="onboarding-step">
                            <h2>How can we reach you? 📱</h2>
                            <div className="onboarding-form">
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => {
                                            const formatted = formatPhoneNumber(
                                                e.target.value
                                            );
                                            setFormData((prev) => ({
                                                ...prev,
                                                phoneNumber: formatted,
                                            }));
                                        }}
                                        placeholder="(555) 123-4567"
                                        maxLength={14}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="onboarding-buttons">
                                <button
                                    className="onboarding-back-btn"
                                    onClick={handleBack}
                                >
                                    Back
                                </button>
                                <button
                                    className="onboarding-next-btn"
                                    onClick={handleNext}
                                >
                                    Next <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="onboarding-step">
                            <h2>Where are you located? 📍</h2>
                            <p>
                                This helps us show you relevant recommendations
                            </p>
                            <div className="onboarding-form">
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                location: e.target.value,
                                            }))
                                        }
                                        placeholder="Your city"
                                    />
                                </div>
                            </div>
                            <div className="onboarding-buttons">
                                <button
                                    className="onboarding-back-btn"
                                    onClick={handleBack}
                                >
                                    Back
                                </button>
                                <button
                                    className="onboarding-next-btn"
                                    onClick={handleNext}
                                >
                                    Next <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Original step 3 becomes step 4 */}
                    {step === 4 && (
                        <div className="onboarding-step">
                            <h2>Almost there! 🎉</h2>
                            <p>What services are you most interested in? *</p>
                            <div className="onboarding-interests">
                                {[
                                    "Repair Services",
                                    "Cleaning Services",
                                    "Home Renovation",
                                    "Financial Services",
                                    "Auto Services",
                                    "Outdoor Services",
                                    "Moving Services",
                                    "Dining & Entertainment",
                                ].map((interest) => (
                                    <label
                                        key={interest}
                                        className="interest-checkbox"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.interests.includes(
                                                interest
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        interests: [
                                                            ...prev.interests,
                                                            interest,
                                                        ],
                                                    }));
                                                } else {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        interests:
                                                            prev.interests.filter(
                                                                (i) =>
                                                                    i !==
                                                                    interest
                                                            ),
                                                    }));
                                                }
                                            }}
                                        />
                                        {interest}
                                    </label>
                                ))}
                            </div>
                            <div className="onboarding-buttons">
                                <button
                                    className="onboarding-back-btn"
                                    onClick={handleBack}
                                >
                                    Back
                                </button>
                                <button
                                    className="onboarding-complete-btn"
                                    onClick={handleComplete}
                                >
                                    Complete Setup{" "}
                                    <CheckCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="onboarding-step success-step">
                            <h2>You're all set! 🎊</h2>
                            <div className="success-content">
                                <p className="success-message">
                                    Now you can explore communities to start finding and sharing
                                    relevant recommendations:
                                </p>
                                {/* <UsersIcon className="success-icon" />
                                
                                <p className="success-message">
                                    Based on your interests, we think you'll
                                    love these communities:
                                </p>
                                <div className="suggested-communities">
                                    <div className="community-preview">
                                        {formData.interests.includes(
                                            "Home Renovation"
                                        ) && (
                                            <div className="community-item">
                                                🏠 Home Improvement Enthusiasts
                                            </div>
                                        )}
                                        {formData.interests.includes(
                                            "Auto Services"
                                        ) && (
                                            <div className="community-item">
                                                🚗 Auto Care Network
                                            </div>
                                        )}
                                        {formData.interests.includes(
                                            "Dining & Entertainment"
                                        ) && (
                                            <div className="community-item">
                                                🍽️ Local Foodies
                                            </div>
                                        )}
                                    </div>
                                </div> */}
                                <div className="onboarding-buttons">
                                    <button
                                        className="discover-communities-btn"
                                        onClick={handleFinish}
                                    >
                                        <UsersIcon className="w-5 h-5" />
                                        Discover Communities{" "}
                                        
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
