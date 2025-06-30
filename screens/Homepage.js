import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  AppState,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_CONFIG from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

// Constants
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const { width, height } = Dimensions.get('window');
const ACTIVITY_STORAGE_KEY = 'user_activities';
const POLLING_INTERVAL = 15000; // Poll every 15 seconds

const HomePage = () => {
  const navigation = useNavigation();
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(2);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [lastPolled, setLastPolled] = useState(null);
  const pollingInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [geolocation, setGeolocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [location, setLocation] = useState('');
  
  // Sample notifications data
  const notificationsData = [
    { 
      id: '1', 
      type: 'match', 
      title: 'New Match Found!', 
      message: 'Your lost "Blue Wallet" matches with a found item', 
      time: '2 mins ago', 
      read: false, 
      itemId: '1',
      matchConfidence: 85
    },
    { 
      id: '2', 
      type: 'message', 
      title: 'New Message', 
      message: 'Sarah: "I think I found your wallet. Can we meet?"', 
      time: '1 hour ago', 
      read: false, 
      chatId: '1',
      sender: 'Sarah'
    },
    { 
      id: '3', 
      type: 'match', 
      title: 'Potential Match', 
      message: 'Your found "iPhone 13" might match with a lost item', 
      time: '3 hours ago', 
      read: true, 
      itemId: '2',
      matchConfidence: 75
    },
    { 
      id: '4', 
      type: 'message', 
      title: 'New Message', 
      message: 'John: "Is this your laptop? I found it in the library"', 
      time: 'Yesterday', 
      read: true, 
      chatId: '2',
      sender: 'John'
    }
  ];

  // Activity data state
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch user data and activity on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setUserId(parsedUserData._id);
          setUserName(parsedUserData.name);
        }
        
        // Fetch activities from AsyncStorage
        await fetchActivitiesFromStorage();
      } catch (error) {
        console.error('Error fetching user data:', error);
        setDemoActivity();
        setLoading(false);
      }
    };

    fetchUserData();

    // Add listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh activities when screen is focused
      fetchActivitiesFromStorage();
    });

    // Clean up the listener when component unmounts
    return unsubscribe;
  }, [navigation]);

  // Fetch activities from AsyncStorage
  const fetchActivitiesFromStorage = async () => {
    try {
      setLoading(true);
      
      const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      
      if (storedActivities) {
        const parsedActivities = JSON.parse(storedActivities);
        parsedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setActivities(parsedActivities.slice(0, 3));
      } else {
        await initializeActivities();
      }
    } catch (error) {
      console.error('Error fetching activities from storage:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize activities with demo data and store in AsyncStorage
  const initializeActivities = async () => {
    try {
      const demoActivities = generateDemoActivities();
      await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(demoActivities));
      setActivities(demoActivities.slice(0, 3));
    } catch (error) {
      console.error('Error initializing activities:', error);
      setActivities([]);
    }
  };

  // Generate demo activity data
  const generateDemoActivities = () => {
    const demoActivities = [
      { 
        id: '1', 
        type: 'lost', 
        title: 'Blue Wallet', 
        date: '2 days ago', 
        status: 'pending', 
        location: 'University Library',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '2', 
        type: 'found', 
        title: 'iPhone 13', 
        date: '1 week ago', 
        status: 'matched', 
        location: 'Central Park',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '3', 
        type: 'lost', 
        title: 'Car Keys', 
        date: '3 days ago', 
        status: 'pending', 
        location: 'Shopping Mall',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '4', 
        type: 'found', 
        title: 'Laptop Bag', 
        date: '5 days ago', 
        status: 'matched', 
        location: 'Coffee Shop',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '5', 
        type: 'lost', 
        title: 'Headphones', 
        date: '1 week ago', 
        status: 'returned', 
        location: 'Gym',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Sort by most recent first
    demoActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return demoActivities;
  };

  // Set demo activity data (fallback)
  const setDemoActivity = () => {
    const demoActivities = generateDemoActivities();
    setActivities(demoActivities.slice(0, 3));
  };

  // Add a new activity and store in AsyncStorage
  const addNewActivity = async (activity) => {
    try {
      // Generate a unique ID
      activity.id = Date.now().toString();
      
      // Add timestamp
      activity.timestamp = new Date().toISOString();
      
      // Format relative date (e.g., "2 mins ago")
      activity.date = 'Just now';
      
      // Get existing activities
      const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      let activities = [];
      
      if (storedActivities) {
        activities = JSON.parse(storedActivities);
      }
      
      // Add new activity
      activities.unshift(activity);
      
      // Store updated activities
      await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
      
      // Update state with the 3 most recent activities
      setActivities(activities.slice(0, 3));
      
      return activity;
    } catch (error) {
      console.error('Error adding new activity:', error);
      return null;
    }
  };

  // Update an existing activity
  const updateActivity = async (activityId, updates) => {
    try {
      // Get existing activities
      const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      
      if (storedActivities) {
        let activities = JSON.parse(storedActivities);
        
        // Find and update the activity
        const updatedActivities = activities.map(activity => {
          if (activity.id === activityId) {
            return { ...activity, ...updates };
          }
          return activity;
        });
        
        // Store updated activities
        await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updatedActivities));
        
        // Update state with the 3 most recent activities
        setActivities(updatedActivities.slice(0, 3));
      }
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleReportLostItem = () => {
    navigation.navigate('ReportLostItem');
  };

  const handleReportFoundItem = () => {
    navigation.navigate('ReportFoundItem');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => navigation.replace('Login') }
      ]
    );
  };

  const handleProfile = () => {
    navigation.navigate('ProfileScreen');
  };

  const toggleNotifications = () => {
    setNotificationVisible(!notificationVisible);
  };

  const navigateToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const handleNotificationPress = (notification) => {
    setNotificationVisible(false);
    switch(notification.type) {
      case 'match':
        // Create a proper match object for the MatchDetailsScreen
        const matchData = {
          id: notification.itemId,
          lostItemId: notification.itemId,
          foundItemId: `found-${notification.itemId}`,
          lostItemDescription: notification.message.split(' matches with ')[0],
          foundItemDescription: notification.message.split(' matches with ')[1],
          foundLocation: 'Location',
          foundDate: new Date().toISOString(),
          matchConfidence: 85,
          status: 'pending',
          foundByUser: {
            id: 'u2',
            name: 'Jane Smith',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
          }
        };
        navigation.navigate('MatchDetailsScreen', { match: matchData });
        break;
      case 'message':
        navigation.navigate('ChatScreen', { chatId: notification.chatId });
        break;
      case 'return':
        if (notification.itemId) {
          // Create a return item object
          const returnItem = {
            id: notification.itemId,
            title: notification.message.split(' has marked your item as returned')[0],
            status: 'returned',
            returnedBy: notification.message.split(' has marked your item as returned')[0],
            returnDate: new Date().toISOString(),
            location: 'Return Location', // You might want to get this from your data
          };
          navigation.navigate('ReturnedItemScreen', { item: returnItem });
        }
        break;
      case 'claim':
        if (notification.itemId) {
          navigation.navigate('ReportLostItem', { itemId: notification.itemId, viewOnly: true });
        }
        break;
      case 'info':
      default:
        navigation.navigate('NotificationsScreen');
        break;
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem, 
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[
        styles.notificationIcon,
        item.type === 'match' ? styles.matchIcon : styles.messageIcon
      ]}>
        <Icon 
          name={item.type === 'match' ? "git-compare" : "chatbubble"} 
          size={24} 
          color={item.type === 'match' ? "#4CAF50" : "#4A154B"} 
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.type === 'match' && (
          <View style={styles.matchConfidence}>
            <Text style={styles.matchConfidenceText}>
              Match Confidence: {item.matchConfidence}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivitiesFromStorage();
    setRefreshing(false);
  };

  useEffect(() => {
    const getLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission not granted');
          return;
        }
        try {
          const userLocation = await Location.getCurrentPositionAsync({});
          setGeolocation(userLocation.coords);
          setSelectedLocation(userLocation.coords);
          const address = await Location.reverseGeocodeAsync(userLocation.coords);
          if (address && address.length > 0) {
            setLocation(`${address[0]?.city || ''}, ${address[0]?.region || ''}, ${address[0]?.country || ''}`);
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };
    getLocationPermission();
  }, []);

  const handleActivityPress = (activity) => {
    if (!activity) return;
    try {
      if (activity.type === 'lost') {
        navigation.navigate('ItemDetails', { 
          itemId: activity.id,
          itemType: 'lost'
        });
      } else if (activity.type === 'found') {
        navigation.navigate('ItemDetails', { 
          itemId: activity.id,
          itemType: 'found'
        });
      } else if (activity.status === 'matched' || activity.type === 'match') {
        navigation.navigate('MatchDetailsScreen', { 
          match: {
            id: `match-${activity.id}`,
            lostItemId: activity.id,
            foundItemId: `found-${activity.id}`,
            lostItemDescription: activity.title,
            foundItemDescription: `Found ${activity.title}`,
            foundLocation: activity.location,
            foundDate: activity.timestamp,
            matchConfidence: 85,
            status: activity.status,
            foundByUser: {
              id: 'u2',
              name: activity.reportedBy || 'Jane Smith',
              avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
            }
          }
        });
      }
    } catch (error) {
      console.error('Error handling activity press:', error);
      Alert.alert('Error', 'Unable to view activity details. Please try again.');
    }
  };

  const renderQuickActions = () => (
    <View>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#FF4B4B' }]}
          onPress={handleReportLostItem}
        >
          <Icon name="search-outline" size={24} color="#fff" style={styles.quickActionIcon} />
          <Text style={styles.quickActionText}>Report Lost</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}
          onPress={handleReportFoundItem}
        >
          <Icon name="add-circle-outline" size={24} color="#fff" style={styles.quickActionIcon} />
          <Text style={styles.quickActionText}>Report Found</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#4A154B' }]}
          onPress={() => navigation.navigate('MatchingScreen')}
        >
          <Icon name="git-compare-outline" size={24} color="#fff" style={styles.quickActionIcon} />
          <Text style={styles.quickActionText}>View Matches</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#757575' }]}
          onPress={() => navigation.navigate('ChatListScreen')}
        >
          <Icon name="chatbubbles-outline" size={24} color="#fff" style={styles.quickActionIcon} />
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View>
      <View style={styles.recentActivityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ActivityListScreen')}>
          <Text style={styles.viewMoreText}>View More {'>'}</Text>
        </TouchableOpacity>
      </View>
      {activities.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.activityCard}
          onPress={() => handleActivityPress(item)}
        >
          <View style={styles.activityCardContent}>
            <View style={styles.activityLeftSection}>
              <View style={[
                styles.activityTypeContainer,
                { backgroundColor: item.type === 'lost' ? '#FFF0F0' : '#F0FFF0' }
              ]}>
                <Icon 
                  name={item.type === 'lost' ? 'search-outline' : 'add-circle-outline'} 
                  size={18} 
                  color={item.type === 'lost' ? '#FF4B4B' : '#4CAF50'}
                />
                <Text style={[
                  styles.activityTypeText,
                  { color: item.type === 'lost' ? '#FF4B4B' : '#4CAF50' }
                ]}>
                  {capitalizeFirstLetter(item.type)}
                </Text>
              </View>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <View style={styles.activityDetails}>
                <View style={styles.activityDetail}>
                  <Icon name="location-outline" size={14} color="#666" />
                  <Text style={styles.activityLocation}>{item.location}</Text>
                </View>
                <View style={styles.activityDetail}>
                  <Icon name="time-outline" size={14} color="#666" />
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              </View>
            </View>
            <View style={[
              styles.activityStatus,
              { 
                backgroundColor: item.status === 'pending' ? '#FFF3CD' : 
                               item.status === 'matched' ? '#E8F5E9' : '#E3F2FD'
              }
            ]}>
              <Text style={[
                styles.activityStatusText,
                { 
                  color: item.status === 'pending' ? '#856404' : 
                         item.status === 'matched' ? '#2E7D32' : '#1565C0'
                }
              ]}>
                {capitalizeFirstLetter(item.status)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Custom StatusBar component to ensure visibility
  const CustomStatusBar = ({backgroundColor, ...props}) => (
    <View style={[styles.statusBar, { backgroundColor }]}> 
      <StatusBar translucent backgroundColor={backgroundColor} {...props} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomStatusBar backgroundColor="#4A154B" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Hello, {userName}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={toggleNotifications}
            activeOpacity={0.7}
          >
            <Icon name="notifications-outline" size={24} color="#fff" />
            {unreadMessages > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={navigateToDashboard}
            activeOpacity={0.7}
          >
            <Icon name="grid-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleProfile}
            activeOpacity={0.7}
          >
            <Icon name="person-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4A154B"]}
          />
        }
      >
        {renderQuickActions()}
        <View style={styles.recentActivitySection}>
          {renderRecentActivity()}
        </View>

        <View style={styles.footerSection}>
          <View style={styles.footerContent}>
            <View style={styles.footerLogoContainer}>
              <Icon name="location" size={32} color="#3d0c45" style={styles.footerLogo} />
              <Text style={styles.footerTitle}>TracknRetrieve</Text>
            </View>
            <Text style={styles.footerText}>
              Crafted with <Icon name="heart" size={16} color="#FF4B4B" /> and dedication
            </Text>
            <View style={styles.developersContainer}>
              <Text style={styles.footerHighlight}>M Shahnawaz</Text>
              <Text style={styles.footerText}> & </Text>
              <Text style={styles.footerHighlight}>Minhaj Khalil</Text>
            </View>
            <View style={styles.footerDivider} />
            <Text style={styles.footerSubtext}>
              Final Year Project – FAST University
            </Text>
            <Text style={styles.footerCopyright}>
              © 2025 All Rights Reserved
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <Modal
        visible={notificationVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotificationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setNotificationVisible(false)}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={notificationsData}
              renderItem={renderNotificationItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.notificationList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 80 : STATUSBAR_HEIGHT + 45,
    paddingBottom: 16,
    backgroundColor: '#4A154B',
    height: Platform.OS === 'ios' ? 160 : 150,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4B4B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1A1A1A',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
    rowGap: 16,
  },
  quickActionButton: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 56,
    minWidth: 140,
  },
  quickActionIcon: {
    marginRight: 8,
    width: 24,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
    flexWrap: 'wrap',
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A154B',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  activityCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityLeftSection: {
    flex: 1,
    marginRight: 12,
  },
  activityTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activityTypeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  activityDetails: {
    gap: 6,
  },
  activityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityLocation: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  activityDate: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  activityStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  unreadNotification: {
    backgroundColor: '#f0e6f2',
  },
  notificationIcon: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  matchConfidence: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  matchConfidenceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  matchIcon: {
    backgroundColor: '#E8F5E9',
  },
  messageIcon: {
    backgroundColor: '#F3E5F5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  notificationList: {
    padding: 20,
  },
  bottomNavContainer: {
    display: 'none',
  },
  navItem: {
    display: 'none',
  },
  navText: {
    display: 'none',
  },
  activeNavText: {
    display: 'none',
  },
  recentActivitySection: {
    marginBottom: 20,
  },
  footerSection: {
    backgroundColor: '#ffffff',
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  footerContent: {
    alignItems: 'center',
    width: '100%',
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLogo: {
    marginRight: 8,
  },
  footerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3d0c45',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  developersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerHighlight: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3d0c45',
  },
  footerDivider: {
    width: '40%',
    height: 2,
    backgroundColor: '#3d0c45',
    opacity: 0.2,
    marginVertical: 16,
  },
  footerSubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerCopyright: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});

export default HomePage;
