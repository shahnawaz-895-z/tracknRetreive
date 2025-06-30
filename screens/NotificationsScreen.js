import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    AppState,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const isFocused = useIsFocused();
    const appState = useRef(AppState.currentState);
    const pollingIntervalRef = useRef(null);
    const lastPolledRef = useRef(Date.now());

    // Get user ID from storage
    const getUserId = useCallback(async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            return userData ? JSON.parse(userData).id : null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    }, []);

    // Fetch notifications with unified logic
    const fetchNotifications = useCallback(async (pageNum = 1, isRefreshing = false) => {
        try {
            setRefreshing(isRefreshing);
            if (!isRefreshing) setLoading(true);
            
            const userId = await getUserId();
            if (!userId) return;

            // Fetch regular notifications
            const notificationsRes = await fetch(
                `${API_CONFIG.API_URL}/api/notifications/${userId}?page=${pageNum}&limit=10`
            );
            
            if (!notificationsRes.ok) {
                throw new Error('Failed to fetch notifications');
            }
            
            const notificationsData = await notificationsRes.json();
            const notificationsList = notificationsData.notifications || [];

            // Transform notifications to include more details
            const transformedNotifications = notificationsList.map(notification => {
                if (notification.type === 'item_reposted') {
                    return {
                        ...notification,
                        title: 'New Lost Item Reported',
                        message: `A user has reported a lost item: ${notification.itemDescription}`,
                        location: notification.location,
                        timestamp: notification.createdAt,
                        icon: 'alert-circle-outline'
                    };
                }
                return notification;
            });

            // Fetch matches
            const matchesRes = await fetch(
                `${API_CONFIG.API_URL}/api/matches/user/${userId}`
            );
            
            const matchesData = matchesRes.ok 
                ? await matchesRes.json() 
                : { matches: [] };
            
            // Transform matches to notifications
            const matchNotifications = (matchesData.matches || []).map(match => ({
                _id: `match_${match._id}`,
                type: 'match_found',
                title: "Potential Match Found!",
                message: `Your lost item matches with a found item (${Math.round((match.similarityScore || 0) * 100)}% similarity)`,
                createdAt: match.createdAt || new Date().toISOString(),
                read: false,
                matchId: match._id,
                similarityScore: match.similarityScore,
                lostItemId: match.lostItemId?._id,
                foundItemId: match.foundItemId?._id,
                lostItemDescription: match.lostItemId?.description,
                foundItemDescription: match.foundItemId?.description,
                location: match.lostItemId?.location,
                isLostItemUser: match.lostUserId === userId,
                isFoundItemUser: match.foundUserId === userId,
                icon: 'target'
            }));

            // Combine and sort notifications
            const combined = [...matchNotifications, ...transformedNotifications]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setNotifications(prev => 
                isRefreshing || pageNum === 1 ? combined : [...prev, ...combined]
            );
            setHasMore(notificationsData.hasMore || false);
            setPage(pageNum);
            setUnreadCount(combined.filter(n => !n.read).length);
            
        } catch (error) {
            console.error('Fetch error:', error);
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Poll for new notifications
    const pollNotifications = useCallback(async () => {
        if (!isFocused || appState.current !== 'active') return;
        
        try {
            const userId = await getUserId();
            if (!userId) return;

            const lastPolled = lastPolledRef.current;
            const now = Date.now();
            
            const res = await fetch(
                `${API_CONFIG.API_URL}/api/notifications/poll/${userId}?lastPolled=${lastPolled}`
            );
            
            lastPolledRef.current = now;
            
            if (res.ok) {
                const data = await res.json();
                if (data.notifications?.length > 0) {
                    setNotifications(prev => [
                        ...data.notifications,
                        ...prev
                    ]);
                    
                    // Show alert for unread notifications
                    const unread = data.notifications.filter(n => !n.read);
                    if (unread.length > 0) {
                        Alert.alert(
                            'New Notification',
                            unread[0].message,
                            [{ text: 'OK' }]
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [isFocused]);

    // Manage polling with app state
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            appState.current = nextAppState;
            if (nextAppState === 'active' && isFocused) {
                // Start polling when app becomes active
                pollingIntervalRef.current = setInterval(
                    pollNotifications, 
                    API_CONFIG.POLLING_INTERVAL || 30000
                );
            } else if (pollingIntervalRef.current) {
                // Stop polling when app goes to background
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        // Initial setup
        if (isFocused) {
            pollingIntervalRef.current = setInterval(
                pollNotifications, 
                API_CONFIG.POLLING_INTERVAL || 30000
            );
        }

        return () => {
            subscription.remove();
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isFocused, pollNotifications]);

    // Initial data fetch
    useEffect(() => {
        if (isFocused) {
            fetchNotifications(1, true);
        }
    }, [isFocused]);

    // Mark notification as read
    const markAsRead = async (id) => {
        try {
            await fetch(`${API_CONFIG.API_URL}/api/notifications/${id}/read`, {
                method: 'PUT'
            });
            
            setNotifications(prev => 
                prev.map(n => n._id === id ? {...n, read: true} : n)
            );
        } catch (error) {
            console.error('Mark read error:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const userId = await getUserId();
            if (!userId) return;

            await fetch(`${API_CONFIG.API_URL}/api/notifications/${userId}/read-all`, {
                method: 'PUT'
            });
            
            setNotifications(prev => 
                prev.map(n => ({...n, read: true}))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Mark all read error:', error);
        }
    };

    // Handle notification press
    const handleNotificationPress = (item) => {
        if (!item.read) markAsRead(item._id);
        
        if (item.type === 'match_found' && item.matchId) {
            navigation.navigate('MatchDetailsScreen', { 
                matchId: item.matchId,
                lostItemId: item.lostItemId,
                foundItemId: item.foundItemId
            });
        } else if (item.itemId) {
            navigation.navigate('ItemDetails', { 
                itemId: item.itemId,
                itemType: item.itemType || 'lost'
            });
        }
    };

    // Render notification item
    const renderNotification = ({ item }) => {
        const isUnread = !item.read;
        const isMatch = item.type === 'match_found';
        const isReposted = item.type === 'item_reposted';

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    isUnread && styles.unreadNotification,
                    isMatch && styles.matchNotification,
                    isReposted && styles.repostedNotification
                ]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={styles.notificationContent}>
                    <Icon
                        name={item.icon || (isMatch ? 'target' : 'bell')}
                        size={24}
                        color={isMatch ? '#FF6B6B' : '#3D0C45'}
                        style={styles.icon}
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.message}>{item.message}</Text>
                        {item.location && (
                            <Text style={styles.location}>
                                <Icon name="map-marker" size={14} color="#666" /> {item.location}
                            </Text>
                        )}
                        <Text style={styles.time}>
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </Text>
                    </View>
                    {isUnread && <View style={styles.unreadBadge} />}
                </View>
                
                {isMatch && (
                    <View style={styles.matchDetails}>
                        <View style={styles.matchInfoRow}>
                            <Text style={styles.matchLabel}>Match Score:</Text>
                            <Text style={styles.matchValue}>
                                {Math.round((item.similarityScore || 0) * 100)}%
                            </Text>
                        </View>
                        {item.lostItemDescription && (
                            <Text style={styles.matchDescription}>
                                Lost Item: {item.lostItemDescription}
                            </Text>
                        )}
                        {item.foundItemDescription && (
                            <Text style={styles.matchDescription}>
                                Found Item: {item.foundItemDescription}
                            </Text>
                        )}
                        <TouchableOpacity 
                            style={styles.viewMatchButton}
                            onPress={() => handleNotificationPress(item)}
                        >
                            <Text style={styles.viewMatchButtonText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#3D0C45" barStyle="light-content" />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <View style={styles.unreadCountBadge}>
                            <Text style={styles.unreadCountText}>{unreadCount}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.headerButton}>Mark all read</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && page === 1 ? (
                <ActivityIndicator size="large" color="#3D0C45" style={styles.loader} />
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => fetchNotifications(1, true)}
                    >
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={item => item._id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchNotifications(1, true)}
                            colors={['#3D0C45']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="bell-off" size={48} color="#CCCCCC" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                    onEndReached={() => {
                        if (!loading && hasMore) {
                            fetchNotifications(page + 1);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loading && page > 1 ? (
                            <ActivityIndicator size="small" color="#3D0C45" />
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#3D0C45',
        paddingTop: STATUSBAR_HEIGHT + 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        color: 'white',
        fontSize: 14,
        marginLeft: 10,
    },
    unreadCountBadge: {
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadCountText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    notificationItem: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    unreadNotification: {
        backgroundColor: '#F5F0FF',
    },
    matchNotification: {
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B6B',
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    icon: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3D0C45',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    unreadBadge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6B6B',
        marginLeft: 8,
    },
    matchDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    matchInfoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    matchLabel: {
        fontWeight: 'bold',
        color: '#3D0C45',
        marginRight: 5,
    },
    matchValue: {
        color: '#FF6B6B',
        fontWeight: 'bold',
    },
    viewMatchButton: {
        backgroundColor: '#3D0C45',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    viewMatchButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    loader: {
        marginTop: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#FF6B6B',
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#3D0C45',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    repostedNotification: {
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    location: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        marginBottom: 4,
    },
    matchDescription: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
        fontStyle: 'italic',
    },
});