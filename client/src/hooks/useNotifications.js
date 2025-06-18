import { useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const useNotifications = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isLoadingCount, setIsLoadingCount] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    
    // Cache and rate limiting
    const lastFetchTime = useRef(0);
    const fetchTimer = useRef(null);
    const CACHE_DURATION = 30 * 1000; // 30 seconds
    const MIN_FETCH_INTERVAL = 10 * 1000; // 10 seconds minimum between requests
    
    // Debounced fetch function
    const debouncedFetch = useCallback((fetchFn, delay = 1000) => {
        if (fetchTimer.current) {
            clearTimeout(fetchTimer.current);
        }
        
        fetchTimer.current = setTimeout(() => {
            fetchFn();
        }, delay);
    }, []);

    // Check if we should fetch (rate limiting)
    const shouldFetch = useCallback(() => {
        const now = Date.now();
        return now - lastFetchTime.current > MIN_FETCH_INTERVAL;
    }, []);

    // Fetch unread count with caching
    const fetchUnreadCount = useCallback(async (force = false) => {
        if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
            setUnreadCount(0);
            return;
        }

        if (!force && !shouldFetch()) {
            console.log('Rate limited: notification count fetch skipped');
            return;
        }

        setIsLoadingCount(true);
        lastFetchTime.current = Date.now();

        try {
            const params = new URLSearchParams({
                user_id: user.id,
                email: user.primaryEmailAddress.emailAddress,
            });
            
            const response = await fetch(`${API_URL}/api/notifications/unread-count?${params.toString()}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUnreadCount(data.unreadCount || 0);
                    console.log(`Notification count: ${data.unreadCount} (cached: ${data.cached})`);
                } else {
                    console.error("API returned unsuccessful response:", data.message);
                }
            } else if (response.status === 429) {
                console.log('Rate limited by server, will retry later');
                // Don't update lastFetchTime on rate limit
                lastFetchTime.current = lastFetchTime.current - MIN_FETCH_INTERVAL;
            } else {
                console.error("Failed to fetch unread notifications count:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching unread notifications count:", error);
        } finally {
            setIsLoadingCount(false);
        }
    }, [isLoaded, isSignedIn, user, shouldFetch]);

    // Fetch full notifications list
    const fetchNotifications = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
            setNotifications([]);
            return;
        }

        setIsLoadingNotifications(true);
        try {
            const params = new URLSearchParams({
                user_id: user.id,
                email: user.primaryEmailAddress.emailAddress,
                limit: '20'
            });
            
            const response = await fetch(`${API_URL}/api/notifications/?${params.toString()}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const transformedNotifications = data.notifications.map(notification => ({
                        id: notification.id,
                        type: notification.type,
                        title: getNotificationTitle(notification.type),
                        message: notification.content,
                        time: formatTimeAgo(notification.created_at),
                        unread: !notification.is_read,
                        link_url: notification.link_url
                    }));
                    setNotifications(transformedNotifications);
                } else {
                    console.error("API returned unsuccessful response:", data.message);
                    setNotifications([]);
                }
            } else {
                console.error("Failed to fetch notifications:", response.statusText);
                setNotifications([]);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
        } finally {
            setIsLoadingNotifications(false);
        }
    }, [isLoaded, isSignedIn, user]);

    // Mark single notification as read
    const markAsRead = useCallback(async (notificationId) => {
        // Optimistic update
        setNotifications(prev => 
            prev.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, unread: false }
                    : notification
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const response = await fetch(`${API_URL}/api/notifications/${notificationId}/mark-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.primaryEmailAddress.emailAddress
                })
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
            // Revert optimistic update
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, unread: true }
                        : notification
                )
            );
            setUnreadCount(prev => prev + 1);
        }
    }, [user]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        const unreadCountBefore = notifications.filter(n => n.unread).length;
        
        // Optimistic update
        setNotifications(prev => 
            prev.map(notification => ({ ...notification, unread: false }))
        );
        setUnreadCount(0);

        try {
            const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.primaryEmailAddress.emailAddress
                })
            });

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            // Revert optimistic update
            setNotifications(prev => 
                prev.map((notification, index) => 
                    index < unreadCountBefore ? { ...notification, unread: true } : notification
                )
            );
            setUnreadCount(unreadCountBefore);
        }
    }, [notifications, user]);

    // Helper functions
    const getNotificationTitle = (type) => {
        const titles = {
            recommendation: "New recommendation match",
            trust_circle: "Trust Circle update",
            level: "Level progress",
            review: "Review request",
            achievement: "Achievement unlocked",
            system: "System notification"
        };
        return titles[type] || "Notification";
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) === 1 ? '' : 's'} ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    };

    // Initial fetch on mount (debounced)
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            debouncedFetch(() => fetchUnreadCount(false), 500);
        }
    }, [isLoaded, isSignedIn, user, debouncedFetch, fetchUnreadCount]);

    // Smart polling - only poll if user is active and hasn't fetched recently
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const interval = setInterval(() => {
            // Only fetch if the page is visible and we haven't fetched recently
            if (document.visibilityState === 'visible' && shouldFetch()) {
                fetchUnreadCount(false);
            }
        }, 60000); // Check every minute, but respect rate limiting

        return () => clearInterval(interval);
    }, [isLoaded, isSignedIn, fetchUnreadCount, shouldFetch]);

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (fetchTimer.current) {
                clearTimeout(fetchTimer.current);
            }
        };
    }, []);

    return {
        unreadCount,
        notifications,
        isLoadingCount,
        isLoadingNotifications,
        fetchUnreadCount: () => debouncedFetch(() => fetchUnreadCount(true), 100),
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        // Force refresh (for pull-to-refresh or manual refresh)
        forceRefresh: () => {
            lastFetchTime.current = 0; // Reset rate limiting
            fetchUnreadCount(true);
        }
    };
};

export default useNotifications; 