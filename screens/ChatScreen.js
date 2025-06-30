import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    Image,
    Platform,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StatusBar,
    Linking,
    KeyboardAvoidingView,
    FlatList,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_CONFIG from '../config';

// Get screen dimensions and handle orientation changes
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate responsive sizes
const scale = SCREEN_WIDTH / 375; // 375 is standard width
const normalize = (size) => Math.round(size * scale);

// Get the status bar height for proper padding
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Create a regular function instead of using hooks outside the component
const createApiClient = (baseUrl) => {
    return axios.create({
        baseURL: baseUrl,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

const ChatScreen = ({ route, navigation }) => {
    // Extract otherUserId, matchId, and userName from route params
    const otherUserId = route.params?.otherUserId;
    const matchId = route.params?.matchId;
    const matchData = route.params?.match;
    
    // Create a user object from the route params
    const user = useMemo(() => {
        // If we have a user object directly, use it
        if (route.params?.user) {
            console.log('Using provided user object:', route.params.user);
            return route.params.user;
        }
        
        // Otherwise create a user object from the other parameters
        const userName = route.params?.userName || 'Unknown Contact';
        console.log('Creating user object with name:', userName);
        return {
            id: otherUserId || '0',
            _id: otherUserId || '0', // Include both formats for compatibility
            name: userName,
            avatar: null
        };
    }, [route.params?.user, otherUserId, route.params?.userName]);

    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [serverUrl, setServerUrl] = useState(API_CONFIG.API_URL);
    const [isOnline, setIsOnline] = useState(false); // Track online status
    const [newMessage, setNewMessage] = useState('');
    
    // Create a memoized API client that updates when serverUrl changes
    const apiClient = useMemo(() => createApiClient(serverUrl), [serverUrl]);

    // Check which server is available - optimized with useCallback
    const checkServer = useCallback(async () => {
        try {
            await axios.get(`${API_CONFIG.API_URL}/api-test`);
            setServerUrl(API_CONFIG.API_URL);
        } catch (error) {
            try {
                await axios.get(`${API_CONFIG.BACKUP_API_URL}/api-test`);
                setServerUrl(API_CONFIG.BACKUP_API_URL);
            } catch (backupError) {
                setError('Server connection failed. Please try again later.');
            }
        }
    }, []);

    // Run server check once on mount
    useEffect(() => {
        checkServer();
    }, [checkServer]);

    // Fetch current user ID from AsyncStorage - optimized with useCallback
    const getCurrentUserId = useCallback(async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            
            if (userData) {
                const parsedUserData = JSON.parse(userData);
                // Use _id if available, otherwise use id
                const userId = parsedUserData._id || parsedUserData.id;
                setCurrentUserId(userId);
                return userId;
            } else {
                // If no user data, use a default ID (this should be handled better in a real app)
                setCurrentUserId('1');
                return '1';
            }
        } catch (error) {
            // Fallback to default ID
            setCurrentUserId('1');
            return '1';
        }
    }, []);

    // Run getCurrentUserId once on mount
    useEffect(() => {
        getCurrentUserId();
    }, [getCurrentUserId]);

    // Fetch message history when both user IDs are available - optimized with useCallback
    const fetchMessages = useCallback(async () => {
        if (!currentUserId || (!user.id && !otherUserId)) return;
        
        const chatPartnerId = otherUserId || user.id;
        
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            const response = await apiClient.get(
                `/api/messages/${currentUserId}/${chatPartnerId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            // Handle the new response format
            if (response.data && response.data.status === 'success' && Array.isArray(response.data.messages)) {
                // Format messages for GiftedChat
                const formattedMessages = response.data.messages.map(msg => ({
                    ...msg,
                    user: {
                        _id: msg.user._id,
                        name: msg.user._id === currentUserId ? 'You' : user.name,
                        avatar: msg.user._id === currentUserId ? null : user.avatar
                    },
                    // Ensure createdAt is a Date object
                    createdAt: new Date(msg.createdAt)
                }));

                // Reverse the order for GiftedChat if needed
                // GiftedChat expects newest messages first
                formattedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                setMessages(formattedMessages);
            } else if (response.data && Array.isArray(response.data)) {
                // Handle old format for backward compatibility
                const formattedMessages = response.data.map(msg => ({
                    ...msg,
                    user: {
                        _id: msg.user._id,
                        name: msg.user._id === currentUserId ? 'You' : user.name,
                        avatar: msg.user._id === currentUserId ? null : user.avatar
                    },
                    createdAt: new Date(msg.createdAt)
                }));

                formattedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setMessages(formattedMessages);
            } else {
                setMessages([]);
            }

            setError(null);
        } catch (error) {
            setError('Failed to load message history');
        } finally {
            setLoading(false);
        }
    }, [currentUserId, user, otherUserId, apiClient]);

    // Run fetchMessages when dependencies change
    useEffect(() => {
        if (currentUserId && (user.id || otherUserId)) {
            fetchMessages();
        }
    }, [fetchMessages, currentUserId, user.id, otherUserId]);

    // Setup Socket.IO connection - optimized with useCallback
    const setupSocketConnection = useCallback(() => {
        if (!currentUserId) return;
        
        // Connect to the Socket.IO server
        const newSocket = io(serverUrl);
        setSocket(newSocket);

        // Join the room with the current user's ID
        newSocket.emit('joinRoom', currentUserId);
        
        // Get the chat partner ID
        const chatPartnerId = otherUserId || user.id;

        // Listen for incoming messages
        newSocket.on('receiveMessage', (message) => {
            // Only add the message if it's from the current chat partner
            if (message.senderId === chatPartnerId) {
                const newMessage = {
                    _id: message._id || Math.random().toString(),
                    text: message.text,
                    createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
                    user: {
                        _id: message.senderId,
                        name: user.name,
                        avatar: user.avatar
                    },
                };

                // Add the new message to the existing messages
                setMessages(previousMessages => [...previousMessages, newMessage]);
            }
        });
        
        return newSocket;
    }, [currentUserId, user, otherUserId, serverUrl]);

    // Setup and cleanup socket connection
    useEffect(() => {
        const newSocket = setupSocketConnection();
        
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [setupSocketConnection]);

    // Show match details function
    const showMatchDetails = useCallback(() => {
        if (matchId) {
            console.log('Navigating to match details with matchId:', matchId);
            navigation.navigate('MatchDetailsScreen', { matchId });
        } else if (matchData) {
            console.log('Match data available but no matchId, creating temp match view');
            Alert.alert(
                'Match Information',
                'This chat is related to a match between a lost and found item.',
                [
                    { text: 'Close', style: 'cancel' }
                ]
            );
        } else {
            console.log('No match information available');
            Alert.alert(
                'No Match Information',
                'This is a direct chat without associated match information.',
                [
                    { text: 'OK' }
                ]
            );
        }
    }, [matchId, matchData, navigation]);

    // Send message - optimized with useCallback
    const onSend = useCallback((newMessages = []) => {
        if (!currentUserId || !socket) {
            return;
        }

        const chatPartnerId = otherUserId || user.id;
        
        // Format the message for GiftedChat
        const giftedMessage = {
            _id: Math.random().toString(),
            text: newMessages[0].text,
            createdAt: new Date(),
            user: {
                _id: currentUserId,
                name: 'You',
            }
        };

        // Add the message to the local state
        setMessages(previousMessages => [...previousMessages, giftedMessage]);

        // Send the message via API
        apiClient.post('/api/messages', {
            receiverId: chatPartnerId,
            senderId: currentUserId,
            text: newMessages[0].text,
        })
            .then(response => {
                // Success case handled silently
            })
            .catch(error => {
                // If API fails, try Socket.IO as fallback
                if (socket) {
                    socket.emit('sendMessage', {
                        receiverId: chatPartnerId,
                        senderId: currentUserId,
                        text: newMessages[0].text,
                    });
                }

                // Show an error alert
                Alert.alert(
                    'Message Status',
                    'Your message might not have been saved. Please check your connection.',
                    [{ text: 'OK' }]
                );
            });
    }, [socket, user, currentUserId, otherUserId, apiClient]);

    // Custom StatusBar component to ensure visibility
    const CustomStatusBar = ({backgroundColor, ...props}) => (
        <View style={[styles.statusBar, { backgroundColor }]}>
            <StatusBar translucent backgroundColor={backgroundColor} {...props} />
        </View>
    );

    // Function to get the first letter of the name for avatar placeholder
    const getInitials = (name) => {
        if (!name) return '??';
        
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        
        return (
            parts[0].charAt(0).toUpperCase() + 
            parts[parts.length - 1].charAt(0).toUpperCase()
        );
    };

    // Render loading state if no messages loaded yet
    if (loading && messages.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3d0c45" />
                <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#3d0c45" barStyle="light-content" translucent={true} />
            
            {/* Main SafeArea wrapper with status bar padding */}
            <SafeAreaView style={styles.safeTopArea} />
            
            {/* Enhanced Chat Header - Outside SafeAreaView to allow custom padding */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation.goBack()}
                        hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    
                    <View style={styles.userInfoContainer}>
                        {user.avatar ? (
                            <Image source={{uri: user.avatar}} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                            </View>
                        )}
                        
                        <View style={styles.userTextInfo}>
                            <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                            <View style={styles.statusContainer}>
                                <View style={[styles.statusDot, {backgroundColor: isOnline ? '#4caf50' : '#bdbdbd'}]} />
                                <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                <View style={styles.headerRight}>
                    {matchId && (
                        <TouchableOpacity 
                            style={styles.matchInfoButton}
                            onPress={showMatchDetails}
                            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                        >
                            <Ionicons name="information-circle" size={28} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content area with safe area bottom padding */}
            <SafeAreaView style={styles.safeContentArea}>
                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3d0c45" />
                        <Text style={styles.loadingText}>Loading messages...</Text>
                    </View>
                )}
                
                {/* Error State */}
                {error && !loading && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={50} color="#f44336" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={fetchMessages}
                        >
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* Chat Messages */}
                {!loading && !error && (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        <View style={styles.chatContainer}>
                            <FlatList
                                data={messages}
                                inverted
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <View style={[
                                        styles.messageContainer,
                                        item.user._id === currentUserId ? styles.sentMessage : styles.receivedMessage
                                    ]}>
                                        <Text style={styles.messageText}>{item.text}</Text>
                                        <Text style={styles.messageTime}>
                                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                )}
                            />
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChangeText={setNewMessage}
                                    multiline
                                />
                                <TouchableOpacity 
                                    style={styles.sendButton}
                                    onPress={() => {
                                        if (newMessage.trim()) {
                                            onSend([{ text: newMessage.trim() }]);
                                            setNewMessage('');
                                        }
                                    }}
                                >
                                    <Ionicons name="send" size={24} color="#3d0c45" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3d0c45',
        paddingTop: STATUSBAR_HEIGHT,
    },
    safeTopArea: {
        flex: 0,
        backgroundColor: '#3d0c45',
    },
    safeContentArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#3d0c45',
        paddingHorizontal: 16,
        paddingTop: STATUSBAR_HEIGHT + 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 10,
        padding: 5,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6a1b9a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userTextInfo: {
        flex: 1,
    },
    userName: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 5,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        opacity: 0.8,
    },
    matchInfoButton: {
        padding: 5,
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginTop: 10,
        marginBottom: 20,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#3d0c45',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chatContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    messageContainer: {
        maxWidth: '80%',
        marginVertical: 5,
        marginHorizontal: 10,
        padding: 10,
        borderRadius: 15,
    },
    sentMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#3d0c45',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    messageTime: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 100,
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
    },
    statusBar: {
        height: STATUSBAR_HEIGHT,
    },
});

export default ChatScreen;