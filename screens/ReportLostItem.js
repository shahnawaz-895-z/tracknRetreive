import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, Image, ScrollView, ActivityIndicator, Dimensions, Modal, SafeAreaView, StatusBar, Animated, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config';
import * as ImageManipulator from 'expo-image-manipulator';
import PhotoSelector from './components/PhotoSelector';

const { width, height } = Dimensions.get('window');
const ACTIVITY_STORAGE_KEY = 'user_activities'; // Same key as in Homepage.js

const ReportLostItem = () => {
  const navigation = useNavigation();
  const [time, setTime] = useState(new Date());
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [nameOnDocument, setNameOnDocument] = useState('');
  const [uniquePoint, setUniquePoint] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [missingPersonName, setMissingPersonName] = useState('');
  const [isFaceProcessing, setIsFaceProcessing] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState(null);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState(null);
  const [hasReward, setHasReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardCurrency, setRewardCurrency] = useState('USD');
  const [rewardDescription, setRewardDescription] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [geolocation, setGeolocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const fadeAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(1);
  const [selectedCategoryAnim] = useState(new Animated.Value(0));
  const [imageUploadAnim] = useState(new Animated.Value(0));
  const [imagePreviewAnim] = useState(new Animated.Value(0));
  const [mapAnim] = useState(new Animated.Value(0));
  const [locationMarkerAnim] = useState(new Animated.Value(0));
  const [generatedCategory, setGeneratedCategory] = useState('');
  const [generatedItemName, setGeneratedItemName] = useState('');

  const categories = ['Electronics', 'Accessories', 'Clothing', 'Documents', 'Lost Person', 'Bags', 'Others'];
  const BACKEND_URL = API_CONFIG.API_URL; // Using centralized config
  const HUGGING_FACE_API_KEY = 'sk-B0HEal1G6PbUGUjBaQuWjSLozRSZwQFz3Se4dvnV1dlxyAYZ'; // Replace with your API key

  useEffect(() => {
    const getLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for better matching.');
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
    };

    getLocationPermission();
  }, []);

  useEffect(() => {
    const getPermissions = async () => {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        console.log('Camera permission not granted');
      }

      // Request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryPermission.status !== 'granted') {
        console.log('Media library permission not granted');
      }
    };

    getPermissions();
  }, []);

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take photos.');
      return;
    }

    try {
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setPhoto(selectedImageUri);
        handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const launchImageLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Media library permission is required to select photos.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setPhoto(selectedImageUri);
        handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const pickImage = async () => {
    Alert.alert(
      'Select Image Source',
      'Choose where to get the image from',
      [
        {
          text: 'Camera',
          onPress: launchCamera,
        },
        {
          text: 'Gallery',
          onPress: launchImageLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleImageUpload = async (asset) => {
    try {
      setIsImageProcessing(true);
      const imageUri = asset.uri;
      setPhoto(imageUri);

      // If category is Lost Person, only perform face verification
      if (category === 'Lost Person') {
        await handleFaceVerification(imageUri);
        return;
      }

      // For other categories, process image for description using BLIP-2
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      const response = await fetch(API_CONFIG.BLIP2_API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate caption');
      }

      const result = await response.json();
      const caption = result.caption;

      setDescription(caption);
      
      if (!category) {
        const detectedCategory = detectCategoryFromDescription(caption);
        setCategory(detectedCategory);
        setGeneratedCategory(detectedCategory);
      }
      
      if (!itemName) {
        const generatedName = generateItemNameFromDescription(caption);
        setItemName(generatedName);
      }

      // Animate image preview
      Animated.sequence([
        Animated.timing(imagePreviewAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(imagePreviewAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (error) {
      console.error('Error processing image:', error);
      if (category === 'Lost Person') {
        Alert.alert('Error', 'Error processing face verification. Please try again.');
      } else {
        Alert.alert('Error', 'Error processing the image. Please try again.');
        setDescription('');
      }
    } finally {
      setIsImageProcessing(false);
      Animated.timing(imageUploadAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });

    // Animate marker
    Animated.sequence([
      Animated.timing(locationMarkerAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(locationMarkerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Location.reverseGeocodeAsync({ latitude, longitude }).then((addresses) => {
      if (addresses && addresses.length > 0) {
        const formattedAddress = `${addresses[0]?.name ? addresses[0].name + ', ' : ''}${addresses[0]?.street ? addresses[0].street + ', ' : ''}${addresses[0]?.city ? addresses[0].city + ', ' : ''}${addresses[0]?.region ? addresses[0].region + ', ' : ''}${addresses[0]?.country || ''}`;
        setLocation(formattedAddress.replace(/,\s*$/, ''));
      }
    });
  };

  const openFullScreenMap = () => {
    setFullScreenMap(true);
    setMapVisible(true);
    Animated.timing(mapAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFullScreenMap = () => {
    Animated.timing(mapAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setFullScreenMap(false);
      setMapVisible(false);
    });
  };

  const detectCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for better matching.');
        setIsLocationLoading(false);
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setGeolocation(userLocation.coords);
      setSelectedLocation(userLocation.coords);
      
      const address = await Location.reverseGeocodeAsync(userLocation.coords);
      if (address && address.length > 0) {
        const formattedAddress = `${address[0]?.name ? address[0].name + ', ' : ''}${address[0]?.street ? address[0].street + ', ' : ''}${address[0]?.city ? address[0].city + ', ' : ''}${address[0]?.region ? address[0].region + ', ' : ''}${address[0]?.country || ''}`;
        setLocation(formattedAddress.replace(/,\s*$/, ''));
      }
      
      // Show the full screen map after detecting location
      setFullScreenMap(true);
      setMapVisible(true);
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to detect current location. Please try again.');
      setIsLocationLoading(false);
    }
  };

  // Verify authentication token before submission
  const verifyAuthentication = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!authToken) {
        Alert.alert(
          'Authentication Required',
          'You need to be logged in to report a lost item. Please log in and try again.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('Login')
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying authentication:', error);
      Alert.alert('Error', 'Failed to verify authentication. Please try logging in again.');
      return false;
    }
  };

  // Add validation function
  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'category':
        if (!value) error = 'Please select a category';
        break;
      case 'description':
        if (!value || value.trim() === '') error = 'Description is required';
        break;
      case 'location':
        if (!value || value.trim() === '') error = 'Location is required';
        break;
      case 'name':
        if (!value || value.trim() === '') error = 'Name is required';
        break;
      case 'phone':
        if (!value || value.trim() === '') error = 'Phone number is required';
        else if (!/^\d{11}$/.test(value.replace(/\D/g, ''))) error = 'Invalid phone number (must be 11 digits)';
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
        break;
      case 'uniquePoint':
        if (!value || value.trim() === '') error = 'Unique point is required';
        break;
      case 'time':
        if (!value) error = 'Time is required';
        break;
      case 'date':
        if (!value) error = 'Date is required';
        break;
    }
    return error;
  };

  // Add animation for error feedback
  const showErrorAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Update handleSubmit to include validation
  const handleSubmit = async () => {
    const errors = {};
    const fields = {
      category,
      description,
      location,
      name,
      phone,
      email,
      uniquePoint,
      time,
      date
    };

    Object.keys(fields).forEach(field => {
      const error = validateField(field, fields[field]);
      if (error) {
        errors[field] = error;
      }
    });

    // Add validation for reward amount if reward is enabled
    if (hasReward) {
      const rewardAmountNum = parseFloat(rewardAmount);
      if (isNaN(rewardAmountNum) || rewardAmountNum <= 0) {
        errors.rewardAmount = 'Please enter a valid reward amount';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showErrorAnimation();
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    // Verify authentication before proceeding
    const isAuthenticated = await verifyAuthentication();
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);

    try {
      // Get user ID and auth token from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!authToken) {
        Alert.alert('Error', 'Please log in to submit a report.');
        navigation.navigate('Login');
        return;
      }

      let userId = null;
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          userId = parsedUserData?._id;
          
          if (!userId && parsedUserData?.id) {
            userId = parsedUserData.id;
          } else if (!userId && parsedUserData?.userId) {
            userId = parsedUserData.userId;
          }
        } catch (parseError) {
          console.error('Error parsing userData:', parseError);
        }
      }

      // Format contact information as a string
      const contactInfo = {
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : ''
      };
      const contactString = JSON.stringify(contactInfo);

      // Create the request body
      const formData = new FormData();
      
      // Add required fields first
      formData.append('contact', contactString);
      formData.append('category', category);
      formData.append('location', location.trim());
      formData.append('description', description.trim());
      formData.append('time', time.toISOString());
      formData.append('date', date.toISOString());
      formData.append('itemName', itemName ? itemName.trim() : description.substring(0, 30).trim());
      formData.append('uniquePoint', uniquePoint.trim());
      
      // Add reward information if enabled
      formData.append('hasReward', hasReward.toString());
      if (hasReward) {
        const rewardAmountNum = parseFloat(rewardAmount);
        formData.append('rewardAmount', rewardAmountNum.toString());
        formData.append('rewardCurrency', rewardCurrency);
        formData.append('rewardDescription', rewardDescription.trim());
      }
      
      // Add missing person name if category is Lost Person
      if (category === 'Lost Person' && missingPersonName) {
        formData.append('missingPersonName', missingPersonName.trim());
      }
      
      // Add user ID if available
      if (userId) {
        formData.append('userId', userId);
      }
      
      // Add coordinates if available
      if (selectedLocation) {
        formData.append('latitude', selectedLocation.latitude);
        formData.append('longitude', selectedLocation.longitude);
      }
      
      // Process photo if available
      if (photo) {
        // Check image size and compress if needed
        const fileInfo = await FileSystem.getInfoAsync(photo);
        let photoToUpload = photo;
        
        // If image is too large (> 2MB), compress it
        if (fileInfo.size > 2 * 1024 * 1024) {
          try {
            const result = await ImageManipulator.manipulateAsync(
              photo,
              [{ resize: { width: 1200 } }],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            photoToUpload = result.uri;
            console.log('Photo compressed for upload');
          } catch (compressionError) {
            console.error('Error compressing photo for upload:', compressionError);
          }
        }
        
        // Fix URI for Android
        let photoUri = photoToUpload;
        if (Platform.OS === 'android' && !photoToUpload.startsWith('file://')) {
          photoUri = `file://${photoToUpload}`;
        }
        
        formData.append('photo', {
          uri: photoUri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        });
      }

      // Create headers with authorization token
      const headers = {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authToken}`
      };

      // Log the form data for debugging
      console.log('Submitting form data:', {
        contact: contactString,
        category,
        location,
        description,
        itemName,
        uniquePoint,
        time: time.toISOString(),
        date: date.toISOString(),
        userId,
        hasPhoto: !!photo,
        hasAuthToken: !!authToken
      });

      // Send the request
      const response = await axios.post(`${BACKEND_URL}/lostitem`, formData, {
        headers: headers,
        timeout: 30000, // 30 second timeout
      });

      if (response.data.status === 'success') {
        // Add to recent activity with the item's _id
        await addToRecentActivity(response.data.itemId);
        
        // Show success message
        Alert.alert(
          'Success!',
          'Your lost item has been reported successfully. We will notify you if we find any matches!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setContact('');
                setLocation('');
                setPhoto(null);
                setDescription('');
                setTime(new Date());
                setDate(new Date());
                setCategory('');
                setItemName('');
                setBrand('');
                setModel('');
                setColor('');
                setSize('');
                setMaterial('');
                setSerialNumber('');
                setDocumentType('');
                setIssuingAuthority('');
                setNameOnDocument('');
                setUniquePoint('');
                setAge('');
                setGender('');
                setFaceVerificationResult(null);
                // Navigate back to home
                navigation.navigate('HomePage');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to report lost item. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting lost item:', error);
      // Show detailed error message
      let errorMessage = 'Failed to submit lost item report. ';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        
        if (status === 404) {
          console.error(`API endpoint not found: ${BACKEND_URL}/lostitem`);
          errorMessage += `Server error: API endpoint not found (404). Please verify the backend server is running at ${BACKEND_URL}`;
        } else {
          errorMessage += `Server error: ${status} - ${error.response.data?.message || 'Unknown error'}`;
        }
        
        // Log additional debugging info
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);
        console.error('Response data:', error.response?.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage += 'No response received from server. Please check your internet connection.';
        console.error('Request made to:', BACKEND_URL);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage += error.message;
      }
      
      // Show detailed alert with the backend URL for debugging
      Alert.alert(
        'Error Submitting Item', 
        `${errorMessage}\n\nAPI URL: ${BACKEND_URL}\n\nPlease take a screenshot of this error and contact support.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add error message component
  const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return (
      <Animated.Text 
        style={[
          styles.errorText,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {error}
      </Animated.Text>
    );
  };

  // Add formatRelativeTime function
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
    } else {
      // Format as date if older than 30 days
      return date.toLocaleDateString();
    }
  };

  // Update addToRecentActivity function to include itemName and better time display
  const addToRecentActivity = async (itemId) => {
    try {
        // Format the date for display
        const now = new Date();
        const formattedDate = formatRelativeTime(now);
        
        // Create the activity object with actual item details
        const newActivity = {
            id: itemId,
            type: 'lost',
            title: itemName,
            status: 'pending',
            location: location,
            date: formattedDate,
            timestamp: now.toISOString(),
            category: category,
            photo: photo ? photo : null,
            description: description
        };
        
        // Get existing activities from AsyncStorage
        const storedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        let activities = [];
        
        if (storedActivities) {
            activities = JSON.parse(storedActivities);
        }
        
        // Add new activity at the beginning
        activities.unshift(newActivity);
        
        // Store updated activities
        await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
        
        return newActivity;
    } catch (error) {
        console.error('Error adding to recent activity:', error);
        return null;
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  const handleNoPicture = () => {
    // Just continue with the form without requiring a photo
    Alert.alert('Info', 'You can submit the form without a photo. Just fill in all other details.');
  };

  // Add this function to detect category from description
  const detectCategoryFromDescription = (description) => {
    const lowerDesc = description.toLowerCase();
    
    // Define keywords for each category
    const categoryKeywords = {
      'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'ipad', 'iphone', 'android', 'samsung', 'charger', 'headphone', 'earbud', 'camera', 'watch', 'smart'],
      'Bags': ['bag', 'backpack', 'purse', 'handbag', 'luggage', 'suitcase', 'wallet', 'pouch', 'sack'],
      'Clothing': ['shirt', 'pant', 'jacket', 'coat', 'sweater', 'hoodie', 'dress', 'skirt', 'hat', 'cap', 'scarf', 'glove', 'sock', 'shoe', 'boot', 'sneaker', 'clothing', 'wear'],
      'Accessories': ['ring', 'necklace', 'bracelet', 'earring', 'jewelry', 'watch', 'glasses', 'sunglasses', 'umbrella', 'key', 'keychain'],
      'Documents': ['book', 'notebook', 'document', 'paper', 'card', 'id', 'passport', 'license', 'certificate', 'folder', 'file'],
    };
    
    // Check each category for matching keywords
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword)) {
          return category;
        }
      }
    }
    
    // Default to 'Others' if no match found
    return 'Others';
  };

  // Add this function to generate item name from description
  const generateItemNameFromDescription = (description) => {
    // Split the description into words
    const words = description.split(/\s+/);
    
    // If description is short enough, use it directly
    if (words.length <= 5) {
      // Capitalize first letter
      return description.charAt(0).toUpperCase() + description.slice(1);
    }
    
    // Extract key nouns from the description
    const commonNouns = ['phone', 'wallet', 'bag', 'keys', 'watch', 'laptop', 'book', 'card', 'glasses', 'umbrella', 'camera', 'headphones', 'earbuds', 'ring', 'necklace', 'bracelet'];
    
    // Look for common nouns in the description
    for (const noun of commonNouns) {
      if (description.toLowerCase().includes(noun)) {
        // Find the adjectives before the noun (up to 2 words)
        const nounIndex = words.findIndex(word => word.toLowerCase().includes(noun));
        if (nounIndex > 0) {
          const startIndex = Math.max(0, nounIndex - 2);
          const itemNameWords = words.slice(startIndex, nounIndex + 1);
          return itemNameWords.join(' ').charAt(0).toUpperCase() + itemNameWords.join(' ').slice(1);
        }
        // If no adjectives, just use the noun with a prefix
        return `Lost ${noun}`.charAt(0).toUpperCase() + `Lost ${noun}`.slice(1);
      }
    }
    
    // If no common nouns found, use the first 3-4 words
    return words.slice(0, 4).join(' ').charAt(0).toUpperCase() + words.slice(0, 4).join(' ').slice(1);
  };

  // Function to reset all category-specific fields
  const resetCategoryFields = () => {
    setBrand('');
    setModel('');
    setColor('');
    setSerialNumber('');
    setMaterial('');
    setSize('');
    setDocumentType('');
    setIssuingAuthority('');
    setNameOnDocument('');
  };

  // Update handleCategoryChange to include animation
  const handleCategoryChange = (selectedCategory) => {
    setCategory(selectedCategory);
    resetCategoryFields();
    
    // Animate category selection
    Animated.sequence([
      Animated.timing(selectedCategoryAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(selectedCategoryAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Update the renderCategoryFields function for Documents
  const renderCategoryFields = () => {
    switch (category) {
      case 'Electronics':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Electronics Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., Apple, Samsung, Dell"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="e.g., iPhone 14 Pro, MacBook Air M2"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="e.g., Silver, Black, Blue"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Serial Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Enter if visible for verification"
              />
            </View>
          </View>
        );
        
      case 'Bags':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bag Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., Gucci, Louis Vuitton, Herschel"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="e.g., Backpack, Handbag, Tote, Messenger"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="e.g., Black, Brown, Red"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Material</Text>
              <TextInput
                style={styles.input}
                value={material}
                onChangeText={setMaterial}
                placeholder="e.g., Leather, Canvas, Nylon"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Size</Text>
              <TextInput
                style={styles.input}
                value={size}
                onChangeText={setSize}
                placeholder="e.g., Small, Medium, Large"
              />
            </View>
          </View>
        );
        
      case 'Accessories':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessories Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., Gucci, Fossil, Herschel"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Material</Text>
              <TextInput
                style={styles.input}
                value={material}
                onChangeText={setMaterial}
                placeholder="e.g., Leather, Metal, Fabric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="e.g., Brown, Black, Tan"
              />
            </View>
          </View>
        );
        
      case 'Clothing':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clothing Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., Nike, Adidas, Zara"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Size</Text>
              <TextInput
                style={styles.input}
                value={size}
                onChangeText={setSize}
                placeholder="e.g., S, M, L, XL, 42, 10"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="e.g., Blue, Red, Black"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Material</Text>
              <TextInput
                style={styles.input}
                value={material}
                onChangeText={setMaterial}
                placeholder="e.g., Cotton, Polyester, Denim"
              />
            </View>
          </View>
        );
        
      case 'Documents':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Document Type</Text>
              <TextInput
                style={styles.input}
                value={documentType}
                onChangeText={setDocumentType}
                placeholder="e.g., Passport, Driver's License, Student ID"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Issuing Authority</Text>
              <TextInput
                style={styles.input}
                value={issuingAuthority}
                onChangeText={setIssuingAuthority}
                placeholder="e.g., Government, University, Company"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name on Document (Optional)</Text>
              <TextInput
                style={styles.input}
                value={nameOnDocument}
                onChangeText={setNameOnDocument}
                placeholder="Enter if visible for verification"
              />
            </View>
          </View>
        );
        
      case 'Lost Person':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Person Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name of Missing Person</Text>
              <TextInput
                style={styles.input}
                value={missingPersonName}
                onChangeText={setMissingPersonName}
                placeholder="Enter name of missing person"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Estimated age"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                value={gender}
                onChangeText={setGender}
                placeholder="Gender"
              />
            </View>

            {isFaceProcessing && (
              <View style={styles.faceVerificationStatus}>
                <ActivityIndicator size="small" color="#3d0c45" />
                <Text style={styles.faceVerificationText}>Processing face verification...</Text>
              </View>
            )}

            {faceVerificationStatus === 'verified' && (
              <View style={[styles.faceVerificationStatus, styles.verifiedStatus]}>
                <Ionicons name="checkmark-circle" size={24} color="green" />
                <Text style={styles.faceVerificationText}>Face verified successfully</Text>
              </View>
            )}

            {faceVerificationStatus === 'failed' && (
              <View style={[styles.faceVerificationStatus, styles.failedStatus]}>
                <Ionicons name="alert-circle" size={24} color="orange" />
                <Text style={styles.faceVerificationText}>No matching face found</Text>
              </View>
            )}
          </View>
        );
        
      case 'Others':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brand (if applicable)</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="Enter if relevant"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="Enter the color of the item"
              />
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  // Update the generateImageFromDescription function
  const generateImageFromDescription = async () => {
    if (!description) {
      Alert.alert('Error', 'Please enter a description first');
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Log the API key for debugging (remove in production)
      console.log('Using API Key:', API_CONFIG.STABILITY_API_KEY);

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: description,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to generate image: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('API Response:', result); // Debug log

      if (result.artifacts && result.artifacts.length > 0) {
        const imageBase64 = result.artifacts[0].base64;
        const imageUri = `data:image/png;base64,${imageBase64}`;
        setGeneratedImage(imageUri);
        setPhoto(imageUri);
        Alert.alert('Success', 'Image generated successfully!');
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('generating description:', error);
      Alert.alert('Success', 'Generating description please wait ...');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Update verifyFace function
  const verifyFace = async (image1, image2) => {
    try {
      setIsFaceProcessing(true);
      setFaceVerificationStatus('processing');
      
      const response = await fetch(API_CONFIG.DEEPFACE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.DEEPFACE_API_KEY}`,
        },
        body: JSON.stringify({
          img1: image1,
          img2: image2,
          detector_backend: 'opencv',
          model_name: 'VGG-Face',
          distance_metric: 'cosine',
          enforce_detection: true,
          align: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Face verification failed');
      }

      const result = await response.json();
      setFaceVerificationResult(result);
      
      // Set verification status based on result
      if (result.verified) {
        setFaceVerificationStatus('verified');
        Alert.alert('Success', 'Face verification successful! The person has been identified.');
      } else {
        setFaceVerificationStatus('failed');
        Alert.alert('No Match', 'Face verification did not find a match. Please try again or report as a new case.');
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying face:', error);
      setFaceVerificationStatus('error');
      Alert.alert('Error', 'Failed to verify face. Please try again.');
      return null;
    } finally {
      setIsFaceProcessing(false);
    }
  };

  // Add function to handle face verification when photo is uploaded
  const handleFaceVerification = async (photoUri) => {
    if (category === 'Lost Person' && photoUri) {
      try {
        // Convert image to base64
        const base64Image = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Call face verification
        await verifyFace(base64Image, null); // Second parameter would be the reference image
      } catch (error) {
        console.error('Error in face verification:', error);
        Alert.alert('Error', 'Failed to process face verification. Please try again.');
      }
    }
  };

  // Add category icons helper function
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Electronics':
        return 'phone-portrait-outline';
      case 'Bags':
        return 'briefcase-outline';
      case 'Accessories':
        return 'watch-outline';
      case 'Clothing':
        return 'shirt-outline';
      case 'Documents':
        return 'document-text-outline';
      case 'Lost Person':
        return 'person-outline';
      case 'Others':
        return 'apps-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const generateImageCaption = async (base64ImageData) => {
    try {
        const response = await fetch('http://localhost:3000/api/generate-caption', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64ImageData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate caption');
        }

        const data = await response.json();
        return data.caption;
    } catch (error) {
        console.error('Error generating caption:', error);
        throw error;
    }
  };

  const generateImage = async (prompt) => {
    try {
      const response = await fetch(API_CONFIG.STABILITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.STABILITY_API_KEY}`
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.artifacts || !result.artifacts[0] || !result.artifacts[0].base64) {
        throw new Error('Invalid response format from Stability AI');
      }

      // Convert base64 to blob
      const base64Data = result.artifacts[0].base64;
      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  };

  // Add the image-to-description generation function
  const generateDescriptionFromImage = async () => {
    if (!photo) {
      Alert.alert('Error', 'Please take a photo first');
      return;
    }

    try {
      setIsGeneratingDescription(true);
      setGeneratedDescription('');
      setGeneratedCategory('');
      setGeneratedItemName('');

      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: photo,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      // Send to BLIP-2 service
      const response = await fetch(API_CONFIG.BLIP2_API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      const caption = result.caption;

      // Extract category and item name from caption
      const detectedCategory = detectCategoryFromDescription(caption);
      const generatedName = generateItemNameFromDescription(caption);

      setGeneratedDescription(caption);
      setGeneratedCategory(detectedCategory);
      setGeneratedItemName(generatedName);
      setCategory(detectedCategory);
      setItemName(generatedName);
      setDescription(caption);

    } catch (error) {
      console.error('Error generating description:', error);
      Alert.alert('Error', 'Failed to generate description. Please try again.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3d0c45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Lost Item</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.formContainer}>
        {/* Card 1: Item Name + Category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Details</Text>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="pricetag-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {categories.map((item) => (
                <TouchableOpacity
                key={item}
                  style={[
                    styles.categoryButton,
                    category === item && styles.categoryButtonSelected,
                  ]}
                  onPress={() => handleCategoryChange(item)}
                >
                  <Ionicons
                    name={getCategoryIcon(item)}
                    size={20}
                    color={category === item ? '#fff' : '#3d0c45'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === item && styles.categoryButtonTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
            ))}
          </View>
        </View>

          {/* Category-specific Details - Now inside the same card */}
          {category && (
            <View style={styles.categoryDetailsContainer}>
              <Text style={styles.categoryDetailsTitle}>{category} Details</Text>
              {renderCategoryFields()}
            </View>
          )}
        </View>

        {/* Card 2: Image Upload */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {category === 'Lost Person' ? 'Person Photo' : 'Item Image'}
          </Text>
          {category === 'Lost Person' ? (
            <>
              <TouchableOpacity 
                style={[styles.imageUploadContainer, styles.faceUploadContainer]}
                onPress={pickImage}
              >
                {photo ? (
                  <View style={styles.facePreviewContainer}>
                    <Image 
                      source={{ uri: photo }} 
                      style={styles.facePreviewImage} 
                    />
                    {isFaceProcessing && (
                      <View style={styles.faceProcessingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.faceProcessingText}>Processing face...</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <Ionicons name="person-circle-outline" size={64} color="#3d0c45" />
                    <Text style={styles.faceUploadText}>Upload a clear photo of the person's face</Text>
                    <Text style={styles.faceUploadSubtext}>This will be used for face verification</Text>
                  </>
                )}
              </TouchableOpacity>
              {faceVerificationStatus === 'verified' && (
                <View style={[styles.faceVerificationStatus, styles.verifiedStatus]}>
                  <Ionicons name="checkmark-circle" size={24} color="green" />
                  <Text style={styles.faceVerificationText}>Face verified successfully</Text>
                </View>
              )}
              {faceVerificationStatus === 'failed' && (
                <View style={[styles.faceVerificationStatus, styles.failedStatus]}>
                  <Ionicons name="alert-circle" size={24} color="orange" />
                  <Text style={styles.faceVerificationText}>No matching face found</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.imageUploadContainer}
                onPress={pickImage}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: 200, height: 200, borderRadius: 12 }} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={48} color="#3d0c45" />
                    <Text style={styles.imageUploadText}>Tap to upload image</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.aiButtonsContainer}>
                <TouchableOpacity 
                  style={styles.generateDescriptionButton}
                  onPress={generateDescriptionFromImage}
                  disabled={!photo || isGeneratingDescription}
                >
                  <Ionicons name="sparkles-outline" size={24} color="#3d0c45" />
                  <Text style={styles.generateDescriptionText}>
                    {isGeneratingDescription ? 'Generating...' : 'Generate Description from Image'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.generateDescriptionButton}
                  onPress={generateImageFromDescription}
                  disabled={!description || isGeneratingImage}
                >
                  <Ionicons name="image-outline" size={24} color="#3d0c45" />
                  <Text style={styles.generateDescriptionText}>
                    {isGeneratingImage ? 'Generating...' : 'Generate Image from Description'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Card 3: Unique Point + Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Description</Text>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Unique Point</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="star-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 100 }]}
                placeholder="Describe any unique features"
              value={uniquePoint}
              onChangeText={setUniquePoint}
              multiline
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Detailed Description</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="document-text-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 100 }]}
                placeholder="Provide a detailed description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#666"
            />
            </View>
          </View>
        </View>

        {/* Card 4: Time + Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>When Lost</Text>
          <View style={styles.timeDateContainer}>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={24} color="#3d0c45" />
              <Text style={styles.dateTimeText}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={24} color="#3d0c45" />
              <Text style={styles.dateTimeText}>{date.toDateString()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card 5: Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          <View style={styles.locationOptionsContainer}>
            <TouchableOpacity 
              style={[
                styles.locationOptionButton,
                location && selectedLocation && styles.locationOptionButtonSelected
              ]}
              onPress={detectCurrentLocation}
              disabled={isLoading}
            >
              <Ionicons 
                name="locate" 
                size={24} 
                color={location && selectedLocation ? '#3d0c45' : '#FFFFFF'} 
              />
              <Text style={[
                styles.locationOptionText,
                location && selectedLocation && styles.locationOptionTextSelected
              ]}>
                Locate Me
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.locationOptionButton,
                location && !selectedLocation && styles.locationOptionButtonSelected
              ]}
              onPress={() => {
                setSelectedLocation(null);
                setLocation('');
              }}
            >
              <Ionicons 
                name="pencil-outline" 
                size={24} 
                color={location && !selectedLocation ? '#3d0c45' : '#FFFFFF'} 
              />
              <Text style={[
                styles.locationOptionText,
                location && !selectedLocation && styles.locationOptionTextSelected
              ]}>
                Enter Manually
              </Text>
            </TouchableOpacity>
        </View>

          <View style={styles.locationInputContainer}>
            <Ionicons name="location-outline" size={24} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
              placeholder={selectedLocation ? "Current location will appear here" : "Enter location manually"}
              editable={!selectedLocation}
              multiline
            />
        </View>

              {selectedLocation && (
            <View style={styles.currentLocationInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#3d0c45" />
              <Text style={styles.currentLocationText}>Using your current location</Text>
            </View>
        )}
        </View>

        {/* Card 6: Contact Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
                placeholder="Your name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#666"
            />
          </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
                placeholder="Your email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#666"
            />
          </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
          <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={24} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
                placeholder="Your phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#666"
            />
            </View>
          </View>
        </View>

        {/* Reward Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reward (Optional)</Text>
          <View style={styles.inputGroup}>
            <View style={styles.rewardToggle}>
              <Text style={styles.label}>Offer Reward</Text>
              <Switch
                value={hasReward}
                onValueChange={setHasReward}
                trackColor={{ false: '#767577', true: '#3d0c45' }}
                thumbColor={hasReward ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
            
            {hasReward && (
              <View style={styles.rewardInputContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="cash-outline" size={24} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={rewardAmount}
                    onChangeText={setRewardAmount}
                    placeholder="Enter reward amount"
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date and Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width * 0.05,
    marginTop: Platform.OS === 'ios' ? 80 : 60,
    paddingTop: 30,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: width * 0.02,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: width * 0.07,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    flex: 1,
    color: '#3d0c45',
  },
  formContainer: {
    padding: width * 0.05,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
  },
  cardTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Inter-SemiBold',
    color: '#3d0c45',
    marginBottom: height * 0.015,
  },
  inputGroup: {
    marginBottom: height * 0.02,
  },
  label: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginBottom: height * 0.008,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    padding: width * 0.03,
    color: '#3d0c45',
  },
  input: {
    flex: 1,
    padding: width * 0.03,
    color: '#333',
    fontSize: width * 0.035,
    fontFamily: 'Inter-Regular',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: width * 0.02,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width * 0.03,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonSelected: {
    backgroundColor: '#3d0c45',
    borderColor: '#3d0c45',
  },
  categoryButtonText: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginLeft: width * 0.02,
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  imageUploadContainer: {
    alignItems: 'center',
    padding: width * 0.04,
    borderWidth: 2,
    borderColor: 'rgba(61, 12, 69, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  imageUploadText: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginTop: height * 0.01,
  },
  aiButtonsContainer: {
    gap: height * 0.01,
    marginTop: height * 0.01,
  },
  generateDescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
    padding: width * 0.03,
    borderRadius: 12,
  },
  generateDescriptionText: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginLeft: width * 0.02,
  },
  locationOptionsContainer: {
    flexDirection: 'row',
    gap: width * 0.02,
    marginBottom: height * 0.02,
  },
  locationOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: width * 0.03,
    borderRadius: 12,
    backgroundColor: '#3d0c45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: width * 0.02,
  },
  locationOptionButtonSelected: {
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
    borderWidth: 1,
    borderColor: '#3d0c45',
  },
  locationOptionText: {
    color: '#fff',
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
  },
  locationOptionTextSelected: {
    color: '#3d0c45',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: height * 0.01,
    gap: width * 0.01,
  },
  currentLocationText: {
    fontSize: width * 0.032,
    fontFamily: 'Inter-Regular',
    color: '#3d0c45',
  },
  submitButton: {
    backgroundColor: '#3d0c45',
    padding: width * 0.04,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontFamily: 'Inter-SemiBold',
  },
  timeDateContainer: {
    flexDirection: 'row',
    gap: width * 0.02,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: width * 0.03,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
  },
  dateTimeText: {
    flex: 1,
    fontSize: width * 0.035,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: width * 0.02,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  categoryDetailsContainer: {
    marginTop: height * 0.02,
    paddingTop: height * 0.02,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 12, 69, 0.1)',
  },
  categoryDetailsTitle: {
    fontSize: width * 0.04,
    fontFamily: 'Inter-SemiBold',
    color: '#3d0c45',
    marginBottom: height * 0.015,
  },
  faceVerificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
  },
  verifiedStatus: {
    backgroundColor: 'rgba(0, 128, 0, 0.1)',
  },
  failedStatus: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  faceVerificationText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#3d0c45',
  },
  faceUploadContainer: {
    backgroundColor: 'rgba(61, 12, 69, 0.05)',
    borderColor: 'rgba(61, 12, 69, 0.2)',
  },
  facePreviewContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  facePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  faceProcessingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(61, 12, 69, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceProcessingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  faceUploadText: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginTop: height * 0.01,
    textAlign: 'center',
  },
  faceUploadSubtext: {
    fontSize: width * 0.03,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: height * 0.005,
    textAlign: 'center',
  },
  rewardToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rewardInputContainer: {
    marginTop: 10,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardInput: {
    flex: 1,
    marginRight: 10,
  },
  currencyPicker: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencyPickerInput: {
    height: 50,
  },
});

export default ReportLostItem;