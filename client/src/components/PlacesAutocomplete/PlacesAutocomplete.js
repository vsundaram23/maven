import React, { useState, useEffect, useRef } from "react";
import "./PlacesAutocomplete.css";

const PlaceAutocompleteInput = ({
    onPlaceSelect,
    value,
    onChange,
    placeholder = "Enter a place name or address...",
    allowCustomInput = true,
    className = "",
}) => {
    // State for storing autocomplete predictions
    const [predictions, setPredictions] = useState([]);
    // State to indicate loading status
    const [loading, setLoading] = useState(false);
    // State for any errors during API calls
    const [error, setError] = useState(null);
    // State to track if dropdown is open
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // Ref to store the timeout ID for debouncing
    const debounceTimeoutRef = useRef(null);
    // Ref for the input field
    const inputRef = useRef(null);

    // Effect hook for debouncing API calls
    useEffect(() => {
        // Clear previous timeout if exists
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Only make API call if input value is a string and not empty, and has more than 2 characters
        if (typeof value === "string" && value.length > 2) {
            setLoading(true);
            setError(null);

            // Set a new timeout for debouncing (e.g., 500ms)
            debounceTimeoutRef.current = setTimeout(() => {
                fetchPredictions(value);
            }, 500);
        } else {
            // Clear predictions if input is too short or empty
            setPredictions([]);
            setLoading(false);
            setIsDropdownOpen(false);
        }

        // Cleanup function: clear timeout when component unmounts or value changes
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [value]); // Re-run effect when value changes

    // Function to fetch predictions from Google Places (New) API
    const fetchPredictions = async (input) => {
        const apiKey = "AIzaSyBxRfRgSI7wTeLc4LuBIWSlbv7wpOe49Pc";
        const apiUrl = `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: input,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error?.message ||
                        `HTTP error! status: ${response.status}`
                );
            }

            const data = await response.json();
            console.log(data);
            // Update predictions state with results, ensuring it's an array
            const newPredictions = data.suggestions || [];
            setPredictions(newPredictions);
            setIsDropdownOpen(newPredictions.length > 0);
        } catch (err) {
            console.error("Error fetching place predictions:", err);
            setError(`Failed to fetch suggestions: ${err.message}`);
            setPredictions([]); // Clear predictions on error
            setIsDropdownOpen(false);
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch detailed place information
    const fetchPlaceDetails = async (placeId) => {
        const apiKey = "AIzaSyBxRfRgSI7wTeLc4LuBIWSlbv7wpOe49Pc";
        const fields =
            "id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,addressComponents,location";
        const apiUrl = `https://places.googleapis.com/v1/places/${placeId}?key=${apiKey}&fields=${encodeURIComponent(
            fields
        )}`;

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Place Details API Error:", errorData);
                throw new Error(
                    errorData.error?.message ||
                        `HTTP error! status: ${response.status}`
                );
            }
            const data = await response.json();
            return data;
        } catch (err) {
            console.error("Error fetching place details:", err);
            return null;
        }
    };

    // Handler for input field changes
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        setIsDropdownOpen(true);
    };

    // Handler for selecting a prediction from the list
    const handlePredictionClick = async (prediction) => {

        const selectedText =
            prediction.placePrediction?.text?.text ||
            prediction.description ||
            "";
        onChange(selectedText);
        setPredictions([]);
        setIsDropdownOpen(false);

        // Try different possible locations for placeId
        const placeId =
            prediction.placeId || prediction.placePrediction?.placeId;

        if (placeId) {
            const placeDetails = await fetchPlaceDetails(placeId);

            if (placeDetails && onPlaceSelect) {
                onPlaceSelect({
                    ...prediction,
                    details: placeDetails,
                });
            } else if (onPlaceSelect) {
                onPlaceSelect(prediction);
            }
        } else {
            console.log(
                "No placeId found, calling onPlaceSelect without details"
            );
            if (onPlaceSelect) {
                onPlaceSelect(prediction);
            }
        }
    };

    // Handler for keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setPredictions([]);
            setError(null);
            setIsDropdownOpen(false);
        } else if (e.key === "Enter" && predictions.length > 0) {
            // Select the first prediction on Enter if dropdown is open
            e.preventDefault();
            handlePredictionClick(predictions[0]);
        }
    };

    // Handler for input focus
    const handleFocus = () => {
        if (predictions.length > 0) {
            setIsDropdownOpen(true);
        }
    };

    // Handler for input blur
    const handleBlur = () => {
        // Delay closing dropdown to allow for clicks on predictions
        setTimeout(() => {
            setIsDropdownOpen(false);
        }, 200);
    };

    // Helper function to get location icon based on place type
    const getLocationIcon = (prediction) => {
        // You can customize this based on the place type if available
        return "📍";
    };

    // Helper function to format prediction text
    const formatPredictionText = (prediction) => {
        const mainText =
            prediction.placePrediction?.text?.text ||
            prediction.description ||
            "";
        const secondaryText =
            prediction.placePrediction?.structuredFormat?.secondaryText?.text ||
            "";

        return {
            main: mainText,
            secondary: secondaryText,
        };
    };

    return (
        <div className={`places-autocomplete-container ${className}`}>
            {/* Custom input hint - positioned above the input */}
            {allowCustomInput && (
                <div className="custom-input-hint-above">
                    💡 Choose from one of the suggestions below or enter a
                    custom name
                </div>
            )}

            {/* Input field for place autocomplete */}
            <input
                ref={inputRef}
                type="text"
                value={value || ""}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={`places-autocomplete-input ${
                    value ? "has-value" : ""
                }`}
                autoComplete="off"
                spellCheck="false"
            />

            {/* Loading indicator */}
            {loading && typeof value === "string" && value.length > 2 && (
                <div className="places-loading">Searching for places...</div>
            )}

            {/* Error message */}
            {error && <div className="places-error">{error}</div>}

            {/* Autocomplete predictions list */}
            {isDropdownOpen && predictions.length > 0 && !loading && !error && (
                <ul className="places-predictions">
                    {predictions.map((prediction, index) => {
                        const formattedText = formatPredictionText(prediction);
                        return (
                            <li
                                key={prediction.placeId || `idx-${index}`}
                                onClick={() =>
                                    handlePredictionClick(prediction)
                                }
                                className="places-prediction-item"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handlePredictionClick(prediction);
                                    }
                                }}
                            >
                                <span
                                    className="prediction-icon"
                                    role="img"
                                    aria-label="location"
                                >
                                    {getLocationIcon(prediction)}
                                </span>
                                <div className="prediction-content">
                                    <div className="prediction-main-text">
                                        {formattedText.main}
                                    </div>
                                    {formattedText.secondary && (
                                        <div className="prediction-secondary-text">
                                            {formattedText.secondary}
                                        </div>
                                    )}
                                </div>
                                <div className="prediction-selection-indicator"></div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Empty state when no predictions */}
            {isDropdownOpen &&
                predictions.length === 0 &&
                !loading &&
                !error &&
                value.length > 2 && (
                    <div className="places-predictions">
                        <div className="places-empty-state">
                            {allowCustomInput
                                ? "No places found. You can continue typing to enter a custom recommendation."
                                : "No places found. Try a different search term."}
                        </div>
                    </div>
                )}
        </div>
    );
};

export default PlaceAutocompleteInput;
