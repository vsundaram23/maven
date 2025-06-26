import { CheckCircleIcon } from "@heroicons/react/24/outline";
import React from 'react';
import './SuccessModal.css';

const SuccessModal = ({ isOpen, onClose, message, title = "Success!" }) => {
    if (!isOpen) return null;

    return (
        <div className="success-modal-overlay">
            <div className="success-modal">
                <CheckCircleIcon className="success-modal-icon" />
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="success-modal-actions">
                    <button onClick={onClose} className="modal-btn primary">
                        Awesome!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal; 