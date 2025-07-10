
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { FaAward, FaBell, FaCheckCircle, FaCommentDots, FaStar, FaTimes, FaUsers } from 'react-icons/fa';
import { LuTrendingUp } from 'react-icons/lu';
import "./NotificationModal.css";

const BRAND_DARK_BLUE = "#1A365D";

const NotificationModal = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case "recommendation":
        return FaStar;
      case "trust_circle":
        return FaUsers;
      case "level":
        return LuTrendingUp;
      case "review":
      case "comment_on_recommendation": // This correctly maps to FaCommentDots
        return FaCommentDots;
      case "achievement":
        return FaAward;
      case "system":
        return FaCheckCircle;
      default:
        return FaBell;
    }
  };

  // const getNotificationColor = (type) => {
  //   switch (type) {
  //     case "recommendation":
  //       return "#1A365D";
  //     case "trust_circle":
  //       return "#28a745";
  //     case "level":
  //       return "#fd7e14";
  //     case "review":
  //       return "#6f42c1";
  //     case "achievement":
  //       return "#ffc107";
  //     case "system":
  //       return "#20c997";
  //     default:
  //       return "#1A365D";
  //   }
  // };
  const getNotificationColor = (type) => {
    return BRAND_DARK_BLUE;
  };

  const handleNotificationClick = (notification) => {
    onMarkAsRead(notification.id); // Mark as read first

    if (notification.link_url) {
      // Navigate to the URL. Use window.location.href for simplicity,
      // or your router's navigate function (e.g., useNavigate() in React Router v6, router.push() in Next.js)
      window.location.href = notification.link_url;
    }
    onClose(); // Optionally close the modal after clicking a notification
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="notification-modal-overlay" onClick={onClose}>
        <motion.div
          className="notification-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 500 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="notification-modal-header">
            <div className="notification-modal-title-section">
              <h3 className="notification-modal-title">Notifications</h3>
              <p className="notification-modal-subtitle">Stay updated with your latest activity</p>
            </div>
            <div className="notification-modal-actions">
              {unreadCount > 0 && (
                <button 
                  className="notification-mark-all-button"
                  onClick={onMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button 
                className="notification-modal-close"
                onClick={onClose}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="notification-modal-body">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <FaBell className="notification-empty-icon" />
                <p className="notification-empty-text">No notifications yet</p>
                <p className="notification-empty-subtext">We'll notify you when something important happens</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.unread ? 'notification-item-unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-item-content">
                      <div 
                        className="notification-item-icon"
                        style={{ backgroundColor: iconColor }}
                      >
                        <IconComponent />
                      </div>
                      <div className="notification-item-body">
                        <div className="notification-item-header">
                          <h4 className="notification-item-title">{notification.title}</h4>
                          {notification.unread && (
                            <div className="notification-unread-dot" />
                          )}
                        </div>
                        <p className="notification-item-message">{notification.message}</p>
                        <p className="notification-item-time">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationModal;


// import { AnimatePresence, motion } from "framer-motion";
// import React from "react";
// import { FaAward, FaBell, FaCheckCircle, FaCommentDots, FaStar, FaTimes, FaUsers } from 'react-icons/fa';
// import { LuTrendingUp } from 'react-icons/lu';
// import "./NotificationModal.css";

// // Define your consistent dark blue color here
// const BRAND_DARK_BLUE = "#1A365D"; // From your .css .notification-modal-title


//   const getNotificationColor = (type) => {
//     // All types will now use the consistent brand dark blue, as per your request
//     return BRAND_DARK_BLUE;
//   };

//   const unreadCount = notifications.filter(n => n.unread).length;

//   if (!isOpen) return null;

//   return (
//     <AnimatePresence>
//       <div className="notification-modal-overlay" onClick={onClose}>
//         <motion.div
//           className="notification-modal-content"
//           initial={{ opacity: 0, scale: 0.9, y: 20 }}
//           animate={{ opacity: 1, scale: 1, y: 0 }}
//           exit={{ opacity: 0, scale: 0.9, y: 20 }}
//           transition={{ type: "spring", damping: 25, stiffness: 500 }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div className="notification-modal-header">
//             <div className="notification-modal-title-section">
//               <h3 className="notification-modal-title">Notifications</h3>
//               <p className="notification-modal-subtitle">Stay updated with your latest activity</p>
//             </div>
//             <div className="notification-modal-actions">
//               {unreadCount > 0 && (
//                 <button
//                   className="notification-mark-all-button"
//                   onClick={onMarkAllAsRead}
//                 >
//                   Mark all read
//                 </button>
//               )}
//               <button
//                 className="notification-modal-close"
//                 onClick={onClose}
//               >
//                 <FaTimes />
//               </button>
//             </div>
//           </div>

//           <div className="notification-modal-body">
//             {notifications.length === 0 ? (
//               <div className="notification-empty-state">
//                 <FaBell className="notification-empty-icon" />
//                 <p className="notification-empty-text">No notifications yet</p>
//                 <p className="notification-empty-subtext">We'll notify you when something important happens</p>
//               </div>
//             ) : (
//               notifications.map((notification) => {
//                 const IconComponent = getNotificationIcon(notification.type);
//                 const iconColor = getNotificationColor(notification.type);

//                 return (
//                   <div
//                     key={notification.id}
//                     className={`notification-item ${notification.unread ? 'notification-item-unread' : ''}`}
//                     onClick={() => handleNotificationClick(notification)}
//                   >
//                     <div className="notification-item-content">
//                       <div
//                         className="notification-item-icon"
//                         style={{ backgroundColor: iconColor }}
//                       >
//                         <IconComponent />
//                       </div>
//                       <div className="notification-item-body">
//                         <div className="notification-item-header">
//                           {/* THIS IS THE ONLY CHANGE: Force title to "Notification" or use backend's title if it's consistently generic */}
//                           <h4 className="notification-item-title">
//                             {notification.title || 'Notification'} {/* Use backend title if present, else default to 'Notification' */}
//                           </h4>
//                           {notification.unread && (
//                             <div className="notification-unread-dot" />
//                           )}
//                         </div>
//                         {/* This now displays the full content with preview from the backend trigger */}
//                         <p className="notification-item-message">{notification.content}</p>
//                         <p className="notification-item-time">{notification.time}</p>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </motion.div>
//       </div>
//     </AnimatePresence>
//   );
// };

// export default NotificationModal;