import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    UsersIcon
} from "@heroicons/react/24/outline";
import { CheckIcon, UserPlusIcon } from "@heroicons/react/24/solid";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OnboardingModal.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const stateNameMap = Object.fromEntries(
  Object.entries(stateMap).map(([abbr, name]) => [name.toLowerCase(), name])
);

const getFullStateName = (input) => {
  if (!input) return "";
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  if (stateMap[upper]) {
    return stateMap[upper];
  }

  const lower = trimmed.toLowerCase();
  if (stateNameMap[lower]) {
    return stateNameMap[lower];
  }
  return trimmed;
};

const OnboardingModal = ({ isOpen, onComplete, user }) => {
    const location = window.location.pathname;
    const isInvite = location.startsWith("/invite/");

    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        preferredName: user?.firstName || "",
        phoneNumber: user?.primaryPhoneNumber?.phoneNumber || "",
        location: "",
        state: "",
        interests: [],
    });

    const [topRecommenders, setTopRecommenders] = useState([]);
    const [loadingRecommenders, setLoadingRecommenders] = useState(false);
    const [selectedRecommenders, setSelectedRecommenders] = useState(new Set());

    useEffect(() => {
        if (currentStep === 5 && !isInvite) {
            const fetchRecommenders = async () => {
                setLoadingRecommenders(true);
                try {
                    const response = await fetch(`${API_URL}/api/connections/top-recommenders?state=${encodeURIComponent(formData.state)}&userId=${user.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setTopRecommenders(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch top recommenders", err);
                } finally {
                    setLoadingRecommenders(false);
                }
            };
            fetchRecommenders();
        }
    }, [currentStep, formData.state, user?.id, isInvite]);

    if (!isOpen) return null;

    const totalSteps = 4;

    const steps = [
        {
            id: 1,
            title: "What should we call you?",
            description: "Let's start with your preferred name",
            icon: "👋",
            required: true
        },
        {
            id: 2,
            title: "How can we reach you?",
            description: "We'll need your phone number for connections",
            icon: "📱",
            required: true
        },
        {
            id: 3,
            title: "Where are you located?",
            description: "We need your location for local recommendations",
            icon: "📍",
            required: true
        },
        {
            id: 4,
            title: "What interests you?",
            description: "Select services you're most interested in",
            icon: "🎯",
            required: true
        }
    ];

    const validateStep = (stepId) => {
        setError("");
        switch (stepId) {
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
                if (!formData.location.trim()) {
                    setError("City is required");
                    return false;
                }
                if (!formData.state.trim()) {
                    setError("State is required");
                    return false;
                }
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
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6)
            return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCompletedSteps(prev => new Set([...prev, currentStep]));
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError("");
        }
    };

    const handleStepClick = (stepId) => {
        // Allow navigation to completed steps or the current step
        if (completedSteps.has(stepId) || stepId === currentStep) {
            setCurrentStep(stepId);
            setError("");
        }
    };

    const generateUsername = async (preferredName) => {
        // Clean the preferred name (remove spaces, special chars, convert to lowercase)
        const cleanName = preferredName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15); // Limit length
        
        // Try up to 10 times to find a unique username
        for (let attempt = 0; attempt < 10; attempt++) {
            const randomDigits = Math.floor(100 + Math.random() * 900); // 3-digit number (100-999)
            const proposedUsername = `${cleanName}${randomDigits}`;
            
            try {
                const checkResponse = await fetch(`${API_URL}/api/users/check-username`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username: proposedUsername }),
                });
                
                if (checkResponse.ok) {
                    const result = await checkResponse.json();
                    if (result.available) {
                        return proposedUsername;
                    }
                }
            } catch (error) {
                console.error("Error checking username:", error);
            }
        }
        
        // Fallback: use timestamp if all attempts failed
        const timestamp = Date.now().toString().slice(-6);
        return `${cleanName}${timestamp}`;
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        if (validateStep(4)) {
            try {
                // Generate a unique username
                const generatedUsername = await generateUsername(formData.preferredName);
                
                const response = await fetch(
                    `${API_URL}/api/users/onboarding`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userId: user.id,
                            email: user.primaryEmailAddress?.emailAddress,
                            username: generatedUsername,
                            ...formData,
                            state: getFullStateName(formData.state),
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to save onboarding data");
                }

                setCompletedSteps(prev => new Set([...prev, 4]));
                setCurrentStep(5); // Move to success screen
            } catch (error) {
                console.error("Onboarding error:", error);
                setError("Failed to save your information. Please try again.");
            }
        }
    };

    const handleFinish = async (followSelected = false) => {
        if (followSelected) {
            const fromUserId = user.id;
            const followPromises = Array.from(selectedRecommenders).map(toUserId => {
                return fetch(`${API_URL}/api/connections/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fromUserId, toUserId })
                });
            });

            try {
                await Promise.all(followPromises);
            } catch (error) {
                console.error("Error following users:", error);
                // Non-critical, so we can still proceed
            }
        }
        
        onComplete();
        if (!isInvite) {
            // After following, navigate to the Home page
            navigate("/");
        }
    };

    const renderStepContent = (stepId) => {
        switch (stepId) {
            case 1:
                return (
                    <div className="onboarding-step-form">
                        <div className="onboarding-form-group">
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
                        <div className="onboarding-step-buttons">
                            <div></div> {/* Spacer */}
                            <button
                                className="onboarding-next-btn"
                                onClick={handleNext}
                            >
                                Next <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="onboarding-step-form">
                        <div className="onboarding-form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
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
                        <div className="onboarding-step-buttons">
                            <button
                                className="onboarding-back-btn"
                                onClick={handleBack}
                            >
                                <ArrowLeftIcon className="w-3 h-3" />
                                Back
                            </button>
                            <button
                                className="onboarding-next-btn"
                                onClick={handleNext}
                            >
                                Next <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="onboarding-step-form">
                        <div className="onboarding-form-group">
                            <label>Location *</label>
                            <div className="onboarding-location-inputs">
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
                                    required
                                />
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            state: e.target.value,
                                        }))
                                    }
                                    onBlur={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            state: getFullStateName(e.target.value),
                                        }))
                                    }
                                    placeholder="Your state"
                                    required
                                />
                            </div>
                        </div>
                        <div className="onboarding-step-buttons">
                            <button
                                className="onboarding-back-btn"
                                onClick={handleBack}
                            >
                                <ArrowLeftIcon className="w-3 h-3" />
                                Back
                            </button>
                            <button
                                className="onboarding-next-btn"
                                onClick={handleNext}
                            >
                                Next <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="onboarding-step-form">
                        <div className="onboarding-form-group">
                            <label>What services are you most interested in? *</label>
                            <div className="onboarding-interests-grid">
                                {[
                                    "Repair Services",
                                    "Cleaning Services", 
                                    "Home Renovation",
                                    "Financial Services",
                                    "Auto Services",
                                    "Outdoor Services",
                                    "Moving Services",
                                    "Dining & Entertainment",
                                ].map((interest) => {
                                    const isChecked = formData.interests.includes(interest);
                                    return (
                                        <label
                                            key={interest}
                                            className={`onboarding-interest-item ${isChecked ? 'checked' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            interests: [...prev.interests, interest],
                                                        }));
                                                    } else {
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            interests: prev.interests.filter(
                                                                (i) => i !== interest
                                                            ),
                                                        }));
                                                    }
                                                }}
                                            />
                                            <div className="onboarding-checkbox-custom">
                                                <CheckIcon className="onboarding-checkbox-checkmark" />
                                            </div>
                                            <span className="onboarding-interest-label">{interest}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="onboarding-step-buttons">
                            <button
                                className="onboarding-back-btn"
                                onClick={handleBack}
                            >
                                <ArrowLeftIcon className="w-3 h-3" />
                                Back
                            </button>
                            <button
                                className="onboarding-complete-btn"
                                onClick={handleComplete}
                            >
                                Complete Setup <CheckCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getStepStatus = (stepId) => {
        if (completedSteps.has(stepId)) return 'completed';
        if (stepId === currentStep) return 'active';
        return 'inactive';
    };

    const isStepAccessible = (stepId) => {
        return completedSteps.has(stepId) || stepId === currentStep;
    };

    if (currentStep === 5) {
        if (isInvite) {
             return (
                <div className="onboarding-modal-overlay">
                    <div className="onboarding-modal">
                        <div className="onboarding-progress">
                            <div
                                className="onboarding-progress-bar"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="onboarding-content">
                            <div className="onboarding-success-content">
                                <CheckCircleIcon className="onboarding-success-icon" />
                                <h2>You're all set! 🎊</h2>
                                <p className="onboarding-success-message">
                                    Complete setup to join the community.
                                </p>
                                <button
                                    className="onboarding-finish-btn"
                                    onClick={() => onComplete()}
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                     Finish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        // Success screen for non-invite flow with top recommenders
        return (
            <div className="onboarding-modal-overlay">
                <div className="onboarding-modal">
                    <div className="onboarding-progress">
                        <div
                            className="onboarding-progress-bar"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="onboarding-content">
                        <div className="onboarding-success-content">
                            <UsersIcon className="onboarding-success-icon" />
                            <h2>Follow Top Recommenders in {formData.state}</h2>
                            <p className="onboarding-success-message">
                                Get connected with influential people in your area to kickstart your network.
                            </p>
                            
                            {loadingRecommenders ? (
                                <p>Loading suggestions...</p>
                            ) : topRecommenders.length > 0 ? (
                                <div className="onboarding-recommenders-grid">
                                    {topRecommenders.map(rec => {
                                        const isChecked = selectedRecommenders.has(rec.id);
                                        return (
                                            <label key={rec.id} className={`onboarding-interest-item ${isChecked ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        setSelectedRecommenders(prev => {
                                                            const newSet = new Set(prev);
                                                            if (newSet.has(rec.id)) {
                                                                newSet.delete(rec.id);
                                                            } else {
                                                                newSet.add(rec.id);
                                                            }
                                                            return newSet;
                                                        });
                                                    }}
                                                />
                                                <div className="onboarding-checkbox-custom">
                                                    <CheckIcon className="onboarding-checkbox-checkmark" />
                                                </div>
                                                <img src={rec.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.name)}&background=random&color=fff&size=40`} alt={rec.name} className="onboarding-recommender-avatar" />
                                                <div className="onboarding-recommender-info">
                                                    <span className="onboarding-recommender-name">{rec.name}</span>
                                                    <span className="onboarding-recommender-details">{rec.user_score || 0} Trust Points &bull; {rec.city}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p>No top recommenders found in your state yet. You can build your network later!</p>
                            )}

                            <div className="onboarding-success-buttons">
                                <button
                                    className="onboarding-finish-btn"
                                    onClick={() => handleFinish(true)}
                                    disabled={selectedRecommenders.size === 0}
                                >
                                    <UserPlusIcon className="w-4 h-4" />
                                    Follow Selected ({selectedRecommenders.size}) & Finish
                                </button>
                                <button
                                    className="onboarding-skip-btn"
                                    onClick={() => handleFinish(false)}
                                >
                                    Skip & Finish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="onboarding-modal-overlay">
            <div className="onboarding-modal">
                <div className="onboarding-progress">
                    <div
                        className="onboarding-progress-bar"
                        style={{ width: `${(Math.max(...[...completedSteps, currentStep]) / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="onboarding-content">
                    <div className="onboarding-header">
                        <h2>Hello from Tried & Trusted! 👋</h2>
                        <p>Let's get to know you better</p>
                    </div>

                    {error && <div className="onboarding-error">{error}</div>}

                    <div className="onboarding-steps-container">
                        {steps.map((step) => {
                            const status = getStepStatus(step.id);
                            const isAccessible = isStepAccessible(step.id);
                            const isExpanded = step.id === currentStep;

                            return (
                                <div
                                    key={step.id}
                                    className={`onboarding-step-wrapper ${status}`}
                                >
                                    <button
                                        className={`onboarding-step-toggle ${!isAccessible ? 'disabled' : ''}`}
                                        onClick={() => handleStepClick(step.id)}
                                        disabled={!isAccessible}
                                    >
                                        <div className="onboarding-step-left">
                                            <div className="onboarding-step-number">
                                                {completedSteps.has(step.id) ? '✓' : step.id}
                                            </div>
                                            <div className="onboarding-step-info">
                                                <h3 className="onboarding-step-title">
                                                    {step.icon} {step.title}
                                                </h3>
                                                <p className="onboarding-step-description">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDownIcon 
                                            className={`onboarding-step-chevron ${isExpanded ? 'rotated' : ''}`}
                                        />
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="onboarding-step-content">
                                            {renderStepContent(step.id)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
