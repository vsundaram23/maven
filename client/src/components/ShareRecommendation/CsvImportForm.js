// src/components/ShareRecommendation/CsvImportForm.jsx

import React, { useState } from "react";
import Papa from "papaparse";
import {
    DocumentTextIcon,
    XCircleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { API_URL, CSV_HEADERS_SCHEMA } from "../../utils/constants";
import { useNavigate } from "react-router-dom";

// Helper functions (moved here as per your request)
const processTags = (tagString) => {
    if (!tagString) return [];
    const processedTags = tagString
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return [...new Set(processedTags)];
};

const validateRecommendation = (row) => {
    const errors = [];

    // Required fields
    if (!row.business_name?.trim()) {
        errors.push("Business Name is required");
    }
    if (!row.recommender_message?.trim()) {
        errors.push("Experience description is required");
    }
    if (!row.rating) {
        errors.push("Rating is required");
    }

    // Type validations
    const rating = parseInt(row.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push("Rating must be a number between 1 and 5");
    }

    // Phone number validation (if provided)
    if (row.phone_number) {
        const digitsOnly = row.phone_number.replace(/\D/g, "");
        if (digitsOnly.length !== 10) {
            errors.push("Phone number must be 10 digits");
        }
    }

    return errors;
};

// MessageDisplay component (moved here as per your request)
const MessageDisplay = ({ message }) => {
    if (!message) return null;

    const isError = message.startsWith("error:");
    const displayMessage = message.substring(message.indexOf(":") + 1);

    return (
        <div className={`message ${isError ? "error" : "success"} visible`}>
            {isError ? <XCircleIcon /> : <CheckCircleIcon />}
            <span>{displayMessage}</span>
        </div>
    );
};

export default function CsvImportForm({ userEmail, navigate }) {
    const [csvData, setCsvData] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvFileName, setCsvFileName] = useState("");
    const [csvError, setCsvError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null); // Keep this for file input reset
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [uploadStatus, setUploadStatus] = useState({
        isUploading: false,
        success: 0,
        failed: 0,
        errors: [],
    });
    const [message, setMessage] = useState(""); // For overall status message outside modal

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setCsvFileName(file.name);
            setSelectedFile(file); // Store file to allow reset
            setCsvError("");
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        setCsvError(
                            `CSV Parsing Error: ${results.errors[0].message}`
                        );
                        setCsvData([]);
                        setCsvHeaders([]);
                    } else {
                        if (results.data.length > 0) {
                            setCsvHeaders(Object.keys(results.data[0]));
                            setCsvData(results.data);
                            setShowPreviewModal(true);
                        } else {
                            setCsvError(
                                "CSV file is empty or has no valid data."
                            );
                            setCsvData([]);
                            setCsvHeaders([]);
                        }
                    }
                },
                error: (err) => {
                    setCsvError(`Error reading file: ${err.message}`);
                    setCsvData([]);
                    setCsvHeaders([]);
                },
            });
        } else {
            setCsvFileName("");
            setSelectedFile(null);
            setCsvError("");
            setCsvData([]);
            setCsvHeaders([]);
        }
    };

    const handleCellChange = (rowIndex, columnKey, value) => {
        setCsvData((prevData) => {
            const newData = [...prevData];
            newData[rowIndex] = {
                ...newData[rowIndex],
                [columnKey]: value,
            };
            return newData;
        });
    };

    const handleUploadCsvData = async () => {
        if (!csvData.length) {
            setCsvError("No data to upload");
            return;
        }

        setUploadStatus({
            isUploading: true,
            success: 0,
            failed: 0,
            errors: [],
        });
        setMessage(""); // Clear any previous general messages

        const results = [];

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];

            let publishScopeFromCsv =
                row[
                    "Publish Scope (Public/Specific Trust Circles/Full Trust Circle, Optional)"
                ] || "Full Trust Circle";
            if (publishScopeFromCsv === "Entire Trust Circle") {
                publishScopeFromCsv = "Full Trust Circle";
            }

            // Transform CSV columns to API fields
            const transformedData = {
                user_email: userEmail,
                business_name: row["Business Name"]?.trim(),
                recommender_message: row["Your Experience"]?.trim(),
                rating: parseInt(row["Rating (1-5)"]),
                provider_contact_name:
                    row["Provider Contact Name (Optional)"]?.trim() || null,
                website: row["Website (Optional)"]?.trim() || null,
                phone_number: row["Phone (Optional)"]?.trim() || null,
                tags: processTags(row["Tags (comma-separated, Optional)"]),
                publish_scope: publishScopeFromCsv,
                trust_circle_ids:
                    row[
                        "Trust Circle IDs (comma-separated if Specific Trust Circles, Optional)"
                    ]
                        ?.split(",")
                        .map((id) => id.trim())
                        .filter((id) => id) || [],
                email: null, // We don't use this field as we're using Clerk
            };

            // Validate the row
            const validationErrors = validateRecommendation(transformedData);

            if (validationErrors.length > 0) {
                results.push({
                    success: false,
                    rowIndex: i + 1,
                    errors: validationErrors,
                });
                setUploadStatus((prev) => ({
                    ...prev,
                    failed: prev.failed + 1,
                    errors: [
                        ...prev.errors,
                        `Row ${i + 1}: ${validationErrors.join(", ")}`,
                    ],
                }));
                continue;
            }

            try {
                const formData = new FormData();
                formData.append("data", JSON.stringify(transformedData));

                const response = await fetch(`${API_URL}/api/recommendations`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response
                        .json()
                        .catch(() => ({ message: "Network or server error" }));
                    throw new Error(
                        errorData.message ||
                            `Request failed with status ${response.status}`
                    );
                }

                results.push({
                    success: true,
                    rowIndex: i + 1,
                });

                setUploadStatus((prev) => ({
                    ...prev,
                    success: prev.success + 1,
                }));
            } catch (error) {
                results.push({
                    success: false,
                    rowIndex: i + 1,
                    errors: [error.message],
                });

                setUploadStatus((prev) => ({
                    ...prev,
                    failed: prev.failed + 1,
                    errors: [...prev.errors, `Row ${i + 1}: ${error.message}`],
                }));
            }
        }

        // Final status update
        setUploadStatus((prev) => ({ ...prev, isUploading: false }));

        // Handle completion
        if (results.every((r) => r.success)) {
            // All successful
            setMessage("success:All recommendations uploaded successfully");
            setShowPreviewModal(false);
            setCsvData([]);
            setCsvHeaders([]);
            setCsvFileName("");
            setSelectedFile(null); // Reset the file input

            // Redirect after a delay
            setTimeout(() => navigate("/"), 2500);
        } else if (results.some((r) => r.success)) {
            // Partial success - the message will be updated by the final uploadStatus state
            setMessage(
                `warning:${uploadStatus.success} recommendations uploaded, ${uploadStatus.failed} failed`
            );
        } else {
            // All failed
            setMessage(
                "error:Failed to upload any recommendations. Please check the errors and try again."
            );
        }
    };

    return (
        <div className="csv-import-section">
            <DocumentTextIcon className="csv-icon" />{" "}
            <h2>Import Recommendations via CSV</h2>{" "}
            <p>
                Prepare your CSV file with columns following the exact naming
                schema below:{" "}
            </p>{" "}
            <code>{CSV_HEADERS_SCHEMA}</code>{" "}
            <div className="form-group file-upload-group">
                <label htmlFor="csvFile" className="btn btn-secondary">
                    Choose CSV File
                </label>
                <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    value={selectedFile ? undefined : ''} // Reset trick for file input
                />
                {csvFileName && (
                    <span className="file-name">
                        <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                        {csvFileName}
                    </span>
                )}
            </div>
            {csvError && (
                <MessageDisplay message={`error:${csvError}`} />
            )}
            {/* CSV Preview Modal */}
            {showPreviewModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <div
                        className="csv-preview-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Preview Recommendations</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowPreviewModal(false)}
                            >
                                <XCircleIcon />
                            </button>
                        </div>

                        <div className="modal-info">
                            <div className="preview-info">
                                <p className="preview-title">
                                    Review and edit your recommendations before
                                    uploading
                                </p>
                                <p className="preview-count">
                                    {csvData.length} recommendations found
                                </p>
                            </div>

                            <div className="table-container">
                                <table className="csv-preview-table">
                                    <thead>
                                        <tr>
                                            {csvHeaders.map((header) => (
                                                <th key={header}>{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvData.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {csvHeaders.map((header) => (
                                                    <td
                                                        key={`${rowIndex}-${header}`}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                row[header] ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleCellChange(
                                                                    rowIndex,
                                                                    header,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="csv-table-input"
                                                            placeholder={`Enter ${header}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <div className="upload-status">
                                {uploadStatus.isUploading && (
                                    <p className="uploading-message">
                                        <ArrowPathIcon className="animate-spin" />
                                        Uploading... ({uploadStatus.success}{" "}
                                        successful, {uploadStatus.failed}{" "}
                                        failed)
                                    </p>
                                )}
                                {uploadStatus.errors.length > 0 && (
                                    <div className="upload-errors">
                                        {uploadStatus.errors.map(
                                            (error, index) => (
                                                <p
                                                    key={index}
                                                    className="error-message"
                                                >
                                                    {error}
                                                </p>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="modal-btn secondary"
                                    onClick={() => setShowPreviewModal(false)}
                                    disabled={uploadStatus.isUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="modal-btn primary"
                                    onClick={handleUploadCsvData}
                                    disabled={
                                        csvData.length === 0 ||
                                        uploadStatus.isUploading
                                    }
                                >
                                    <CheckCircleIcon className="icon" />
                                    {uploadStatus.isUploading
                                        ? `Uploading (${uploadStatus.success}/${csvData.length})`
                                        : `Upload ${csvData.length} Recommendations`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Overall status message for CSV import, displayed outside the modal */}
            {message && !showPreviewModal && (
                <MessageDisplay message={message} />
            )}
        </div>
    );
}