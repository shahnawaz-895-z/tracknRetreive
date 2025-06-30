import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Alert, Platform, Dimensions, ActivityIndicator, Modal, SafeAreaView, StatusBar, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import PhotoSelector from './components/PhotoSelector';

const { width, height } = Dimensions.get('window');
const ACTIVITY_STORAGE_KEY = 'user_activities'; // Same key as in Homepage.js

const ReportFoundItem = () => {
  const navigation = useNavigation();
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('Electronics');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [geolocation, setGeolocation] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [itemName, setItemName] = useState('');
  const [fullScreenMap, setFullScreenMap] = useState(false);
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [missingPersonName, setMissingPersonName] = useState('');
  const [generatedCategory, setGeneratedCategory] = useState('');
  const [generatedItemName, setGeneratedItemName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isFaceProcessing, setIsFaceProcessing] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState(null);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState(null);

  // Animation values
  const fadeAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(1);
  const [selectedCategoryAnim] = useState(new Animated.Value(0));
  const [imageUploadAnim] = useState(new Animated.Value(0));
  const [imagePreviewAnim] = useState(new Animated.Value(0));
  const [mapAnim] = useState(new Animated.Value(0));
  const [locationMarkerAnim] = useState(new Animated.Value(0));

  const handleCategoryChange = (selectedCategory) => {
    setCategory(selectedCategory);
    // Reset category-specific fields when category changes
    setBrand('');
    setModel('');
    setSerialNumber('');
    setDocumentType('');
    setIssuingAuthority('');
    setNameOnDocument('');
    setAge('');
    setGender('');
    setColor('');
  };

  const categories = ['Electronics', 'Bags', 'Clothing', 'Accessories', 'Documents', 'Lost Person', 'Others'];
  const BACKEND_URL = API_CONFIG.API_URL;
  const HUGGING_FACE_API_KEY = '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';

  useEffect(() => {
    const getLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to proceed.');
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
      // Request location permissions
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        console.log('Location permission not granted');
      }

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
        return `Found ${noun}`.charAt(0).toUpperCase() + `Found ${noun}`.slice(1);
      }
    }
    
    // If no common nouns found, use the first 3-4 words
    return words.slice(0, 4).join(' ').charAt(0).toUpperCase() + words.slice(0, 4).join(' ').slice(1);
  };

  const handleFaceVerification = async (photoUri) => {
    if (category === 'Lost Person' && photoUri) {
      try {
        setIsFaceProcessing(true);
        setFaceVerificationStatus('processing');
        
        // Convert image to base64
        const base64Image = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // First analyze the face to ensure it's valid
        const analyzeResponse = await fetch('http://192.168.1.5:5001/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            img: base64Image,
            detector_backend: 'opencv',
            enforce_detection: true,
            align: true,
          }),
        });

        if (!analyzeResponse.ok) {
          throw new Error('Face analysis failed');
        }

        const analyzeResult = await analyzeResponse.json();
        
        if (!analyzeResult || !analyzeResult.analysis || !analyzeResult.analysis.length) {
          throw new Error('No face detected in the image');
        }

        // Now search for matches in the database
        const searchResponse = await fetch(`${API_CONFIG.API_URL}/lostitem/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            image: base64Image,
            category: 'Lost Person'
          }),
        });

        if (!searchResponse.ok) {
          throw new Error('Failed to search for matches');
        }

        const matches = await searchResponse.json();
        
        if (matches && matches.length > 0) {
          setFaceVerificationStatus('verified');
          setFaceVerificationResult(matches[0]);
          Alert.alert(
            'Match Found!',
            `We found a potential match for this person. Would you like to view the details?`,
            [
              {
                text: 'View Details',
                onPress: () => {
                  // Navigate to match details
                  navigation.navigate('MatchDetails', { match: matches[0] });
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          setFaceVerificationStatus('failed');
          Alert.alert(
            'No Match Found',
            'We couldn\'t find any matches for this person in our database. Would you like to report them as a new case?',
            [
              {
                text: 'Report New Case',
                onPress: () => {
                  // Continue with the current form
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error in face verification:', error);
        setFaceVerificationStatus('error');
        Alert.alert(
          'Error',
          error.message === 'No face detected in the image' 
            ? 'No face detected in the image. Please make sure the image contains a clear face.'
            : 'Failed to process face verification. Please try again.'
        );
      } finally {
        setIsFaceProcessing(false);
      }
    }
  };

  const handleImageUpload = async (imageAsset) => {
    try {
      setIsImageProcessing(true);
      setGeneratedImage(null);
      setDescription('');
      setCategory('');
      setItemName('');
      setGeneratedCategory('');

      const imageUri = imageAsset.uri;
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

      // Send to BLIP-2 service
      const response = await fetch(API_CONFIG.BLIP2_API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      console.log('BLIP-2 response:', data);

      if (data.caption) {
        // Extract category from caption
        const detectedCategory = detectCategoryFromDescription(data.caption);
        setGeneratedCategory(detectedCategory);
        setCategory(detectedCategory);
        
        // Set description and item name
        setDescription(data.caption);
        const generatedName = generateItemNameFromDescription(data.caption);
        setItemName(generatedName);
        
        // Set generated image
        setGeneratedImage(imageUri);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      if (category === 'Lost Person') {
        Alert.alert('Error', 'Error processing face verification. Please try again.');
      } else {
        Alert.alert('Error', 'Error processing the image. Please try again.');
      }
    } finally {
      setIsImageProcessing(false);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setTime(selectedTime);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });

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
  };

  const confirmLocation = () => {
    setFullScreenMap(false);
  };

  const detectCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setIsLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to proceed.');
        setIsLoading(false);
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
      setIsLoading(false);
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to detect current location. Please try again.');
      setIsLoading(false);
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
          'You need to be logged in to report a found item. Please log in and try again.',
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

  const handleSubmit = async () => {
    const errors = {};
    const fields = {
      itemName,
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

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showErrorAnimation();
      // Show detailed error message
      const errorMessage = Object.values(errors).join('\n');
      Alert.alert('Validation Error', `Please fix the following errors:\n\n${errorMessage}`);
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
      const response = await axios.post(`${API_CONFIG.API_URL}/reportfound`, formData, {
        headers: headers,
        timeout: 30000, // 30 second timeout
      });
        
        if (response.data.status === 'success') {
        // Add to recent activity with the item's _id
        await addToRecentActivity(response.data.itemId);
        
        // Show success message
          Alert.alert(
            'Success!',
          'Your found item has been reported successfully. We will notify you if we find any matches!',
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
                setMissingPersonName('');
                // Navigate back to home
                navigation.navigate('HomePage');
              },
            },
          ]
        );
        } else {
        Alert.alert('Error', 'Failed to report found item. Please try again.');
        }
      } catch (error) {
      console.error('Error submitting found item:', error);
      // Show detailed error message
      let errorMessage = 'Failed to submit found item report. ';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const status = error.response.status;
          
          if (status === 404) {
            console.error(`API endpoint not found: ${API_CONFIG.API_URL}/reportfound`);
            errorMessage += `Server error: API endpoint not found (404). Please verify the backend server is running at ${API_CONFIG.API_URL}`;
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
          console.error('Request made to:', API_CONFIG.API_URL);
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage += error.message;
        }
        
        // Show detailed alert with the backend URL for debugging
        Alert.alert(
          'Error Submitting Item', 
          `${errorMessage}\n\nAPI URL: ${API_CONFIG.API_URL}\n\nPlease take a screenshot of this error and contact support.`,
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
  };

  // Update addToRecentActivity function to use the server-provided ID
  const addToRecentActivity = async (serverItemId) => {
    try {
      // Format the date for display
      const now = new Date();
      const formattedDate = formatRelativeTime(now);
      
      // Create the activity object with actual item details
      const newActivity = {
        id: serverItemId, // Use the server-provided ID
        type: 'found',
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

      // Send to our local BLIP-2 service
      const response = await fetch('http://localhost:5000/api/generate-caption', {
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
      console.error('generating description:', error);
      Alert.alert('Success', 'Generating description please wait ...');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Add validation function
  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'itemName':
        if (!value) error = 'Item name is required';
        break;
      case 'category':
        if (!value) error = 'Please select a category';
        break;
      case 'description':
        if (!value) error = 'Description is required';
        break;
      case 'location':
        if (!value) error = 'Location is required';
        break;
      case 'name':
        if (!value) error = 'Name is required';
        break;
      case 'phone':
        if (!value) error = 'Phone number is required';
        else if (!/^\d{11}$/.test(value.replace(/\D/g, ''))) error = 'Invalid phone number (must be 11 digits)';
        break;
      case 'email':
        if (value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'Please enter a valid email (e.g., example@gmail.com)';
          }
        }
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

  const renderCategoryFields = () => {
    switch (category) {
      case 'Electronics':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="logo-apple" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter brand name"
                  value={brand}
                  onChangeText={setBrand}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Model</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="phone-portrait-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter model number"
                  value={model}
                  onChangeText={setModel}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Serial Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="barcode-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter serial number"
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </>
        );
      case 'Documents':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Document Type</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter document type"
                  value={documentType}
                  onChangeText={setDocumentType}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Issuing Authority</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter issuing authority"
                  value={issuingAuthority}
                  onChangeText={setIssuingAuthority}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name on Document</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter name on document"
                  value={nameOnDocument}
                  onChangeText={setNameOnDocument}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </>
        );
      case 'Lost Person':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name of Missing Person</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter name of missing person"
                  value={missingPersonName}
                  onChangeText={setMissingPersonName}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter gender"
                  value={gender}
                  onChangeText={setGender}
                  placeholderTextColor="#666"
                />
              </View>
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
          </>
        );
      default:
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="color-palette-outline" size={24} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter color"
                value={color}
                onChangeText={setColor}
                placeholderTextColor="#666"
              />
            </View>
          </View>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3d0c45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Found Item</Text>
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
          <Text style={styles.cardTitle}>When Found</Text>
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
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={onTimeChange}
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
  inputText: {
    color: '#333',
    fontSize: width * 0.04,
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
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.2)',
    marginBottom: height * 0.01,
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
  imageUploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  imageUploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  imageUploadButtonText: {
    fontSize: 14,
    color: '#3d0c45',
    fontWeight: '500',
  },
  imageUploadContainer: {
    height: height * 0.2,
    backgroundColor: 'rgba(61, 12, 69, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(61, 12, 69, 0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  imageUploadText: {
    color: '#3d0c45',
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    marginTop: height * 0.01,
  },
  aiButtonsContainer: {
    flexDirection: 'row',
    gap: width * 0.02,
  },
  generateDescriptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: width * 0.03,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 12, 69, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.2)',
  },
  generateDescriptionText: {
    fontSize: width * 0.035,
    fontFamily: 'Inter-Medium',
    color: '#3d0c45',
    marginLeft: width * 0.02,
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
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
});

export default ReportFoundItem;