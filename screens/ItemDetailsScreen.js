import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_CONFIG from '../config';
import { useNavigation, useRoute } from '@react-navigation/native';

const ItemDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId, itemType } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reposting, setReposting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    fetchItemDetails();
  }, []);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${API_CONFIG.API_URL}/${itemType === 'lost' ? 'lostitem' : 'founditem'}/${itemId}`;
      const token = await AsyncStorage.getItem('authToken');
      
      console.log('Fetching item details from:', url); // Debug log
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Response data:', data); // Debug log
      
      if (response.ok) {
        // Handle all possible response formats
        if (data.item) {
          setItem(data.item);
        } else if (data.foundItem) {
          setItem(data.foundItem);
        } else if (data.status === 'success' && data.item) {
          setItem(data.item);
        } else if (data) {
          // If the response is the item data directly
          setItem(data);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error(data.message || 'Failed to fetch item details');
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError(error.message || 'Failed to fetch item details');
      Alert.alert(
        'Error',
        'Failed to fetch item details. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRepostItem = async () => {
    try {
      setReposting(true);
      
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Authentication Error', 'You need to be logged in to repost an item.');
        return;
      }

      const url = `${API_CONFIG.API_URL}/repost-lost-item/${itemId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          'Success',
          'Your item has been reposted. We will notify you if it matches with any found items.',
          [{ text: 'OK', onPress: fetchItemDetails }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to repost item');
      }
    } catch (error) {
      console.error('Error reposting item:', error);
      Alert.alert('Error', 'An error occurred while reposting the item');
    } finally {
      setReposting(false);
    }
  };

  const handleReturnItem = async () => {
    try {
      // Confirm with the user that they want to mark the item as returned
      Alert.alert(
        'Return Item',
        `Are you sure you want to mark this ${itemType} item as returned? This will remove it from the active ${itemType} items list.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes, Return Item',
            onPress: async () => {
              try {
                setReturning(true);
                
                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                  Alert.alert('Authentication Error', 'You need to be logged in to return an item.');
                  return;
                }
                
                const url = `${API_CONFIG.API_URL}/return-item`;
                
                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    itemId: itemId,
                    itemType: itemType,
                    returnNotes: 'Item returned by user'
                  })
                });
                
                let data;
                try {
                  const textResponse = await response.text();
                  try {
                    data = JSON.parse(textResponse);
                  } catch (parseError) {
                    console.error('Error parsing server response as JSON:', parseError);
                    console.error('Server response:', textResponse);
                    throw new Error('Server returned an invalid response format');
                  }
                } catch (responseError) {
                  console.error('Error reading server response:', responseError);
                  throw new Error('Failed to process server response');
                }
                
                if (response.ok) {
                  Alert.alert(
                    'Success',
                    `This ${itemType} item has been marked as returned and removed from the active list.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                } else {
                  Alert.alert('Error', data.message || 'Failed to return item');
                }
              } catch (error) {
                console.error('Error returning item:', error);
                Alert.alert('Error', error.message || 'An error occurred while returning the item');
              } finally {
                setReturning(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleReturnItem:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleMessage = () => {
    // Navigate to the chat screen with the item owner's information
    navigation.navigate('ChatScreen', {
      user: {
        id: item.userId,
        _id: item.userId,
        name: item.userName || 'Item Owner',
        avatar: null
      },
      otherUserId: item.userId,
      matchId: itemId,
      match: {
        lostItemId: itemType === 'lost' ? itemId : null,
        foundItemId: itemType === 'found' ? itemId : null
      }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d0c45" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="information-outline" size={64} color="#6c757d" />
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A154B" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {itemType === 'lost' ? 'Lost Item Details' : 'Found Item Details'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Item Images */}
        {item.photo ? (
          <View style={styles.imageContainer}>
            {(() => {
              console.log('Photo data type:', typeof item.photo);
              console.log('Photo data length:', item.photo?.length);
              
              if (!item.photo || typeof item.photo !== 'string') {
                console.error('Invalid photo data:', item.photo);
                setImageError(true);
                return (
                  <View style={[styles.imageContainer, styles.noImageContainer]}>
                    <Icon name="image-off" size={50} color="#ccc" />
                    <Text style={styles.noImageText}>No image available</Text>
                  </View>
                );
              }
              
              // Ensure the base64 string is properly formatted
              const base64Data = item.photo.startsWith('data:image') ? item.photo : `data:image/jpeg;base64,${item.photo}`;
              
              return (
                <Image 
                  source={{ uri: base64Data }}
                  style={styles.itemImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Error loading image:', error.nativeEvent);
                    console.error('Error details:', JSON.stringify(error.nativeEvent));
                    setImageError(true);
                  }}
                />
              );
            })()}
          </View>
        ) : (
          <View style={[styles.imageContainer, styles.noImageContainer]}>
            <Icon name="image-off" size={50} color="#ccc" />
            <Text style={styles.noImageText}>
              {imageError ? 'Failed to load image' : 'No image available'}
            </Text>
          </View>
        )}

        {/* Item Information */}
        <View style={styles.section}>
          <View style={styles.itemHeader}>
            <Icon 
              name={itemType === 'lost' ? 'search-outline' : 'add-circle-outline'} 
              size={24} 
              color={itemType === 'lost' ? '#FF4B4B' : '#4CAF50'} 
            />
            <Text style={styles.itemTitle}>{item.itemName}</Text>
          </View>

          <View style={styles.detailsContainer}>
            {/* Basic Details */}
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color="#666" />
              <Text style={styles.detailText}>
                {itemType === 'lost' ? 'Lost at' : 'Found at'}: {item.location}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Date: {formatDate(item.date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="clock-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Time: {formatTime(item.time)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="pricetag-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Category: {item.category}</Text>
            </View>

            {/* Reward Information */}
            {itemType === 'lost' && item.hasReward && (
              <View style={styles.rewardContainer}>
                <View style={styles.rewardHeader}>
                  <Icon name="gift-outline" size={20} color="#4CAF50" />
                  <Text style={styles.rewardTitle}>Reward Offered</Text>
                </View>
                <View style={styles.rewardDetails}>
                  <Text style={styles.rewardAmount}>
                    {item.rewardAmount} {item.rewardCurrency}
                  </Text>
                  {item.rewardDescription && (
                    <Text style={styles.rewardDescription}>
                      {item.rewardDescription}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>

            {/* Additional Details */}
            {item.brand && (
              <View style={styles.detailRow}>
                <Icon name="tag-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Brand: {item.brand}</Text>
              </View>
            )}
            {item.model && (
              <View style={styles.detailRow}>
                <Icon name="information-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Model: {item.model}</Text>
              </View>
            )}
            {item.color && (
              <View style={styles.detailRow}>
                <Icon name="palette-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Color: {item.color}</Text>
              </View>
            )}

            {/* Contact Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={handleMessage}
              >
                <Icon name="message-outline" size={20} color="#fff" />
                <Text style={styles.messageButtonText}>Message via App</Text>
              </TouchableOpacity>
            </View>

            {/* Status Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, itemType) }]}>
                <Text style={[styles.statusText, itemType === 'lost' ? styles.lostStatusText : {}]}>
                  {getStatusText(item.status, itemType)}
                </Text>
              </View>
            </View>

            {/* Reward Information (if applicable) */}
            {item.reward && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Reward</Text>
                <Text style={styles.rewardText}>{item.reward}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Repost button - only for lost items */}
        {itemType === 'lost' && (
          <View style={styles.repostContainer}>
            <Text style={styles.repostTitle}>
              Can't find your item? Repost to expand your search reach.
            </Text>
            <TouchableOpacity
              style={styles.repostButton}
              onPress={handleRepostItem}
              disabled={reposting}
            >
              {reposting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="refresh" size={20} color="#fff" style={styles.repostIcon} />
                  <Text style={styles.repostButtonText}>Repost This Item</Text>
                </>
              )}
            </TouchableOpacity>
            {item.repostedAt && (
              <Text style={styles.repostedText}>
                Last reposted: {formatDate(item.repostedAt)}
              </Text>
            )}
          </View>
        )}

        {/* Return Item button */}
        <View style={styles.returnContainer}>
          <Text style={styles.returnTitle}>
            Has this item been returned to its owner?
          </Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={handleReturnItem}
            disabled={returning}
          >
            {returning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="checkbox-marked-circle-outline" size={20} color="#fff" style={styles.returnIcon} />
                <Text style={styles.returnButtonText}>Mark as Returned</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStatusColor = (status, itemType) => {
  if (itemType === 'lost') {
    return '#FFE5E5'; // Light red background for lost items
  }
  
  switch (status) {
    case 'pending':
      return '#FFF3CD';
    case 'matched':
      return '#E8F5E9';
    case 'returned':
      return '#E3F2FD';
    case 'unclaimed':
      return '#F3E5F5';
    default:
      return '#F5F5F5';
  }
};

const getStatusText = (status, itemType) => {
  if (itemType === 'lost') {
    return 'Lost';
  }
  return capitalizeFirstLetter(status);
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A154B',
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#eee',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    padding: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  detailSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#4A154B',
    marginLeft: 12,
    textDecorationLine: 'underline',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  lostStatusText: {
    color: '#FF4B4B',
    fontWeight: '600',
  },
  rewardText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  repostContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f1fe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d8f4',
  },
  repostTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  repostButton: {
    backgroundColor: '#3d0c45',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  repostIcon: {
    marginRight: 8,
  },
  repostedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  returnContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f1fe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d8f4',
  },
  returnTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: '#3d0c45',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  returnIcon: {
    marginRight: 8,
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#ccc',
  },
  messageButton: {
    backgroundColor: '#4A154B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rewardContainer: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  rewardDetails: {
    marginLeft: 28,
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default ItemDetailsScreen; 