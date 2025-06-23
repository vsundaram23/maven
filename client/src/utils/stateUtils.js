import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    UsersIcon
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFullStateName } from "../../utils/stateUtils";
import "./OnboardingModal.css";

const API_URL = "https://api.seanag-recommendations.org:8080";

const numbers = value.replace(/\D/g, "");
if (numbers.length <= 3) return numbers;
if (numbers.length <= 6)
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

const handleNext = () => {
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
    } catch (error) {
        console.error("Error saving onboarding data:", error);
    }
};

const handleStateChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
        ...prev,
        state: getFullStateName(value),
    }));
};

const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const stateNameMap = Object.fromEntries(
  Object.entries(stateMap).map(([abbr, name]) => [name.toLowerCase(), name])
);

export const getFullStateName = (input) => {
  if (!input) return "";
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  // It's an abbreviation
  if (stateMap[upper]) {
    return stateMap[upper];
  }

  // It's a full name (case-insensitive)
  const lower = trimmed.toLowerCase();
  if (stateNameMap[lower]) {
    return stateNameMap[lower];
  }

  // Return as is if no match
  return trimmed;
};

return (
    <div className="onboarding-step">
        <div className="onboarding-step-content">
            <div className="onboarding-step-input">
                <label htmlFor="state">State</label>
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
            {/* ... existing code ... */}
        </div>
    </div>
); 