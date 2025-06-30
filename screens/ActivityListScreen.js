import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const ACTIVITY_STORAGE_KEY = 'user_activities'; // Same key as in Homepage.js

const ActivityListScreen = ({ route, navigation }) => {
  // Get filter from route params if available
  const { filter: initialFilter } = route.params || {};
  
  // State for activities and loading
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Set initial filter from route params if available
  const [filter, setFilter] = useState(initialFilter || 'all');

  // Fetch user data and activities on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setUserId(parsedUserData._id);
        }
        
        // Fetch activities from AsyncStorage
        await fetchActivitiesFromStorage();
      } catch (error) {
        console.error('Error fetching user data:', error);
        setDemoActivities();
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
      
      // Get activities from AsyncStorage
      const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      
      if (storedActivities) {
        // Parse stored activities
        let parsedActivities = JSON.parse(storedActivities);
        
        // Check and update status for each activity
        for (const activity of parsedActivities) {
          await checkAndUpdateItemStatus(activity);
        }
        
        // Get updated activities after status changes
        const updatedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        if (updatedActivities) {
          parsedActivities = JSON.parse(updatedActivities);
        }
        
        // Sort by most recent first
        parsedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setActivities(parsedActivities);
      } else {
        // If no stored activities, initialize with demo data
        await initializeActivities();
      }
    } catch (error) {
      console.error('Error fetching activities from storage:', error);
      setDemoActivities();
    } finally {
      setLoading(false);
    }
  };

  // Initialize activities with demo data and store in AsyncStorage
  const initializeActivities = async () => {
    try {
      const demoActivities = generateDemoActivities();
      
      // Store in AsyncStorage
      await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(demoActivities));
      
      // Set in state
      setActivities(demoActivities);
    } catch (error) {
      console.error('Error initializing activities:', error);
      setDemoActivities();
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
      },
      { 
        id: '6', 
        type: 'found', 
        title: 'Umbrella', 
        date: '2 weeks ago', 
        status: 'claimed', 
        location: 'Bus Station',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '7', 
        type: 'lost', 
        title: 'Sunglasses', 
        date: '10 days ago', 
        status: 'pending', 
        location: 'Beach',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '8', 
        type: 'found', 
        title: 'Water Bottle', 
        date: '3 weeks ago', 
        status: 'unclaimed', 
        location: 'Park',
        timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '9', 
        type: 'found', 
        title: 'Backpack', 
        date: '35 days ago', 
        status: 'held', 
        location: 'University Campus',
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '10', 
        type: 'found', 
        title: 'Textbook', 
        date: '50 days ago', 
        status: 'eligible_for_donation', 
        location: 'Library',
        timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '11', 
        type: 'found', 
        title: 'Calculator', 
        date: '60 days ago', 
        status: 'donated', 
        location: 'Math Department',
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
    ];

    // Sort by most recent first
    demoActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return demoActivities;
  };

  // Set demo activities data (fallback)
  const setDemoActivities = () => {
    const demoActivities = generateDemoActivities();
    setActivities(demoActivities);
  };

  // Update an activity's status
  const updateActivityStatus = async (activityId, newStatus) => {
    try {
      // Get existing activities
      const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      
      if (storedActivities) {
        let activities = JSON.parse(storedActivities);
        
        // Find and update the activity
        const updatedActivities = activities.map(activity => {
          if (activity.id === activityId) {
            return { 
              ...activity, 
              status: newStatus,
              date: 'Just now',
              timestamp: new Date().toISOString()
            };
          }
          return activity;
        });
        
        // Store updated activities
        await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updatedActivities));
        
        // Update state
        setActivities(updatedActivities);
      }
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  // Add function to check and update item status
  const checkAndUpdateItemStatus = async (item) => {
    const now = new Date();
    const foundDate = new Date(item.timestamp);
    const daysSinceFound = Math.floor((now - foundDate) / (1000 * 60 * 60 * 24));

    // If item is unclaimed and 30 days have passed, update to held
    if (item.status === 'unclaimed' && daysSinceFound >= 30) {
      await updateActivityStatus(item.id, 'held');
      return true;
    }

    // If item is held and 15 more days have passed (45 days total), update to eligible for donation
    if (item.status === 'held' && daysSinceFound >= 45) {
      await updateActivityStatus(item.id, 'eligible_for_donation');
      return true;
    }

    return false;
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending':
        return { 
          container: { backgroundColor: '#fff3cd' },
          text: { color: '#856404' }
        };
      case 'matched':
        return { 
          container: { backgroundColor: '#d1e7dd' },
          text: { color: '#155724' }
        };
      case 'returned':
        return { 
          container: { backgroundColor: '#cce5ff' },
          text: { color: '#004085' }
        };
      case 'claimed':
        return { 
          container: { backgroundColor: '#d4edda' },
          text: { color: '#155724' }
        };
      case 'unclaimed':
        return { 
          container: { backgroundColor: '#f8d7da' },
          text: { color: '#721c24' }
        };
      case 'held':
        return { 
          container: { backgroundColor: '#e2e3e5' },
          text: { color: '#383d41' }
        };
      case 'eligible_for_donation':
        return { 
          container: { backgroundColor: '#cce5ff' },
          text: { color: '#004085' }
        };
      case 'donated':
        return { 
          container: { backgroundColor: '#d1e7dd' },
          text: { color: '#155724' }
        };
      default:
        return { 
          container: { backgroundColor: '#e2e3e5' },
          text: { color: '#383d41' }
        };
    }
  };

  // Add function to check if item is eligible for donation
  const isEligibleForDonation = (item) => {
    if (item.type !== 'found') return false;
    if (item.status !== 'eligible_for_donation') return false;
    return true;
  };

  // Add function to handle donation
  const handleDonate = async (item) => {
    try {
      // Update the item status to donated
      await updateActivityStatus(item.id, 'donated');
      
      // Show success message
      Alert.alert(
        'Success',
        'Item has been marked for donation. Thank you for your generosity!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error handling donation:', error);
      Alert.alert(
        'Error',
        'Failed to process donation. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderActivityItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.activityItem}
      onPress={() => {
        if (item.type === 'lost') {
          navigation.navigate('ItemDetails', { 
            itemId: item.id,
            itemType: 'lost'
          });
        } else if (item.type === 'found') {
          navigation.navigate('ItemDetails', { 
            itemId: item.id,
            itemType: 'found'
          });
        } else if (item.status === 'matched' || item.type === 'match') {
          navigation.navigate('MatchDetailsScreen', { 
            match: {
              id: `match-${item.id}`,
              lostItemId: item.id,
              foundItemId: `found-${item.id}`,
              lostItemDescription: item.title,
              foundItemDescription: `Found ${item.title}`,
              foundLocation: item.location,
              foundDate: item.timestamp,
              matchConfidence: 85,
              status: item.status,
              foundByUser: {
                id: 'u2',
                name: item.reportedBy || 'Jane Smith',
                avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
              }
            }
          });
        }
      }}
    >
      <View style={[styles.activityIconContainer, { 
        backgroundColor: getActivityIconBackground(item)
      }]}>
        <Icon 
          name={getActivityIcon(item)} 
          size={20} 
          color={getActivityIconColor(item)} 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.activityDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.activityDate}>
          {item.date} • {item.location}
          {item.reportedBy ? ` • Reported by ${item.reportedBy}` : ''}
        </Text>
      </View>
      <View style={styles.activityActions}>
        <View style={[styles.activityStatus, getStatusStyle(item.status).container]}>
          <Text style={[styles.activityStatusText, getStatusStyle(item.status).text]}>
            {capitalizeFirstLetter(item.status.replace('_', ' '))}
          </Text>
        </View>
        {isEligibleForDonation(item) && (
          <TouchableOpacity 
            style={styles.donateButton}
            onPress={() => handleDonate(item)}
          >
            <Text style={styles.donateButtonText}>Donate</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // Helper function to get activity icon
  const getActivityIcon = (item) => {
    if (item.type === 'lost') return "search-outline";
    if (item.type === 'found') return "checkmark-circle-outline";
    if (item.type === 'match') return "git-compare-outline";
    return "document-text-outline";
  };

  // Helper function to get activity icon background
  const getActivityIconBackground = (item) => {
    if (item.type === 'lost') return '#f8d7da';
    if (item.type === 'found') return '#d1e7dd';
    if (item.type === 'match') return '#cce5ff';
    return '#e2e3e5';
  };

  // Helper function to get activity icon color
  const getActivityIconColor = (item) => {
    if (item.type === 'lost') return '#dc3545';
    if (item.type === 'found') return '#198754';
    if (item.type === 'match') return '#0d6efd';
    return '#383d41';
  };

  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  const filteredActivities = () => {
    switch(filter) {
      case 'lost':
        return activities.filter(item => item.type === 'lost');
      case 'found':
        return activities.filter(item => item.type === 'found');
      case 'returned':
        return activities.filter(item => item.status === 'returned');
      default:
        return activities;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity History</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'lost' && styles.activeFilter]}
          onPress={() => setFilter('lost')}
        >
          <Text style={[styles.filterText, filter === 'lost' && styles.activeFilterText]}>Lost</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'found' && styles.activeFilter]}
          onPress={() => setFilter('found')}
        >
          <Text style={[styles.filterText, filter === 'found' && styles.activeFilterText]}>Found</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3d0c45" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities()}
          renderItem={renderActivityItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No activities found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: STATUSBAR_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3d0c45',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f1f1f1',
  },
  activeFilter: {
    backgroundColor: '#3d0c45',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
  },
  activityActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  activityStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  donateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default ActivityListScreen; 